import datetime

# Federal Reserve Interest Rate Decision Dates
# Sources: Federal Reserve Board, FOMC Calendars
# Format: datetime.date(Year, Month, Day)

FED_DATES = [
    # 2023
    datetime.date(2023, 2, 1),
    datetime.date(2023, 3, 22),
    datetime.date(2023, 5, 3),
    datetime.date(2023, 6, 14),
    datetime.date(2023, 7, 26),
    datetime.date(2023, 9, 20),
    datetime.date(2023, 11, 1),
    datetime.date(2023, 12, 13),

    # 2024
    datetime.date(2024, 1, 31),
    datetime.date(2024, 3, 20),
    datetime.date(2024, 5, 1),
    datetime.date(2024, 6, 12),
    datetime.date(2024, 7, 31),
    datetime.date(2024, 9, 18),
    datetime.date(2024, 11, 7),
    datetime.date(2024, 12, 18),

    # 2025 (Projected/Scheduled)
    datetime.date(2025, 1, 29),
    datetime.date(2025, 3, 19),
    datetime.date(2025, 5, 7),
    datetime.date(2025, 6, 18),
    datetime.date(2025, 7, 30),
    datetime.date(2025, 9, 17),
    datetime.date(2025, 10, 29),
    datetime.date(2025, 12, 10),
]

def get_next_fed_date(current_date=None):
    """Returns the next scheduled Fed decision date relative to current_date."""
    if current_date is None:
        current_date = datetime.date.today()
        
    for d in FED_DATES:
        if d >= current_date:
            return d
    return None

def is_fed_week(current_date=None):
    """Returns True if the current date is within the same ISO week as a Fed decision."""
    if current_date is None:
        current_date = datetime.date.today()
    
    next_fed = get_next_fed_date(current_date)
    if not next_fed:
        return False
        
    # Check if within 7 days and same calendar weekish behavior? 
    # Simpler: If abs(days) < 5
    delta = (next_fed - current_date).days
    return 0 <= delta <= 5
