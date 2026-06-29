import React from 'react';
import { Search } from 'lucide-react';
import { uiMobileMenu } from '../../ui/uiFormatClasses.js';

/**
 * Campo de búsqueda móvil con icono inline (sin solapamiento).
 */
export default function MobileSearchField({
  id,
  value,
  onChange,
  placeholder = 'Buscar…',
  className = '',
  inputClassName = '',
}) {
  return (
    <div className={`${uiMobileMenu.searchWrap} ${className}`}>
      <Search className="shrink-0 text-slate-400 dark:text-slate-500 pointer-events-none" size={15} aria-hidden />
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        className={`${uiMobileMenu.searchInput} ${inputClassName}`}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
