import { type Channel, type ChannelModel, connect } from 'amqplib';

interface JobMessage {
  jobId: string;
  userId?: string;
  type: string;
  payload: unknown;
  timestamp: string;
}

class RabbitMQPublisher {
  private connection: ChannelModel | null;
  private channel: Channel | null;
  private queue: string;
  private dlqQueue: string;
  private url: string;
  private isConnected: boolean;

  constructor() {
    this.connection = null;
    this.channel = null;
    this.queue = process.env.RABBITMQ_QUEUE || 'job_queue';
    this.dlqQueue = process.env.RABBITMQ_DLQ_QUEUE || 'job_queue_dlq';
    this.url = process.env.RABBITMQ_URL || 'amqp://localhost';
    this.isConnected = false;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    try {
      this.connection = await connect(this.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue(this.dlqQueue, { 
        durable: true 
      });

      await this.channel.assertQueue(this.queue, { 
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': this.dlqQueue,
        },
      });

      this.isConnected = true;
      console.log('Connected to RabbitMQ successfully 👈');

      this.connection.on('error', (err: unknown) => {
        console.log('❌ RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.log('▶️ RabbitMQ connection closed');
        this.isConnected = false;
      });
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error);
      throw error;
    }
  }

  async publishJob(
    jobId: string,
    userId: string | undefined,
    type: string,
    payload: unknown,
  ): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const message: JobMessage = {
        jobId,
        userId,
        type,
        payload,
        timestamp: new Date().toISOString(),
      };

      const sent = this.channel.sendToQueue(
        this.queue,
        Buffer.from(JSON.stringify(message)),
        { 
          persistent: true,
          headers: {
            'x-retry-count': 0,
          },
        },
      );

      if (sent) {
        console.log(jobId, '✔️ Job sent to RabbitMQ successfully');
        return true;
      } else {
        console.error(jobId, '❌ Job not sent to RabbitMQ');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending job to RabbitMQ:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.isConnected = false;
      console.log('RabbitMQ connection closed successfully 👈');
    } catch (error) {
      console.error('❌ Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}

export default RabbitMQPublisher;