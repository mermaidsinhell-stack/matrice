import { create } from 'zustand';

const COMPLETED_JOB_TTL = 30 * 60 * 1000; // 30 minutes — auto-remove completed/failed jobs

const useQueueStore = create((set, get) => ({
  queue: [],
  selectedQueueId: null,
  wsConnected: false,

  // Get the currently viewed queue item
  getActiveViewItem: () => {
    const s = get();
    return s.queue.find((item) => item.id === s.selectedQueueId) || null;
  },

  // Add a new job to the queue
  addToQueue: (job) => set((s) => {
    const newQueue = [...s.queue, job];
    // Auto-select the new item if none selected
    const selectedId = s.selectedQueueId || job.id;
    return { queue: newQueue, selectedQueueId: selectedId };
  }),

  // Select a queue item for preview
  selectQueueItem: (id) => set({ selectedQueueId: id }),
  selectJob: (id) => set({ selectedQueueId: id }),

  // Update job progress (from WebSocket)
  updateJobProgress: (jobId, step, totalSteps) => set((s) => {
    // Guard against division by zero
    const safeTotal = totalSteps > 0 ? totalSteps : 1;
    // If jobId is null/undefined, target the first generating/queued job
    const targetId = jobId || s.queue.find((item) =>
      item.status === 'generating' || item.status === 'queued'
    )?.id;
    if (!targetId) return s;
    return {
      queue: s.queue.map((item) =>
        item.id === targetId
          ? {
              ...item,
              status: 'generating',
              currentStep: step,
              totalSteps: safeTotal,
              progress: Math.min(100, Math.floor((step / safeTotal) * 100)),
            }
          : item
      ),
    };
  }),

  // Update preview image (from WebSocket binary event)
  updateJobPreview: (jobId, previewUrl) => set((s) => {
    // If jobId is null/undefined, target the first generating/queued job
    const targetId = jobId || s.queue.find((item) =>
      item.status === 'generating' || item.status === 'queued'
    )?.id;
    if (!targetId) return s;
    return {
      queue: s.queue.map((item) =>
        item.id === targetId ? { ...item, previewUrl } : item
      ),
    };
  }),

  // Mark job as complete
  completeJob: (jobId, imageUrl) => set((s) => ({
    queue: s.queue.map((item) =>
      item.id === jobId
        ? {
            ...item,
            status: 'complete',
            progress: 100,
            currentStep: item.totalSteps,
            url: imageUrl,
            endTime: Date.now(),
          }
        : item
    ),
  })),

  // Mark job as failed
  failJob: (jobId, message) => set((s) => ({
    queue: s.queue.map((item) =>
      item.id === jobId
        ? { ...item, status: 'error', errorMessage: message, endTime: Date.now() }
        : item
    ),
  })),

  // Mark job as downloading a LoRA
  setJobDownloading: (jobId, filename, sizeLabel) => set((s) => ({
    queue: s.queue.map((item) =>
      item.id === jobId
        ? {
            ...item,
            status: 'downloading',
            downloadFilename: filename,
            downloadProgress: 0,
            downloadSizeLabel: sizeLabel,
          }
        : item
    ),
  })),

  // Update download progress
  updateJobDownloadProgress: (jobId, percent) => set((s) => ({
    queue: s.queue.map((item) =>
      item.id === jobId
        ? { ...item, downloadProgress: percent }
        : item
    ),
  })),

  // Clear downloading state back to queued
  clearJobDownloading: (jobId) => set((s) => ({
    queue: s.queue.map((item) =>
      item.id === jobId
        ? {
            ...item,
            status: 'queued',
            downloadFilename: undefined,
            downloadProgress: undefined,
            downloadSizeLabel: undefined,
          }
        : item
    ),
  })),

  // Remove a job from the queue
  removeJob: (jobId) => set((s) => {
    const newQueue = s.queue.filter((item) => item.id !== jobId);
    const selectedId = s.selectedQueueId === jobId
      ? (newQueue.length > 0 ? newQueue[newQueue.length - 1].id : null)
      : s.selectedQueueId;
    return { queue: newQueue, selectedQueueId: selectedId };
  }),

  // Clear all completed/error jobs
  clearCompleted: () => set((s) => ({
    queue: s.queue.filter((item) => item.status !== 'complete' && item.status !== 'error'),
  })),

  // Bug #12: Auto-cleanup old completed/failed jobs to prevent memory bloat
  cleanupStaleJobs: () => set((s) => {
    const now = Date.now();
    const cleaned = s.queue.filter((item) => {
      if ((item.status === 'complete' || item.status === 'error') && item.endTime) {
        return now - item.endTime < COMPLETED_JOB_TTL;
      }
      return true; // Keep active jobs
    });
    if (cleaned.length === s.queue.length) return s; // No change
    // If selected item was removed, select the last remaining item
    const selectedStillExists = cleaned.some((item) => item.id === s.selectedQueueId);
    return {
      queue: cleaned,
      selectedQueueId: selectedStillExists
        ? s.selectedQueueId
        : (cleaned.length > 0 ? cleaned[cleaned.length - 1].id : null),
    };
  }),

  // WebSocket connection status
  setWsConnected: (v) => set({ wsConnected: v }),
}));

export default useQueueStore;
