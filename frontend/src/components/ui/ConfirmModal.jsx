import React, { useEffect } from 'react';
import {
  FaExclamationTriangle,
  FaTrash,
  FaTimes,
  FaShieldAlt,
  FaInfoCircle,
} from 'react-icons/fa';

/**
 * Modal de confirmación estilizado según la identidad del Club Argentinos del Norte.
 * Reemplaza los 'window.confirm' y 'alert' nativos por una experiencia inmersiva y accesible.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar acción?',
  description = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'info' | 'club'
  badge = 'Confirmación',
  cargando = false,
}) {
  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !cargando) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cargando, onClose]);

  if (!isOpen) return null;

  // Variantes visuales
  const variantes = {
    danger: {
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      iconContainer: 'bg-red-50 text-red-600 border-red-200',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
      icon: <FaTrash className="text-lg" />,
    },
    warning: {
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      iconContainer: 'bg-amber-50 text-amber-700 border-amber-200',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
      icon: <FaExclamationTriangle className="text-lg" />,
    },
    club: {
      badgeClass: 'bg-red-100 text-[#991b1b] border-red-200',
      iconContainer: 'bg-red-50 text-[#991b1b] border-red-200',
      confirmBtn: 'bg-[#991b1b] hover:bg-[#7f1d1d] text-white shadow-red-900/20',
      icon: <FaShieldAlt className="text-lg" />,
    },
    info: {
      badgeClass: 'bg-blue-100 text-[#151f89] border-blue-200',
      iconContainer: 'bg-blue-50 text-[#151f89] border-blue-200',
      confirmBtn: 'bg-[#151f89] hover:bg-[#303a9f] text-white shadow-blue-900/20',
      icon: <FaInfoCircle className="text-lg" />,
    },
  };

  const v = variantes[variant] || variantes.danger;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleIn">
        {/* Barra superior con badge y botón cerrar */}
        <div className="p-5 pb-0 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${v.iconContainer}`}>
              {v.icon}
            </div>
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border mb-1 ${v.badgeClass}`}>
                {badge}
              </span>
              <h3 id="confirm-modal-title" className="font-headline text-lg sm:text-xl uppercase tracking-wide text-slate-900 leading-tight">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cargando}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
            title="Cerrar"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Cuerpo de la descripción */}
        <div className="p-5 text-xs sm:text-sm text-slate-600 font-body leading-relaxed">
          {description}
        </div>

        {/* Botones de acción */}
        <div className="p-5 pt-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-title font-bold text-xs uppercase tracking-wider border border-slate-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cargando}
            className={`px-5 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm flex items-center gap-2 ${v.confirmBtn} disabled:opacity-50`}
          >
            {cargando ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Procesando...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
