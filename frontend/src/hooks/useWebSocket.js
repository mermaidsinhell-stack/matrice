import { useEffect, useRef, useCallback } from 'react';
import useQueueStore from '../stores/useQueueStore';
import useUIStore from '../stores/useUIStore';
import useToastStore from '../stores/useToastStore';

// Use the page's host so Vite proxy (dev) and production both work
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/api/ws`;
const RECONNECT_DELAY = 3000;

export default function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const setWsConnected = useQueueStore((s) => s.setWsConnected);
  const updateJobProgress = useQueueStore((s) => s.updateJobProgress);
  const updateJobPreview = useQueueStore((s) => s.updateJobPreview);
  const completeJob = useQueueStore((s) => s.completeJob);
  const failJob = useQueueStore((s) => s.failJob);
  const setComfyuiConnected = useUIStore((s) => s.setComfyuiConnected);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        useUIStore.getState().setWsReconnecting(false);
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
        setWsConnected(false);
        setComfyuiConnected(false);
        useUIStore.getState().setWsReconnecting(true);
        // Clear any existing timer before setting a new one
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, [setWsConnected, setComfyuiConnected, updateJobProgress, updateJobPreview, completeJob, failJob]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return wsRef;
}
