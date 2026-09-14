import YahooFinance from "yahoo-finance2";
import { createClient, RedisClientType } from "redis";

// Fix: remove 'nodeVersion' from the suppressNotices array
const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});
export interface Fundamentals {
  symbol: string;
  peRatio: number | null;
  forwardPE: number | null;
  roe: string | null;
  ebitdaMargin: string | null;
  debtToEquity: number | null;
}

export class FinancialDataService {
  private redisClient: RedisClientType;

  constructor() {
    // this.redisClient = createClient({
    //   url: process.env.REDIS_URL || "redis://localhost:6379",
    // });
    this.redisClient = createClient({ url: "redis://localhost:6379" });

    this.redisClient.on("error", (err) =>
      console.error("[Redis] Error:", err.message),
    );
  }

  public async connect(): Promise<void> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
      console.log("[Redis] Connected successfully.");
    }
  }

  private formatNSEBSESymbol(axisSymbol: string): string {
    return `${axisSymbol.trim().toUpperCase()}.NS`;
  }

  public async getFundamentals(
    axisSymbol: string,
  ): Promise<Fundamentals | null> {
    const symbol = this.formatNSEBSESymbol(axisSymbol);
    const cacheKey = `fundamentals:${symbol}`;

    // 1. Check Cache
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      console.log(`[Cache Hit] ${symbol}`);
      return JSON.parse(cached);
    }

    console.log(`[Cache Miss] Fetching Yahoo Finance data for ${symbol}...`);

    try {
      // 2. Fetch from Yahoo Finance
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ["summaryDetail", "financialData"],
      });

      const metrics: Fundamentals = {
        symbol,
        peRatio: result.summaryDetail?.trailingPE ?? null,
        forwardPE: result.summaryDetail?.forwardPE ?? null,
        roe: result.financialData?.returnOnEquity
          ? (result.financialData.returnOnEquity * 100).toFixed(2) + "%"
          : null,
        ebitdaMargin: result.financialData?.ebitdaMargins
          ? (result.financialData.ebitdaMargins * 100).toFixed(2) + "%"
          : null,
        debtToEquity: result.financialData?.debtToEquity ?? null,
      };

      // 3. Store in Redis for 12 Hours (43200 seconds)
      await this.redisClient.setEx(cacheKey, 43200, JSON.stringify(metrics));

      return metrics;
    } catch (error: any) {
      console.error(`[Yahoo Finance Error] ${symbol}:`, error.message);
      return null;
    }
  }
}
