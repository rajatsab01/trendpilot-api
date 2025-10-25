#!/bin/bash

echo "🧪 Testing Symbol Validation API - All Markets"
echo "=============================================="

# Test 1: Cryptocurrency - Valid symbols
echo -e "\n📊 Test 1: Cryptocurrency Market (Valid Symbols)"
echo "Testing BTC..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC","market":"cryptocurrency"}' | jq '.'

echo -e "\nTesting BTCUSD..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSD","market":"cryptocurrency"}' | jq '.'

echo -e "\nTesting ETH..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"ETH","market":"cryptocurrency"}' | jq '.'

# Test 2: Cryptocurrency - Invalid symbol with suggestions
echo -e "\n📊 Test 2: Cryptocurrency Market (Invalid - Should Give Suggestions)"
echo "Testing BNBUSD..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BNBUSD","market":"cryptocurrency"}' | jq '.'

# Test 3: Stock Market
echo -e "\n📊 Test 3: Stock Market"
echo "Testing AAPL..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","market":"stock_equities"}' | jq '.'

echo -e "\nTesting TSLA..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TSLA","market":"stock_equities"}' | jq '.'

echo -e "\nTesting MSFT..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"MSFT","market":"stock_equities"}' | jq '.'

# Test 4: Forex Market
echo -e "\n📊 Test 4: Forex Market"
echo "Testing EURUSD..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"EURUSD=X","market":"forex"}' | jq '.'

echo -e "\nTesting GBPUSD..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"GBPUSD=X","market":"forex"}' | jq '.'

echo -e "\nTesting USDJPY..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"USDJPY=X","market":"forex"}' | jq '.'

# Test 5: Commodity Market
echo -e "\n📊 Test 5: Commodity Market"
echo "Testing Gold..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"GC=F","market":"commodity"}' | jq '.'

echo -e "\nTesting Oil..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"CL=F","market":"commodity"}' | jq '.'

echo -e "\nTesting Silver..."
curl -s -X POST http://localhost:5000/api/symbols/validate \
  -H "Content-Type: application/json" \
  -d '{"symbol":"SI=F","market":"commodity"}' | jq '.'

echo -e "\n✅ Testing Complete!"
