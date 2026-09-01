import type { FinancialSummary, ScenarioResult } from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function projectScenario(
  summary: FinancialSummary,
  scenario: ScenarioResult["scenario"],
  label: string,
  assumptions: ScenarioResult["assumptions"]
): ScenarioResult {
  const baseSalary =
    summary.salaryLkr > 0
      ? summary.salaryLkr
      : summary.transactionCount > 0
        ? 250000
        : 250000;

  const baseExpenses =
    summary.livingExpensesLkr > 0 ? summary.livingExpensesLkr : baseSalary * 0.55;
  const baseFees = summary.bankingFeesLkr > 0 ? summary.bankingFeesLkr : 500;

  const projectedSalaryLkr = round2(baseSalary * assumptions.salaryMultiplier);
  const projectedExpensesLkr = round2(
    baseExpenses * assumptions.expenseMultiplier + (assumptions.unexpectedExpenseLkr || 0)
  );
  const projectedFeesLkr = round2(baseFees * assumptions.feeMultiplier);
  const projectedNetSavingsLkr = round2(
    projectedSalaryLkr - projectedExpensesLkr - projectedFeesLkr
  );

  const notes: string[] = [];
  if (assumptions.salaryDelayDays) {
    notes.push(`Salary delayed by ${assumptions.salaryDelayDays} days — cash flow stress window.`);
  }
  if (assumptions.unexpectedExpenseLkr) {
    notes.push(`Includes unexpected expense of LKR ${assumptions.unexpectedExpenseLkr.toLocaleString()}.`);
  }
  if (summary.brokerOutwardLkr > 0) {
    notes.push("Broker pass-through funds excluded from personal net savings.");
  }

  return {
    scenario,
    label,
    assumptions,
    projectedSalaryLkr,
    projectedExpensesLkr,
    projectedFeesLkr,
    projectedNetSavingsLkr,
    notes,
  };
}

export function buildScenarioAnalysis(summary: FinancialSummary): ScenarioResult[] {
  return [
    projectScenario(summary, "base", "Base Case — current run rate", {
      salaryMultiplier: 1,
      expenseMultiplier: 1,
      feeMultiplier: 1,
    }),
    projectScenario(summary, "happy", "Happy Case — stable income, lower spend", {
      salaryMultiplier: 1,
      expenseMultiplier: 0.9,
      feeMultiplier: 0.8,
    }),
    projectScenario(summary, "worst", "Worst Case — income shock + higher costs", {
      salaryMultiplier: 0.85,
      expenseMultiplier: 1.2,
      feeMultiplier: 1.5,
      salaryDelayDays: 14,
      unexpectedExpenseLkr: 25000,
    }),
  ];
}
