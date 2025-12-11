import os
import sys
import datetime
import json
import argparse
import subprocess
import pandas as pd
import numpy as np
from ta.volatility import BollingerBands
from ta.momentum import RSIIndicator

def get_node_adapter_path():
    return os.path.join(os.path.dirname(__file__), 'fetch_stock_history.js')

def fetch_data(ticker, period_days=20, interval='1h'): # Intraday default
    end_date = datetime.datetime.now() + datetime.timedelta(days=1)
    # Yahoo Limit: 60d for 1h data. 7d for 1m. limit to 20d for safety.
    start_date = end_date - datetime.timedelta(days=period_days)
    
    script_path = get_node_adapter_path()
    try:
        # Pass interval as 4th arg
        cmd = ['node', script_path, ticker, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'), interval]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        if not data or 'error' in data: return None
        
        df = pd.DataFrame(data)
        df.rename(columns={'date': 'Date', 'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'}, inplace=True)
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        df.sort_index(inplace=True)
        if df.index.tz is not None: df.index = df.index.tz_convert(None)
        return df
    except:
        return None

def analyze_gold_setup(ticker, interval='1h'):
    # Try requested interval (default 1h)
    df = fetch_data(ticker, interval=interval)
    
    # Fallback to Daily if Intraday fails
    if (df is None or len(df) < 20) and interval != '1d':
        # print(f"Fallback: {interval} -> 1d") # Debug
        interval = '1d'
        df = fetch_data(ticker, period_days=90, interval='1d')

    if df is None or len(df) < 20:
        return {"error": "Insufficient data"}

    col = 'Close'
    current_price = df[col].iloc[-1]
    
    # 1. Bollinger Bands Squeeze
    bb = BollingerBands(close=df[col], window=20, window_dev=2)
    df['bb_h'] = bb.bollinger_hband()
    df['bb_l'] = bb.bollinger_lband()
    df['bb_m'] = bb.bollinger_mavg()
    df['bb_w'] = (df['bb_h'] - df['bb_l']) / df['bb_l']
    
    # 2. RSI
    rsi = RSIIndicator(close=df[col], window=14)
    df['rsi'] = rsi.rsi()
    
    last_rsi = df['rsi'].iloc[-1]
    
    mid_band = df['bb_m'].iloc[-1]
    
    # Logic for Intraday (1H)
    # Overbought/Oversold thresholds tighter or standard? Standard 30/70 works for 1H.
    
    if last_rsi < 30:
        direction = "Bullish"
        target = mid_band
        rationale = f"Intraday Oversold (RSI {last_rsi:.1f}) - Bounce to Mean"
        timeframe = "4-8 Hours"
        if interval == '1d': timeframe = "2-3 Days"
    elif last_rsi > 70:
        direction = "Bearish"
        target = mid_band
        rationale = f"Intraday Overbought (RSI {last_rsi:.1f}) - Pullback to Mean"
        timeframe = "4-8 Hours"
        if interval == '1d': timeframe = "2-3 Days"
    else:
        # Momentum check
        ret_5 = df[col].pct_change(5).iloc[-1] # 5 hours return
        if ret_5 > 0:
            direction = "Bullish"
            target = df['bb_h'].iloc[-1] # Target upper band
            rationale = "Bullish Momentum Continuation"
            timeframe = "Short Term (4H)"
        else:
            direction = "Bearish"
            target = df['bb_l'].iloc[-1] # Target lower band
            rationale = "Bearish Momentum Continuation"
            timeframe = "Short Term (4H)"

    # Calculate % move
    pct_move = (target - current_price) / current_price
    
    return {
        "ticker": ticker,
        "current_price": current_price,
        "prediction": direction,
        "target_price": target,
        "pct_move": pct_move,
        "rationale": rationale,
        "timeframe": timeframe,
        "interval": interval
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('ticker', type=str)
    parser.add_argument('--interval', type=str, default='1h')
    args = parser.parse_args()
    
    result = analyze_gold_setup(args.ticker, interval=args.interval)
    print(json.dumps(result))
