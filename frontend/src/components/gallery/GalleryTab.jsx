import React, { useRef, useEffect, useMemo } from 'react';
import { Search, Calendar as CalendarIcon, X, Image as ImageIcon, Check, Layers, Info, Copy, Trash2, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import useGalleryStore from '../../stores/useGalleryStore';
import useEditStore from '../../stores/useEditStore';
import useGenerationStore from '../../stores/useGenerationStore';
import useUIStore from '../../stores/useUIStore';
import CalendarWidget from '../shared/CalendarWidget';
import { normalizeImageShape } from '../../utils/imageUtils';

const GalleryTab = () => {
  const gallery = useGalleryStore();
  const edit = useEditStore();
  const gen = useGenerationStore();
  const ui = useUIStore();
  const calendarRef = useRef(null);

  // Close calendar on outside click
  useEffect(() => {
    const handler = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        gallery.setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [gallery]);

  // Fetch gallery images on mount
  useEffect(() => {
    gallery.fetchImages();
  }, []);

  // Use the store's computed data
  const filteredImages = gallery.getFilteredImages();
  const totalPages = gallery.getTotalPages();
  const paginatedImages = gallery.getPaginatedImages();

  // Group by date
  const groupedImages = useMemo(() => paginatedImages.reduce((groups, img) => {
    const date = img.date || 'Unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(img);
    return groups;
  }, {}), [paginatedImages]);

  const getSelectedImages = () => gallery.images.filter((img) => gallery.selectedIds.includes(img.id || img.filename));

  const handleSendToEditor = () => {
    if (gallery.selectedIds.length === 1) {
      const img = getSelectedImages()[0];
      edit.setEditImage(normalizeImageShape(img));
      // Carry metadata into edit store
      if (img.model) edit.setEditModel(img.model);
      if (img.steps) edit.setEditSteps(img.steps);
      if (img.cfg) edit.setEditCfg(img.cfg);
      if (img.sampler) edit.setEditSampler(img.sampler);
      if (img.scheduler) edit.setEditScheduler(img.scheduler);
      if (img.seed != null) edit.setEditSeed(img.seed);
      if (img.positive) edit.setEditPrompt(img.positive);
      // Also update generation store for parameter reuse
      if (img.seed != null) gen.updateConfig({ seedInput: img.seed.toString() });
      if (img.model) gen.updateConfig({ model: img.model });
      ui.setActiveTab('Edit');
      gallery.clearSelection();
    }
  };

  const handleDeleteSelected = () => {
    gallery.deleteSelected();
  };

  const handleReuseParams = () => {
    if (gallery.selectedIds.length !== 1) return;
    const img = getSelectedImages()[0];
    const updates = {};
    if (img.model) updates.model = img.model;
    if (img.seed != null) updates.seedInput = img.seed.toString();
    if (img.steps) updates.steps = img.steps;
    if (img.cfg) updates.cfg = img.cfg;
    if (img.sampler) updates.sampler = img.sampler;
    if (img.scheduler) updates.scheduler = img.scheduler;
    if (img.width) updates.width = img.width;
    if (img.height) updates.height = img.height;
    if (img.positive) updates.prompt = img.positive;
    gen.updateConfig(updates);
    ui.setActiveTab('Generate');
    gallery.clearSelection();
  };

  return (
    <div className="w-full h-full min-h-[80vh] flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#1A1917] pb-4">
        <div className="flex items-center gap-6">
          <h2 className="font-serif-display italic text-3xl text-[#1A1917]">Archives & Edits</h2>
          <div className="hidden md:flex items-center gap-4">
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BBB] group-hover:text-[#1A1917] transition-colors" />
              <input type="text" placeholder="Search seed, name..." value={gallery.search} onChange={(e) => gallery.setSearch(e.target.value)} className="pl-8 pr-4 py-2 bg-[#FAFAFA] border border-[#E5E5E5] text-sm font-geo-sans focus:outline-none focus:border-[#E84E36] transition-colors w-64 placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest" />
            </div>
            <div className="relative" ref={calendarRef}>
              <button onClick={() => gallery.setShowCalendar(!gallery.showCalendar)} className={`relative flex items-center gap-2 px-4 py-2 border ${gallery.dateFilter ? 'border-[#E84E36] text-[#E84E36]' : 'border-[#E5E5E5] text-[#1A1917]'} hover:border-[#E84E36] transition-colors`}>
                <CalendarIcon size={14} />
                <span className="text-[10px] font-bold font-geo-sans uppercase tracking-widest">{gallery.dateFilter || "Filter Date"}</span>
                {gallery.dateFilter && (
                  <div className="relative z-20 ml-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); gallery.setDateFilter(''); }}>
                    <X size={12} className="hover:text-red-500 cursor-pointer" />
                  </div>
                )}
              </button>
              {gallery.showCalendar && <CalendarWidget selectedDate={gallery.dateFilter} onSelectDate={(d) => gallery.setDateFilter(d)} onClose={() => gallery.setShowCalendar(false)} />}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-8 h-full">
        {/* Image Grid */}
        <div className={`flex-1 transition-all duration-500 ${gallery.selectedIds.length > 0 ? 'lg:w-1/2' : 'w-full'}`}>
          {filteredImages.length === 0 && gallery.images.length === 0 ? (
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
                      {groupedImages[dateGroup].map((img) => {
                        const imgId = img.id || img.filename;
                        const isSelected = gallery.selectedIds.includes(imgId);
                        return (
                          <div key={imgId} onClick={() => gallery.toggleSelect(imgId)} className={`relative group aspect-square cursor-pointer overflow-hidden border-2 transition-all ${isSelected ? 'border-[#E84E36] ring-2 ring-[#E84E36] ring-offset-2' : 'border-transparent hover:border-[#E5E5E5]'}`}>
                            <img src={img.url} alt={`Gallery ${imgId}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded backdrop-blur-sm">{img.type}</div>
                            <div className={`absolute inset-0 bg-[#1A1917]/20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              <div className={`absolute top-2 right-2 w-6 h-6 border-2 border-white flex items-center justify-center ${isSelected ? 'bg-[#E84E36] border-[#E84E36]' : 'bg-black/30'}`}>
                                {isSelected && <Check size={14} className="text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-8 pt-6 border-t border-[#E5E5E5]">
              <button onClick={() => gallery.setPage(Math.max(gallery.page - 1, 1))} disabled={gallery.page === 1} className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] text-[10px] font-bold uppercase tracking-widest hover:border-[#E84E36] hover:text-[#E84E36] disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ArrowLeft size={14} /> Previous</button>
              <span className="font-serif-display italic text-[#1A1917]">Page {gallery.page} of {totalPages}</span>
              <button onClick={() => gallery.setPage(Math.min(gallery.page + 1, totalPages))} disabled={gallery.page === totalPages} className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] text-[10px] font-bold uppercase tracking-widest hover:border-[#E84E36] hover:text-[#E84E36] disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next <ArrowRight size={14} /></button>
            </div>
          )}
        </div>

        {/* Selection Panel */}
        {gallery.selectedIds.length > 0 && (
          <div className="lg:w-[450px] bg-white border border-[#E5E5E5] shadow-xl p-6 flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-500 sticky top-24 h-fit">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#E84E36] text-white p-2"><Check size={20} /></div>
                <div>
                  <h3 className="font-serif-display italic text-xl text-[#1A1917]">Selected</h3>
                  <p className="text-[10px] font-geo-sans uppercase tracking-widest text-[#888]">{gallery.selectedIds.length} Image{gallery.selectedIds.length !== 1 ? 's' : ''} Selected</p>
                </div>
              </div>
              <button onClick={() => gallery.clearSelection()} className="text-[#BBB] hover:text-[#1A1917]"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div className="relative w-full aspect-square overflow-hidden border border-[#E5E5E5] group bg-[#FAFAFA] flex items-center justify-center">
                {gallery.selectedIds.length === 1 ? (
                  <img src={getSelectedImages()[0]?.url} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-8">
                    <Layers size={48} className="mx-auto mb-4 text-[#E84E36]" />
                    <p className="font-serif-display italic text-xl text-[#1A1917]">{gallery.selectedIds.length} Images</p>
                    <p className="text-[10px] font-geo-sans uppercase tracking-widest text-[#888] mt-2">Batch Actions Available</p>
                  </div>
                )}
              </div>
              {gallery.selectedIds.length === 1 && (
                <div className="flex gap-2">
                  <button onClick={handleSendToEditor} className="flex-1 py-4 bg-[#1A1917] text-[#EAE6D9] font-bold font-geo-sans uppercase tracking-widest hover:bg-[#E84E36] hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 text-[10px]">Open in Editor</button>
                  <button onClick={handleReuseParams} className="py-4 px-4 border border-[#E5E5E5] text-[#1A1917] font-bold font-geo-sans uppercase tracking-widest hover:border-[#E84E36] hover:text-[#E84E36] transition-all flex items-center justify-center gap-2" title="Reuse Parameters"><RotateCcw size={16} /></button>
                </div>
              )}
              {gallery.selectedIds.length === 1 ? (
                <div className="border border-[#E5E5E5] p-4 hover:border-[#E84E36] transition-colors">
                  <div className="flex items-center gap-2 text-[#1A1917] mb-3 border-b border-[#E5E5E5] pb-2">
                    <Info size={16} /><span className="font-bold font-geo-sans text-xs uppercase tracking-widest">Image Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[10px] font-geo-sans">
                    <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Model</span><span className="text-[#1A1917] font-bold">{getSelectedImages()[0]?.model}</span></div>
                    <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Seed</span><div className="flex items-center gap-2 group/seed cursor-pointer"><span className="text-[#1A1917] font-mono">{getSelectedImages()[0]?.seed}</span><Copy size={10} className="text-[#BBB] opacity-0 group-hover/seed:opacity-100 transition-opacity hover:text-[#E84E36]" /></div></div>
                    <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Dimensions</span><span className="text-[#1A1917] font-bold">{getSelectedImages()[0]?.width || 1024} × {getSelectedImages()[0]?.height || 1024}</span></div>
                    <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Steps / CFG</span><span className="text-[#1A1917] font-bold">{getSelectedImages()[0]?.steps || 20} / {getSelectedImages()[0]?.cfg || 3.5}</span></div>
                    <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Sampler</span><span className="text-[#1A1917] font-bold">{getSelectedImages()[0]?.sampler || '—'}</span></div>
                    <div className="flex flex-col"><span className="text-[#888] uppercase tracking-widest mb-1">Date</span><span className="text-[#1A1917] font-bold">{getSelectedImages()[0]?.date}</span></div>
                  </div>
                </div>
              ) : (
                <div className="border border-[#E5E5E5] p-4 bg-[#FAFAFA]">
                  <p className="text-center font-geo-sans text-xs text-[#888] uppercase tracking-widest">Batch selection active</p>
                </div>
              )}
              <button onClick={handleDeleteSelected} className="w-full py-3 border border-red-200 text-red-500 font-bold font-geo-sans uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"><Trash2 size={16} /> Delete {gallery.selectedIds.length > 1 ? `(${gallery.selectedIds.length})` : 'Image'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryTab;
