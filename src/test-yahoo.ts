import YahooFinance from "yahoo-finance2"; // Notice the capital Y

// You must instantiate the class before using it
const yahooFinance = new YahooFinance();

async function test() {
  try {
    console.log("Fetching TCS.NS...");
    const result = await yahooFinance.quoteSummary("TCS.NS", {
      modules: ["summaryDetail", "financialData"],
    });
    console.log("Success! ROE:", result.financialData?.returnOnEquity);
  } catch (error: any) {
    console.error("Exact Yahoo Error:", error.message);
  }
}

test();
