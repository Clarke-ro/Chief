import type { DefaultJobOptions } from 'bullmq';

/**
 * Shared BullMQ defaults — retries + backoff for sync/AI pipelines.
 * Processors are stubs until sync ships; jobs still land safely in Redis.
 */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2_000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 1_000,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7,
    count: 5_000,
  },
};
