import React from 'react';
import { RefreshCw } from 'lucide-react';
import useUIStore from '../../stores/useUIStore';
import useModelStore from '../../stores/useModelStore';

const ConnectionStatus = () => {
  const connected = useUIStore((s) => s.comfyuiConnected);
  const isLoading = useModelStore((s) => s.isLoading);
  const refresh = useModelStore((s) => s.refresh);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2" title={connected ? 'ComfyUI Connected' : 'ComfyUI Disconnected'}>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} ${connected ? '' : 'animate-pulse'}`} />
        <span className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888] hidden lg:inline">
          {connected ? 'Connected' : 'Offline'}
        </span>
      </div>
      <button
        onClick={refresh}
        disabled={isLoading}
        className="p-1.5 text-[#888] hover:text-[#E84E36] hover:bg-[#FAFAFA] transition-all disabled:opacity-40"
        title="Refresh Models"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};

export default ConnectionStatus;
