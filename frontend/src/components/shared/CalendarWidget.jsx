import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarWidget = ({ selectedDate, onSelectDate, onClose }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(selectedDate ? parseInt(selectedDate.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate ? parseInt(selectedDate.split('-')[1]) - 1 : today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleDayClick = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${m}-${d}`;
    onSelectDate(dateStr);
    onClose();
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`empty-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const ds = String(d).padStart(2, '0');
    const dateStr = `${viewYear}-${m}-${ds}`;
    const isSelected = dateStr === selectedDate;
    const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    cells.push(
      <button key={d} onClick={() => handleDayClick(d)}
        className={`w-8 h-8 text-xs font-geo-sans font-medium transition-all flex items-center justify-center
          ${isSelected ? 'bg-[#E84E36] text-white' : isToday ? 'border border-[#E84E36] text-[#E84E36]' : 'text-[#1A1917] hover:bg-[#FAFAFA]'}`}
      >{d}</button>
    );
  }

  return (
    <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#E5E5E5] shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 hover:bg-[#FAFAFA] text-[#1A1917]"><ChevronLeft size={16} /></button>
        <span className="font-serif-display italic text-sm text-[#1A1917]">{monthNames[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-[#FAFAFA] text-[#1A1917]"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[9px] font-bold font-geo-sans uppercase tracking-widest text-[#888]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
      <button onClick={() => { onSelectDate(""); onClose(); }} className="mt-3 w-full text-center text-[10px] font-bold font-geo-sans uppercase tracking-widest text-[#888] hover:text-[#E84E36] transition-colors py-1">Clear Filter</button>
    </div>
  );
};

export default CalendarWidget;
