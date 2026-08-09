import path from "path";
import { PortfolioWatcher, AxisHolding } from "./PortfolioWatcher";
import { enqueuePortfolioJob } from "./queue/portfolioQueue";
import { startFinancialWorker } from "./queue/financialWorker";

const DATA_DIR = path.join(__dirname, "../data");

console.log("--- Starting Portfolio Evaluator Backend ---");

// 1. Start the Background Worker
startFinancialWorker();

// 2. Start the File Watcher
const watcher = new PortfolioWatcher(
  DATA_DIR,
  async (holdings: AxisHolding[]) => {
    console.log(
      `\n[App] Received ${holdings.length} holdings from watcher. Enqueuing...`,
    );
    await enqueuePortfolioJob(holdings);
  },
);

watcher.start();
