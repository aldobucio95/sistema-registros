import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { canViewSystemLogs } from './permissions.js';

/**
 * Si la ruta es `/logs` y el usuario no puede ver logs, redirige a `/eventos`.
 */
export default function SystemViewGuard({ currentUser, pathname, children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!currentUser) return;
    if (pathname === '/logs' && !canViewSystemLogs(currentUser)) {
      navigate('/eventos', { replace: true });
    }
  }, [currentUser, pathname, navigate]);
  return children;
}
