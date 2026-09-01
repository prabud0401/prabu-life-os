import { authenticateOutlook } from "@prabu-life-os/core";

async function main(): Promise<void> {
  process.stderr.write("Starting Outlook authentication (Device Code Flow)...\n");
  await authenticateOutlook();
}

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    process.stderr.write(`Authentication failed: ${err.message}\n`);
    process.exit(1);
  });
