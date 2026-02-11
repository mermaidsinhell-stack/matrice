import { create } from 'zustand';

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
        ? { ...item, status: 'error', errorMessage: message }
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

  // WebSocket connection status
  setWsConnected: (v) => set({ wsConnected: v }),
}));

export default useQueueStore;
