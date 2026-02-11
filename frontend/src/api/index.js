const API_BASE = '/api';

/**
 * Shared fetch wrapper with proper error handling.
 * Returns null on network errors instead of silently swallowing.
 */
async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      console.error(`API ${res.status} ${url}: ${errorBody}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`API fetch error ${url}:`, err);
    return null;
  }
}

export const api = {
  // Model discovery
  fetchModels: () => safeFetch(`${API_BASE}/models`).then(r => r ?? []),
  fetchDiffusionModels: () => safeFetch(`${API_BASE}/diffusion-models`).then(r => r ?? []),
  fetchLoras: () => safeFetch(`${API_BASE}/loras`).then(r => r ?? []),
  fetchVaes: () => safeFetch(`${API_BASE}/vaes`).then(r => r ?? []),
  fetchSamplers: () => safeFetch(`${API_BASE}/samplers`).then(r => r ?? { samplers: [], schedulers: [] }),
  fetchControlnets: () => safeFetch(`${API_BASE}/controlnets`).then(r => r ?? []),
  fetchUpscalers: () => safeFetch(`${API_BASE}/upscalers`).then(r => r ?? []),
  fetchEmbeddings: () => safeFetch(`${API_BASE}/embeddings`).then(r => r ?? []),
  fetchClipModels: () => safeFetch(`${API_BASE}/clip-models`).then(r => r ?? []),
  fetchIpadapterModels: () => safeFetch(`${API_BASE}/ipadapter-models`).then(r => r ?? []),
  fetchClipVisionModels: () => safeFetch(`${API_BASE}/clip-vision-models`).then(r => r ?? []),
  fetchPreprocessors: () => safeFetch(`${API_BASE}/preprocessors`).then(r => r ?? []),

  // Status
  fetchStatus: () => safeFetch(`${API_BASE}/status`).then(r => r ?? { connected: false }),

  // Generation
  generate: (payload) =>
    safeFetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Edit (img2img, inpaint, upscale)
  edit: (payload) =>
    safeFetch(`${API_BASE}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Upload image — use 'file' field name matching backend expectation
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return safeFetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
  },

  // Gallery
  fetchGallery: () => safeFetch(`${API_BASE}/gallery`).then(r => r ?? []),
  deleteGalleryImage: (filename) =>
    safeFetch(`${API_BASE}/gallery/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
};
