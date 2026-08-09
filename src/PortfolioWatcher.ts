import fs from "fs";
import path from "path";
import csv from "csv-parser";
import chokidar from "chokidar";

export interface AxisHolding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
}

export class PortfolioWatcher {
  private watchDir: string;
  private onHoldingsParsed: (holdings: AxisHolding[]) => void;

  constructor(
    watchDir: string,
    onHoldingsParsed: (holdings: AxisHolding[]) => void,
  ) {
    this.watchDir = path.resolve(watchDir);
    this.onHoldingsParsed = onHoldingsParsed;
  }

  public start(): void {
    console.log(`[Watcher] Monitoring directory: ${this.watchDir}`);

    // Chokidar listens for new CSV files dropped into ./data
    const watcher = chokidar.watch(`${this.watchDir}/*.csv`, {
      persistent: true,
      ignoreInitial: false,
    });

    watcher.on("add", (filePath: string) => {
      console.log(`[Watcher] New CSV detected: ${path.basename(filePath)}`);
      this.parseCSV(filePath);
    });
  }

  private parseCSV(filePath: string): void {
    const rawResults: Record<string, string>[] = [];

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) =>
            header
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, ""),
        }),
      )
      .on("data", (data) => rawResults.push(data))
      .on("end", () => {
        console.log(`[Watcher] Parsed ${rawResults.length} raw rows from CSV.`);
        const holdings = this.normalizeAxisData(rawResults);
        this.onHoldingsParsed(holdings);
      })
      .on("error", (error) => {
        console.error(`[Watcher] Error parsing CSV:`, error.message);
      });
  }

  private normalizeAxisData(rows: Record<string, string>[]): AxisHolding[] {
    return rows
      .map((row) => {
        const symbol =
          row["symbol"] ||
          row["stockname"] ||
          row["scripname"] ||
          row["tradingname"] ||
          "";

        const quantity = parseFloat(
          row["quantity"] || row["qty"] || row["holdings"] || "0",
        );

        const averagePrice = parseFloat(
          row["buyprice"] ||
            row["averageprice"] ||
            row["avgprice"] ||
            row["rate"] ||
            "0",
        );

        const currentPrice = parseFloat(
          row["ltp"] || row["currentprice"] || row["marketprice"] || "0",
        );

        return {
          symbol: symbol.trim().toUpperCase(),
          quantity,
          averagePrice,
          currentPrice: currentPrice || undefined,
        };
      })
      .filter((item) => item.symbol !== "" && item.quantity > 0);
  }
}
