import { Connection, Channel, Message, connect } from "amqplib";
import { JobProcessor, JobServiceClient } from "./worker.js";

interface WorkerConfig {
  rabbitmq: {
    url: string;
    queue: string;
    prefetch: number;
  };
  jobService: {
    url: string;
  };
  worker: {
    maxRetries: number;
    retryDelay: number;
  };
}

export const config: WorkerConfig = {
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    queue: process.env.RABBITMQ_QUEUE || "job_queue",
    prefetch: parseInt(process.env.PREFETCH_COUNT || "1"),
  },
  jobService: {
    url: process.env.JOB_SERVICE_URL || "http://localhost:5002",
  },
  worker: {
    maxRetries: parseInt(process.env.MAX_RETRIES || "3"),
    retryDelay: parseInt(process.env.RETRY_DELAY || "5000"),
  },
};

interface JobMessage {
  jobId: string;
  type: string;
  payload: string;
  userId: string;
}

class WorkerService {
  private connection: any;
  private channel: any;
  private jobService: JobServiceClient;
  private isShuttingDown: boolean;

  constructor() {
    this.connection = null;
    this.channel = null;
    this.jobService = new JobServiceClient(config.jobService.url);
    this.isShuttingDown = false;
  }

  async connect(): Promise<void> {
    let retries = 5;
    while (retries) {
      try {
        console.log(`Connecting to RabbitMQ trial: ${retries}  👈`);

        this.connection = await connect(config.rabbitmq.url);
        this.channel = await this.connection.createChannel();

        await this.channel.assertQueue(config.rabbitmq.queue, {
          durable: true,
        });
        await this.channel.prefetch(config.rabbitmq.prefetch);

        console.log(
          `✔️ Connected to RabbitMQ successfully to the queue ${config.rabbitmq.queue} 👈`
        );

        this.connection.on("error", (err: any) => {
          console.log("❌RabbitMQ connection error:", err);
        });

        this.connection.on("close", () => {
          if (!this.isShuttingDown) {
            console.log("⚠️  RabbitMQ connection closed. Reconnecting...");
            setTimeout(() => this.connect(), 5000);
          }
        });

        return;
      } catch (error) {
        retries--;
        console.log(
          `❌ RabbitMQ connection failed, retrying in 3 seconds...`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  async processMessage(msg: Message | null): Promise<void> {
    if (!msg || !this.channel) {
      return;
    }

    const jobData = JSON.parse(msg.content.toString()) as JobMessage;
    const { jobId, type, payload, userId } = jobData;

    console.log(
      "\n✔️Job received from RabbitMQ successfully with jobId:",
      jobId,
      "userId:",
      userId,
      "type:",
      type,
      "payload:",
      payload
    );

    try {
      await this.jobService.updateJobStatus(jobId, userId, "processing");

      const result = JobProcessor.process(type, payload).toString();
      console.log("\n✔️Job completed:", "result:", result);

      await this.jobService.updateJobStatus(jobId, userId, "completed", result);

      this.channel.ack(msg);
      console.log("job Acknowledged for jobId:", jobId);
    } catch (error) {
      console.error(
        `❌Job failed for jobId: ${jobId}`,
        error instanceof Error ? error.message : String(error)
      );

      try {
        await this.jobService.updateJobStatus(
          jobId,
          userId,
          "failed",
          null,
          error instanceof Error ? error.message : String(error)
        );
      } catch (updateError) {
        console.error(
          `❌Job failed for jobId: ${jobId}`,
          updateError instanceof Error
            ? updateError.message
            : String(updateError)
        );
      }

      const retryCount =
        (msg.properties.headers?.["x-retry-count"] as number) || 0;

      if (retryCount < config.worker.maxRetries) {
        const delay = config.worker.retryDelay;
        console.log(
          `Job failed for jobId: ${jobId}, retrying in ${delay}ms (attempt ${
            retryCount + 1
          } of ${config.worker.maxRetries})`
        );

        setTimeout(() => {
          if (this.channel) {
            this.channel.sendToQueue(config.rabbitmq.queue, msg.content, {
              ...msg.properties,
              persistent: true,
              headers: {
                ...msg.properties.headers,
                "x-retry-count": retryCount + 1,
              },
            });
            this.channel.ack(msg);
          }
        }, delay);
      } else {
        console.error(
          `❌ Job ${jobId} failed after ${config.worker.maxRetries} retries`
        );
        this.channel.ack(msg);
      }
    }
  }

  async start(): Promise<void> {
    await this.connect();
    if (this.channel) {
      this.channel.consume(
        config.rabbitmq.queue,
        (msg: Message | null) => this.processMessage(msg),
        { noAck: false }
      );
    }
    console.log("Worker is listening for messages...");
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    process.exit(0);
  }
}

export default WorkerService;
