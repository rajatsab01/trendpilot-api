#!/usr/bin/env tsx
/**
 * CLI tool to run the complete symbol test suite
 * 
 * Usage: tsx server/runSymbolTests.ts
 */

import { testAllSymbols } from "./symbolTester.js";
import { initializeSymbolRegistry } from "./symbolRegistry.js";

async function main() {
  console.log("🚀 Starting comprehensive symbol testing suite...\n");
  console.log("This will test ALL symbols in the instrument database");
  console.log("against real Yahoo Finance and Binance APIs.\n");
  
  // Initialize symbol registry (required for normalization)
  console.log("🔧 Initializing symbol registry...");
  initializeSymbolRegistry();
  console.log("✅ Symbol registry initialized\n");
  
  const report = await testAllSymbols();
  
  console.log("\n" + "=".repeat(80));
  console.log("📊 SYMBOL HEALTH REPORT");
  console.log("=".repeat(80));
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Total Symbols: ${report.totalSymbols}`);
  console.log(`✅ Working: ${report.workingSymbols} (${report.successRate.toFixed(1)}%)`);
  console.log(`❌ Broken: ${report.brokenSymbols} (${(100 - report.successRate).toFixed(1)}%)`);
  
  if (Object.keys(report.brokenByMarket).length > 0) {
    console.log("\n📉 Broken Symbols by Market:");
    Object.entries(report.brokenByMarket).forEach(([market, count]) => {
      console.log(`   ${market}: ${count} broken`);
    });
  }
  
  if (report.brokenSymbols > 0) {
    console.log("\n❌ BROKEN SYMBOLS:");
    report.results
      .filter(r => r.status === 'broken')
      .forEach(r => {
        console.log(`   ${r.symbol} (${r.name}) - ${r.market}`);
        console.log(`      Error: ${r.error}`);
      });
  }
  
  console.log("\n" + "=".repeat(80));
  
  // Exit with error code if there are broken symbols
  if (report.brokenSymbols > 0) {
    console.log("\n⚠️  Warning: Some symbols are broken and need fixing!");
    process.exit(1);
  } else {
    console.log("\n✅ All symbols are working correctly!");
    process.exit(0);
  }
}

main().catch(error => {
  console.error("❌ Fatal error running tests:", error);
  process.exit(1);
});
