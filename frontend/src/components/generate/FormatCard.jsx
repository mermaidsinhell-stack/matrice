import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { RATIOS, FLUX_RATIOS } from '../../utils/constants';

const FormatCard = ({ genConfig, showFluxFormats, onUpdateGen, onToggleFluxFormats }) => (
  <div className="bg-white p-6 shadow-sm border border-[#F0F0F0] relative">
    <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7]" />
    <label className="font-serif-display italic text-2xl text-[#1A1917] mb-4 block">Format</label>
    <div className="flex flex-wrap gap-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
      {RATIOS.map((r, i) => (
        <button key={i} onClick={() => onUpdateGen({ width: r.width, height: r.height })} className={`px-4 py-3 text-[10px] font-bold font-geo-sans uppercase tracking-widest transition-all border shrink-0 ${genConfig.width === r.width && genConfig.height === r.height ? 'bg-[#1A1917] text-white border-[#1A1917]' : 'bg-transparent text-[#1A1917] border-[#E5E5E5] hover:border-[#E84E36] hover:text-[#E84E36]'}`}>{r.label}</button>
      ))}
      <button onClick={onToggleFluxFormats} className={`px-4 py-3 text-[10px] font-bold font-geo-sans uppercase tracking-widest transition-all border shrink-0 flex items-center justify-center ${showFluxFormats ? 'bg-[#E84E36] text-white border-[#E84E36]' : 'bg-transparent text-[#1A1917] border-[#E5E5E5] hover:border-[#E84E36] hover:text-[#E84E36]'}`} title="Toggle Flux High-Res Formats"><MoreHorizontal size={14} /></button>
    </div>
    {showFluxFormats && (
      <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
        <h4 className="font-serif-display italic text-lg text-[#1A1917] mb-2 border-t border-[#E5E5E5] pt-4">Flux High-Res</h4>
        <div className="flex flex-wrap gap-2">
          {FLUX_RATIOS.map((r, i) => (
            <button key={i} onClick={() => onUpdateGen({ width: r.width, height: r.height })} className={`px-4 py-3 text-[10px] font-bold font-geo-sans uppercase tracking-widest transition-all border shrink-0 ${genConfig.width === r.width && genConfig.height === r.height ? 'bg-[#1A1917] text-white border-[#1A1917]' : 'bg-transparent text-[#1A1917] border-[#E5E5E5] hover:border-[#E84E36] hover:text-[#E84E36]'}`}>{r.label}</button>
          ))}
        </div>
      </div>
    )}
    <div className="grid grid-cols-2 gap-4">
      <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Width</label><input type="number" value={genConfig.width} onChange={(e) => onUpdateGen({ width: Number(e.target.value) })} className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-2 font-geo-sans text-sm font-medium text-[#1A1917] focus:outline-none focus:border-[#E84E36] transition-colors" /></div>
      <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Height</label><input type="number" value={genConfig.height} onChange={(e) => onUpdateGen({ height: Number(e.target.value) })} className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-2 font-geo-sans text-sm font-medium text-[#1A1917] focus:outline-none focus:border-[#E84E36] transition-colors" /></div>
    </div>
  </div>
);

export default FormatCard;
