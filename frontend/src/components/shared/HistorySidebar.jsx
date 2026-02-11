import React from 'react';
import useQueueStore from '../../stores/useQueueStore';
import useGenerationStore from '../../stores/useGenerationStore';
import useUIStore from '../../stores/useUIStore';

const HistorySidebar = () => {
  const queue = useQueueStore((s) => s.queue);
  const gen = useGenerationStore();
  const ui = useUIStore();

  // Show completed items with images (most recent first)
  const completedItems = [...queue]
    .filter((item) => item.status === 'complete' && item.url)
    .reverse()
    .slice(0, 12);

  const handleReuse = (item) => {
    if (item.params) {
      gen.updateConfig(item.params);
    }
    ui.setActiveTab('Generate');
  };

  return (
    <div className="hidden lg:flex flex-col w-24 border-r border-[#E5E5E5] bg-white h-screen fixed left-0 top-0 z-40 pt-24 items-center gap-6 overflow-y-auto pb-4 custom-scrollbar">
      <div className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917] -rotate-90 whitespace-nowrap mb-4">History</div>
      {completedItems.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-2 mt-4">
          <div className="w-16 h-16 border-2 border-dashed border-[#E5E5E5] flex items-center justify-center">
            <span className="text-[10px] text-[#BBB] font-geo-sans text-center leading-tight">No images yet</span>
          </div>
        </div>
      ) : (
        completedItems.map((item) => (
          <div key={item.id} onClick={() => handleReuse(item)} className="group relative w-16 h-16 shrink-0 cursor-pointer">
            <img src={item.url} alt="History" className="w-full h-full object-cover border border-[#E5E5E5] group-hover:border-[#E84E36] transition-colors" />
            <div className="absolute inset-0 bg-[#1A1917]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[8px] text-white font-bold uppercase tracking-widest">Reuse</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default HistorySidebar;
