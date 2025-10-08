import type { Request } from 'express';

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
