import React from 'react';
import { Layers, PenTool, X } from 'lucide-react';
import CollapsibleCard from '../ui/CollapsibleCard';
import CustomDropdown from '../ui/CustomDropdown';
import ToggleSwitch from '../ui/ToggleSwitch';
import StyledSlider from '../ui/StyledSlider';

const ControlNetCard = ({ isActive, onToggle, enabled, image, preprocessor, preprocessorOptions, model, controlnetOptions = [], strength, startPercent, endPercent, onUpdate, onUpload, onRemove }) => (
  <CollapsibleCard title="Structure (ControlNet)" icon={Layers} isActive={isActive} onToggle={onToggle}>
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable ControlNet</label>
        <ToggleSwitch enabled={enabled} onToggle={() => image && onUpdate({ enabled: !enabled })} disabled={!image} />
      </div>
      {/* Preprocessor Selection */}
      <div>
        <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Preprocessor</label>
        <CustomDropdown options={preprocessorOptions} value={preprocessor} onChange={(val) => onUpdate({ preprocessor: val })} />
      </div>
      {/* ControlNet Model Selection */}
      {controlnetOptions.length > 0 && (
        <div>
          <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">ControlNet Model</label>
          <CustomDropdown options={['', ...controlnetOptions]} value={model || ''} onChange={(val) => onUpdate({ model: val })} />
        </div>
      )}
      <div onClick={() => !image && document.getElementById('structure-upload').click()} className="w-48 h-48 mx-auto bg-[#FAFAFA] border-2 border-dashed border-[#E5E5E5] flex items-center justify-center cursor-pointer hover:border-[#E84E36] transition-colors relative overflow-hidden group/canny">
        <input id="structure-upload" type="file" accept="image/*" className="hidden" onChange={onUpload} />
        {image ? (
          <>
            <img src={image} alt="Structure" className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-full border-4 border-white/30 mix-blend-overlay" /></div>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-2 right-2 bg-white/90 p-2 text-[#E84E36] opacity-0 group-hover/canny:opacity-100 transition-opacity shadow-md pointer-events-auto"><X size={16} /></button>
          </>
        ) : (
          <div className="text-center group-hover/canny:scale-105 transition-transform pointer-events-none"><PenTool size={24} className="mx-auto mb-2 text-[#BBB]" /><span className="text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">Upload Structure Guide</span></div>
        )}
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div>
          <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Strength</label><span className="font-serif-display italic text-[#E84E36]">{strength}</span></div>
          <StyledSlider min={0} max={2} step={0.1} value={strength} onChange={(e) => onUpdate({ strength: parseFloat(e.target.value) })} />
        </div>
        <div>
          <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Start Step</label><span className="font-serif-display italic text-[#E84E36]">{Math.round(startPercent * 100)}%</span></div>
          <StyledSlider min={0} max={1} step={0.05} value={startPercent} onChange={(e) => onUpdate({ startPercent: parseFloat(e.target.value) })} />
        </div>
        <div>
          <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">End Step</label><span className="font-serif-display italic text-[#E84E36]">{Math.round(endPercent * 100)}%</span></div>
          <StyledSlider min={0} max={1} step={0.05} value={endPercent} onChange={(e) => onUpdate({ endPercent: parseFloat(e.target.value) })} />
        </div>
      </div>
    </div>
  </CollapsibleCard>
);

export default ControlNetCard;
