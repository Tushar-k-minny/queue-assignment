import type { $Enums } from '@prisma/client';
import prisma from './client.js';
import { JOBTYPES } from './constants.js';
import type { Job } from './types.js';

export async function createJob(
  userId: string,
  type: string,
  payload: string,
): Promise<Job> {
  try {
    if (!JOBTYPES.includes(type)) {
      throw new Error('Invalid job type');
    }

    return (await prisma.jobs.create({
      data: {
        userId,
        type,
        payload,
      },
    })) as unknown as Job;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to create job');
  }
}

export async function updateJobStatus(
  jobId: string,
  userId: string,
  status: $Enums.Status,
  result: string | null = null,
  error: string | null = null,
): Promise<Job> {
  try {
    const job = await prisma.jobs.findUnique({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Job does not exist');
    }

    const updatedJob = (await prisma.jobs.update({
      where: {
        id: jobId,
        userId,
      },
      data: {
        status,
        result,
        error,
      },
    })) as unknown as Job;

    return updatedJob;
  } catch (error) {
    console.log('Error while updating status', error);
    throw new Error('Could not update job status');
  }
}
