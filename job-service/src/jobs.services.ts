import { $Enums, Prisma } from "@prisma/client";
import prisma from "./client.js";
import { Job } from "./types.js";

const JOBTYPES = Object.keys($Enums.JobType);
const STATUS = Object.keys($Enums.Status);

export async function createJob(
  userId: string,
  type: string,
  payload: string
): Promise<Job> {
  try {
    if (!JOBTYPES.includes(type)) {
      throw new Error("Invalid job type");
    }

    return (await prisma.jobs.create({
      data: {
        userId,
        type,
        payload,
      },
    })) as unknown as Job;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to create job");
  }
}

export async function updateJobStatus(
  jobId: string,
  userId: string,
  status: $Enums.Status,
  result: string | null = null,
  error: string | null = null
): Promise<Job> {
  try {
    console.log(
      "JobId:",
      jobId,
      "UserId:",
      userId,
      "Status:",
      status,
      "Result:",
      result,
      "Error:",
      error
    );

    if (!jobId || !userId || !status) {
      throw new Error("Invalid payload");
    }

    if (!STATUS.includes(status)) {
      throw new Error("Invalid Status");
    }

    const job = await prisma.jobs.findUnique({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error("Job does not exist");
    }

    const updatedJob = (await prisma.jobs.update({
      where: {
        id: jobId,
        userId: userId,
      },
      data: {
        status,
        result,
        error,
      },
    })) as unknown as Job;

    return updatedJob;
  } catch (error) {
    console.log("Error while updating status", error);
    throw new Error("Could not update job status");
  }
}
