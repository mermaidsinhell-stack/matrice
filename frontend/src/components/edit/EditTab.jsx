import React, { useCallback } from 'react';
import { Upload, LayoutGrid, X, Maximize2, Brush, Sliders, Loader2 } from 'lucide-react';
import useEditStore from '../../stores/useEditStore';
import useGenerationStore from '../../stores/useGenerationStore';
import useUIStore from '../../stores/useUIStore';
import useQueueStore from '../../stores/useQueueStore';
import useModelStore from '../../stores/useModelStore';
import BouncingBalls from '../shared/BouncingBalls';
import GenerationStatusStrip from '../shared/GenerationStatusStrip';
import EditCanvas from './EditCanvas';
import InpaintControls from './InpaintControls';
import StyledSlider from '../ui/StyledSlider';
import CustomDropdown from '../ui/CustomDropdown';
import SeedInput from '../ui/SeedInput';
import LoRAPanel from '../generate/LoRAPanel';
import { normalizeImageShape } from '../../utils/imageUtils';
import { DEFAULT_LORA } from '../../utils/constants';
import { api } from '../../api';

const EditTab = () => {
  const edit = useEditStore();
  const gen = useGenerationStore();
  const ui = useUIStore();
  const queueStore = useQueueStore();
  const modelStore = useModelStore();

  const activeViewItem = queueStore.getActiveViewItem();

  // Model options for dropdowns — CustomDropdown expects plain string arrays
  const modelOptions = modelStore.models.length > 0
    ? modelStore.models
    : [gen.model];
  const samplers = modelStore.samplers.length > 0
    ? modelStore.samplers
    : [gen.sampler];
  const schedulers = modelStore.schedulers.length > 0
    ? modelStore.schedulers
    : [gen.scheduler];
  const loraOptions = modelStore.loras.length > 0
    ? ['None', ...modelStore.loras]
    : ['None'];

  // Device upload handler with scattering animation
  const handleDeviceUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      edit.setEditScattering(true);
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (event) => {
          edit.setEditImage(normalizeImageShape({ url: event.target.result }, { name: file.name, seed: 'Imported', model: 'Imported' }));
          edit.setEditScattering(false);
        };
        reader.readAsDataURL(file);
      }, 800);
    }
  }, [edit]);

  // Create/generate handler for edit tab
  const handleGenerate = useCallback(async () => {
    const payload = edit.buildPayload();
    // Use generation store values for shared fields if edit store doesn't override
    if (!payload.model) payload.model = gen.model;
    if (!payload.sampler) payload.sampler = gen.sampler;
    if (!payload.scheduler) payload.scheduler = gen.scheduler;

    const jobId = `edit-${Date.now()}`;
    queueStore.addToQueue({
      id: jobId,
      type: payload.mode,
      status: 'queued',
      prompt: payload.prompt,
      timestamp: Date.now(),
    });
    queueStore.selectJob(jobId);

    try {
      // Send our jobId so WS progress events match our queue item
      const result = await api.edit({ ...payload, jobId });
      if (!result) {
        queueStore.failJob(jobId, 'No response from server');
      }
    } catch {
      queueStore.failJob(jobId, 'Failed to submit edit job');
    }
  }, [edit, gen, queueStore]);

  // LoRA panel props (uses generation store loras — shared between tabs in original)
  const loraPanelProps = {
    loras: gen.loras,
    loraOptions,
    onAdd: () => gen.addLora({ ...DEFAULT_LORA }),
    onRemove: () => gen.removeLora(),
    onUpdateName: (i, val) => gen.updateLora(i, { name: val }),
    onUpdateStrengthModel: (i, val) => gen.updateLora(i, { strengthModel: val === '' ? '' : parseFloat(val) }),
    onUpdateStrengthClip: (i, val) => gen.updateLora(i, { strengthClip: val === '' ? '' : parseFloat(val) }),
    onToggleAdvanced: (i) => {
      const lora = gen.loras[i];
      gen.updateLora(i, { isAdvancedOpen: !lora.isAdvancedOpen });
    },
    onUpdateDoubleBlocks: (i, val) => gen.updateLora(i, { doubleBlocks: val }),
    onUpdateSingleBlocks: (i, val) => gen.updateLora(i, { singleBlocks: val }),
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-300">
      {!edit.editImage ? (
        /* ============ EMPTY STATE ============ */
        <div className="relative w-full">
          <div className="relative z-10 w-full bg-white shadow-xl torn-edge p-2">
            <div className="w-full h-[600px] bg-[#FAFAFA] relative overflow-hidden flex flex-col items-center justify-center gap-6 group">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/paper.png")` }} />
              <div className="absolute inset-0 pointer-events-none"><BouncingBalls isScattering={edit.editScattering} /></div>
              <div className={`z-20 text-center flex flex-col items-center gap-6 transition-opacity duration-500 ${edit.editScattering ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <h3 className="font-serif-display italic text-4xl text-[#1A1917] bg-white/50 backdrop-blur-sm px-6 py-2 border border-[#1A1917]/10">Start Editing</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <button onClick={() => document.getElementById('device-upload').click()} className="px-8 py-4 bg-[#1A1917] text-[#EAE6D9] font-bold font-geo-sans uppercase tracking-widest hover:bg-[#E84E36] hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 min-w-[200px]"><Upload size={18} /> Upload from Device</button>
                  <input id="device-upload" type="file" accept="image/*" className="hidden" onChange={handleDeviceUpload} />
                  <button onClick={() => ui.setActiveTab('Gallery')} className="px-8 py-4 bg-white border-2 border-[#1A1917] text-[#1A1917] font-bold font-geo-sans uppercase tracking-widest hover:bg-[#1A1917] hover:text-[#EAE6D9] transition-all shadow-lg flex items-center justify-center gap-2 min-w-[200px]"><LayoutGrid size={18} /> Select from Gallery</button>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-full h-full bg-[#DCD6F7] -z-10 torn-edge opacity-60" />
          <div className="absolute -bottom-4 -left-4 w-full h-full bg-[#FFE4E6] -z-20 torn-edge opacity-60" />
        </div>
      ) : (
        /* ============ LOADED STATE ============ */
        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
          {/* Canvas Area */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex justify-between items-center h-10">
              {activeViewItem && activeViewItem.status !== 'idle' ? (
                <span className="font-serif-display italic text-lg text-[#E84E36] animate-pulse">
                  {activeViewItem.status === 'queued' ? 'Queueing...' : activeViewItem.status === 'generating' ? 'Rendering...' : 'Done'}
                </span>
              ) : <div />}
              <button onClick={() => { edit.setEditImage(null); queueStore.selectJob(null); }} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E5E5] text-[#888] hover:text-[#E84E36] hover:border-[#E84E36] transition-all shadow-sm">
                <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest">Remove Image</span><X size={14} />
              </button>
            </div>

            <div className="relative w-full h-[600px] bg-[#FAFAFA] border border-[#E5E5E5] overflow-hidden flex items-center justify-center group shadow-inner">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/paper.png")` }} />
              {edit.editImage && (!activeViewItem || activeViewItem.status === 'queued' || activeViewItem.status === 'idle' || activeViewItem.status === 'complete') && (
                <EditCanvas
                  imageUrl={edit.editImage.url}
                  brushSize={edit.brushSize}
                  isInpaintMode={edit.editInpaintMode}
                  onMaskChange={edit.setMaskData}
                />
              )}
              {activeViewItem && activeViewItem.status !== 'idle' && activeViewItem.status !== 'queued' && (
                <>
                  {activeViewItem.status === 'generating' && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center">
                      {activeViewItem.previewUrl ? (
                        <img src={activeViewItem.previewUrl} alt="Generating..." className="max-w-full max-h-full object-contain transition-all duration-300 ease-out" style={{ filter: `blur(${Math.max(0, 8 - (activeViewItem.progress / 12))}px)` }} />
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 size={48} className="text-[#E84E36] animate-spin" />
                          <span className="font-geo-sans text-sm font-bold uppercase tracking-widest text-[#1A1917]">
                            Rendering... {activeViewItem.currentStep}/{activeViewItem.totalSteps}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/10">
                        <div className="h-full bg-[#E84E36] transition-all duration-300 ease-out" style={{ width: `${activeViewItem.progress}%` }} />
                      </div>
                    </div>
                  )}
                  {activeViewItem.status === 'complete' && activeViewItem.url && (
                    <img src={activeViewItem.url} alt="Final Edit" className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 absolute inset-0 m-auto z-30" />
                  )}
                </>
              )}
            </div>

            <GenerationStatusStrip item={activeViewItem} onRetry={handleGenerate} />

            {(!activeViewItem || activeViewItem.status === 'idle' || activeViewItem.status === 'complete') && (
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 border cursor-pointer transition-all ${edit.editUpscaleMode ? 'border-[#E84E36] bg-[#FFF0ED]' : 'border-[#E5E5E5] bg-white hover:border-[#E84E36]'}`} onClick={() => edit.setEditUpscaleMode(!edit.editUpscaleMode)}>
                  <div className="flex items-center gap-3 mb-2"><Maximize2 size={20} className={edit.editUpscaleMode ? 'text-[#E84E36]' : 'text-[#1A1917]'} /><span className="font-bold font-geo-sans text-sm uppercase tracking-widest">Upscale</span></div>
                  <p className="text-[10px] text-[#888] leading-tight">Increase resolution by 2x or 4x with detail enhancement.</p>
                </div>
                <div className={`p-4 border cursor-pointer transition-all ${edit.editInpaintMode ? 'border-[#E84E36] bg-[#FFF0ED]' : 'border-[#E5E5E5] bg-white hover:border-[#E84E36]'}`} onClick={() => edit.setEditInpaintMode(!edit.editInpaintMode)}>
                  <div className="flex items-center gap-3 mb-2"><Brush size={20} className={edit.editInpaintMode ? 'text-[#E84E36]' : 'text-[#1A1917]'} /><span className="font-bold font-geo-sans text-sm uppercase tracking-widest">Inpaint</span></div>
                  <p className="text-[10px] text-[#888] leading-tight">Mask areas to regenerate specific parts of the image.</p>
                </div>
              </div>
            )}
          </div>

          {/* Config Sidebar */}
          <div className="lg:w-[400px] flex flex-col gap-6">
            <div className="bg-white border border-[#E5E5E5] shadow-lg p-6 flex flex-col gap-6 h-fit sticky top-24">
              <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-4">
                <Sliders size={18} className="text-[#E84E36]" />
                <h3 className="font-serif-display italic text-xl text-[#1A1917]">Configuration</h3>
              </div>

              {edit.editInpaintMode && (
                <InpaintControls
                  brushSize={edit.brushSize}
                  onBrushSizeChange={edit.setBrushSize}
                  maskBlur={edit.maskBlur}
                  onMaskBlurChange={edit.setMaskBlur}
                  inpaintArea={edit.inpaintArea}
                  onInpaintAreaChange={edit.setInpaintArea}
                  inpaintPadding={edit.inpaintPadding}
                  onInpaintPaddingChange={edit.setInpaintPadding}
                />
              )}

              {edit.editUpscaleMode && modelStore.upscalers.length > 0 && (
                <div className="bg-[#F0EDFF] border border-[#DCD6F7] p-4 animate-in slide-in-from-top-2 fade-in">
                  <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Upscaler Model</label>
                  <CustomDropdown options={['', ...modelStore.upscalers]} value={edit.upscaleModel} onChange={(val) => edit.setUpscaleModel(val)} />
                </div>
              )}

              <div className="mb-2">
                <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Model Checkpoint</label>
                <CustomDropdown options={modelOptions} value={gen.model} onChange={(val) => gen.updateConfig({ model: val })} />
              </div>

              <div>
                <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2 block">Edit Prompt</label>
                <textarea value={edit.editPrompt} onChange={(e) => edit.setEditPrompt(e.target.value)} className="w-full h-24 bg-[#FAFAFA] border border-[#E5E5E5] p-3 font-geo-sans text-sm text-[#1A1917] placeholder-[#AAA] focus:outline-none focus:border-[#E84E36] resize-none" placeholder="Describe the changes or the scene..." />
              </div>

              <div>
                <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2 block">Negative Prompt</label>
                <textarea value={edit.editNegativePrompt} onChange={(e) => edit.setEditNegativePrompt(e.target.value)} className="w-full h-16 bg-[#FAFAFA] border border-[#E5E5E5] p-3 font-geo-sans text-sm text-[#1A1917] placeholder-[#AAA] focus:outline-none focus:border-[#E84E36] resize-none" placeholder="What to avoid..." />
              </div>

              <div>
                <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">Denoising Strength</label><span className="font-serif-display italic text-[#E84E36]">{edit.editDenoise}</span></div>
                <StyledSlider min={0} max={1} step={0.05} value={edit.editDenoise} onChange={(e) => edit.setEditDenoise(parseFloat(e.target.value))} />
                <p className="text-[10px] text-[#BBB] mt-2 leading-tight">Lower values preserve original image. Higher values allow more creativity.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">Steps</label><span className="font-serif-display italic text-sm text-[#E84E36]">{gen.steps}</span></div>
                  <StyledSlider min={1} max={50} value={gen.steps} onChange={(e) => gen.updateConfig({ steps: Number(e.target.value) })} />
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">CFG</label><span className="font-serif-display italic text-sm text-[#E84E36]">{gen.cfg}</span></div>
                  <StyledSlider min={1} max={20} step={0.5} value={gen.cfg} onChange={(e) => gen.updateConfig({ cfg: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Sampler</label><CustomDropdown options={samplers} value={gen.sampler} onChange={(val) => gen.updateConfig({ sampler: val })} /></div>
                <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Scheduler</label><CustomDropdown options={schedulers} value={gen.scheduler} onChange={(val) => gen.updateConfig({ scheduler: val })} /></div>
              </div>

              <SeedInput seedInput={gen.seedInput} onSeedInputChange={(v) => gen.updateConfig({ seedInput: v })} onRandomize={() => gen.updateConfig({ seedInput: Math.floor(Math.random() * 9999999999).toString() })} />

              <div className="border-t border-[#E5E5E5] pt-6">
                <LoRAPanel {...loraPanelProps} />
              </div>

              <button onClick={handleGenerate} className="w-full py-4 bg-[#1A1917] text-[#EAE6D9] font-bold font-geo-sans uppercase tracking-widest hover:bg-[#E84E36] hover:text-white transition-all shadow-lg mt-auto active:scale-95">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTab;
