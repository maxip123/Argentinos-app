import React, { useState } from 'react';
import EscudoEquipo from '../ui/EscudoEquipo';
import { reducirImagen, vistaPreviaLogo } from '../../utils/logos';

// valor = { modo, link, subida, imagen } (ver valorLogoInicial en utils/logos.js)
const MODOS = [
  { id: 'defecto', label: 'Por defecto' },
  { id: 'link', label: 'Link' },
  { id: 'archivo', label: 'Subir imagen' },
];

export default function SelectorLogo({ valor, onChange, esClub, nombre, nombreCorto }) {
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  const vistaPrevia = vistaPreviaLogo(valor);

  const elegirArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError('');
    setProcesando(true);
    try {
      onChange({ ...valor, imagen: await reducirImagen(archivo) });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div>
      <span className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Logo</span>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
          <EscudoEquipo
            logoUrl={vistaPrevia}
            esClub={esClub}
            nombre={nombre || 'Equipo'}
            nombreCorto={nombreCorto}
            textoClassName="font-headline text-xs font-bold text-slate-600"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="inline-flex flex-wrap rounded-xl border border-slate-300 overflow-hidden" role="radiogroup" aria-label="Origen del logo">
            {MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={valor.modo === m.id}
                onClick={() => {
                  setError('');
                  onChange({ ...valor, modo: m.id });
                }}
                className={`px-3 py-1.5 text-xs font-title font-bold transition-colors ${
                  valor.modo === m.id ? 'bg-[#151f89] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {valor.modo === 'defecto' && (
            <p className="text-[11px] text-slate-500 font-body">
              {esClub ? 'Se muestra el escudo del club.' : 'Se muestran las iniciales de la sigla o del nombre.'}
            </p>
          )}

          {valor.modo === 'link' && (
            <input
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={valor.link}
              onChange={(e) => onChange({ ...valor, link: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-body focus:outline-none"
            />
          )}

          {valor.modo === 'archivo' && (
            <div className="space-y-1">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-title font-bold transition-colors">
                {procesando ? 'Procesando...' : valor.imagen || valor.subida ? 'Cambiar imagen' : 'Elegir imagen'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={elegirArchivo} className="sr-only" />
              </label>
              <p className="text-[11px] text-slate-500 font-body">PNG, JPG o WebP, hasta 5 MB. Se achica sola.</p>
            </div>
          )}

          {error && <p className="text-[11px] text-red-700 font-body">{error}</p>}
        </div>
      </div>
    </div>
  );
}
