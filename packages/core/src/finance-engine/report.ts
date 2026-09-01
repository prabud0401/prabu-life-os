import type { FinancialSummary, FinancialTransaction, ScenarioResult } from "./types";

function lkr(n: number): string {
  return `LKR ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export function formatReconciliationMarkdown(
  summary: FinancialSummary,
  scenarios: ScenarioResult[],
  transactions: FinancialTransaction[]
): string {
  const living = transactions.filter(
    (t) =>
      t.transactionType === "PERSONAL_LIVING_EXPENSE" && !t.metadata?.isDuplicate
  );
  const broker = transactions.filter(
    (t) =>
      (t.transactionType === "BROKER_INWARD" ||
        t.transactionType === "BROKER_OUTWARD" ||
        t.transactionType === "BROKER_PARTNER_PAYOUT") &&
      !t.metadata?.isDuplicate
  );
  const partnerPayouts = transactions.filter(
    (t) => t.transactionType === "BROKER_PARTNER_PAYOUT" && !t.metadata?.isDuplicate
  );
  const internal = transactions.filter(
    (t) => t.transactionType === "INTERNAL_TRANSFER" && !t.metadata?.isDuplicate
  );
  const loans = transactions.filter(
    (t) =>
      (t.transactionType === "LOAN_GIVEN" ||
        t.transactionType === "LOAN_RECEIVED" ||
        t.transactionType === "LOAN_REPAYMENT") &&
      !t.metadata?.isDuplicate
  );
  const pawn = transactions.filter(
    (t) => t.transactionType === "PAWN_PAYMENT" && !t.metadata?.isDuplicate
  );

  const lines = [
    "# MONTHLY FINANCIAL RECONCILIATION REPORT",
    "",
    "## 1. Executive Overview",
    `- Personal Salary Inflow: **${lkr(summary.salaryLkr)}** ($${summary.salaryUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD)`,
    `- Essential Living Expenses: **${lkr(summary.livingExpensesLkr)}**`,
    `- Banking & Network Fees: **${lkr(summary.bankingFeesLkr)}**`,
    `- **Net Personal Monthly Savings: ${lkr(summary.netPersonalSavingsLkr)}**`,
    "",
    "_Broker pass-through, inter-account transfers, loans, and card top-ups are excluded from net savings._",
    "",
    "## 2. Personal Living Expenses",
    living.length
      ? "| Date | Category | Amount | Description |\n|------|----------|--------|-------------|\n" +
        living
          .slice(0, 20)
          .map(
            (t) =>
              `| ${t.date} | ${t.category || "—"} | ${lkr(t.amountLkr)} | ${t.description.slice(0, 50)} |`
          )
          .join("\n")
      : "_No categorized living expenses in ledger yet._",
    "",
    "## 3. Broker & Pass-Through Activity",
    `- Client Inflows: ${lkr(summary.brokerInwardLkr)}`,
    `- Total Disbursements: ${lkr(summary.brokerOutwardLkr)}`,
    `- Partner Split Payouts: ${lkr(summary.brokerPartnerPayoutLkr)}`,
    `- **Net Broker Position: ${lkr(summary.brokerNetPositionLkr)}** _(should trend toward zero)_`,
    partnerPayouts.length
      ? "\n**Partner payouts:**\n" +
        partnerPayouts
          .map((t) => `- ${t.date}: ${lkr(t.amountLkr)} — ${t.description.slice(0, 60)}`)
          .join("\n")
      : "",
    broker.length
      ? "\n| Date | Type | Amount | Description |\n|------|------|--------|-------------|\n" +
        broker
          .slice(0, 15)
          .map(
            (t) =>
              `| ${t.date} | ${t.transactionType} | ${lkr(t.amountLkr)} | ${t.description.slice(0, 40)} |`
          )
          .join("\n")
      : "",
    "",
    "## 4. Inter-Account Transfers (Net Zero)",
    `- Unpaired self-transfers: ${lkr(summary.selfTransfersLkr)}`,
    `- Paired transfers (deduplicated): ${lkr(summary.pairedSelfTransfersLkr)}`,
    `- Cross-source duplicates excluded: ${lkr(summary.duplicateTransfersExcludedLkr)}`,
    `- Card top-ups / repayments: ${lkr(summary.cardRepaymentsLkr)}`,
    `- Card POS spend: ${lkr(summary.cardPosSpendLkr)}`,
    `- ATM withdrawals: ${lkr(summary.atmWithdrawalsLkr)}`,
    internal.length
      ? "\n| Date | Dir | Amount | Paired | Description |\n|------|-----|--------|--------|-------------|\n" +
        internal
          .slice(0, 10)
          .map(
            (t) =>
              `| ${t.date} | ${t.direction} | ${lkr(t.amountLkr)} | ${t.metadata?.pairedWith ? "✓" : "—"} | ${t.description.slice(0, 40)} |`
          )
          .join("\n")
      : "",
    "",
    "## 5. Loans & Pawn",
    `- Loans given: ${lkr(summary.loansGivenLkr)}`,
    `- Loans received: ${lkr(summary.loansReceivedLkr)}`,
    `- Loan repayments: ${lkr(summary.loanRepaymentsLkr)}`,
    `- Pawn / gold payments: ${lkr(summary.pawnPaymentsLkr)}`,
    loans.length
      ? loans
          .map((t) => `- ${t.date} ${t.transactionType}: ${lkr(t.amountLkr)} — ${t.description.slice(0, 50)}`)
          .join("\n")
      : "",
    pawn.length
      ? pawn
          .map((t) => `- ${t.date}: ${lkr(t.amountLkr)} — ${t.description.slice(0, 50)}`)
          .join("\n")
      : "",
    "",
    "## 6. Bank & Network Fees",
    `- Total fees: ${lkr(summary.bankingFeesLkr)}`,
    "",
    "## 7. Scenario Analysis",
  ];

  for (const scenario of scenarios) {
    lines.push(
      `### ${scenario.label}`,
      `- Projected salary: ${lkr(scenario.projectedSalaryLkr)}`,
      `- Projected expenses: ${lkr(scenario.projectedExpensesLkr)}`,
      `- Projected fees: ${lkr(scenario.projectedFeesLkr)}`,
      `- **Projected net savings: ${lkr(scenario.projectedNetSavingsLkr)}**`,
      scenario.notes.length ? `- Notes: ${scenario.notes.join(" ")}` : ""
    );
  }

  return lines.filter((line) => line !== undefined).join("\n");
}
