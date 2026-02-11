import React from 'react';
import CustomDropdown from '../ui/CustomDropdown';
import StyledSlider from '../ui/StyledSlider';
import ToggleSwitch from '../ui/ToggleSwitch';
import { LATENT_UPSCALE_METHODS } from '../../utils/constants';

const HiresFixCard = ({ genConfig, onUpdateGen }) => (
  <div className="bg-white p-6 shadow-sm border border-[#F0F0F0] relative group">
    <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7] group-hover:bg-[#E84E36] transition-colors" />
    <div className="flex items-center justify-between mb-6">
      <label className="font-serif-display italic text-xl text-[#1A1917]">Hires Fix</label>
      <ToggleSwitch enabled={genConfig.hiresFix} onToggle={() => onUpdateGen({ hiresFix: !genConfig.hiresFix })} />
    </div>
    <div className={`space-y-5 transition-opacity duration-300 ${genConfig.hiresFix ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
      <div>
        <div className="flex justify-between mb-2">
          <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Upscale Scale</label>
          <span className="font-serif-display italic text-[#E84E36]">{genConfig.hiresScale}x</span>
        </div>
        <StyledSlider min={1.0} max={4.0} step={0.1} value={genConfig.hiresScale} onChange={(e) => onUpdateGen({ hiresScale: parseFloat(e.target.value) })} />
      </div>
      <div>
        <div className="flex justify-between mb-2">
          <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Hires Steps</label>
          <span className="font-serif-display italic text-[#E84E36]">{genConfig.hiresSteps}</span>
        </div>
        <StyledSlider min={1} max={60} step={1} value={genConfig.hiresSteps} onChange={(e) => onUpdateGen({ hiresSteps: parseInt(e.target.value) })} />
      </div>
      <div>
        <div className="flex justify-between mb-2">
          <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Denoise Strength</label>
          <span className="font-serif-display italic text-[#E84E36]">{genConfig.hiresDenoise}</span>
        </div>
        <StyledSlider min={0} max={1} step={0.05} value={genConfig.hiresDenoise} onChange={(e) => onUpdateGen({ hiresDenoise: parseFloat(e.target.value) })} />
      </div>
      <div>
        <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Upscale Method</label>
        <CustomDropdown options={LATENT_UPSCALE_METHODS} value={genConfig.hiresUpscaleMethod} onChange={(val) => onUpdateGen({ hiresUpscaleMethod: val })} />
      </div>
    </div>
  </div>
);

export default HiresFixCard;
