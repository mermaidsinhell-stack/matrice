import React from 'react';
import { Plus, Minus, Box } from 'lucide-react';
import CustomDropdown from '../ui/CustomDropdown';
import StyledSlider from '../ui/StyledSlider';
import { clampFloat } from '../../utils/imageUtils';

const LoRAPanel = ({ loras, loraOptions, onAdd, onRemove, onUpdateName, onUpdateStrengthModel, onUpdateStrengthClip, onToggleAdvanced, onUpdateDoubleBlocks, onUpdateSingleBlocks }) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <label className="font-serif-display italic text-2xl text-[#1A1917] block">LoRA</label>
      <div className="flex gap-3">
        <button onClick={onRemove} className={`text-[#E84E36] hover:scale-110 transition-all ${loras.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''}`} title="Remove Last LoRA Layer" disabled={loras.length <= 1}><Minus size={20} /></button>
        <button onClick={onAdd} className="text-[#E84E36] hover:scale-110 transition-transform" title="Add LoRA Layer"><Plus size={20} /></button>
      </div>
    </div>
    <div className="space-y-8">
      {loras.map((lora, index) => {
        const modelVal = clampFloat(lora.strengthModel, -2.0, 2.0, 1.0);
        const clipVal = clampFloat(lora.strengthClip, -2.0, 2.0, 1.0);
        return (
          <div key={index} className="relative animate-in fade-in slide-in-from-top-2 duration-300 border-b border-[#E5E5E5] pb-6 last:border-0 last:pb-0">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <div className="relative mb-4">
                  <CustomDropdown options={loraOptions} value={lora.name} onChange={(val) => onUpdateName(index, val)} />
                </div>
                {/* Model Strength */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <label className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888]">Model Strength</label>
                    <span className="font-serif-display italic text-xs text-[#E84E36]">{modelVal}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <StyledSlider min={-2.0} max={2.0} step={0.1} value={modelVal} onChange={(e) => onUpdateStrengthModel(index, e.target.value)} size="lg" />
                    </div>
                    <input type="number" step="0.1" min="-2" max="2"
                      value={lora.strengthModel}
                      onChange={(e) => onUpdateStrengthModel(index, e.target.value)}
                      onBlur={(e) => {
                        const clamped = clampFloat(e.target.value, -2.0, 2.0, 1.0);
                        onUpdateStrengthModel(index, clamped);
                      }}
                      className="font-serif-display italic text-sm text-[#E84E36] w-16 text-center bg-[#FAFAFA] border border-[#E5E5E5] focus:border-[#E84E36] outline-none py-1 px-1 transition-colors" />
                  </div>
                </div>
                {/* CLIP Strength */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888]">CLIP Strength</label>
                    <span className="font-serif-display italic text-xs text-[#E84E36]">{clipVal}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <StyledSlider min={-2.0} max={2.0} step={0.1} value={clipVal} onChange={(e) => onUpdateStrengthClip(index, e.target.value)} size="lg" />
                    </div>
                    <input type="number" step="0.1" min="-2" max="2"
                      value={lora.strengthClip}
                      onChange={(e) => onUpdateStrengthClip(index, e.target.value)}
                      onBlur={(e) => {
                        const clamped = clampFloat(e.target.value, -2.0, 2.0, 1.0);
                        onUpdateStrengthClip(index, clamped);
                      }}
                      className="font-serif-display italic text-sm text-[#E84E36] w-16 text-center bg-[#FAFAFA] border border-[#E5E5E5] focus:border-[#E84E36] outline-none py-1 px-1 transition-colors" />
                  </div>
                </div>
              </div>
              <button onClick={() => onToggleAdvanced(index)} className={`mt-2 p-2 transition-colors ${lora.isAdvancedOpen ? 'bg-[#E84E36] text-white' : 'text-[#888] hover:bg-[#FAFAFA] hover:text-[#1A1917]'}`} title="Advanced: Custom Blocks"><Box size={18} /></button>
            </div>
            {lora.isAdvancedOpen && (
              <div className="mt-4 pl-4 border-l-2 border-[#E5E5E5] animate-in slide-in-from-top-1 fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1 block">Double Blocks</label>
                  <input type="text" value={lora.doubleBlocks} onChange={(e) => onUpdateDoubleBlocks(index, e.target.value)} placeholder="e.g. 1,0,0,1..." className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-2 font-mono text-xs text-[#1A1917] focus:outline-none focus:border-[#E84E36] transition-colors" />
                </div>
                <div>
                  <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1 block">Single Blocks</label>
                  <input type="text" value={lora.singleBlocks} onChange={(e) => onUpdateSingleBlocks(index, e.target.value)} placeholder="e.g. 1,1,1..." className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-2 font-mono text-xs text-[#1A1917] focus:outline-none focus:border-[#E84E36] transition-colors" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default LoRAPanel;
