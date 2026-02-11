import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Tab navigation
  activeTab: 'Generate',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // UI toggles
  showNegative: false,
  setShowNegative: (v) => set({ showNegative: v }),
  toggleNegative: () => set((s) => ({ showNegative: !s.showNegative })),

  showFluxFormats: false,
  setShowFluxFormats: (v) => set({ showFluxFormats: v }),
  toggleFluxFormats: () => set((s) => ({ showFluxFormats: !s.showFluxFormats })),

  showInfoPanel: false,
  setShowInfoPanel: (v) => set({ showInfoPanel: v }),
  toggleInfoPanel: () => set((s) => ({ showInfoPanel: !s.showInfoPanel })),

  showPresetMenu: false,
  setShowPresetMenu: (v) => set({ showPresetMenu: v }),
  togglePresetMenu: () => set((s) => ({ showPresetMenu: !s.showPresetMenu })),

  showMobileNav: false,
  setShowMobileNav: (v) => set({ showMobileNav: v }),
  toggleMobileNav: () => set((s) => ({ showMobileNav: !s.showMobileNav })),

  // ComfyUI connection status
  comfyuiConnected: false,
  setComfyuiConnected: (v) => set({ comfyuiConnected: v }),

  // Active image prompting card (accordion)
  activeImageCard: null,
  setActiveImageCard: (card) => set((s) => ({
    activeImageCard: s.activeImageCard === card ? null : card,
  })),
}));

export default useUIStore;
