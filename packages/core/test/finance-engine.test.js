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
  pairInternalTransfers,
  markCrossSourceDuplicates,
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

  it("classifies inter-account transfer to own HNB account as INTERNAL_TRANSFER", () => {
    const result = classifyDescription({
      description: "Fund transfer via JustPay",
      subject: "Fund transfer",
      amountLkr: 25000,
      direction: "debit",
      accountId: "134200130040916",
      counterparty: "028020612034",
    });
    assert.equal(result.transactionType, "INTERNAL_TRANSFER");
  });

  it("classifies broker partner split payouts separately", () => {
    const result = classifyDescription({
      description: "Fund transfer to Rajendiran partner share",
      amountLkr: 15000,
      direction: "debit",
    });
    assert.equal(result.transactionType, "BROKER_PARTNER_PAYOUT");
  });

  it("classifies pawn payments", () => {
    const result = classifyDescription({
      description: "Pawn shop gold interest payment",
      amountLkr: 8000,
      direction: "debit",
    });
    assert.equal(result.transactionType, "PAWN_PAYMENT");
  });

  it("classifies personal loans", () => {
    const given = classifyDescription({
      description: "Loan to friend Kasun",
      amountLkr: 50000,
      direction: "debit",
    });
    assert.equal(given.transactionType, "LOAN_GIVEN");

    const received = classifyDescription({
      description: "Loan from friend",
      amountLkr: 20000,
      direction: "credit",
    });
    assert.equal(received.transactionType, "LOAN_RECEIVED");
  });

  it("classifies credit card top-up separately from POS spend", () => {
    const topup = classifyDescription({
      description: "Card Payment to 4544885475",
      subject: "Card Payment",
      amountLkr: 10000,
      direction: "debit",
      counterparty: "4544885475",
    });
    assert.equal(topup.transactionType, "CARD_REPAYMENT");

    const pos = classifyDescription({
      description: "POS UBER EATS COLOMBO",
      amountLkr: 2500,
      direction: "debit",
      accountId: "4544885475",
    });
    assert.equal(pos.transactionType, "CARD_POS_SPEND");
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

  it("parses SMS debit alerts", () => {
    const rows = parseSmsAlert({
      sender: "PEOPLESBANK",
      text: "Your account has been debited with LKR 5,400.00 for CEB bill",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].direction, "debit");
    assert.equal(rows[0].amountLkr, 5400);
  });

  it("pairs internal transfer debits and credits", () => {
    const txs = pairInternalTransfers([
      {
        date: "2026-09-01",
        amountLkr: 50000,
        direction: "debit",
        transactionType: "INTERNAL_TRANSFER",
        description: "Transfer to HNB",
        source: "gmail",
        externalId: "email:1",
      },
      {
        date: "2026-09-01",
        amountLkr: 50000,
        direction: "credit",
        transactionType: "INTERNAL_TRANSFER",
        description: "Transfer from PB",
        source: "sms",
        externalId: "sms:1",
      },
    ]);
    assert.ok(txs[0].metadata?.pairedWith);
    assert.ok(txs[1].metadata?.pairedWith);
  });

  it("marks cross-source duplicates", () => {
    const txs = markCrossSourceDuplicates([
      {
        date: "2026-09-01",
        amountLkr: 5400,
        direction: "debit",
        transactionType: "PERSONAL_LIVING_EXPENSE",
        description: "CEB bill",
        source: "gmail",
        externalId: "email:ceb",
      },
      {
        date: "2026-09-01",
        amountLkr: 5400,
        direction: "debit",
        transactionType: "PERSONAL_LIVING_EXPENSE",
        description: "CEB BILL PAYMENT",
        source: "statement_pdf",
        externalId: "pdf:ceb",
      },
    ]);
    assert.equal(txs[1].metadata?.isDuplicate, true);
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
      {
        date: "2026-09-04",
        amountLkr: 75000,
        direction: "credit",
        transactionType: "BROKER_INWARD",
        description: "Kirushna client deposit",
        source: "sms",
      },
      {
        date: "2026-09-05",
        amountLkr: 10000,
        direction: "debit",
        transactionType: "INTERNAL_TRANSFER",
        description: "PB to HNB",
        source: "gmail",
      },
    ]);
    assert.equal(summary.salaryLkr, 84237.81);
    assert.equal(summary.livingExpensesLkr, 5000);
    assert.equal(summary.brokerOutwardLkr, 50000);
    assert.equal(summary.brokerInwardLkr, 75000);
    assert.equal(summary.brokerNetPositionLkr, 25000);
    assert.equal(summary.selfTransfersLkr, 10000);
    assert.equal(summary.netPersonalSavingsLkr, 79237.81);
  });
});
