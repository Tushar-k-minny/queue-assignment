import RabbitMQPublisher from "./rabbitmq.js";

export let publisherInstance = null;

export async function getPublisher() {
    if (!publisherInstance) {
        publisherInstance = new RabbitMQPublisher();
        await publisherInstance.connect();
    }
    return publisherInstance;
}



