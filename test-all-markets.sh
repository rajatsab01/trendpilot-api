#!/bin/bash
echo "🧪 COMPREHENSIVE SYMBOL VALIDATION TEST"
echo "========================================"

echo -e "\n✅ CRYPTOCURRENCY (CoinGecko fallback when Binance blocked)"
echo "BTC:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"BTC","market":"cryptocurrency"}'
echo -e "\nETH:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"ETH","market":"cryptocurrency"}'
echo -e "\nBNBUSD:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"BNBUSD","market":"cryptocurrency"}'

echo -e "\n\n✅ STOCKS (Yahoo Finance)"
echo "AAPL:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"AAPL","market":"stock_equities"}'
echo -e "\nTSLA:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"TSLA","market":"stock_equities"}'
echo -e "\nMSFT:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"MSFT","market":"stock_equities"}'

echo -e "\n\n✅ FOREX (Yahoo Finance)"
echo "EURUSD:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"EURUSD=X","market":"forex"}'
echo -e "\nGBPUSD:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"GBPUSD=X","market":"forex"}'
echo -e "\nUSDJPY:" && curl -s -X POST http://localhost:5000/api/symbols/validate -H "Content-Type: application/json" -d '{"symbol":"USDJPY=X","market":"forex"}'

echo -e "\n\n✅ Complete!"
