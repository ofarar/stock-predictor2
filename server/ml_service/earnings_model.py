import os
import sys
import datetime
import json
import requests
import yfinance as yf
import pandas as pd
import numpy as np
import xgboost as xgb
from pymongo import MongoClient
from dotenv import load_dotenv
from ta.momentum import RSIIndicator
from ta.trend import SMAIndicator
import argparse
import subprocess
import json
from fed_data import get_next_fed_date, is_fed_week

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def fetch_nasdaq_earnings_date(ticker):
    """
    Fetches the NEXT confirmed earnings date from Nasdaq.com (Method 3).
    Falls back to yfinance if Nasdaq fails.
    """

    # 1. Try Nasdaq API
    try:
        # Check next 7 days
        today = datetime.date.today()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.nasdaq.com/'
        }
        
        for i in range(8): # Check T+0 to T+7
            check_date = today + datetime.timedelta(days=i)
            date_str = check_date.strftime('%Y-%m-%d')
            url = f"https://api.nasdaq.com/api/calendar/earnings?date={date_str}"
            
            resp = requests.get(url, headers=headers, timeout=5)
            data = resp.json()
            
            if data and data.get('data') and data['data'].get('rows'):
                for row in data['data']['rows']:
                    if row.get('symbol') == ticker:
                        print(f"  [Nasdaq] Confirmed earnings for {ticker} on {date_str}")
                        return check_date
                        
    except Exception as e:
        print(f"  [Nasdaq Error] {ticker}: {e}")

    # 2. Fallback to YFinance
    print(f"  [Fallback] Using yfinance calendar for {ticker}...")
    try:
        t = yf.Ticker(ticker)
        cal = t.calendar
        if isinstance(cal, dict) and 'Earnings Date' in cal:
            dates = cal['Earnings Date']
            if dates:
                return dates[0]
    except:
        pass
        
    return None

def generate_natural_language_rationale(ticker, direction, top_feature, feature_imp, confidence, macro_trend, sympathy, recent_return, current_macro_rsi, days_until_fed=None):
    """
    Generates a human-readable paragraph explaining the model's decision.
    """
    # 1. Feature Mappings
    feature_map = {
        'Vol_5d': "volatility contraction/expansion patterns",
        'V_rev': "statistical mean reversion",
        'Hype_Factor': "abnormal volume/price anomalies",
        'Ret_Lag1': "immediate price momentum",
        'Ret_Lag2': "secondary trend confirmation",
        'Macro_Trend': "broad market alignment (QQQ)",
        'Macro_RSI': "macro-level overbought/oversold conditions",
        'Macro_RSI': "macro-level overbought/oversold conditions",
        'Sympathy': "sector peer correlations",
        'Days_Until_Fed': "imminent Federal Reserve interest rate decision risk"
    }
    
    driver_desc = feature_map.get(top_feature, "quantitative technical factors")
    
    # 2. Macro Context
    if macro_trend > 0:
        macro_desc = f"bullish market tailwinds (QQQ RSI: {current_macro_rsi:.1f})"
    else:
        macro_desc = f"bearish market headwinds (QQQ RSI: {current_macro_rsi:.1f})"

    # 3. Price Action Context
    if recent_return > 0.05:
        context_str = f"following a strong recent rally (+{recent_return*100:.1f}%)"
    elif recent_return < -0.05:
        context_str = f"following a sharp pullback ({recent_return*100:.1f}%)"
    elif recent_return > 0:
        context_str = f"amidst mild upward consolidation (+{recent_return*100:.1f}%)"
    else:
        context_str = f"following a mild pullback ({recent_return*100:.1f}%)"

    # 4. Construct Narrative
    intro = f"Sigma Alpha identifies a high-probability {direction} setup for {ticker}, {context_str}."
    
    driver_text = f" The primary algorithmic driver is {driver_desc} (Impact Score: {feature_imp:.4f}),"
    
    signal_text = (
        f" which signals a likely continuation of the move" if direction == "Bullish" and recent_return > 0 else 
        f" which signals a potential reversal" if direction != ("Bullish" if recent_return > 0 else "Bearish") else
        f" which signals significant event-driven volatility"
    )
    
    body = driver_text + signal_text

    validation = f" This thesis is further validated by {macro_desc} and "
    
    if sympathy > 0.5:
        validation += "strong positive sector sympathy."
    elif sympathy < -0.5:
        validation += "notable sector weakness."
    else:
        validation += "neutral peer activity."
    
    if days_until_fed is not None and days_until_fed <= 5:
        validation += f" CAUTION: Market is awaiting Fed Decision in {days_until_fed} days."
        
    return f"{intro}{body}.{validation} (Confidence: {confidence:.1f}%)"
        
    return f"{intro}{body}.{validation} (Confidence: {confidence:.1f}%)"

MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    print("Error: MONGO_URI not found.")
    sys.exit(1)

client = MongoClient(MONGO_URI)
try:
    db = client.get_database()
except:
    db = client['test']
    print("  [DB Warning] URI had no DB, defaulting to 'test'")

predictions_collection = db['predictions']
users_collection = db['users']

# Target Universe
STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD', 'NFLX', 'INTC', 'CRM', 'ADBE', 'PYPL', 'UBER', 'ASML', 'ORCL', 'TSM', 'AVGO']

PEER_GROUPS = {
    'GOOGL': ['AMZN', 'META', 'MSFT'],
    'AMZN': ['GOOGL', 'WMT', 'MSFT'],
    'META': ['GOOGL', 'SNAP', 'PINS'],
    'MSFT': ['GOOGL', 'AMZN', 'ORCL'],
    'NVDA': ['AMD', 'INTC', 'TSM', 'ASML', 'AVGO'],
    'AMD': ['NVDA', 'INTC', 'TSM'],
    'INTC': ['AMD', 'NVDA', 'TSM'],
    'TSM': ['NVDA', 'AMD', 'ASML'],
    'ASML': ['TSM', 'NVDA', 'LRCX'],
    'AVGO': ['NVDA', 'QCOM', 'TXN'],
    'ORCL': ['MSFT', 'CRM', 'SAP'],
    'CRM': ['ORCL', 'MSFT', 'ADBE'],
    'ADBE': ['CRM', 'MSFT', 'ORCL'],
    'AAPL': ['MSFT', 'GOOGL', 'QCOM'],
    'TSLA': ['RIVN', 'LCID', 'F'],
    'NFLX': ['DIS', 'CMCSA', 'WBD'],
    'UBER': ['LYFT', 'DASH']
}

def get_quant_user_id():
    user = users_collection.find_one({"username": "Sigma Alpha"})
    if not user:
        # Fallback for legacy
        user = users_collection.find_one({"username": "QuantModel_v1"})
    return user['_id'] if user else None

def fetch_macro_context():
    """
    Fetches Nasdaq-100 (QQQ) data to determine the global 'Macro Constraint'.
    Returns: DataFrame with 'Macro_Trend_Score' (Slope of SMA20).
    """
    print("  [Macro] Fetching Nasdaq-100 (QQQ) context...")
    print("  [Macro] Fetching Nasdaq-100 (QQQ) context...")
    
    # Calculate dates for 2y
    end_date = datetime.datetime.now() + datetime.timedelta(days=1)
    start_date = end_date - datetime.timedelta(days=730)
    
    # Use Node Adapter
    qqq = fetch_data_from_node_adapter("QQQ", start_date, end_date)
    
    if qqq is None:
        return pd.DataFrame({'Pct_Change': [], 'Macro_Trend': [], 'Macro_RSI': []})
        
    # Standardize Column Names if coming from Node adapter (already done inside adapter but let's be safe)
    # The adapter returns 'Close', 'Open' etc capitalized.
    
    # Flatten columns logic is NOT needed for Node adapter dataframe.
        
    qqq['Pct_Change'] = qqq['Close'].pct_change()
    
    # Macro Trend: Slope of 20-day SMA
    qqq['SMA_20'] = SMAIndicator(close=qqq['Close'], window=20).sma_indicator()
    qqq['Macro_Trend'] = qqq['SMA_20'].diff() # Positive = Uptrend, Negative = Downtrend
    
    # Macro RSI
    qqq['Macro_RSI'] = RSIIndicator(close=qqq['Close'], window=14).rsi()
    
    return qqq[['Pct_Change', 'Macro_Trend', 'Macro_RSI']]

def get_historical_earnings_dates(ticker):
    """
    Fetches valid historical earnings dates for the 'Event-Window' constraint.
    """
    try:
        t = yf.Ticker(ticker)
        # Fetch last 12 quarters (3 years approx)
        dates_df = t.earnings_dates
        if dates_df is None or dates_df.empty:
            return []
        
        # Filter for past dates only
        now = pd.Timestamp.now().tz_localize(None)
        
        # Ensure index is timezone-naive for comparison
        if dates_df.index.tz is not None:
            dates_df.index = dates_df.index.tz_localize(None)
            
        past_dates = dates_df[dates_df.index < now].index.sort_values(ascending=False).tolist()
        # Keep recent 8 quarters for relevance
        return past_dates[:8]
    except Exception as e:
        print(f"  [Warning] Could not fetch earnings dates for {ticker}: {e}")
        return []

def fetch_next_earnings_date(ticker):
    """
    Fetches the NEXT confirmed earnings date.
    Returns: datetime.date or None
    """
    try:
        t = yf.Ticker(ticker)
        cal = t.calendar
        if isinstance(cal, dict) and 'Earnings Date' in cal:
            dates = cal['Earnings Date']
            if dates:
                return dates[0]
    except Exception as e:
        print(f"  [Calendar Error] {ticker}: {e}")
    return None

def get_peer_sympathy_score(ticker):
    peers = PEER_GROUPS.get(ticker, [])
    score = 0.0
    if not peers: return 0.0
    
    for peer in peers:
        try:
            # 5 days check
            end_date = datetime.datetime.now() + datetime.timedelta(days=1)
            start_date = end_date - datetime.timedelta(days=10) # Ask for 10 to be safe for 5 trading days
            
            data = fetch_data_from_node_adapter(peer, start_date, end_date)
            
            if data is None or data.empty: continue
            
            # Flatten columns NOT needed.
            
            cum_ret = (data['Close'].iloc[-1] / data['Close'].iloc[0]) - 1
            if cum_ret > 0.04: score += 1.0
            elif cum_ret < -0.04: score -= 1.0
        except: continue
    return score

def fetch_data_from_node_adapter(ticker, start_date, end_date):
    """
    Calls the Node.js script to fetch data via yahoo-finance2.
    Returns: DataFrame
    """
    script_path = os.path.join(os.path.dirname(__file__), 'fetch_stock_history.js')
    
    # Format dates for CLI (ISO strings preferred by wrapper)
    # The wrapper likely expects "YYYY-MM-DD" or similar.
    # Our wrapper accepts raw strings.
    s_str = start_date.strftime('%Y-%m-%d')
    e_str = end_date.strftime('%Y-%m-%d')
    
    try:
        # Call Node script
        cmd = ['node', script_path, ticker, s_str, e_str]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Parse output
        data = json.loads(result.stdout)
        
        if not data or 'error' in data:
            print(f"  [Node Adapter Error] {data}")
            return None
            
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Ensure column names map to capitalized (yfinance style)
        # Node returns: date, open, high, low, close, volume, adjClose...
        df.rename(columns={
            'date': 'Date',
            'open': 'Open',
            'high': 'High',
            'low': 'Low',
            'close': 'Close',
            'volume': 'Volume'
        }, inplace=True)
        
        # Set Index
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        # Sort to ensure chronological order (Crucial step missed previously)
        df.sort_index(inplace=True)
        
        # Remove timezone if present/ambiguous, assuming Node returns UTC ISO
        if df.index.tz is not None:
             df.index = df.index.tz_convert(None)
        else:
             # If naive, leave it.
             pass

        return df
        
    except Exception as e:
        print(f"  [Node Adapter Exception] {e}")
        # Only print stderr if available
        # print(e.stderr if hasattr(e, 'stderr') else "")
        return None

def prepare_scientific_features(ticker, macro_data, days_until_earnings, period="2y"):
    """
    Constructs the rigorous feature vector X_t.
    Includes Days_Until_Earnings as a feature.
    """
    try:
        stock = yf.Ticker(ticker)
        # Force explicit date range to ensure freshness
        end_date = datetime.datetime.now() + datetime.timedelta(days=1)
        start_date = end_date - datetime.timedelta(days=730 if period=="2y" else 365)
        
        print(f"  [Data Fetch] {ticker} | Start: {start_date.date()} | End: {end_date.date()}")
        
        # call Node Adapter
        df = fetch_data_from_node_adapter(ticker, start_date, end_date)
        
        # Flatten MultiIndex NOT needed for Node adapter (it returns flat)
        # but keep logic if we revert? No, simple is better.
        
        if df is None: return None, None, [], None

        if df.empty or len(df) < 50: return None, None, [], None

        # 1. Base Technicals
        df['Returns'] = df['Close'].pct_change()
        df['Ret_Lag1'] = df['Returns'].shift(1)
        # ... (rest of features)

        # NEW: Days Until Earnings Feature
        # We fill this as a constant for the training set (approximated as 'near earnings')
        # Or better: construct it dynamically? For simplicity in this event-driven model,
        # we treat the training window as "Pre-Earnings" (Small Days Until).
        # But for the CURRENT inference row, we set it explicitly.
        df['Days_Until'] = 14 # Default for history (avg of 0-14)
        
        # ... feature engineering ...
        df['Ret_Lag2'] = df['Returns'].shift(2)
        df['Ret_Lag3'] = df['Returns'].shift(3)
        
        # 2. Volatility Mean Reversion (V_rev)
        df['Vol_5d'] = df['Returns'].rolling(5).std()
        df['V_rev'] = df['Ret_Lag1'] * df['Vol_5d']
        
        # 3. Hype Factor (Cumulative Abnormal Return)
        # Merge Macro Data (Date Match)
        if df.index.tz is not None: df.index = df.index.tz_localize(None)
        if macro_data.index.tz is not None: macro_data.index = macro_data.index.tz_localize(None)
        
        df = df.join(macro_data, how='left') # Joins Pct_Change as Market_Ret (needs rename if colliding)
        # Rename macro cols for clarity if needed, but here assuming unique names from fetch_macro_context
        
        # Abnormal Return = Stock Ret - Macro Ret (QQQ)
        df['Abnormal_Ret'] = df['Returns'] - df['Pct_Change']
        df['Hype_Factor'] = df['Abnormal_Ret'].rolling(window=30).sum()
        
        # 4. Target: 5-Day Forward Return
        df['Y_Target'] = df['Close'].shift(-5) / df['Close'] - 1
        
        # 5. Sympathy (Placeholder for history, filled for inference)
        df['Sympathy'] = 0.0
        
        # 6. Fed Data Feature (New)
        df['Days_Until_Fed'] = df.index.to_series().apply(lambda d: (get_next_fed_date(d.date()) - d.date()).days if get_next_fed_date(d.date()) else 99)
        df['Is_Fed_Week'] = df['Days_Until_Fed'].apply(lambda x: 1 if x <= 7 else 0)

        # Drop NaNs generated by shifting features (Beginning of history), 
        # BUT keep the end rows where Y_Target is NaN (Critical for Inference!)
        df.dropna(subset=['Ret_Lag3', 'Vol_5d', 'Hype_Factor', 'Macro_RSI', 'Days_Until_Fed'], inplace=True)
        
        # Fetch Event Dates for Filtering
        earnings_dates = get_historical_earnings_dates(ticker)
        
        return df, stock, earnings_dates, macro_data
        
    except Exception as e:
        print(f"Error prepping {ticker}: {e}")
        return None, None, [], None

def save_model(model, ticker):
    try:
        model_dir = os.path.join(os.path.dirname(__file__), 'models')
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
        path = os.path.join(model_dir, f"{ticker}_xgb.json")
        model.save_model(path)
        print(f"  [Persistence] Saved model to {path}")
    except Exception as e:
        print(f"  [Persistence Error] Could not save {ticker}: {e}")

def load_model(ticker):
    try:
        path = os.path.join(os.path.dirname(__file__), 'models', f"{ticker}_xgb.json")
        if os.path.exists(path):
            model = xgb.XGBRegressor()
            model.load_model(path)
            print(f"  [Persistence] Loaded brain for {ticker}")
            return model
    except Exception as e:
        print(f"  [Persistence Error] Could not load {ticker}: {e}")
    return None

def train_event_driven_model(ticker, df, earnings_dates, current_model=None):
    """
    Trains XGBoost ONLY on 'Pre-Earnings Windows' (Event-Driven Constraint).
    Refines 'Days_Until' logic.
    """
    # 0. Ensure clean data (Drop NaNs in Y_Target which are preserved for Inference)
    df.dropna(inplace=True)
    
    # 1. Filter Data Mask & Refine Days_Until
    mask = pd.Series(False, index=df.index)
    events_found = 0
    
    # We want to fill Days_Until accurately for the training set
    # Default was 14. We update it for the rows in the window.
    
    for edate in earnings_dates:
        # Define Window
        start_date = edate - pd.Timedelta(days=14)
        end_date = edate - pd.Timedelta(days=1)
        
        # Ensure edate is naive if df index is naive
        if edate.tzinfo is not None: edate = edate.tz_localize(None)
        
        # Identify rows in this window
        window_mask = (df.index >= start_date) & (df.index <= end_date)
        
        if window_mask.any():
            events_found += 1
            mask |= window_mask
            
            # Calculate Days Until for these rows
            # We must do this carefully. 
            # Vectorized: (edate - index).days
            # We only update rows where window_mask is True
            days_diff = (edate - df.index[window_mask]).days
            df.loc[window_mask, 'Days_Until'] = days_diff

    training_df = df[mask].copy()
    
    if len(training_df) < 20:
        print(f"  [Insufficient Event Data] Found {events_found} events, {len(training_df)} rows. Fallback to full history.")
        training_df = df.iloc[-250:]
    else:
        print(f"  [Event-Driven Mode] Training on {len(training_df)} rows across {events_found} historical earnings windows.")

    # Features
    feature_cols = ['Ret_Lag1', 'Ret_Lag2', 'V_rev', 'Vol_5d', 'Hype_Factor', 'Macro_Trend', 'Macro_RSI', 'Sympathy', 'Days_Until', 'Days_Until_Fed']
    X = training_df[feature_cols]
    y = training_df['Y_Target']
    
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=200,
        learning_rate=0.02, 
        max_depth=5,
        reg_lambda=1.0, 
        random_state=42
    )
    
    model.fit(X, y, xgb_model=current_model)
    
    # Logging Feature Importance
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    top_3 = [(feature_cols[i], importances[i]) for i in sorted_idx[:3]]
    print(f"  [Model Logic] Top Features: {top_3}")
    
    # Calc Training Error (RMSE)
    preds = model.predict(X)
    rmse = np.sqrt(np.mean((y - preds)**2))
    
    # NEW: Directional Accuracy
    correct_direction = np.sign(y) == np.sign(preds)
    accuracy = np.mean(correct_direction) * 100.0 # Percentage
    
    return model, rmse, accuracy, feature_cols
def run_quant_model(mode='inference', specific_ticker=None):
    user_id = get_quant_user_id()
    if not user_id: return

    print(f"\n=== Sigma Alpha Scientific Engine (v3.0 - {mode.capitalize()} Mode) ===")
    
    # 1. Fetch Global Macro Context
    macro_data = fetch_macro_context()
    if not macro_data.empty:
        current_macro_trend = macro_data['Macro_Trend'].iloc[-1]
        current_macro_rsi = macro_data['Macro_RSI'].iloc[-1]
    else:
        current_macro_trend = 0
        current_macro_rsi = 50
        
    print(f"  [Macro State] QQQ Trend: {current_macro_trend:.4f} | RSI: {current_macro_rsi:.1f}")

    avg_accuracy = 0
    processed_count = 0
    
    tickers_to_process = [specific_ticker] if specific_ticker else PEER_GROUPS.keys()
    
    for ticker in tickers_to_process:
        try:
            print(f"\n>> Analyzing {ticker}...")
            
            # 2A. Precision Scheduling (Calendar Gatekeeper)
            next_earnings_date = fetch_nasdaq_earnings_date(ticker)
            
            # Default Logic: If no date found, skip (Strict Mode)
            if not next_earnings_date:
                print("  [Schedule] No upcoming earnings date found. Skipping.")
                continue
                
            # Calc Days Until
            today = datetime.date.today()
            if isinstance(next_earnings_date, datetime.datetime):
                 next_earnings_date = next_earnings_date.date()
                 
            days_until = (next_earnings_date - today).days
            print(f"  [Schedule] Next Earnings: {next_earnings_date} (T-{days_until})")
            
            # INFERENCE MODE GATES
            if mode == 'inference':
                if days_until > 7 and days_until != 14:
                     pass # We continue to check specific windows below

                # Prediction Type Logic
                prediction_type = "Daily"
                if days_until == 7:
                    print("  [Schedule] T-7 Detected. Generating Weekly Prediction.")
                    prediction_type = "Weekly"
                elif days_until in [5, 4, 3, 2, 1]:
                    print(f"  [Schedule] T-{days_until} Detected. Generating Daily Prediction.")
                    prediction_type = "Daily"
                elif days_until == 14:
                    # Optional: Early Warning
                    pass
                else:
                    print(f"  [Schedule] T-{days_until} is outside active inference window. Skipping.")
                    continue
            
            # 2B. Data Acquisition
            fetch_period = "2y" if mode == 'train' else "1y"
            df, stock_obj, e_dates, _ = prepare_scientific_features(ticker, macro_data, days_until, period=fetch_period)
            
            if df is None:
                print("  [Error] Insufficient data. Skipping.")
                continue

            print(f"  [Data Debug] {ticker} | Last Date: {df.index[-1].date()} | Close: {df['Close'].iloc[-1]:.2f}")

            # 3. Mode Branching
            brain = load_model(ticker)
            
            if mode == 'train':
                # TRAIN MODE
                print("  [Mode] Starting Full Retraining...")
                model, rmse, accuracy, features = train_event_driven_model(ticker, df, e_dates, current_model=None) 
                # Save the updated brain
                save_model(model, ticker)
                
                avg_accuracy = (avg_accuracy * processed_count + accuracy) / (processed_count + 1)
                processed_count += 1
                
                # Update user metrics
                users_collection.update_one(
                    {"_id": user_id},
                    {"$set": {
                        "aiMetrics.lastRetrained": datetime.datetime.now(),
                        "aiMetrics.trainingAccuracy": float(round(avg_accuracy, 1)),
                        "aiMetrics.specialization": "Tech Momentum & Pre-Earnings Strategy"
                    }}
                )
                continue
                
            elif mode == 'inference':
                # INFERENCE MODE
                if not brain:
                    print("  [Mode] No Brain found. Skipping inference (Cluster must be trained first).")
                    continue
                    
                model = brain
                features = ['Ret_Lag1', 'Ret_Lag2', 'V_rev', 'Vol_5d', 'Hype_Factor', 'Macro_Trend', 'Macro_RSI', 'Sympathy', 'Days_Until', 'Days_Until_Fed'] 
                
                # Predict on LATEST row
                X_live = df.iloc[[-1]][features]
                current_price = df.iloc[-1]['Close']
                
                prediction_val = model.predict(X_live)[0]

                # --- SAFETY CLAMPS (Tuning v3.1) ---
                # 1. Fed Risk Dampener
                days_to_fed = X_live['Days_Until_Fed'].values[0]
                if days_to_fed <= 1:
                    print(f"  [Risk] Fed Decision in {days_to_fed} days. Dampening signal by 50%.")
                    prediction_val *= 0.5 

                # 2. Max Daily Move Constraint (Prevent Outliers like 18%)
                if prediction_type == "Daily":
                    max_move = 0.05 # 5% limit for daily predictions
                    if abs(prediction_val) > max_move:
                        print(f"  [Clamp] Predicted move {prediction_val*100:.1f}% exceeds limit. Clamping to {max_move*100:.1f}%.")
                        prediction_val = max_move if prediction_val > 0 else -max_move

                predicted_price = current_price * (1 + prediction_val)
                
                direction = "Bullish" if prediction_val > 0 else "Bearish"
                confidence = min(abs(prediction_val) * 1000, 95.0)
                sympathy = get_peer_sympathy_score(ticker)
                
                print(f"  [Inference] {ticker} -> {direction} (Target: {predicted_price:.2f})")
                
                # Check dupes
                existing = predictions_collection.find_one({
                    "userId": user_id, "stockTicker": ticker, "status": "Active"
                })
                if existing:
                    print("  [Skip] Active prediction exists.")
                    continue

                # Construct Rationale
                try:
                    importances = model.feature_importances_
                    top_idx = np.argsort(importances)[::-1][0]
                    top_feat = features[top_idx]
                    top_imp = importances[top_idx]
                except:
                    top_feat = "Quantitative"
                    top_imp = 0.0
                
                try:
                     recent_5d_return = (df.iloc[-1]['Close'] / df.iloc[-6]['Close']) - 1
                except:
                     recent_5d_return = 0.0
                     
                rationale = generate_natural_language_rationale(
                    ticker, direction, top_feat, top_imp, 85.0, current_macro_trend, sympathy, recent_5d_return, current_macro_rsi,
                    days_until_fed=X_live['Days_Until_Fed'].values[0]
                )
                     
                new_prediction = {
                    "userId": user_id,
                    "stockTicker": ticker,
                    "targetPrice": float(round(predicted_price, 2)),
                    "targetPriceAtCreation": float(round(predicted_price, 2)),
                    "predictionType": prediction_type,
                    "deadline": (
                        # For ALL predictions, we target Market Close (21:00 UTC / 4:00 PM EST)
                        # Weekly: Next Friday at 21:00 UTC
                        (datetime.datetime.now() + datetime.timedelta(days=(4 - datetime.date.today().weekday()) % 7)).replace(hour=21, minute=0, second=0, microsecond=0)
                        if prediction_type == "Weekly" else
                        # Daily: Today at 21:00 UTC (if before close), else Tomorrow at 21:00 UTC
                        (datetime.datetime.now().replace(hour=21, minute=0, second=0, microsecond=0) 
                         if datetime.datetime.now().hour < 21 else 
                         (datetime.datetime.now() + datetime.timedelta(days=1)).replace(hour=21, minute=0, second=0, microsecond=0))
                    ),
                    "status": "Pending", 
                    "rating": 0,
                    "actualPrice": None,
                    "priceAtCreation": float(round(current_price, 2)),
                    "maxRatingAtCreation": 100,
                    "currency": "USD",
                    "description": rationale,
                    "initialDescription": rationale,
                    "featureVector": X_live.to_dict(orient='records')[0],
                    "targetHit": False,
                    "createdAt": datetime.datetime.now(),
                    "updatedAt": datetime.datetime.now()
                }
                predictions_collection.insert_one(new_prediction)
                print(f"  [Signal] Saved {direction} prediction.")

        except Exception as e:
            print(f"  [CRITICAL ERROR] Failed to process {ticker}: {e}")
            continue

    print(f"\n--- [Cron] Bot Run Completed Successfully ---")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Sigma Alpha Quant Engine')
    parser.add_argument('--mode', type=str, default='inference', choices=['train', 'inference'], help='Mode: train (quarterly) or inference (daily)')
    parser.add_argument('--ticker', type=str, help='Specific ticker to process (optional)')
    args = parser.parse_args()
    
    run_quant_model(mode=args.mode, specific_ticker=args.ticker)
