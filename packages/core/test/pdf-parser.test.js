const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseHnbStatementText,
  parseBocStatementText,
  parseBankStatementPdf,
  BANK_DEFAULT_PASSWORDS,
  BANK_DEFAULT_ACCOUNTS,
} = require("../dist/finance-engine/parsers/pdf.js");
const {
  registerDeviceToken,
  listDeviceTokens,
  unregisterDeviceToken,
  clearMemoryTokensForTests,
} = require("../dist/notifications/push.js");

describe("Bank Statement PDF Parsers", () => {
  it("verifies default passwords for HNB and BOC", () => {
    assert.equal(BANK_DEFAULT_PASSWORDS.HNB, "028020612034");
    assert.equal(BANK_DEFAULT_PASSWORDS.BOC, "7861");
  });

  it("parses HNB statement text with debits, credits, and balances", () => {
    const sampleHnb = `
HATTON NATIONAL BANK PLC - STATEMENT OF ACCOUNT
Account Number: 028020612034
Date       Value Date Description              Debit       Credit      Balance
15/08/2025 15/08/2025 SALARY INWARD WISE                   84,237.81   120,450.00
18/08/2025 18/08/2025 CEB BILL PAYMENT         5,400.00                115,050.00
20/08/2025 20/08/2025 FUND TRF TO UDAYA       50,000.00                 65,050.00
`;
    const rows = parseHnbStatementText(sampleHnb);
    assert.equal(rows.length, 3);

    // Row 1: Salary
    assert.equal(rows[0].date, "2025-08-15");
    assert.equal(rows[0].amountLkr, 84237.81);
    assert.equal(rows[0].direction, "credit");
    assert.equal(rows[0].transactionType, "SALARY_INFLOW");
    assert.equal(rows[0].accountId, BANK_DEFAULT_ACCOUNTS.HNB);

    // Row 2: CEB Bill
    assert.equal(rows[1].date, "2025-08-18");
    assert.equal(rows[1].amountLkr, 5400.00);
    assert.equal(rows[1].direction, "debit");
    assert.equal(rows[1].transactionType, "PERSONAL_LIVING_EXPENSE");

    // Row 3: Broker outward (trf to udaya in broker context)
    assert.equal(rows[2].date, "2025-08-20");
    assert.equal(rows[2].amountLkr, 50000.00);
    assert.equal(rows[2].direction, "debit");
    assert.equal(rows[2].transactionType, "BROKER_OUTWARD");
  });

  it("parses BOC statement text with debits and credits", () => {
    const sampleBoc = `
BANK OF CEYLON
Statement for Account No: 00007861
Date       Description                     Cheque No  Debit       Credit      Balance
2025-08-10 CASH DEPOSIT BRANCH                        -           25,000.00   50,000.00
2025-08-12 ATM WITHDRAWAL COLOMBO                     10,000.00   -           40,000.00
`;
    const rows = parseBocStatementText(sampleBoc);
    assert.equal(rows.length, 2);

    assert.equal(rows[0].date, "2025-08-10");
    assert.equal(rows[0].amountLkr, 25000.00);
    assert.equal(rows[0].direction, "credit");
    assert.equal(rows[0].accountId, BANK_DEFAULT_ACCOUNTS.BOC);

    assert.equal(rows[1].date, "2025-08-12");
    assert.equal(rows[1].amountLkr, 10000.00);
    assert.equal(rows[1].direction, "debit");
  });

  it("auto-detects bank from raw text in parseBankStatementPdf", async () => {
    const sample = `
HATTON NATIONAL BANK
12/09/2025 ONLINE PAYMENT FOOD CITY 4,250.00 80,000.00
`;
    const rows = await parseBankStatementPdf({ rawText: sample, bank: "AUTO" });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amountLkr, 4250.00);
    assert.equal(rows[0].direction, "debit");
  });
});

describe("Mobile Push Device Tokens", () => {
  it("registers and lists device tokens", async () => {
    clearMemoryTokensForTests();
    await registerDeviceToken({
      deviceToken: "ExponentPushToken[test-12345]",
      platform: "android",
      deviceName: "Galaxy S24",
    });

    const tokens = await listDeviceTokens();
    assert.ok(tokens.includes("ExponentPushToken[test-12345]"));

    await unregisterDeviceToken("ExponentPushToken[test-12345]");
    const after = await listDeviceTokens();
    assert.equal(after.length, 0);
  });
});
