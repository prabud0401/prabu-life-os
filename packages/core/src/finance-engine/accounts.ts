export interface RegisteredAccount {
  id: string;
  bank: string;
  label: string;
  entityType: string;
  holder: string;
  ingestionSource: string;
}

export const REGISTERED_ACCOUNTS: RegisteredAccount[] = [
  {
    id: "134200130040916",
    bank: "People's Bank",
    label: "Primary Savings",
    entityType: "savings",
    holder: "Prabudeva",
    ingestionSource: "People's Pay Email",
  },
  {
    id: "5371517079",
    bank: "People's Bank",
    label: "Savings #2",
    entityType: "savings",
    holder: "Prabudeva",
    ingestionSource: "People's Pay Email",
  },
  {
    id: "7135010439",
    bank: "People's Bank",
    label: "Digital Wallet",
    entityType: "wallet",
    holder: "U Prabudeva",
    ingestionSource: "People's Pay Wallet Receipts",
  },
  {
    id: "4544885475",
    bank: "People's Bank",
    label: "Credit Card",
    entityType: "credit_card",
    holder: "U Prabudeva",
    ingestionSource: "Card Settlement Receipts",
  },
  {
    id: "028020612034",
    bank: "HNB",
    label: "Youth Savings",
    entityType: "savings",
    holder: "U Prabudeva",
    ingestionSource: "e-Statement PDF",
  },
  {
    id: "02802032",
    bank: "HNB",
    label: "Secondary Savings",
    entityType: "savings",
    holder: "U Prabudeva",
    ingestionSource: "e-Statement PDF",
  },
  {
    id: "89297861",
    bank: "BOC",
    label: "Savings",
    entityType: "savings",
    holder: "U Prabudeva",
    ingestionSource: "e-Statement PDF",
  },
  {
    id: "8003810381",
    bank: "Commercial Bank",
    label: "Savings",
    entityType: "savings",
    holder: "Prabudeva",
    ingestionSource: "Combank Online / Inward Receipts",
  },
];

const BROKER_CONTACTS = [
  "rajeshwary",
  "rajendiran",
  "nithiyananthan",
  "kirushna",
  "charles place",
  "rental",
];

export function normalizeAccountId(value: string): string {
  return value.replace(/\D/g, "");
}

export function isRegisteredAccount(accountRef: string): boolean {
  const normalized = normalizeAccountId(accountRef);
  if (!normalized) return false;
  return REGISTERED_ACCOUNTS.some((account) => {
    const accountNorm = normalizeAccountId(account.id);
    return (
      normalized === accountNorm ||
      normalized.endsWith(accountNorm) ||
      accountNorm.endsWith(normalized)
    );
  });
}

export function isBrokerCounterparty(text: string): boolean {
  const lower = text.toLowerCase();
  return BROKER_CONTACTS.some((name) => lower.includes(name));
}

export function extractTransferFee(debitAmount: number): { principal: number; fee: number } {
  if (debitAmount <= 0) return { principal: 0, fee: 0 };
  const feeCandidates = [25, 20, 12, 10, 8];
  for (const fee of feeCandidates) {
    if (debitAmount > fee && debitAmount - fee >= 100) {
      return { principal: debitAmount - fee, fee };
    }
  }
  return { principal: debitAmount, fee: 0 };
}
