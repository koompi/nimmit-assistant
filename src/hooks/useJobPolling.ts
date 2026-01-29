import { useEffect, useRef, useCallback, useState } from "react";

interface Job {
  _id: string;
  status: string;
  [key: string]: unknown;
}

interface UseJobPollingOptions {
  jobId: string;
  initialJob?: Job | null;
  enabled?: boolean;
  interval?: number;
  onUpdate?: (job: Job) => void;
}

interface UseJobPollingResult {
  job: Job | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const FINAL_STATUSES = ["completed", "cancelled"];

export function useJobPolling({
  jobId,
  initialJob = null,
  enabled = true,
  interval = 5000,
  onUpdate,
}: UseJobPollingOptions): UseJobPollingResult {
  const [job, setJob] = useState<Job | null>(initialJob);
  const [isLoading, setIsLoading] = useState(!initialJob);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const failedAttempts = useRef(0);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        const newJob = data.data as Job;
        setJob(newJob);
        setError(null);
        failedAttempts.current = 0;

        if (onUpdate) {
          onUpdate(newJob);
        }
      }
    } catch (err) {
      failedAttempts.current++;
      const message = err instanceof Error ? err.message : "Failed to fetch job";
      setError(message);

      // Stop polling after 5 consecutive failures
      if (failedAttempts.current >= 5) {
        console.warn(`[useJobPolling] Stopping polling after ${failedAttempts.current} failures`);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [jobId, onUpdate]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    // Initial fetch
    if (enabled && jobId && !initialJob) {
      fetchJob();
    }
  }, [enabled, jobId, fetchJob, initialJob]);

  useEffect(() => {
    // Don't poll if disabled or no jobId
    if (!enabled || !jobId) return;

    // Don't poll if job is in final status
    if (job && FINAL_STATUSES.includes(job.status)) {
      return;
    }

    // Start polling
    intervalRef.current = setInterval(fetchJob, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, jobId, interval, job?.status, fetchJob]);

  // Update job when initialJob changes (for parent component updates)
  useEffect(() => {
    if (initialJob) {
      setJob(initialJob);
    }
  }, [initialJob]);

  return {
    job,
    isLoading,
    error,
    refetch,
  };
}
