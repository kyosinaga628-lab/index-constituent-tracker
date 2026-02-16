import pandas as pd
from yahooquery import Ticker
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
    print("Fetching S&P 500 list from Wikipedia...")
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    html = get_html_with_ua(url)
    tables = pd.read_html(html)
    df = tables[0]
    tickers = df['Symbol'].tolist()
    # Normalize tickers for yfinance/yahooquery (e.g. BRK.B -> BRK-B)
    tickers = [t.replace('.', '-') for t in tickers]
    
    # We can also get sector from Wiki, but let's try to get live from Yahoo if possible, 
    # or fallback to Wiki. Wiki is reliable for sector.
    return tickers, df.set_index('Symbol')['Security'].to_dict(), df.set_index('Symbol')['GICS Sector'].to_dict()

def get_nasdaq100_tickers():
    print("Fetching NASDAQ 100 list from Wikipedia...")
    url = "https://en.wikipedia.org/wiki/Nasdaq-100"
    html = get_html_with_ua(url)
    tables = pd.read_html(html)
    
    df = None
    for table in tables:
        if 'Ticker' in table.columns:
            df = table
            break
        if 'Symbol' in table.columns:
            df = table
            break
            
    if df is None:
        raise ValueError("Could not find NASDAQ 100 table")
    
    tickers = df['Ticker'].tolist() if 'Ticker' in df.columns else df['Symbol'].tolist()
    names = df['Company'].tolist()
    
    ticker_map = dict(zip(tickers, names))
    return tickers, ticker_map

def fetch_market_data(tickers):
    print(f"Fetching data for {len(tickers)} tickers using yahooquery...")
    
    # yahooquery handles batching efficiently
    # It sends requests for all tickers. 
    # To be safe with large lists, we can chunk if needed, but 500 might work in one go or yahooquery splits it.
    # yahooquery usually handles chunks of 100-250 internally or via configuration.
    # Let's chunk manually to be safe and show progress.
    
    chunk_size = 50
    all_data = []
    
    for i in range(0, len(tickers), chunk_size):
        chunk = tickers[i:i+chunk_size]
        print(f"Processing chunk {i//chunk_size + 1}/{(len(tickers)-1)//chunk_size + 1}...")
        
        try:
            yq = Ticker(chunk)
            
            # summary_detail gives price and market cap
            # price is 'regularMarketPrice' or 'previousClose' if market closed? 
            # 'regularMarketPrice' is usually available.
            
            # summary_profile gives sector
            
            # We need to fetch modules. 
            # Note: Ticker(...).price is a property that fetches price module.
            # Ticker(...).summary_profile fetches profile.
            
            # Let's fetch all needed modules in one go if possible, or access properties
            # yq.get_modules(['summaryDetail', 'summaryProfile', 'price'])
            
            data = yq.get_modules(['summaryDetail', 'price', 'summaryProfile'])
            
            # data is a dict keyed by ticker
            
            for ticker in chunk:
                try:
                    # data[ticker] might be a string (error) or dict
                    if isinstance(data.get(ticker), str):
                        print(f"Error for {ticker}: {data[ticker]}")
                        continue
                        
                    quote_type = data[ticker].get('quoteType', {}) # sometimes implies validity
                    price_module = data[ticker].get('price', {})
                    summary_detail = data[ticker].get('summaryDetail', {})
                    summary_profile = data[ticker].get('summaryProfile', {})
                    
                    # prioritizing regularMarketPrice
                    price = price_module.get('regularMarketPrice')
                    if price is None:
                        price = summary_detail.get('regularMarketPrice')
                    if price is None:
                         price = summary_detail.get('previousClose')
                         
                    mcap = summary_detail.get('marketCap')
                    
                    sector = summary_profile.get('sector', 'Unknown')
                    
                    if mcap is not None and price is not None:
                        all_data.append({
                            'ticker': ticker,
                            'marketCap': mcap,
                            'price': price,
                            'sector': sector # Enriched sector data
                        })
                    else:
                        print(f"Missing data for {ticker}")

                except Exception as e:
                    print(f"Error processing {ticker}: {e}")
                    
        except Exception as e:
            print(f"Batch error: {e}")
            
    return pd.DataFrame(all_data)

def save_constituents(index_name, df_weights, names_map=None, sectors_map=None):
    # Prepare standard JSON format
    constituents = []
    
    if df_weights.empty:
        print(f"No data found for {index_name}")
        return

    total_mcap = df_weights['marketCap'].sum()
    
    for _, row in df_weights.iterrows():
        ticker = row['ticker']
        weight = (row['marketCap'] / total_mcap) * 100
        
        name = names_map.get(ticker, ticker) if names_map else ticker
        
        # Use sector from API if available and valid, else fallback to Wiki map
        api_sector = row.get('sector')
        if api_sector and api_sector != 'Unknown':
             sector = api_sector
        else:
             sector = sectors_map.get(ticker.replace('-', '.'), 'Unknown') if sectors_map else 'Unknown'
        
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

    # Timezone: Keeping it simple, just local time str or UTC?
    # User asked for time. Let's provide standard format.
    now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    output = {
        "lastUpdated": now_str,
        "totalConstituents": len(constituents),
        "constituents": constituents,
        "sectors": sector_weights
    }
    
    # Ensure dir exists
    dest_dir = os.path.join(DATA_DIR, index_name)
    os.makedirs(dest_dir, exist_ok=True)
    
    with open(os.path.join(dest_dir, 'constituents.json'), 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=4, ensure_ascii=False)
        
    print(f"Saved {index_name} data. total: {len(constituents)}")

def update_sp500():
    print("Updating S&P 500...")
    tickers, names, sectors = get_sp500_tickers()
    df = fetch_market_data(tickers)
    save_constituents('sp500', df, names, sectors)

def update_nasdaq100():
    print("Updating NASDAQ 100...")
    tickers, names = get_nasdaq100_tickers()
    df = fetch_market_data(tickers)
    save_constituents('nasdaq100', df, names)

if __name__ == "__main__":
    update_sp500()
    update_nasdaq100()
