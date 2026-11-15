import React from 'react';
import Interruptor from './Interruptor';

export default function SwitchSoloClub({ activo, onChange }) {
  return <Interruptor activo={activo} onChange={onChange} etiqueta="Solo Argentinos del Norte" />;
}
