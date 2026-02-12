import { useEffect, useRef, useCallback } from 'react';
import useQueueStore from '../stores/useQueueStore';
import useUIStore from '../stores/useUIStore';
import useToastStore from '../stores/useToastStore';
import { api } from '../api';

// Use the page's host so Vite proxy (dev) and production both work
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/api/ws`;
const RECONNECT_DELAY = 3000;

// Timeouts (ms)
const DOWNLOAD_TIMEOUT = 5 * 60 * 1000;   // 5 minutes — LoRA download
const GENERATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes — queued/generating
const STALE_CHECK_INTERVAL = 30 * 1000;    // Check every 30 seconds

export default function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const connectingRef = useRef(false);       // Bug #1: prevent concurrent connect() calls
  const downloadTimers = useRef({});         // Bug #3: per-job download timeout timers
  const staleCheckTimer = useRef(null);      // Bug #4: periodic stale job check

  const setWsConnected = useQueueStore((s) => s.setWsConnected);
  const updateJobProgress = useQueueStore((s) => s.updateJobProgress);
  const updateJobPreview = useQueueStore((s) => s.updateJobPreview);
  const completeJob = useQueueStore((s) => s.completeJob);
  const failJob = useQueueStore((s) => s.failJob);
  const setJobDownloading = useQueueStore((s) => s.setJobDownloading);
  const updateJobDownloadProgress = useQueueStore((s) => s.updateJobDownloadProgress);
  const clearJobDownloading = useQueueStore((s) => s.clearJobDownloading);
  const setComfyuiConnected = useUIStore((s) => s.setComfyuiConnected);

  // --- Bug #3: Download timeout helpers ---
  const startDownloadTimer = useCallback((jobId) => {
    // Clear any existing timer for this job
    if (downloadTimers.current[jobId]) {
      clearTimeout(downloadTimers.current[jobId]);
    }
    downloadTimers.current[jobId] = setTimeout(() => {
      // Check if job is still in downloading state
      const job = useQueueStore.getState().queue.find((j) => j.id === jobId);
      if (job && job.status === 'downloading') {
        failJob(jobId, 'Download timed out after 5 minutes');
        useToastStore.getState().error('Download Timeout', 'Model download took too long and was cancelled');
      }
      delete downloadTimers.current[jobId];
    }, DOWNLOAD_TIMEOUT);
  }, [failJob]);

  const clearDownloadTimer = useCallback((jobId) => {
    if (downloadTimers.current[jobId]) {
      clearTimeout(downloadTimers.current[jobId]);
      delete downloadTimers.current[jobId];
    }
  }, []);

  // --- Bug #4: Stale job checker + Bug #12: completed job cleanup ---
  const checkStaleJobs = useCallback(() => {
    const queue = useQueueStore.getState().queue;
    const now = Date.now();

    for (const job of queue) {
      if (
        (job.status === 'queued' || job.status === 'generating') &&
        job.startTime &&
        now - job.startTime > GENERATION_TIMEOUT
      ) {
        failJob(job.id, `Job timed out after ${Math.round(GENERATION_TIMEOUT / 60000)} minutes`);
        useToastStore.getState().warning('Job Timeout', `Generation timed out — ComfyUI may be unresponsive`);
      }
    }

    // Bug #12: Auto-cleanup old completed/failed jobs
    useQueueStore.getState().cleanupStaleJobs();
  }, [failJob]);

  // --- Bug #2: Re-sync queue state on reconnect ---
  const syncQueueOnReconnect = useCallback(async () => {
    try {
      const status = await api.fetchStatus();
      if (status && !status.connected) {
        // ComfyUI is down — fail any in-flight jobs since they won't complete
        const queue = useQueueStore.getState().queue;
        for (const job of queue) {
          if (job.status === 'generating' || job.status === 'queued') {
            failJob(job.id, 'Connection lost — ComfyUI may have restarted');
          }
        }
      }
    } catch {
      // Status endpoint unavailable — ignore, WS reconnect will sort it out
    }
  }, [failJob]);

  const connect = useCallback(() => {
    // Bug #1: Prevent overlapping connect() calls
    if (connectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    connectingRef.current = true;

    try {
      // Bug #1: Close any existing stale WebSocket before creating a new one
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        connectingRef.current = false;
        setWsConnected(true);
        useUIStore.getState().setWsReconnecting(false);

        // Bug #2: Re-sync queue state after reconnect
        syncQueueOnReconnect();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'connection_status': {
              const wasConnected = useUIStore.getState().comfyuiConnected;
              setComfyuiConnected(msg.connected);
              if (msg.connected && !wasConnected) {
                useToastStore.getState().success('Connected', 'ComfyUI is ready');
              } else if (!msg.connected && wasConnected) {
                useToastStore.getState().warning('Disconnected', 'ComfyUI connection lost');
              }
              break;
            }
            case 'progress':
              updateJobProgress(msg.jobId, msg.step, msg.totalSteps);
              break;
            case 'preview':
              // Preview comes without jobId — apply to first generating item
              updateJobPreview(null, msg.imageBase64);
              break;
            case 'complete':
              completeJob(msg.jobId, msg.imageUrl);
              break;
            case 'error':
              failJob(msg.jobId, msg.message);
              useToastStore.getState().error('Generation Failed', msg.message || 'An error occurred during generation');
              break;
            case 'lora_download': {
              switch (msg.status) {
                case 'started':
                  setJobDownloading(msg.jobId, msg.filename, msg.sizeLabel);
                  startDownloadTimer(msg.jobId); // Bug #3: start timeout
                  useToastStore.getState().info('Downloading Model', msg.description + ' (' + msg.sizeLabel + ')');
                  break;
                case 'progress':
                  updateJobDownloadProgress(msg.jobId, msg.percent);
                  break;
                case 'complete':
                  clearDownloadTimer(msg.jobId); // Bug #3: clear timeout
                  clearJobDownloading(msg.jobId);
                  useToastStore.getState().success('Download Complete', 'Model ready');
                  break;
                case 'failed':
                  clearDownloadTimer(msg.jobId); // Bug #3: clear timeout
                  failJob(msg.jobId, msg.error);
                  useToastStore.getState().error('Download Failed', msg.error);
                  break;
                default:
                  break;
              }
              break;
            }
            case 'cached':
              // ComfyUI cached some/all nodes for this job. With random seeds
              // this only caches upstream nodes (model/CLIP), not KSampler.
              // The 'complete' event still fires with the actual output.
              break;
            case 'executing':
            case 'executing_done':
              // Node execution lifecycle — no action needed
              break;
            case 'queue_status':
              // Could update UI with queue remaining count
              break;
            default:
              break;
          }
        } catch {
          // Non-JSON message, ignore
        }
      };

      ws.onclose = () => {
        connectingRef.current = false;
        setWsConnected(false);
        setComfyuiConnected(false);
        useUIStore.getState().setWsReconnecting(true);
        // Clear any existing timer before setting a new one
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        connectingRef.current = false;
        ws.close();
      };
    } catch {
      connectingRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, [setWsConnected, setComfyuiConnected, updateJobProgress, updateJobPreview, completeJob, failJob, setJobDownloading, updateJobDownloadProgress, clearJobDownloading, startDownloadTimer, clearDownloadTimer, syncQueueOnReconnect]);

  useEffect(() => {
    connect();

    // Bug #4: Start periodic stale job checker
    staleCheckTimer.current = setInterval(checkStaleJobs, STALE_CHECK_INTERVAL);

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (staleCheckTimer.current) clearInterval(staleCheckTimer.current);
      // Clear all download timers
      Object.values(downloadTimers.current).forEach(clearTimeout);
      downloadTimers.current = {};
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect, checkStaleJobs]);

  return wsRef;
}
