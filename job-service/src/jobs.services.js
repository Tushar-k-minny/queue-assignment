import { $Enums } from "@prisma/client";
import prisma from "./client.js";



const JOBTYPES = Object.keys($Enums.JobType);
const STATUS = Object.keys($Enums.Status)
async function createJob(userId, type, payload) {
    try {

        if (!JOBTYPES.includes(type)) {
            throw new Error("Invalid job type")
        }

        return await prisma.jobs.create({
            data: {
                userId,
                type,
                payload
            }
        })


    } catch (error) {
        throw new Error(error);
    }
}

async function updateJobStatus(jobId, userId, status, result = null, error = null) {
    try {
        console.log("JobId:", jobId, "UserId:", userId, "Status:", status, "Result:", result, "Error:", error)
        if (!jobId || !userId || !status) {
            throw new Error("Invalid paylod")
        }
        if (!STATUS.includes(status)) {
            throw new Error("Invalid Status")
        }


        const job = await prisma.jobs.findUnique({
            where: {
                id: jobId,
                userId
            }
        })

        if (!job) {
            throw new Error("Job does not exist")
        }

        const updatedJob = await prisma.jobs.update({
            where: {
                id: jobId,
                userId: userId
            },
            data: {
                status,
                result,
                error
            }

        })
        return updatedJob


    } catch (error) {
        console.log("Error while updating status", error)
        throw new Error("Could not update job status")
    }
}


export { createJob, updateJobStatus };

