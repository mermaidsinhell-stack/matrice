import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Image as ImageIcon, Download, Share2, Info, ChevronDown, Palette, LayoutGrid, Zap, Search, User, Plus, Minus, MoreHorizontal, X, Upload, ScanFace, Layers, PenTool, ChevronRight, Brush, Box, Dices, Hash, Lock, Maximize2, Wand2, Copy, Trash2, ArrowLeft, ArrowRight, Sliders, Check, Calendar as CalendarIcon, ChevronLeft, ImagePlus, Loader2, AlertCircle, ChevronUp, Save, FileJson, Menu } from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================
const RATIOS = [
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
const FLUX_RATIOS = [
  { label: "1:1", width: 1440, height: 1440 }, { label: "3:2", width: 1728, height: 1152 },
  { label: "2:3", width: 1152, height: 1728 }, { label: "4:3", width: 1664, height: 1216 },
  { label: "3:4", width: 1216, height: 1664 }, { label: "16:9", width: 1920, height: 1088 },
  { label: "9:16", width: 1088, height: 1920 }, { label: "21:9", width: 2176, height: 960 },
  { label: "9:21", width: 960, height: 2176 },
];
const MODEL_OPTIONS = ["Flux.1 Dev - 12B", "Flux.1 Schnell - Turbo", "SDXL Base 1.0"];
const VAE_OPTIONS = ["Automatic", "sdxl_vae.safetensors", "ae.safetensors", "sdxl-vae-fp16-fix"];
const LORA_OPTIONS = ["None", "Cyberpunk_v2", "Watercolor_Style", "Pixel_Art_XL", "Bio_Punk_World", "Isometric_Room"];
const SAMPLERS = ["euler", "euler_ancestral", "heun", "dpm_2", "dpm_2_ancestral", "lms", "dpm_fast", "dpm_adaptive", "dpmpp_2s_ancestral", "dpmpp_sde", "dpmpp_2m", "dpmpp_2m_sde", "ddim", "uni_pc"];
const SCHEDULERS = ["normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform", "beta"];
const CONTROLNET_PREPROCESSORS = ["canny", "depth_midas", "depth_zoe", "lineart", "lineart_anime", "openpose", "scribble", "softedge", "tile"];

// Default generation config — single source of truth for shape
const DEFAULT_GEN_CONFIG = {
  prompt: "",
  negativePrompt: "",
  steps: 20,
  cfg: 3.5,
  width: 1024,
  height: 1024,
  model: "Flux.1 Dev - 12B",
  vae: "Automatic",
  sampler: "euler",
  scheduler: "simple",
  batchSize: 1,
  batchSeedMode: "increment", // "increment" | "random"
  performance: "Speed",
  clipSkip: 1,
  hiresFix: false,
  hiresScale: 2.0,
  hiresSteps: 10,
  hiresDenoise: 0.5,
};

const DEFAULT_LORA = { name: "None", strength: 1.0, doubleBlocks: "", singleBlocks: "", isAdvancedOpen: false };

// ============================================================
// API SERVICE LAYER
// ============================================================
// Stub for backend integration. Claude Code will replace these
// with actual ComfyUI WebSocket / REST calls.
//
// The backend should:
//   1. Accept `buildGenerationPayload()` output as the request body
//   2. Return a job ID
//   3. Stream progress via WebSocket: { jobId, step, totalSteps, previewBase64? }
//   4. Return final image URL on completion
// ============================================================
const api = {
  /**
   * POST /api/generate
   * @param {object} payload - Full generation payload from buildGenerationPayload()
   * @returns {Promise<{ jobId: string }>}
   */
  generate: async (payload) => {
    console.log('[API] generate called with payload:', payload);
    // TODO: Replace with actual fetch to ComfyUI backend
    // return fetch('/api/generate', { method: 'POST', body: JSON.stringify(payload) }).then(r => r.json());
    return { jobId: `sim-${Date.now()}` };
  },

  /**
   * POST /api/edit
   * @param {object} payload - Edit payload including source image
   * @returns {Promise<{ jobId: string }>}
   */
  edit: async (payload) => {
    console.log('[API] edit called with payload:', payload);
    return { jobId: `sim-edit-${Date.now()}` };
  },

  /**
   * GET /api/gallery
   * @returns {Promise<Array>}
   */
  fetchGallery: async () => {
    console.log('[API] fetchGallery called');
    return [];
  },

  /**
   * GET /api/loras
   * @returns {Promise<string[]>}
   */
  fetchLoras: async () => {
    console.log('[API] fetchLoras called');
    return LORA_OPTIONS;
  },

  /**
   * GET /api/models
   * @returns {Promise<string[]>}
   */
  fetchModels: async () => {
    console.log('[API] fetchModels called');
    return MODEL_OPTIONS;
  },

  /**
   * Connect to WebSocket for real-time generation progress.
   * @param {string} jobId
   * @param {object} callbacks - { onProgress, onPreview, onComplete, onError }
   * @returns {function} disconnect
   */
  connectJobStream: (jobId, { onProgress, onPreview, onComplete, onError }) => {
    console.log(`[API] connectJobStream for job: ${jobId}`);
    // TODO: Replace with actual WebSocket connection
    // const ws = new WebSocket(`ws://localhost:8188/ws?jobId=${jobId}`);
    // ws.onmessage = (e) => { ... };
    // return () => ws.close();
    return () => {};
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const getSliderStyle = (value, min, max) => {
  let v = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(v)) v = min;
  v = Math.max(min, Math.min(max, v));
  const percent = ((v - min) / (max - min)) * 100;
  return { background: `linear-gradient(to right, #E84E36 0%, #E84E36 ${percent}%, #E5E5E5 ${percent}%, #E5E5E5 100%)` };
};

const normalizeImageShape = (img, overrides = {}) => ({
  id: img.id ?? 'upload-' + Date.now(),
  name: img.name ?? "Untitled",
  url: img.url,
  seed: img.seed ?? null,
  model: img.model ?? null,
  type: img.type ?? "Edit",
  date: img.date ?? new Date().toISOString().split('T')[0],
  ...overrides,
});

const clampFloat = (val, min, max, fallback = min) => {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

// ============================================================
// REUSABLE COMPONENTS
// ============================================================

// --- HISTORY SIDEBAR ---
const HistorySidebar = () => {
  const historyItems = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579783902614-a3fb39279c0f?q=80&w=200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=200&auto=format&fit=crop",
  ];
  return (
    <div className="hidden lg:flex flex-col w-24 border-r border-[#E5E5E5] bg-white h-screen fixed left-0 top-0 z-40 pt-24 items-center gap-6 overflow-y-auto pb-4 custom-scrollbar">
      <div className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917] -rotate-90 whitespace-nowrap mb-4">History</div>
      {historyItems.map((img, i) => (
        <div key={i} className="group relative w-16 h-16 shrink-0 cursor-pointer">
          <img src={img} alt="History" className="w-full h-full object-cover border border-[#E5E5E5] group-hover:border-[#E84E36] transition-colors" />
          <div className="absolute inset-0 bg-[#1A1917]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[8px] text-white font-bold uppercase tracking-widest">Reuse</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- CUSTOM DROPDOWN ---
const CustomDropdown = ({ options, value, onChange, placeholder = "Select option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-3 pr-8 font-geo-sans text-sm font-medium text-[#1A1917] cursor-pointer hover:bg-white transition-colors flex justify-between items-center">
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={16} className={`text-[#1A1917] transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
      </div>
      <div className={`absolute left-0 w-full z-50 bg-white border border-[#E5E5E5] shadow-xl overflow-hidden origin-top transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] transform-gpu ${isOpen ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-95 -translate-y-2 invisible'}`}>
        <div className="py-1 max-h-[300px] overflow-y-auto custom-scrollbar">
          {options.map((option) => (
            <div key={option} onClick={() => { onChange(option); setIsOpen(false); }}
              className={`px-4 py-3 font-geo-sans text-sm font-medium cursor-pointer transition-colors block ${value === option ? 'bg-[#FDFEF5] text-[#E84E36]' : 'text-[#1A1917] hover:bg-[#FAFAFA] hover:text-[#E84E36]'}`}
            >{option}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- STYLED SLIDER ---
const StyledSlider = ({ min, max, step = 1, value, onChange, size = "sm" }) => {
  const thumbClass = size === "lg"
    ? "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5"
    : "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4";
  const trackHeight = size === "lg" ? "h-3" : "h-2";

  return (
    <input
      type="range" min={min} max={max} step={step}
      value={typeof value === 'number' ? value : min}
      onChange={onChange}
      style={getSliderStyle(value, min, max)}
      className={`w-full ${trackHeight} appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none ${thumbClass} [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#E84E36] [&::-webkit-slider-thumb]:shadow-sm hover:[&::-webkit-slider-thumb]:scale-110 transition-all`}
    />
  );
};

// --- TOGGLE SWITCH ---
const ToggleSwitch = ({ enabled, onToggle, disabled = false }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    role="switch"
    aria-checked={enabled}
    className={`w-12 h-6 p-1 transition-colors ${enabled ? 'bg-[#E84E36]' : 'bg-[#E5E5E5]'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div className={`w-4 h-4 bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
  </button>
);

// --- SEED INPUT ---
const SeedInput = ({ seedInput, onSeedInputChange, onRandomize }) => (
  <div>
    <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Seed</label>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BBB]" />
        <input
          type="text" value={seedInput}
          onChange={(e) => {
            // Only allow digits and empty string
            const v = e.target.value;
            if (v === '' || /^\d+$/.test(v)) onSeedInputChange(v);
          }}
          placeholder="Random"
          className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-2 pl-8 font-mono text-sm text-[#1A1917] focus:outline-none focus:border-[#E84E36] transition-colors"
        />
      </div>
      <button onClick={onRandomize} className="bg-[#FAFAFA] border border-[#E5E5E5] p-2 hover:border-[#E84E36] hover:text-[#E84E36] transition-all" title="Randomize Seed">
        <Dices size={18} />
      </button>
    </div>
  </div>
);

// --- LORA PANEL ---
const LoRAPanel = ({ loras, loraOptions, onAdd, onRemove, onUpdateName, onUpdateStrength, onToggleAdvanced, onUpdateDoubleBlocks, onUpdateSingleBlocks }) => (
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
        const strengthValue = clampFloat(lora.strength, -2.0, 2.0, 1.0);
        return (
          <div key={index} className="relative animate-in fade-in slide-in-from-top-2 duration-300 border-b border-[#E5E5E5] pb-6 last:border-0 last:pb-0">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <div className="relative mb-4">
                  <CustomDropdown options={loraOptions} value={lora.name} onChange={(val) => onUpdateName(index, val)} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <StyledSlider min={-2.0} max={2.0} step={0.1} value={strengthValue} onChange={(e) => onUpdateStrength(index, e.target.value)} size="lg" />
                  </div>
                  <input type="number" step="0.1" min="-2" max="2"
                    value={lora.strength}
                    onChange={(e) => onUpdateStrength(index, e.target.value)}
                    onBlur={(e) => {
                      // Normalize on blur — clamp and convert empty to 1.0
                      const clamped = clampFloat(e.target.value, -2.0, 2.0, 1.0);
                      onUpdateStrength(index, clamped);
                    }}
                    className="font-serif-display italic text-sm text-[#E84E36] w-16 text-center bg-[#FAFAFA] border border-[#E5E5E5] focus:border-[#E84E36] outline-none py-1 px-1 transition-colors" />
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

// --- COLLAPSIBLE CARD ---
const CollapsibleCard = ({ title, icon: Icon, isActive, children, onToggle }) => (
  <div className={`border border-[#E5E5E5] bg-white transition-all duration-300 ${isActive ? 'shadow-md' : 'shadow-sm'}`}>
    <button onClick={onToggle} className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${isActive ? 'bg-[#E84E36] text-white' : 'bg-[#F5F5F5] text-[#1A1917]'}`}><Icon size={18} /></div>
        <span className="font-serif-display italic text-xl text-[#1A1917]">{title}</span>
        {isActive && <div className="w-2 h-2 bg-[#E84E36] animate-pulse" />}
      </div>
      <ChevronDown size={18} className={`text-[#1A1917] transition-transform duration-300 ${isActive ? 'rotate-180' : 'rotate-0'}`} />
    </button>
    <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isActive ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
      <div className="p-6 border-t border-[#E5E5E5]">{children}</div>
    </div>
  </div>
);

// --- METADATA DRAWER ---
const MetadataDrawer = ({ isOpen, onClose, item, onReuse }) => {
  if (!item) return null;
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 h-full w-full md:w-[400px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E5E5E5]">
            <h3 className="font-serif-display italic text-2xl text-[#1A1917]">Image Metadata</h3>
            <button onClick={onClose} className="p-2 hover:bg-[#FAFAFA] text-[#1A1917] hover:text-[#E84E36] transition-colors rounded-full"><X size={20} /></button>
          </div>
          <div className="space-y-6 font-geo-sans">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-2">Prompt</label>
              <p className="text-sm text-[#1A1917] leading-relaxed bg-[#FAFAFA] p-3 border border-[#E5E5E5]">{item.prompt || "No prompt data"}</p>
            </div>
            {item.negativePrompt && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-2">Negative Prompt</label>
                <p className="text-sm text-[#888] leading-relaxed bg-[#FAFAFA] p-3 border border-[#E5E5E5]">{item.negativePrompt}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Seed</label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[#E84E36]">{item.seed || "Random"}</span>
                  <button onClick={() => navigator.clipboard.writeText(String(item.seed || ""))} className="text-[#BBB] hover:text-[#1A1917]" title="Copy Seed"><Copy size={12} /></button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Model</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.model || "Unknown"}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Steps</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.steps || 20}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">CFG Scale</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.cfg || 3.5}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Sampler</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.sampler || "euler"}</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-1">Dimensions</label>
                <span className="text-sm text-[#1A1917] font-medium">{item.width} × {item.height}</span>
              </div>
            </div>

            {/* LoRAs used */}
            {item.loras && item.loras.length > 0 && item.loras.some(l => l.name !== "None") && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-2">LoRAs</label>
                <div className="space-y-1">
                  {item.loras.filter(l => l.name !== "None").map((l, i) => (
                    <div key={i} className="flex justify-between text-sm bg-[#FAFAFA] px-3 py-2 border border-[#E5E5E5]">
                      <span className="text-[#1A1917] font-medium">{l.name}</span>
                      <span className="text-[#E84E36] font-mono">{l.strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Prompting flags */}
            {item.imagePrompting && Object.values(item.imagePrompting).some(v => v?.enabled) && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] block mb-2">Image Prompting</label>
                <div className="flex flex-wrap gap-2">
                  {item.imagePrompting.img2img?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">Img2Img</span>}
                  {item.imagePrompting.faceSwap?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">Face Swap</span>}
                  {item.imagePrompting.characterRef?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">Character Ref</span>}
                  {item.imagePrompting.styleRef?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">Style Ref</span>}
                  {item.imagePrompting.controlNet?.enabled && <span className="text-[9px] font-bold bg-[#FFF0ED] text-[#E84E36] px-2 py-1 border border-[#E84E36]/20">ControlNet</span>}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5E5E5]">
              <button onClick={() => onReuse(item)} className="w-full py-3 bg-[#1A1917] text-[#EAE6D9] font-bold uppercase tracking-widest text-xs hover:bg-[#E84E36] hover:text-white transition-all">
                Reuse Parameters
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// --- PRESET MANAGER ---
const PresetManager = ({ isOpen, onClose, currentConfig, currentLoras, onLoad }) => {
  const [presets, setPresets] = useState([
    { name: "Cinematic Portrait", config: { ...DEFAULT_GEN_CONFIG, width: 896, height: 1152, steps: 30, cfg: 4.0, sampler: "dpmpp_2m" }, loras: [{ ...DEFAULT_LORA }] },
    { name: "Pixel Art XL", config: { ...DEFAULT_GEN_CONFIG, width: 1024, height: 1024, steps: 20, cfg: 5.0, sampler: "euler" }, loras: [{ ...DEFAULT_LORA, name: "Pixel_Art_XL", strength: 1.0 }] },
  ]);
  const [newPresetName, setNewPresetName] = useState("");
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!newPresetName.trim()) return;
    setPresets([...presets, { name: newPresetName, config: { ...currentConfig }, loras: currentLoras.map(({ isAdvancedOpen, ...rest }) => ({ ...rest })) }]);
    setNewPresetName("");
  };

  const handleDelete = (index) => {
    setPresets(presets.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className="absolute top-16 right-6 w-80 bg-white border border-[#E5E5E5] shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 p-4">
      <div className="flex items-center justify-between mb-4 border-b border-[#E5E5E5] pb-2">
        <h4 className="font-serif-display italic text-lg text-[#1A1917]">Presets</h4>
        <button onClick={onClose}><X size={16} className="text-[#BBB] hover:text-[#E84E36]" /></button>
      </div>
      <div className="mb-4">
        <label className="text-[9px] font-bold uppercase tracking-widest text-[#888] block mb-2">Save Current State</label>
        <div className="flex gap-2">
          <input type="text" placeholder="Preset Name..." value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="flex-1 bg-[#FAFAFA] border border-[#E5E5E5] px-2 py-1 text-sm font-geo-sans focus:outline-none focus:border-[#E84E36]" />
          <button onClick={handleSave} className="bg-[#1A1917] text-white p-2 hover:bg-[#E84E36] transition-colors"><Save size={14} /></button>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {presets.map((preset, idx) => (
          <div key={idx} className="flex items-center justify-between group p-2 hover:bg-[#FAFAFA] border border-transparent hover:border-[#E5E5E5] transition-all cursor-pointer" onClick={() => onLoad(preset)}>
            <div className="flex items-center gap-2">
              <FileJson size={14} className="text-[#E84E36]" />
              <span className="font-geo-sans text-sm text-[#1A1917] font-medium">{preset.name}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(idx); }} className="text-[#BBB] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
          </div>
        ))}
        {presets.length === 0 && <p className="text-center text-xs text-[#BBB] italic py-4">No saved presets</p>}
      </div>
    </div>
  );
};

// --- CALENDAR WIDGET (was missing — caused crash) ---
const CalendarWidget = ({ selectedDate, onSelectDate, onClose }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(selectedDate ? parseInt(selectedDate.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate ? parseInt(selectedDate.split('-')[1]) - 1 : today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleDayClick = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${m}-${d}`;
    onSelectDate(dateStr);
    onClose();
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`empty-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const ds = String(d).padStart(2, '0');
    const dateStr = `${viewYear}-${m}-${ds}`;
    const isSelected = dateStr === selectedDate;
    const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    cells.push(
      <button key={d} onClick={() => handleDayClick(d)}
        className={`w-8 h-8 text-xs font-geo-sans font-medium transition-all flex items-center justify-center
          ${isSelected ? 'bg-[#E84E36] text-white' : isToday ? 'border border-[#E84E36] text-[#E84E36]' : 'text-[#1A1917] hover:bg-[#FAFAFA]'}`}
      >{d}</button>
    );
  }

  return (
    <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#E5E5E5] shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 hover:bg-[#FAFAFA] text-[#1A1917]"><ChevronLeft size={16} /></button>
        <span className="font-serif-display italic text-sm text-[#1A1917]">{monthNames[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-[#FAFAFA] text-[#1A1917]"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[9px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
      <button onClick={() => { onSelectDate(""); onClose(); }} className="mt-3 w-full text-center text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888] hover:text-[#E84E36] transition-colors py-1">Clear Filter</button>
    </div>
  );
};

// --- GENERATION STATUS STRIP ---
const GenerationStatusStrip = ({ item, onRetry }) => {
  if (!item || item.status === 'idle') return null;
  return (
    <div className="w-full bg-white border-x border-b border-[#E5E5E5] p-4 flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in">
      {item.status === 'queued' && (
        <div className="flex items-center justify-between text-[#888]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#E84E36] rounded-full animate-pulse" />
            <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest">In Queue</span>
          </div>
          <span className="font-serif-display italic text-sm text-[#1A1917]">Waiting for GPU...</span>
        </div>
      )}
      {item.status === 'generating' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[#1A1917]">
            <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-[#E84E36]" /> Generating
            </span>
            <span className="font-serif-display italic text-sm text-[#E84E36]">{item.currentStep}/{item.totalSteps}</span>
          </div>
          <div className="w-full h-1 bg-[#F5F5F5] overflow-hidden">
            <div className="h-full bg-[#E84E36] transition-all duration-300 ease-out" style={{ width: `${item.progress}%` }} />
          </div>
        </div>
      )}
      {item.status === 'error' && (
        <div className="flex items-center justify-between text-red-500">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest">{item.error || "Generation Failed"}</span>
          </div>
          <button onClick={() => onRetry(item)} className="underline font-serif-display italic text-sm hover:text-red-700">Retry</button>
        </div>
      )}
      {item.status === 'complete' && (
        <div className="flex items-center justify-between text-[#1A1917]">
          <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#E84E36] flex items-center gap-2">
            <Check size={12} /> Complete
          </span>
          <span className="font-serif-display italic text-xs text-[#888]">
            {(item.endTime && item.startTime) ? ((item.endTime - item.startTime) / 1000).toFixed(1) : "0.0"}s
          </span>
        </div>
      )}
    </div>
  );
};

// --- BOUNCING BALLS ANIMATION ---
const BouncingBalls = ({ isScattering }) => {
  const canvasRef = useRef(null);
  const scatteringRef = useRef(isScattering);
  useEffect(() => { scatteringRef.current = isScattering; }, [isScattering]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let balls = [];
    const colors = ['#E84E36', '#DCD6F7', '#1A1917', '#B54632'];
    const initBalls = () => {
      balls = [];
      for (let i = 0; i < 20; i++) {
        const radius = Math.random() * 6 + 4;
        balls.push({
          x: Math.random() * (canvas.width - radius * 2) + radius,
          y: Math.random() * (canvas.height - radius * 2) + radius,
          dx: (Math.random() - 0.5) * 3, dy: (Math.random() - 0.5) * 3, radius,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; initBalls(); }
    };
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      balls.forEach(ball => {
        if (scatteringRef.current) {
          const angle = Math.atan2(ball.y - canvas.height / 2, ball.x - canvas.width / 2);
          ball.x += Math.cos(angle) * 25; ball.y += Math.sin(angle) * 25;
        } else {
          ball.x += ball.dx; ball.y += ball.dy;
          if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) ball.dx = -ball.dx;
          if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) ball.dy = -ball.dy;
        }
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color; ctx.fill(); ctx.closePath();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    window.addEventListener('resize', resize); resize(); animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
  }, []);
  return <canvas ref={canvasRef} className="w-full h-full opacity-60 block" />;
};

// --- QUEUE BAR ---
const QueueBar = ({ queue, selectedId, onSelect, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`fixed bottom-0 left-0 w-full bg-[#1A1917] border-t border-[#333] z-50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="h-12 flex items-center justify-between px-6 cursor-pointer hover:bg-[#222] transition-colors border-b border-[#333]">
        <div className="flex items-center gap-3">
          <span className="font-serif-display italic text-[#EAE6D9] text-lg">Generation Queue</span>
          <span className="bg-[#E84E36] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{queue.length}</span>
        </div>
        <div className="text-[#888]">{isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</div>
      </div>
      <div className="h-32 flex items-center px-4 md:px-12 gap-4 overflow-x-auto custom-scrollbar">
        {queue.length === 0 ? (
          <div className="w-full text-center text-[#444] font-geo-sans text-xs uppercase tracking-widest italic">Queue is empty</div>
        ) : (
          queue.map((item) => (
            <div key={item.id} onClick={() => onSelect(item.id)}
              className={`relative w-20 h-20 shrink-0 cursor-pointer group transition-all duration-300 border-2 ${selectedId === item.id ? 'border-[#E84E36] scale-105' : 'border-[#333] hover:border-[#666]'}`}>
              {item.status === 'complete' ? (
                <img src={item.url} alt="Result" className="w-full h-full object-cover" />
              ) : item.status === 'generating' ? (
                <div className="w-full h-full bg-[#222] relative overflow-hidden">
                  {item.previewUrl && <img src={item.previewUrl} alt="" className="w-full h-full object-cover opacity-50 blur-sm" />}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#444]">
                    <div className="h-full bg-[#E84E36] transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ) : item.status === 'error' ? (
                <div className="w-full h-full bg-red-900/20 flex items-center justify-center border border-red-500"><X size={16} className="text-red-500" /></div>
              ) : (
                <div className="w-full h-full bg-[#222] flex items-center justify-center flex-col gap-1">
                  <Loader2 size={12} className="text-[#888] animate-spin-slow" />
                  <span className="text-[8px] text-[#888] font-mono">WAIT</span>
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="absolute -top-2 -right-2 bg-[#E84E36] text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity scale-75"><X size={12} /></button>
              {selectedId === item.id && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#E84E36] rounded-full" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================
const App = () => {
  // --- GENERATION CONFIG ---
  const [genConfig, setGenConfig] = useState({ ...DEFAULT_GEN_CONFIG });
  const updateGen = useCallback((updates) => setGenConfig(prev => ({ ...prev, ...updates })), []);

  // --- SEED STATE ---
  const [seedInput, setSeedInput] = useState("");
  const [currentSeed, setCurrentSeed] = useState(null);

  // --- LORA STATE ---
  const [loras, setLoras] = useState([{ ...DEFAULT_LORA }]);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState("Generate");
  const [showNegative, setShowNegative] = useState(false);
  const [showFluxFormats, setShowFluxFormats] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // --- QUEUE SYSTEM ---
  const [queue, setQueue] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const activeViewItem = useMemo(() => queue.find(item => item.id === selectedQueueId) || null, [queue, selectedQueueId]);

  // --- EDIT TAB STATE ---
  const [editImage, setEditImage] = useState(null);
  const [editPrompt, setEditPrompt] = useState("A high quality photo of...");
  const [editDenoise, setEditDenoise] = useState(0.75);
  const [editUpscaleMode, setEditUpscaleMode] = useState(false);
  const [editInpaintMode, setEditInpaintMode] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [editScattering, setEditScattering] = useState(false);

  // --- GALLERY STATE ---
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryDate, setGalleryDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [galleryPage, setGalleryPage] = useState(1);
  const itemsPerPage = 8;
  const calendarRef = useRef(null);
  const [galleryImages, setGalleryImages] = useState([
    { id: 1, name: "Neon City", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop", seed: 123456, model: "Flux.1 Dev", type: "Generation", date: "2023-10-25" },
    { id: 2, name: "Mountain Edit", url: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=800&auto=format&fit=crop", seed: 987654, model: "SDXL", type: "Edit", date: "2023-10-25" },
    { id: 3, name: "Abstract Flow", url: "https://images.unsplash.com/photo-1579783902614-a3fb39279c0f?q=80&w=800&auto=format&fit=crop", seed: 456789, model: "Flux.1 Schnell", type: "Generation", date: "2023-10-24" },
    { id: 4, name: "Cyber Portrait", url: "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=800&auto=format&fit=crop", seed: 112233, model: "Flux.1 Dev", type: "Edit", date: "2023-10-24" },
    { id: 5, name: "Forest Mist", url: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=800&auto=format&fit=crop", seed: 887766, model: "Flux.1 Dev", type: "Generation", date: "2023-10-24" },
    { id: 6, name: "Desert Dunes", url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=800&auto=format&fit=crop", seed: 554433, model: "Flux.1 Dev", type: "Generation", date: "2023-10-23" },
    { id: 7, name: "Ocean Waves", url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=800&auto=format&fit=crop", seed: 221100, model: "SDXL", type: "Edit", date: "2023-10-23" },
    { id: 8, name: "Space Nebula", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800&auto=format&fit=crop", seed: 778899, model: "Flux.1 Schnell", type: "Generation", date: "2023-10-22" },
    { id: 9, name: "Urban Street", url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=800&auto=format&fit=crop", seed: 998877, model: "Flux.1 Dev", type: "Generation", date: "2023-10-22" },
  ]);
  const [selectedImageIds, setSelectedImageIds] = useState([]);

  // --- IMAGE PROMPTING STATE ---
  const [activeImageCard, setActiveImageCard] = useState(null);

  const [img2imgEnabled, setImg2imgEnabled] = useState(false);
  const [img2imgStrength, setImg2imgStrength] = useState(0.75);
  const [img2imgImage, setImg2imgImage] = useState(null);

  const [faceSwapEnabled, setFaceSwapEnabled] = useState(false);
  const [faceSwapStrength, setFaceSwapStrength] = useState(0.8);
  const [faceImage, setFaceImage] = useState(null);

  const [characterRefEnabled, setCharacterRefEnabled] = useState(false);
  const [characterStrength, setCharacterStrength] = useState(0.8);
  const [characterStop, setCharacterStop] = useState(90);
  const [characterImages, setCharacterImages] = useState([null, null, null, null]);

  const [styleRefEnabled, setStyleRefEnabled] = useState(false);
  const [styleStrength, setStyleStrength] = useState(0.6);
  const [styleImage, setStyleImage] = useState(null);

  const [structureEnabled, setStructureEnabled] = useState(false);
  const [controlNetPreprocessor, setControlNetPreprocessor] = useState("canny");
  const [cannyWeight, setCannyWeight] = useState(1.0);
  const [cannyStop, setCannyStop] = useState(60);
  const [structureImage, setStructureImage] = useState(null);

  // ============================================================
  // PAYLOAD BUILDER
  // ============================================================
  // Assembles the COMPLETE payload that maps to ComfyUI workflow nodes.
  // The backend receives this and translates it to a ComfyUI prompt graph.
  const buildGenerationPayload = useCallback((seedOverride) => {
    const activeLoras = loras.filter(l => l.name !== "None").map(l => ({
      name: l.name,
      strength: clampFloat(l.strength, -2.0, 2.0, 1.0),
      ...(l.doubleBlocks ? { doubleBlocks: l.doubleBlocks } : {}),
      ...(l.singleBlocks ? { singleBlocks: l.singleBlocks } : {}),
    }));

    return {
      // Core
      prompt: genConfig.prompt,
      negativePrompt: genConfig.negativePrompt,
      model: genConfig.model,
      vae: genConfig.vae,
      width: genConfig.width,
      height: genConfig.height,
      steps: genConfig.steps,
      cfg: genConfig.cfg,
      sampler: genConfig.sampler,
      scheduler: genConfig.scheduler,
      seed: seedOverride,
      clipSkip: genConfig.clipSkip,

      // LoRAs
      loras: activeLoras,

      // Hires Fix
      hiresFix: genConfig.hiresFix ? {
        enabled: true,
        scale: genConfig.hiresScale,
        steps: genConfig.hiresSteps,
        denoise: genConfig.hiresDenoise,
      } : { enabled: false },

      // Image Prompting
      imagePrompting: {
        img2img: img2imgEnabled && img2imgImage ? {
          enabled: true,
          image: img2imgImage, // base64
          denoise: img2imgStrength,
        } : { enabled: false },

        faceSwap: faceSwapEnabled && faceImage ? {
          enabled: true,
          image: faceImage,
          strength: faceSwapStrength,
        } : { enabled: false },

        characterRef: characterRefEnabled && characterImages.some(Boolean) ? {
          enabled: true,
          images: characterImages.filter(Boolean),
          weight: characterStrength,
          endPercent: characterStop / 100,
        } : { enabled: false },

        styleRef: styleRefEnabled && styleImage ? {
          enabled: true,
          image: styleImage,
          weight: styleStrength,
        } : { enabled: false },

        controlNet: structureEnabled && structureImage ? {
          enabled: true,
          image: structureImage,
          preprocessor: controlNetPreprocessor,
          strength: cannyWeight,
          endPercent: cannyStop / 100,
        } : { enabled: false },
      },
    };
  }, [genConfig, loras, img2imgEnabled, img2imgImage, img2imgStrength, faceSwapEnabled, faceImage, faceSwapStrength, characterRefEnabled, characterImages, characterStrength, characterStop, styleRefEnabled, styleImage, styleStrength, structureEnabled, structureImage, controlNetPreprocessor, cannyWeight, cannyStop]);

  // ============================================================
  // EFFECTS
  // ============================================================

  // Calendar outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset gallery page on filter change
  useEffect(() => { setGalleryPage(1); }, [gallerySearch, galleryDate]);

  // QUEUE PROCESSOR (simulation — replace with WebSocket in production)
  // FIX: Use functional setState to avoid stale closures on `queue`
  useEffect(() => {
    const timer = setInterval(() => {
      setQueue(prevQueue => {
        // Find first generating item
        const generatingIdx = prevQueue.findIndex(i => i.status === 'generating');

        if (generatingIdx === -1) {
          // No generating item — promote next queued
          const nextIdx = prevQueue.findIndex(i => i.status === 'queued');
          if (nextIdx === -1) return prevQueue; // nothing to do
          const updated = [...prevQueue];
          updated[nextIdx] = { ...updated[nextIdx], status: 'generating', startTime: Date.now() };
          return updated;
        }

        // Tick the generating item
        const updated = [...prevQueue];
        const item = { ...updated[generatingIdx] };
        const nextStep = item.currentStep + 1;

        if (nextStep >= item.totalSteps) {
          item.status = 'complete';
          item.progress = 100;
          item.currentStep = item.totalSteps;
          item.endTime = Date.now();
          // TODO: In production, the URL comes from the WebSocket onComplete callback
          item.url = "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=2070&auto=format&fit=crop";
        } else {
          item.currentStep = nextStep;
          item.progress = Math.floor((nextStep / item.totalSteps) * 100);
          // TODO: In production, preview comes from WebSocket onPreview callback
          item.previewUrl = "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=2070&auto=format&fit=crop";
        }

        updated[generatingIdx] = item;
        return updated;
      });
    }, 150);

    return () => clearInterval(timer);
  }, []); // Empty deps — setQueue functional form avoids stale closures

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleLoadPreset = useCallback((preset) => {
    // Merge preset config with defaults to ensure all fields exist
    setGenConfig({ ...DEFAULT_GEN_CONFIG, ...preset.config });
    setLoras(preset.loras && preset.loras.length > 0 ? preset.loras.map(l => ({ ...DEFAULT_LORA, ...l })) : [{ ...DEFAULT_LORA }]);
    setShowPresetMenu(false);
  }, []);

  const handleReuseParameters = useCallback((item) => {
    setGenConfig(prev => ({
      ...prev,
      prompt: item.prompt || prev.prompt,
      negativePrompt: item.negativePrompt || prev.negativePrompt,
      steps: item.steps || prev.steps,
      cfg: item.cfg || prev.cfg,
      width: item.width || prev.width,
      height: item.height || prev.height,
      model: item.model || prev.model,
      sampler: item.sampler || prev.sampler,
    }));
    if (item.seed) setSeedInput(item.seed.toString());
    if (item.loras && item.loras.length > 0) setLoras(item.loras.map(l => ({ ...DEFAULT_LORA, ...l })));
    setShowInfoPanel(false);
  }, []);

  const handleDownload = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `matrice-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = (url) => {
    navigator.clipboard.writeText(url);
  };

  const handleGenerate = useCallback(() => {
    const clean = seedInput ? seedInput.toString().trim() : "";
    const baseSeed = (!clean || isNaN(parseInt(clean)))
      ? Math.floor(Math.random() * 9999999999)
      : parseInt(clean);

    // FIX: Respect batchSize — create N queue items with sequential or random seeds
    const newItems = [];
    for (let i = 0; i < genConfig.batchSize; i++) {
      const effectiveSeed = i === 0 ? baseSeed
        : genConfig.batchSeedMode === 'increment' ? baseSeed + i
        : Math.floor(Math.random() * 9999999999);

      const payload = buildGenerationPayload(effectiveSeed);

      newItems.push({
        id: Date.now() + i,
        status: 'queued',
        progress: 0,
        currentStep: 0,
        totalSteps: genConfig.steps,
        previewUrl: null,
        url: null,
        startTime: null,
        endTime: null,
        error: null,
        // Snapshot all params for metadata drawer
        ...payload,
      });
    }

    setQueue(prev => [...prev, ...newItems]);
    setSelectedQueueId(newItems[0].id);
    setCurrentSeed(baseSeed);

    // Call API (non-blocking — in production this kicks off the ComfyUI workflow)
    newItems.forEach(item => {
      api.generate(item).catch(err => {
        console.error('[API] generate failed:', err);
        setQueue(q => q.map(qi => qi.id === item.id ? { ...qi, status: 'error', error: err.message } : qi));
      });
    });
  }, [seedInput, genConfig, buildGenerationPayload]);

  const handleQueueDelete = useCallback((id) => {
    setQueue(prev => prev.filter(i => i.id !== id));
    setSelectedQueueId(prev => prev === id ? null : prev);
  }, []);

  const saveSeed = () => { if (currentSeed) setSeedInput(currentSeed.toString()); };

  const handlePerformanceChange = (mode) => {
    const stepMap = { Lightning: 8, Speed: 20, Quality: 40 };
    updateGen({ performance: mode, steps: stepMap[mode] ?? 20 });
  };

  const randomizeSeed = () => setSeedInput(Math.floor(Math.random() * 9999999999).toString());

  const handleFileUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setter(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCharacterUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImages = [...characterImages];
        newImages[index] = event.target.result;
        setCharacterImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCharacterImage = (index) => {
    const newImages = [...characterImages];
    newImages[index] = null;
    setCharacterImages(newImages);
    if (newImages.every(img => img === null)) setCharacterRefEnabled(false);
  };

  const removeImage = (setter, toggleSetter) => {
    setter(null);
    if (toggleSetter) toggleSetter(false);
  };

  // LoRA handlers
  const handleAddLora = () => setLoras([...loras, { ...DEFAULT_LORA }]);
  const handleRemoveLora = () => { if (loras.length > 1) setLoras(loras.slice(0, -1)); };
  const handleUpdateLoraName = (i, val) => { const n = [...loras]; n[i] = { ...n[i], name: val }; setLoras(n); };
  const handleUpdateLoraStrength = (i, val) => {
    const n = [...loras];
    n[i] = { ...n[i], strength: val === '' ? '' : parseFloat(val) };
    setLoras(n);
  };
  const handleToggleLoraAdvanced = (i) => { const n = [...loras]; n[i] = { ...n[i], isAdvancedOpen: !n[i].isAdvancedOpen }; setLoras(n); };
  const handleUpdateLoraDoubleBlocks = (i, val) => { const n = [...loras]; n[i] = { ...n[i], doubleBlocks: val }; setLoras(n); };
  const handleUpdateLoraSingleBlocks = (i, val) => { const n = [...loras]; n[i] = { ...n[i], singleBlocks: val }; setLoras(n); };

  const loraPanelProps = {
    loras, loraOptions: LORA_OPTIONS,
    onAdd: handleAddLora, onRemove: handleRemoveLora,
    onUpdateName: handleUpdateLoraName, onUpdateStrength: handleUpdateLoraStrength,
    onToggleAdvanced: handleToggleLoraAdvanced,
    onUpdateDoubleBlocks: handleUpdateLoraDoubleBlocks, onUpdateSingleBlocks: handleUpdateLoraSingleBlocks,
  };

  // Edit tab
  const handleDeviceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditScattering(true);
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setEditImage(normalizeImageShape({ url: event.target.result }, { name: file.name, seed: "Imported", model: "Imported" }));
          setEditScattering(false);
        };
        reader.readAsDataURL(file);
      }, 800);
    }
  };

  // Gallery handlers
  const toggleImageSelection = (id) => setSelectedImageIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const getSelectedImages = () => galleryImages.filter(img => selectedImageIds.includes(img.id));

  const handleDeleteSelected = () => {
    setGalleryImages(galleryImages.filter(img => !selectedImageIds.includes(img.id)));
    setSelectedImageIds([]);
  };

  const handleSendToEditor = () => {
    if (selectedImageIds.length === 1) {
      const img = getSelectedImages()[0];
      setEditImage(normalizeImageShape(img));
      // FIX: Carry over full config, not just seed
      if (img.seed != null) setSeedInput(img.seed.toString());
      if (img.model) updateGen({ model: img.model });
      setActiveTab('Edit');
      setSelectedImageIds([]);
    }
  };

  const filteredGallery = useMemo(() => galleryImages.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(gallerySearch.toLowerCase()) || img.seed.toString().includes(gallerySearch);
    const matchesDate = galleryDate ? img.date === galleryDate : true;
    return matchesSearch && matchesDate;
  }), [galleryImages, gallerySearch, galleryDate]);

  const totalPages = Math.ceil(filteredGallery.length / itemsPerPage);
  const currentGalleryPage = filteredGallery.slice((galleryPage - 1) * itemsPerPage, galleryPage * itemsPerPage);

  const groupedImages = useMemo(() => currentGalleryPage.reduce((groups, img) => {
    const date = img.date || "Unknown";
    if (!groups[date]) groups[date] = [];
    groups[date].push(img);
    return groups;
  }, {}), [currentGalleryPage]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-[#FDFEF5] font-sans selection:bg-[#E84E36] selection:text-white pb-32 relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap');
        .font-serif-display { font-family: 'Playfair Display', serif; }
        .font-geo-sans { font-family: 'Jost', sans-serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1A1917; }
        ::-webkit-scrollbar-thumb { background: #444; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1A1917; }
        .torn-edge { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 98% 99%, 96% 100%, 94% 99%, 92% 100%, 90% 99%, 88% 100%, 86% 99%, 84% 100%, 82% 99%, 80% 100%, 78% 99%, 76% 100%, 74% 99%, 72% 100%, 70% 99%, 68% 100%, 66% 99%, 64% 100%, 62% 99%, 60% 100%, 58% 99%, 56% 100%, 54% 99%, 52% 100%, 50% 99%, 48% 100%, 46% 99%, 44% 100%, 42% 99%, 40% 100%, 38% 99%, 36% 100%, 34% 99%, 32% 100%, 30% 99%, 28% 100%, 26% 99%, 24% 100%, 22% 99%, 20% 100%, 18% 99%, 16% 100%, 14% 99%, 12% 100%, 10% 99%, 8% 100%, 6% 99%, 4% 100%, 2% 99%, 0% 100%); }
        .squiggle-bg { background-image: url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10' stroke='%23DCD6F7' fill='none' stroke-width='4'/%3E%3C/svg%3E"); background-repeat: repeat-x; background-position: bottom; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Top Decorative Bar */}
      <div className="bg-[#B54632] w-full h-3 fixed top-0 z-50" />

      {/* Navigation */}
      <nav className="bg-[#FDFEF5] px-6 py-6 flex items-center justify-between sticky top-0 z-40 border-b border-[#E5E5E5] lg:pl-28 transition-all">
        <div className="flex items-center gap-12">
          <div className="font-serif-display font-black text-4xl tracking-tight text-[#1A1917]">Matrice</div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-8">
            {[{ name: 'Generate', icon: Zap }, { name: 'Edit', icon: Wand2 }, { name: 'Gallery', icon: LayoutGrid }].map((item) => (
              <button key={item.name} onClick={() => setActiveTab(item.name)} className={`font-geo-sans text-xs font-bold uppercase tracking-widest transition-all relative group ${activeTab === item.name ? 'text-[#E84E36]' : 'text-[#1A1917] hover:text-[#E84E36]'}`}>
                {item.name}
                <span className={`absolute -bottom-2 left-0 h-0.5 bg-[#E84E36] transition-all duration-300 ${activeTab === item.name ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </button>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <button className="md:hidden p-2 text-[#1A1917]" onClick={() => setShowMobileNav(!showMobileNav)}><Menu size={24} /></button>
        </div>
        <div className="flex items-center gap-6 text-[#1A1917] relative">
          <button onClick={() => setShowPresetMenu(!showPresetMenu)} className={`flex items-center gap-2 font-geo-sans text-xs font-bold uppercase tracking-widest transition-colors ${showPresetMenu ? 'text-[#E84E36]' : 'hover:text-[#E84E36]'}`}>Presets</button>
          <PresetManager isOpen={showPresetMenu} onClose={() => setShowPresetMenu(false)} currentConfig={genConfig} currentLoras={loras} onLoad={handleLoadPreset} />
        </div>
      </nav>

      {/* Mobile Nav Dropdown */}
      {showMobileNav && (
        <div className="md:hidden fixed top-[72px] left-0 w-full bg-white border-b border-[#E5E5E5] z-40 animate-in slide-in-from-top-2 fade-in shadow-lg">
          {['Generate', 'Edit', 'Gallery'].map((name) => (
            <button key={name} onClick={() => { setActiveTab(name); setShowMobileNav(false); }}
              className={`w-full px-6 py-4 text-left font-geo-sans text-sm font-bold uppercase tracking-widest transition-colors border-b border-[#F0F0F0] ${activeTab === name ? 'text-[#E84E36] bg-[#FFF0ED]' : 'text-[#1A1917] hover:bg-[#FAFAFA]'}`}>{name}</button>
          ))}
        </div>
      )}

      <HistorySidebar />
      <MetadataDrawer isOpen={showInfoPanel} onClose={() => setShowInfoPanel(false)} item={activeViewItem} onReuse={handleReuseParameters} />

      {/* Main Container */}
      <div className="max-w-5xl mx-auto p-4 md:p-12 relative flex flex-col gap-10 lg:pl-24 transition-all">
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-[#FFE4E6] rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10 pointer-events-none animate-pulse" />

        {/* ====================== GENERATE TAB ====================== */}
        {activeTab === 'Generate' && (
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

                  {activeViewItem && activeViewItem.status === 'generating' && activeViewItem.previewUrl && (
                    <div className="relative w-full h-full animate-in fade-in duration-500">
                      <img src={activeViewItem.previewUrl} alt="Generating..." className="w-full h-full object-cover transition-all duration-300 ease-out" style={{ filter: `blur(${Math.max(0, 10 - (activeViewItem.currentStep / 2))}px)` }} />
                    </div>
                  )}

                  {activeViewItem && activeViewItem.status === 'complete' && activeViewItem.url && (
                    <div className="relative w-full h-full animate-in fade-in duration-500">
                      <img src={activeViewItem.url} alt="Generated Art" className="w-full h-full object-cover" />
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
                        <button onClick={() => setShowInfoPanel(true)} className="p-2 text-[#1A1917] hover:text-[#E84E36] hover:bg-[#FAFAFA] transition-all" title="Info"><Info size={20} /></button>
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
              <div className="bg-white p-6 shadow-sm border border-[#F0F0F0] relative transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7]" />
                <label className="font-serif-display italic text-2xl text-[#1A1917] mb-4 block">The Vision</label>
                <textarea value={genConfig.prompt} onChange={(e) => updateGen({ prompt: e.target.value })} placeholder="Describe your scene..." className="w-full h-32 bg-[#FAFAFA] border border-[#E5E5E5] p-4 font-geo-sans text-base text-[#1A1917] placeholder-[#AAA] focus:outline-none focus:border-[#E84E36] focus:bg-white transition-all resize-none mb-2" />
                <div className="border-t border-[#E5E5E5] pt-2">
                  <button onClick={() => setShowNegative(!showNegative)} className="flex items-center gap-2 text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888] hover:text-[#E84E36] transition-colors">
                    <ChevronRight size={12} className={`transition-transform ${showNegative ? 'rotate-90' : ''}`} /> Negative Prompt
                  </button>
                  {showNegative && (
                    <textarea value={genConfig.negativePrompt} onChange={(e) => updateGen({ negativePrompt: e.target.value })} placeholder="Things to avoid (e.g. low quality, blurry)..." className="w-full h-20 bg-[#FAFAFA] border border-[#E5E5E5] p-3 mt-2 font-geo-sans text-sm text-[#1A1917] placeholder-[#AAA] focus:outline-none focus:border-[#E84E36] focus:bg-white transition-all resize-none animate-in fade-in slide-in-from-top-1" />
                  )}
                </div>
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Model Checkpoint Card */}
                <div className="bg-white p-6 shadow-sm border border-[#F0F0F0] relative group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7] group-hover:bg-[#E84E36] transition-colors" />
                  <label className="font-serif-display italic text-2xl text-[#1A1917] mb-6 block">Model Checkpoint</label>

                  <div className="mb-4">
                    <CustomDropdown options={MODEL_OPTIONS} value={genConfig.model} onChange={(val) => updateGen({ model: val })} />
                  </div>

                  {/* VAE Selection */}
                  <div className="mb-4">
                    <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">VAE</label>
                    <CustomDropdown options={VAE_OPTIONS} value={genConfig.vae} onChange={(val) => updateGen({ vae: val })} />
                  </div>

                  {/* Performance Toggle */}
                  <div className="mb-6">
                    <div className="flex bg-[#FAFAFA] p-1 border border-[#E5E5E5] w-fit">
                      {['Lightning', 'Speed', 'Quality'].map((mode) => (
                        <button key={mode} onClick={() => handlePerformanceChange(mode)} className={`px-4 py-2 text-[10px] font-bold font-geo-sans uppercase tracking-widest transition-all ${genConfig.performance === mode ? 'bg-white text-[#E84E36] shadow-sm' : 'text-[#888] hover:text-[#1A1917]'}`}>{mode}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Image Count</label><span className="font-serif-display italic text-lg text-[#E84E36]">{genConfig.batchSize}</span></div>
                    <StyledSlider min={1} max={4} step={1} value={genConfig.batchSize} onChange={(e) => updateGen({ batchSize: parseInt(e.target.value) })} size="lg" />
                    {genConfig.batchSize > 1 && (
                      <div className="flex items-center gap-4 mt-2">
                        <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888]">Batch Seed</label>
                        <div className="flex bg-[#FAFAFA] border border-[#E5E5E5]">
                          {['increment', 'random'].map(mode => (
                            <button key={mode} onClick={() => updateGen({ batchSeedMode: mode })} className={`px-3 py-1 text-[9px] font-bold font-geo-sans uppercase tracking-widest transition-all ${genConfig.batchSeedMode === mode ? 'bg-white text-[#E84E36] shadow-sm' : 'text-[#888]'}`}>{mode}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">Steps</label><span className="font-serif-display italic text-sm text-[#E84E36]">{genConfig.steps}</span></div>
                      <StyledSlider min={1} max={50} value={genConfig.steps} onChange={(e) => updateGen({ steps: Number(e.target.value) })} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">CFG</label><span className="font-serif-display italic text-sm text-[#E84E36]">{genConfig.cfg}</span></div>
                      <StyledSlider min={1} max={20} step={0.5} value={genConfig.cfg} onChange={(e) => updateGen({ cfg: Number(e.target.value) })} />
                    </div>
                  </div>

                  {/* CLIP Skip */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">CLIP Skip</label><span className="font-serif-display italic text-sm text-[#E84E36]">{genConfig.clipSkip}</span></div>
                    <StyledSlider min={1} max={12} step={1} value={genConfig.clipSkip} onChange={(e) => updateGen({ clipSkip: Number(e.target.value) })} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Sampler</label><CustomDropdown options={SAMPLERS} value={genConfig.sampler} onChange={(val) => updateGen({ sampler: val })} /></div>
                    <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Scheduler</label><CustomDropdown options={SCHEDULERS} value={genConfig.scheduler} onChange={(val) => updateGen({ scheduler: val })} /></div>
                  </div>

                  <SeedInput seedInput={seedInput} onSeedInputChange={setSeedInput} onRandomize={randomizeSeed} />

                  {/* Hires Fix */}
                  <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
                    <div className="flex items-center justify-between mb-4">
                      <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Hires Fix (2-Pass)</label>
                      <ToggleSwitch enabled={genConfig.hiresFix} onToggle={() => updateGen({ hiresFix: !genConfig.hiresFix })} />
                    </div>
                    {genConfig.hiresFix && (
                      <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-1">
                        <div>
                          <div className="flex justify-between mb-1"><label className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888]">Scale</label><span className="font-serif-display italic text-xs text-[#E84E36]">{genConfig.hiresScale}x</span></div>
                          <StyledSlider min={1.5} max={4} step={0.5} value={genConfig.hiresScale} onChange={(e) => updateGen({ hiresScale: Number(e.target.value) })} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1"><label className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888]">Steps</label><span className="font-serif-display italic text-xs text-[#E84E36]">{genConfig.hiresSteps}</span></div>
                          <StyledSlider min={1} max={30} value={genConfig.hiresSteps} onChange={(e) => updateGen({ hiresSteps: Number(e.target.value) })} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1"><label className="font-geo-sans text-[9px] font-bold uppercase tracking-widest text-[#888]">Denoise</label><span className="font-serif-display italic text-xs text-[#E84E36]">{genConfig.hiresDenoise}</span></div>
                          <StyledSlider min={0} max={1} step={0.05} value={genConfig.hiresDenoise} onChange={(e) => updateGen({ hiresDenoise: Number(e.target.value) })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dimensions Card */}
                <div className="bg-white p-6 shadow-sm border border-[#F0F0F0] relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7]" />
                  <label className="font-serif-display italic text-2xl text-[#1A1917] mb-4 block">Format</label>
                  <div className="flex flex-wrap gap-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {RATIOS.map((r, i) => (
                      <button key={i} onClick={() => updateGen({ width: r.width, height: r.height })} className={`px-4 py-3 text-[10px] font-bold font-geo-sans uppercase tracking-widest transition-all border shrink-0 ${genConfig.width === r.width && genConfig.height === r.height ? 'bg-[#1A1917] text-white border-[#1A1917]' : 'bg-transparent text-[#1A1917] border-[#E5E5E5] hover:border-[#E84E36] hover:text-[#E84E36]'}`}>{r.label}</button>
                    ))}
                    <button onClick={() => setShowFluxFormats(!showFluxFormats)} className={`px-4 py-3 text-[10px] font-bold font-geo-sans uppercase tracking-widest transition-all border shrink-0 flex items-center justify-center ${showFluxFormats ? 'bg-[#E84E36] text-white border-[#E84E36]' : 'bg-transparent text-[#1A1917] border-[#E5E5E5] hover:border-[#E84E36] hover:text-[#E84E36]'}`} title="Toggle Flux High-Res Formats"><MoreHorizontal size={14} /></button>
                  </div>
                  {showFluxFormats && (
                    <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
                      <h4 className="font-serif-display italic text-lg text-[#1A1917] mb-2 border-t border-[#E5E5E5] pt-4">Flux High-Res</h4>
                      <div className="flex flex-wrap gap-2">
                        {FLUX_RATIOS.map((r, i) => (
                          <button key={i} onClick={() => updateGen({ width: r.width, height: r.height })} className={`px-4 py-3 text-[10px] font-bold font-geo-sans uppercase tracking-widest transition-all border shrink-0 ${genConfig.width === r.width && genConfig.height === r.height ? 'bg-[#1A1917] text-white border-[#1A1917]' : 'bg-transparent text-[#1A1917] border-[#E5E5E5] hover:border-[#E84E36] hover:text-[#E84E36]'}`}>{r.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Width</label><input type="number" value={genConfig.width} onChange={(e) => updateGen({ width: Number(e.target.value) })} className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-2 font-geo-sans text-sm font-medium text-[#1A1917] focus:outline-none focus:border-[#E84E36] transition-colors" /></div>
                    <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Height</label><input type="number" value={genConfig.height} onChange={(e) => updateGen({ height: Number(e.target.value) })} className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-2 font-geo-sans text-sm font-medium text-[#1A1917] focus:outline-none focus:border-[#E84E36] transition-colors" /></div>
                  </div>
                </div>

                {/* LoRA Card */}
                <div className="md:col-span-2 bg-white p-6 shadow-sm border border-[#F0F0F0] relative group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#DCD6F7] group-hover:bg-[#E84E36] transition-colors" />
                  <LoRAPanel {...loraPanelProps} />
                </div>
              </div>

              {/* Image Prompting Section */}
              <div className="space-y-4">
                <h3 className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#888] mb-2 pl-1">Image Prompting (Advanced)</h3>

                {/* Image to Image */}
                <CollapsibleCard title="Image to Image" icon={ImagePlus} isActive={activeImageCard === 'img2img'} onToggle={() => setActiveImageCard(activeImageCard === 'img2img' ? null : 'img2img')}>
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable Img2Img</label>
                      <ToggleSwitch enabled={img2imgEnabled} onToggle={() => img2imgImage && setImg2imgEnabled(!img2imgEnabled)} disabled={!img2imgImage} />
                    </div>
                    <div onClick={() => !img2imgImage && document.getElementById('img2img-upload').click()} className="w-48 h-48 mx-auto bg-[#FAFAFA] border-2 border-dashed border-[#E5E5E5] flex items-center justify-center cursor-pointer hover:border-[#E84E36] transition-colors relative overflow-hidden group/img2img">
                      <input id="img2img-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setImg2imgImage)} />
                      {img2imgImage ? (
                        <>
                          <img src={img2imgImage} alt="Img2Img" className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); removeImage(setImg2imgImage, setImg2imgEnabled); }} className="absolute top-2 right-2 bg-white/90 p-2 text-[#E84E36] opacity-0 group-hover/img2img:opacity-100 transition-opacity shadow-md"><X size={16} /></button>
                        </>
                      ) : (
                        <div className="text-center group-hover/img2img:scale-105 transition-transform pointer-events-none"><ImageIcon size={24} className="mx-auto mb-2 text-[#BBB]" /><span className="text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">Upload Source Image</span></div>
                      )}
                    </div>
                    <div className={`transition-opacity duration-300 ${img2imgEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Denoising Strength</label><span className="font-serif-display italic text-[#E84E36]">{img2imgStrength}</span></div>
                      <StyledSlider min={0} max={1} step={0.05} value={img2imgStrength} onChange={(e) => setImg2imgStrength(parseFloat(e.target.value))} />
                    </div>
                  </div>
                </CollapsibleCard>

                {/* Face Swap */}
                <CollapsibleCard title="Face Swap" icon={ScanFace} isActive={activeImageCard === 'faceswap'} onToggle={() => setActiveImageCard(activeImageCard === 'faceswap' ? null : 'faceswap')}>
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div onClick={() => !faceImage && document.getElementById('face-upload').click()} className={`relative w-48 h-48 border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all group/upload ${faceSwapEnabled ? 'border-[#E84E36] bg-white' : 'border-[#E5E5E5] bg-[#FAFAFA] grayscale'}`}>
                      <input id="face-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setFaceImage)} />
                      {faceImage ? (
                        <>
                          <img src={faceImage} alt="Face" className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); removeImage(setFaceImage, setFaceSwapEnabled); }} className="absolute inset-0 bg-black/50 opacity-0 group-hover/upload:opacity-100 transition-opacity flex items-center justify-center text-white"><X size={24} /></button>
                        </>
                      ) : (
                        <div className="text-center pointer-events-none"><Upload size={24} className={`mx-auto mb-1 ${faceSwapEnabled ? 'text-[#E84E36]' : 'text-[#BBB]'}`} /><span className="text-[9px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">Upload Face</span></div>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-6">
                      <div className="flex items-center justify-between">
                        <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable Face Swap</label>
                        <ToggleSwitch enabled={faceSwapEnabled} onToggle={() => faceImage && setFaceSwapEnabled(!faceSwapEnabled)} disabled={!faceImage} />
                      </div>
                      <div className={`transition-opacity duration-300 ${faceSwapEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Denoising Strength</label><span className="font-serif-display italic text-[#E84E36]">{faceSwapStrength}</span></div>
                        <StyledSlider min={0} max={1} step={0.05} value={faceSwapStrength} onChange={(e) => setFaceSwapStrength(parseFloat(e.target.value))} />
                      </div>
                    </div>
                  </div>
                </CollapsibleCard>

                {/* Character Ref */}
                <CollapsibleCard title="Character Ref" icon={User} isActive={activeImageCard === 'character'} onToggle={() => setActiveImageCard(activeImageCard === 'character' ? null : 'character')}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable Character Ref</label>
                      <ToggleSwitch enabled={characterRefEnabled} onToggle={() => characterImages.some(Boolean) && setCharacterRefEnabled(!characterRefEnabled)} disabled={!characterImages.some(Boolean)} />
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                      {characterImages.map((img, slot) => (
                        <div key={slot} onClick={() => !img && document.getElementById(`char-upload-${slot}`).click()} className={`relative w-32 h-32 shrink-0 bg-[#FAFAFA] border-2 border-dashed border-[#E5E5E5] flex flex-col items-center justify-center cursor-pointer hover:border-[#E84E36] hover:bg-[#FFF0ED] transition-colors snap-start overflow-hidden group/char ${img ? 'border-solid border-[#E84E36]' : ''}`}>
                          <input id={`char-upload-${slot}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleCharacterUpload(e, slot)} />
                          {img ? (
                            <>
                              <img src={img} alt={`Char ${slot}`} className="w-full h-full object-cover" />
                              <button onClick={(e) => { e.stopPropagation(); removeCharacterImage(slot); }} className="absolute top-1 right-1 bg-white/90 p-1 text-[#E84E36] opacity-0 group-hover/char:opacity-100 transition-opacity shadow-sm"><X size={12} /></button>
                            </>
                          ) : (
                            <><Plus size={20} className="text-[#E5E5E5] mb-2" /><span className="text-[9px] font-bold font-geo-sans uppercase tracking-widest text-[#BBB]">Img {slot + 1}</span></>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity duration-300 ${characterRefEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div>
                        <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">IP-Adapter Weight</label><span className="font-serif-display italic text-[#E84E36]">{characterStrength}</span></div>
                        <StyledSlider min={0} max={2} step={0.05} value={characterStrength} onChange={(e) => setCharacterStrength(parseFloat(e.target.value))} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Ending Step</label><span className="font-serif-display italic text-[#E84E36]">{characterStop}%</span></div>
                        <StyledSlider min={0} max={100} step={5} value={characterStop} onChange={(e) => setCharacterStop(parseInt(e.target.value))} />
                      </div>
                    </div>
                  </div>
                </CollapsibleCard>

                {/* Style Ref */}
                <CollapsibleCard title="Style Reference" icon={Palette} isActive={activeImageCard === 'style'} onToggle={() => setActiveImageCard(activeImageCard === 'style' ? null : 'style')}>
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable Style Ref</label>
                      <ToggleSwitch enabled={styleRefEnabled} onToggle={() => styleImage && setStyleRefEnabled(!styleRefEnabled)} disabled={!styleImage} />
                    </div>
                    <div onClick={() => !styleImage && document.getElementById('style-upload').click()} className="w-48 h-48 mx-auto bg-[#FAFAFA] border-2 border-dashed border-[#E5E5E5] flex items-center justify-center cursor-pointer hover:border-[#E84E36] transition-colors relative overflow-hidden group/style">
                      <input id="style-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setStyleImage)} />
                      {styleImage ? (
                        <>
                          <img src={styleImage} alt="Style" className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); removeImage(setStyleImage, setStyleRefEnabled); }} className="absolute top-2 right-2 bg-white/90 p-2 text-[#E84E36] opacity-0 group-hover/style:opacity-100 transition-opacity shadow-md"><X size={16} /></button>
                        </>
                      ) : (
                        <div className="text-center group-hover/style:scale-105 transition-transform pointer-events-none"><Brush size={24} className="mx-auto mb-2 text-[#BBB]" /><span className="text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">Upload Style Image</span></div>
                      )}
                    </div>
                    <div className={`transition-opacity duration-300 ${styleRefEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">IP-Adapter Weight</label><span className="font-serif-display italic text-[#E84E36]">{styleStrength}</span></div>
                      <StyledSlider min={0} max={2} step={0.1} value={styleStrength} onChange={(e) => setStyleStrength(parseFloat(e.target.value))} />
                    </div>
                  </div>
                </CollapsibleCard>

                {/* Structure / ControlNet */}
                <CollapsibleCard title="Structure (ControlNet)" icon={Layers} isActive={activeImageCard === 'canny'} onToggle={() => setActiveImageCard(activeImageCard === 'canny' ? null : 'canny')}>
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Enable ControlNet</label>
                      <ToggleSwitch enabled={structureEnabled} onToggle={() => structureImage && setStructureEnabled(!structureEnabled)} disabled={!structureImage} />
                    </div>
                    {/* Preprocessor Selection */}
                    <div>
                      <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Preprocessor</label>
                      <CustomDropdown options={CONTROLNET_PREPROCESSORS} value={controlNetPreprocessor} onChange={setControlNetPreprocessor} />
                    </div>
                    <div onClick={() => !structureImage && document.getElementById('structure-upload').click()} className="w-48 h-48 mx-auto bg-[#FAFAFA] border-2 border-dashed border-[#E5E5E5] flex items-center justify-center cursor-pointer hover:border-[#E84E36] transition-colors relative overflow-hidden group/canny">
                      <input id="structure-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setStructureImage)} />
                      {structureImage ? (
                        <>
                          <img src={structureImage} alt="Structure" className="w-full h-full object-cover opacity-50" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-full border-4 border-white/30 mix-blend-overlay" /></div>
                          <button onClick={(e) => { e.stopPropagation(); removeImage(setStructureImage, setStructureEnabled); }} className="absolute top-2 right-2 bg-white/90 p-2 text-[#E84E36] opacity-0 group-hover/canny:opacity-100 transition-opacity shadow-md pointer-events-auto"><X size={16} /></button>
                        </>
                      ) : (
                        <div className="text-center group-hover/canny:scale-105 transition-transform pointer-events-none"><PenTool size={24} className="mx-auto mb-2 text-[#BBB]" /><span className="text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">Upload Structure Guide</span></div>
                      )}
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity duration-300 ${structureEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div>
                        <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">ControlNet Strength</label><span className="font-serif-display italic text-[#E84E36]">{cannyWeight}</span></div>
                        <StyledSlider min={0} max={2} step={0.1} value={cannyWeight} onChange={(e) => setCannyWeight(parseFloat(e.target.value))} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2"><label className="font-geo-sans text-xs font-bold uppercase tracking-widest text-[#1A1917]">Ending Step</label><span className="font-serif-display italic text-[#E84E36]">{cannyStop}%</span></div>
                        <StyledSlider min={0} max={100} step={5} value={cannyStop} onChange={(e) => setCannyStop(parseInt(e.target.value))} />
                      </div>
                    </div>
                  </div>
                </CollapsibleCard>
              </div>
            </div>
          </>
        )}

        {/* ====================== GALLERY TAB ====================== */}
        {activeTab === 'Gallery' && (
          <div className="w-full h-full min-h-[80vh] flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b-2 border-[#1A1917] pb-4">
              <div className="flex items-center gap-6">
                <h2 className="font-serif-display italic text-3xl text-[#1A1917]">Archives & Edits</h2>
                <div className="hidden md:flex items-center gap-4">
                  <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BBB] group-hover:text-[#1A1917] transition-colors" />
                    <input type="text" placeholder="Search seed, name..." value={gallerySearch} onChange={(e) => setGallerySearch(e.target.value)} className="pl-8 pr-4 py-2 bg-[#FAFAFA] border border-[#E5E5E5] text-sm font-geo-sans focus:outline-none focus:border-[#E84E36] transition-colors w-64 placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest" />
                  </div>
                  <div className="relative" ref={calendarRef}>
                    <button onClick={() => setShowCalendar(!showCalendar)} className={`relative flex items-center gap-2 px-4 py-2 border ${galleryDate ? 'border-[#E84E36] text-[#E84E36]' : 'border-[#E5E5E5] text-[#1A1917]'} hover:border-[#E84E36] transition-colors`}>
                      <CalendarIcon size={14} />
                      <span className="text-[10px] font-bold font-geo-sans uppercase tracking-widest">{galleryDate || "Filter Date"}</span>
                      {galleryDate && (
                        <div className="relative z-20 ml-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGalleryDate(""); }}>
                          <X size={12} className="hover:text-red-500 cursor-pointer" />
                        </div>
                      )}
                    </button>
                    {showCalendar && <CalendarWidget selectedDate={galleryDate} onSelectDate={setGalleryDate} onClose={() => setShowCalendar(false)} />}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 h-full">
              <div className={`flex-1 transition-all duration-500 ${selectedImageIds.length > 0 ? 'lg:w-1/2' : 'w-full'}`}>
                {galleryImages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-[#888] border-2 border-dashed border-[#E5E5E5]">
                    <ImageIcon size={48} className="mb-4 opacity-50" />
                    <p className="font-geo-sans text-sm uppercase tracking-widest">No images found</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8 min-h-[600px]">
                    {Object.keys(groupedImages).length > 0 ? (
                      Object.keys(groupedImages).map((dateGroup) => (
                        <div key={dateGroup}>
                          <h4 className="font-serif-display italic text-xl text-[#1A1917] mb-4 border-b border-[#E5E5E5] pb-2">{dateGroup}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {groupedImages[dateGroup].map((img) => (
                              <div key={img.id} onClick={() => toggleImageSelection(img.id)} className={`relative group aspect-square cursor-pointer overflow-hidden border-2 transition-all ${selectedImageIds.includes(img.id) ? 'border-[#E84E36] ring-2 ring-[#E84E36] ring-offset-2' : 'border-transparent hover:border-[#E5E5E5]'}`}>
                                <img src={img.url} alt={`Gallery ${img.id}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded backdrop-blur-sm">{img.type}</div>
                                <div className={`absolute inset-0 bg-[#1A1917]/20 transition-opacity ${selectedImageIds.includes(img.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                  <div className={`absolute top-2 right-2 w-6 h-6 border-2 border-white flex items-center justify-center ${selectedImageIds.includes(img.id) ? 'bg-[#E84E36] border-[#E84E36]' : 'bg-black/30'}`}>
                                    {selectedImageIds.includes(img.id) && <Check size={14} className="text-white" />}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-[#888] py-20">
                        <Search size={32} className="mb-2 opacity-50" />
                        <p className="font-geo-sans text-xs uppercase tracking-widest">No matching results</p>
                      </div>
                    )}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-6 mt-8 pt-6 border-t border-[#E5E5E5]">
                    <button onClick={() => setGalleryPage(p => Math.max(p - 1, 1))} disabled={galleryPage === 1} className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] text-[10px] font-bold uppercase tracking-widest hover:border-[#E84E36] hover:text-[#E84E36] disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ArrowLeft size={14} /> Previous</button>
                    <span className="font-serif-display italic text-[#1A1917]">Page {galleryPage} of {totalPages}</span>
                    <button onClick={() => setGalleryPage(p => Math.min(p + 1, totalPages))} disabled={galleryPage === totalPages} className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] text-[10px] font-bold uppercase tracking-widest hover:border-[#E84E36] hover:text-[#E84E36] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next <ArrowRight size={14} /></button>
                  </div>
                )}
              </div>

              {selectedImageIds.length > 0 && (
                <div className="lg:w-[450px] bg-white border border-[#E5E5E5] shadow-xl p-6 flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-500 sticky top-24 h-fit">
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#E84E36] text-white p-2"><Check size={20} /></div>
                      <div>
                        <h3 className="font-serif-display italic text-xl text-[#1A1917]">Selected</h3>
                        <p className="text-[10px] font-geo-sans uppercase tracking-widest text-[#888]">{selectedImageIds.length} Image{selectedImageIds.length !== 1 ? 's' : ''} Selected</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedImageIds([])} className="text-[#BBB] hover:text-[#1A1917]"><X size={20} /></button>
                  </div>
                  <div className="space-y-6">
                    <div className="relative w-full aspect-square overflow-hidden border border-[#E5E5E5] group bg-[#FAFAFA] flex items-center justify-center">
                      {selectedImageIds.length === 1 ? (
                        <img src={getSelectedImages()[0].url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-8">
                          <Layers size={48} className="mx-auto mb-4 text-[#E84E36]" />
                          <p className="font-serif-display italic text-xl text-[#1A1917]">{selectedImageIds.length} Images</p>
                          <p className="text-[10px] font-geo-sans uppercase tracking-widest text-[#888] mt-2">Batch Actions Available</p>
                        </div>
                      )}
                    </div>
                    {selectedImageIds.length === 1 && (
                      <button onClick={handleSendToEditor} className="w-full py-4 bg-[#1A1917] text-[#EAE6D9] font-bold font-geo-sans uppercase tracking-widest hover:bg-[#E84E36] hover:text-white transition-all shadow-lg flex items-center justify-center gap-2">Open in Editor</button>
                    )}
                    {selectedImageIds.length === 1 ? (
                      <div className="border border-[#E5E5E5] p-4 hover:border-[#E84E36] transition-colors">
                        <div className="flex items-center gap-2 text-[#1A1917] mb-3 border-b border-[#E5E5E5] pb-2">
                          <Info size={16} /><span className="font-bold font-geo-sans text-xs uppercase tracking-widest">Image Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[10px] font-geo-sans">
                          <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Model</span><span className="text-[#1A1917] font-bold">{getSelectedImages()[0].model}</span></div>
                          <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Seed</span><div className="flex items-center gap-2 group/seed cursor-pointer"><span className="text-[#1A1917] font-mono">{getSelectedImages()[0].seed}</span><Copy size={10} className="text-[#BBB] opacity-0 group-hover/seed:opacity-100 transition-opacity hover:text-[#E84E36]" /></div></div>
                          <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Dimensions</span><span className="text-[#1A1917] font-bold">1024 × 1024</span></div>
                          <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Steps / CFG</span><span className="text-[#1A1917] font-bold">20 / 3.5</span></div>
                          <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Date</span><span className="text-[#1A1917] font-bold">{getSelectedImages()[0].date}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-[#E5E5E5] p-4 bg-[#FAFAFA]">
                        <p className="text-center font-geo-sans text-xs text-[#888] uppercase tracking-widest">Batch selection active</p>
                      </div>
                    )}
                    <button onClick={handleDeleteSelected} className="w-full py-3 border border-red-200 text-red-500 font-bold font-geo-sans uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"><Trash2 size={16} /> Delete {selectedImageIds.length > 1 ? `(${selectedImageIds.length})` : 'Image'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================== EDIT TAB ====================== */}
        {activeTab === 'Edit' && (
          <div className="w-full min-h-[80vh] flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-300">
            {!editImage ? (
              <div className="relative w-full">
                <div className="relative z-10 w-full bg-white shadow-xl torn-edge p-2">
                  <div className="w-full h-[600px] bg-[#FAFAFA] relative overflow-hidden flex flex-col items-center justify-center gap-6 group">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/paper.png")` }} />
                    <div className="absolute inset-0 pointer-events-none"><BouncingBalls isScattering={editScattering} /></div>
                    <div className={`z-20 text-center flex flex-col items-center gap-6 transition-opacity duration-500 ${editScattering ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                      <h3 className="font-serif-display italic text-4xl text-[#1A1917] bg-white/50 backdrop-blur-sm px-6 py-2 border border-[#1A1917]/10">Start Editing</h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        <button onClick={() => document.getElementById('device-upload').click()} className="px-8 py-4 bg-[#1A1917] text-[#EAE6D9] font-bold font-geo-sans uppercase tracking-widest hover:bg-[#E84E36] hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 min-w-[200px]"><Upload size={18} /> Upload from Device</button>
                        <input id="device-upload" type="file" accept="image/*" className="hidden" onChange={handleDeviceUpload} />
                        <button onClick={() => setActiveTab('Gallery')} className="px-8 py-4 bg-white border-2 border-[#1A1917] text-[#1A1917] font-bold font-geo-sans uppercase tracking-widest hover:bg-[#1A1917] hover:text-[#EAE6D9] transition-all shadow-lg flex items-center justify-center gap-2 min-w-[200px]"><LayoutGrid size={18} /> Select from Gallery</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-full h-full bg-[#DCD6F7] -z-10 torn-edge opacity-60" />
                <div className="absolute -bottom-4 -left-4 w-full h-full bg-[#FFE4E6] -z-20 torn-edge opacity-60" />
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
                <div className="flex-1 flex flex-col gap-6">
                  <div className="flex justify-between items-center h-10">
                    {activeViewItem && activeViewItem.status !== 'idle' ? (
                      <span className="font-serif-display italic text-lg text-[#E84E36] animate-pulse">
                        {activeViewItem.status === 'queued' ? 'Queueing...' : activeViewItem.status === 'generating' ? 'Rendering...' : 'Done'}
                      </span>
                    ) : <div />}
                    <button onClick={() => { setEditImage(null); setSelectedQueueId(null); }} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E5E5] text-[#888] hover:text-[#E84E36] hover:border-[#E84E36] transition-all shadow-sm">
                      <span className="font-geo-sans text-[10px] font-bold uppercase tracking-widest">Remove Image</span><X size={14} />
                    </button>
                  </div>

                  <div className="relative w-full h-[600px] bg-[#FAFAFA] border border-[#E5E5E5] overflow-hidden flex items-center justify-center group shadow-inner">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/paper.png")` }} />
                    {editImage && (!activeViewItem || activeViewItem.status === 'queued' || activeViewItem.status === 'complete') && (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={editImage.url} alt="Edit Target" className={`max-w-full max-h-full object-contain shadow-2xl transition-opacity duration-300 ${activeViewItem?.status === 'queued' ? 'opacity-50 grayscale' : 'opacity-100'}`} />
                        {editInpaintMode && <div className="absolute inset-0 cursor-crosshair" />}
                      </div>
                    )}
                    {activeViewItem && activeViewItem.status !== 'idle' && activeViewItem.status !== 'queued' && (
                      <>
                        {activeViewItem.status === 'generating' && activeViewItem.previewUrl && (
                          <img src={activeViewItem.previewUrl} alt="Generating..." className="max-w-full max-h-full object-contain transition-all duration-300 ease-out absolute inset-0 m-auto" style={{ filter: `blur(${Math.max(0, 10 - (activeViewItem.currentStep / 2))}px)` }} />
                        )}
                        {activeViewItem.status === 'complete' && activeViewItem.url && (
                          <img src={activeViewItem.url} alt="Final Edit" className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 absolute inset-0 m-auto" />
                        )}
                      </>
                    )}
                  </div>

                  <GenerationStatusStrip item={activeViewItem} onRetry={handleGenerate} />

                  {(!activeViewItem || activeViewItem.status === 'idle' || activeViewItem.status === 'complete') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 border cursor-pointer transition-all ${editUpscaleMode ? 'border-[#E84E36] bg-[#FFF0ED]' : 'border-[#E5E5E5] bg-white hover:border-[#E84E36]'}`} onClick={() => setEditUpscaleMode(!editUpscaleMode)}>
                        <div className="flex items-center gap-3 mb-2"><Maximize2 size={20} className={editUpscaleMode ? 'text-[#E84E36]' : 'text-[#1A1917]'} /><span className="font-bold font-geo-sans text-sm uppercase tracking-widest">Upscale</span></div>
                        <p className="text-[10px] text-[#888] leading-tight">Increase resolution by 2x or 4x with detail enhancement.</p>
                      </div>
                      <div className={`p-4 border cursor-pointer transition-all ${editInpaintMode ? 'border-[#E84E36] bg-[#FFF0ED]' : 'border-[#E5E5E5] bg-white hover:border-[#E84E36]'}`} onClick={() => setEditInpaintMode(!editInpaintMode)}>
                        <div className="flex items-center gap-3 mb-2"><Brush size={20} className={editInpaintMode ? 'text-[#E84E36]' : 'text-[#1A1917]'} /><span className="font-bold font-geo-sans text-sm uppercase tracking-widest">Inpaint</span></div>
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

                    {editInpaintMode && (
                      <div className="bg-[#FFF0ED] border border-[#E84E36] p-4 animate-in slide-in-from-top-2 fade-in">
                        <div className="flex justify-between mb-2">
                          <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#E84E36]">Brush Size</label>
                          <span className="font-serif-display italic text-[#E84E36]">{brushSize}px</span>
                        </div>
                        <StyledSlider min={1} max={100} value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} />
                      </div>
                    )}

                    <div className="mb-2">
                      <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Model Checkpoint</label>
                      <CustomDropdown options={MODEL_OPTIONS} value={genConfig.model} onChange={(val) => updateGen({ model: val })} />
                    </div>

                    {/* FIX: Controlled edit prompt */}
                    <div>
                      <label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2 block">Edit Prompt</label>
                      <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} className="w-full h-24 bg-[#FAFAFA] border border-[#E5E5E5] p-3 font-geo-sans text-sm text-[#1A1917] placeholder-[#AAA] focus:outline-none focus:border-[#E84E36] resize-none" placeholder="Describe the changes or the scene..." />
                    </div>

                    <div>
                      <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">Denoising Strength</label><span className="font-serif-display italic text-[#E84E36]">{editDenoise}</span></div>
                      <StyledSlider min={0} max={1} step={0.05} value={editDenoise} onChange={(e) => setEditDenoise(parseFloat(e.target.value))} />
                      <p className="text-[10px] text-[#BBB] mt-2 leading-tight">Lower values preserve original image. Higher values allow more creativity.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">Steps</label><span className="font-serif-display italic text-sm text-[#E84E36]">{genConfig.steps}</span></div>
                        <StyledSlider min={1} max={50} value={genConfig.steps} onChange={(e) => updateGen({ steps: Number(e.target.value) })} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2"><label className="font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#1A1917]">CFG</label><span className="font-serif-display italic text-sm text-[#E84E36]">{genConfig.cfg}</span></div>
                        <StyledSlider min={1} max={20} step={0.5} value={genConfig.cfg} onChange={(e) => updateGen({ cfg: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Sampler</label><CustomDropdown options={SAMPLERS} value={genConfig.sampler} onChange={(val) => updateGen({ sampler: val })} /></div>
                      <div><label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Scheduler</label><CustomDropdown options={SCHEDULERS} value={genConfig.scheduler} onChange={(val) => updateGen({ scheduler: val })} /></div>
                    </div>

                    <SeedInput seedInput={seedInput} onSeedInputChange={setSeedInput} onRandomize={randomizeSeed} />

                    <div className="border-t border-[#E5E5E5] pt-6">
                      <LoRAPanel {...loraPanelProps} />
                    </div>

                    <button onClick={handleGenerate} className="w-full py-4 bg-[#1A1917] text-[#EAE6D9] font-bold font-geo-sans uppercase tracking-widest hover:bg-[#E84E36] hover:text-white transition-all shadow-lg mt-auto active:scale-95">Create</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-20 text-center squiggle-bg h-12 opacity-50" />
      </div>

      <QueueBar queue={queue} selectedId={selectedQueueId} onSelect={setSelectedQueueId} onDelete={handleQueueDelete} />
    </div>
  );
};

export default App;
