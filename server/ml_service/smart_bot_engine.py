import os
import sys
import datetime
import json
import argparse
import subprocess
import pandas as pd
import numpy as np
import xgboost as xgb
from pymongo import MongoClient
from dotenv import load_dotenv
from ta.momentum import RSIIndicator
from ta.trend import SMAIndicator, MACD
from ta.volatility import BollingerBands

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    print("Error: MONGO_URI not found.")
    sys.exit(1)

client = MongoClient(MONGO_URI)
try:
    db = client.get_database()
except:
    db = client['test']

users_collection = db['users']
predictions_collection = db['predictions']

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)

def get_node_adapter_path():
    return os.path.join(os.path.dirname(__file__), 'fetch_stock_history.js')

def fetch_data(ticker, period_days=730):
    """
    Fetches historical data using the Node.js adapter.
    """
    end_date = datetime.datetime.now() + datetime.timedelta(days=1)
    start_date = end_date - datetime.timedelta(days=period_days)
    
    script_path = get_node_adapter_path()
    
    try:
        cmd = ['node', script_path, ticker, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        data = json.loads(result.stdout)
        if not data or 'error' in data:
            return None
            
        df = pd.DataFrame(data)
        df.rename(columns={'date': 'Date', 'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'}, inplace=True)
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        df.sort_index(inplace=True)
        
        if df.index.tz is not None:
            df.index = df.index.tz_convert(None)
            
        return df
    except Exception as e:
        # print(f"  [Data Error] {ticker}: {e}")
        return None

def prepare_features(df):
    """
    Generates technical features for XGBoost.
    """
    if df is None or len(df) < 50: return None, None
    
    df = df.copy()
    col = 'Close'
    
    # Features
    df['Ret_1d'] = df[col].pct_change()
    df['Ret_5d'] = df[col].pct_change(5)
    
    rsi = RSIIndicator(close=df[col], window=14)
    df['RSI'] = rsi.rsi()
    
    df['SMA_20'] = SMAIndicator(close=df[col], window=20).sma_indicator()
    df['SMA_50'] = SMAIndicator(close=df[col], window=50).sma_indicator()
    df['Trend_Signal'] = np.where(df['SMA_20'] > df['SMA_50'], 1, -1)
    
    df['Vol_20d'] = df['Ret_1d'].rolling(20).std()

    # 5. MACD (Scientific/Standard ML Feature)
    macd = MACD(close=df[col])
    df['MACD'] = macd.macd()
    df['MACD_Diff'] = macd.macd_diff() # Histogram usually very predictive

    # 6. Bollinger Bands
    bb = BollingerBands(close=df[col], window=20, window_dev=2)
    df['BB_High'] = bb.bollinger_hband()
    df['BB_Low'] = bb.bollinger_lband()
    # Distance from bands
    df['BB_Pos'] = (df[col] - df['BB_Low']) / (df['BB_High'] - df['BB_Low'])
    
    # Target (for training)
    df['Y_Next'] = df[col].shift(-1) / df[col] - 1
    
    features = ['Ret_1d', 'Ret_5d', 'RSI', 'Trend_Signal', 'Vol_20d', 'MACD', 'MACD_Diff', 'BB_Pos']
    df.dropna(subset=features, inplace=True)
    
    return df, features

def get_model_path(ticker, interval):
    return os.path.join(MODELS_DIR, f"{ticker}_{interval}.json")

def load_model(ticker, interval):
    path = get_model_path(ticker, interval)
    if os.path.exists(path):
        model = xgb.XGBRegressor()
        model.load_model(path)
        return model
    return None

def save_model(model, ticker, interval):
    path = get_model_path(ticker, interval)
    model.save_model(path)

def train_and_predict(ticker, df, interval, mode='inference'):
    """
    Trains or Loads XGBoost model based on mode.
    """
    df_clean, features = prepare_features(df)
    if df_clean is None or len(df_clean) < 50: return None
    
    model = None
    
    # 1. Try Load if in Inference Mode
    if mode == 'inference':
        model = load_model(ticker, interval)
        if model:
            try:
                # Validation: Check if model works with current feature set
                # (Crucial since we added MACD/BB and old models will have wrong shape)
                latest_features = df_clean.iloc[[-1]][features]
                model.predict(latest_features)
            except Exception as e:
                print(f"    [Auto-Retrain] Model mismatch for {ticker} (Features changed). Retraining...")
                model = None # Force Retrain
    
    # 2. Train if missing or in Train mode
    if model is None:
        # print(f"    [Train] Training new model for {ticker}...")
        train_data = df_clean.iloc[:-1]
        X = train_data[features]
        y = train_data['Y_Next']
        
        model = xgb.XGBRegressor(
            n_estimators=100, learning_rate=0.05, max_depth=3,
            objective='reg:squarederror', n_jobs=1
        )
        model.fit(X, y)
        save_model(model, ticker, interval)
    
    # 3. Predict
    last_row = df_clean.iloc[[-1]] 
    prediction = model.predict(last_row[features])[0]
    
    # Feature Importance
    importances = model.feature_importances_
    top_idx = np.argsort(importances)[::-1][0]
    primary_driver = features[top_idx]
    
    return prediction, primary_driver, last_row['Close'].iloc[0]

def get_deadline(interval):
    now = datetime.datetime.utcnow()
    if interval == 'Daily':
        cutoff = now.replace(hour=21, minute=0, second=0, microsecond=0)
        return cutoff if now < cutoff else cutoff + datetime.timedelta(days=1)
    elif interval == 'Weekly':
        days_ahead = 4 - now.weekday() 
        if days_ahead <= 0: days_ahead += 7
        target_date = now + datetime.timedelta(days=days_ahead)
        return target_date.replace(hour=21, minute=0, second=0, microsecond=0)
    elif interval == 'Monthly':
        return now + datetime.timedelta(days=30)
    elif interval == 'Quarterly':
        return now + datetime.timedelta(days=90)
    return now + datetime.timedelta(days=1)

def get_sector_bias(ticker, sentiment_config):
    """
    Calculates bias based on basic sector mapping.
    """
    if not sentiment_config: return 0.0, None

    try:
        config = json.loads(sentiment_config)
    except:
        return 0.0, None

    sector = config.get('sector', 'All')
    sentiment = config.get('sentiment', 'Neutral')
    
    if sector == 'All' and sentiment == 'Neutral': return 0.0, None

    # Rudimentary Sector Map (Top tickers) - Expand as needed
    TECH = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'AMD', 'INTC', 'ORCL', 'IBM', 'CRM', 'ADBE']
    FINANCE = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'V', 'MA']
    ENERGY = ['XOM', 'CVX', 'COP', 'SLB', 'EOG']
    HEALTH = ['JNJ', 'PFE', 'UNH', 'LLY', 'MRK', 'ABBV']
    
    is_match = False
    if sector == 'All': is_match = True
    elif sector == 'Technology' and ticker in TECH: is_match = True
    elif sector == 'Finance' and ticker in FINANCE: is_match = True
    elif sector == 'Energy' and ticker in ENERGY: is_match = True
    elif sector == 'Healthcare' and ticker in HEALTH: is_match = True
    
    if not is_match: return 0.0, None
    
    # Bias Map
    BIAS_MAP = {
        'Strong Bearish': -0.10,
        'Bearish': -0.05,
        'Neutral': 0.00,
        'Bullish': 0.05,
        'Strong Bullish': 0.10
    }
    
    return BIAS_MAP.get(sentiment, 0.0), f"{sector} {sentiment}"

def run_smart_engine(interval, mode, specific_ticker=None, sentiment_json=None):
    print(f"\n--- Smart Bot Engine v1.2 ({interval}) [Mode: {mode}] ---")
    
    # Bots Logic
    bots = list(users_collection.find({"isBot": True}))
    print(f"--> Found {len(bots)} bots.")
    
    success_count = 0
    
    for bot in bots:
        if bot.get('username') == 'Sigma Alpha': continue
        
        # 1. Universe
        universe = bot.get('universe', [])
        
        # 2. Fallback
        if not universe or len(universe) < 3:
            bio = bot.get('about', '').lower()
            if 'dividend' in bio or 'stable' in bio or 'blue chip' in bio:
                universe = ['KO', 'JNJ', 'PG', 'WMT', 'VZ', 'T', 'PEP', 'MCD', 'COST']
            else:
                universe = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
        
        # Specific Ticker Filter (Bot must have it in universe)
        if specific_ticker:
            if specific_ticker not in universe:
                continue
            # Override to just this ticker
            universe = [specific_ticker]
            
        # Ensure sufficient pool (unless specific ticker)
        if not specific_ticker and len(universe) < 3: 
             universe = ['SPY', 'QQQ', 'AAPL']
             
        if not specific_ticker:
            np.random.shuffle(universe)
            targets = universe[:3]
        else:
            targets = universe

        for ticker in targets:
            try:
                # Check existance (skip if already pending, unless we want to force?)
                # If specific ticker requested, we might want to allow forcing? 
                # For now keeping it standard.
                exists = predictions_collection.find_one({
                    "userId": bot['_id'], "stockTicker": ticker, "status": "Pending"
                })
                if exists: 
                    # print(f"    [Skip] Existing pending prediction for {ticker}")
                    continue
                
                # Fetch Data
                df = fetch_data(ticker)
                
                prediction_pct, top_feature, current_price = train_and_predict(ticker, df, interval, mode)
                
                if prediction_pct is None: continue
                
                if prediction_pct is None: continue
                
                # --- PERSONALITY & STRATEGY BIAS ---
                strategy = bot.get('strategy', 'Neutral')
                risk_cap = bot.get('volatilityCap', 0.05) # Default 5%
                
                # 1. Strategy Bias
                if strategy == 'Momentum' and prediction_pct > 0:
                    prediction_pct *= 1.1 # Boost winners
                elif strategy == 'MeanReversion':
                    # Dampen trends, boost reversals? 
                    # For simplicity: just slightly dampen strong moves to simulate taking profits early
                    prediction_pct *= 0.9
                elif strategy == 'Contrarian': 
                    # Slight fade
                    prediction_pct *= 0.95
                elif strategy == 'Conservative':
                    prediction_pct *= 0.8 # Always reduce volatility
                
                # 2. Sector/Sentiment Bias (Existing)
                bias, bias_reason = get_sector_bias(ticker, sentiment_json)
                if bias != 0:
                    prediction_pct += bias

                # 3. Micro-Jitter (Uniqueness)
                # Adds +/- 0.5% random variation so no two bots match exactly
                jitter = (np.random.random() - 0.5) * 0.01 
                prediction_pct += jitter

                # 4. Risk-Based Clamping (The "Cap")
                # Interval multiplier allows slightly more room for longer horizons
                horizon_mult = 1.0
                if interval == 'Weekly': horizon_mult = 1.5
                elif interval == 'Quarterly': horizon_mult = 3.0
                
                personal_limit = risk_cap * horizon_mult
                
                # Hard limit for sanity (prevent 50% moves unless warranted)
                global_max = 0.20 * horizon_mult
                final_limit = min(personal_limit, global_max)

                if abs(prediction_pct) > final_limit:
                    # print(f"    [Clamp] {ticker} ({bot['username']}): {prediction_pct*100:.1f}% -> {final_limit*100:.1f}% (Risk Cap)")
                    prediction_pct = final_limit if prediction_pct > 0 else -final_limit

                # Sanity Limit (Extreme Hallucination Check)
                if abs(prediction_pct) > (final_limit * 1.5):
                     print(f"    [Skip] {ticker}: {prediction_pct*100:.1f}% exceeds sanity.")
                     continue
                    
                target_price = current_price * (1 + prediction_pct)
                direction = "Bullish" if prediction_pct > 0 else "Bearish"
                
                rationale = (f"Market analysis indicates a {direction} trend driven by {top_feature}.")
                if bias != 0:
                    rationale += f" Adjusted for {bias_reason} sentiment."
                rationale += f" Model ({mode}) confidence based on {interval} data."
                             
                new_pred = {
                    "userId": bot['_id'],
                    "stockTicker": ticker,
                    "targetPrice": float(round(target_price, 2)),
                    "targetPriceAtCreation": float(round(target_price, 2)),
                    "predictionType": interval,
                    "deadline": get_deadline(interval),
                    "status": "Pending",
                    "priceAtCreation": float(round(current_price, 2)),
                    "currency": "USD",
                    "description": rationale,
                    "createdAt": datetime.datetime.utcnow(),
                    "updatedAt": datetime.datetime.utcnow()
                }
                
                if mode == 'train':
                    print(f"    [Train] ({bot['username']}) Model updated for {ticker}. Result: {direction} @ {target_price:.2f} (Not saving to DB)")
                else:
                    predictions_collection.insert_one(new_pred)
                    print(f"    [P] ({bot['username']}) {ticker} -> {direction} @ {target_price:.2f}")
                    success_count += 1
                
            except Exception as e:
                print(f"    Error {ticker}: {e}")
                continue
                
    print(f"--- Completed. {success_count} predictions generated. ---")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--interval', type=str, default='Daily', choices=['Daily', 'Weekly', 'Monthly', 'Quarterly'])
    parser.add_argument('--mode', type=str, default='inference', choices=['train', 'inference'])
    parser.add_argument('--ticker', type=str, help='Run for a specific ticker only')
    parser.add_argument('--sentiment', type=str, help='JSON string for sentiment overrides')
    args = parser.parse_args()
    
    run_smart_engine(args.interval, args.mode, specific_ticker=args.ticker, sentiment_json=args.sentiment)
