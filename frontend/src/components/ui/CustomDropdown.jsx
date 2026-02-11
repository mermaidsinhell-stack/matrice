import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomDropdown = ({ options, value, onChange, placeholder = "Select option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
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

export default CustomDropdown;
