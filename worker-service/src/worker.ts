import axios, { AxiosInstance } from "axios";
import { Job } from "./types.js";

type ProcessorFunction = (input: string) => string | number;

interface ProcessorsMap {
  [key: string]: ProcessorFunction;
}

export class JobProcessor {
  static reverseString(str: string): string {
    if (typeof str !== "string") {
      throw new Error("Payload must be a string");
    }
    return str.split("").reverse().join("");
  }

  static uppercase(str: string): string {
    if (typeof str !== "string") {
      throw new Error("Payload must be a string");
    }
    return str.toUpperCase();
  }

  static capitalise(str: string): string {
    if (typeof str !== "string") {
      throw new Error("Payload must be a string");
    }
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  static fibonacci(str: string): number {
    const n = parseInt(str);
    if (isNaN(n)) {
      throw new Error("Payload must be a number");
    }
    if (n <= 0) {
      throw new Error("Payload must be greater than 0");
    }
    if (n === 1) return 1;

    let a = 0,
      b = 1;
    for (let i = 2; i <= n; i++) {
      const c = a + b;
      a = b;
      b = c;
    }
    return b;
  }

  static process(type: string, payload: string): string | number {
    const processorsMap: ProcessorsMap = {
      reverse_string: JobProcessor.reverseString,
      uppercase_text: JobProcessor.uppercase,
      fibbonaci_cal: JobProcessor.fibonacci,
      capitalise_text: JobProcessor.uppercase,
    };

    const processor = processorsMap[type];
    if (!processor) {
      throw new Error("Invalid job type");
    }
    return processor(payload);
  }
}

export class JobServiceClient {
  private baseUrl: string;
  private client: AxiosInstance;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  async updateJobStatus(
    jobId: string,
    userId: string,
    status: Job["status"],
    result: string | null = null,
    error: string | null = null
  ): Promise<Job> {
    try {
      const response = await this.client.put(`/jobs/internal/${jobId}/status`, {
        status,
        result,
        error,
        userId,
      });
      console.log(`✔️ Updated job ${jobId} status to ${status}`);
      return response.data;
    } catch (err) {
      console.error(
        `❌ Failed to update job ${jobId}:`,
        err instanceof Error ? err.message : String(err)
      );
      throw err;
    }
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      const response = await this.client.get<Job>(`/jobs/${jobId}`);
      return response.data;
    } catch (err) {
      console.error(
        `❌ Failed to fetch job ${jobId}:`,
        err instanceof Error ? err.message : String(err)
      );
      return null;
    }
  }
}
