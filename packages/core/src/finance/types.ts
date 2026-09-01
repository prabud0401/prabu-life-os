export interface WiseTransfer {
  transferNumber?: string;
  name: string;
  type: "Income" | "Expense";
  category: "Salary" | "Bonus" | "Other";
  source: "Outlook" | "Gmail" | "Manual";
  amount: number; // USD amount
  currency: "USD" | "LKR";
  amountLkr?: number;
  rate?: number;
  feeUsd?: number;
  date: string; // YYYY-MM-DD
  notes: string;
  emailId?: string;
  receivedAt?: string;
  subject?: string;
}

export interface SyncSalaryOptions {
  dryRun?: boolean;
  force?: boolean;
  count?: number;
  since?: string;
}

export interface SyncSalaryResult {
  totalFound: number;
  newTransfers: number;
  skippedCount: number;
  insertedCount: number;
  errors: string[];
  items: WiseTransfer[];
  dryRun: boolean;
}

export interface MonthlyBreakdown {
  month: string; // YYYY-MM
  usd: number;
  lkr: number;
  count: number;
}

export interface IncomeSummary {
  totalUsd: number;
  totalLkr: number;
  transferCount: number;
  salaryCount: number;
  bonusCount: number;
  firstTransferDate?: string;
  lastTransferDate?: string;
  monthlyBreakdown: MonthlyBreakdown[];
}
