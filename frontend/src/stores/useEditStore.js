import { create } from 'zustand';

const useEditStore = create((set, get) => ({
  // Source image
  editImage: null,
  setEditImage: (img) => set({ editImage: img }),

  // Prompt
  editPrompt: '',
  setEditPrompt: (v) => set({ editPrompt: v }),
  editNegativePrompt: '',
  setEditNegativePrompt: (v) => set({ editNegativePrompt: v }),

  // Core settings
  editDenoise: 0.75,
  setEditDenoise: (v) => set({ editDenoise: v }),
  editModel: '',
  setEditModel: (v) => set({ editModel: v }),
  editVae: 'Automatic',
  setEditVae: (v) => set({ editVae: v }),
  editClipModel1: '',
  setEditClipModel1: (v) => set({ editClipModel1: v }),
  editClipModel2: '',
  setEditClipModel2: (v) => set({ editClipModel2: v }),
  editClipType: 'flux',
  setEditClipType: (v) => set({ editClipType: v }),
  editSteps: 25,
  setEditSteps: (v) => set({ editSteps: v }),
  editCfg: 7.0,
  setEditCfg: (v) => set({ editCfg: v }),
  editSampler: 'euler',
  setEditSampler: (v) => set({ editSampler: v }),
  editScheduler: 'normal',
  setEditScheduler: (v) => set({ editScheduler: v }),
  editSeed: -1,
  setEditSeed: (v) => set({ editSeed: v }),

  // LoRAs for edit
  editLoras: [],

  // Mode toggles
  editUpscaleMode: false,
  setEditUpscaleMode: (v) => set({ editUpscaleMode: v, editInpaintMode: v ? false : get().editInpaintMode }),
  editInpaintMode: false,
  setEditInpaintMode: (v) => set({ editInpaintMode: v, editUpscaleMode: v ? false : get().editUpscaleMode }),

  // Upscale settings
  upscaleModel: '',
  setUpscaleModel: (v) => set({ upscaleModel: v }),
  upscaleMethod: 'nearest-exact',
  setUpscaleMethod: (v) => set({ upscaleMethod: v }),

  // Inpaint settings
  brushSize: 40,
  setBrushSize: (v) => set({ brushSize: v }),
  maskBlur: 6,
  setMaskBlur: (v) => set({ maskBlur: v }),
  inpaintArea: 'full', // 'full' or 'masked_only'
  setInpaintArea: (v) => set({ inpaintArea: v }),
  inpaintPadding: 32,
  setInpaintPadding: (v) => set({ inpaintPadding: v }),
  maskData: null,
  setMaskData: (v) => set({ maskData: v }),
  clearMask: () => set({ maskData: null }),

  // Scattering (from original)
  editScattering: false,
  setEditScattering: (v) => set({ editScattering: v }),

  // Build edit payload
  buildPayload: () => {
    const s = get();
    const mode = s.editUpscaleMode ? 'upscale' : s.editInpaintMode ? 'inpaint' : 'img2img';
    return {
      mode,
      image: s.editImage?.name || '',
      mask: s.maskData || '',
      prompt: s.editPrompt,
      negativePrompt: s.editNegativePrompt,
      model: s.editModel,
      vae: s.editVae,
      clipModel1: s.editClipModel1,
      clipModel2: s.editClipModel2,
      clipType: s.editClipType,
      steps: s.editSteps,
      cfg: s.editCfg,
      sampler: s.editSampler,
      scheduler: s.editScheduler,
      seed: s.editSeed,
      denoise: s.editDenoise,
      loras: s.editLoras,
      upscaleModel: s.upscaleModel,
      upscaleMethod: s.upscaleMethod,
      maskBlur: s.maskBlur,
      inpaintArea: s.inpaintArea,
      inpaintPadding: s.inpaintPadding,
    };
  },
}));

export default useEditStore;
