import sys
import os
import datetime

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from fed_data import get_next_fed_date, is_fed_week
    
    print("Successfully imported fed_data.")
    
    today = datetime.date.today()
    print(f"Today: {today}")
    
    next_fed = get_next_fed_date(today)
    print(f"Next Fed Date: {next_fed}")
    
    is_fed = is_fed_week(today)
    print(f"Is Fed Week? {is_fed}")
    
    # Test specific validation: Dec 18, 2024 is a Fed date.
    # If today is Dec 8, 2024. Next fed is Dec 18.
    # Dec 18 - Dec 8 = 10 days. So Is Fed Week should be False (>5 days).
    
    # Let's verify standard syntax check for earnings_model
    import earnings_model
    print("Successfully imported earnings_model (Syntax OK).")

except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
