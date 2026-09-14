import { useEffect, useState } from "react";

interface Fundamentals {
  symbol: string;
  peRatio: number | null;
  forwardPE: number | null;
  roe: string | null;
  ebitdaMargin: string | null;
  debtToEquity: number | null;
  priceToBook: number | null;
}

interface PortfolioItem {
  symbol: string;
  quantity: number;
  averagePrice: number;
  fundamentals: Fundamentals | null;
}

export default function App() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/portfolio");
        if (!response.ok) throw new Error("Failed to fetch portfolio data");
        const data = await response.json();
        setPortfolio(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  const passesThreshold = (value: string | null, threshold = 15) => {
    if (!value || value === "N/A") return null;
    const num = parseFloat(value.replace("%", ""));
    return num >= threshold;
  };

  const getVerdict = (
    pe: number | null,
    forwardPe: number | null,
    pb: number | null,
    debt: number | null,
  ) => {
    // Basic Banking check (if EBITDA/ROE is N/A but P/B is present)
    if (pb && pb > 3.5)
      return {
        text: "OVERVALUED",
        color: "bg-red-100 text-red-800 border border-red-200",
      };
    if (debt && debt > 1.5)
      return {
        text: "HIGH DEBT",
        color: "bg-orange-100 text-orange-800 border border-orange-200",
      };

    if (!pe || !forwardPe)
      return { text: "HOLD", color: "bg-gray-100 text-gray-700" };

    if (forwardPe < pe * 0.85) {
      return {
        text: "BUY MORE",
        color: "bg-blue-100 text-blue-800 border border-blue-200",
      };
    }
    if (forwardPe > pe * 1.15) {
      return {
        text: "TRIM / SELL",
        color: "bg-orange-100 text-orange-800 border border-orange-200",
      };
    }
    return { text: "HOLD", color: "bg-gray-100 text-gray-700" };
  };

  if (loading)
    return (
      <div className="p-8 text-xl font-semibold">
        Loading portfolio evaluation engine...
      </div>
    );
  if (error)
    return <div className="p-8 text-red-500 font-semibold">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Portfolio Evaluator Engine
        </h1>
        <p className="text-gray-600 mb-6">
          Advanced fundamental metrics based on Finance Boosan's investment
          framework.
        </p>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-4 font-medium text-sm">Symbol</th>
                <th className="p-4 font-medium text-sm">Qty</th>
                <th className="p-4 font-medium text-sm">ROE (&gt;15%)</th>
                <th className="p-4 font-medium text-sm">EBITDA / PB</th>
                <th className="p-4 font-medium text-sm">
                  Debt/Equity (&lt;1.0)
                </th>
                <th className="p-4 font-medium text-sm">Trailing P/E</th>
                <th className="p-4 font-medium text-sm">Forward P/E</th>
                <th className="p-4 font-medium text-sm">Action Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {portfolio.map((item) => {
                const fun = item.fundamentals;
                const roePasses = passesThreshold(fun?.roe);
                const ebitdaPasses = passesThreshold(fun?.ebitdaMargin);

                // Determine whether to display EBITDA margin or Price-to-Book (for banks)
                const isBank =
                  fun?.ebitdaMargin === "N/A" && fun?.priceToBook !== null;
                const secondaryMetricDisplay = isBank
                  ? `P/B: ${fun?.priceToBook?.toFixed(2)}`
                  : fun?.ebitdaMargin || "N/A";

                const verdict = getVerdict(
                  fun?.peRatio ?? null,
                  fun?.forwardPE ?? null,
                  fun?.priceToBook ?? null,
                  fun?.debtToEquity ?? null,
                );

                return (
                  <tr
                    key={item.symbol}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4 font-bold text-gray-800">
                      {item.symbol}
                    </td>
                    <td className="p-4 text-gray-600">{item.quantity}</td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          roePasses === true
                            ? "bg-green-100 text-green-800"
                            : roePasses === false
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {fun?.roe || "N/A"}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          !isBank && ebitdaPasses === true
                            ? "bg-green-100 text-green-800"
                            : !isBank && ebitdaPasses === false
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {secondaryMetricDisplay}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`font-medium text-sm ${
                          (fun?.debtToEquity ?? 0) > 1.0
                            ? "text-red-600 font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {fun?.debtToEquity !== null ? fun?.debtToEquity : "N/A"}
                      </span>
                    </td>

                    <td className="p-4 text-gray-600">
                      {fun?.peRatio?.toFixed(2) || "N/A"}
                    </td>

                    <td className="p-4 text-gray-600 font-medium">
                      {fun?.forwardPE?.toFixed(2) || "N/A"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded font-bold text-xs tracking-wider ${verdict.color}`}
                      >
                        {verdict.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
