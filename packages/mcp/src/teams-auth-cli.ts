import { runDeviceCodeAuth } from "@prabu-life-os/shared";
import { initTeamsConfig, getTeamsAuthConfig } from "@prabu-life-os/core";

async function main(): Promise<void> {
  process.stderr.write("Starting Teams authentication (Device Code Flow)...\n");
  await initTeamsConfig();
  await runDeviceCodeAuth(getTeamsAuthConfig());
}

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    process.stderr.write(`Authentication failed: ${err.message}\n`);
    process.exit(1);
  });
