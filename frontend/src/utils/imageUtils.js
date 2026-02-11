export const normalizeImageShape = (img, overrides = {}) => ({
  id: img.id ?? 'upload-' + Date.now(),
  name: img.name ?? "Untitled",
  url: img.url,
  seed: img.seed ?? null,
  model: img.model ?? null,
  type: img.type ?? "Edit",
  date: img.date ?? new Date().toISOString().split('T')[0],
  ...overrides,
});

export const clampFloat = (val, min, max, fallback = min) => {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

export const handleFileUploadToState = (e, setter) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => setter(event.target.result);
    reader.readAsDataURL(file);
  }
};
