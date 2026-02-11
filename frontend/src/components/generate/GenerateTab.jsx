import React, { useCallback } from 'react';
import { Loader2, Hash, Lock, Download, Share2, Info, ScanFace, AlertCircle } from 'lucide-react';
import useGenerationStore from '../../stores/useGenerationStore';
import useUIStore from '../../stores/useUIStore';
import useQueueStore from '../../stores/useQueueStore';
import useModelStore from '../../stores/useModelStore';
import GenerationStatusStrip from '../shared/GenerationStatusStrip';
import PromptSection from './PromptSection';
import ModelCard from './ModelCard';
import FormatCard from './FormatCard';
import LoRAPanel from './LoRAPanel';
import Img2ImgCard from './Img2ImgCard';
import FaceSwapCard from './FaceSwapCard';
import CharacterRefCard from './CharacterRefCard';
import StyleRefCard from './StyleRefCard';
import ControlNetCard from './ControlNetCard';
import HiresFixCard from './HiresFixCard';
import { handleFileUploadToState } from '../../utils/imageUtils';
import { clampFloat } from '../../utils/imageUtils';
import { api } from '../../api';
import useToastStore from '../../stores/useToastStore';
import { PERFORMANCE_PRESETS } from '../../utils/constants';

const GenerateTab = () => {
  // --- Stores ---
  const gen = useGenerationStore();
  const ui = useUIStore();
  const queueStore = useQueueStore();
  const modelStore = useModelStore();

  const activeViewItem = queueStore.getActiveViewItem();

  // --- Model options for dropdowns (filenames from backend or fallback) ---
  const modelOptions = modelStore.models.length > 0 ? modelStore.models : ['None'];
  const vaeOptions = modelStore.vaes.length > 0 ? modelStore.vaes : ['Automatic'];
  const clipModelOptions = modelStore.clipModels.length > 0 ? ['', ...modelStore.clipModels] : [''];
  const loraOptions = modelStore.loras.length > 0 ? ['None', ...modelStore.loras] : ['None'];
  const preprocessorOptions = modelStore.preprocessors;

  // --- Handlers ---
  const handleGenerate = useCallback(async () => {
    const seed = gen.seedInput ? parseInt(gen.seedInput) : gen.randomizeSeed();
    for (let i = 0; i < gen.batchSize; i++) {
      const batchSeed = gen.batchSeedMode === 'increment' ? seed + i : Math.floor(Math.random() * 2147483647);
      const payload = gen.buildPayload(batchSeed);
      const jobId = `job-${Date.now()}-${i}`;

      queueStore.addToQueue({
        id: jobId,
        status: 'queued',
        progress: 0,
        currentStep: 0,
        totalSteps: gen.steps,
        seed: batchSeed,
        prompt: gen.prompt,
        model: gen.model,
        url: null,
        previewUrl: null,
        startTime: Date.now(),
        endTime: null,
        imagePrompting: {
          faceSwap: { enabled: gen.faceSwap.enabled },
        },
      });

      // Submit to backend — send our jobId so WS progress events match
      try {
        const result = await api.generate({ ...payload, seed: batchSeed, jobId });
        if (!result) {
          queueStore.failJob(jobId, 'No response from server');
          useToastStore.getState().error('Generation Failed', 'No response from server');
        }
      } catch (err) {
        const msg = err.message || 'Failed to submit';
        queueStore.failJob(jobId, msg);
        useToastStore.getState().error('Generation Failed', msg);
      }
    }
  }, [gen, queueStore]);

  const saveSeed = useCallback(() => {
    if (activeViewItem?.seed) {
      gen.setSeedInput(String(activeViewItem.seed));
    }
  }, [activeViewItem, gen]);

  const handleDownload = useCallback((url) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrice-${Date.now()}.png`;
    a.click();
  }, []);

  const handleShare = useCallback(async (url) => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Matrice Generation', url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  }, []);

  const handlePerformanceChange = useCallback((mode) => {
    const preset = PERFORMANCE_PRESETS[mode];
    if (!preset) return;
    const { autoLoras, ...config } = preset;
    gen.updateConfig({ performance: mode, ...config });
    gen.setActiveAutoLoras(autoLoras || []);
  }, [gen]);

  // --- File upload helpers ---
  const handleImg2imgUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => gen.updateImg2img({ image: ev.target.result, enabled: true });
    reader.readAsDataURL(file);
  }, [gen]);

  const handleFaceUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => gen.updateFaceSwap({ image: ev.target.result, enabled: true });
    reader.readAsDataURL(file);
  }, [gen]);

  const handleStyleUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => gen.updateStyleRef({ image: ev.target.result, enabled: true });
    reader.readAsDataURL(file);
  }, [gen]);

  const handleStructureUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => gen.updateControlNet({ image: ev.target.result, enabled: true });
    reader.readAsDataURL(file);
  }, [gen]);

  const handleCharacterUpload = useCallback((e, slot) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => gen.setCharacterImage(slot, ev.target.result);
    reader.readAsDataURL(file);
  }, [gen]);

  // --- LoRA panel props ---
  const loraPanelProps = {
    loras: gen.loras,
    loraOptions,
    onAdd: gen.addLora,
    onRemove: () => gen.removeLora(gen.loras.length - 1),
    onUpdateName: (i, val) => gen.updateLora(i, { name: val }),
    onUpdateStrengthModel: (i, val) => gen.updateLora(i, { strengthModel: clampFloat(val, -2.0, 2.0, 1.0) }),
    onUpdateStrengthClip: (i, val) => gen.updateLora(i, { strengthClip: clampFloat(val, -2.0, 2.0, 1.0) }),
    onToggleAdvanced: (i) => gen.updateLora(i, { isAdvancedOpen: !gen.loras[i].isAdvancedOpen }),
    onUpdateDoubleBlocks: (i, val) => gen.updateLora(i, { doubleBlocks: val }),
    onUpdateSingleBlocks: (i, val) => gen.updateLora(i, { singleBlocks: val }),
  };

  // --- GenConfig object for child components ---
  const genConfig = {
    prompt: gen.prompt,
    negativePrompt: gen.negativePrompt,
    model: gen.model,
    vae: gen.vae,
    clipModel1: gen.clipModel1,
    clipModel2: gen.clipModel2,
    clipType: gen.clipType,
    width: gen.width,
    height: gen.height,
    steps: gen.steps,
    cfg: gen.cfg,
    sampler: gen.sampler,
    scheduler: gen.scheduler,
    clipSkip: gen.clipSkip,
    batchSize: gen.batchSize,
    batchSeedMode: gen.batchSeedMode,
    performance: gen.performance,
    hiresFix: gen.hiresFix,
    hiresScale: gen.hiresScale,
    hiresSteps: gen.hiresSteps,
    hiresDenoise: gen.hiresDenoise,
    hiresUpscaleMethod: gen.hiresUpscaleMethod,
  };

  return (
    <>
      {/* Hero Preview */}
      <div className="relative w-full">
        <div className="relative z-10 w-full bg-white shadow-xl torn-edge p-2">
          <div className="w-full h-[600px] bg-[#FAFAFA] relative overflow-hidden flex items-center justify-center group border-4 border-[#B54632]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/paper.png")` }} />

            {(!activeViewItem || activeViewItem.status === 'idle') && (
              <div className="w-full h-full flex items-center justify-center" />
            )}

            {activeViewItem && activeViewItem.status === 'queued' && (
              <div className="w-full h-full flex flex-col items-center justify-center animate-pulse">
                <Loader2 size={48} className="text-[#E84E36] animate-spin mb-4" />
                <span className="font-geo-sans text-sm font-bold uppercase tracking-widest text-[#1A1917]">Waiting in Queue...</span>
              </div>
            )}

            {activeViewItem && activeViewItem.status === 'downloading' && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 animate-pulse">
                <Download size={48} className="text-[#E84E36]" />
                <span className="font-geo-sans text-sm font-bold uppercase tracking-widest text-[#1A1917]">Downloading Required Model...</span>
                <div className="w-64">
                  <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#E84E36] transition-all duration-300 ease-out rounded-full" style={{ width: `${activeViewItem.downloadProgress || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="font-serif-display italic text-xs text-[#888]">{activeViewItem.downloadSizeLabel}</span>
                    <span className="font-mono text-xs text-[#888]">{Math.round(activeViewItem.downloadProgress || 0)}%</span>
                  </div>
                </div>
              </div>
            )}

            {activeViewItem && activeViewItem.status === 'generating' && (
              <div className="relative w-full h-full animate-in fade-in duration-500">
                {activeViewItem.previewUrl ? (
                  <img src={activeViewItem.previewUrl} alt="Generating..." className="w-full h-full object-cover transition-all duration-300 ease-out" style={{ filter: `blur(${Math.max(0, 8 - (activeViewItem.progress / 12))}px)` }} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <Loader2 size={48} className="text-[#E84E36] animate-spin" />
                    <span className="font-geo-sans text-sm font-bold uppercase tracking-widest text-[#1A1917]">
                      Rendering... {activeViewItem.currentStep}/{activeViewItem.totalSteps}
                    </span>
                  </div>
                )}
                {/* Live progress overlay */}
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/10">
                  <div className="h-full bg-[#E84E36] transition-all duration-300 ease-out" style={{ width: `${activeViewItem.progress}%` }} />
                </div>
              </div>
            )}

            {activeViewItem && activeViewItem.status === 'complete' && activeViewItem.url && (
              <div className="relative w-full h-full animate-in fade-in duration-500">
                <img src={activeViewItem.url} alt="Generated Art" className="w-full h-full object-cover" />
              </div>
            )}

            {activeViewItem && activeViewItem.status === 'error' && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
                <AlertCircle size={48} className="text-red-500" />
                <span className="font-geo-sans text-sm font-bold uppercase tracking-widest text-[#1A1917]">Generation Failed</span>
                <p className="font-geo-sans text-xs text-[#888] max-w-md text-center">{activeViewItem.errorMessage || 'An unknown error occurred.'}</p>
                <button onClick={handleGenerate} className="bg-[#1A1917] text-[#EAE6D9] font-bold font-geo-sans uppercase tracking-widest text-xs px-6 py-2 hover:bg-[#E84E36] transition-colors">Try Again</button>
              </div>
            )}
          </div>

          <GenerationStatusStrip item={activeViewItem} onRetry={handleGenerate} />

          {activeViewItem && activeViewItem.status === 'complete' && (
            <div className="px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[#F0F0F0] mt-1 bg-white animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Seed</span>
                <div className="flex items-center gap-2 bg-[#FAFAFA] px-3 py-1.5 border border-[#E5E5E5]">
                  <Hash size={12} className="text-[#888]" />
                  <span className="font-mono text-xs font-bold text-[#1A1917]">{activeViewItem.seed}</span>
                  <div className="h-4 w-px bg-[#E5E5E5]" />
                  <button onClick={saveSeed} className="text-[#BBB] hover:text-[#E84E36] transition-colors" title="Lock this seed"><Lock size={12} /></button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {activeViewItem.imagePrompting?.faceSwap?.enabled && (
                  <div className="flex items-center gap-2 text-[#E84E36] bg-[#FFF0ED] px-3 py-1.5 border border-[#E84E36]/20" title="Face Swap Applied">
                    <ScanFace size={14} />
                    <span className="font-geo-sans text-[9px] font-bold uppercase tracking-widest">Modified</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDownload(activeViewItem.url)} className="p-2 text-[#1A1917] hover:text-[#E84E36] hover:bg-[#FAFAFA] transition-all" title="Download"><Download size={20} /></button>
                  <button onClick={() => handleShare(activeViewItem.url)} className="p-2 text-[#1A1917] hover:text-[#E84E36] hover:bg-[#FAFAFA] transition-all" title="Share"><Share2 size={20} /></button>
                  <button onClick={() => ui.setShowInfoPanel(true)} className="p-2 text-[#1A1917] hover:text-[#E84E36] hover:bg-[#FAFAFA] transition-all" title="Info"><Info size={20} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="absolute -top-4 -right-4 w-full h-full bg-[#DCD6F7] -z-10 torn-edge opacity-60" />
        <div className="absolute -bottom-4 -left-4 w-full h-full bg-[#FFE4E6] -z-20 torn-edge opacity-60" />
      </div>

      {/* Create Button */}
      <div className="w-full flex justify-center">
        <button onClick={handleGenerate} className="w-full md:w-auto md:min-w-[400px] bg-[#E84E36] text-white h-20 shadow-lg hover:bg-[#D43D26] hover:shadow-xl transition-all flex items-center justify-center gap-3 group active:scale-95">
          <span className="font-geo-sans font-bold text-lg tracking-[0.2em] uppercase group-hover:tracking-[0.3em] transition-all">Create</span>
        </button>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col gap-8 w-full">
        {/* Prompt Card */}
        <PromptSection
          prompt={gen.prompt}
          negativePrompt={gen.negativePrompt}
          showNegative={ui.showNegative}
          onUpdatePrompt={(v) => gen.updateConfig({ prompt: v })}
          onUpdateNegativePrompt={(v) => gen.updateConfig({ negativePrompt: v })}
          onToggleNegative={ui.toggleNegative}
        />

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ModelCard
            genConfig={genConfig}
            modelOptions={modelOptions}
            vaeOptions={vaeOptions}
            clipModelOptions={clipModelOptions}
            samplers={modelStore.samplers}
            schedulers={modelStore.schedulers}
            seedInput={gen.seedInput}
            onUpdateGen={gen.updateConfig}
            onSeedInputChange={gen.setSeedInput}
            onRandomizeSeed={gen.randomizeSeed}
            onPerformanceChange={handlePerformanceChange}
          />

          <FormatCard
            genConfig={genConfig}
            showFluxFormats={ui.showFluxFormats}
            onUpdateGen={gen.updateConfig}
            onToggleFluxFormats={ui.toggleFluxFormats}
          />

          {/* LoRA Card */}
          <div className="md:col-span-2 bg-white p-6 shadow-sm border border-[#F0F0F0] relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7] group-hover:bg-[#E84E36] transition-colors" />
            <LoRAPanel {...loraPanelProps} />
          </div>

          {/* Hires Fix */}
          <div className="md:col-span-2">
            <HiresFixCard genConfig={genConfig} onUpdateGen={gen.updateConfig} />
          </div>
        </div>

        {/* Image Prompting Section */}
        <div className="space-y-4">
          <h3 className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#888] mb-2 pl-1">Image Prompting (Advanced)</h3>

          <Img2ImgCard
            isActive={ui.activeImageCard === 'img2img'}
            onToggle={() => ui.setActiveImageCard('img2img')}
            enabled={gen.img2img.enabled}
            image={gen.img2img.image}
            denoise={gen.img2img.denoise}
            onUpdate={gen.updateImg2img}
            onUpload={handleImg2imgUpload}
            onRemove={() => gen.updateImg2img({ image: null, enabled: false })}
          />

          <FaceSwapCard
            isActive={ui.activeImageCard === 'faceswap'}
            onToggle={() => ui.setActiveImageCard('faceswap')}
            enabled={gen.faceSwap.enabled}
            image={gen.faceSwap.image}
            fidelity={gen.faceSwap.fidelity}
            onUpdate={gen.updateFaceSwap}
            onUpload={handleFaceUpload}
            onRemove={() => gen.updateFaceSwap({ image: null, enabled: false })}
          />

          <CharacterRefCard
            isActive={ui.activeImageCard === 'character'}
            onToggle={() => ui.setActiveImageCard('character')}
            enabled={gen.characterRef.enabled}
            images={gen.characterRef.images}
            strength={gen.characterRef.strength}
            startPercent={gen.characterRef.startPercent}
            endPercent={gen.characterRef.endPercent}
            model={gen.characterRef.model}
            ipadapterOptions={modelStore.ipadapterModels}
            onUpdate={gen.updateCharacterRef}
            onUploadImage={handleCharacterUpload}
            onRemoveImage={(slot) => gen.setCharacterImage(slot, null)}
          />

          <StyleRefCard
            isActive={ui.activeImageCard === 'style'}
            onToggle={() => ui.setActiveImageCard('style')}
            enabled={gen.styleRef.enabled}
            image={gen.styleRef.image}
            strength={gen.styleRef.strength}
            startPercent={gen.styleRef.startPercent}
            endPercent={gen.styleRef.endPercent}
            model={gen.styleRef.model}
            ipadapterOptions={modelStore.ipadapterModels}
            onUpdate={gen.updateStyleRef}
            onUpload={handleStyleUpload}
            onRemove={() => gen.updateStyleRef({ image: null, enabled: false })}
          />

          <ControlNetCard
            isActive={ui.activeImageCard === 'canny'}
            onToggle={() => ui.setActiveImageCard('canny')}
            enabled={gen.controlNet.enabled}
            image={gen.controlNet.image}
            preprocessor={gen.controlNet.preprocessor}
            preprocessorOptions={preprocessorOptions}
            model={gen.controlNet.model}
            controlnetOptions={modelStore.controlnets}
            strength={gen.controlNet.strength}
            startPercent={gen.controlNet.startPercent}
            endPercent={gen.controlNet.endPercent}
            onUpdate={gen.updateControlNet}
            onUpload={handleStructureUpload}
            onRemove={() => gen.updateControlNet({ image: null, enabled: false })}
          />
        </div>
      </div>
    </>
  );
};

export default GenerateTab;
