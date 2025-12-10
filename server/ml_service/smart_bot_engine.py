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
from ta.trend import SMAIndicator

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
    
    # Target (for training)
    df['Y_Next'] = df[col].shift(-1) / df[col] - 1
    
    features = ['Ret_1d', 'Ret_5d', 'RSI', 'Trend_Signal', 'Vol_20d']
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
            # print(f"    [Cache] Loaded model for {ticker}")
            pass
    
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

def run_smart_engine(interval, mode):
    print(f"\n--- Smart Bot Engine v1.1 ({interval}) [Mode: {mode}] ---")
    
    # Bots Logic (Simplified for brevity, similar to before but utilizing mode)
    bots = list(users_collection.find({"isBot": True}))
    print(f"--> Found {len(bots)} bots.")
    
    success_count = 0
    
    for bot in bots:
        if bot.get('username') == 'Sigma Alpha': continue
        
        # 1. Try to use the pre-assigned Universe from the DB (Best Source)
        universe = bot.get('universe', [])
        
        # 2. Fallback: Parse 'about' (formerly looked for non-existent 'bio')
        if not universe or len(universe) < 3:
            bio = bot.get('about', '').lower() # Seeder uses 'about', not 'bio'
            
            if 'tech' in bio or 'momentum' in bio: 
                universe = ['AAPL', 'MSFT', 'NVDA', 'AMD', 'GOOGL', 'META', 'TSLA', 'AVGO']
            elif 'crypto' in bio: 
                universe = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'COIN', 'MSTR']
            elif 'energy' in bio: 
                universe = ['XOM', 'CVX', 'OXY', 'SHELL', 'BP']
            elif 'finance' in bio or 'bank' in bio: 
                universe = ['JPM', 'BAC', 'GS', 'MS', 'WFC']
            elif 'dividend' in bio or 'stable' in bio or 'blue chip' in bio:
                # SAFE DIVIDEND / SINANCE Logic
                universe = ['KO', 'JNJ', 'PG', 'WMT', 'VZ', 'T', 'PEP', 'MCD', 'COST']
            elif 'gold' in bio or 'mining' in bio:
                universe = ['GLD', 'GDX', 'NEM', 'GOLD']
            else: 
                # Generic Default
                universe = ['SPY', 'QQQ', 'TSLA', 'AMZN', 'AAPL']
        
        # Ensure we have enough targets
        if len(universe) < 3: universe = ['SPY', 'QQQ', 'AAPL']
            
        # print(f"  [{bot['username']}] Universe: {universe}")
        np.random.shuffle(universe)
        targets = universe[:3]
        
        for ticker in targets:
            try:
                # Skip existing check to force update? No, keep it.
                exists = predictions_collection.find_one({
                    "userId": bot['_id'], "stockTicker": ticker, "status": "Active"
                })
                if exists: continue
                
                # Fetch Data
                # Optimization: Could fetch less data if inference, but need features calc
                df = fetch_data(ticker)
                
                prediction_pct, top_feature, current_price = train_and_predict(ticker, df, interval, mode)
                
                if prediction_pct is None: continue
                
                # --- CLAMPING LOGIC ---
                CLAMPS = {
                    'Daily': 0.05,      # Max 5%
                    'Weekly': 0.15,     # Max 15%
                    'Monthly': 0.30,    # Max 30%
                    'Quarterly': 0.50   # Max 50%
                }
                max_move = CLAMPS.get(interval, 0.10)
                
                if abs(prediction_pct) > max_move:
                    print(f"    [Clamp] {ticker}: {prediction_pct*100:.1f}% -> {max_move*100:.1f}% ({interval} Limit)")
                    prediction_pct = max_move if prediction_pct > 0 else -max_move

                if abs(prediction_pct) < 0.005 and interval == 'Daily': continue
                    
                target_price = current_price * (1 + prediction_pct)
                direction = "Bullish" if prediction_pct > 0 else "Bearish"
                
                rationale = (f"Market analysis indicates a {direction} trend driven by "
                             f"{top_feature}. Model ({mode}) confidence based on {interval} data.")
                             
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
                
                predictions_collection.insert_one(new_pred)
                print(f"    [P] {ticker} -> {direction} @ {target_price:.2f}")
                success_count += 1
                
            except Exception as e:
                print(f"    Error {ticker}: {e}")
                continue
                
    print(f"--- Completed. {success_count} predictions generated. ---")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--interval', type=str, default='Daily', choices=['Daily', 'Weekly', 'Monthly', 'Quarterly'])
    parser.add_argument('--mode', type=str, default='inference', choices=['train', 'inference'])
    args = parser.parse_args()
    
    run_smart_engine(args.interval, args.mode)
