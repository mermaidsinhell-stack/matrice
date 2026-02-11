import React from 'react';
import { User, Plus, X } from 'lucide-react';
import CollapsibleCard from '../ui/CollapsibleCard';
import CustomDropdown from '../ui/CustomDropdown';
import ToggleSwitch from '../ui/ToggleSwitch';
import StyledSlider from '../ui/StyledSlider';

const CharacterRefCard = ({ isActive, onToggle, enabled, images, strength, startPercent, endPercent, model, ipadapterOptions = [], onUpdate, onUploadImage, onRemoveImage }) => (
  <CollapsibleCard title="Character Ref" icon={User} isActive={isActive} onToggle={onToggle}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable Character Ref</label>
        <ToggleSwitch enabled={enabled} onToggle={() => images.some(Boolean) && onUpdate({ enabled: !enabled })} disabled={!images.some(Boolean)} />
      </div>
      {/* IP-Adapter Model */}
      {ipadapterOptions.length > 0 && (
        <div>
          <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">IP-Adapter Model</label>
          <CustomDropdown options={['', ...ipadapterOptions]} value={model || ''} onChange={(val) => onUpdate({ model: val })} />
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
        {images.map((img, slot) => (
          <div key={slot} onClick={() => !img && document.getElementById(`char-upload-${slot}`).click()} className={`relative w-32 h-32 shrink-0 bg-[#FAFAFA] border-2 border-dashed border-[#E5E5E5] flex flex-col items-center justify-center cursor-pointer hover:border-[#E84E36] hover:bg-[#FFF0ED] transition-colors snap-start overflow-hidden group/char ${img ? 'border-solid border-[#E84E36]' : ''}`}>
            <input id={`char-upload-${slot}`} type="file" accept="image/*" className="hidden" onChange={(e) => onUploadImage(e, slot)} />
            {img ? (
              <>
                <img src={img} alt={`Char ${slot}`} className="w-full h-full object-cover" />
                <button onClick={(e) => { e.stopPropagation(); onRemoveImage(slot); }} className="absolute top-1 right-1 bg-white/90 p-1 text-[#E84E36] opacity-0 group-hover/char:opacity-100 transition-opacity shadow-sm"><X size={12} /></button>
              </>
            ) : (
              <><Plus size={20} className="text-[#E5E5E5] mb-2" /><span className="text-[9px] font-bold font-geo-sans uppercase tracking-widest text-[#BBB]">Img {slot + 1}</span></>
            )}
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div>
          <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Weight</label><span className="font-serif-display italic text-[#E84E36]">{strength}</span></div>
          <StyledSlider min={0} max={2} step={0.05} value={strength} onChange={(e) => onUpdate({ strength: parseFloat(e.target.value) })} />
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

export default CharacterRefCard;
