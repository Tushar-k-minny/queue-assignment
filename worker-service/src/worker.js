
import axios from "axios";



export class JobProcessor {
    static reverseString(str) {

        if (typeof str !== 'string') {
            throw new Error('Paylod must be a string')
        }
        return str.split("").reverse().join("");
    }

    static uppercase(str) {
        if (typeof str !== 'string') {
            throw new Error('Paylod must be a string')
        }
        return str.toUpperCase();
    }

    static capitalise(str) {
        if (typeof str !== 'string') {
            throw new Error('Paylod must be a string')
        }
        return str
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    static fibonacci(str) {
        const n = parseInt(str);
        if (isNaN(n)) {
            throw new Error('Paylod must be a number')
        }
        if (n <= 0) {
            throw new Error('Paylod must be greater than 0');
        };
        if (n === 1) return 1;


        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
            let c = a + b;
            a = b;
            b = c;
        }
        return b;
    }


    static process(type, payload) {
        const processorsMap = {
            "reverse_string": JobProcessor.reverseString,
            "uppercase_text": JobProcessor.uppercase,
            "fibbonaci_cal": JobProcessor.fibonacci,
            "capitalise_text": JobProcessor.uppercase,
        }
        const processor = processorsMap[type];
        if (!processor) {
            throw new Error("Invalid job type");
        }
        return processor(payload);
    }

}


export class JobServiceClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
        });
    }
    async updateJobStatus(jobId,userId, status, result = null, error = null) {
        try {
            console.log("")
            const response = await this.client.put(`/jobs/${jobId}/status`, {
                status,
                result,
                error,
                userId
            });
            console.log(`✔️ Updated job ${jobId} status to ${status}`);
            return response.data;
        } catch (err) {
            console.error(`❌ Failed to update job ${jobId}:`, err.message);
            throw err;
        }
    }

    async getJob(jobId) {
        try {
            const response = await this.client.get(`/jobs/${jobId}`);
            return response.data;
        } catch (err) {
            console.error(`❌ Failed to fetch job ${jobId}:`, err.message);
            return null;
        }
    }
}
