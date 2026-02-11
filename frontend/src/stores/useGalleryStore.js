import { create } from 'zustand';
import { api } from '../api';

const useGalleryStore = create((set, get) => ({
  images: [],
  search: '',
  dateFilter: '',
  page: 1,
  itemsPerPage: 8,
  selectedIds: [],
  showCalendar: false,
  isLoading: false,

  // Actions
  setSearch: (v) => set({ search: v, page: 1 }),
  setDateFilter: (v) => set({ dateFilter: v, page: 1 }),
  setPage: (v) => set({ page: v }),
  setShowCalendar: (v) => set({ showCalendar: v }),

  toggleSelect: (id) => set((s) => ({
    selectedIds: s.selectedIds.includes(id)
      ? s.selectedIds.filter((i) => i !== id)
      : [...s.selectedIds, id],
  })),

  selectAll: () => set((s) => ({
    selectedIds: s.images.map((img) => img.id || img.filename),
  })),

  clearSelection: () => set({ selectedIds: [] }),

  // Fetch from backend
  fetchImages: async () => {
    set({ isLoading: true });
    try {
      const images = await api.fetchGallery();
      set({ images, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  // Add a newly generated image to the gallery
  addImage: (image) => set((s) => ({
    images: [image, ...s.images],
  })),

  // Delete selected images
  deleteSelected: async () => {
    const { selectedIds } = get();
    for (const id of selectedIds) {
      try {
        await api.deleteGalleryImage(id);
      } catch {
        // Continue on error
      }
    }
    set((s) => ({
      images: s.images.filter((img) => !selectedIds.includes(img.id || img.filename)),
      selectedIds: [],
    }));
  },

  // Send image to edit tab
  sendToEditor: (image) => {
    // This will be called from the gallery — the edit store handles the actual state
    return image;
  },

  // Filtered + paginated images (computed)
  getFilteredImages: () => {
    const s = get();
    let filtered = s.images;
    if (s.search) {
      const q = s.search.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          (img.name || img.filename || '').toLowerCase().includes(q) ||
          (img.model || '').toLowerCase().includes(q)
      );
    }
    if (s.dateFilter) {
      filtered = filtered.filter((img) => (img.date || '').startsWith(s.dateFilter));
    }
    return filtered;
  },

  getPaginatedImages: () => {
    const s = get();
    const filtered = s.getFilteredImages();
    const start = (s.page - 1) * s.itemsPerPage;
    return filtered.slice(start, start + s.itemsPerPage);
  },

  getTotalPages: () => {
    const s = get();
    const filtered = s.getFilteredImages();
    return Math.max(1, Math.ceil(filtered.length / s.itemsPerPage));
  },
}));

export default useGalleryStore;
