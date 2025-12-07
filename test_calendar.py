
import yfinance as yf
import pandas as pd
import datetime

tickers = ['NVDA', 'ORCL', 'AVGO']

print(f"checking for {tickers}")

for ticker in tickers:
    try:
        t = yf.Ticker(ticker)
        
        # Method 1: Calendar is usually a dict
        cal = t.calendar
        print(f"\n--- {ticker} Calendar (Keys) ---")
        if isinstance(cal, dict):
            print(cal.keys())
            # Possible keys: 'Earnings Date', 'Earnings High', 'Earnings Low', 'Earnings Average'
            if 'Earnings Date' in cal:
                print(f"Next Earnings: {cal['Earnings Date']}")
        else:
            print("Calendar is not a dict?")
            print(cal)

    except Exception as e:
        print(f"Error for {ticker}: {e}")
