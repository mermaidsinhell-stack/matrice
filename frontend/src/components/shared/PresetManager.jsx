import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileJson, Trash2 } from 'lucide-react';
const STORAGE_KEY = 'matrice_presets';

const loadPresets = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore corrupt data */ }
  return [];
};

const savePresets = (presets) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch { /* storage full or disabled */ }
};

const PresetManager = ({ isOpen, onClose, currentConfig, currentLoras, onLoad }) => {
  const [presets, setPresets] = useState(loadPresets);
  const [newPresetName, setNewPresetName] = useState("");
  const panelRef = useRef(null);

  // Persist whenever presets change
  useEffect(() => {
    savePresets(presets);
  }, [presets]);

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

export default PresetManager;
