import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/axios';

const NotifContext = createContext(null);

const STORAGE_KEY = 'notif_last_checked';
const POLL_MS     = 20_000; // cada 20 segundos

export function NotifProvider({ children }) {
  const navigate                          = useNavigate();
  const [unreadCount, setUnreadCount]     = useState(0);
  const [nuevosMensajes, setNuevos]       = useState([]);
  const onNuevosRef                       = useRef(null); // callback externo (Mensajes page)

  // ── Inicializar timestamp y pedir permiso de notificaciones ─────────────
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Polling ─────────────────────────────────────────────────────────────
  const check = useCallback(async () => {
    const desde = localStorage.getItem(STORAGE_KEY) ?? new Date().toISOString();
    try {
      const res = await apiClient.get('/mensajes/nuevos', { params: { desde } });
      const { count, mensajes } = res.data;
      if (count > 0) {
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        setUnreadCount((prev) => prev + count);
        setNuevos(mensajes);
        // Refrescar la lista si Mensajes está abierto
        onNuevosRef.current?.();
        // Notificación del navegador
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const n = new Notification('Nuevos mensajes', {
            body: `${count} mensaje(s) nuevo(s) recibido(s)`,
            icon: '/vite.svg',
          });
          n.onclick = () => {
            window.focus();
            navigate('/mensajes');
          };
        }
      }
    } catch (_) {
      // silencioso — puede fallar si el usuario cerró sesión
    }
  }, [navigate]);

  useEffect(() => {
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [check]);

  // ── API pública ──────────────────────────────────────────────────────────
  const marcarLeidos = useCallback(() => {
    setUnreadCount(0);
    setNuevos([]);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, []);

  const registrarOnNuevos = useCallback((fn) => {
    onNuevosRef.current = fn;
    return () => { onNuevosRef.current = null; };
  }, []);

  return (
    <NotifContext.Provider value={{ unreadCount, nuevosMensajes, marcarLeidos, registrarOnNuevos }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotif() {
  return useContext(NotifContext);
}
