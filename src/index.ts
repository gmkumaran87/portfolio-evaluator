import path from "path";
import express from "express";
import cors from "cors";
import { createClient } from "redis";
import { AxisHolding } from "./PortfolioWatcher";
import { enqueuePortfolioJob } from "./queue/portfolioQueue";
import { startFinancialWorker } from "./queue/financialWorker";
import PortfolioWatcher from "./PortfolioWatcher";

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, "../data");

// Initialize Express
const app = express();
app.use(cors()); // Allows your React app to fetch the data
app.use(express.json());

// Initialize a dedicated Redis client for the Express routes
// const apiRedisClient = createClient({ url: "redis://localhost:6379" });
// Replace the old createClient line with this:
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
// Replace the Redis initialization with this exact line:
const apiRedisClient = createClient({ url: "redis://redis:6379" });
apiRedisClient.connect().catch(console.error);

console.log("--- Starting Portfolio Evaluator Backend ---");

// 1. Start the Background Worker
startFinancialWorker();

// 2. Start the File Watcher
const watcher = new PortfolioWatcher(
  DATA_DIR,
  async (holdings: AxisHolding[]) => {
    console.log(
      `\n[App] Received ${holdings.length} holdings from CSV. Enqueuing...`,
    );
    await enqueuePortfolioJob(holdings);
  },
);
watcher.start();

// 3. Define the REST API Endpoint
app.get("/api/portfolio", async (req, res) => {
  try {
    const data = await apiRedisClient.get("portfolio:latest");
    if (!data) {
      return res
        .status(404)
        .json({ message: "No portfolio data processed yet." });
    }
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch portfolio data." });
  }
});

// 4. Start the Server
app.listen(PORT, () => {
  console.log(`[API] Server is running on http://localhost:${PORT}`);
});
