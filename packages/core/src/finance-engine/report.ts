import type { FinancialSummary, FinancialTransaction, ScenarioResult } from "./types";

export function formatReconciliationMarkdown(
  summary: FinancialSummary,
  scenarios: ScenarioResult[],
  transactions: FinancialTransaction[]
): string {
  const living = transactions.filter((t) => t.transactionType === "PERSONAL_LIVING_EXPENSE");
  const broker = transactions.filter(
    (t) => t.transactionType === "BROKER_INWARD" || t.transactionType === "BROKER_OUTWARD"
  );

  const lines = [
    "# MONTHLY FINANCIAL RECONCILIATION REPORT",
    "",
    "## 1. Executive Overview",
    `- Personal Salary Inflow: **LKR ${summary.salaryLkr.toLocaleString("en-US", { minimumFractionDigits: 2 })}** ($${summary.salaryUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD)`,
    `- Essential Living Expenses: **LKR ${summary.livingExpensesLkr.toLocaleString("en-US", { minimumFractionDigits: 2 })}**`,
    `- Banking & Network Fees: **LKR ${summary.bankingFeesLkr.toLocaleString("en-US", { minimumFractionDigits: 2 })}**`,
    `- **Net Personal Monthly Savings: LKR ${summary.netPersonalSavingsLkr.toLocaleString("en-US", { minimumFractionDigits: 2 })}**`,
    "",
    "## 2. Personal Living Expenses",
    living.length
      ? living
          .slice(0, 20)
          .map(
            (t) =>
              `| ${t.date} | ${t.category || "—"} | LKR ${t.amountLkr.toFixed(2)} | ${t.description.slice(0, 60)} |`
          )
          .join("\n")
      : "_No categorized living expenses in ledger yet._",
    "",
    "## 3. Broker & Pass-Through Activity",
    `- Client Inflows: LKR ${summary.brokerInwardLkr.toFixed(2)}`,
    `- Disbursements: LKR ${summary.brokerOutwardLkr.toFixed(2)}`,
    broker.length
      ? broker
          .slice(0, 10)
          .map((t) => `| ${t.date} | ${t.transactionType} | LKR ${t.amountLkr.toFixed(2)} | ${t.description.slice(0, 50)} |`)
          .join("\n")
      : "",
    "",
    "## 4. Bank & Network Fees",
    `- Total fees: LKR ${summary.bankingFeesLkr.toFixed(2)}`,
    "",
    "## 5. Inter-Account Movements (Net Zero)",
    `- Self-transfers tracked: LKR ${summary.selfTransfersLkr.toFixed(2)} (excluded from personal spend)`,
    `- Card repayments: LKR ${summary.cardRepaymentsLkr.toFixed(2)}`,
    "",
    "## 6. Scenario Analysis",
  ];

  for (const scenario of scenarios) {
    lines.push(
      `### ${scenario.label}`,
      `- Projected salary: LKR ${scenario.projectedSalaryLkr.toFixed(2)}`,
      `- Projected expenses: LKR ${scenario.projectedExpensesLkr.toFixed(2)}`,
      `- Projected fees: LKR ${scenario.projectedFeesLkr.toFixed(2)}`,
      `- **Projected net savings: LKR ${scenario.projectedNetSavingsLkr.toFixed(2)}**`,
      scenario.notes.length ? `- Notes: ${scenario.notes.join(" ")}` : ""
    );
  }

  return lines.filter(Boolean).join("\n");
}
