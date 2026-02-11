import React from 'react';
import { Loader2, AlertCircle, Check } from 'lucide-react';

const GenerationStatusStrip = ({ item, onRetry }) => {
  if (!item || item.status === 'idle') return null;
  return (
    <div className="w-full bg-white border-x border-b border-[#E5E5E5] p-4 flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in">
      {item.status === 'queued' && (
        <div className="flex items-center justify-between text-[#888]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#E84E36] rounded-full animate-pulse" />
            <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest">In Queue</span>
          </div>
          <span className="font-serif-display italic text-sm text-[#1A1917]">Waiting for GPU...</span>
        </div>
      )}
      {item.status === 'generating' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[#1A1917]">
            <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-[#E84E36]" /> Generating
            </span>
            <span className="font-serif-display italic text-sm text-[#E84E36]">{item.currentStep}/{item.totalSteps}</span>
          </div>
          <div className="w-full h-1 bg-[#F5F5F5] overflow-hidden">
            <div className="h-full bg-[#E84E36] transition-all duration-300 ease-out" style={{ width: `${item.progress}%` }} />
          </div>
        </div>
      )}
      {item.status === 'error' && (
        <div className="flex items-center justify-between text-red-500">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest">{item.error || "Generation Failed"}</span>
          </div>
          <button onClick={() => onRetry(item)} className="underline font-serif-display italic text-sm hover:text-red-700">Retry</button>
        </div>
      )}
      {item.status === 'complete' && (
        <div className="flex items-center justify-between text-[#1A1917]">
          <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#E84E36] flex items-center gap-2">
            <Check size={12} /> Complete
          </span>
          <span className="font-serif-display italic text-xs text-[#888]">
            {(item.endTime && item.startTime) ? ((item.endTime - item.startTime) / 1000).toFixed(1) : "0.0"}s
          </span>
        </div>
      )}
    </div>
  );
};

export default GenerationStatusStrip;
