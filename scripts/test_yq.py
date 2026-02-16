from yahooquery import Ticker

try:
    print("Testing yahooquery...")
    symbols = ['AAPL', 'MSFT', 'NVDA']
    tickers = Ticker(symbols)
    
    # Get summary profile (includes sector) and price
    print("Fetching summary_profile...")
    summary_profile = tickers.summary_profile
    print(summary_profile)

    print("Fetching price...")
    price = tickers.price
    print(price)
    
except Exception as e:
    print(f"Error: {e}")
