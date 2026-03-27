# Backend MVP Hardening — Event Propagation & Reliability

This document covers all backend changes needed before beta launch. The core problem: **cascading effects (notifications, rewards, reputation) after key events are fire-and-forget with silent failure.** Experts can complete work and never receive rewards or notifications.

Priority order: Critical (blocks beta) → High (should fix before beta) → Medium (tech debt, fix soon after).

---

## Critical: Notification Delivery Guarantees

### Problem

Notifications are created **outside transactions** with `.catch(() => log.warn())` in 20+ places. If the DB write fails, the triggering operation (hire, guild admission, review) has already committed — the notification is lost permanently. No retry, no audit trail.

### Files Affected

- `src/features/endorsements/hire-accountability.service.ts` (lines 206-237)
- `src/features/experts/expert-application-finalization.service.ts` (lines 493-505, 537-574)
- `src/features/applications/applications.service.ts` (lines 107-117)
- 17+ other call sites using the same `.catch(() => log.warn())` pattern

### What to Do

**Implement the transactional outbox pattern:**

1. Create a `notification_outbox` table:
   ```sql
   CREATE TABLE notification_outbox (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     recipient_type VARCHAR(20) NOT NULL,        -- 'expert' | 'candidate' | 'company'
     recipient_id UUID NOT NULL,
     notification_type VARCHAR(50) NOT NULL,
     title TEXT NOT NULL,
     message TEXT NOT NULL,
     link TEXT,
     metadata JSONB DEFAULT '{}',
     idempotency_key VARCHAR(255) UNIQUE NOT NULL,
     status VARCHAR(20) DEFAULT 'pending',       -- 'pending' | 'delivered' | 'failed'
     attempts INT DEFAULT 0,
     max_attempts INT DEFAULT 5,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     delivered_at TIMESTAMPTZ,
     last_error TEXT
   );
   CREATE INDEX idx_outbox_pending ON notification_outbox (status) WHERE status = 'pending';
   ```

2. **Write to outbox INSIDE the same transaction** as the triggering operation:
   ```typescript
   // hire-accountability.service.ts — INSIDE withTransaction()
   await client.query(
     `INSERT INTO notification_outbox
      (recipient_type, recipient_id, notification_type, title, message, link, idempotency_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
     ['expert', expertId, 'reward_earned', title, message, link,
      `hire-reward-${applicationId}-${expertId}`]  // idempotency key
   );
   ```

3. **Create an outbox processor cron** (run every 5-10 seconds):
   ```typescript
   // jobs/notification-outbox.cron.ts
   async function processOutbox() {
     const pending = await pool.query(
       `SELECT * FROM notification_outbox
        WHERE status = 'pending' AND attempts < max_attempts
        ORDER BY created_at ASC LIMIT 50
        FOR UPDATE SKIP LOCKED`
     );

     for (const row of pending.rows) {
       try {
         // Route to correct notification service based on recipient_type
         await notificationServices[row.recipient_type].createNotification({
           recipientId: row.recipient_id,
           type: row.notification_type,
           title: row.title,
           message: row.message,
           link: row.link,
         });
         await pool.query(
           `UPDATE notification_outbox SET status = 'delivered', delivered_at = NOW() WHERE id = $1`,
           [row.id]
         );
       } catch (error) {
         await pool.query(
           `UPDATE notification_outbox SET attempts = attempts + 1, last_error = $2
            WHERE id = $1`,
           [row.id, error.message]
         );
       }
     }
   }
   ```

4. **Replace all 20+ fire-and-forget notification calls** with outbox inserts inside their respective transactions. Search for this pattern and replace every instance:
   ```typescript
   // FIND AND REPLACE THIS PATTERN:
   notificationsService.createNotification(...).catch((err) => log.warn(...))

   // WITH: outbox insert inside the existing transaction (see step 2)
   ```

### Acceptance Criteria

- Zero `.catch(() => log.warn())` notification calls remain
- All notifications written inside the same transaction as the triggering event
- Outbox cron processes pending notifications with retry (up to 5 attempts)
- Failed notifications visible in `notification_outbox` table for debugging
- Idempotency keys prevent duplicate notifications on retry

---

## Critical: Hire Outcome Idempotency

### Problem

`recordHireOutcome()` in `hire-accountability.service.ts` can be called multiple times for the same application. Each call queues duplicate `reward_distribution` blockchain ops and creates duplicate notification outbox entries (once migrated). No guard against re-processing.

### Files Affected

- `src/features/endorsements/hire-accountability.service.ts` (lines 29-240)

### What to Do

1. Add a unique constraint or check:
   ```sql
   ALTER TABLE hire_outcomes ADD CONSTRAINT uq_hire_outcome_application
     UNIQUE (application_id);
   ```

2. At the start of `recordHireOutcome()`, check if already processed:
   ```typescript
   const existing = await client.query(
     'SELECT id FROM hire_outcomes WHERE application_id = $1',
     [applicationId]
   );
   if (existing.rows.length > 0) {
     return existing.rows[0]; // Already processed, return existing result
   }
   ```

3. Use `ON CONFLICT DO NOTHING` on `pending_blockchain_ops` to prevent duplicate reward queuing:
   ```sql
   INSERT INTO pending_blockchain_ops (op_type, payload, idempotency_key)
   VALUES ('reward_distribution', $1, $2)
   ON CONFLICT (idempotency_key) DO NOTHING
   ```
   Add an `idempotency_key` column if it doesn't exist:
   ```sql
   ALTER TABLE pending_blockchain_ops ADD COLUMN idempotency_key VARCHAR(255) UNIQUE;
   ```
   Key format: `reward-${applicationId}-${expertId}`

### Acceptance Criteria

- Calling `recordHireOutcome()` twice for the same application is safe (returns existing result)
- No duplicate blockchain ops queued
- No duplicate notifications generated

---

## Critical: Blockchain TX Confirmation

### Problem

In `blockchain-ops.cron.ts` (lines 131-159), after calling `rewardsService.distributeRewardsOnChain()`, the op status is set to `'confirmed'` without verifying the transaction was actually confirmed on-chain. If the TX reverts, the DB says confirmed but the expert's wallet is empty.

### Files Affected

- `src/jobs/blockchain-ops.cron.ts` (lines 99-159)
- `src/services/rewards.service.ts`

### What to Do

1. **Return the TX hash** from `distributeRewardsOnChain()`:
   ```typescript
   async distributeRewardsOnChain(params): Promise<{ txHash: string }> {
     const tx = await contract.distributeReward(...);
     const receipt = await tx.wait(1); // Wait for 1 confirmation
     if (receipt.status !== 1) {
       throw new Error(`TX reverted: ${tx.hash}`);
     }
     return { txHash: tx.hash };
   }
   ```

2. **Store TX hash and only confirm after receipt:**
   ```typescript
   // blockchain-ops.cron.ts
   try {
     const { txHash } = await rewardsService.distributeRewardsOnChain(payload);
     await pool.query(
       `UPDATE pending_blockchain_ops
        SET status = 'confirmed', tx_hash = $2, confirmed_at = NOW()
        WHERE id = $1`,
       [op.id, txHash]
     );
     // NOW notify expert via outbox
     await pool.query(
       `INSERT INTO notification_outbox
        (recipient_type, recipient_id, notification_type, title, message, idempotency_key)
        VALUES ('expert', $1, 'reward_confirmed', 'Reward Sent',
                'Your vetting reward has been confirmed on-chain.', $2)`,
       [payload.expertId, `reward-confirmed-${op.id}`]
     );
   } catch (error) {
     await pool.query(
       `UPDATE pending_blockchain_ops
        SET status = CASE WHEN attempt_count >= max_attempts THEN 'abandoned' ELSE 'failed' END,
            last_error = $2, attempt_count = attempt_count + 1
        WHERE id = $1`,
       [op.id, error.message]
     );
   }
   ```

3. Add `tx_hash` and `confirmed_at` columns to `pending_blockchain_ops` if they don't exist:
   ```sql
   ALTER TABLE pending_blockchain_ops
     ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66),
     ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
   ```

4. **Handle experts without wallets explicitly** — currently silently skipped with `log.debug()`. Instead, set status to `'blocked'` with a reason:
   ```typescript
   if (!expert.wallet_address) {
     await pool.query(
       `UPDATE pending_blockchain_ops
        SET status = 'blocked', last_error = 'Expert has no wallet address'
        WHERE id = $1`,
       [op.id]
     );
     return; // Don't count as attempt
   }
   ```

### Acceptance Criteria

- Rewards only marked `'confirmed'` after on-chain TX receipt with `status === 1`
- TX hash stored for audit trail
- Expert notified when reward is confirmed on-chain
- Experts without wallets get `'blocked'` status instead of silent skip
- Abandoned ops (max retries exceeded) are visible for manual intervention

---

## High: Centralized Notification Service

### Problem

Three separate notification services (`notifications.service.ts`, `candidate-notifications.service.ts`, `company-notifications.service.ts`) with duplicated logic. Makes the outbox migration harder and increases chance of inconsistent behavior.

### Files Affected

- `src/features/experts/notifications.service.ts`
- `src/features/candidates/candidate-notifications.service.ts`
- `src/features/companies/company-notifications.service.ts`

### What to Do

Create a unified service that the outbox processor calls:

```typescript
// src/shared/services/unified-notifications.service.ts

type RecipientType = 'expert' | 'candidate' | 'company';

interface CreateNotificationParams {
  recipientType: RecipientType;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

class UnifiedNotificationsService {
  private tableMap: Record<RecipientType, string> = {
    expert: 'expert_notifications',
    candidate: 'candidate_notifications',
    company: 'company_notifications',
  };

  private recipientColMap: Record<RecipientType, string> = {
    expert: 'expert_id',
    candidate: 'candidate_id',
    company: 'company_id',
  };

  async createNotification(params: CreateNotificationParams): Promise<void> {
    const table = this.tableMap[params.recipientType];
    const col = this.recipientColMap[params.recipientType];

    await pool.query(
      `INSERT INTO ${table} (${col}, type, title, message, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [params.recipientId, params.type, params.title,
       params.message, params.link, params.metadata ?? {}]
    );
  }

  async createBulkNotifications(notifications: CreateNotificationParams[]): Promise<void> {
    // Group by recipient type, batch insert per table
    const grouped = groupBy(notifications, 'recipientType');
    for (const [type, items] of Object.entries(grouped)) {
      // Batch INSERT for each table
    }
  }
}
```

Keep existing services as thin wrappers if needed for backward compatibility, but route the outbox processor through the unified service.

### Acceptance Criteria

- Single service handles all notification creation
- Outbox processor uses this service
- Old notification services can be deprecated over time (not blocking)

---

## High: Expert Application Finalization Reliability

### Problem

In `expert-application-finalization.service.ts`, after the transaction commits (line 489):
- `sendFinalizationNotifications()` is fire-and-forget (line 494)
- `scheduleOnChainFinalization()` is fire-and-forget (line 499)
- If either fails, the expert is admitted in DB but never notified and never added on-chain

### Files Affected

- `src/features/experts/expert-application-finalization.service.ts` (lines 399-505)

### What to Do

1. **Move notification writes into the transaction** using the outbox pattern (see Critical section above).

2. **Move blockchain op queuing into the transaction** — the `INSERT INTO pending_blockchain_ops` for `add_guild_member` should happen inside the same transaction as the `guild_memberships` insert. Based on the code, this may already be inside the transaction (lines 408-418) — verify and ensure it is.

3. **Notify all affected parties via outbox inserts inside the transaction:**
   - Applicant: "You've been admitted to [guild]"
   - Each reviewer: "Application you reviewed has been finalized"

4. **Add guard against finalizing deleted guilds:**
   ```typescript
   const guild = await client.query('SELECT id FROM guilds WHERE id = $1', [guildId]);
   if (guild.rows.length === 0) {
     await client.query(
       `UPDATE expert_applications SET status = 'error',
        status_reason = 'Guild no longer exists' WHERE id = $1`,
       [applicationId]
     );
     return;
   }
   ```

### Acceptance Criteria

- All notifications for finalization are in the outbox inside the transaction
- Blockchain membership op is inside the transaction
- Deleted/missing guilds don't cause silent FK failures

---

## High: Cron Job Resilience

### Problem

`finalize-proposals.cron.ts` processes applications in a sequential loop. Individual failures are caught and logged but don't halt the batch. No backpressure, no circuit breaker, no alerting when failure rate is high.

### Files Affected

- `src/jobs/finalize-proposals.cron.ts` (lines 45-262)
- `src/jobs/blockchain-ops.cron.ts`

### What to Do

1. **Add structured result tracking:**
   ```typescript
   const results = { succeeded: 0, failed: 0, errors: [] as string[] };

   for (const app of readyApplications) {
     try {
       await finalizeApplication(app.id);
       results.succeeded++;
     } catch (error) {
       results.failed++;
       results.errors.push(`${app.id}: ${error.message}`);
       logger.error(`Failed to finalize application ${app.id}`, error);
     }
   }

   // Log summary
   logger.info('Finalization batch complete', results);

   // Alert if failure rate is high
   if (results.failed > 0 && results.failed / (results.succeeded + results.failed) > 0.5) {
     logger.error('HIGH FAILURE RATE in finalization batch', results);
     // Consider: send alert to admin notification channel
   }
   ```

2. **Add circuit breaker for consecutive failures:**
   ```typescript
   let consecutiveFailures = 0;
   const MAX_CONSECUTIVE = 5;

   for (const app of readyApplications) {
     if (consecutiveFailures >= MAX_CONSECUTIVE) {
       logger.error(`Circuit breaker: ${MAX_CONSECUTIVE} consecutive failures, stopping batch`);
       break;
     }
     try {
       await finalizeApplication(app.id);
       consecutiveFailures = 0; // reset on success
     } catch (error) {
       consecutiveFailures++;
       // ... error handling
     }
   }
   ```

3. **Add exponential backoff for blockchain-ops cron:**
   ```typescript
   // If an op fails, increase delay before next attempt
   const backoffMs = Math.min(1000 * Math.pow(2, op.attempt_count), 300000); // max 5 min
   await pool.query(
     `UPDATE pending_blockchain_ops
      SET next_attempt_at = NOW() + interval '${backoffMs} milliseconds'
      WHERE id = $1`,
     [op.id]
   );
   ```
   Add `next_attempt_at` column:
   ```sql
   ALTER TABLE pending_blockchain_ops
     ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT NOW();
   ```
   Update the polling query:
   ```sql
   SELECT * FROM pending_blockchain_ops
   WHERE status IN ('pending', 'failed')
     AND next_attempt_at <= NOW()
   ORDER BY created_at ASC LIMIT 20
   FOR UPDATE SKIP LOCKED
   ```

### Acceptance Criteria

- Cron logs structured batch results (succeeded, failed, error details)
- Circuit breaker stops batch after 5 consecutive failures
- Blockchain ops use exponential backoff between retries
- High failure rates are logged at error level for monitoring

---

## High: Reward Calculation Precision

### Problem

In `expert-application-finalization.service.ts` (lines 300-304), reward calculations use JavaScript floating-point arithmetic: `poolShare * (1 - alignmentDistance / 100)`. This can cause dust-amount losses that accumulate over time.

### Files Affected

- `src/features/experts/expert-application-finalization.service.ts` (lines 300-304)
- `src/features/endorsements/hire-accountability.service.ts` (reward calculations)

### What to Do

Use integer arithmetic with a known precision (e.g., basis points or wei-scale integers):

```typescript
// Instead of:
const reward = poolShare * (1 - alignmentDistance / 100);

// Use:
const PRECISION = 10000n; // basis points
const alignmentBps = BigInt(Math.round(alignmentDistance * 100)); // e.g., 15.5% → 1550
const rewardBps = PRECISION - alignmentBps;
const reward = (BigInt(poolShare) * rewardBps) / PRECISION;
```

Or use a decimal library (`decimal.js`) if BigInt conversion is complex for the existing data types.

### Acceptance Criteria

- No floating-point arithmetic in reward calculations
- Reward amounts are deterministic and reproducible
- Total distributed rewards never exceed the pool

---

## Medium: Transaction Isolation for Critical Paths

### Problem

`withTransaction()` in `src/shared/utils/transaction.ts` uses the default `READ COMMITTED` isolation level. For hire outcome recording and application finalization where concurrent processing is possible (cron + API), this allows lost updates.

### Files Affected

- `src/shared/utils/transaction.ts`

### What to Do

Add an optional isolation level parameter:

```typescript
type IsolationLevel = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  isolationLevel: IsolationLevel = 'READ COMMITTED'
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

Use `SERIALIZABLE` for:
- `recordHireOutcome()` — prevents duplicate processing
- `finalizeApplication()` — prevents concurrent finalization of same app

Use `REPEATABLE READ` for:
- Reward distribution — ensures consistent reads of endorser rankings

### Acceptance Criteria

- Critical transaction paths specify isolation level explicitly
- `withTransaction` supports isolation level parameter
- Default behavior unchanged for non-critical paths

---

## Medium: Statement Timeouts

### Problem

No statement timeout configured. Long-running queries in cron jobs can hold locks indefinitely, blocking other operations.

### What to Do

Add statement timeout to the transaction utility:

```typescript
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  options?: { isolationLevel?: IsolationLevel; timeoutMs?: number }
): Promise<T> {
  const client = await pool.connect();
  try {
    if (options?.timeoutMs) {
      await client.query(`SET statement_timeout = ${options.timeoutMs}`);
    }
    await client.query(`BEGIN ISOLATION LEVEL ${options?.isolationLevel ?? 'READ COMMITTED'}`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    if (options?.timeoutMs) {
      await client.query('RESET statement_timeout');
    }
    client.release();
  }
}
```

Recommended timeouts:
- API request handlers: 10 seconds
- Cron finalization per-application: 30 seconds
- Blockchain ops: 60 seconds

### Acceptance Criteria

- Transaction utility supports optional timeout
- Critical paths have explicit timeouts
- No open-ended locks possible

---

## Medium: Structured Logging for Debugging

### Problem

Current `.catch(() => log.warn(...))` calls lose context. In production, you can't tell WHICH expert, WHICH application, WHICH reward failed.

### What to Do

Adopt structured logging with context in all error paths:

```typescript
// Instead of:
log.warn('Failed to send notification');

// Use:
logger.error('Notification delivery failed', {
  operation: 'hire_outcome_notification',
  applicationId,
  expertId,
  recipientType: 'expert',
  notificationType: 'reward_earned',
  error: error.message,
  stack: error.stack,
});
```

Key fields to always include:
- `operation` — what was being attempted
- Entity IDs — `applicationId`, `expertId`, `guildId`, etc.
- `error` — the error message
- `timestamp` — auto-included by logger

This will be especially important for debugging outbox failures and blockchain op issues.

### Acceptance Criteria

- All error logs include entity context (IDs)
- Consistent field names across all log sites
- Errors are searchable by applicationId, expertId, etc.

---

## Summary: Implementation Order

```
Week 1:
  1. notification_outbox table + migration
  2. Outbox processor cron (5-10s interval)
  3. Replace all fire-and-forget notifications with outbox inserts
  4. Hire outcome idempotency (unique constraint + check)

Week 2:
  5. Blockchain TX confirmation (wait for receipt, store tx_hash)
  6. Expert notification after reward confirmed on-chain
  7. Wallet-less expert handling (blocked status)
  8. Unified notification service

Week 3:
  9. Cron circuit breaker + structured batch results
  10. Blockchain ops exponential backoff
  11. Reward calculation precision (BigInt/decimal)
  12. Transaction isolation levels for critical paths

Week 4:
  13. Statement timeouts
  14. Structured logging across all error paths
  15. Integration testing of full event chains
```

## Verification Checklist

After implementation, these scenarios must work end-to-end:

- [ ] Company hires candidate → all reviewing experts get notification within 10s → rewards queued → rewards confirmed on-chain → experts notified of confirmation
- [ ] Expert application finalized (approved) → expert notified → guild membership created → on-chain membership added → expert sees guild in dashboard
- [ ] Expert application finalized (rejected) → expert notified with reason → appeal window communicated
- [ ] Hire outcome API called twice for same application → second call is no-op
- [ ] Notification DB write fails → outbox retries up to 5 times → failure visible in outbox table
- [ ] Blockchain TX reverts → op status stays 'failed' → retried with backoff → abandoned after max attempts with visible error
- [ ] Cron hits 5 consecutive failures → circuit breaker stops batch → logged at error level
- [ ] Expert without wallet has reward queued → op status 'blocked' → not retried until wallet added
