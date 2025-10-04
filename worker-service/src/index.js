import WorkerService from "./worker.services.js";

const workerInstance = new WorkerService();

process.on("SIGINT", async () => {
    workerInstance.shutdown();
})

process.on("SIGTERM", async () => {
    workerInstance.shutdown();
})


workerInstance.start().catch((err) => {
    console.error("❌Error starting worker:", err);
    process.exit(1);
})
