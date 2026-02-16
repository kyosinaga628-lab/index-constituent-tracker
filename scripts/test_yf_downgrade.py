import yfinance as yf

try:
    print("Testing yfinance...")
    ticker = yf.Ticker("AAPL")
    price = ticker.fast_info['lastPrice']
    print(f"AAPL Price: {price}")
    
    # Test multiple
    tickers = yf.Tickers("MSFT NVDA")
    print("MSFT:", tickers.tickers['MSFT'].fast_info['lastPrice'])
    print("NVDA:", tickers.tickers['NVDA'].fast_info['lastPrice'])
    
except Exception as e:
    print(f"Error: {e}")
