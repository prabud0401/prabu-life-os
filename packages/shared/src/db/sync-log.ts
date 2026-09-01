import { getPool, isDatabaseConfigured } from "./pool";

export async function logSyncJob(
  jobName: string,
  status: "success" | "error",
  message?: string,
  rowsAffected?: number
): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  await getPool().query(
    `INSERT INTO sync_log (job_name, status, message, rows_affected)
     VALUES ($1, $2, $3, $4)`,
    [jobName, status, message ?? null, rowsAffected ?? null]
  );
}
