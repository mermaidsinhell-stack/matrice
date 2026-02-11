import React from 'react';
import { ScanFace, Upload, X } from 'lucide-react';
import CollapsibleCard from '../ui/CollapsibleCard';
import ToggleSwitch from '../ui/ToggleSwitch';
import StyledSlider from '../ui/StyledSlider';

const FaceSwapCard = ({ isActive, onToggle, enabled, image, fidelity, onUpdate, onUpload, onRemove }) => (
  <CollapsibleCard title="Face Swap" icon={ScanFace} isActive={isActive} onToggle={onToggle}>
    <div className="flex flex-col md:flex-row gap-8 items-center">
      <div onClick={() => !image && document.getElementById('face-upload').click()} className={`relative w-48 h-48 border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all group/upload ${enabled ? 'border-[#E84E36] bg-white' : 'border-[#E5E5E5] bg-[#FAFAFA] grayscale'}`}>
        <input id="face-upload" type="file" accept="image/*" className="hidden" onChange={onUpload} />
        {image ? (
          <>
            <img src={image} alt="Face" className="w-full h-full object-cover" />
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute inset-0 bg-black/50 opacity-0 group-hover/upload:opacity-100 transition-opacity flex items-center justify-center text-white"><X size={24} /></button>
          </>
        ) : (
          <div className="text-center pointer-events-none"><Upload size={24} className={`mx-auto mb-1 ${enabled ? 'text-[#E84E36]' : 'text-[#BBB]'}`} /><span className="text-[9px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">Upload Face</span></div>
        )}
      </div>
      <div className="flex-1 w-full space-y-6">
        <div className="flex items-center justify-between">
          <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable Face Swap</label>
          <ToggleSwitch enabled={enabled} onToggle={() => image && onUpdate({ enabled: !enabled })} disabled={!image} />
        </div>
        <div className={`transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Fidelity</label><span className="font-serif-display italic text-[#E84E36]">{fidelity}</span></div>
          <StyledSlider min={0} max={1} step={0.05} value={fidelity} onChange={(e) => onUpdate({ fidelity: parseFloat(e.target.value) })} />
        </div>
      </div>
    </div>
  </CollapsibleCard>
);

export default FaceSwapCard;
