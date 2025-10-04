import amqp from "amqplib";
import { JobProcessor, JobServiceClient } from "./worker.js";


export const config = {
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost',
        queue: process.env.RABBITMQ_QUEUE || 'job_queue',
        prefetch: parseInt(process.env.PREFETCH_COUNT) || 1,
    },
    jobService: {
        url: process.env.JOB_SERVICE_URL || 'http://localhost:5002',
    },
    worker: {
        maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
        retryDelay: parseInt(process.env.RETRY_DELAY) || 5000,
    }
};
class WorkerService {
    constructor() {
        this.connection = null,
            this.channel = null;
        this.jobService = new JobServiceClient(config.jobService.url);
        this.isShuttingDown = false;
    }

    async connect() {
        let retries = 5
        while (retries) {
            try {
                console.log(`Connecting to RabbitMQ trial: ${retries}  👈`)

                this.connection = await amqp.connect(config.rabbitmq.url);
                this.channel = await this.connection.createChannel();


                await this.channel.assertQueue(config.rabbitmq.queue, { durable: true });

                await this.channel.prefetch(config.rabbitmq.prefetch);//to fetch one message at a time

                console.log(`✔️ Connected to RabbitMQ successfully to the queue ${config.rabbitmq.queue} 👈`);


                this.connection.on("error", (err) => {
                    console.log("❌RabbitMQ connection error:", err);
                })

                this.connection.on('close', () => {
                    if (!this.isShuttingDown) {
                        console.log('⚠️  RabbitMQ connection closed. Reconnecting...');
                        setTimeout(() => this.connect(), 5000);
                    }
                });

                return;

            } catch (error) {
                retries--;
                console.log(`❌ RabbitMQ connection failed, retrying in 3 seconds...`, error);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }

    async processMessage(msg) {
        if (!msg) {
            return
        }

        const jobData = JSON.parse(msg.content.toString());
        const { jobId, type, payload, userId } = jobData;

        console.log("\n✔️Job received from RabbitMQ successfully with jobId:", jobId, "userId:", userId, "type:", type, "payload:", payload);
        try {
            await this.jobService.updateJobStatus(jobId, userId, "INPROGRESS");


            const result = JobProcessor.process(type, payload);
            console.log("\n✔️Job completed:", "result:", result);

            const status = "COMPLETED";
            await this.jobService.updateJobStatus(jobId, userId, status, result);

            this.channel.ack(msg);
            console.log("job Acknowledged for jobId:", jobId);




        } catch (error) {

            console.error(`❌Job failed for jobId: ${jobId}`, error.message);

            try {

                const status = "FAILED";
                await this.jobService.updateJobStatus(jobId, userId, status, null, error.message);

            }
            catch (updateError) {
                console.error(`❌Job failed for jobId: ${jobId}`, updateError.message);
            }

            const retryCount = msg.properties.headers["x-retry-count"] || 0;

            if (retryCount < config.worker.maxRetries) {
                const delay = config.worker.retryDelay;
                console.log(`Job failed for jobId: ${jobId}, retrying in ${delay}ms (attempt ${retryCount + 1} of ${config.worker.maxRetries})`);
                setTimeout(() => {
                    this.channel.sendToQueue(
                        config.rabbitmq.queue,
                        msg.content,
                        {
                            ...msg.properties,
                            persistent: true,
                            headers: {
                                ...msg.properties.headers,
                                "x-retry-count": retryCount + 1
                            }
                        });
                    this.channel.ack(msg);
                }, delay);
            }
            else {
                console.error(`❌ Job ${jobId} failed after ${config.worker.maxRetries} retries`);
                this.channel.ack(msg);
            }

        }
    }


    async start() {
        await this.connect();
        this.channel.consume(
            config.rabbitmq.queue,
            (msg) => this.processMessage(msg),
            { noAck: false }
        );

        console.log("Worker is listening for messages...");
    }

    async shutdown() {
        this.isShuttingDown = true;
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
        process.exit(0);
    }
}

export default WorkerService