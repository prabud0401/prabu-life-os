# Mobile Push Notification System

Prabu Life OS integrates with **Expo Push Notifications** (`https://exp.host/--/api/v2/push/send`) to send real-time financial intelligence alerts to mobile devices.

---

## 1. Architecture

```
Mobile App (Expo)               Backend (Railway)             External Triggers
────────────────                ─────────────────             ─────────────────
1. Request push permission ───► POST /devices/register ──► mobile_device_tokens table
                                                                    ▲
2. Receive rich notification ◄─ sendExpoPushNotification ────────────┤
                                                                     ├─ Wise Salary Inflow
                                                                     ├─ SMS Deposit / Webhook
                                                                     ├─ Bank Statement PDF
                                                                     └─ Large Debit (≥ LKR 10,000)
```

---

## 2. Notification Triggers

Push alerts are triggered automatically upon transaction ingestion or manually via REST API:

| Trigger Event | Threshold / Condition | Example Notification |
|---|---|---|
| **Salary Inflow** | `SALARY_INFLOW` (Outlook / Wise) | `💰 Salary Inflow Received` — *LKR 84,237.81 has been credited to your account.* |
| **Large Debit** | Direction = debit & Amount $\ge$ LKR 10,000 | `⚠️ Large Debit Alert` — *Debit of LKR 45,000.00: CEB bill / Fund transfer.* |
| **Broker Disbursement** | `BROKER_OUTWARD` & Amount $\ge$ LKR 25,000 | `🔄 Broker Disbursement Alert` — *Broker payout of LKR 50,000.00.* |
| **Custom / Manual** | Via `POST /api/finance/intelligence/notify` | Custom title & body |

---

## 3. Endpoints

### Register Device Token
- **Method**: `POST`
- **Path**: `/api/finance/intelligence/devices/register`
- **Auth**: Bearer JWT or API Key
- **Body**:
  ```json
  {
    "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "android",
    "deviceName": "Prabu Samsung Galaxy S24"
  }
  ```

### Unregister Device Token
- **Method**: `POST`
- **Path**: `/api/finance/intelligence/devices/unregister`
- **Auth**: Bearer JWT or API Key
- **Body**:
  ```json
  {
    "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  }
  ```

### Dispatch Push Notification (Manual / Test)
- **Method**: `POST`
- **Path**: `/api/finance/intelligence/notify`
- **Auth**: Bearer JWT or API Key
- **Body**:
  ```json
  {
    "title": "💰 Financial Sync Complete",
    "body": "Your bank statements and Wise transfers are up to date.",
    "data": { "screen": "dashboard" }
  }
  ```

---

## 4. Mobile Client Integration (React Native / Expo)

In `prabu-life-os-mobile`:

```typescript
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync(apiBaseUrl: string, jwtToken: string) {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  await fetch(`${apiBaseUrl}/finance/intelligence/devices/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({
      deviceToken: tokenData.data,
      platform: Platform.OS,
      deviceName: Constants.deviceName,
    }),
  });
}
```

---

## 5. Database Schema

Migration `migrations/003_mobile_device_tokens.sql`:

```sql
CREATE TABLE IF NOT EXISTS mobile_device_tokens (
  id              SERIAL PRIMARY KEY,
  device_token    TEXT NOT NULL UNIQUE,
  platform        TEXT,
  device_name     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
