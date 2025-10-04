import amqp from "amqplib";


class RabbitMQPublisher {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.queue = process.env.RABBITMQ_QUEUE || "job_queue";
        this.url = process.env.RABBITMQ_URL || "amqp://localhost";//update this
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) return
        try {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();


            await this.channel.assertQueue(this.queue, { durable: true });

            this.isConnected = true
            console.log("Connected to RabbitMQ successfully 👈")

            this.connection.on("error", (err) => {
                console.log("❌RabbitMQ connection error:", err);
                this.isConnected = false
            })

            this.connection.on("close", () => {
                console.log("▶️RabbitMQ connection closed");
                this.isConnected = false
            })
        } catch (error) {
            console.error("Error connecting to RabbitMQ:", error);
            throw error;
        }
    }

    async publishJob(jobId,userId, type, payload) {
        try {
            const message = JSON.stringify({ jobId, userId, type, payload, timestamp: new Date().toISOString() });

            const sent = this.channel.sendToQueue(
                this.queue,
                Buffer.from(message), {
                persistence: true
            });

            if (sent) {
                console.log(jobId, "✔️Job sent to RabbitMQ successfully")
                return true
            }
            else {
                console.error(jobId, "❌Job not sent to RabbitMQ")
                return false
            }



        } catch (error) {
            console.error("❌Error sending job to RabbitMQ:", error);
            throw error;
        }
    }


    async close() {
        try {
            if (this.channel) await this.channel.close()
            if (this.connection) await this.connection.close()
            console.log("RabbitMQ connection closed successfully👈")
        } catch (error) {
            console.error("❌Error closing RabbitMQ connection:", error);
            throw error;
        }
    }
}

export default RabbitMQPublisher