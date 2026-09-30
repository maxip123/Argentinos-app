import React from 'react';

export default function ClubShield({ className = 'w-10 h-10', showText = false }) {
  return (
    <div className={`flex items-center gap-3 ${showText ? '' : 'justify-center'}`}>
      <img
        src="/gemini-svg.svg"
        alt="Escudo Oficial Club Argentinos del Norte"
        className={`${className} object-contain select-none shrink-0 drop-shadow-md`}
        loading="lazy"
      />

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-headline text-lg sm:text-xl tracking-wider text-white uppercase">
            Argentinos del Norte
          </span>
          <span className="font-title text-xs tracking-widest text-on-primary/80 uppercase">
            Futsal AFA Tucumán
          </span>
        </div>
      )}
    </div>
  );
}
