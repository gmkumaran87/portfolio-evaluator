import { Worker, Job } from "bullmq";
import { AxisHolding } from "../PortfolioWatcher";
import { FinancialDataService, Fundamentals } from "../FinancialDataService";

/*const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};*/

// Replace the old connection object with this:
// Replace the connection object with this:
const connection = {
  host: "redis",
  port: 6379,
};

export interface EnrichedHolding extends AxisHolding {
  fundamentals: Fundamentals | null;
}

export function startFinancialWorker() {
  const finService = new FinancialDataService();

  const worker = new Worker(
    "portfolio-enrichment",
    async (job: Job<{ holdings: AxisHolding[] }>) => {
      console.log(`[Worker] Processing Job ID ${job.id}...`);
      await finService.connect();

      const enrichedList: EnrichedHolding[] = [];

      for (const holding of job.data.holdings) {
        const fundamentals = await finService.getFundamentals(holding.symbol);
        enrichedList.push({
          ...holding,
          fundamentals,
        });
      }

      console.log(`[Worker] Job ${job.id} Completed!`);
      console.table(
        enrichedList.map((item) => ({
          Symbol: item.symbol,
          Qty: item.quantity,
          AvgPrice: item.averagePrice,
          ROE: item.fundamentals?.roe ?? "N/A",
          PE: item.fundamentals?.peRatio ?? "N/A",
          EBITDA_Margin: item.fundamentals?.ebitdaMargin ?? "N/A",
        })),
      );

      // Save the latest enriched portfolio to Redis for the API to consume
      const redisClient = finService["redisClient"]; // Accessing the existing client
      await redisClient.set("portfolio:latest", JSON.stringify(enrichedList));

      return enrichedList;
    },
    {
      connection,
      limiter: {
        max: 5, // Process maximum 5 stock API calls
        duration: 1000, // per 1 second to avoid Yahoo rate limits
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} has finished successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });
}
