import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert Yahoo Finance symbol to TradingView-compatible symbol
 * TradingView uses different formats than Yahoo Finance for various markets
 */
export function convertToTradingViewSymbol(symbol: string, market: string): string {
  const upperSymbol = symbol.toUpperCase();
  
  // Cryptocurrency - TradingView uses BINANCE:BTCUSDT format
  if (market === 'cryptocurrency') {
    const normalizedSymbol = symbol.toUpperCase();
    
    // If symbol already has USDT/USD suffix, use it as is with BINANCE: prefix
    if (normalizedSymbol.includes('USDT') || normalizedSymbol.includes('USD')) {
      return `BINANCE:${normalizedSymbol.replace('-', '')}`;
    }
    
    // Otherwise add USDT suffix for Binance
    return `BINANCE:${normalizedSymbol}USDT`;
  }
  
  // Forex pairs - convert Yahoo Finance =X format to TradingView FX: format
  if (market === 'forex' || upperSymbol.includes('=X') || upperSymbol.includes('/')) {
    // Yahoo: CADUSD=X → TradingView: FX:USDCAD or FX_IDC:USDCAD
    // Remove =X suffix first
    let cleanPair = upperSymbol.replace('=X', '').replace('/', '');
    
    // Common forex pairs - TradingView format
    const forexMappings: Record<string, string> = {
      'EURUSD': 'FX_IDC:EURUSD',
      'GBPUSD': 'FX_IDC:GBPUSD',
      'USDJPY': 'FX_IDC:USDJPY',
      'USDCHF': 'FX_IDC:USDCHF',
      'AUDUSD': 'FX_IDC:AUDUSD',
      'USDCAD': 'FX_IDC:USDCAD',
      'NZDUSD': 'FX_IDC:NZDUSD',
      'EURGBP': 'FX_IDC:EURGBP',
      'EURJPY': 'FX_IDC:EURJPY',
      'GBPJPY': 'FX_IDC:GBPJPY',
      'USDINR': 'FX_IDC:USDINR',
      'CADUSD': 'FX_IDC:USDCAD', // CAD/USD → USD/CAD for TradingView
    };
    
    if (forexMappings[cleanPair]) {
      return forexMappings[cleanPair];
    }
    
    // Fallback: try FX_IDC prefix
    return `FX_IDC:${cleanPair}`;
  }
  
  // Commodities - convert futures symbols to TradingView spot format
  if (market === 'commodity') {
    const commodityMappings: Record<string, string> = {
      'GC=F': 'TVC:GOLD',       // Gold futures → Gold spot
      'SI=F': 'TVC:SILVER',     // Silver futures → Silver spot
      'CL=F': 'TVC:USOIL',      // Crude Oil futures → Crude Oil spot
      'NG=F': 'TVC:NATURALGAS', // Natural Gas futures → Natural Gas spot
      'HG=F': 'TVC:COPPER',     // Copper futures → Copper spot
      'ZC=F': 'CBOT:ZC1!',      // Corn futures
      'ZW=F': 'CBOT:ZW1!',      // Wheat futures
    };
    
    if (commodityMappings[upperSymbol]) {
      return commodityMappings[upperSymbol];
    }
    
    // Remove =F suffix for other commodities
    return upperSymbol.replace('=F', '');
  }
  
  // Stocks - remove exchange suffixes for TradingView
  // Indian stocks: TATAMOTORS.NS → TATAMOTORS (NSE:TATAMOTORS would be better)
  if (upperSymbol.endsWith('.NS')) {
    const base = upperSymbol.replace('.NS', '');
    return `NSE:${base}`;
  }
  
  if (upperSymbol.endsWith('.BO')) {
    const base = upperSymbol.replace('.BO', '');
    return `BSE:${base}`;
  }
  
  // UK stocks: .L suffix
  if (upperSymbol.endsWith('.L')) {
    const base = upperSymbol.replace('.L', '');
    return `LSE:${base}`;
  }
  
  // Tokyo stocks: .T suffix
  if (upperSymbol.endsWith('.T')) {
    const base = upperSymbol.replace('.T', '');
    return `TSE:${base}`;
  }
  
  // Hong Kong stocks: .HK suffix
  if (upperSymbol.endsWith('.HK')) {
    const base = upperSymbol.replace('.HK', '');
    return `HKEX:${base}`;
  }
  
  // Australian stocks: .AX suffix
  if (upperSymbol.endsWith('.AX')) {
    const base = upperSymbol.replace('.AX', '');
    return `ASX:${base}`;
  }
  
  // Toronto stocks: .TO suffix
  if (upperSymbol.endsWith('.TO')) {
    const base = upperSymbol.replace('.TO', '');
    return `TSX:${base}`;
  }
  
  // US stocks - no suffix means US stock
  // TradingView auto-detects exchange (NYSE/NASDAQ/ARCA) if we don't specify
  // Just return the symbol without prefix for better compatibility
  if (!/\.[A-Z]+$/.test(upperSymbol)) {
    return upperSymbol; // TradingView will auto-detect the correct exchange
  }
  
  // Fallback - return as-is
  return symbol;
}
