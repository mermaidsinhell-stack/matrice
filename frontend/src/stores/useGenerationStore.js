import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_GEN_CONFIG, DEFAULT_LORA, PERFORMANCE_PRESETS } from '../utils/constants';
import { clampFloat } from '../utils/imageUtils';

const useGenerationStore = create(
  persist(
    (set, get) => ({
      // Core generation config
      ...DEFAULT_GEN_CONFIG,

      // Seed state
      seedInput: '',
      currentSeed: null,

      // LoRAs
      loras: [{ ...DEFAULT_LORA }],

      // Silent auto-LoRAs injected by performance presets (not shown in UI)
      _activeAutoLoras: [],
      setActiveAutoLoras: (loras) => set({ _activeAutoLoras: loras || [] }),

      // Image prompting
      img2img: { enabled: false, image: null, denoise: 0.75 },
      faceSwap: { enabled: false, image: null, fidelity: 0.8 },
      characterRef: { enabled: false, images: [null, null, null, null], strength: 0.8, endPercent: 0.9, model: '', startPercent: 0, noise: 0 },
      styleRef: { enabled: false, image: null, strength: 0.6, model: '', startPercent: 0, endPercent: 1.0, noise: 0 },
      controlNet: { enabled: false, image: null, preprocessor: 'canny', model: '', strength: 1.0, startPercent: 0, endPercent: 0.6 },

      // --- Actions ---

      updateConfig: (updates) => set((state) => ({ ...state, ...updates })),

      setSeedInput: (v) => set({ seedInput: v }),
      setCurrentSeed: (v) => set({ currentSeed: v }),
      randomizeSeed: () => {
        // Clear seedInput → "Random" mode. Each generation will pick a fresh
        // random seed without writing it back, preventing ComfyUI cache hits.
        set({ seedInput: '', currentSeed: null });
      },

      // LoRA management
      addLora: () => set((s) => ({ loras: [...s.loras, { ...DEFAULT_LORA }] })),
      removeLora: (index) => set((s) => {
        const next = s.loras.filter((_, i) => i !== index);
        return { loras: next.length > 0 ? next : [{ ...DEFAULT_LORA }] };
      }),
      updateLora: (index, updates) => set((s) => ({
        loras: s.loras.map((l, i) => i === index ? { ...l, ...updates } : l),
      })),

      // Image prompting
      updateImg2img: (updates) => set((s) => ({ img2img: { ...s.img2img, ...updates } })),
      updateFaceSwap: (updates) => set((s) => ({ faceSwap: { ...s.faceSwap, ...updates } })),
      updateCharacterRef: (updates) => set((s) => ({ characterRef: { ...s.characterRef, ...updates } })),
      updateStyleRef: (updates) => set((s) => ({ styleRef: { ...s.styleRef, ...updates } })),
      updateControlNet: (updates) => set((s) => ({ controlNet: { ...s.controlNet, ...updates } })),

      setCharacterImage: (index, image) => set((s) => {
        const images = [...s.characterRef.images];
        images[index] = image;
        return { characterRef: { ...s.characterRef, images } };
      }),

      // Build the payload for the backend
      buildPayload: (seedOverride) => {
        const s = get();
        // User-visible LoRAs
        const userLoras = s.loras
          .filter((l) => l.name && l.name !== 'None')
          .map((l) => ({
            name: l.name,
            strengthModel: clampFloat(l.strengthModel, -2.0, 2.0, 1.0),
            strengthClip: clampFloat(l.strengthClip, -2.0, 2.0, 1.0),
            ...(l.doubleBlocks ? { doubleBlocks: l.doubleBlocks } : {}),
            ...(l.singleBlocks ? { singleBlocks: l.singleBlocks } : {}),
          }));
        // Silently injected auto-LoRAs from performance presets
        const autoLoras = (s._activeAutoLoras || []).map((l) => ({
          name: l.name,
          strengthModel: l.strengthModel,
          strengthClip: l.strengthClip,
        }));
        const activeLoras = [...autoLoras, ...userLoras];

        return {
          prompt: s.prompt,
          negativePrompt: s.negativePrompt,
          model: s.model,
          vae: s.vae,
          clipModel1: s.clipModel1,
          clipModel2: s.clipModel2,
          clipType: s.clipType,
          width: s.width,
          height: s.height,
          steps: s.steps,
          cfg: s.cfg,
          sampler: s.sampler,
          scheduler: s.scheduler,
          seed: seedOverride,
          clipSkip: s.clipSkip,
          batchSize: s.batchSize,
          performance: s.performance,
          loras: activeLoras,
          hiresFix: s.hiresFix
            ? {
                enabled: true,
                scale: s.hiresScale,
                steps: s.hiresSteps,
                denoise: s.hiresDenoise,
                upscaleMethod: s.hiresUpscaleMethod,
              }
            : { enabled: false },
          img2img: s.img2img.enabled && s.img2img.image
            ? { enabled: true, image: s.img2img.image, denoise: s.img2img.denoise }
            : { enabled: false },
          faceSwap: s.faceSwap.enabled && s.faceSwap.image
            ? { enabled: true, image: s.faceSwap.image, fidelity: s.faceSwap.fidelity }
            : { enabled: false },
          characterRef: s.characterRef.enabled && s.characterRef.images.some(Boolean)
            ? {
                enabled: true,
                images: s.characterRef.images.filter(Boolean),
                strength: s.characterRef.strength,
                endPercent: s.characterRef.endPercent,
                startPercent: s.characterRef.startPercent,
                model: s.characterRef.model,
                noise: s.characterRef.noise,
              }
            : { enabled: false },
          styleRef: s.styleRef.enabled && s.styleRef.image
            ? {
                enabled: true,
                image: s.styleRef.image,
                strength: s.styleRef.strength,
                startPercent: s.styleRef.startPercent,
                endPercent: s.styleRef.endPercent,
                model: s.styleRef.model,
                noise: s.styleRef.noise,
              }
            : { enabled: false },
          controlNets: s.controlNet.enabled && s.controlNet.image
            ? [{
                enabled: true,
                image: s.controlNet.image,
                preprocessor: s.controlNet.preprocessor,
                model: s.controlNet.model,
                strength: s.controlNet.strength,
                startPercent: s.controlNet.startPercent,
                endPercent: s.controlNet.endPercent,
              }]
            : [],
        };
      },

      // Load preset
      loadPreset: (preset) => set((s) => ({
        ...DEFAULT_GEN_CONFIG,
        ...preset.config,
        loras: preset.loras?.length > 0
          ? preset.loras.map((l) => ({ ...DEFAULT_LORA, ...l }))
          : [{ ...DEFAULT_LORA }],
      })),

      // Reset to defaults
      reset: () => set({
        ...DEFAULT_GEN_CONFIG,
        seedInput: '',
        currentSeed: null,
        loras: [{ ...DEFAULT_LORA }],
        _activeAutoLoras: [],
        img2img: { enabled: false, image: null, denoise: 0.75 },
        faceSwap: { enabled: false, image: null, fidelity: 0.8 },
        characterRef: { enabled: false, images: [null, null, null, null], strength: 0.8, endPercent: 0.9, model: '', startPercent: 0, noise: 0 },
        styleRef: { enabled: false, image: null, strength: 0.6, model: '', startPercent: 0, endPercent: 1.0, noise: 0 },
        controlNet: { enabled: false, image: null, preprocessor: 'canny', model: '', strength: 1.0, startPercent: 0, endPercent: 0.6 },
      }),
    }),
    {
      name: 'matrice-generation',
      // On hydration, strip seedInput so it always starts empty ("Random" mode).
      // Old localStorage may still have it from before this fix.
      merge: (persistedState, currentState) => {
        // Destructure out seed fields so they never enter the merged state —
        // seedInput must always start empty ("Random" mode) on page load.
        const { seedInput, currentSeed, ...cleanPersisted } = persistedState || {};
        return { ...currentState, ...cleanPersisted };
      },
      partialize: (state) => ({
        // Core generation settings
        prompt: state.prompt,
        negativePrompt: state.negativePrompt,
        model: state.model,
        vae: state.vae,
        width: state.width,
        height: state.height,
        steps: state.steps,
        cfg: state.cfg,
        sampler: state.sampler,
        scheduler: state.scheduler,
        clipSkip: state.clipSkip,
        batchSize: state.batchSize,
        performance: state.performance,
        clipModel1: state.clipModel1,
        clipModel2: state.clipModel2,
        clipType: state.clipType,
        // NOTE: seedInput is intentionally NOT persisted. An empty seed input
        // means "random seed each generation" — persisting it would cause
        // ComfyUI to cache identical workflows and return the old image.
        // Users lock a specific seed via the Lock button or typing one.
        // HiresFix settings
        hiresFix: state.hiresFix,
        hiresScale: state.hiresScale,
        hiresSteps: state.hiresSteps,
        hiresDenoise: state.hiresDenoise,
        hiresUpscaleMethod: state.hiresUpscaleMethod,
        // LoRAs — persist name and strengths only, strip any image data
        loras: state.loras.map((l) => ({
          name: l.name,
          strengthModel: l.strengthModel,
          strengthClip: l.strengthClip,
          doubleBlocks: l.doubleBlocks,
          singleBlocks: l.singleBlocks,
          isAdvancedOpen: l.isAdvancedOpen,
        })),
      }),
    }
  )
);

export default useGenerationStore;
