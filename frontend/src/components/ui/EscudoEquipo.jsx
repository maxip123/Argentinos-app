import React, { useState } from 'react';
import ClubShield from './ClubShield';
import { resolverUrlLogo } from '../../utils/logos';

// Escudo de un equipo, igual en todo el sitio: logo propio → escudo del club (Argentinos) → iniciales.
// Si el logo propio no carga (link roto), pasa al siguiente. El contenedor (tamaño, borde, fondo) lo pone cada vista.
// letras: cuántas iniciales entran en el contenedor (1 en los círculos chicos del cuadro de playoffs).
export default function EscudoEquipo({
  logoUrl,
  esClub = false,
  nombre = '',
  nombreCorto = '',
  letras = 3,
  className = 'w-full h-full',
  textoClassName = 'font-headline text-[10px] font-bold text-slate-600',
}) {
  const url = resolverUrlLogo(logoUrl);
  const [urlFallida, setUrlFallida] = useState(null);

  if (url && url !== urlFallida) {
    // no-referrer: un logo pegado como link se descarga del sitio de otro, que no tiene por qué saber
    // desde qué página de este sitio lo ve cada visitante (ver Política de Privacidad)
    return (
      <img
        src={url}
        alt={nombre}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${className} object-contain`}
        onError={() => setUrlFallida(url)}
      />
    );
  }
  if (esClub) return <ClubShield className={className} />;

  const iniciales = (nombreCorto || nombre || 'EQ').replace(/\s+/g, '').substring(0, letras).toUpperCase();
  return (
    <span className={textoClassName} aria-label={nombre}>
      {iniciales}
    </span>
  );
}
