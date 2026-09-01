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

/** Father's brokerage — client deposit sources */
const BROKER_CLIENT_CONTACTS = [
  "kirushna",
  "charles place",
  "charlesplace",
  "rental",
  "cash dep",
  "cdm",
  "client dep",
];

/** Dad's broker partners who receive split payouts */
export const BROKER_PARTNER_CONTACTS = [
  "rajeshwary",
  "rajendiran",
  "nithiyananthan",
  "nithiyanathan",
  "partner broker",
  "broker share",
  "broker split",
];

/** Friends / contacts for personal loan tracking */
export const LOAN_CONTACTS = [
  "loan to",
  "loan from",
  "lend to",
  "borrowed from",
  "repay loan",
  "loan repay",
  "friend loan",
];

const TRANSFER_FEE_AMOUNTS = [25, 20, 12, 10, 8];

const SELF_TRANSFER_KEYWORDS = [
  "justpay",
  "cefts",
  "self transfer",
  "own account",
  "to my account",
  "between accounts",
  "inter account",
  "wallet top",
  "wallet transfer",
];

const CARD_ACCOUNT_IDS = ["4544885475"];

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

export function findRegisteredAccountId(text: string): string | undefined {
  const normalized = normalizeAccountId(text);
  if (!normalized) return undefined;
  const match = REGISTERED_ACCOUNTS.find((account) => {
    const accountNorm = normalizeAccountId(account.id);
    return (
      normalized.includes(accountNorm) ||
      accountNorm.includes(normalized) ||
      text.includes(account.id)
    );
  });
  return match?.id;
}

export function extractAccountNumbersFromText(text: string): string[] {
  const found = new Set<string>();
  for (const account of REGISTERED_ACCOUNTS) {
    if (text.includes(account.id)) {
      found.add(account.id);
    }
  }
  const digitMatches = text.match(/\b\d{8,16}\b/g) || [];
  for (const digits of digitMatches) {
    if (isRegisteredAccount(digits)) {
      const match = REGISTERED_ACCOUNTS.find((a) => {
        const norm = normalizeAccountId(a.id);
        const d = normalizeAccountId(digits);
        return norm === d || norm.endsWith(d) || d.endsWith(norm);
      });
      if (match) found.add(match.id);
    }
  }
  return [...found];
}

export function isBrokerClientDeposit(text: string): boolean {
  const lower = text.toLowerCase();
  return BROKER_CLIENT_CONTACTS.some((name) => lower.includes(name));
}

export function isBrokerPartnerPayout(text: string): boolean {
  const lower = text.toLowerCase();
  return BROKER_PARTNER_CONTACTS.some((name) => lower.includes(name));
}

/** @deprecated use isBrokerClientDeposit */
export function isBrokerCounterparty(text: string): boolean {
  return isBrokerClientDeposit(text);
}

export function isLoanTransaction(text: string): boolean {
  const lower = text.toLowerCase();
  return LOAN_CONTACTS.some((k) => lower.includes(k)) || /\bloan\b/i.test(lower);
}

export function isSelfTransferDescription(text: string): boolean {
  const lower = text.toLowerCase();
  return SELF_TRANSFER_KEYWORDS.some((k) => lower.includes(k));
}

export function isCreditCardAccount(accountRef?: string): boolean {
  if (!accountRef) return false;
  const norm = normalizeAccountId(accountRef);
  return CARD_ACCOUNT_IDS.some((id) => norm.includes(id) || id.includes(norm));
}

export function extractTransferFee(debitAmount: number): { principal: number; fee: number } {
  if (debitAmount <= 0) return { principal: 0, fee: 0 };
  for (const fee of TRANSFER_FEE_AMOUNTS) {
    if (debitAmount > fee && debitAmount - fee >= 100) {
      return { principal: debitAmount - fee, fee };
    }
  }
  return { principal: debitAmount, fee: 0 };
}

export function isLikelyBrokerOutward(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.includes("udaya broker")) return true;
  if (lower.includes("trf to udaya") || lower.includes("transfer to udaya")) return true;
  if (lower.includes("broker payout") || lower.includes("broker disburse")) return true;
  if (isBrokerPartnerPayout(lower)) return false;
  if (/\bbroker\b/.test(lower) && lower.includes("payout")) return true;
  return false;
}
