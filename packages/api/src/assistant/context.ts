import {
  getIncomeSummary,
  listMyTasks,
  runFinancialReconciliation,
} from "@prabu-life-os/core";

function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function buildAssistantContext(): Promise<string> {
  try {
    const [incomeResult, reportResult, tasksResult] = await Promise.allSettled([
      getIncomeSummary(),
      runFinancialReconciliation(),
      listMyTasks({ limit: 10 }),
    ]);

    const incomeSummary = incomeResult.status === "fulfilled" ? incomeResult.value : null;
    const report = reportResult.status === "fulfilled" ? reportResult.value : null;
    const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : [];

    let context = `### LIVE FINANCIAL & LIFE OS CONTEXT (Current snapshot as of ${new Date().toISOString()})\n\n`;

    if (report?.summary) {
      const s = report.summary;
      context += `**Personal Financial Intelligence Summary:**\n`;
      context += `- Salary Inflow (USD): ${formatUsd(s.salaryUsd)}\n`;
      context += `- Salary Inflow (LKR): ${formatLkr(s.salaryLkr)}\n`;
      context += `- Living Expenses: ${formatLkr(s.livingExpensesLkr)}\n`;
      context += `- Banking & Network Fees: ${formatLkr(s.bankingFeesLkr)}\n`;
      context += `- Net Personal Monthly Savings: ${formatLkr(s.netPersonalSavingsLkr)}\n`;
      context += `- Broker Inward (Isolated): ${formatLkr(s.brokerInwardLkr)}\n`;
      context += `- Broker Outward (Isolated): ${formatLkr(s.brokerOutwardLkr)}\n`;
      context += `- Self-transfers (Net Zero): ${formatLkr(s.selfTransfersLkr)}\n`;
      context += `- Card Repayments: ${formatLkr(s.cardRepaymentsLkr)}\n\n`;
    }

    if (report?.scenarios?.length) {
      context += `**Scenario Projections:**\n`;
      for (const sc of report.scenarios) {
        context += `- **${sc.label}**: Projected Salary: ${formatLkr(sc.projectedSalaryLkr)}, Expenses: ${formatLkr(sc.projectedExpensesLkr)}, Fees: ${formatLkr(sc.projectedFeesLkr)} → **Projected Net Savings: ${formatLkr(sc.projectedNetSavingsLkr)}**\n`;
        if (sc.notes?.length) {
          context += `  Notes: ${sc.notes.join("; ")}\n`;
        }
      }
      context += `\n`;
    }

    if (incomeSummary) {
      context += `**Wise Salary Historical Inflows (Notion):**\n`;
      context += `- Total USD Earned: ${formatUsd(incomeSummary.totalUsd)}\n`;
      context += `- Total LKR Received: ${formatLkr(incomeSummary.totalLkr)}\n`;
      context += `- Total Salary Transfers: ${incomeSummary.salaryCount} (First: ${incomeSummary.firstTransferDate || "N/A"}, Last: ${incomeSummary.lastTransferDate || "N/A"})\n\n`;
    }

    if (tasks.length > 0) {
      context += `**Active PM Tasks (${tasks.length}):**\n`;
      for (const t of tasks.slice(0, 5)) {
        context += `- [${t.status || "TODO"}] ${t.title} (Priority: ${t.priority || "Normal"}${t.deadline ? `, Deadline: ${t.deadline}` : ""})\n`;
      }
      context += `\n`;
    }

    return context;
  } catch (err) {
    return `Note: Context snapshot could not be fully loaded (${(err as Error).message}).`;
  }
}
