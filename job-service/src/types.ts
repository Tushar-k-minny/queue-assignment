import type { Request } from 'express';
import z from 'zod';
import { JOBTYPES, STATUS } from './constants.js';

export type Status = 'QUEUED' | 'INPROGRESS' | 'COMPLETED' | 'FAILED';
export type JobType =
  | 'reverse_string'
  | 'uppercase_text'
  | 'capitalise_text'
  | 'fibbonaci_cal';

export interface Job {
  id: string;
  type: string;
  payload: string;
  status: Status;
  userId: string;
  result?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobDTO {
  title: string;
  description: string;
}

export interface ErrorResponse {
  message: string;
  stack?: string;
}

export interface TypedRequest<T> extends Request {
  body: T;
}



export const createJobSchema = z.object({
  userId:z.string(),
  payload:z.string(),
  type:z.enum(JOBTYPES)
})


export const updateJobSchema = z.object({
  status: z.enum(STATUS),
  result: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  userId: z.string(),
  jobId: z.string(),
})
