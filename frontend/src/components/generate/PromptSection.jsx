import React from 'react';
import { ChevronRight } from 'lucide-react';

const PromptSection = ({ prompt, negativePrompt, showNegative, onUpdatePrompt, onUpdateNegativePrompt, onToggleNegative }) => (
  <div className="bg-white p-6 shadow-sm border border-[#F0F0F0] relative transition-all">
    <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7]" />
    <label className="font-serif-display italic text-2xl text-[#1A1917] mb-4 block">The Vision</label>
    <textarea value={prompt} onChange={(e) => onUpdatePrompt(e.target.value)} placeholder="Describe your scene..." className="w-full h-32 bg-[#FAFAFA] border border-[#E5E5E5] p-4 font-geo-sans text-base text-[#1A1917] placeholder-[#AAA] focus:outline-none focus:border-[#E84E36] focus:bg-white transition-all resize-none mb-2" />
    <div className="border-t border-[#E5E5E5] pt-2">
      <button onClick={onToggleNegative} className="flex items-center gap-2 text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888] hover:text-[#E84E36] transition-colors">
        <ChevronRight size={12} className={`transition-transform ${showNegative ? 'rotate-90' : ''}`} /> Negative Prompt
      </button>
      {showNegative && (
        <textarea value={negativePrompt} onChange={(e) => onUpdateNegativePrompt(e.target.value)} placeholder="Things to avoid (e.g. low quality, blurry)..." className="w-full h-20 bg-[#FAFAFA] border border-[#E5E5E5] p-3 mt-2 font-geo-sans text-sm text-[#1A1917] placeholder-[#AAA] focus:outline-none focus:border-[#E84E36] focus:bg-white transition-all resize-none animate-in fade-in slide-in-from-top-1" />
      )}
    </div>
  </div>
);

export default PromptSection;
