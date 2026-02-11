import React from 'react';
import { Hash, Dices } from 'lucide-react';

const SeedInput = ({ seedInput, onSeedInputChange, onRandomize }) => (
  <div>
    <label className="block font-geo-sans text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Seed</label>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BBB]" />
        <input
          type="text" value={seedInput}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d+$/.test(v)) onSeedInputChange(v);
          }}
          placeholder="Random"
          className="w-full bg-[#FAFAFA] border-b border-[#E5E5E5] py-2 pl-8 font-mono text-sm text-[#1A1917] focus:outline-none focus:border-[#E84E36] transition-colors"
        />
      </div>
      <button onClick={onRandomize} className="bg-[#FAFAFA] border border-[#E5E5E5] p-2 hover:border-[#E84E36] hover:text-[#E84E36] transition-all" title="Randomize Seed">
        <Dices size={18} />
      </button>
    </div>
  </div>
);

export default SeedInput;
