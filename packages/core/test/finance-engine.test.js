const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyDescription,
} = require("../dist/finance-engine/classifier.js");
const {
  parseEmailNotification,
} = require("../dist/finance-engine/parsers/email.js");
const {
  parseSmsAlert,
} = require("../dist/finance-engine/parsers/sms.js");
const {
  summarizeTransactions,
  clearMemoryStoreForTests,
} = require("../dist/finance-engine/index.js");

describe("Finance Intelligence Engine", () => {
  it("classifies broker outward transfers separately from living expenses", () => {
    const result = classifyDescription({
      description: "Fund transfer to client udaya broker",
      subject: "Fund transfer",
      amountLkr: 50000,
      direction: "debit",
    });
    assert.equal(result.transactionType, "BROKER_OUTWARD");
  });

  it("parses Wise salary email notifications", () => {
    const rows = parseEmailNotification({
      from: "brbangalore@blueoceansp.ai",
      subject: "Transfer sent #2339987406",
      body: "Amount: 260.18 USD. 84237.81 LKR is now in your account.",
      messageId: "wise-1",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].transactionType, "SALARY_INFLOW");
    assert.equal(rows[0].amountLkr, 84237.81);
  });

  it("parses People's Bank SMS credit alerts", () => {
    const rows = parseSmsAlert({
      sender: "PEOPLESBANK",
      text: "Your account has been credited with LKR 75,000.00",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amountLkr, 75000);
    assert.equal(rows[0].transactionType, "BROKER_INWARD");
  });

  it("summarizes net personal savings excluding broker pass-through", () => {
    clearMemoryStoreForTests();
    const summary = summarizeTransactions([
      {
        date: "2026-09-01",
        amountLkr: 84237.81,
        direction: "credit",
        transactionType: "SALARY_INFLOW",
        description: "Salary",
        source: "outlook",
      },
      {
        date: "2026-09-02",
        amountLkr: 5000,
        direction: "debit",
        transactionType: "PERSONAL_LIVING_EXPENSE",
        description: "CEB bill",
        source: "gmail",
      },
      {
        date: "2026-09-03",
        amountLkr: 50000,
        direction: "debit",
        transactionType: "BROKER_OUTWARD",
        description: "udaya broker payout",
        source: "gmail",
      },
    ]);
    assert.equal(summary.salaryLkr, 84237.81);
    assert.equal(summary.livingExpensesLkr, 5000);
    assert.equal(summary.brokerOutwardLkr, 50000);
    assert.equal(summary.netPersonalSavingsLkr, 79237.81);
  });
});
