import { create } from 'zustand';
import { api } from '../api';
import {
  FALLBACK_SAMPLERS,
  FALLBACK_SCHEDULERS,
  FALLBACK_CONTROLNET_PREPROCESSORS,
} from '../utils/constants';

const useModelStore = create((set, get) => ({
  // Model lists
  models: [],
  diffusionModels: [],
  loras: [],
  vaes: [],
  samplers: FALLBACK_SAMPLERS,
  schedulers: FALLBACK_SCHEDULERS,
  controlnets: [],
  upscalers: [],
  embeddings: [],
  clipModels: [],
  ipadapterModels: [],
  clipVisionModels: [],
  preprocessors: FALLBACK_CONTROLNET_PREPROCESSORS,

  // Loading state
  isLoading: false,
  error: null,

  // Fetch all model lists from backend
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [
        models,
        diffusionModels,
        loras,
        vaes,
        samplerData,
        controlnets,
        upscalers,
        embeddings,
        clipModels,
        ipadapterModels,
        clipVisionModels,
        preprocessors,
      ] = await Promise.all([
        api.fetchModels().catch(() => []),
        api.fetchDiffusionModels().catch(() => []),
        api.fetchLoras().catch(() => []),
        api.fetchVaes().catch(() => []),
        api.fetchSamplers().catch(() => ({ samplers: FALLBACK_SAMPLERS, schedulers: FALLBACK_SCHEDULERS })),
        api.fetchControlnets().catch(() => []),
        api.fetchUpscalers().catch(() => []),
        api.fetchEmbeddings().catch(() => []),
        api.fetchClipModels().catch(() => []),
        api.fetchIpadapterModels().catch(() => []),
        api.fetchClipVisionModels().catch(() => []),
        api.fetchPreprocessors().catch(() => FALLBACK_CONTROLNET_PREPROCESSORS),
      ]);

      set({
        models,
        diffusionModels,
        loras,
        vaes: ['Automatic', ...vaes],
        samplers: samplerData.samplers?.length > 0 ? samplerData.samplers : FALLBACK_SAMPLERS,
        schedulers: samplerData.schedulers?.length > 0 ? samplerData.schedulers : FALLBACK_SCHEDULERS,
        controlnets,
        upscalers,
        embeddings,
        clipModels,
        ipadapterModels,
        clipVisionModels,
        preprocessors: preprocessors.length > 0 ? preprocessors : FALLBACK_CONTROLNET_PREPROCESSORS,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  // Re-fetch (triggered by Refresh button)
  refresh: () => get().fetchAll(),
}));

export default useModelStore;
