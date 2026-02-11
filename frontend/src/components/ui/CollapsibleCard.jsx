import React from 'react';
import { ChevronDown } from 'lucide-react';

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

export default CollapsibleCard;
