import React from 'react';
import { ImagePlus, Image as ImageIcon, X } from 'lucide-react';
import CollapsibleCard from '../ui/CollapsibleCard';
import ToggleSwitch from '../ui/ToggleSwitch';
import StyledSlider from '../ui/StyledSlider';

const Img2ImgCard = ({ isActive, onToggle, enabled, image, denoise, onUpdate, onUpload, onRemove }) => (
  <CollapsibleCard title="Image to Image" icon={ImagePlus} isActive={isActive} onToggle={onToggle}>
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable Img2Img</label>
        <ToggleSwitch enabled={enabled} onToggle={() => image && onUpdate({ enabled: !enabled })} disabled={!image} />
      </div>
      <div onClick={() => !image && document.getElementById('img2img-upload').click()} className="w-48 h-48 mx-auto bg-[#FAFAFA] border-2 border-dashed border-[#E5E5E5] flex items-center justify-center cursor-pointer hover:border-[#E84E36] transition-colors relative overflow-hidden group/img2img">
        <input id="img2img-upload" type="file" accept="image/*" className="hidden" onChange={onUpload} />
        {image ? (
          <>
            <img src={image} alt="Img2Img" className="w-full h-full object-cover" />
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-2 right-2 bg-white/90 p-2 text-[#E84E36] opacity-0 group-hover/img2img:opacity-100 transition-opacity shadow-md"><X size={16} /></button>
          </>
        ) : (
          <div className="text-center group-hover/img2img:scale-105 transition-transform pointer-events-none"><ImageIcon size={24} className="mx-auto mb-2 text-[#BBB]" /><span className="text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">Upload Source Image</span></div>
        )}
      </div>
      <div className={`transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Denoising Strength</label><span className="font-serif-display italic text-[#E84E36]">{denoise}</span></div>
        <StyledSlider min={0} max={1} step={0.05} value={denoise} onChange={(e) => onUpdate({ denoise: parseFloat(e.target.value) })} />
      </div>
    </div>
  </CollapsibleCard>
);

export default Img2ImgCard;
