import React from 'react';
import CustomDropdown from '../ui/CustomDropdown';
import StyledSlider from '../ui/StyledSlider';
import ToggleSwitch from '../ui/ToggleSwitch';
import SeedInput from '../ui/SeedInput';
import { LATENT_UPSCALE_METHODS, PERFORMANCE_PRESETS } from '../../utils/constants';

const isGgufModel = (name) => name?.toLowerCase?.()?.endsWith('.gguf');

const ModelCard = ({
  genConfig, modelOptions, vaeOptions, clipModelOptions = [], samplers, schedulers,
  seedInput, onUpdateGen, onSeedInputChange, onRandomizeSeed, onPerformanceChange,
}) => (
  <div className="bg-white p-6 shadow-sm border border-[#F0F0F0] relative group">
    <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7] group-hover:bg-[#E84E36] transition-colors" />
    <label className="font-serif-display italic text-2xl text-[#1A1917] mb-6 block">Model Checkpoint</label>

    <div className="mb-4">
      <CustomDropdown options={modelOptions} value={genConfig.model} onChange={(val) => onUpdateGen({ model: val })} />
    </div>

    {/* VAE Selection */}
    <div className="mb-4">
      <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">VAE</label>
      <CustomDropdown options={vaeOptions} value={genConfig.vae} onChange={(val) => onUpdateGen({ vae: val })} />
    </div>

    {/* CLIP Models — shown for GGUF models */}
    {isGgufModel(genConfig.model) && clipModelOptions.length > 1 && (
      <div className="mb-4 p-3 bg-[#FAFAFA] border border-[#E5E5E5]">
        <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-3">CLIP / Text Encoders</label>
        <div className="space-y-3">
          <div>
            <label className="block font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888] mb-1">CLIP 1 (T5)</label>
            <CustomDropdown options={clipModelOptions} value={genConfig.clipModel1} onChange={(val) => onUpdateGen({ clipModel1: val })} />
          </div>
          <div>
            <label className="block font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888] mb-1">CLIP 2 (CLIP-L)</label>
            <CustomDropdown options={clipModelOptions} value={genConfig.clipModel2} onChange={(val) => onUpdateGen({ clipModel2: val })} />
          </div>
        </div>
        <p className="font-geo-sans text-[8px] text-[#BBB] mt-2 italic">Leave empty for defaults (t5xxl_fp8 + clip_l)</p>
      </div>
    )}

    {/* Performance Toggle */}
    <div className="mb-6">
      <div className="flex flex-wrap bg-[#FAFAFA] p-1 border border-[#E5E5E5] w-fit">
        {Object.keys(PERFORMANCE_PRESETS).map((mode) => (
          <button key={mode} onClick={() => onPerformanceChange(mode)} className={`px-3 py-2 text-[10px] font-bold font-geo-sans uppercase tracking-widest transition-all whitespace-nowrap ${genConfig.performance === mode ? 'bg-white text-[#E84E36] shadow-sm' : 'text-[#888] hover:text-[#1A1917]'}`}>{mode}</button>
        ))}
      </div>
    </div>

    <div className="mb-6">
      <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Image Count</label><span className="font-serif-display italic text-lg text-[#E84E36]">{genConfig.batchSize}</span></div>
      <StyledSlider min={1} max={4} step={1} value={genConfig.batchSize} onChange={(e) => onUpdateGen({ batchSize: parseInt(e.target.value) })} size="lg" />
      {genConfig.batchSize > 1 && (
        <div className="flex items-center gap-4 mt-2">
          <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Batch Seed</label>
          <div className="flex bg-[#FAFAFA] border border-[#E5E5E5]">
            {['increment', 'random'].map(mode => (
              <button key={mode} onClick={() => onUpdateGen({ batchSeedMode: mode })} className={`px-3 py-1 text-[9px] font-bold font-geo-sans uppercase tracking-widest transition-all ${genConfig.batchSeedMode === mode ? 'bg-white text-[#E84E36] shadow-sm' : 'text-[#888]'}`}>{mode}</button>
            ))}
          </div>
        </div>
      )}
    </div>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">Steps</label><span className="font-serif-display italic text-sm text-[#E84E36]">{genConfig.steps}</span></div>
        <StyledSlider min={1} max={50} value={genConfig.steps} onChange={(e) => onUpdateGen({ steps: Number(e.target.value) })} />
      </div>
      <div>
        <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">CFG</label><span className="font-serif-display italic text-sm text-[#E84E36]">{genConfig.cfg}</span></div>
        <StyledSlider min={1} max={20} step={0.5} value={genConfig.cfg} onChange={(e) => onUpdateGen({ cfg: Number(e.target.value) })} />
      </div>
    </div>

    {/* CLIP Skip */}
    <div className="mb-6">
      <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">CLIP Skip</label><span className="font-serif-display italic text-sm text-[#E84E36]">{genConfig.clipSkip}</span></div>
      <StyledSlider min={1} max={12} step={1} value={genConfig.clipSkip} onChange={(e) => onUpdateGen({ clipSkip: Number(e.target.value) })} />
    </div>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Sampler</label><CustomDropdown options={samplers} value={genConfig.sampler} onChange={(val) => onUpdateGen({ sampler: val })} /></div>
      <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Scheduler</label><CustomDropdown options={schedulers} value={genConfig.scheduler} onChange={(val) => onUpdateGen({ scheduler: val })} /></div>
    </div>

    <SeedInput seedInput={seedInput} onSeedInputChange={onSeedInputChange} onRandomize={onRandomizeSeed} />

    {/* Hires Fix */}
    <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
      <div className="flex items-center justify-between mb-4">
        <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Hires Fix (2-Pass)</label>
        <ToggleSwitch enabled={genConfig.hiresFix} onToggle={() => onUpdateGen({ hiresFix: !genConfig.hiresFix })} />
      </div>
      {genConfig.hiresFix && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between mb-1"><label className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888]">Scale</label><span className="font-serif-display italic text-xs text-[#E84E36]">{genConfig.hiresScale}x</span></div>
              <StyledSlider min={1.5} max={4} step={0.5} value={genConfig.hiresScale} onChange={(e) => onUpdateGen({ hiresScale: Number(e.target.value) })} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888]">Steps</label><span className="font-serif-display italic text-xs text-[#E84E36]">{genConfig.hiresSteps}</span></div>
              <StyledSlider min={1} max={30} value={genConfig.hiresSteps} onChange={(e) => onUpdateGen({ hiresSteps: Number(e.target.value) })} />
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888]">Denoise</label><span className="font-serif-display italic text-xs text-[#E84E36]">{genConfig.hiresDenoise}</span></div>
              <StyledSlider min={0} max={1} step={0.05} value={genConfig.hiresDenoise} onChange={(e) => onUpdateGen({ hiresDenoise: Number(e.target.value) })} />
            </div>
          </div>
          {/* Upscale Method — NEW per plan */}
          <div>
            <label className="block font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888] mb-2">Upscale Method</label>
            <CustomDropdown options={LATENT_UPSCALE_METHODS} value={genConfig.hiresUpscaleMethod} onChange={(val) => onUpdateGen({ hiresUpscaleMethod: val })} />
          </div>
        </div>
      )}
    </div>
  </div>
);

export default ModelCard;
