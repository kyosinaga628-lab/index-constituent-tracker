import requests
import json

def get_quote(symbols):
    url = f"https://query2.finance.yahoo.com/v7/finance/quote?symbols={','.join(symbols)}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        r = requests.get(url, headers=headers)
        r.raise_for_status()
        data = r.json()
        return data
    except Exception as e:
        print(e)
        return None

print(get_quote(['AAPL', 'NVDA']))
