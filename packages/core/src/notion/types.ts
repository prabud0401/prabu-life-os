export interface NotionTransactionInput {
  name: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: "USD" | "LKR";
  type: "Income" | "Expense";
  category: "Salary" | "Bonus" | "Other";
  source: "Outlook" | "Gmail" | "Manual";
  notes?: string;
  transferId?: string;
  amountLkr?: number;
}

export interface NotionPageSummary {
  id: string;
  name: string;
  date?: string;
  amount?: number;
  currency?: string;
  type?: string;
  category?: string;
  source?: string;
  notes?: string;
  transferId?: string;
  amountLkr?: number;
}

export interface NotionTransactionUpdate {
  name?: string;
  date?: string;
  amount?: number;
  currency?: "USD" | "LKR";
  type?: "Income" | "Expense";
  category?: "Salary" | "Bonus" | "Other";
  source?: "Outlook" | "Gmail" | "Manual";
  notes?: string;
  transferId?: string;
  amountLkr?: number;
}
