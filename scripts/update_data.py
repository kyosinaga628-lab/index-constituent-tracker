import pandas as pd
import yfinance as yf
import json
import os
import datetime
import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

def get_html_with_ua(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.text

def get_sp500_tickers():
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    html = get_html_with_ua(url)
    tables = pd.read_html(html)
    df = tables[0]
    tickers = df['Symbol'].tolist()
    # Normalize tickers for yfinance (e.g. BRK.B -> BRK-B)
    tickers = [t.replace('.', '-') for t in tickers]
    return tickers, df.set_index('Symbol')['Security'].to_dict(), df.set_index('Symbol')['GICS Sector'].to_dict()

def get_nasdaq100_tickers():
    url = "https://en.wikipedia.org/wiki/Nasdaq-100"
    html = get_html_with_ua(url)
    tables = pd.read_html(html)
    # The table index varies, usually the one with "Ticker" is correct
    for table in tables:
        if 'Ticker' in table.columns:
            df = table
            break
        if 'Symbol' in table.columns:
            df = table
            break
    
    tickers = df['Ticker'].tolist() if 'Ticker' in df.columns else df['Symbol'].tolist()
    names = df['Company'].tolist()
    
    ticker_map = dict(zip(tickers, names))
    return tickers, ticker_map

def fetch_market_data(tickers):
    print(f"Fetching data for {len(tickers)} tickers...")
    # Chunking to avoid URL too long error or rate limits
    chunk_size = 50
    all_data = []
    
    for i in range(0, len(tickers), chunk_size):
        chunk = tickers[i:i+chunk_size]
        try:
            # multiple tickers separated by space
            tickers_str = " ".join(chunk)
            info = yf.Tickers(tickers_str)
            
            for ticker in chunk:
                try:
                    obj = info.tickers[ticker]
                    # We need Market Cap for weighting
                    # fast_info is faster
                    mcap = obj.fast_info['marketCap']
                    price = obj.fast_info['lastPrice']
                    all_data.append({
                        'ticker': ticker,
                        'marketCap': mcap,
                        'price': price
                    })
                except Exception as e:
                    print(f"Error fetching {ticker}: {e}")
        except Exception as e:
            print(f"Batch error: {e}")
            
    return pd.DataFrame(all_data)

def save_constituents(index_name, df_weights, names_map=None, sectors_map=None):
    # Prepare standard JSON format
    constituents = []
    total_mcap = df_weights['marketCap'].sum()
    
    for _, row in df_weights.iterrows():
        ticker = row['ticker']
        weight = (row['marketCap'] / total_mcap) * 100
        
        name = names_map.get(ticker, ticker) if names_map else ticker
        sector = sectors_map.get(ticker.replace('-', '.'), 'Unknown') if sectors_map else 'Unknown'
        
        # NASDAQ sector fix if needed (Wikipedia might not have it in the same table)
        
        constituents.append({
            "ticker": ticker,
            "name": name,
            "sector": sector,
            "weight": round(weight, 4),
            "price": row['price']
        })
    
    # Sort by weight
    constituents.sort(key=lambda x: x['weight'], reverse=True)
    
    # Calculate Sector Weights
    sector_weights = {}
    for c in constituents:
        s = c['sector']
        sector_weights[s] = sector_weights.get(s, 0) + c['weight']
        
    # Round sector weights
    for s in sector_weights:
        sector_weights[s] = round(sector_weights[s], 2)

    output = {
        "lastUpdated": datetime.datetime.now().strftime('%Y-%m-%d'),
        "totalConstituents": len(constituents),
        "constituents": constituents,
        "sectors": sector_weights
    }
    
    # Ensure dir exists
    dest_dir = os.path.join(DATA_DIR, index_name)
    os.makedirs(dest_dir, exist_ok=True)
    
    with open(os.path.join(dest_dir, 'constituents.json'), 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=4, ensure_ascii=False)
        
    print(f"Saved {index_name} data.")

def update_sp500():
    print("Updating S&P 500...")
    tickers, names, sectors = get_sp500_tickers()
    df = fetch_market_data(tickers)
    save_constituents('sp500', df, names, sectors)

def update_nasdaq100():
    print("Updating NASDAQ 100...")
    tickers, names = get_nasdaq100_tickers()
    df = fetch_market_data(tickers)
    # NASDAQ sectors are tricky from Wikipedia, defaulting to Tech/Growth mixed or fetched from yfinance info if slow
    # For now, let's try to get sector from yfinance info (slow) or just map later.
    # To save time, I will set all to 'Technology' or 'Unknown' for now, or improve logic.
    # Actually, yfinance Ticker object has .info['sector'].
    
    # Let's do a quick enrichment
    # But for speed, I might skip sector for NASDAQ initially or fetch strictly needed ones.
    save_constituents('nasdaq100', df, names)

if __name__ == "__main__":
    update_sp500()
    update_nasdaq100()
