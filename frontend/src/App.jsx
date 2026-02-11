import React, { useEffect } from 'react';
import { Zap, Wand2, LayoutGrid, Menu } from 'lucide-react';
import useUIStore from './stores/useUIStore';
import useGenerationStore from './stores/useGenerationStore';
import useQueueStore from './stores/useQueueStore';
import useModelStore from './stores/useModelStore';
import useWebSocket from './hooks/useWebSocket';
import GenerateTab from './components/generate/GenerateTab';
import EditTab from './components/edit/EditTab';
import GalleryTab from './components/gallery/GalleryTab';
import QueueBar from './components/shared/QueueBar';
import MetadataDrawer from './components/shared/MetadataDrawer';
import PresetManager from './components/shared/PresetManager';
import ConnectionStatus from './components/ui/ConnectionStatus';

const App = () => {
  const ui = useUIStore();
  const gen = useGenerationStore();
  const queueStore = useQueueStore();
  const modelStore = useModelStore();

  const activeViewItem = queueStore.getActiveViewItem();

  // Connect WebSocket for real-time generation progress
  useWebSocket();

  // Fetch dynamic model lists from backend on mount
  useEffect(() => {
    modelStore.fetchAll();
  }, []);

  // Preset handlers
  const handleLoadPreset = (preset) => {
    if (preset.config) gen.updateConfig(preset.config);
    if (preset.loras) gen.updateConfig({ loras: preset.loras });
    ui.setShowPresetMenu(false);
  };

  const handleReuseParameters = (params) => {
    if (params) gen.updateConfig(params);
  };

  const handleQueueDelete = (id) => {
    queueStore.removeJob(id);
  };

  // Build genConfig object for PresetManager
  const genConfig = {
    prompt: gen.prompt,
    negativePrompt: gen.negativePrompt,
    model: gen.model,
    vae: gen.vae,
    sampler: gen.sampler,
    scheduler: gen.scheduler,
    steps: gen.steps,
    cfg: gen.cfg,
    width: gen.width,
    height: gen.height,
    seed: gen.seed,
    seedInput: gen.seedInput,
    clipSkip: gen.clipSkip,
    batchSize: gen.batchSize,
    performance: gen.performance,
    hiresFix: gen.hiresFix,
  };

  return (
    <div className="min-h-screen bg-[#FDFEF5] font-sans selection:bg-[#E84E36] selection:text-white pb-32 relative overflow-hidden">
      {/* Top Decorative Bar */}
      <div className="bg-[#B54632] w-full h-3 fixed top-0 z-50" />

      {/* Navigation */}
      <nav className="bg-[#FDFEF5] px-6 py-6 flex items-center justify-between sticky top-0 z-40 border-b border-[#E5E5E5] transition-all">
        <div className="flex items-center gap-12">
          <div className="font-serif-display font-black text-4xl tracking-tight text-[#1A1917]">Matrice</div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-8">
            {[{ name: 'Generate', icon: Zap }, { name: 'Edit', icon: Wand2 }, { name: 'Gallery', icon: LayoutGrid }].map((item) => (
              <button key={item.name} onClick={() => ui.setActiveTab(item.name)} className={`font-geo-sans text-xs font-bold uppercase tracking-widest transition-all relative group ${ui.activeTab === item.name ? 'text-[#E84E36]' : 'text-[#1A1917] hover:text-[#E84E36]'}`}>
                {item.name}
                <span className={`absolute -bottom-2 left-0 h-0.5 bg-[#E84E36] transition-all duration-300 ${ui.activeTab === item.name ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </button>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <button className="md:hidden p-2 text-[#1A1917]" onClick={() => ui.setShowMobileNav(!ui.showMobileNav)}><Menu size={24} /></button>
        </div>
        <div className="flex items-center gap-6 text-[#1A1917] relative">
          <ConnectionStatus />
          <button onClick={() => ui.setShowPresetMenu(!ui.showPresetMenu)} className={`flex items-center gap-2 font-geo-sans text-xs font-bold uppercase tracking-widest transition-colors ${ui.showPresetMenu ? 'text-[#E84E36]' : 'hover:text-[#E84E36]'}`}>Presets</button>
          <PresetManager isOpen={ui.showPresetMenu} onClose={() => ui.setShowPresetMenu(false)} currentConfig={genConfig} currentLoras={gen.loras} onLoad={handleLoadPreset} />
        </div>
      </nav>

      {/* Mobile Nav Dropdown */}
      {ui.showMobileNav && (
        <div className="md:hidden fixed top-[72px] left-0 w-full bg-white border-b border-[#E5E5E5] z-40 animate-in slide-in-from-top-2 fade-in shadow-lg">
          {['Generate', 'Edit', 'Gallery'].map((name) => (
            <button key={name} onClick={() => { ui.setActiveTab(name); ui.setShowMobileNav(false); }}
              className={`w-full px-6 py-4 text-left font-geo-sans text-sm font-bold uppercase tracking-widest transition-colors border-b border-[#F0F0F0] ${ui.activeTab === name ? 'text-[#E84E36] bg-[#FFF0ED]' : 'text-[#1A1917] hover:bg-[#FAFAFA]'}`}>{name}</button>
          ))}
        </div>
      )}

      <MetadataDrawer isOpen={ui.showInfoPanel} onClose={() => ui.setShowInfoPanel(false)} item={activeViewItem} onReuse={handleReuseParameters} />

      {/* Main Container */}
      <div className="max-w-5xl mx-auto p-4 md:p-12 relative flex flex-col gap-10 transition-all">
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-[#FFE4E6] rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10 pointer-events-none animate-pulse" />

        {/* Tab Content */}
        {ui.activeTab === 'Generate' && <GenerateTab />}
        {ui.activeTab === 'Edit' && <EditTab />}
        {ui.activeTab === 'Gallery' && <GalleryTab />}

        <div className="mt-20 text-center squiggle-bg h-12 opacity-50" />
      </div>

      <QueueBar queue={queueStore.queue} selectedId={queueStore.selectedQueueId} onSelect={(id) => queueStore.selectJob(id)} onDelete={handleQueueDelete} />
    </div>
  );
};

export default App;
