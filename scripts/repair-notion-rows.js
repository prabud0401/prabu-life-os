require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const {
  initOutlookConfig,
  repairNotionTransactions,
  getIncomeSummary,
  queryTransactionsFromNotion,
} = require("@prabu-life-os/core");

(async () => {
  const dryRun = process.argv.includes("--dry-run");

  console.log(`Repairing Notion rows (dryRun: ${dryRun})...`);
  await initOutlookConfig();

  const repair = await repairNotionTransactions({ dryRun });
  console.log("REPAIR RESULT:", JSON.stringify(repair, null, 2));

  const pages = await queryTransactionsFromNotion();
  const lkrMissing = pages.filter((p) => p.amountLkr == null).length;
  const wrongCurrency = pages.filter((p) => p.currency !== "USD").length;
  console.log("NOTION ROW COUNT:", pages.length);
  console.log("ROWS MISSING Amount LKR:", lkrMissing);
  console.log("ROWS WITH WRONG CURRENCY:", wrongCurrency);

  const summary = await getIncomeSummary();
  console.log("SUMMARY:", JSON.stringify(summary, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
