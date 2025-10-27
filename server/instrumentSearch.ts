/**
 * Intelligent Instrument Search
 * 
 * Allows users to search by common names (e.g., "gold", "crude", "bitcoin")
 * and get relevant symbol suggestions across all markets
 */

export interface InstrumentSuggestion {
  symbol: string;
  name: string;
  market: string;
  description?: string;
  classification?: string; // spot, futures, stock, index, pair, etc.
}

/**
 * Comprehensive instrument database mapping common names to symbols
 */
export const instrumentDatabase: Record<string, InstrumentSuggestion[]> = {
  // Cryptocurrencies
  "bitcoin": [
    { symbol: "BTCUSDT", name: "Bitcoin", market: "cryptocurrency", description: "Leading cryptocurrency" },
    { symbol: "BTC-USD", name: "Bitcoin (Coinbase)", market: "cryptocurrency", description: "Bitcoin on Coinbase" },
  ],
  "btc": [
    { symbol: "BTCUSDT", name: "Bitcoin", market: "cryptocurrency", description: "Leading cryptocurrency" },
  ],
  "ethereum": [
    { symbol: "ETHUSDT", name: "Ethereum", market: "cryptocurrency", description: "Smart contract platform" },
    { symbol: "ETH-USD", name: "Ethereum (Coinbase)", market: "cryptocurrency", description: "Ethereum on Coinbase" },
  ],
  "eth": [
    { symbol: "ETHUSDT", name: "Ethereum", market: "cryptocurrency", description: "Smart contract platform" },
  ],
  "bnb": [
    { symbol: "BNBUSDT", name: "Binance Coin", market: "cryptocurrency", description: "Binance exchange token" },
  ],
  "binance": [
    { symbol: "BNBUSDT", name: "Binance Coin", market: "cryptocurrency", description: "Binance exchange token" },
  ],
  "solana": [
    { symbol: "SOLUSDT", name: "Solana", market: "cryptocurrency", description: "Fast blockchain platform" },
  ],
  "sol": [
    { symbol: "SOLUSDT", name: "Solana", market: "cryptocurrency", description: "Fast blockchain platform" },
  ],
  "ripple": [
    { symbol: "XRPUSDT", name: "XRP", market: "cryptocurrency", description: "Ripple payment network" },
  ],
  "xrp": [
    { symbol: "XRPUSDT", name: "XRP", market: "cryptocurrency", description: "Ripple payment network" },
  ],
  "cardano": [
    { symbol: "ADAUSDT", name: "Cardano", market: "cryptocurrency", description: "Proof-of-stake blockchain" },
  ],
  "ada": [
    { symbol: "ADAUSDT", name: "Cardano", market: "cryptocurrency", description: "Proof-of-stake blockchain" },
  ],
  "dogecoin": [
    { symbol: "DOGEUSDT", name: "Dogecoin", market: "cryptocurrency", description: "Meme cryptocurrency" },
  ],
  "doge": [
    { symbol: "DOGEUSDT", name: "Dogecoin", market: "cryptocurrency", description: "Meme cryptocurrency" },
  ],

  // Precious Metals (Commodities) - Yahoo Finance only supports futures symbols
  "gold": [
    { symbol: "GC=F", name: "Gold Futures", market: "commodity", description: "Gold futures (Yahoo Finance symbol)" },
  ],
  "silver": [
    { symbol: "SI=F", name: "Silver Futures", market: "commodity", description: "Silver futures (Yahoo Finance symbol)" },
  ],
  "platinum": [
    { symbol: "PL=F", name: "Platinum Futures", market: "commodity", description: "Platinum futures (Yahoo Finance symbol)" },
  ],
  "palladium": [
    { symbol: "PA=F", name: "Palladium Futures", market: "commodity", description: "Palladium futures (Yahoo Finance symbol)" },
  ],

  // Energy Commodities - Yahoo Finance only supports futures symbols
  "crude": [
    { symbol: "CL=F", name: "WTI Crude Oil", market: "commodity", description: "WTI crude oil (Yahoo Finance futures symbol)" },
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil (Yahoo Finance futures symbol)" },
  ],
  "oil": [
    { symbol: "CL=F", name: "WTI Crude Oil", market: "commodity", description: "WTI crude oil (Yahoo Finance futures symbol)" },
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil (Yahoo Finance futures symbol)" },
  ],
  "wti": [
    { symbol: "CL=F", name: "WTI Crude Oil", market: "commodity", description: "WTI crude oil (Yahoo Finance futures symbol)" },
  ],
  "brent": [
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil (Yahoo Finance futures symbol)" },
  ],
  "natural gas": [
    { symbol: "NG=F", name: "Natural Gas", market: "commodity", description: "Natural gas (Yahoo Finance futures symbol)" },
  ],
  "gas": [
    { symbol: "NG=F", name: "Natural Gas", market: "commodity", description: "Natural gas (Yahoo Finance futures symbol)" },
  ],
  "natural": [
    { symbol: "NG=F", name: "Natural Gas", market: "commodity", description: "Natural gas (Yahoo Finance futures symbol)" },
  ],

  // Agricultural Commodities
  "corn": [
    { symbol: "ZC=F", name: "Corn Futures", market: "commodity", description: "Corn commodity futures" },
  ],
  "wheat": [
    { symbol: "ZW=F", name: "Wheat Futures", market: "commodity", description: "Wheat commodity futures" },
  ],
  "soybeans": [
    { symbol: "ZS=F", name: "Soybean Futures", market: "commodity", description: "Soybean commodity futures" },
  ],
  "coffee": [
    { symbol: "KC=F", name: "Coffee Futures", market: "commodity", description: "Coffee commodity futures" },
  ],
  "sugar": [
    { symbol: "SB=F", name: "Sugar Futures", market: "commodity", description: "Sugar commodity futures" },
  ],
  "cotton": [
    { symbol: "CT=F", name: "Cotton Futures", market: "commodity", description: "Cotton commodity futures" },
  ],

  // Major Forex Pairs (Explicit 6-letter format to prevent Yahoo Finance auto-conversion)
  // EUR Pairs
  "euro": [
    { symbol: "EUR/USD", name: "EUR/USD", market: "forex", description: "Euro to US Dollar" },
    { symbol: "EUR/GBP", name: "EUR/GBP", market: "forex", description: "Euro to British Pound" },
    { symbol: "EUR/JPY", name: "EUR/JPY", market: "forex", description: "Euro to Japanese Yen" },
  ],
  "eurusd": [
    { symbol: "EUR/USD", name: "EUR/USD", market: "forex", description: "Euro to US Dollar" },
  ],
  "eur/usd": [
    { symbol: "EUR/USD", name: "EUR/USD", market: "forex", description: "Euro to US Dollar" },
  ],
  "usdeur": [
    { symbol: "USD/EUR", name: "USD/EUR", market: "forex", description: "US Dollar to Euro" },
  ],
  "usd/eur": [
    { symbol: "USD/EUR", name: "USD/EUR", market: "forex", description: "US Dollar to Euro" },
  ],
  "eurgbp": [
    { symbol: "EUR/GBP", name: "EUR/GBP", market: "forex", description: "Euro to British Pound" },
  ],
  "eur/gbp": [
    { symbol: "EUR/GBP", name: "EUR/GBP", market: "forex", description: "Euro to British Pound" },
  ],
  "gbpeur": [
    { symbol: "GBP/EUR", name: "GBP/EUR", market: "forex", description: "British Pound to Euro" },
  ],
  "gbp/eur": [
    { symbol: "GBP/EUR", name: "GBP/EUR", market: "forex", description: "British Pound to Euro" },
  ],
  "eurjpy": [
    { symbol: "EUR/JPY", name: "EUR/JPY", market: "forex", description: "Euro to Japanese Yen" },
  ],
  "eur/jpy": [
    { symbol: "EUR/JPY", name: "EUR/JPY", market: "forex", description: "Euro to Japanese Yen" },
  ],
  "jpyeur": [
    { symbol: "JPY/EUR", name: "JPY/EUR", market: "forex", description: "Japanese Yen to Euro" },
  ],
  "jpy/eur": [
    { symbol: "JPY/EUR", name: "JPY/EUR", market: "forex", description: "Japanese Yen to Euro" },
  ],
  "eurchf": [
    { symbol: "EUR/CHF", name: "EUR/CHF", market: "forex", description: "Euro to Swiss Franc" },
  ],
  "eur/chf": [
    { symbol: "EUR/CHF", name: "EUR/CHF", market: "forex", description: "Euro to Swiss Franc" },
  ],
  "chfeur": [
    { symbol: "CHF/EUR", name: "CHF/EUR", market: "forex", description: "Swiss Franc to Euro" },
  ],
  "chf/eur": [
    { symbol: "CHF/EUR", name: "CHF/EUR", market: "forex", description: "Swiss Franc to Euro" },
  ],
  "euraud": [
    { symbol: "EUR/AUD", name: "EUR/AUD", market: "forex", description: "Euro to Australian Dollar" },
  ],
  "eur/aud": [
    { symbol: "EUR/AUD", name: "EUR/AUD", market: "forex", description: "Euro to Australian Dollar" },
  ],
  "audeur": [
    { symbol: "AUD/EUR", name: "AUD/EUR", market: "forex", description: "Australian Dollar to Euro" },
  ],
  "aud/eur": [
    { symbol: "AUD/EUR", name: "AUD/EUR", market: "forex", description: "Australian Dollar to Euro" },
  ],
  "eurcad": [
    { symbol: "EUR/CAD", name: "EUR/CAD", market: "forex", description: "Euro to Canadian Dollar" },
  ],
  "eur/cad": [
    { symbol: "EUR/CAD", name: "EUR/CAD", market: "forex", description: "Euro to Canadian Dollar" },
  ],
  "cadeur": [
    { symbol: "CAD/EUR", name: "CAD/EUR", market: "forex", description: "Canadian Dollar to Euro" },
  ],
  "cad/eur": [
    { symbol: "CAD/EUR", name: "CAD/EUR", market: "forex", description: "Canadian Dollar to Euro" },
  ],
  "eurnzd": [
    { symbol: "EUR/NZD", name: "EUR/NZD", market: "forex", description: "Euro to New Zealand Dollar" },
  ],
  "eur/nzd": [
    { symbol: "EUR/NZD", name: "EUR/NZD", market: "forex", description: "Euro to New Zealand Dollar" },
  ],
  "nzdeur": [
    { symbol: "NZD/EUR", name: "NZD/EUR", market: "forex", description: "New Zealand Dollar to Euro" },
  ],
  "nzd/eur": [
    { symbol: "NZD/EUR", name: "NZD/EUR", market: "forex", description: "New Zealand Dollar to Euro" },
  ],
  
  // GBP Pairs
  "gbp": [
    { symbol: "GBP/USD", name: "GBP/USD", market: "forex", description: "British Pound to US Dollar" },
    { symbol: "GBP/JPY", name: "GBP/JPY", market: "forex", description: "British Pound to Japanese Yen" },
  ],
  "pound": [
    { symbol: "GBP/USD", name: "GBP/USD", market: "forex", description: "British Pound to US Dollar" },
  ],
  "gbpusd": [
    { symbol: "GBP/USD", name: "GBP/USD", market: "forex", description: "British Pound to US Dollar" },
  ],
  "gbp/usd": [
    { symbol: "GBP/USD", name: "GBP/USD", market: "forex", description: "British Pound to US Dollar" },
  ],
  "usdgbp": [
    { symbol: "USD/GBP", name: "USD/GBP", market: "forex", description: "US Dollar to British Pound" },
  ],
  "usd/gbp": [
    { symbol: "USD/GBP", name: "USD/GBP", market: "forex", description: "US Dollar to British Pound" },
  ],
  "gbpjpy": [
    { symbol: "GBP/JPY", name: "GBP/JPY", market: "forex", description: "British Pound to Japanese Yen" },
  ],
  "gbp/jpy": [
    { symbol: "GBP/JPY", name: "GBP/JPY", market: "forex", description: "British Pound to Japanese Yen" },
  ],
  "jpygbp": [
    { symbol: "JPY/GBP", name: "JPY/GBP", market: "forex", description: "Japanese Yen to British Pound" },
  ],
  "jpy/gbp": [
    { symbol: "JPY/GBP", name: "JPY/GBP", market: "forex", description: "Japanese Yen to British Pound" },
  ],
  "gbpchf": [
    { symbol: "GBP/CHF", name: "GBP/CHF", market: "forex", description: "British Pound to Swiss Franc" },
  ],
  "gbp/chf": [
    { symbol: "GBP/CHF", name: "GBP/CHF", market: "forex", description: "British Pound to Swiss Franc" },
  ],
  "chfgbp": [
    { symbol: "CHF/GBP", name: "CHF/GBP", market: "forex", description: "Swiss Franc to British Pound" },
  ],
  "chf/gbp": [
    { symbol: "CHF/GBP", name: "CHF/GBP", market: "forex", description: "Swiss Franc to British Pound" },
  ],
  "gbpaud": [
    { symbol: "GBP/AUD", name: "GBP/AUD", market: "forex", description: "British Pound to Australian Dollar" },
  ],
  "gbp/aud": [
    { symbol: "GBP/AUD", name: "GBP/AUD", market: "forex", description: "British Pound to Australian Dollar" },
  ],
  "audgbp": [
    { symbol: "AUD/GBP", name: "AUD/GBP", market: "forex", description: "Australian Dollar to British Pound" },
  ],
  "aud/gbp": [
    { symbol: "AUD/GBP", name: "AUD/GBP", market: "forex", description: "Australian Dollar to British Pound" },
  ],
  "gbpcad": [
    { symbol: "GBP/CAD", name: "GBP/CAD", market: "forex", description: "British Pound to Canadian Dollar" },
  ],
  "gbp/cad": [
    { symbol: "GBP/CAD", name: "GBP/CAD", market: "forex", description: "British Pound to Canadian Dollar" },
  ],
  "cadgbp": [
    { symbol: "CAD/GBP", name: "CAD/GBP", market: "forex", description: "Canadian Dollar to British Pound" },
  ],
  "cad/gbp": [
    { symbol: "CAD/GBP", name: "CAD/GBP", market: "forex", description: "Canadian Dollar to British Pound" },
  ],
  "gbpnzd": [
    { symbol: "GBP/NZD", name: "GBP/NZD", market: "forex", description: "British Pound to New Zealand Dollar" },
  ],
  "gbp/nzd": [
    { symbol: "GBP/NZD", name: "GBP/NZD", market: "forex", description: "British Pound to New Zealand Dollar" },
  ],
  "nzdgbp": [
    { symbol: "NZD/GBP", name: "NZD/GBP", market: "forex", description: "New Zealand Dollar to British Pound" },
  ],
  "nzd/gbp": [
    { symbol: "NZD/GBP", name: "NZD/GBP", market: "forex", description: "New Zealand Dollar to British Pound" },
  ],
  
  // JPY Pairs
  "yen": [
    { symbol: "USD/JPY", name: "USD/JPY", market: "forex", description: "US Dollar to Japanese Yen" },
  ],
  "jpy": [
    { symbol: "USD/JPY", name: "USD/JPY", market: "forex", description: "US Dollar to Japanese Yen" },
    { symbol: "JPY/USD", name: "JPY/USD", market: "forex", description: "Japanese Yen to US Dollar" },
  ],
  "usdjpy": [
    { symbol: "USD/JPY", name: "USD/JPY", market: "forex", description: "US Dollar to Japanese Yen" },
  ],
  "jpyusd": [
    { symbol: "JPY/USD", name: "JPY/USD", market: "forex", description: "Japanese Yen to US Dollar" },
  ],
  "audjpy": [
    { symbol: "AUD/JPY", name: "AUD/JPY", market: "forex", description: "Australian Dollar to Japanese Yen" },
  ],
  "jpyaud": [
    { symbol: "JPY/AUD", name: "JPY/AUD", market: "forex", description: "Japanese Yen to Australian Dollar" },
  ],
  "cadjpy": [
    { symbol: "CAD/JPY", name: "CAD/JPY", market: "forex", description: "Canadian Dollar to Japanese Yen" },
  ],
  "jpycad": [
    { symbol: "JPY/CAD", name: "JPY/CAD", market: "forex", description: "Japanese Yen to Canadian Dollar" },
  ],
  "chfjpy": [
    { symbol: "CHF/JPY", name: "CHF/JPY", market: "forex", description: "Swiss Franc to Japanese Yen" },
  ],
  "jpychf": [
    { symbol: "JPY/CHF", name: "JPY/CHF", market: "forex", description: "Japanese Yen to Swiss Franc" },
  ],
  "nzdjpy": [
    { symbol: "NZD/JPY", name: "NZD/JPY", market: "forex", description: "New Zealand Dollar to Japanese Yen" },
  ],
  "jpynzd": [
    { symbol: "JPY/NZD", name: "JPY/NZD", market: "forex", description: "Japanese Yen to New Zealand Dollar" },
  ],
  
  // CAD Pairs
  "cad": [
    { symbol: "USD/CAD", name: "USD/CAD", market: "forex", description: "US Dollar to Canadian Dollar" },
    { symbol: "CAD/USD", name: "CAD/USD", market: "forex", description: "Canadian Dollar to US Dollar" },
  ],
  "usdcad": [
    { symbol: "USD/CAD", name: "USD/CAD", market: "forex", description: "US Dollar to Canadian Dollar" },
  ],
  "cadusd": [
    { symbol: "CAD/USD", name: "CAD/USD", market: "forex", description: "Canadian Dollar to US Dollar" },
  ],
  "audcad": [
    { symbol: "AUD/CAD", name: "AUD/CAD", market: "forex", description: "Australian Dollar to Canadian Dollar" },
  ],
  "cadaud": [
    { symbol: "CAD/AUD", name: "CAD/AUD", market: "forex", description: "Canadian Dollar to Australian Dollar" },
  ],
  "cadchf": [
    { symbol: "CAD/CHF", name: "CAD/CHF", market: "forex", description: "Canadian Dollar to Swiss Franc" },
  ],
  "chfcad": [
    { symbol: "CHF/CAD", name: "CHF/CAD", market: "forex", description: "Swiss Franc to Canadian Dollar" },
  ],
  "nzdcad": [
    { symbol: "NZD/CAD", name: "NZD/CAD", market: "forex", description: "New Zealand Dollar to Canadian Dollar" },
  ],
  "cadnzd": [
    { symbol: "CAD/NZD", name: "CAD/NZD", market: "forex", description: "Canadian Dollar to New Zealand Dollar" },
  ],
  
  // AUD Pairs
  "aud": [
    { symbol: "AUD/USD", name: "AUD/USD", market: "forex", description: "Australian Dollar to US Dollar" },
    { symbol: "USD/AUD", name: "USD/AUD", market: "forex", description: "US Dollar to Australian Dollar" },
  ],
  "audusd": [
    { symbol: "AUD/USD", name: "AUD/USD", market: "forex", description: "Australian Dollar to US Dollar" },
  ],
  "usdaud": [
    { symbol: "USD/AUD", name: "USD/AUD", market: "forex", description: "US Dollar to Australian Dollar" },
  ],
  "audchf": [
    { symbol: "AUD/CHF", name: "AUD/CHF", market: "forex", description: "Australian Dollar to Swiss Franc" },
  ],
  "chfaud": [
    { symbol: "CHF/AUD", name: "CHF/AUD", market: "forex", description: "Swiss Franc to Australian Dollar" },
  ],
  "audnzd": [
    { symbol: "AUD/NZD", name: "AUD/NZD", market: "forex", description: "Australian Dollar to New Zealand Dollar" },
  ],
  "nzdaud": [
    { symbol: "NZD/AUD", name: "NZD/AUD", market: "forex", description: "New Zealand Dollar to Australian Dollar" },
  ],
  
  // NZD Pairs
  "nzd": [
    { symbol: "NZD/USD", name: "NZD/USD", market: "forex", description: "New Zealand Dollar to US Dollar" },
    { symbol: "USD/NZD", name: "USD/NZD", market: "forex", description: "US Dollar to New Zealand Dollar" },
  ],
  "nzdusd": [
    { symbol: "NZD/USD", name: "NZD/USD", market: "forex", description: "New Zealand Dollar to US Dollar" },
  ],
  "usdnzd": [
    { symbol: "USD/NZD", name: "USD/NZD", market: "forex", description: "US Dollar to New Zealand Dollar" },
  ],
  "nzdchf": [
    { symbol: "NZD/CHF", name: "NZD/CHF", market: "forex", description: "New Zealand Dollar to Swiss Franc" },
  ],
  "chfnzd": [
    { symbol: "CHF/NZD", name: "CHF/NZD", market: "forex", description: "Swiss Franc to New Zealand Dollar" },
  ],
  
  // CHF Pairs
  "chf": [
    { symbol: "USD/CHF", name: "USD/CHF", market: "forex", description: "US Dollar to Swiss Franc" },
    { symbol: "CHF/USD", name: "CHF/USD", market: "forex", description: "Swiss Franc to US Dollar" },
  ],
  "usdchf": [
    { symbol: "USD/CHF", name: "USD/CHF", market: "forex", description: "US Dollar to Swiss Franc" },
  ],
  "chfusd": [
    { symbol: "CHF/USD", name: "CHF/USD", market: "forex", description: "Swiss Franc to US Dollar" },
  ],
  
  // Emerging Market Pairs
  "inr": [
    { symbol: "USD/INR", name: "USD/INR", market: "forex", description: "US Dollar to Indian Rupee" },
    { symbol: "INR/USD", name: "INR/USD", market: "forex", description: "Indian Rupee to US Dollar" },
  ],
  "usdinr": [
    { symbol: "USD/INR", name: "USD/INR", market: "forex", description: "US Dollar to Indian Rupee" },
  ],
  "inrusd": [
    { symbol: "INR/USD", name: "INR/USD", market: "forex", description: "Indian Rupee to US Dollar" },
  ],
  "cny": [
    { symbol: "USD/CNY", name: "USD/CNY", market: "forex", description: "US Dollar to Chinese Yuan" },
    { symbol: "CNY/USD", name: "CNY/USD", market: "forex", description: "Chinese Yuan to US Dollar" },
  ],
  "usdcny": [
    { symbol: "USD/CNY", name: "USD/CNY", market: "forex", description: "US Dollar to Chinese Yuan" },
  ],
  "cnyusd": [
    { symbol: "CNY/USD", name: "CNY/USD", market: "forex", description: "Chinese Yuan to US Dollar" },
  ],
  "brl": [
    { symbol: "USD/BRL", name: "USD/BRL", market: "forex", description: "US Dollar to Brazilian Real" },
    { symbol: "BRL/USD", name: "BRL/USD", market: "forex", description: "Brazilian Real to US Dollar" },
  ],
  "usdbrl": [
    { symbol: "USD/BRL", name: "USD/BRL", market: "forex", description: "US Dollar to Brazilian Real" },
  ],
  "brlusd": [
    { symbol: "BRL/USD", name: "BRL/USD", market: "forex", description: "Brazilian Real to US Dollar" },
  ],
  "mxn": [
    { symbol: "USD/MXN", name: "USD/MXN", market: "forex", description: "US Dollar to Mexican Peso" },
    { symbol: "MXN/USD", name: "MXN/USD", market: "forex", description: "Mexican Peso to US Dollar" },
  ],
  "usdmxn": [
    { symbol: "USD/MXN", name: "USD/MXN", market: "forex", description: "US Dollar to Mexican Peso" },
  ],
  "mxnusd": [
    { symbol: "MXN/USD", name: "MXN/USD", market: "forex", description: "Mexican Peso to US Dollar" },
  ],
  "zar": [
    { symbol: "USD/ZAR", name: "USD/ZAR", market: "forex", description: "US Dollar to South African Rand" },
    { symbol: "ZAR/USD", name: "ZAR/USD", market: "forex", description: "South African Rand to US Dollar" },
  ],
  "usdzar": [
    { symbol: "USD/ZAR", name: "USD/ZAR", market: "forex", description: "US Dollar to South African Rand" },
  ],
  "zarusd": [
    { symbol: "ZAR/USD", name: "ZAR/USD", market: "forex", description: "South African Rand to US Dollar" },
  ],
  "rub": [
    { symbol: "USD/RUB", name: "USD/RUB", market: "forex", description: "US Dollar to Russian Ruble" },
    { symbol: "RUB/USD", name: "RUB/USD", market: "forex", description: "Russian Ruble to US Dollar" },
  ],
  "usdrub": [
    { symbol: "USD/RUB", name: "USD/RUB", market: "forex", description: "US Dollar to Russian Ruble" },
  ],
  "rubusd": [
    { symbol: "RUB/USD", name: "RUB/USD", market: "forex", description: "Russian Ruble to US Dollar" },
  ],
  "krw": [
    { symbol: "USD/KRW", name: "USD/KRW", market: "forex", description: "US Dollar to South Korean Won" },
    { symbol: "KRW/USD", name: "KRW/USD", market: "forex", description: "South Korean Won to US Dollar" },
  ],
  "usdkrw": [
    { symbol: "USD/KRW", name: "USD/KRW", market: "forex", description: "US Dollar to South Korean Won" },
  ],
  "krwusd": [
    { symbol: "KRW/USD", name: "KRW/USD", market: "forex", description: "South Korean Won to US Dollar" },
  ],
  "sgd": [
    { symbol: "USD/SGD", name: "USD/SGD", market: "forex", description: "US Dollar to Singapore Dollar" },
    { symbol: "SGD/USD", name: "SGD/USD", market: "forex", description: "Singapore Dollar to US Dollar" },
  ],
  "usdsgd": [
    { symbol: "USD/SGD", name: "USD/SGD", market: "forex", description: "US Dollar to Singapore Dollar" },
  ],
  "sgdusd": [
    { symbol: "SGD/USD", name: "SGD/USD", market: "forex", description: "Singapore Dollar to US Dollar" },
  ],
  "hkd": [
    { symbol: "USD/HKD", name: "USD/HKD", market: "forex", description: "US Dollar to Hong Kong Dollar" },
    { symbol: "HKD/USD", name: "HKD/USD", market: "forex", description: "Hong Kong Dollar to US Dollar" },
  ],
  "usdhkd": [
    { symbol: "USD/HKD", name: "USD/HKD", market: "forex", description: "US Dollar to Hong Kong Dollar" },
  ],
  "hkdusd": [
    { symbol: "HKD/USD", name: "HKD/USD", market: "forex", description: "Hong Kong Dollar to US Dollar" },
  ],
  "thb": [
    { symbol: "USD/THB", name: "USD/THB", market: "forex", description: "US Dollar to Thai Baht" },
    { symbol: "THB/USD", name: "THB/USD", market: "forex", description: "Thai Baht to US Dollar" },
  ],
  "usdthb": [
    { symbol: "USD/THB", name: "USD/THB", market: "forex", description: "US Dollar to Thai Baht" },
  ],
  "thbusd": [
    { symbol: "THB/USD", name: "THB/USD", market: "forex", description: "Thai Baht to US Dollar" },
  ],
  "try": [
    { symbol: "USD/TRY", name: "USD/TRY", market: "forex", description: "US Dollar to Turkish Lira" },
    { symbol: "TRY/USD", name: "TRY/USD", market: "forex", description: "Turkish Lira to US Dollar" },
  ],
  "usdtry": [
    { symbol: "USD/TRY", name: "USD/TRY", market: "forex", description: "US Dollar to Turkish Lira" },
  ],
  "tryusd": [
    { symbol: "TRY/USD", name: "TRY/USD", market: "forex", description: "Turkish Lira to US Dollar" },
  ],

  // Major US Stocks
  "apple": [
    { symbol: "AAPL", name: "Apple Inc.", market: "stock", description: "Technology company" },
  ],
  "microsoft": [
    { symbol: "MSFT", name: "Microsoft Corporation", market: "stock", description: "Software company" },
  ],
  "google": [
    { symbol: "GOOGL", name: "Alphabet Inc.", market: "stock", description: "Technology conglomerate" },
  ],
  "amazon": [
    { symbol: "AMZN", name: "Amazon.com Inc.", market: "stock", description: "E-commerce company" },
  ],
  "tesla": [
    { symbol: "TSLA", name: "Tesla Inc.", market: "stock", description: "Electric vehicle company" },
  ],
  "meta": [
    { symbol: "META", name: "Meta Platforms Inc.", market: "stock", description: "Social media company" },
  ],
  "facebook": [
    { symbol: "META", name: "Meta Platforms Inc.", market: "stock", description: "Social media company (formerly Facebook)" },
  ],
  "nvidia": [
    { symbol: "NVDA", name: "NVIDIA Corporation", market: "stock", description: "Graphics processing company" },
  ],
  "netflix": [
    { symbol: "NFLX", name: "Netflix Inc.", market: "stock", description: "Streaming service" },
  ],
  "coca cola": [
    { symbol: "KO", name: "The Coca-Cola Company", market: "stock", description: "Beverage company" },
  ],
  "coca-cola": [
    { symbol: "KO", name: "The Coca-Cola Company", market: "stock", description: "Beverage company" },
  ],

  // Market Indices
  "s&p": [
    { symbol: "^GSPC", name: "S&P 500", market: "stock", description: "US stock market index" },
  ],
  "sp500": [
    { symbol: "^GSPC", name: "S&P 500", market: "stock", description: "US stock market index" },
  ],
  "dow": [
    { symbol: "^DJI", name: "Dow Jones", market: "stock", description: "US stock market index" },
  ],
  "nasdaq": [
    { symbol: "^IXIC", name: "NASDAQ", market: "stock", description: "US tech stock index" },
  ],
  "nifty": [
    { symbol: "^NSEI", name: "NIFTY 50", market: "stock", description: "Indian stock market index" },
  ],
  "sensex": [
    { symbol: "^BSESN", name: "BSE SENSEX", market: "stock", description: "Indian stock market index" },
  ],

  // Indian Stocks
  "ndtv": [
    { symbol: "NDTV.NS", name: "New Delhi Television Ltd", market: "stock", description: "Indian media company (NSE)" },
    { symbol: "NDTV.BO", name: "New Delhi Television Ltd", market: "stock", description: "Indian media company (BSE)" },
  ],
  "reliance": [
    { symbol: "RELIANCE.NS", name: "Reliance Industries", market: "stock", description: "Indian conglomerate (NSE)" },
    { symbol: "RELIANCE.BO", name: "Reliance Industries", market: "stock", description: "Indian conglomerate (BSE)" },
  ],
  "tcs": [
    { symbol: "TCS.NS", name: "Tata Consultancy Services", market: "stock", description: "Indian IT company (NSE)" },
    { symbol: "TCS.BO", name: "Tata Consultancy Services", market: "stock", description: "Indian IT company (BSE)" },
  ],
  "infosys": [
    { symbol: "INFY.NS", name: "Infosys Limited", market: "stock", description: "Indian IT company (NSE)" },
    { symbol: "INFY", name: "Infosys Limited ADR", market: "stock", description: "Indian IT company (US ADR)" },
  ],
  "hdfc": [
    { symbol: "HDFCBANK.NS", name: "HDFC Bank Limited", market: "stock", description: "Indian bank (NSE)" },
    { symbol: "HDB", name: "HDFC Bank ADR", market: "stock", description: "Indian bank (US ADR)" },
  ],
  "icici": [
    { symbol: "ICICIBANK.NS", name: "ICICI Bank Limited", market: "stock", description: "Indian bank (NSE)" },
    { symbol: "IBN", name: "ICICI Bank ADR", market: "stock", description: "Indian bank (US ADR)" },
  ],
  "bharti": [
    { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Limited", market: "stock", description: "Indian telecom (NSE)" },
  ],
  "airtel": [
    { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Limited", market: "stock", description: "Indian telecom (NSE)" },
  ],
  "wipro": [
    { symbol: "WIPRO.NS", name: "Wipro Limited", market: "stock", description: "Indian IT company (NSE)" },
    { symbol: "WIT", name: "Wipro Limited ADR", market: "stock", description: "Indian IT company (US ADR)" },
  ],
  "adani": [
    { symbol: "ADANIENT.NS", name: "Adani Enterprises", market: "stock", description: "Indian conglomerate (NSE)" },
  ],
  "tata": [
    { symbol: "TATAMOTORS.NS", name: "Tata Motors Limited", market: "stock", description: "Indian auto company (NSE)" },
  ],

  // UK Stocks
  "bp": [
    { symbol: "BP.L", name: "BP plc", market: "stock", description: "British oil & gas company" },
    { symbol: "BP", name: "BP plc ADR", market: "stock", description: "British oil & gas (US ADR)" },
  ],
  "shell": [
    { symbol: "SHEL.L", name: "Shell plc", market: "stock", description: "British oil & gas company" },
    { symbol: "SHEL", name: "Shell plc ADR", market: "stock", description: "British oil & gas (US ADR)" },
  ],
  "hsbc": [
    { symbol: "HSBA.L", name: "HSBC Holdings plc", market: "stock", description: "British bank" },
    { symbol: "HSBC", name: "HSBC Holdings ADR", market: "stock", description: "British bank (US ADR)" },
  ],

  // Japanese Stocks
  "toyota": [
    { symbol: "7203.T", name: "Toyota Motor Corporation", market: "stock", description: "Japanese auto company" },
    { symbol: "TM", name: "Toyota Motor ADR", market: "stock", description: "Japanese auto (US ADR)" },
  ],
  "sony": [
    { symbol: "6758.T", name: "Sony Group Corporation", market: "stock", description: "Japanese electronics company" },
    { symbol: "SONY", name: "Sony Group ADR", market: "stock", description: "Japanese electronics (US ADR)" },
  ],

  // Chinese Stocks
  "alibaba": [
    { symbol: "BABA", name: "Alibaba Group", market: "stock", description: "Chinese e-commerce company" },
  ],
  "tencent": [
    { symbol: "TCEHY", name: "Tencent Holdings", market: "stock", description: "Chinese tech company (OTC)" },
  ],
  "baidu": [
    { symbol: "BIDU", name: "Baidu Inc", market: "stock", description: "Chinese search engine" },
  ],

  // European Stocks
  "volkswagen": [
    { symbol: "VOW.DE", name: "Volkswagen AG", market: "stock", description: "German auto company" },
    { symbol: "VWAGY", name: "Volkswagen ADR", market: "stock", description: "German auto (US ADR)" },
  ],
  "bmw": [
    { symbol: "BMW.DE", name: "BMW AG", market: "stock", description: "German auto company" },
  ],
  "mercedes": [
    { symbol: "MBG.DE", name: "Mercedes-Benz Group", market: "stock", description: "German auto company" },
  ],
  "sap": [
    { symbol: "SAP.DE", name: "SAP SE", market: "stock", description: "German software company" },
    { symbol: "SAP", name: "SAP SE ADR", market: "stock", description: "German software (US ADR)" },
  ],
  "nestle": [
    { symbol: "NESN.SW", name: "Nestlé S.A.", market: "stock", description: "Swiss food & beverage" },
  ],
  "lvmh": [
    { symbol: "MC.PA", name: "LVMH", market: "stock", description: "French luxury goods" },
  ],
};

/**
 * Search for instruments by common name or partial match
 */
export function searchInstruments(query: string): InstrumentSuggestion[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const results: InstrumentSuggestion[] = [];
  const seenSymbols = new Set<string>();

  // Exact match first
  if (instrumentDatabase[normalizedQuery]) {
    for (const suggestion of instrumentDatabase[normalizedQuery]) {
      if (!seenSymbols.has(suggestion.symbol)) {
        results.push(suggestion);
        seenSymbols.add(suggestion.symbol);
      }
    }
  }

  // Partial match (starts with)
  for (const [key, suggestions] of Object.entries(instrumentDatabase)) {
    if (key.startsWith(normalizedQuery) && key !== normalizedQuery) {
      for (const suggestion of suggestions) {
        if (!seenSymbols.has(suggestion.symbol) && results.length < 10) {
          results.push(suggestion);
          seenSymbols.add(suggestion.symbol);
        }
      }
    }
  }

  // Fuzzy match (contains)
  if (results.length < 5) {
    for (const [key, suggestions] of Object.entries(instrumentDatabase)) {
      if (key.includes(normalizedQuery) && !key.startsWith(normalizedQuery)) {
        for (const suggestion of suggestions) {
          if (!seenSymbols.has(suggestion.symbol) && results.length < 10) {
            results.push(suggestion);
            seenSymbols.add(suggestion.symbol);
          }
        }
      }
    }
  }

  return results.slice(0, 10); // Return max 10 results
}

/**
 * Get popular instruments by market type
 */
export function getPopularInstruments(market?: string): InstrumentSuggestion[] {
  const popular: InstrumentSuggestion[] = [
    { symbol: "BTCUSDT", name: "Bitcoin", market: "cryptocurrency", description: "Leading cryptocurrency" },
    { symbol: "ETHUSDT", name: "Ethereum", market: "cryptocurrency", description: "Smart contract platform" },
    { symbol: "GC=F", name: "Gold Futures", market: "commodity", description: "Gold futures contract" },
    { symbol: "CL=F", name: "Crude Oil (WTI)", market: "commodity", description: "West Texas Intermediate crude" },
    { symbol: "EURUSD=X", name: "EUR/USD", market: "forex", description: "Euro to US Dollar" },
    { symbol: "AAPL", name: "Apple Inc.", market: "stock", description: "Technology company" },
    { symbol: "TSLA", name: "Tesla Inc.", market: "stock", description: "Electric vehicle company" },
    { symbol: "^GSPC", name: "S&P 500", market: "stock", description: "US stock market index" },
  ];

  if (market) {
    return popular.filter(p => p.market === market).slice(0, 5);
  }

  return popular;
}
