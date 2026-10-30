import React from 'react';

export default function SwitchSoloClub({ activo, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      className="inline-flex items-center gap-2.5 bg-white border border-slate-200 rounded-full pl-1.5 pr-4 py-1.5 shadow-sm hover:border-[#151f89]/40 transition-colors"
    >
      <span className={`relative w-10 h-6 rounded-full transition-colors ${activo ? 'bg-[#151f89]' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-4' : ''}`} />
      </span>
      <span className="text-xs sm:text-sm font-title font-bold text-slate-700">Solo Argentinos del Norte</span>
    </button>
  );
}
