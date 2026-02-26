import { emailSenderWorker } from "./email-sender";
import { warmupSchedulerWorker, initWarmupScheduler } from "./warmup-scheduler";
import { campaignProcessorWorker } from "./campaign-processor";

const workers = [emailSenderWorker, warmupSchedulerWorker, campaignProcessorWorker];

async function main() {
  console.log("[workers] Starting all workers...");

  await initWarmupScheduler();

  console.log("[workers] Email sender worker: running");
  console.log("[workers] Warmup scheduler worker: running");
  console.log("[workers] Campaign processor worker: running");
  console.log("[workers] All workers started successfully");
}

async function shutdown() {
  console.log("[workers] Shutting down gracefully...");

  await Promise.allSettled(workers.map((w) => w.close()));

  console.log("[workers] All workers stopped");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main().catch((err) => {
  console.error("[workers] Fatal error:", err);
  process.exit(1);
});
