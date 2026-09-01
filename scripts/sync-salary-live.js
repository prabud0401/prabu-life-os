require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const {
  initOutlookConfig,
  syncSalaryToNotion,
  getIncomeSummary,
  queryTransactionsFromNotion,
} = require("@prabu-life-os/core");

(async () => {
  console.log("Initializing Outlook config...");
  await initOutlookConfig();

  console.log("Running live sync (dryRun: false)...");
  const result = await syncSalaryToNotion({ dryRun: false });
  console.log("SYNC RESULT:", JSON.stringify(result, null, 2));

  const pages = await queryTransactionsFromNotion();
  console.log("NOTION ROW COUNT:", pages.length);

  const summary = await getIncomeSummary();
  console.log("SUMMARY:", JSON.stringify(summary, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
