import * as fs from "fs";
import * as path from "path";
import chokidar from "chokidar";

export interface AxisHolding {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

const ISIN_TO_SYMBOL: Record<string, string> = {
  INE028A01039: "BANKBARODA",
  INE216A01030: "BRITANNIA",
  INE476A01022: "CANBK",
  INE298A01020: "CUMMINSIND",
  INE935N01020: "DIXON",
  INE302A01020: "EXIDEIND",
  INE860A01027: "HCLTECH",
  INE040A01034: "HDFCBANK",
  INE154A01025: "ITC",
  INE918Z01012: "KAYNES",
  INE326A01037: "LUPIN",
  INE0FS801015: "MSUMI",
  INE239A01024: "NESTLEIND",
  INE134E01011: "PFC",
  INE775A01035: "MOTHERSON",
  INE062A01020: "SBIN",
  INE1TAE01010: "TATAMOTORS",
  INE245A01021: "TATAPOWER",
  INE081A01020: "TATASTEEL",
  INE280A01028: "TITAN",
};

export default class PortfolioWatcher {
  private watchDir: string;
  private onFileParsed: (holdings: AxisHolding[]) => void;

  constructor(
    watchDir: string,
    onFileParsed: (holdings: AxisHolding[]) => void,
  ) {
    this.watchDir = watchDir;
    this.onFileParsed = onFileParsed;
  }

  public start(): void {
    console.log(`[Watcher] Monitoring directory: ${this.watchDir}`);

    const watcher = chokidar.watch(this.watchDir, {
      persistent: true,
      ignoreInitial: false,
    });

    watcher.on("add", (filePath: string) => {
      if (filePath.toLowerCase().endsWith(".csv")) {
        console.log(
          `[Watcher] Raw Axis Direct CSV detected: ${path.basename(filePath)}`,
        );
        this.parseAxisDirectCSV(filePath);
      }
    });
  }

  private parseAxisDirectCSV(filePath: string): void {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const lines = fileContent.split(/\r?\n/);

      const holdings: AxisHolding[] = [];
      let isDataSection = false;

      for (const line of lines) {
        // Stop parsing completely if we hit the Axis Disclaimer block
        if (line.includes("ASL Disclaimer")) {
          break;
        }

        const columns = line
          .split(",")
          .map((col) => col.replace(/(^"|"$)/g, "").trim());

        // Wait until we find the actual table headers to start parsing
        if (!isDataSection) {
          if (columns[0] === "Stock Name" && columns[1] === "ISIN") {
            isDataSection = true;
          }
          continue;
        }

        // Ensure the row has a valid ISIN format (INE...)
        const isin = columns[1];
        if (!isin || !isin.startsWith("INE")) continue;

        const qty = parseFloat(columns[2]);
        const avgCost = parseFloat(columns[6]);
        const symbol = ISIN_TO_SYMBOL[isin];

        if (symbol) {
          holdings.push({
            symbol,
            quantity: qty,
            averagePrice: avgCost,
          });
        } else {
          console.log(
            `[Watcher] Skipped ISIN ${isin} (${columns[0]}) - Unlisted or not mapped.`,
          );
        }
      }

      if (holdings.length > 0) {
        console.log(
          `[Watcher] Successfully cleaned ${holdings.length} valid holdings.`,
        );
        this.onFileParsed(holdings);
      } else {
        console.log(`[Watcher] No valid holdings found to parse.`);
      }
    } catch (error) {
      console.error(`[Watcher] Failed to parse Axis CSV:`, error);
    }
  }
}
