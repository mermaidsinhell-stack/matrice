import React from 'react';
import StyledSlider from '../ui/StyledSlider';

const InpaintControls = ({ brushSize, onBrushSizeChange, maskBlur, onMaskBlurChange, inpaintArea, onInpaintAreaChange, inpaintPadding, onInpaintPaddingChange }) => (
  <div className="bg-[#FFF0ED] border border-[#E84E36] p-4 space-y-4 animate-in slide-in-from-top-2 fade-in">
    {/* Brush Size */}
    <div>
      <div className="flex justify-between mb-2">
        <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#E84E36]">Brush Size</label>
        <span className="font-serif-display italic text-[#E84E36]">{brushSize}px</span>
      </div>
      <StyledSlider min={1} max={100} value={brushSize} onChange={(e) => onBrushSizeChange(parseInt(e.target.value))} />
    </div>

    {/* Mask Blur */}
    <div>
      <div className="flex justify-between mb-2">
        <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Mask Blur</label>
        <span className="font-serif-display italic text-[#E84E36]">{maskBlur}px</span>
      </div>
      <StyledSlider min={0} max={64} value={maskBlur} onChange={(e) => onMaskBlurChange(parseInt(e.target.value))} />
    </div>

    {/* Inpaint Area Toggle */}
    <div>
      <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Inpaint Area</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onInpaintAreaChange('full')}
          className={`py-2 px-3 text-center font-geo-sans text-[10px] font-bold uppercase tracking-widest transition-all border ${inpaintArea === 'full' ? 'bg-[#1A1917] text-[#EAE6D9] border-[#1A1917]' : 'bg-white text-[#888] border-[#E5E5E5] hover:border-[#E84E36]'}`}
        >
          Full Resolution
        </button>
        <button
          onClick={() => onInpaintAreaChange('masked_only')}
          className={`py-2 px-3 text-center font-geo-sans text-[10px] font-bold uppercase tracking-widest transition-all border ${inpaintArea === 'masked_only' ? 'bg-[#1A1917] text-[#EAE6D9] border-[#1A1917]' : 'bg-white text-[#888] border-[#E5E5E5] hover:border-[#E84E36]'}`}
        >
          Masked Only
        </button>
      </div>
    </div>

    {/* Padding (only visible for masked_only) */}
    {inpaintArea === 'masked_only' && (
      <div className="animate-in slide-in-from-top-1 fade-in">
        <div className="flex justify-between mb-2">
          <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Mask Padding</label>
          <span className="font-serif-display italic text-[#E84E36]">{inpaintPadding}px</span>
        </div>
        <StyledSlider min={0} max={256} step={8} value={inpaintPadding} onChange={(e) => onInpaintPaddingChange(parseInt(e.target.value))} />
      </div>
    )}
  </div>
);

export default InpaintControls;
