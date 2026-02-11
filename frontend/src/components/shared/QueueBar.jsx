import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';

const QueueBar = ({ queue, selectedId, onSelect, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`fixed bottom-0 left-0 w-full bg-[#1A1917] border-t border-[#333] z-50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="h-12 flex items-center justify-between px-6 cursor-pointer hover:bg-[#222] transition-colors border-b border-[#333]">
        <div className="flex items-center gap-3">
          <span className="font-serif-display italic text-[#EAE6D9] text-lg">Generation Queue</span>
          <span className="bg-[#E84E36] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{queue.length}</span>
        </div>
        <div className="text-[#888]">{isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</div>
      </div>
      <div className="h-32 flex items-center px-4 md:px-12 gap-4 overflow-x-auto custom-scrollbar">
        {queue.length === 0 ? (
          <div className="w-full text-center text-[#444] font-geo-sans text-xs uppercase tracking-widest italic">Queue is empty</div>
        ) : (
          queue.map((item) => (
            <div key={item.id} onClick={() => onSelect(item.id)}
              className={`relative w-20 h-20 shrink-0 cursor-pointer group transition-all duration-300 border-2 ${selectedId === item.id ? 'border-[#E84E36] scale-105' : 'border-[#333] hover:border-[#666]'}`}>
              {item.status === 'complete' ? (
                <img src={item.url} alt="Result" className="w-full h-full object-cover" />
              ) : item.status === 'generating' ? (
                <div className="w-full h-full bg-[#222] relative overflow-hidden">
                  {item.previewUrl && <img src={item.previewUrl} alt="" className="w-full h-full object-cover opacity-50 blur-sm" />}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#444]">
                    <div className="h-full bg-[#E84E36] transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ) : item.status === 'error' ? (
                <div className="w-full h-full bg-red-900/20 flex items-center justify-center border border-red-500"><X size={16} className="text-red-500" /></div>
              ) : (
                <div className="w-full h-full bg-[#222] flex items-center justify-center flex-col gap-1">
                  <Loader2 size={12} className="text-[#888] animate-spin-slow" />
                  <span className="text-[8px] text-[#888] font-mono">WAIT</span>
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="absolute -top-2 -right-2 bg-[#E84E36] text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity scale-75"><X size={12} /></button>
              {selectedId === item.id && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#E84E36] rounded-full" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QueueBar;
