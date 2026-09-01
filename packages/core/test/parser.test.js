const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseWiseEmail,
  getHistoricalFirstPayment,
} = require("../dist/finance/parser");

describe("parseWiseEmail", () => {
  it("parses Transfer sent format with USD amount and LKR received", () => {
    const message = {
      subject: "FW: Transfer sent",
      receivedDateTime: "2026-08-30T10:00:00Z",
      body: {
        contentType: "html",
        content:
          "<p>Amount: 260.18 USD</p><p>84,237.81 LKR is now in your account</p><p>Transfer Number: #2339987406</p><p>Rate: 1 USD = 323.77 LKR</p>",
      },
    };

    const parsed = parseWiseEmail(message);
    assert.ok(parsed);
    assert.equal(parsed.amount, 260.18);
    assert.equal(parsed.amountLkr, 84237.81);
    assert.equal(parsed.transferNumber, "2339987406");
    assert.equal(parsed.category, "Salary");
    assert.equal(parsed.date, "2026-08-30");
  });

  it("parses Your money's been sent format and derives USD from rate", () => {
    const message = {
      subject: "FW: Your money's been sent",
      receivedDateTime: "2025-09-15T08:30:00Z",
      body: {
        contentType: "text",
        content:
          "75,000.00 LKR is on its way\nRate: 1 USD = 300.00 LKR\nTransfer Number: #1234567890\nWise fee: 1.25 USD",
      },
    };

    const parsed = parseWiseEmail(message);
    assert.ok(parsed);
    assert.equal(parsed.amount, 250);
    assert.equal(parsed.amountLkr, 75000);
    assert.equal(parsed.feeUsd, 1.25);
    assert.equal(parsed.transferNumber, "1234567890");
  });

  it("detects bonus transfers from subject keywords", () => {
    const message = {
      subject: "FW: Year-end appreciation transfer",
      receivedDateTime: "2026-01-01T12:00:00Z",
      body: {
        contentType: "text",
        content:
          "Amount: 152.62 USD\n45,000.00 LKR is now in your account\nTransfer Number: #1899036634",
      },
    };

    const parsed = parseWiseEmail(message);
    assert.ok(parsed);
    assert.equal(parsed.category, "Bonus");
  });

  it("returns null when no transfer signals are present", () => {
    const message = {
      subject: "Meeting notes",
      receivedDateTime: "2026-08-30T10:00:00Z",
      body: { contentType: "text", content: "No financial data here." },
    };

    assert.equal(parseWiseEmail(message), null);
  });
});

describe("getHistoricalFirstPayment", () => {
  it("returns the Aug 2025 initial payment record", () => {
    const payment = getHistoricalFirstPayment();
    assert.equal(payment.transferNumber, "20250804");
    assert.equal(payment.amount, 200.17);
    assert.equal(payment.amountLkr, 60657);
    assert.equal(payment.date, "2025-08-04");
  });
});
