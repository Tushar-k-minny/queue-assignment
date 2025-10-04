import express from "express"
import prisma from "./client.js"
import { createJob, updateJobStatus } from "./jobs.services.js"

import { getPublisher } from "./publisher.js"

const router = express.Router()

router.get("/", async (req, res) => {
    try {

        const { userId } = req.body || {}

        if (!userId) {
            throw new Error("Invalid UserId")
        }

        const jobs = await prisma.jobs.findMany({
            where: {
                userId
            }
        })

        if (!jobs) {
            throw new Error("Jobs not found")
        }

        res.status(200).json(jobs)

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
})

router.post("/", async (req, res) => {
    try {
        const { type, userId, payload } = req.body || {}

        if (!type || !userId || !payload) {
            throw new Error("Invalid payload request")
        }

        const newJob = await createJob(userId, type, payload)

        console.log(newJob, "this is the new job")

        const publisher = await getPublisher()
        await publisher.publishJob(newJob.id, userId, type, payload)
        res.status(201).json({
            jobId: newJob.id,
            userId: newJob.userId,
            status: newJob.status,
            type: newJob.type,
            created_at: newJob.createdAt,
        });
    }
    catch (error) {
        res.status(400).json({ error: `Error creating job`, details: error.message });
    }
})


router.get("/:jobId", async (req, res) => {
    try {
        const { jobId } = req.params


        if (!jobId) {
            throw new Error("Invalid payload request")
        }

        const job = await prisma.jobs.findUnique({
            where: {
                id: jobId,
            }
        })

        if (!job) {
            throw new Error("Job not found")
        }

        res.json({
            id: job.id,
            type: job.type,
            status: job.status,
            result: job.result,
            error: job.error,
            created_at: job.createdAt,
            updated_at: job.updatedAt,
        });

    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
}
)

router.put("/:jobId/status", async (req, res) => {
    try {
        const { jobId } = req.params

        const { status, result, error, userId } = req.body || {}

        const updatedJob = await updateJobStatus(jobId, userId, status, result, error)

        res.status(201).json({
            id: updatedJob.id,
            type: updatedJob.type,
            status: updatedJob.status,
            result: updatedJob.result,
            error: updatedJob.error,
            created_at: updatedJob.createdAt,
            updated_at: updatedJob.updatedAt
        })

    } catch (error) {

        res.status(400).json({ error: error.message });
    }
})
export default router