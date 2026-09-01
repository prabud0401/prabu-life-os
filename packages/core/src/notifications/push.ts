import { getPool, isDatabaseConfigured, logger } from "@prabu-life-os/shared";
import type { FinancialTransaction } from "../finance-engine/types";

export interface DeviceTokenInput {
  deviceToken: string;
  platform?: "ios" | "android" | "web" | string;
  deviceName?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tokens?: string[];
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
}

const memoryDeviceTokens: Set<string> = new Set();

/**
 * Register or update an Expo push device token.
 */
export async function registerDeviceToken(input: DeviceTokenInput): Promise<void> {
  const token = input.deviceToken?.trim();
  if (!token) {
    throw new Error("deviceToken is required");
  }

  if (isDatabaseConfigured()) {
    await getPool().query(
      `INSERT INTO mobile_device_tokens (device_token, platform, device_name, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (device_token)
       DO UPDATE SET
         platform = COALESCE(EXCLUDED.platform, mobile_device_tokens.platform),
         device_name = COALESCE(EXCLUDED.device_name, mobile_device_tokens.device_name),
         updated_at = NOW()`,
      [token, input.platform || null, input.deviceName || null]
    );
  } else {
    memoryDeviceTokens.add(token);
  }
}

/**
 * Remove an Expo push device token.
 */
export async function unregisterDeviceToken(deviceToken: string): Promise<void> {
  const token = deviceToken?.trim();
  if (!token) return;

  if (isDatabaseConfigured()) {
    await getPool().query(
      `DELETE FROM mobile_device_tokens WHERE device_token = $1`,
      [token]
    );
  } else {
    memoryDeviceTokens.delete(token);
  }
}

/**
 * List all active Expo push tokens.
 */
export async function listDeviceTokens(): Promise<string[]> {
  if (isDatabaseConfigured()) {
    try {
      const res = await getPool().query(
        `SELECT device_token FROM mobile_device_tokens ORDER BY updated_at DESC`
      );
      return res.rows.map((r: { device_token: string }) => r.device_token);
    } catch {
      return Array.from(memoryDeviceTokens);
    }
  }

  return Array.from(memoryDeviceTokens);
}

/**
 * Clear in-memory tokens for testing
 */
export function clearMemoryTokensForTests(): void {
  memoryDeviceTokens.clear();
}

/**
 * Send an Expo Push Notification to registered devices.
 */
export async function sendExpoPushNotification(
  payload: PushNotificationPayload
): Promise<{ success: boolean; receipts?: unknown[]; error?: string }> {
  const targetTokens = payload.tokens && payload.tokens.length > 0
    ? payload.tokens
    : await listDeviceTokens();

  if (targetTokens.length === 0) {
    return { success: true, receipts: [], error: "No registered device tokens" };
  }

  const messages = targetTokens.map((to) => ({
    to,
    sound: payload.sound ?? "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: payload.priority ?? "high",
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`Expo push failed (${res.status}): ${text}`);
      return { success: false, error: text };
    }

    const data = await res.json() as any;
    return { success: true, receipts: data.data };
  } catch (err) {
    logger.error(`Expo push exception: ${(err as Error).message}`);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Inspect transactions and dispatch push notifications for notable entries
 * (Salary inflow, large debits >= LKR 10,000, or broker payouts).
 */
export async function notifyNotableTransactions(
  transactions: FinancialTransaction[]
): Promise<void> {
  const tokens = await listDeviceTokens();
  if (tokens.length === 0) return;

  for (const tx of transactions) {
    let title = "";
    let body = "";

    if (tx.transactionType === "SALARY_INFLOW") {
      title = "💰 Salary Inflow Received";
      body = `LKR ${tx.amountLkr.toLocaleString("en-US", { minimumFractionDigits: 2 })} has been credited to your account.`;
    } else if (tx.transactionType === "BROKER_OUTWARD" && tx.amountLkr >= 25000) {
      title = "🔄 Broker Disbursement Alert";
      body = `Broker payout of LKR ${tx.amountLkr.toLocaleString("en-US", { minimumFractionDigits: 2 })}: ${tx.description}`;
    } else if (tx.direction === "debit" && tx.amountLkr >= 10000) {
      title = "⚠️ Large Debit Alert";
      body = `Debit of LKR ${tx.amountLkr.toLocaleString("en-US", { minimumFractionDigits: 2 })}: ${tx.description}`;
    }

    if (title) {
      await sendExpoPushNotification({
        title,
        body,
        data: {
          transactionId: tx.id || tx.externalId,
          type: tx.transactionType,
          amountLkr: tx.amountLkr,
          date: tx.date,
        },
        tokens,
      }).catch((err) => {
        logger.error(`Push notify error: ${err.message}`);
      });
    }
  }
}
