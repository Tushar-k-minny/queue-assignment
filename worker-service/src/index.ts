import WorkerService from "./worker.services.js";

const workerInstance = new WorkerService();

process.on("SIGINT", () => {
    workerInstance.shutdown();
});

process.on("SIGTERM", () => {
    workerInstance.shutdown();
});

workerInstance.start().catch((err) => {
    console.error("❌Error starting worker:", err instanceof Error ? err.message : String(err));
    process.exit(1);
});