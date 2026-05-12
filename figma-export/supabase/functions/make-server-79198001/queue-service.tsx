import * as kv from './kv_store.tsx';

/**
 * Queue Service
 * Simple job queue for distribution, file processing, and background tasks
 */

export type JobType = 
  | 'distribution' 
  | 'file_processing' 
  | 'report_ingestion'
  | 'fraud_analysis'
  | 'payment_processing'
  | 'email_notification';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Job {
  id: string;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  scheduledFor?: string; // For delayed jobs
  workerId?: string;
}

export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  jobsByType: Record<JobType, number>;
}

// Job queue counter
let jobCounter = 0;

// Initialize counter
async function initializeCounter() {
  const count = await kv.get('counter:jobs') || 0;
  jobCounter = typeof count === 'number' ? count : 0;
}

await initializeCounter();

// Enqueue a new job
export async function enqueueJob(
  type: JobType,
  payload: any,
  options?: {
    priority?: JobPriority;
    maxRetries?: number;
    scheduledFor?: string;
  }
): Promise<Job> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  jobCounter++;
  await kv.set('counter:jobs', jobCounter);

  const job: Job = {
    id,
    type,
    priority: options?.priority || 'normal',
    status: 'pending',
    payload,
    retryCount: 0,
    maxRetries: options?.maxRetries ?? 3,
    createdAt: now,
    scheduledFor: options?.scheduledFor,
  };

  await kv.set(`job:${id}`, job);
  await kv.set(`queue:${type}:${job.priority}:${id}`, true);
  await kv.set(`job:status:pending:${id}`, true);

  return job;
}

// Dequeue next job for processing
export async function dequeueJob(
  type: JobType,
  workerId: string
): Promise<Job | null> {
  const now = new Date();

  // Try urgent first, then high, normal, low
  const priorities: JobPriority[] = ['urgent', 'high', 'normal', 'low'];

  for (const priority of priorities) {
    const queueKeys = await kv.getByPrefix(`queue:${type}:${priority}:`);
    
    for (const key of queueKeys) {
      const jobId = key.key.split(':').pop();
      if (!jobId) continue;

      const job = await kv.get<Job>(`job:${jobId}`);
      if (!job || job.status !== 'pending') continue;

      // Check if scheduled job is ready
      if (job.scheduledFor) {
        const scheduledTime = new Date(job.scheduledFor);
        if (scheduledTime > now) continue;
      }

      // Claim the job
      job.status = 'processing';
      job.startedAt = now.toISOString();
      job.workerId = workerId;

      await kv.set(`job:${jobId}`, job);
      await kv.del(`job:status:pending:${jobId}`);
      await kv.set(`job:status:processing:${jobId}`, true);

      return job;
    }
  }

  return null;
}

// Mark job as completed
export async function completeJob(
  jobId: string,
  result?: any
): Promise<Job | null> {
  const job = await kv.get<Job>(`job:${jobId}`);
  if (!job) return null;

  const now = new Date().toISOString();
  job.status = 'completed';
  job.completedAt = now;
  job.result = result;

  await kv.set(`job:${jobId}`, job);
  await kv.del(`job:status:processing:${jobId}`);
  await kv.set(`job:status:completed:${jobId}`, true);

  // Remove from queue
  await kv.del(`queue:${job.type}:${job.priority}:${jobId}`);

  return job;
}

// Mark job as failed
export async function failJob(
  jobId: string,
  error: string
): Promise<Job | null> {
  const job = await kv.get<Job>(`job:${jobId}`);
  if (!job) return null;

  const now = new Date().toISOString();
  job.error = error;
  job.failedAt = now;

  // Retry if retries available
  if (job.retryCount < job.maxRetries) {
    job.retryCount++;
    job.status = 'pending';
    job.startedAt = undefined;
    job.workerId = undefined;

    await kv.set(`job:${jobId}`, job);
    await kv.del(`job:status:processing:${jobId}`);
    await kv.set(`job:status:pending:${jobId}`, true);

    console.log(`Job ${jobId} failed, retrying (${job.retryCount}/${job.maxRetries})`);
  } else {
    job.status = 'failed';

    await kv.set(`job:${jobId}`, job);
    await kv.del(`job:status:processing:${jobId}`);
    await kv.set(`job:status:failed:${jobId}`, true);

    // Remove from queue
    await kv.del(`queue:${job.type}:${job.priority}:${jobId}`);

    console.error(`Job ${jobId} failed permanently after ${job.retryCount} retries: ${error}`);
  }

  return job;
}

// Cancel job
export async function cancelJob(jobId: string): Promise<Job | null> {
  const job = await kv.get<Job>(`job:${jobId}`);
  if (!job) return null;

  if (job.status === 'completed') {
    return job; // Already completed
  }

  job.status = 'cancelled';

  await kv.set(`job:${jobId}`, job);
  await kv.del(`job:status:pending:${jobId}`);
  await kv.del(`job:status:processing:${jobId}`);
  await kv.set(`job:status:cancelled:${jobId}`, true);

  // Remove from queue
  await kv.del(`queue:${job.type}:${job.priority}:${jobId}`);

  return job;
}

// Get job by ID
export async function getJob(jobId: string): Promise<Job | null> {
  return await kv.get<Job>(`job:${jobId}`);
}

// Get jobs by status
export async function getJobsByStatus(
  status: JobStatus,
  limit: number = 50
): Promise<Job[]> {
  const keys = await kv.getByPrefix(`job:status:${status}:`);
  const jobs: Job[] = [];

  for (const key of keys.slice(0, limit)) {
    const jobId = key.key.split(':').pop();
    if (jobId) {
      const job = await kv.get<Job>(`job:${jobId}`);
      if (job) {
        jobs.push(job);
      }
    }
  }

  return jobs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get queue statistics
export async function getQueueStats(): Promise<QueueStats> {
  const pending = await getJobsByStatus('pending', 1000);
  const processing = await getJobsByStatus('processing', 1000);
  const completed = await getJobsByStatus('completed', 1000);
  const failed = await getJobsByStatus('failed', 1000);

  const allJobs = [...pending, ...processing, ...completed, ...failed];

  const jobsByType: Record<JobType, number> = {
    distribution: 0,
    file_processing: 0,
    report_ingestion: 0,
    fraud_analysis: 0,
    payment_processing: 0,
    email_notification: 0,
  };

  for (const job of allJobs) {
    jobsByType[job.type]++;
  }

  return {
    totalJobs: allJobs.length,
    pendingJobs: pending.length,
    processingJobs: processing.length,
    completedJobs: completed.length,
    failedJobs: failed.length,
    jobsByType,
  };
}

// Process job (generic processor)
export async function processJob(job: Job): Promise<any> {
  console.log(`Processing job ${job.id} of type ${job.type}`);

  try {
    let result: any;

    switch (job.type) {
      case 'distribution':
        result = await processDistributionJob(job.payload);
        break;
      case 'file_processing':
        result = await processFileProcessingJob(job.payload);
        break;
      case 'report_ingestion':
        result = await processReportIngestionJob(job.payload);
        break;
      case 'fraud_analysis':
        result = await processFraudAnalysisJob(job.payload);
        break;
      case 'payment_processing':
        result = await processPaymentJob(job.payload);
        break;
      case 'email_notification':
        result = await processEmailJob(job.payload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await completeJob(job.id, result);
    return result;
  } catch (error) {
    await failJob(job.id, error.message);
    throw error;
  }
}

// Job processors (placeholders - would be implemented with actual logic)
async function processDistributionJob(payload: any): Promise<any> {
  console.log('Processing distribution job:', payload);
  // Would call distribution service
  return { success: true, deliveryIds: [] };
}

async function processFileProcessingJob(payload: any): Promise<any> {
  console.log('Processing file processing job:', payload);
  // Would process audio files, generate previews, etc.
  return { success: true, processedFiles: [] };
}

async function processReportIngestionJob(payload: any): Promise<any> {
  console.log('Processing report ingestion job:', payload);
  // Would ingest and process streaming reports
  return { success: true, reportsProcessed: 0 };
}

async function processFraudAnalysisJob(payload: any): Promise<any> {
  console.log('Processing fraud analysis job:', payload);
  // Would run fraud detection algorithms
  return { success: true, alertsGenerated: 0 };
}

async function processPaymentJob(payload: any): Promise<any> {
  console.log('Processing payment job:', payload);
  // Would process payment via payment gateway
  return { success: true, paymentId: '' };
}

async function processEmailJob(payload: any): Promise<any> {
  console.log('Processing email job:', payload);
  // Would send email notifications
  return { success: true, sent: true };
}

// Worker function - continuously processes jobs
export async function startWorker(
  workerId: string,
  types: JobType[],
  pollingInterval: number = 5000
): Promise<void> {
  console.log(`Worker ${workerId} started, processing types:`, types);

  while (true) {
    try {
      for (const type of types) {
        const job = await dequeueJob(type, workerId);
        
        if (job) {
          console.log(`Worker ${workerId} picked up job ${job.id}`);
          await processJob(job);
        }
      }
    } catch (error) {
      console.error(`Worker ${workerId} error:`, error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollingInterval));
  }
}
