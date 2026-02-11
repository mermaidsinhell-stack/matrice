import React from 'react';
import { X, Copy } from 'lucide-react';

const MetadataDrawer = ({ isOpen, onClose, item, onReuse }) => {
  if (!item) return null;
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 h-full w-full md:w-[400px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E5E5E5]">
            <h3 className="font-serif-display italic text-2xl text-[#1A1917]">Image Metadata</h3>
            <button onClick={onClose} className="p-2 hover:bg-[#FAFAFA] text-[#1A1917] hover:text-[#E84E36] transition-colors rounded-full"><X size={20} /></button>
          </div>
          <div className="space-y-6 font-geo-sans">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-2">Prompt</label>
              <p className="text-sm text-[#1A1917] leading-relaxed bg-[#FAFAFA] p-3 border border-[#E5E5E5]">{item.prompt || "No prompt data"}</p>
            </div>
            {item.negativePrompt && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-2">Negative Prompt</label>
                <p className="text-sm text-[#888] leading-relaxed bg-[#FAFAFA] p-3 border border-[#E5E5E5]">{item.negativePrompt}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Seed</label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[#E84E36]">{item.seed || "Random"}</span>
                  <button onClick={() => navigator.clipboard.writeText(String(item.seed || ""))} className="text-[#BBB] hover:text-[#1A1917]" title="Copy Seed"><Copy size={12} /></button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Model</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.model || "Unknown"}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Steps</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.steps || 20}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">CFG Scale</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.cfg || 3.5}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Sampler</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.sampler || "euler"}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Dimensions</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.width} × {item.height}</span>
              </div>
            </div>

            {item.loras && item.loras.length > 0 && item.loras.some(l => l.name !== "None") && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-2">LoRAs</label>
                <div className="space-y-1">
                  {item.loras.filter(l => l.name !== "None").map((l, i) => (
                    <div key={i} className="flex justify-between text-sm bg-[#FAFAFA] px-3 py-2 border border-[#E5E5E5]">
                      <span className="text-[#1A1917] font-medium">{l.name}</span>
                      <span className="text-[#E84E36] font-mono">{l.strength || l.strengthModel}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.imagePrompting && Object.values(item.imagePrompting).some(v => v?.enabled) && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-2">Image Prompting</label>
                <div className="flex flex-wrap gap-2">
                  {item.imagePrompting.img2img?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">Img2Img</span>}
                  {item.imagePrompting.faceSwap?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">Face Swap</span>}
                  {item.imagePrompting.characterRef?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">Character Ref</span>}
                  {item.imagePrompting.styleRef?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">Style Ref</span>}
                  {item.imagePrompting.controlNet?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">ControlNet</span>}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5E5E5]">
              <button onClick={() => onReuse(item)} className="w-full py-3 bg-[#1A1917] text-[#EAE6D9] font-bold uppercase tracking-widest text-xs hover:bg-[#E84E36] hover:text-white transition-all">
                Reuse Parameters
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MetadataDrawer;
