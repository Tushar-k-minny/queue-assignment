import { Channel, Connection } from 'amqplib';
import RabbitMQPublisher from "./rabbitmq.js";

export let publisherInstance: RabbitMQPublisher | null = null;

export async function getPublisher(): Promise<RabbitMQPublisher> {
    if (!publisherInstance) {
        publisherInstance = new RabbitMQPublisher();
        await publisherInstance.connect();
    }
    return publisherInstance;
}