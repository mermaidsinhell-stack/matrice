// Aspect ratios — standard and Flux high-res
export const RATIOS = [
  { label: "1:1", width: 1024, height: 1024 }, { label: "9:7", width: 1152, height: 896 },
  { label: "7:9", width: 896, height: 1152 }, { label: "19:13", width: 1216, height: 832 },
  { label: "13:19", width: 832, height: 1216 }, { label: "7:4", width: 1344, height: 768 },
  { label: "4:7", width: 768, height: 1344 }, { label: "12:5", width: 1536, height: 640 },
  { label: "5:12", width: 640, height: 1536 }, { label: "23:11", width: 1472, height: 704 },
  { label: "11:23", width: 704, height: 1472 }, { label: "17:15", width: 1088, height: 960 },
  { label: "15:17", width: 960, height: 1088 }, { label: "17:14", width: 1088, height: 896 },
  { label: "14:17", width: 896, height: 1088 }, { label: "5:3", width: 1280, height: 768 },
  { label: "3:5", width: 768, height: 1280 }, { label: "2:1", width: 1408, height: 704 },
  { label: "1:2", width: 704, height: 1408 }, { label: "5:2", width: 1600, height: 640 },
  { label: "2:5", width: 640, height: 1600 }, { label: "18:13", width: 1152, height: 832 },
  { label: "13:18", width: 832, height: 1152 }, { label: "21:11", width: 1344, height: 704 },
  { label: "11:21", width: 704, height: 1344 }, { label: "26:9", width: 1664, height: 576 },
  { label: "9:26", width: 576, height: 1664 },
];

export const FLUX_RATIOS = [
  { label: "1:1", width: 1440, height: 1440 }, { label: "3:2", width: 1728, height: 1152 },
  { label: "2:3", width: 1152, height: 1728 }, { label: "4:3", width: 1664, height: 1216 },
  { label: "3:4", width: 1216, height: 1664 }, { label: "16:9", width: 1920, height: 1088 },
  { label: "9:16", width: 1088, height: 1920 }, { label: "21:9", width: 2176, height: 960 },
  { label: "9:21", width: 960, height: 2176 },
];

// Fallback lists — used when backend is unreachable
export const FALLBACK_SAMPLERS = [
  "euler", "euler_ancestral", "heun", "dpm_2", "dpm_2_ancestral", "lms",
  "dpm_fast", "dpm_adaptive", "dpmpp_2s_ancestral", "dpmpp_sde", "dpmpp_2m",
  "dpmpp_2m_sde", "ddim", "uni_pc",
];

export const FALLBACK_SCHEDULERS = [
  "normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform", "beta",
];

export const FALLBACK_CONTROLNET_PREPROCESSORS = [
  "canny", "depth_midas", "depth_zoe", "lineart", "lineart_anime",
  "openpose", "scribble", "softedge", "tile",
];

// Default generation config — single source of truth for shape
export const DEFAULT_GEN_CONFIG = {
  prompt: "",
  negativePrompt: "",
  steps: 20,
  cfg: 3.5,
  width: 1024,
  height: 1024,
  model: "",
  vae: "Automatic",
  clipModel1: "",
  clipModel2: "",
  clipType: "flux",
  sampler: "euler",
  scheduler: "simple",
  batchSize: 1,
  batchSeedMode: "increment",
  performance: "Speed",
  clipSkip: 1,
  hiresFix: false,
  hiresScale: 2.0,
  hiresSteps: 10,
  hiresDenoise: 0.5,
  hiresUpscaleMethod: "nearest-exact",
};

export const DEFAULT_LORA = {
  name: "None",
  strengthModel: 1.0,
  strengthClip: 1.0,
  doubleBlocks: "",
  singleBlocks: "",
  isAdvancedOpen: false,
};

export const LATENT_UPSCALE_METHODS = [
  "nearest-exact", "bilinear", "area", "bicubic", "bislerp",
];

// Performance presets — single source of truth for preset buttons
// autoLoras are injected silently into the payload (invisible to the user)
export const PERFORMANCE_PRESETS = {
  Lightning:        { steps: 4,  cfg: 1.0, sampler: 'euler', scheduler: 'simple' },
  Speed:            { steps: 20, cfg: 3.5, sampler: 'euler', scheduler: 'simple' },
  Quality:          { steps: 40, cfg: 7.0, sampler: 'euler', scheduler: 'normal' },
  'Flux Lightning': {
    steps: 4, cfg: 1.0, sampler: 'euler', scheduler: 'simple',
    autoLoras: [{ name: 'flux1-turbo-alpha.safetensors', strengthModel: 1.0, strengthClip: 1.0 }],
  },
  'Flux Speed': {
    steps: 8, cfg: 1.0, sampler: 'euler', scheduler: 'simple',
    autoLoras: [{ name: 'Hyper-FLUX.1-dev-8steps-lora.safetensors', strengthModel: 0.125, strengthClip: 0.125 }],
  },
};
