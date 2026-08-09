import { Queue } from "bullmq";
import { AxisHolding } from "../PortfolioWatcher";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

export const portfolioQueue = new Queue<{ holdings: AxisHolding[] }>(
  "portfolio-enrichment",
  { connection },
);

export async function enqueuePortfolioJob(holdings: AxisHolding[]) {
  const job = await portfolioQueue.add(
    "enrich-holdings",
    { holdings },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  );
  console.log(
    `[Queue] Enqueued Job ID: ${job.id} with ${holdings.length} stocks.`,
  );
}
