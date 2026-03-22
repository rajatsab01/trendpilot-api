import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Analysis, User } from "@shared/schema"

import stockConfig from "@/config/chartMappings/stock.json"
import commodityConfig from "@/config/chartMappings/commodity.json"
import forexConfig from "@/config/chartMappings/forex.json"
import cryptoConfig from "@/config/chartMappings/crypto.json"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Community: show only the chosen community handle — never the legal/account full name. */
export function communityDisplayName(user: User | null | undefined): string {
  if (!user) return "Anonymous";
  const alias = user.alias?.trim();
  if (alias) return alias;
  return "Anonymous";
}

/** Strip "(Analysis in English)" / "(Analysis in …)" prefixes from LLM or legacy fallback output */
export function stripAnalysisMetaPrefix(s: string | null | undefined): string {
  if (!s) return "";
  let t = s.trim();
  for (let i = 0; i < 4; i++) {
    const next = t.replace(/^\(Analysis in [^)]+\)\s*/i, "").replace(/^\(English\)\s*/i, "").trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

interface ChartConfig {
  sourcePriority: string[];
  transforms: Array<{
    type: string;
    value?: string;
  }>;
  overrides: Array<{
    pattern: string;
    type: string;
    replacement?: string;
    action?: string;
    prefix?: string;
    comment?: string;
  }>;
  fallback: {
    useAsIs?: boolean;
    removeSuffix?: string;
    prefix?: string;
    ensureSuffix?: string;
    comment?: string;
  };
}

/**
 * NEW: Config-driven chart symbol resolver
 * Uses JSON configs per market type to convert analysis symbols to TradingView format
 */
export function resolveChartSymbol(analysis: Partial<Analysis>): string {
  const market = analysis.market || 'stock';
  
  // Select appropriate config based on market type
  const configMap: Record<string, ChartConfig> = {
    'stock': stockConfig,
    'commodity': commodityConfig,
    'forex': forexConfig,
    'cryptocurrency': cryptoConfig,
  };
  
  const config = configMap[market] || stockConfig;
  
  // Step 1: Get source value based on priority
  let sourceValue = '';
  for (const field of config.sourcePriority) {
    const value = (analysis as any)[field];
    if (value && typeof value === 'string' && value.trim()) {
      sourceValue = value;
      break;
    }
  }
  
  if (!sourceValue) {
    console.warn(`⚠️ No source value found for ${market} chart symbol`);
    return analysis.symbol || '';
  }
  
  // Step 2: Apply transforms
  let transformed = sourceValue;
  for (const transform of config.transforms) {
    switch (transform.type) {
      case 'uppercase':
        transformed = transformed.toUpperCase();
        break;
      case 'trim':
        transformed = transformed.trim();
        break;
      case 'removeSuffix':
        if (transform.value && transformed.endsWith(transform.value)) {
          transformed = transformed.replace(new RegExp(`${transform.value}$`), '');
        }
        break;
      case 'removeChar':
        if (transform.value) {
          transformed = transformed.replace(new RegExp(transform.value, 'g'), '');
        }
        break;
    }
  }
  
  // Step 3: Check overrides
  for (const override of config.overrides) {
    if (override.type === 'exact' && transformed === override.pattern) {
      return override.replacement || transformed;
    }
    
    if (override.type === 'regex') {
      const regex = new RegExp(override.pattern);
      if (regex.test(transformed)) {
        if (override.action === 'extractBase') {
          // Extract base symbol (e.g., "TATAMOTORS.NS" → "TATAMOTORS")
          const base = transformed.replace(regex, '');
          return override.prefix ? `${override.prefix}${base}` : base;
        }
        if (override.replacement) {
          return transformed.replace(regex, override.replacement);
        }
      }
    }
  }
  
  // Step 4: Apply fallback rules
  if (config.fallback.useAsIs) {
    return transformed;
  }
  
  if (config.fallback.removeSuffix) {
    transformed = transformed.replace(config.fallback.removeSuffix, '');
  }
  
  if (config.fallback.ensureSuffix) {
    // For crypto: if doesn't have USDT or USD, add USDT
    if (!transformed.includes(config.fallback.ensureSuffix) && 
        !transformed.includes('USD')) {
      transformed = transformed + config.fallback.ensureSuffix;
    }
  }
  
  if (config.fallback.prefix) {
    transformed = `${config.fallback.prefix}${transformed}`;
  }
  
  console.log(`📊 Chart symbol resolved: ${sourceValue} → ${transformed} (${market})`);
  return transformed;
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
