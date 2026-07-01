import React from 'react';
import { Copy } from 'lucide-react';
import { emitGlobalSystemAlert } from '../globalSystemAlertsBridge.js';

export default function CopyButton({ text, label }) {
  if (!text || String(text).trim() === '' || String(text).trim() === '—') return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard
          .writeText(String(text).trim())
          .then(() => emitGlobalSystemAlert(`¡${label} copiado!`, { tone: 'success', ms: 2000 }))
          .catch(() => emitGlobalSystemAlert('Error al copiar', { tone: 'warn', ms: 2000 }));
      }}
      className="ml-1 p-0.5 inline-flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all active:scale-90 cursor-pointer"
      title={`Copiar ${label}`}
    >
      <Copy size={12} className="shrink-0" />
    </button>
  );
}
