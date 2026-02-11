import React from 'react';

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

export default ToggleSwitch;
