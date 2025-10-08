import axios from 'axios';
import express, { type Request, type Response, type Router } from 'express';
import prisma from './client.js';
import { createJob, updateJobStatus } from './jobs.services.js';
import authMiddleware, {
  type AuthenticatedRequest,
} from './middlewares/auth.middleware.js';
import serviceAuthMiddleware from './middlewares/inter-service-auth.middleware.js';
import JobLimiter from './middlewares/limiter.middlewares.js';
import { getPublisher } from './publisher.js';
import { createJobSchema, updateJobSchema } from './types.js';

// User service URL for validation
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || 'http://user-service:5001';

// Validate user exists by calling user-service
async function validateUser(userId: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `${USER_SERVICE_URL}/auth/validate-user/${userId}`,
      {
        timeout: 5000,
      },
    );

    return response.data.valid === true;
  } catch (error) {
    console.error(`Failed to validate user ${userId}:`, error);
    return false;
  }
}

export const JobRouter: Router = express.Router();

JobRouter.get(
  '/',
  authMiddleware,
  JobLimiter.queryJobLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const jobs = await prisma.jobs.findMany({
        where: {
          userId,
        },
      });

      res.status(200).json(jobs);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ error: err.message });
    }
  },
);

JobRouter.post(
  '/',
  authMiddleware,
  JobLimiter.createJobLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { type, payload } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const createJobPayload = {
        type,
        payload,
        userId,
      };

      const isValidData = createJobSchema.safeParse(createJobPayload);
      if (!isValidData.success) {
        res.status(400).json({ error: 'Invalid job data' });
        return;
      }

      // Validate that the user actually exists
      const userExists = await validateUser(userId);
      if (!userExists) {
        res.status(403).json({ error: 'Invalid user - user does not exist' });
        return;
      }

      const newJob = await createJob(userId, type, payload);

      const publisher = await getPublisher();
      await publisher.publishJob(newJob.id, userId, type, payload);

      res.status(201).json({
        jobId: newJob.id,
        userId: newJob.userId,
        status: newJob.status,
        type: newJob.type,
        created_at: newJob.createdAt,
      });
    } catch (error) {
      const err = error as Error;
      res
        .status(400)
        .json({ error: 'Error creating job', details: err.message });
    }
  },
);

JobRouter.get(
  '/:jobId',
  authMiddleware,
  JobLimiter.queryJobLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!jobId) {
        res.status(400).json({ error: 'Invalid job ID' });
        return;
      }

      const job = await prisma.jobs.findFirst({
        where: {
          id: jobId,
          userId, // Ensure the job belongs to the authenticated user
        },
      });

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
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
  },
);

// Route for users to update their own job status (requires authentication)
// JobRouter.put(
//   "/:jobId/status",
//   authMiddleware,
//   async (req: AuthenticatedRequest, res: Response) => {
//     try {
//       const { jobId } = req.params;
//       const userId = req.user?.userId;
//       const { status, result, error } = req.body;

//       if (!userId) {
//         res.status(401).json({ error: "Unauthorized" });
//         return;
//       }

//       // Verify that the job belongs to the authenticated user
//       const existingJob = await prisma.jobs.findFirst({
//         where: {
//           id: jobId,
//           userId,
//         },
//       });

//       if (!existingJob) {
//         res.status(404).json({ error: "Job not found" });
//         return;
//       }

//       const updatedJob = await updateJobStatus(
//         jobId,
//         userId,
//         status,
//         result,
//         error
//       );

//       res.status(201).json({
//         id: updatedJob.id,
//         type: updatedJob.type,
//         status: updatedJob.status,
//         result: updatedJob.result,
//         error: updatedJob.error,
//         created_at: updatedJob.createdAt,
//         updated_at: updatedJob.updatedAt,
//       });
//     } catch (error) {
//       const err = error as Error;
//       res.status(400).json({ error: err.message });
//     }
//   }
// );

JobRouter.put(
  '/internal/:jobId/status',
  serviceAuthMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { status, result, error, userId } = req.body;

      const updatePaylod = {
        jobId,
        userId,
        status,
        result,
        error,
      };

      const isValidData = updateJobSchema.safeParse(updatePaylod);

      if (!isValidData.success) {
        console.error('Invalid payload', isValidData.error.message);
        res.status(400).json({ error: 'Invalid payload' });
      }

      const updatedJob = await updateJobStatus(
        jobId,
        userId,
        status,
        result,
        error,
      );

      res.status(201).json({
        id: updatedJob.id,
        type: updatedJob.type,
        status: updatedJob.status,
        result: updatedJob.result,
        error: updatedJob.error,
        created_at: updatedJob.createdAt,
        updated_at: updatedJob.updatedAt,
      });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message });
    }
  },
);
