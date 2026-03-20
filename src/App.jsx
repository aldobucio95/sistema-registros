import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Users, MapPin, PieChart, Plus, Trash2, DollarSign, CheckCircle2, XCircle,
  LayoutDashboard, Phone, ShieldAlert, Power, BarChart3, Edit3, TableProperties,
  Eye, EyeOff, Search, Filter, ArrowUpDown, CreditCard, ChevronDown, ChevronUp,
  Wallet, GraduationCap, Droplets, Activity, LogOut, UserCog, History, Lock,
  UserCircle, Receipt, CalendarRange, ListPlus, GripVertical, Settings2, Undo, ArrowLeft,
  SlidersHorizontal, Bug, Download, Database
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBIRKdNeMmaVVofVx4jshciPB-N9J0HqIg",
  authDomain: "registros-vina-nueva.firebaseapp.com",
  projectId: "registros-vina-nueva",
  storageBucket: "registros-vina-nueva.firebasestorage.app",
  messagingSenderId: "966310430422",
  appId: "1:966310430422:web:203653951141917d6eab77",
  measurementId: "G-EH1KXMVDY8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const getColRef = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Hombre", "Mujer"];
const EVENT_TYPES = ["Campa", "Desayuno Conferencia", "General"];
const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

const defaultLocations = ["Norte", "Sur", "Izcalli", "Coapa", "Acapulco", "Toluca"];
const defaultRegStatus = defaultLocations.reduce((acc, loc) => ({ ...acc, [loc]: true }), {});

const EMPTY_ENTRY = {
  name: '', phone: '', age: '', bloodType: 'O+', gender: '',
  emergencyContact: '', emergencyPhone: '', canSwim: 'No', paid: '',
  hasAllergy: 'No', allergyDetails: '', hasDisease: 'No', diseaseDetails: '',
  hasDisability: 'No', disabilityDetails: '', isScholarship: 'No', isServer: 'No',
  serverAssignment: '', campAssignment: '', customData: {}, paymentHistory: []
};

// Preferencias de vista por defecto
const defaultViewPrefs = {
  statsConfig: true,
  chartLocations: true,
  chartIncome: true,
  chartPaymentStatus: true,
  chartGender: true,
  chartAgeBrackets: true,
  chartBloodType: true,
  chartScholarship: true,
  chartSwimming: true,
  chartMedical: true,
  chartServers: true,
  chartAges: true,
  chartCustom: true,
  tableDetails: true
};

// UI Reusable Classes
const inputClasses = "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700 transition-all";
const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1.5";
const btnPrimary = "py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex justify-center items-center gap-2 text-sm";
const btnSecondary = "py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-sm flex justify-center items-center gap-2";

// Mini Components for UI optimization
const StatCard = ({ icon: Icon, iconColor, bgIcon, title, value }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex items-center gap-2 mb-3">
      <div className={`p-2 rounded-lg ${bgIcon} ${iconColor}`}><Icon size={18} /></div>
      <span className="text-xs font-bold text-slate-500">{title}</span>
    </div>
    <p className="text-2xl font-black text-slate-800">{value}</p>
  </div>
);

const ProgressBar = ({ label, value, max, colorClass, bgClass }) => (
  <div>
    <div className="flex justify-between text-xs font-bold mb-1.5">
      <span className="text-slate-600 uppercase tracking-wider">{label}</span>
      <span className={`${colorClass} font-black`}>{value}</span>
    </div>
    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
      <div className={`${bgClass} h-full transition-all duration-1000 ease-out`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  </div>
);

const formatDuration = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const escapeCSV = (str) => {
  if (str === null || str === undefined) return '""';
  const stringified = String(str);
  return `"${stringified.replace(/"/g, '""')}"`;
};

const App = () => {
  const [fbUser, setFbUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Editor', canViewFinances: false });
  const [globalConfig, setGlobalConfig] = useState(null);

  const [toast, setToast] = useState('');
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }, []);

  const hasAdminRights = ['Administrador', 'SuperUsuario'].includes(currentUser?.role);
  const isSuperUser = currentUser?.role === 'SuperUsuario';

  const [events, setEvents] = useState([]);
  const [globalLocations, setGlobalLocations] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [systemView, setSystemView] = useState('events'); 
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [deleteEventModal, setDeleteEventModal] = useState({ isOpen: false, id: null, name: '' });
  const [draggedEventId, setDraggedEventId] = useState(null);
  const [newEventData, setNewEventData] = useState({ name: '', type: 'Campa', date: '', baseCost: '' });
  const [renameModal, setRenameModal] = useState({ isOpen: false, id: null, name: '' });

  // Navigation History Stack
  const [navHistory, setNavHistory] = useState([]);

  // Preferences State
  const [viewPrefs, setViewPrefs] = useState(defaultViewPrefs);
  const [showViewSettings, setShowViewSettings] = useState(false);

  // Debug Toast & Watcher
  const [debugToast, setDebugToast] = useState(null);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const prevDebugRef = useRef();

  const currentEvent = useMemo(() => events.find(e => e.id === selectedEventId) || null, [events, selectedEventId]);
  const sortedEvents = useMemo(() => [...events].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [events]);

  const getPricing = useCallback((event) => {
    if (!event) return { global: 0, server: 0 };
    if (event.pricingType === 'dynamic' && event.dynamicPrices?.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const sorted = [...event.dynamicPrices].sort((a, b) => a.dateUntil.localeCompare(b.dateUntil));
      for (const tier of sorted) {
        if (today <= tier.dateUntil) {
          return { global: Number(tier.globalCost), server: Number(tier.serverCost) };
        }
      }
    }
    return { global: Number(event.globalCost || 0), server: Number(event.serverCost || 0) };
  }, []);

  const currentPricing = useMemo(() => getPricing(currentEvent), [currentEvent, getPricing]);

  const getPersonCost = useCallback((person, pricing) => {
    if (person.isServer === 'Sí' && person.serverAssignment === 'Ambos') {
      return pricing.server;
    }
    return pricing.global;
  }, []);

  const [logs, setLogs] = useState([]);
  const [logFilterContext, setLogFilterContext] = useState('all');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [allParticipants, setAllParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState("Summary");
  const [showMoney, setShowMoney] = useState(true);
  const [showLocChartValues, setShowLocChartValues] = useState(false);
  const [showIncChartValues, setShowIncChartValues] = useState(false);
  const [summaryView, setSummaryView] = useState("all");
  const [summaryServerView, setSummaryServerView] = useState("all");
  const [isAddLocModalOpen, setIsAddLocModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [locError, setLocError] = useState('');
  const [tempEventDate, setTempEventDate] = useState("");
  const [tempDeposit, setTempDeposit] = useState("");
  const [tempRealCost, setTempRealCost] = useState("");
  const [newCustomField, setNewCustomField] = useState("");

  const [newEntry, setNewEntry] = useState(EMPTY_ENTRY);
  const [editRegistryModal, setEditRegistryModal] = useState({ isOpen: false, loc: '', data: null });
  const [pricingModal, setPricingModal] = useState({ isOpen: false });
  const [pricingForm, setPricingForm] = useState({ type: 'fixed', globalCost: 0, serverCost: 0, phases: [] });
  const [customFieldsModal, setCustomFieldsModal] = useState({ isOpen: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("none");
  const [filterSwim, setFilterSwim] = useState("all");
  const [filterMedical, setFilterMedical] = useState("all");
  const [filterScholarship, setFilterScholarship] = useState("all");
  const [filterServer, setFilterServer] = useState("all");
  const [filterAssignment, setFilterAssignment] = useState("all");
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, loc: '', id: null, personName: '', amount: '', currentPaid: 0, error: '', isScholarship: 'No', baseCost: 0 });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [editingUser, setEditingUser] = useState({ isOpen: false, id: null, username: '', currentPasswordInput: '', newPassword: '', confirmPassword: '', role: 'Editor', canViewFinances: false });
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, log: null, type: 'single' });

  // Security Access Definitions
  const hasFinancialAccess = currentUser ? (['Administrador', 'SuperUsuario', 'Editor'].includes(currentUser.role) || currentUser.canViewFinances) : false;
  const canSeeMoney = showMoney && hasFinancialAccess;
  const formatMoney = (amount) => canSeeMoney ? `$${parseFloat(amount || 0).toLocaleString()}` : '$***';

  // Navigation Logic
  const goTo = useCallback((view, eventId, tab) => {
    if (view === systemView && eventId === selectedEventId && tab === activeTab) return;
    setNavHistory(prev => [...prev, { systemView, selectedEventId, activeTab }]);
    setSystemView(view);
    setSelectedEventId(eventId);
    setActiveTab(tab);
    setShowViewSettings(false);
  }, [systemView, selectedEventId, activeTab]);

  const goBack = useCallback(() => {
    setNavHistory(prev => {
      if (prev.length === 0) return prev;
      const newHist = [...prev];
      const last = newHist.pop();
      setSystemView(last.systemView);
      setSelectedEventId(last.selectedEventId);
      setActiveTab(last.activeTab);
      setShowViewSettings(false);
      return newHist;
    });
  }, []);

  // Load User Preferences
  useEffect(() => {
    if (currentUser?.id) {
      const savedPrefs = localStorage.getItem(`vina_prefs_${currentUser.id}`);
      if (savedPrefs) {
        setViewPrefs({ ...defaultViewPrefs, ...JSON.parse(savedPrefs) });
      } else {
        setViewPrefs(defaultViewPrefs);
      }
    }
  }, [currentUser?.id]);

  const togglePref = (key) => {
    setViewPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (currentUser?.id) {
        localStorage.setItem(`vina_prefs_${currentUser.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Watcher for Debug Mode Global Toast
  useEffect(() => {
    if (!globalConfig) return;

    const current = globalConfig.isDebugMode;
    const prev = prevDebugRef.current;

    if (prev !== undefined && current !== prev) {
      if (current) {
        setDebugToast({
          msg: "El modo de depuración se activó. Las modificaciones con el insecto no son permanentes y se eliminarán.",
          type: "active"
        });
      } else {
        setDebugToast({
          msg: "El modo de depuración terminó.",
          type: "inactive"
        });
      }
      
      const timer = setTimeout(() => setDebugToast(null), 10000);
      return () => clearTimeout(timer);
    }
    prevDebugRef.current = current;
  }, [globalConfig?.isDebugMode]);

  const applyRevert = async (revertInfo) => {
    if (!revertInfo) return;
    const { collectionName, docId, action, previousData } = revertInfo;
    try {
      if (action === 'create') {
        await deleteDoc(getDocRef(collectionName, docId));
      } else if (action === 'update' || action === 'delete') {
        if (previousData) {
          await setDoc(getDocRef(collectionName, docId), previousData);
        }
      }
    } catch (err) {
      console.error("Error al revertir:", err);
    }
  };

  // Toggle Debug Mode (Global via Firestore)
  const toggleDebugMode = async () => {
    if (!globalConfig?.isDebugMode) {
      const newSessionId = Date.now();
      await updateDoc(getDocRef('app_data', 'config'), { isDebugMode: true, debugSessionId: newSessionId });
      
      const newLogId = Date.now() + 1;
      await setDoc(getDocRef('app_logs', String(newLogId)), {
        id: newLogId,
        eventId: 'Global',
        eventName: 'Sistema',
        timestamp: new Date().toLocaleString('es-MX'),
        username: currentUser.username,
        action: 'Modo Depuración',
        details: `El SuperUsuario "${currentUser.username}" activó el modo de depuración. Los cambios realizados durante esta sesión serán revertidos al salir.`,
        revertInfo: null,
        isDebug: false,        // ← importante: este log es PERMANENTE, no se revierte
        debugSessionId: newSessionId
      });
    } else {
      const currentSession = globalConfig.debugSessionId;
      const logsToRevert = logs.filter(l => l.debugSessionId === currentSession && l.revertInfo).sort((a,b) => b.id - a.id);
      
      for (const l of logsToRevert) {
        await applyRevert(l.revertInfo);
      }
      
      await updateDoc(getDocRef('app_data', 'config'), { isDebugMode: false, debugSessionId: null });
      
      const newLogId = Date.now() + 1;
      await setDoc(getDocRef('app_logs', String(newLogId)), {
        id: newLogId, eventId: 'Global', eventName: 'Sistema',
        timestamp: new Date().toLocaleString('es-MX'),
        username: currentUser.username, action: 'Sistema', details: `Salió de depuración. Se revirtieron ${logsToRevert.length} acciones temporales.`, revertInfo: null
      });
    }
  };

  useEffect(() => {
    if (currentEvent) {
      setTempEventDate(currentEvent.date || "");
      setTempDeposit(currentEvent.minDeposit || 0);
      setTempRealCost(currentEvent.realCost || 0);
      setNewEntry(EMPTY_ENTRY);
    }
  }, [currentEvent]);

  useEffect(() => {
    setExpandedRows(new Set());
  }, [activeTab]);

  useEffect(() => {
    if (systemView !== 'users') {
      setNewUser({ username: '', password: '', role: 'Editor', canViewFinances: false });
      setEditingUser({ isOpen: false, id: null, username: '', currentPasswordInput: '', newPassword: '', confirmPassword: '', role: 'Editor', canViewFinances: false });
    }
  }, [systemView]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (e) {
            console.warn("Custom token fallback:", e);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error authenticating to Firebase:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    const unsubConfig = onSnapshot(getDocRef('app_data', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalLocations(docSnap.data().locations || defaultLocations);
        setGlobalConfig(docSnap.data());
      } else {
        setDoc(getDocRef('app_data', 'config'), { locations: defaultLocations, isDebugMode: false, debugSessionId: null });
        setGlobalLocations(defaultLocations);
      }
    }, console.error);

    const unsubEvents = onSnapshot(getColRef('app_events'), (snap) => {
      if (snap.empty) {
        const ev1 = {
          id: 'evt_campa', name: "Campa 2026: Lazos Inquebrantables",
          pricingType: 'fixed', globalCost: 3400, serverCost: 4000, dynamicPrices: [],
          minDeposit: 500, eventType: 'Campa', date: '2026-07-20', realCost: 0,
          locations: defaultLocations, regStatus: defaultRegStatus, order: 0
        };
        const ev2 = {
          id: 'evt_alducin', name: "Desayuno Conferencia Dr. Armando Alducin Marzo 2026",
          pricingType: 'fixed', globalCost: 350, serverCost: 0, dynamicPrices: [],
          minDeposit: 150, eventType: 'Desayuno Conferencia', date: '2026-03-14', realCost: 0,
          locations: defaultLocations, regStatus: defaultRegStatus, order: 1
        };
        setDoc(getDocRef('app_events', ev1.id), ev1);
        setDoc(getDocRef('app_events', ev2.id), ev2);
      } else {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, console.error);

    const unsubUsers = onSnapshot(getColRef('app_users'), (snap) => {
      if (!snap.empty) {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        const initialUser = { username: 'admin', password: '123', role: 'SuperUsuario', canViewFinances: true };
        setDoc(getDocRef('app_users', '1'), initialUser);
      }
    }, console.error);

    const unsubLogs = onSnapshot(getColRef('app_logs'), (snap) => {
      const logsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      logsList.sort((a, b) => b.id - a.id);
      setLogs(logsList);
    }, console.error);

    const unsubParticipants = onSnapshot(getColRef('app_participants'), (snap) => {
      setAllParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, console.error);

    return () => { unsubConfig(); unsubEvents(); unsubUsers(); unsubLogs(); unsubParticipants(); };
  }, [fbUser]);

  const data = useMemo(() => {
    if (!currentEvent) return {};
    const groupedData = globalLocations.reduce((acc, loc) => ({ ...acc, [loc]: [] }), {});
    allParticipants.forEach(p => {
      if (p.eventId === currentEvent.id) {
        if (!groupedData[p.location]) groupedData[p.location] = [];
        groupedData[p.location].push(p);
      }
    });
    return groupedData;
  }, [allParticipants, currentEvent, globalLocations]);

  const isLocOpen = useCallback((loc) => {
    return currentEvent ? currentEvent.regStatus?.[loc] !== false : false;
  }, [currentEvent]);

  const addLog = useCallback(async (action, details, overrideUsername = null, targetEvent = null, revertInfo = null) => {
    const username = overrideUsername || currentUser?.username;
    if (!username) return;

    const ev = targetEvent || currentEvent;
    const newLogId = Date.now();
    const newLog = {
      id: newLogId,
      eventId: ev?.id || 'Global',
      eventName: ev?.name || 'Sistema',
      timestamp: new Date().toLocaleString('es-MX'),
      username, action, details, revertInfo,
      ...(globalConfig?.isDebugMode ? { isDebug: true, debugSessionId: globalConfig.debugSessionId } : {})
    };
    await setDoc(getDocRef('app_logs', String(newLogId)), newLog);
  }, [currentUser, currentEvent, globalConfig]);

  const handleCleanLogs = () => {
    if (!hasAdminRights) return;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const logsToDelete = logs.filter(log => (now - log.id) > thirtyDaysMs);
    if (logsToDelete.length > 0) {
      logsToDelete.forEach(async (log) => await deleteDoc(getDocRef('app_logs', String(log.id))));
      addLog('Limpieza de Logs', `Se eliminaron ${logsToDelete.length} registros antiguos (> 30 días).`);
      showToast(`Se eliminaron ${logsToDelete.length} registros antiguos.`);
    } else {
      showToast("No hay registros con más de 30 días de antigüedad.");
    }
  };

  const handleCleanRecentLogs = () => {
    if (!isSuperUser) return;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const logsToDelete = logs.filter(log => (now - log.id) <= thirtyDaysMs);
    if (logsToDelete.length > 0) {
      logsToDelete.forEach(async (log) => await deleteDoc(getDocRef('app_logs', String(log.id))));
      addLog('Limpieza de Logs', `El SuperUsuario eliminó ${logsToDelete.length} registros recientes (< 30 días).`);
      showToast(`Se eliminaron ${logsToDelete.length} registros recientes.`);
    } else {
      showToast("No hay registros recientes para eliminar.");
    }
  };

  const confirmRestore = async () => {
    const { log, type } = restoreModal;

    if (type === 'single') {
      await applyRevert(log.revertInfo);
      addLog('Restauración', `Se deshizo el cambio específico: "${log.action}" del usuario ${log.username}.`);
      showToast("Cambio revertido exitosamente.");
    } else if (type === 'rollback') {
      const logsToRevert = logs.filter(l => l.id >= log.id && l.revertInfo && !l.isDebug).sort((a,b) => b.id - a.id);
      for (const l of logsToRevert) {
        await applyRevert(l.revertInfo);
      }
      addLog('Restauración Masiva', `El SuperUsuario revirtió todos los cambios hasta el evento: "${log.action}" (${log.timestamp}).`);
      showToast(`Se han revertido ${logsToRevert.length} cambios exitosamente.`);
    } else if (type === 'cleanOld') {
      handleCleanLogs();
    } else if (type === 'cleanRecent') {
      handleCleanRecentLogs();
    } else if (type === 'backup') {
      try {
        const backupSnap = await getDoc(getDocRef('app_backups', log.revertInfo.backupId));
        if (!backupSnap.exists()) {
          showToast("Error: No se encontró la información de la copia de seguridad.");
          setRestoreModal({ isOpen: false, log: null, type: 'single' });
          return;
        }
        const backupData = backupSnap.data();

        // Limpiar registros actuales
        await Promise.all(allParticipants.map(p => deleteDoc(getDocRef('app_participants', String(p.id)))));
        await Promise.all(events.map(e => deleteDoc(getDocRef('app_events', String(e.id)))));

        // Insertar registros de backup
        await Promise.all(backupData.participants.map(p => setDoc(getDocRef('app_participants', String(p.id)), p)));
        await Promise.all(backupData.events.map(e => setDoc(getDocRef('app_events', String(e.id)), e)));

        addLog('Restauración de Sistema', `El SuperUsuario restauró el sistema desde la copia de seguridad del ${backupData.date}.`);
        showToast("Sistema restaurado con éxito desde copia de seguridad.");
      } catch (err) {
        console.error(err);
        showToast("Error crítico al restaurar la copia de seguridad.");
      }
    }
    setRestoreModal({ isOpen: false, log: null, type: 'single' });
  };

  const updateEventConfig = useCallback(async (updates) => {
    if (!currentEvent) return;
    const payload = { ...updates };
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }
    await updateDoc(getDocRef('app_events', currentEvent.id), payload);
  }, [currentEvent, globalConfig]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      const loginTime = Date.now();
      setCurrentUser({ ...user, loginTime });
      setLoginError('');
      setLoginForm({ username: '', password: '' });
      addLog('Inicio de Sesión', `El usuario ${user.username} inició sesión.`, user.username);
      await updateDoc(getDocRef('app_users', String(user.id)), { isOnline: true });
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      const activeTime = Date.now() - (currentUser.loginTime || Date.now());
      const formattedTime = formatDuration(activeTime);
      addLog('Cierre de Sesión', `El usuario ${currentUser.username} cerró sesión manualmente. (Tiempo activo: ${formattedTime})`, currentUser.username);
      await updateDoc(getDocRef('app_users', String(currentUser.id)), { isOnline: false }).catch(() => {});
    }
    setNavHistory([]);
    setCurrentUser(null);
    setSelectedEventId(null);
    setActiveTab("Summary");
    setSystemView('events');
    setShowViewSettings(false);
  };

  // Automated Daily Backup Logic
  useEffect(() => {
    const performDailyBackup = async () => {
      if (!globalConfig || !hasAdminRights || events.length === 0 || allParticipants.length === 0) return;

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

      if (globalConfig.lastBackupDate !== today) {
        try {
          await updateDoc(getDocRef('app_data', 'config'), { lastBackupDate: today });
          const backupData = {
            date: today,
            timestamp: Date.now(),
            participants: allParticipants,
            events: events,
            users: users.map(u => ({...u, password: '***'})) 
          };
          await setDoc(getDocRef('app_backups', today), backupData);
          addLog('Sistema', `Copia de seguridad automática diaria (${today}) generada exitosamente.`, 'Sistema', null, { isBackup: true, backupId: today });
        } catch (e) {
          console.error("Backup automatico falló", e);
        }
      }
    };
    performDailyBackup();
  }, [globalConfig, events, allParticipants, users, hasAdminRights, addLog]);

  // Activity Watcher and Session Logout Logic
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId;
    let throttleTimeoutId;
    let isClosing = false; // Flag to prevent multiple close logs

    // Best-effort synchronous write before unload/tab close
    const handleBrowserClose = () => {
      if (currentUser?.id && !isClosing) {
        isClosing = true;
        const activeTime = Date.now() - (currentUser.loginTime || Date.now());
        const formattedTime = formatDuration(activeTime);
        
        // Ejecución sincrónica; Firebase intenta cachear y emitir por WebSocket
        addLog(
          'Cierre de Sesión Automático',
          `Sesión finalizada por cierre de navegador o pestaña. (Tiempo activo: ${formattedTime})`,
          currentUser.username
        );
        updateDoc(getDocRef('app_users', String(currentUser.id)), { isOnline: false }).catch(() => {});
      }
    };

    const setOffline = () => {
      if (currentUser?.id) {
        updateDoc(getDocRef('app_users', String(currentUser.id)), { isOnline: false }).catch(() => {});
      }
    };

    const performLogout = async () => {
      const activeTime = Date.now() - (currentUser.loginTime || Date.now());
      const formattedTime = formatDuration(activeTime);
      addLog('Cierre de Sesión Automático', `Sesión finalizada por inactividad. (Tiempo activo: ${formattedTime})`, currentUser.username);
      await setOffline();
      setNavHistory([]);
      setCurrentUser(null);
      setSelectedEventId(null);
      setActiveTab("Summary");
      setSystemView('events');
      showToast("Tu sesión ha expirado por inactividad de 10 minutos.");
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(performLogout, 10 * 60 * 1000); 
    };

    const handleActivity = () => {
      if (throttleTimeoutId) return;
      throttleTimeoutId = setTimeout(() => {
        throttleTimeoutId = null;
        resetTimer();
      }, 1000);
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    resetTimer();
    activityEvents.forEach(e => window.addEventListener(e, handleActivity));
    
    // Detect tab/browser close explicitly to log the session end.
    window.addEventListener('beforeunload', handleBrowserClose);
    window.addEventListener('pagehide', handleBrowserClose);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(throttleTimeoutId);
      activityEvents.forEach(e => window.removeEventListener(e, handleActivity));
      window.removeEventListener('beforeunload', handleBrowserClose);
      window.removeEventListener('pagehide', handleBrowserClose);
    };
  }, [currentUser, addLog, showToast]);

  // Real-time Session Permission Sync
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const liveUser = users.find(u => String(u.id) === String(currentUser.id));
      if (liveUser) {
        const roleChanged = liveUser.role !== currentUser.role;
        const financesChanged = liveUser.canViewFinances !== currentUser.canViewFinances;

        if (roleChanged || financesChanged) {
          setCurrentUser(prev => ({ ...prev, role: liveUser.role, canViewFinances: liveUser.canViewFinances }));
          if (financesChanged && liveUser.role === 'Lector') {
            showToast(`Atención: Tus permisos han cambiado. Ahora ${liveUser.canViewFinances ? 'PUEDES' : 'NO PUEDES'} ver información financiera.`);
          } else if (roleChanged) {
            showToast(`Atención: Tu rol ha sido actualizado a ${liveUser.role}.`);
          }
        }
      }
    }
  }, [users, currentUser?.id, currentUser?.role, currentUser?.canViewFinances, showToast]);

  const handleCreateEvent = async () => {
    if (!newEventData.name.trim()) return;
    const newEvt = {
      id: 'evt_' + Date.now(),
      name: newEventData.name.trim(),
      eventType: newEventData.type,
      date: newEventData.date,
      pricingType: 'fixed', 
      globalCost: Number(newEventData.baseCost) || 0, 
      serverCost: 0, 
      realCost: 0,
      dynamicPrices: [],
      minDeposit: 0, locations: defaultLocations, regStatus: defaultRegStatus,
      customFields: [], order: events.length,
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {})
    };
    await setDoc(getDocRef('app_events', newEvt.id), newEvt);
    addLog('Gestión de Eventos', `Creó un nuevo evento (${newEvt.eventType}): ${newEvt.name} con base de $${newEvt.globalCost}`, null, newEvt, { collectionName: 'app_events', docId: newEvt.id, action: 'create', previousData: null });
    setIsAddEventModalOpen(false);
    setNewEventData({ name: '', type: 'Campa', date: '', baseCost: '' });
  };

  const handleRenameEvent = async () => {
    if (!renameModal.name.trim() || !renameModal.id) return;
    const ev = events.find(e => e.id === renameModal.id);
    if (ev && ev.name !== renameModal.name.trim()) {
      const payload = { name: renameModal.name.trim() };
      if (globalConfig?.isDebugMode) { payload._isDebug = true; payload._debugSessionId = globalConfig.debugSessionId; }
      
      await updateDoc(getDocRef('app_events', ev.id), payload);
      addLog('Gestión de Eventos', `Renombró evento: "${ev.name}" -> "${renameModal.name.trim()}"`, null, ev, { collectionName: 'app_events', docId: ev.id, action: 'update', previousData: ev });
      showToast("Nombre del evento actualizado.");
    }
    setRenameModal({ isOpen: false, id: null, name: '' });
  };

  const confirmDeleteEvent = async () => {
    if (!deleteEventModal.id) return;
    const evToDelete = events.find(e => e.id === deleteEventModal.id);
    await deleteDoc(getDocRef('app_events', deleteEventModal.id));
    addLog('Gestión de Eventos', `Eliminó el evento: ${deleteEventModal.name}`, null, evToDelete || { name: deleteEventModal.name }, { collectionName: 'app_events', docId: deleteEventModal.id, action: 'delete', previousData: evToDelete });
    setDeleteEventModal({ isOpen: false, id: null, name: '' });
    showToast("Evento eliminado con éxito.");
  };

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (draggedEventId === targetId || !draggedEventId) return;
    const draggedIdx = sortedEvents.findIndex(ev => ev.id === draggedEventId);
    const targetIdx = sortedEvents.findIndex(ev => ev.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const newEventsOrder = [...sortedEvents];
    const [draggedItem] = newEventsOrder.splice(draggedIdx, 1);
    newEventsOrder.splice(targetIdx, 0, draggedItem);
    
    newEventsOrder.forEach((ev, index) => {
      if ((ev.order ?? -1) !== index) {
        const payload = { order: index };
        if (globalConfig?.isDebugMode) { payload._isDebug = true; payload._debugSessionId = globalConfig.debugSessionId; }
        updateDoc(getDocRef('app_events', ev.id), payload);
      }
    });
    setDraggedEventId(null);
  };

  const openPricingModal = () => {
    if (!currentEvent) return;
    setPricingForm({
      type: currentEvent.pricingType || 'fixed',
      globalCost: currentEvent.globalCost || 0,
      serverCost: currentEvent.serverCost || 0,
      phases: currentEvent.dynamicPrices || []
    });
    setPricingModal({ isOpen: true });
  };

  const handleSavePricing = async () => {
    if (!currentEvent) return;
    if (pricingForm.type === 'dynamic') {
      if (pricingForm.phases.length === 0) { showToast("Debes añadir al menos una fase de precio."); return; }
      for (const phase of pricingForm.phases) {
        if (!phase.dateUntil) { showToast("Todas las fases deben tener una fecha límite."); return; }
        if (currentEvent.date && phase.dateUntil > currentEvent.date) { showToast("Las fechas de fase no pueden superar la fecha límite del evento."); return; }
      }
      const dates = pricingForm.phases.map(p => p.dateUntil);
      if (dates.length !== new Set(dates).size) { showToast("No puede haber dos fases con la misma fecha límite."); return; }
    }
    const sortedPhases = [...pricingForm.phases].sort((a, b) => a.dateUntil.localeCompare(b.dateUntil));
    await updateEventConfig({
      pricingType: pricingForm.type,
      globalCost: Number(pricingForm.globalCost) || 0,
      serverCost: Number(pricingForm.serverCost) || 0,
      dynamicPrices: sortedPhases.map(p => ({ id: p.id, dateUntil: p.dateUntil, globalCost: Number(p.globalCost) || 0, serverCost: Number(p.serverCost) || 0 }))
    });
    setPricingModal({ isOpen: false });
    addLog('Configuración', `Actualizó la estructura de precios del evento a modalidad ${pricingForm.type}.`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
    showToast('Precios actualizados correctamente.');
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!hasAdminRights) { showToast("Permisos insuficientes."); return; }
    if (!newUser.username.trim() || !newUser.password.trim()) return;
    if (users.some(u => u.username === newUser.username)) { showToast("El usuario ya existe."); return; }
    
    if (newUser.role === 'SuperUsuario' && users.some(u => u.role === 'SuperUsuario')) {
      showToast("Solo puede haber un SuperUsuario en el sistema.");
      return;
    }

    const newId = String(Date.now());
    const userToSave = {
      ...newUser,
      id: newId,
      canViewFinances: ['Administrador', 'SuperUsuario', 'Editor'].includes(newUser.role) ? true : newUser.canViewFinances
    };

    await setDoc(getDocRef('app_users', newId), userToSave);
    addLog('Gestión de Usuarios', `Añadió al nuevo usuario: ${newUser.username} (${newUser.role})`);
    setNewUser({ username: '', password: '', role: 'Editor', canViewFinances: false });
    showToast("Usuario añadido exitosamente.");
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!hasAdminRights) return;
    if (!editingUser.username.trim()) return;
    
    if (editingUser.role === 'SuperUsuario' && users.some(u => u.role === 'SuperUsuario' && String(u.id) !== String(editingUser.id))) {
      showToast("Solo puede haber un SuperUsuario en el sistema.");
      return;
    }

    const originalUser = users.find(u => String(u.id) === String(editingUser.id));
    const existingUser = users.find(u => u.username === editingUser.username && String(u.id) !== String(editingUser.id));
    if (existingUser) { showToast("El usuario ya existe."); return; }
    
    let finalPassword = originalUser.password;
    let passwordChanged = false;

    if (editingUser.currentPasswordInput || editingUser.newPassword) {
      if (editingUser.currentPasswordInput !== originalUser.password) {
        showToast("La contraseña actual es incorrecta.");
        return;
      }
      if (editingUser.newPassword !== editingUser.confirmPassword) {
        showToast("Las nuevas contraseñas no coinciden.");
        return;
      }
      if (!editingUser.newPassword.trim()) {
        showToast("La nueva contraseña no puede estar vacía.");
        return;
      }
      finalPassword = editingUser.newPassword;
      passwordChanged = true;
    }

    const newCanViewFinances = ['Administrador', 'SuperUsuario', 'Editor'].includes(editingUser.role) ? true : editingUser.canViewFinances;

    const changes = [];
    if (originalUser.username !== editingUser.username) changes.push(`Usuario (${originalUser.username} -> ${editingUser.username})`);
    if (originalUser.role !== editingUser.role) changes.push(`Rol (${originalUser.role} -> ${editingUser.role})`);
    if (passwordChanged) changes.push(`Contraseña actualizada`);
    if (originalUser.canViewFinances !== newCanViewFinances) changes.push(`Ver Finanzas (${originalUser.canViewFinances ? 'Sí' : 'No'} -> ${newCanViewFinances ? 'Sí' : 'No'})`);
    
    await updateDoc(getDocRef('app_users', String(editingUser.id)), { username: editingUser.username, password: finalPassword, role: editingUser.role, canViewFinances: newCanViewFinances });
    
    if (currentUser.id === editingUser.id) {
      setCurrentUser({ ...currentUser, username: editingUser.username, password: finalPassword, role: editingUser.role, canViewFinances: newCanViewFinances });
    }
    
    if (changes.length > 0) addLog('Gestión de Usuarios', `Editó al usuario ${originalUser.username}. Cambios: ${changes.join(', ')}`);
    
    setEditingUser({ isOpen: false, id: null, username: '', currentPasswordInput: '', newPassword: '', confirmPassword: '', role: 'Editor', canViewFinances: false });
    showToast("Usuario actualizado.");
  };

  const handleDeleteUser = async (id, username) => {
    if (!hasAdminRights) { showToast("Permisos insuficientes."); return; }
    if (currentUser.id === id) { showToast("No puedes eliminar tu propia cuenta."); return; }
    
    const userToDelete = users.find(u => String(u.id) === String(id));
    if (userToDelete?.role === 'SuperUsuario' && currentUser.role !== 'SuperUsuario') {
      showToast("Solo otro SuperUsuario puede eliminar a un SuperUsuario."); return;
    }

    await deleteDoc(getDocRef('app_users', String(id)));
    addLog('Gestión de Usuarios', `Eliminó al usuario: ${username}`);
    showToast("Usuario eliminado.");
  };

  const isValidPhone = (phone) => phone.startsWith('+') ? phone.length > 5 : phone.replace(/\D/g, '').length === 10;

  const validateForm = (entry, minDep, evType) => {
    if (entry.name.trim() === '' || !isValidPhone(entry.phone)) return false;
    if (evType === 'Campa') {
      if (entry.age === '' || entry.gender === '' || entry.emergencyContact.trim() === '' || !isValidPhone(entry.emergencyPhone)) return false;
      if (entry.hasAllergy !== 'No' && entry.allergyDetails.trim() === '') return false;
      if (entry.hasDisease !== 'No' && entry.diseaseDetails.trim() === '') return false;
      if (entry.hasDisability !== 'No' && entry.disabilityDetails.trim() === '') return false;
      if (entry.isServer === 'Sí' && !entry.serverAssignment) return false;
      if (entry.isScholarship === 'Sí') return true;
    }
    if ((parseFloat(entry.paid) || 0) < minDep) return false;
    return true;
  };

  const isFormValid = currentEvent ? validateForm(newEntry, currentEvent.minDeposit || 0, currentEvent.eventType) : false;
  const handleNameInput = (val) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val);

  const formatPhoneNumber = (value) => {
    if (value.startsWith('+')) return value.replace(/[^\+0-9\s-]/g, '');
    const digits = value.replace(/\D/g, '').substring(0, 10);
    let formatted = digits.substring(0, 2);
    if (digits.length > 2) formatted += '-' + digits.substring(2, 6);
    if (digits.length > 6) formatted += '-' + digits.substring(6, 10);
    return formatted;
  };

  const handleAddLocation = async () => {
    const loc = newLocationName.trim();
    if (!loc || !currentEvent || currentEvent.locations.includes(loc)) return;
    const newLocations = [...currentEvent.locations, loc];
    const newRegStatus = { ...currentEvent.regStatus, [loc]: true };
    await updateEventConfig({ locations: newLocations, regStatus: newRegStatus });
    addLog('Gestión de Sedes', `Añadió la nueva sede: ${loc} al evento ${currentEvent.name}`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
    setNewLocationName(''); setIsAddLocModalOpen(false); goTo(systemView, selectedEventId, loc);
    showToast("Sede añadida.");
  };

  const handleDeleteLocation = async (loc) => {
    if (!currentEvent) return;
    const hasParticipants = allParticipants.some(p => p.eventId === currentEvent.id && p.location === loc);
    if (hasParticipants) { setLocError(loc); setTimeout(() => setLocError(''), 3000); return; }
    const newLocations = currentEvent.locations.filter(l => l !== loc);
    const newRegStatus = { ...currentEvent.regStatus };
    delete newRegStatus[loc];
    await updateEventConfig({ locations: newLocations, regStatus: newRegStatus });
    addLog('Gestión de Sedes', `Eliminó la sede vacía: ${loc} del evento ${currentEvent.name}`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
    goTo(systemView, selectedEventId, 'Summary');
    showToast("Sede eliminada.");
  };

  const handleAddCustomField = async () => {
    if (!newCustomField.trim() || !currentEvent) return;
    const currentFields = currentEvent.customFields || [];
    if (currentFields.includes(newCustomField.trim())) return;
    const updated = [...currentFields, newCustomField.trim()];
    await updateEventConfig({ customFields: updated });
    addLog('Campos Extra', `Añadió el campo "${newCustomField.trim()}" al evento.`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
    setNewCustomField('');
  };

  const handleRemoveCustomField = async (field) => {
    if (!currentEvent) return;
    const updated = (currentEvent.customFields || []).filter(f => f !== field);
    await updateEventConfig({ customFields: updated });
    addLog('Campos Extra', `Eliminó el campo "${field}" del evento.`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
  };

  const exportToCSV = () => {
    if (!currentEvent) return;
    const isCampa = currentEvent.eventType === 'Campa';
    const isGeneral = currentEvent.eventType === 'General';
    const evtParticipants = allParticipants.filter(p => p.eventId === currentEvent.id);

    const headers = ['Nombre', 'Teléfono', 'Sede', 'Pagado', 'Costo Final', 'Adeudo'];
    
    if (isCampa) {
      headers.push('Edad', 'Género', 'Tipo Sangre', 'Nado', 'Alergias', 'Enfermedades', 'Discapacidades', 'Contacto Emergencia', 'Tel Emergencia', 'Becado', 'Servidor', 'Asignación');
    } else if (isGeneral) {
      headers.push('Edad', 'Género', 'Contacto Emergencia', 'Tel Emergencia');
      if (currentEvent.customFields) headers.push(...currentEvent.customFields);
    } else {
      headers.push('Edad', 'Género');
    }

    const rows = evtParticipants.map(p => {
      const baseCost = p.registeredCost != null ? Number(p.registeredCost) : getPersonCost(p, currentPricing);
      const isBecado = p.isScholarship === 'Sí';
      const debt = isBecado ? 0 : baseCost - parseFloat(p.paid || 0);

      const row = [
        escapeCSV(p.name), escapeCSV(p.phone), escapeCSV(p.location),
        p.paid || 0, baseCost, debt
      ];

      if (isCampa) {
        row.push(
          p.age || '', p.gender || '', p.bloodType || '', p.canSwim || '',
          escapeCSV(p.hasAllergy === 'Sí' ? p.allergyDetails : 'No'),
          escapeCSV(p.hasDisease === 'Sí' ? p.diseaseDetails : 'No'),
          escapeCSV(p.hasDisability === 'Sí' ? p.disabilityDetails : 'No'),
          escapeCSV(p.emergencyContact), escapeCSV(p.emergencyPhone),
          p.isScholarship || 'No', p.isServer || 'No',
          escapeCSV(p.isServer === 'Sí' ? p.serverAssignment : p.campAssignment)
        );
      } else if (isGeneral) {
        row.push(p.age || '', p.gender || '', escapeCSV(p.emergencyContact), escapeCSV(p.emergencyPhone));
        if (currentEvent.customFields) {
          currentEvent.customFields.forEach(f => row.push(escapeCSV(p.customData?.[f])));
        }
      } else {
        row.push(p.age || '', p.gender || '');
      }
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Registros_${currentEvent.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('es-MX')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = useMemo(() => {
    let totalMen = 0, totalWomen = 0, totalSwimmers = 0, totalNonSwimmers = 0;
    let totalAllergies = 0, totalDiseases = 0, totalDisabilities = 0, totalServers = 0;
    let totalMinors = 0, totalAdults = 0, totalServersBoth = 0;
    let totalPaidOff = 0, totalWithDebt = 0;
    
    let ageBrackets = { kids: 0, teens: 0, youngAdults: 0, adults: 0, seniors: 0 };

    let bloodTypeStats = {};
    BLOOD_TYPES.forEach(bt => bloodTypeStats[bt] = 0);
    
    let customFieldsStats = {};
    if (currentEvent?.customFields) currentEvent.customFields.forEach(f => customFieldsStats[f] = {});

    let globalStats = {
      all: { count: 0, scholarship: 0, servers: 0, paid: 0, pending: 0, expected: 0 },
      regular: { count: 0, paid: 0, pending: 0, expected: 0 },
      scholarship: { count: 0, paid: 0, pending: 0, expected: 0 }
    };
    let locationStats = {};

    if (currentEvent) {
      (currentEvent.locations || []).forEach(loc => {
        let stats = {
          all: { count: 0, scholarship: 0, servers: 0, paid: 0, pending: 0, expected: 0 },
          regular: { count: 0, paid: 0, pending: 0, expected: 0 },
          scholarship: { count: 0, paid: 0, pending: 0, expected: 0 }
        };
        (data[loc] || []).forEach(person => {
          if (person.gender === 'Hombre') totalMen++;
          else if (person.gender === 'Mujer') totalWomen++;
          if (person.canSwim === 'Sí') totalSwimmers++; else totalNonSwimmers++;
          if (person.hasAllergy === 'Sí') totalAllergies++;
          if (person.hasDisease === 'Sí') totalDiseases++;
          if (person.hasDisability === 'Sí') totalDisabilities++;
          if (person.isServer === 'Sí') { totalServers++; stats.all.servers++; }
          
          if (person.bloodType) {
            bloodTypeStats[person.bloodType] = (bloodTypeStats[person.bloodType] || 0) + 1;
          }

          const ageNum = parseInt(person.age) || 0;
          if (ageNum > 0) {
            if (ageNum < 13) ageBrackets.kids++;
            else if (ageNum <= 17) ageBrackets.teens++;
            else if (ageNum <= 25) ageBrackets.youngAdults++;
            else if (ageNum <= 40) ageBrackets.adults++;
            else ageBrackets.seniors++;
          }

          if (currentEvent.eventType === 'Campa') {
            if (person.isServer === 'Sí') {
              if (person.serverAssignment === 'Teens') totalMinors++;
              else if (person.serverAssignment === 'Jóvenes') totalAdults++;
              else if (person.serverAssignment === 'Ambos') { totalMinors++; totalAdults++; totalServersBoth++; }
            } else {
              const assignment = person.campAssignment || (ageNum < 18 ? 'Teens' : 'Jóvenes');
              if (assignment === 'Teens') totalMinors++; else totalAdults++;
            }
          }

          if (currentEvent.eventType === 'General' && currentEvent.customFields) {
            currentEvent.customFields.forEach(field => {
              const val = person.customData?.[field]?.trim() || 'Sin especificar';
              customFieldsStats[field][val] = (customFieldsStats[field][val] || 0) + 1;
            });
          }

          const paid = parseFloat(person.paid || 0);
          const isBecado = person.isScholarship === 'Sí';
          const baseCost = person.registeredCost != null
            ? Number(person.registeredCost)
            : getPersonCost(person, currentPricing);

          if (isBecado || paid >= baseCost) totalPaidOff++;
          else totalWithDebt++;

          stats.all.count++;
          stats.all.paid += paid;

          if (isBecado && currentEvent.eventType === 'Campa') {
            stats.all.scholarship++;
            stats.scholarship.count++;
            stats.scholarship.paid += paid;
            stats.scholarship.expected += paid;
          } else {
            stats.regular.count++;
            stats.regular.paid += paid;
            stats.regular.pending += (baseCost - paid);
            stats.regular.expected += baseCost;
          }
        });

        stats.all.pending = stats.regular.pending;
        stats.all.expected = stats.regular.expected + stats.scholarship.expected;

        globalStats.all.count += stats.all.count;
        globalStats.all.scholarship += stats.all.scholarship;
        globalStats.all.servers += stats.all.servers;
        globalStats.all.paid += stats.all.paid;
        globalStats.all.pending += stats.all.pending;
        globalStats.all.expected += stats.all.expected;
        globalStats.regular.count += stats.regular.count;
        globalStats.regular.paid += stats.regular.paid;
        globalStats.regular.pending += stats.regular.pending;
        globalStats.regular.expected += stats.regular.expected;
        globalStats.scholarship.count += stats.scholarship.count;
        globalStats.scholarship.paid += stats.scholarship.paid;
        globalStats.scholarship.pending += stats.scholarship.pending;
        globalStats.scholarship.expected += stats.scholarship.expected;
        
        locationStats[loc] = stats;
      });
    }

    return {
      totalMen, totalWomen, totalSwimmers, totalNonSwimmers,
      totalAllergies, totalDiseases, totalDisabilities, totalServers,
      totalMinors, totalAdults, totalServersBoth, totalPaidOff, totalWithDebt,
      ageBrackets, bloodTypeStats, customFieldsStats, locationStats, globalStats
    };
  }, [data, currentEvent, currentPricing, getPersonCost]); 

  const handleAddEntry = async (loc) => {
    if (!isFormValid || !isLocOpen(loc)) return;
    const newPersonId = String(Date.now());
    const initialPaid = parseFloat(newEntry.paid) || 0;
    const initialHistory = initialPaid > 0 ? [{ id: Date.now() + 1, date: new Date().toLocaleString('es-MX'), amount: initialPaid, registeredBy: currentUser?.username }] : [];

    const registeredCost = (newEntry.isServer === 'Sí' && newEntry.serverAssignment === 'Ambos')
      ? currentPricing.server
      : currentPricing.global;

    const initialCampAssignment = currentEvent.eventType === 'Campa' && newEntry.isServer !== 'Sí' 
      ? (parseInt(newEntry.age) < 18 ? 'Teens' : 'Jóvenes') 
      : '';

    const personData = { 
      ...newEntry, 
      id: newPersonId, 
      location: loc, 
      eventId: currentEvent.id, 
      paymentHistory: initialHistory, 
      registeredCost, 
      campAssignment: initialCampAssignment,
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {})
    };

    if (currentEvent.eventType !== 'Campa') {
      personData.isScholarship = 'No'; personData.isServer = 'No'; personData.serverAssignment = '';
      personData.canSwim = 'No'; personData.hasAllergy = 'No'; personData.hasDisease = 'No'; personData.hasDisability = 'No';
    }

    await setDoc(getDocRef('app_participants', newPersonId), personData);
    const isLiquidado = personData.isScholarship === 'No' && initialPaid >= registeredCost;
    addLog('Nuevo Registro', `Inscribió a ${newEntry.name} en la sede ${loc}. (Pago inicial: $${initialPaid})${isLiquidado ? ' [LIQUIDADO]' : ''}`, null, null, { collectionName: 'app_participants', docId: newPersonId, action: 'create', previousData: null });
    setNewEntry(EMPTY_ENTRY);
    showToast("Registro añadido exitosamente.");
  };

  const handleUpdateEntry = async (e) => {
    e.preventDefault();
    const { loc, data: editedPerson } = editRegistryModal;
    if (!validateForm(editedPerson, 0, currentEvent.eventType)) return;

    const originalPerson = (data[loc] || []).find(p => String(p.id) === String(editedPerson.id));
    const changes = [];
    const fieldsToTrack = [
      { key: 'name', label: 'Nombre' }, { key: 'phone', label: 'Teléfono' }, { key: 'paid', label: 'Monto Pagado' },
      { key: 'isScholarship', label: 'Becado' }, { key: 'isServer', label: 'Servidor' },
      { key: 'serverAssignment', label: 'Asignación' }, { key: 'campAssignment', label: 'Asig. Campista' }, { key: 'canSwim', label: 'Nado' }, { key: 'age', label: 'Edad' },
      { key: 'hasAllergy', label: 'Alergia' }, { key: 'allergyDetails', label: 'Detalle Alergia' },
      { key: 'hasDisease', label: 'Enfermedad' }, { key: 'diseaseDetails', label: 'Detalle Enfermedad' },
      { key: 'hasDisability', label: 'Discapacidad' }, { key: 'disabilityDetails', label: 'Detalle Discapacidad' }
    ];
    fieldsToTrack.forEach(f => {
      if (String(originalPerson[f.key]) !== String(editedPerson[f.key]))
        changes.push(`${f.label} (${originalPerson[f.key]} -> ${editedPerson[f.key]})`);
    });

    const originalPaid = parseFloat(originalPerson.paid || 0);
    const newPaid = parseFloat(editedPerson.paid || 0);
    let updatedHistory = editedPerson.paymentHistory || [];
    let finalRegisteredCost = editedPerson.registeredCost;

    if (hasAdminRights && newPaid !== originalPaid) {
      updatedHistory = [...updatedHistory, {
        id: Date.now(), date: new Date().toLocaleString('es-MX'),
        amount: newPaid - originalPaid, registeredBy: currentUser?.username, isManualAdjustment: true
      }];
    }

    if (originalPerson.isServer !== editedPerson.isServer || originalPerson.serverAssignment !== editedPerson.serverAssignment) {
      finalRegisteredCost = (editedPerson.isServer === 'Sí' && editedPerson.serverAssignment === 'Ambos')
        ? currentPricing.server
        : currentPricing.global;
      changes.push(`Costo Ajustado a ${finalRegisteredCost}`);
    }

    const payload = {
      ...editedPerson, location: loc, eventId: currentEvent.id, paymentHistory: updatedHistory, registeredCost: finalRegisteredCost
    };

    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }

    await setDoc(getDocRef('app_participants', String(editedPerson.id)), payload);

    if (changes.length > 0) {
      const isLiquidado = editedPerson.isScholarship === 'No' && parseFloat(editedPerson.paid) >= finalRegisteredCost;
      addLog('Actualización de Registro', `Modificó datos de ${originalPerson.name} en ${loc}.${isLiquidado ? ' [LIQUIDADO]' : ''} Cambios: ${changes.join(', ')}`, null, null, { collectionName: 'app_participants', docId: String(editedPerson.id), action: 'update', previousData: originalPerson });
    }
    setEditRegistryModal({ isOpen: false, loc: '', data: null });
    showToast("Registro actualizado.");
  };

  const removeEntry = async (loc, id) => {
    const person = (data[loc] || []).find(p => String(p.id) === String(id));
    if (person) {
      await deleteDoc(getDocRef('app_participants', String(id)));
      addLog('Eliminación de Registro', `Eliminó el registro de ${person.name} en la sede ${loc}.`, null, null, { collectionName: 'app_participants', docId: String(id), action: 'delete', previousData: person });
      showToast("Registro eliminado.");
    }
  };

  const toggleRegStatus = async (loc) => {
    if (!hasAdminRights) {
      showToast("Permisos insuficientes. Solo administradores pueden cambiar el estado.");
      return;
    }
    const newStatus = !isLocOpen(loc);
    await updateEventConfig({ regStatus: { ...currentEvent.regStatus, [loc]: newStatus } });
    addLog('Cambio de Estado', `${newStatus ? 'Abrió' : 'Cerró'} las inscripciones en la sede ${loc}.`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitAbono = async () => {
    if (!paymentModal.amount) return;
    const addedAmount = parseFloat(paymentModal.amount) || 0;
    if (addedAmount < 0) { setPaymentModal(prev => ({ ...prev, error: 'El abono no puede ser negativo.' })); return; }
    const baseCost = paymentModal.baseCost;
    if (paymentModal.currentPaid + addedAmount > baseCost) {
      setPaymentModal(prev => ({ ...prev, error: `El abono supera el costo total. Máximo a abonar: $${baseCost - paymentModal.currentPaid}` }));
      return;
    }
    const newPaymentRecord = { id: Date.now(), date: new Date().toLocaleString('es-MX'), amount: addedAmount, registeredBy: currentUser?.username };
    const person = (data[paymentModal.loc] || []).find(p => String(p.id) === String(paymentModal.id));
    const newPaid = parseFloat(person.paid || 0) + addedAmount;
    
    const payload = { paid: newPaid, paymentHistory: [...(person.paymentHistory || []), newPaymentRecord] };
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }

    await updateDoc(getDocRef('app_participants', String(person.id)), payload);
    const isLiquidado = paymentModal.isScholarship === 'No' && newPaid >= baseCost;
    addLog('Abono Financiero', `Registró un abono de $${addedAmount} para ${paymentModal.personName} en la sede ${paymentModal.loc}. (Pagado: $${paymentModal.currentPaid} -> $${newPaid})${isLiquidado ? ' [LIQUIDADO]' : ''}`, null, null, { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person });
    setPaymentModal({ isOpen: false, loc: '', id: null, personName: '', amount: '', currentPaid: 0, error: '', isScholarship: 'No', baseCost: 0 });
    showToast("Abono procesado correctamente.");
  };

  // ─────────────────────────────────────────────
  //  SCREEN 1: LOGIN
  // ─────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4 relative">
        {debugToast && (
          <div className="fixed bottom-6 left-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 max-w-sm animate-in slide-in-from-bottom-5 border-l-4 border-orange-500">
            <div className="flex items-start gap-3">
              <Bug className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-xs font-bold leading-relaxed">{debugToast.msg}</p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="bg-blue-900 p-8 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
              Registros Vida Nueva<br /><span className="text-blue-200 text-lg">Para El Mundo</span>
            </h1>
            <p className="text-blue-200 text-xs uppercase tracking-widest mt-2 font-bold">Sistema de Gestión</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={labelClasses}>Usuario</label>
                <div className="relative mt-1">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="Ingresa tu usuario" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Contraseña</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="password" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
                </div>
              </div>
              {loginError && <p className="text-xs text-red-500 font-bold animate-in slide-in-from-top-1 text-center">{loginError}</p>}
              <button type="submit" disabled={!fbUser} className="w-full bg-blue-800 hover:bg-blue-900 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex justify-center items-center gap-2">
                {!fbUser ? <span className="animate-pulse">Conectando a la nube...</span> : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // REUSABLE COMPONENTS
  // ─────────────────────────────────────────────
  const renderUsers = () => (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><UserCog className="text-indigo-500" /> Gestión de Usuarios</h2>
        {hasAdminRights ? (
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100 items-end">
            <div className="space-y-1"><label className={labelClasses}>Usuario</label><input type="text" required placeholder="Nuevo usuario" className={inputClasses} value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} /></div>
            <div className="space-y-1"><label className={labelClasses}>Contraseña</label><input type="password" required placeholder="••••••••" className={inputClasses} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} /></div>
            <div className="space-y-1">
              <label className={labelClasses}>Rol</label>
              <select className={inputClasses} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value, canViewFinances: e.target.value !== 'Lector' ? true : newUser.canViewFinances })}>
                <option value="Administrador">Administrador</option>
                <option value="Editor">Editor</option>
                <option value="Lector">Lector</option>
              </select>
            </div>
            {newUser.role === 'Lector' ? (
              <div className="space-y-1 flex items-center h-full pb-3.5 pl-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newUser.canViewFinances} onChange={e => setNewUser({...newUser, canViewFinances: e.target.checked})} className="w-4 h-4 accent-indigo-600 rounded cursor-pointer" />
                  <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">Ver Finanzas</span>
                </label>
              </div>
            ) : <div className="hidden lg:block"></div>}
            <div className="flex items-end h-full md:col-span-4 lg:col-span-1"><button type="submit" className={btnPrimary}><Plus size={18} /> Añadir Usuario</button></div>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm flex items-center gap-2"><ShieldAlert size={18} /><p><strong>Acceso Restringido:</strong> Solo los administradores pueden añadir nuevos usuarios.</p></div>
        )}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100"><th className="px-6 py-4">Usuario</th><th className="px-6 py-4">Rol</th><th className="px-6 py-4 text-center">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${u.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-slate-300'}`} title={u.isOnline ? 'En línea' : 'Desconectado'} />
                      {u.username}
                      {currentUser.id === u.id && <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full ml-2">Tú</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${u.role === 'SuperUsuario' ? 'bg-amber-100 text-amber-700 border border-amber-200' : u.role === 'Administrador' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                      {u.role === 'Lector' && u.canViewFinances && (
                        <span className="text-[9px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-black tracking-wider" title="Puede ver finanzas">
                          <DollarSign size={10} /> Finanzas
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2">
                    <button onClick={() => setEditingUser({ isOpen: true, id: u.id, username: u.username, role: u.role, currentPasswordInput: '', newPassword: '', confirmPassword: '', canViewFinances: u.canViewFinances || false })} disabled={!hasAdminRights} className={`p-2 rounded-lg transition-all ${!hasAdminRights ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}><Edit3 size={18} /></button>
                    <button onClick={() => handleDeleteUser(u.id, u.username)} disabled={currentUser.id === u.id || !hasAdminRights} className={`p-2 rounded-lg transition-all ${currentUser.id === u.id || !hasAdminRights ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}><Trash2 size={18} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLogs = () => {
    const displayedLogs = logs.filter(log => {
      if (log.isDebug) {
        if (!hasAdminRights || !showDebugLogs) return false;
      }
      const matchContext = logFilterContext === 'all' || log.eventName === logFilterContext;
      const matchSearch = !logSearchTerm || 
        log.username.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.eventName.toLowerCase().includes(logSearchTerm.toLowerCase());
      
      return matchContext && matchSearch;
    });

    const uniqueContexts = [...new Set(logs.map(l => l.eventName))];

    return (
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History className="text-indigo-500" /> 
              Registro de Actividad Global
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar en actividad..."
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-56"
                  value={logSearchTerm}
                  onChange={e => setLogSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  value={logFilterContext}
                  onChange={e => setLogFilterContext(e.target.value)}
                >
                  <option value="all">Todos los contextos</option>
                  {uniqueContexts.map(ctx => (
                    <option key={ctx} value={ctx}>{ctx}</option>
                  ))}
                </select>
              </div>
              {hasAdminRights && (
                <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <span className="text-xs font-bold text-slate-600">Ver ocultos</span>
                  <input type="checkbox" checked={showDebugLogs} onChange={e => setShowDebugLogs(e.target.checked)} className="accent-indigo-600" />
                </label>
              )}
              {hasAdminRights && <button onClick={() => setRestoreModal({ isOpen: true, type: 'cleanOld', log: null })} className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg transition-all active:scale-95"><Trash2 size={14} /> Limpiar &gt; 30 días</button>}
              {isSuperUser && <button onClick={() => setRestoreModal({ isOpen: true, type: 'cleanRecent', log: null })} className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-red-500 text-white hover:bg-red-600 border border-red-600 rounded-lg transition-all active:scale-95 shadow-lg shadow-red-200"><Trash2 size={14} /> Limpiar &lt; 30 días</button>}
              <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">{displayedLogs.length} eventos</span>
            </div>
          </div>
          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[600px] overflow-y-auto">
            <table className="w-full text-left relative">
              <thead className="sticky top-0 bg-slate-50 shadow-sm"><tr className="text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200"><th className="px-6 py-4">Fecha y Hora</th><th className="px-6 py-4">Contexto</th><th className="px-6 py-4">Usuario</th><th className="px-6 py-4">Acción</th><th className="px-6 py-4">Detalles</th>{hasAdminRights && <th className="px-6 py-4 text-center">Acciones</th>}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {displayedLogs.length === 0 ? (
                  <tr><td colSpan={hasAdminRights ? "6" : "5"} className="px-6 py-16 text-center text-slate-400 italic font-medium">No hay actividad registrada para este contexto.</td></tr>
                ) : displayedLogs.map(log => (
                  <tr key={log.id} className={`hover:bg-slate-50/50 transition-colors ${log.isDebug ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-6 py-4"><span className={`text-[9px] font-bold px-2 py-1 rounded border truncate max-w-[120px] block ${log.isDebug ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{log.eventName}</span></td>
                    <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-2"><UserCircle size={14} className={log.isDebug ? 'text-orange-400' : 'text-indigo-400'} />{log.username}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${log.isDebug ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                        {log.action} {log.isDebug && <span className="text-red-500 ml-1 font-black">(DEPURACIÓN)</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{log.details}</td>
                    {hasAdminRights && (
                      <td className="px-6 py-4 text-center">
                        {log.revertInfo?.isBackup ? (
                          <button onClick={() => setRestoreModal({ isOpen: true, log, type: 'backup' })} className="p-1.5 bg-indigo-50 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors shadow-sm" title="Restaurar Copia de Seguridad Completa"><Database size={14} /></button>
                        ) : log.revertInfo ? (
                          <div className="flex justify-center items-center gap-2">
                            <button onClick={() => setRestoreModal({ isOpen: true, log, type: 'single' })} className="p-1.5 bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Restaurar este cambio específico"><Undo size={14} /></button>
                            {isSuperUser && (
                              <button onClick={() => setRestoreModal({ isOpen: true, log, type: 'rollback' })} className="p-1.5 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Revertir todos los cambios hasta aquí"><History size={14} /></button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-300 italic font-medium">N/D</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────
  //  SCREEN 2: EVENT SELECTOR
  // ─────────────────────────────────────────────
  if (currentUser && !selectedEventId) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in duration-500 relative">
        {debugToast && (
          <div className="fixed bottom-6 left-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 max-w-sm animate-in slide-in-from-bottom-5 border-l-4 border-orange-500">
            <div className="flex items-start gap-3">
              <Bug className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-xs font-bold leading-relaxed">{debugToast.msg}</p>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              {navHistory.length > 0 && (
                <button onClick={goBack} className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-colors border border-slate-200" title="Regresar">
                  <ArrowLeft size={20} />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-black text-slate-800">
                  {systemView === 'users' ? 'Gestión de Usuarios' : systemView === 'logs' ? 'Registro de Actividad' : 'Selecciona un Evento'}
                </h1>
                <p className="text-sm text-slate-500">
                  {systemView === 'users' ? 'Administra los accesos al sistema global.' : systemView === 'logs' ? 'Historial global de acciones en el sistema.' : 'Elige el evento que deseas administrar o crea uno nuevo.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
              {isSuperUser && (
                <button onClick={toggleDebugMode} className={`flex items-center gap-1 md:gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${globalConfig?.isDebugMode ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`} title="Modo de prueba aislada">
                  <Bug size={14} /><span className="hidden sm:inline">{globalConfig?.isDebugMode ? 'Salir Depuración' : 'Depurar'}</span>
                </button>
              )}
              {systemView !== 'events' && (
                <button onClick={() => goTo('events', null, 'Summary')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-xs flex items-center gap-2">
                  <LayoutDashboard size={14} /> Eventos
                </button>
              )}
              {hasAdminRights && systemView !== 'users' && (
                <button onClick={() => goTo('users', null, 'Summary')} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors text-xs flex items-center gap-2">
                  <UserCog size={14} /> Usuarios
                </button>
              )}
              {systemView !== 'logs' && currentUser?.role !== 'Lector' && (
                <button onClick={() => goTo('logs', null, 'Summary')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-xs flex items-center gap-2">
                  <History size={14} /> Logs
                </button>
              )}
              <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><UserCircle size={18} />{currentUser.username}</span>
              <button onClick={handleLogout} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-colors text-xs flex items-center gap-2"><LogOut size={14} /> Salir</button>
            </div>
          </header>

          {globalConfig?.isDebugMode && systemView === 'events' && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in">
              <div className="bg-orange-100 p-2 rounded-lg"><Bug className="text-orange-500" size={20} /></div>
              <div>
                <h4 className="text-sm font-black text-orange-800">Modo de Depuración Activo</h4>
                <p className="text-xs text-orange-700 mt-1">
                  Las modificaciones marcadas con el insecto no son permanentes y se eliminarán al salir de este modo.
                </p>
              </div>
            </div>
          )}

          {systemView === 'users' ? (
            <div className="-mx-6 -mt-6">{renderUsers()}</div>
          ) : systemView === 'logs' ? (
            <div className="-mx-6 -mt-6">{renderLogs()}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedEvents.map(ev => {
                const evtPricing = getPricing(ev);
                return (
                  <div
                    key={ev.id}
                    draggable={hasAdminRights}
                    onDragStart={(e) => { if (hasAdminRights) { setDraggedEventId(ev.id); e.dataTransfer.effectAllowed = "move"; } }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, ev.id)}
                    onDragEnd={() => setDraggedEventId(null)}
                    className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all relative group flex flex-col justify-between ${hasAdminRights ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${draggedEventId === ev.id ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}`}
                    onClick={() => goTo('events', ev.id, "Summary")}
                  >
                    {hasAdminRights && <div className="absolute top-4 right-4 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical size={20} /></div>}
                    <div>
                      <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><CalendarRange size={24} /></div>
                      
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-800 leading-tight pr-2 flex items-center gap-2">
                          {ev.name}
                          {ev._isDebug && ev._debugSessionId === globalConfig?.debugSessionId && <Bug size={16} className="text-orange-500" title="Cambio no permanente" />}
                        </h3>
                        {hasAdminRights && (
                          <button onClick={(e) => { e.stopPropagation(); setRenameModal({isOpen: true, id: ev.id, name: ev.name}); }} className="text-slate-300 hover:text-indigo-600 p-1 flex-shrink-0">
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{ev.eventType}</span>
                        
                        {hasAdminRights ? (
                          <input
                            type="date"
                            defaultValue={ev.date || ''}
                            onClick={e => e.stopPropagation()}
                            onBlur={async (e) => {
                              const newVal = e.target.value;
                              if (newVal !== (ev.date || '')) {
                                const payload = { date: newVal };
                                if (globalConfig?.isDebugMode) { payload._isDebug = true; payload._debugSessionId = globalConfig.debugSessionId; }
                                await updateDoc(getDocRef('app_events', ev.id), payload);
                                addLog('Gestión de Eventos', `Cambió fecha de evento "${ev.name}": "${ev.date || 'Sin fecha'}" -> "${newVal}"`, null, ev, { collectionName: 'app_events', docId: ev.id, action: 'update', previousData: ev });
                              }
                            }}
                            className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 outline-none cursor-pointer hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            title="Clic para editar fecha"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{ev.date || 'Sin fecha'}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo Base</p>
                        <p className="text-lg font-black text-green-600">${evtPricing.global}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sedes</p>
                        <p className="text-sm font-bold text-slate-700">{ev.locations ? ev.locations.length : 0}</p>
                      </div>
                    </div>
                    {hasAdminRights && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteEventModal({ isOpen: true, id: ev.id, name: ev.name }); }} className="absolute bottom-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10"><Trash2 size={18} /></button>
                    )}
                  </div>
                );
              })}
              {hasAdminRights && (
                <div className="bg-indigo-50/50 rounded-3xl p-6 border-2 border-dashed border-indigo-200 flex flex-col justify-center items-center text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer transition-all min-h-[200px]" onClick={() => setIsAddEventModalOpen(true)}>
                  <div className="bg-white p-3 rounded-full shadow-sm mb-3"><Plus size={24} className="text-indigo-600" /></div>
                  <span className="font-bold text-sm">Crear Nuevo Evento</span>
                </div>
              )}
            </div>
          )}
        </div>

        {deleteEventModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 text-center">
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldAlert size={32} className="text-red-500" /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Eliminar Evento</h3>
              <p className="text-sm text-slate-500 mb-6">¿Estás seguro de que deseas eliminar <strong>"{deleteEventModal.name}"</strong>? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteEventModal({ isOpen: false, id: null, name: '' })} className={btnSecondary}>Cancelar</button>
                <button onClick={confirmDeleteEvent} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-red-200">Sí, eliminar</button>
              </div>
            </div>
          </div>
        )}

        {isAddEventModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-slate-800 mb-2">Nuevo Evento</h3>
              <p className="text-sm text-slate-500 mb-6">Ingresa los detalles para el nuevo evento.</p>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClasses}>Título del Evento</label>
                  <input type="text" autoFocus className={inputClasses} placeholder="Ej. Campamento Jóvenes 2027" value={newEventData.name} onChange={e => setNewEventData({ ...newEventData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Costo Base ($) Inicial</label>
                  <input type="number" className={inputClasses} placeholder="Ej. 150" value={newEventData.baseCost} onChange={e => setNewEventData({ ...newEventData, baseCost: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Fecha del Evento (Opcional)</label>
                  <input type="date" className={inputClasses} value={newEventData.date} onChange={e => setNewEventData({ ...newEventData, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Tipo de Evento</label>
                  <select className={inputClasses} value={newEventData.type} onChange={e => setNewEventData({ ...newEventData, type: e.target.value })}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setIsAddEventModalOpen(false); setNewEventData({ name: '', type: 'Campa', date: '', baseCost: '' }); }} className={btnSecondary}>Cancelar</button>
                  <button onClick={handleCreateEvent} disabled={!newEventData.name.trim()} className={btnPrimary}><Plus size={18} /> Crear</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingUser.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Editar Usuario</h3>
              <p className="text-sm text-slate-500 mb-4">Modifica los datos del usuario.</p>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className={labelClasses}>Usuario</label>
                  <input type="text" required className={inputClasses} value={editingUser.username} onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} />
                </div>
                <div>
                  <label className={labelClasses}>Rol</label>
                  <select className={inputClasses} value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value, canViewFinances: e.target.value !== 'Lector' ? true : editingUser.canViewFinances })}>
                    {editingUser.role === 'SuperUsuario' && <option value="SuperUsuario">SuperUsuario</option>}
                    <option value="Administrador">Administrador</option>
                    <option value="Editor">Editor</option>
                    <option value="Lector">Lector</option>
                  </select>
                  {editingUser.role === 'Lector' && (
                    <label className="flex items-center gap-2 mt-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 group transition-colors hover:border-indigo-200">
                      <input type="checkbox" checked={editingUser.canViewFinances} onChange={e => setEditingUser({...editingUser, canViewFinances: e.target.checked})} className="accent-indigo-600 w-4 h-4 rounded cursor-pointer" />
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">Permitir ver información financiera</span>
                    </label>
                  )}
                </div>
                <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                  <p className="text-xs font-bold text-slate-800">Cambio de Contraseña <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span></p>
                  <div><label className={labelClasses}>Contraseña Actual</label><input type="password" className={inputClasses} value={editingUser.currentPasswordInput} onChange={e => setEditingUser({ ...editingUser, currentPasswordInput: e.target.value })} /></div>
                  <div><label className={labelClasses}>Nueva Contraseña</label><input type="password" className={inputClasses} value={editingUser.newPassword} onChange={e => setEditingUser({ ...editingUser, newPassword: e.target.value })} /></div>
                  <div><label className={labelClasses}>Confirmar Nueva Contraseña</label><input type="password" className={inputClasses} value={editingUser.confirmPassword} onChange={e => setEditingUser({ ...editingUser, confirmPassword: e.target.value })} /></div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingUser({ isOpen: false, id: null, username: '', currentPasswordInput: '', newPassword: '', confirmPassword: '', role: 'Editor', canViewFinances: false })} className={btnSecondary}>Cancelar</button>
                  <button type="submit" className={btnPrimary}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {renameModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Renombrar Evento</h3>
              <p className="text-sm text-slate-500 mb-6">Ingresa el nuevo nombre para este evento.</p>
              <div className="space-y-4">
                <input type="text" autoFocus className={inputClasses} placeholder="Nombre del Evento" value={renameModal.name} onChange={e => setRenameModal({...renameModal, name: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleRenameEvent()} />
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setRenameModal({isOpen: false, id: null, name: ''})} className={btnSecondary}>Cancelar</button>
                  <button onClick={handleRenameEvent} disabled={!renameModal.name.trim()} className={btnPrimary}>Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {restoreModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${restoreModal.type === 'single' || restoreModal.type === 'backup' ? 'bg-indigo-50 text-indigo-500' : 'bg-red-50 text-red-500'}`}>
                {restoreModal.type === 'single' ? <Undo size={32} /> : restoreModal.type === 'rollback' ? <History size={32} /> : restoreModal.type === 'backup' ? <Database size={32} /> : <Trash2 size={32} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">
                {restoreModal.type === 'single' ? 'Restaurar Cambio' : restoreModal.type === 'rollback' ? 'Revertir Cambios' : restoreModal.type === 'backup' ? 'Restaurar Copia de Seguridad' : 'Limpiar Registros'}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {restoreModal.type === 'single' 
                  ? `¿Deseas deshacer la acción específica: "${restoreModal.log?.action}"?` 
                  : restoreModal.type === 'rollback'
                  ? `¿Estás seguro de deshacer TODOS los cambios desde el evento "${restoreModal.log?.action}" hasta ahora? Esta acción revertirá múltiples operaciones.`
                  : restoreModal.type === 'backup'
                  ? `ATENCIÓN: Estás a punto de restaurar la base de datos a la versión del: ${restoreModal.log?.revertInfo?.backupId}. Esto sobrescribirá todos los participantes y eventos actuales. ¿Deseas continuar?`
                  : restoreModal.type === 'cleanOld'
                  ? `¿Estás seguro de eliminar todos los registros de actividad con más de 30 días de antigüedad? Esta acción no se puede deshacer.`
                  : `ATENCIÓN SUPERUSUARIO: ¿Estás seguro de eliminar todos los registros RECIENTES (menos de 30 días)? Esta acción es irreversible.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRestoreModal({ isOpen: false, log: null, type: 'single' })} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors text-sm">Cancelar</button>
                <button onClick={confirmRestore} className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-colors text-sm shadow-lg ${restoreModal.type === 'single' || restoreModal.type === 'backup' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}>
                  Sí, Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  //  SCREEN 3: MAIN APP
  // ─────────────────────────────────────────────
  const isCampa = currentEvent.eventType === 'Campa';
  const isDesayuno = currentEvent.eventType === 'Desayuno Conferencia';
  const isGeneral = currentEvent.eventType === 'General';

  const getPieChartGradient = (dataKey) => {
    let total = dataKey === 'paid' ? summary.globalStats.all.paid : summary.globalStats.all.count;
    if (total === 0) return '#f1f5f9';
    let curPerc = 0;
    return `conic-gradient(${(currentEvent?.locations || []).map((loc, i) => {
      const val = dataKey === 'paid' ? summary.locationStats[loc].all.paid : summary.locationStats[loc].all.count;
      const per = (val / total) * 100;
      if (per === 0) return '';
      const stop = `${CHART_COLORS[i % CHART_COLORS.length]} ${curPerc}% ${curPerc + per}%`;
      curPerc += per;
      return stop;
    }).filter(Boolean).join(', ')})`;
  };

  const renderSummary = () => {
    const totalRegs = summary.globalStats.all.count;
    const totalScholarship = summary.globalStats.all.scholarship;
    const percentScholarship = totalRegs > 0 ? (totalScholarship / totalRegs) * 100 : 0;
    const realCostNum = Number(currentEvent?.realCost) || 0;
    const balanceNeto = summary.globalStats.all.paid - (realCostNum * totalRegs);

    const getTableStats = (loc) => {
      let count = 0, scholarship = 0, servers = 0, paid = 0, pending = 0, expected = 0;
      (data[loc] || []).forEach(p => {
        if (isCampa) {
          if (summaryView === 'regular' && p.isScholarship === 'Sí') return;
          if (summaryView === 'scholarship' && p.isScholarship !== 'Sí') return;
          if (summaryServerView === 'Sí' && p.isServer !== 'Sí') return;
          if (summaryServerView === 'No' && p.isServer === 'Sí') return;
        }
        const isBecado = p.isScholarship === 'Sí';
        const baseCost = p.registeredCost != null ? Number(p.registeredCost) : getPersonCost(p, currentPricing);
        const pPaid = parseFloat(p.paid || 0);
        count++;
        if (isBecado) scholarship++;
        if (p.isServer === 'Sí') servers++;
        paid += pPaid;
        if (isBecado) {
          expected += pPaid;
        } else {
          expected += baseCost;
          pending += (baseCost - pPaid);
        }
      });
      return { count, scholarship, servers, paid, pending, expected };
    };

    const tableData = (currentEvent?.locations || []).map(loc => ({ loc, stats: getTableStats(loc) }));

    const globalTableStats = tableData.reduce((acc, { stats }) => {
      acc.count += stats.count; acc.scholarship += stats.scholarship; acc.servers += stats.servers;
      acc.paid += stats.paid; acc.pending += stats.pending; acc.expected += stats.expected;
      return acc;
    }, { count: 0, scholarship: 0, servers: 0, paid: 0, pending: 0, expected: 0 });

    return (
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        
        {viewPrefs.statsConfig && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <StatCard icon={Users} iconColor="text-blue-600" bgIcon="bg-blue-100" title="Registrados" value={totalRegs} />
            {isCampa && <StatCard icon={GraduationCap} iconColor="text-purple-600" bgIcon="bg-purple-100" title="Becados" value={totalScholarship} />}
            <StatCard icon={DollarSign} iconColor="text-green-600" bgIcon="bg-green-100" title="Recaudado" value={formatMoney(summary.globalStats.all.paid)} />
            <StatCard icon={ShieldAlert} iconColor="text-orange-600" bgIcon="bg-orange-100" title="Pendiente" value={formatMoney(summary.globalStats.all.pending)} />

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><div className="bg-blue-100 p-2 rounded-lg text-blue-600"><CalendarRange size={18} /></div><span className="text-xs font-bold text-slate-500">Fecha Evento</span></div>
                {hasAdminRights && (
                  <label className="relative flex items-center justify-center p-2 bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer" title="Modificar fecha">
                    <CalendarRange size={16} className="relative z-10 pointer-events-none" />
                    <input type="date" value={tempEventDate} onChange={(e) => setTempEventDate(e.target.value)}
                      onBlur={async (e) => {
                        const newVal = e.target.value;
                        if (newVal !== (currentEvent.date || '')) {
                          await updateEventConfig({ date: newVal });
                          addLog('Configuración', `Fecha del evento: "${currentEvent.date || 'Sin fecha'}" -> "${newVal}"`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                  </label>
                )}
              </div>
              <div className="flex items-center text-lg md:text-xl font-black text-slate-800 mt-1 capitalize leading-tight">
                {currentEvent.date ? new Date(currentEvent.date + 'T00:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Sin fecha'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><BarChart3 size={18} /></div><span className="text-xs font-bold text-slate-500">Costo Base</span></div>
                {hasAdminRights && <button onClick={openPricingModal} className="p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Settings2 size={14} /></button>}
              </div>
              <div className="flex items-center text-2xl font-black text-slate-800">{canSeeMoney ? `$${currentPricing.global}` : '$***'}</div>
              {currentEvent.pricingType === 'dynamic' && <p className="text-[10px] text-indigo-500 font-bold mt-1 uppercase">Precio Dinámico</p>}
            </div>

            {isCampa && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Users size={18} /></div><span className="text-xs font-bold text-slate-500">Costo Servidor (Ambos)</span></div>
                  {hasAdminRights && <button onClick={openPricingModal} className="p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Settings2 size={14} /></button>}
                </div>
                <div className="flex items-center text-2xl font-black text-slate-800">{canSeeMoney ? `$${currentPricing.server}` : '$***'}</div>
              </div>
            )}

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3"><div className="bg-teal-100 p-2 rounded-lg text-teal-600"><Wallet size={18} /></div><span className="text-xs font-bold text-slate-500">Apartado Mín.</span></div>
              <div className="flex items-center text-2xl font-black text-slate-800">
                {canSeeMoney ? (
                  <><span className="mr-1">$</span>
                    <input type="number" value={tempDeposit} disabled={!hasAdminRights} onChange={e => setTempDeposit(e.target.value)}
                      onBlur={async (e) => {
                        const newVal = parseFloat(e.target.value) || 0;
                        if (newVal !== currentEvent.minDeposit) {
                          await updateEventConfig({ minDeposit: newVal });
                          addLog('Configuración', `Apartado mín: $${currentEvent.minDeposit} -> $${newVal}`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
                        }
                      }}
                      className={`bg-transparent border-b-2 outline-none w-20 transition-colors ${!hasAdminRights ? 'border-transparent cursor-not-allowed' : 'border-transparent hover:border-slate-200 focus:border-indigo-500'}`} /></>
                ) : <span>$***</span>}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3"><div className="bg-red-100 p-2 rounded-lg text-red-600"><DollarSign size={18} /></div><span className="text-xs font-bold text-slate-500">Costo Real</span></div>
              <div className="flex items-center text-2xl font-black text-slate-800">
                {canSeeMoney ? (
                  <><span className="mr-1">$</span>
                    <input type="number" value={tempRealCost} disabled={!hasAdminRights} onChange={e => setTempRealCost(e.target.value)}
                      onBlur={async (e) => {
                        const newVal = parseFloat(e.target.value) || 0;
                        if (newVal !== (currentEvent.realCost || 0)) {
                          await updateEventConfig({ realCost: newVal });
                          addLog('Configuración', `Costo Real: $${currentEvent.realCost || 0} -> $${newVal}`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
                        }
                      }}
                      className={`bg-transparent border-b-2 outline-none w-24 transition-colors ${!hasAdminRights ? 'border-transparent cursor-not-allowed' : 'border-transparent hover:border-slate-200 focus:border-indigo-500'}`} /></>
                ) : <span>$***</span>}
              </div>
              {hasAdminRights && <p className="text-[10px] text-slate-400 font-bold mt-1">Costo real por persona</p>}
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${balanceNeto >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  <Activity size={18} />
                </div>
                <span className="text-xs font-bold text-slate-500">Balance Neto</span>
              </div>
              <p className={`text-2xl font-black ${balanceNeto >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatMoney(balanceNeto)}
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Recaudado - (Costo Real × #Registrados)</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          
          {viewPrefs.chartLocations && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin className="text-indigo-500" size={20} /> Registrados por Sede</h3>
                <button onClick={() => setShowLocChartValues(!showLocChartValues)} className="px-2 py-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-colors border border-slate-200">
                  {showLocChartValues ? 'Ver %' : 'Ver #'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-6">Proporción de inscritos totales</p>
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-40 h-40 rounded-full shadow-inner border-4 border-white transition-all duration-1000" style={{ background: getPieChartGradient('count') }} />
                <div className="w-full grid grid-cols-2 gap-2">
                  {(currentEvent?.locations || []).map((loc) => { 
                    const i = currentEvent.locations.indexOf(loc); 
                    const locCount = summary.locationStats[loc].all.count; 
                    const percent = totalRegs > 0 ? ((locCount / totalRegs) * 100).toFixed(1) : 0; 
                    return (
                      <div key={loc} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="font-semibold text-slate-600 truncate max-w-[60px]" title={loc}>{loc}</span></div>
                        <span className="font-bold text-slate-800">{showLocChartValues ? locCount : `${percent}%`}</span>
                      </div>
                    ); 
                  })}
                </div>
              </div>
            </div>
          )}
          
          {viewPrefs.chartIncome && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><PieChart className="text-green-500" size={20} /> Ingresos por Sede</h3>
                <button onClick={() => setShowIncChartValues(!showIncChartValues)} className="px-2 py-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-colors border border-slate-200">
                  {showIncChartValues ? 'Ver %' : 'Ver $'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-6">Porcentaje de recaudación</p>
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-40 h-40 rounded-full shadow-inner border-4 border-white transition-all duration-1000" style={{ background: getPieChartGradient('paid') }} />
                <div className="w-full grid grid-cols-2 gap-2">
                  {(currentEvent?.locations || []).map((loc) => { 
                    const i = currentEvent.locations.indexOf(loc); 
                    const locPaid = summary.locationStats[loc].all.paid; 
                    const percent = summary.globalStats.all.paid > 0 ? ((locPaid / summary.globalStats.all.paid) * 100).toFixed(1) : 0; 
                    return (
                      <div key={loc} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="font-semibold text-slate-600 truncate max-w-[60px]" title={loc}>{loc}</span></div>
                        <span className="font-bold text-slate-800">{showIncChartValues ? formatMoney(locPaid) : `${percent}%`}</span>
                      </div>
                    ); 
                  })}
                </div>
              </div>
            </div>
          )}

          {viewPrefs.chartPaymentStatus && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Receipt className="text-emerald-500" size={20} /> Estado de Pagos</h3>
              <p className="text-xs text-slate-400 mb-6">Liquidados vs Con Saldo Pendiente</p>
              <div className="space-y-5 w-full mt-2">
                <ProgressBar label="Liquidados (o Becados)" value={summary.totalPaidOff} max={totalRegs} colorClass="text-emerald-600" bgClass="bg-emerald-500" />
                <ProgressBar label="Con Saldo Pendiente" value={summary.totalWithDebt} max={totalRegs} colorClass="text-orange-600" bgClass="bg-orange-500" />
              </div>
            </div>
          )}
          
          {viewPrefs.chartGender && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col"><h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Users className="text-indigo-500" size={20} /> Inscritos por Género</h3><p className="text-xs text-slate-400 mb-6">Comparativa de inscripciones por género</p><div className="flex-1 flex flex-col justify-center gap-6 mt-4 pb-2 w-full"><ProgressBar label="Hombres" value={summary.totalMen} max={summary.totalMen + summary.totalWomen} colorClass="text-blue-600" bgClass="bg-blue-500" /><ProgressBar label="Mujeres" value={summary.totalWomen} max={summary.totalMen + summary.totalWomen} colorClass="text-pink-600" bgClass="bg-pink-500" /></div></div>
          )}

          {viewPrefs.chartAgeBrackets && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><UserCircle className="text-cyan-500" size={20} /> Rangos de Edad</h3>
              <p className="text-xs text-slate-400 mb-6">Distribución detallada por edades</p>
              <div className="space-y-4 w-full mt-2 max-h-64 overflow-y-auto pr-2">
                <ProgressBar label="Niños (< 13)" value={summary.ageBrackets.kids} max={totalRegs} colorClass="text-cyan-600" bgClass="bg-cyan-500" />
                <ProgressBar label="Adolescentes (13 - 17)" value={summary.ageBrackets.teens} max={totalRegs} colorClass="text-blue-600" bgClass="bg-blue-500" />
                <ProgressBar label="Jóvenes (18 - 25)" value={summary.ageBrackets.youngAdults} max={totalRegs} colorClass="text-indigo-600" bgClass="bg-indigo-500" />
                <ProgressBar label="Adultos (26 - 40)" value={summary.ageBrackets.adults} max={totalRegs} colorClass="text-purple-600" bgClass="bg-purple-500" />
                <ProgressBar label="Mayores (41+)" value={summary.ageBrackets.seniors} max={totalRegs} colorClass="text-pink-600" bgClass="bg-pink-500" />
              </div>
            </div>
          )}

          {isCampa && (
            <>
              {viewPrefs.chartScholarship && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><GraduationCap className="text-purple-500" size={20} /> Estado de Beca</h3><p className="text-xs text-slate-400 mb-6">Proporción de becados vs regulares</p><div className="flex items-center justify-around gap-6"><div className="w-36 h-36 rounded-full shadow-inner border-4 border-white transition-all duration-1000" style={{ background: totalRegs > 0 ? `conic-gradient(#a855f7 0% ${percentScholarship}%, #cbd5e1 ${percentScholarship}% 100%)` : '#f1f5f9' }} /><div className="space-y-4"><div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Becados</span></div><p className="text-2xl font-black text-slate-800 mt-1">{totalScholarship}</p></div><div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300" /><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Regulares</span></div><p className="text-2xl font-black text-slate-800 mt-1">{totalRegs - totalScholarship}</p></div></div></div></div>
              )}

              {viewPrefs.chartBloodType && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Droplets className="text-red-500" size={20} /> Tipos de Sangre</h3>
                  <p className="text-xs text-slate-400 mb-6">Distribución de participantes por tipo de sangre</p>
                  <div className="flex-1 flex flex-col justify-center gap-4 mt-4 pb-2 w-full max-h-64 overflow-y-auto pr-2">
                    {Object.entries(summary.bloodTypeStats).sort((a,b)=>b[1]-a[1]).map(([bt, count]) => count > 0 && (
                      <ProgressBar key={bt} label={bt} value={count} max={totalRegs} colorClass="text-red-600" bgClass="bg-red-500" />
                    ))}
                    {Object.values(summary.bloodTypeStats).every(v => v === 0) && <p className="text-xs text-slate-400 italic">No hay datos registrados aún.</p>}
                  </div>
                </div>
              )}
              
              {viewPrefs.chartSwimming && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col"><h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Droplets className="text-blue-500" size={20} /> Habilidades Acuáticas</h3><p className="text-xs text-slate-400 mb-6">Capacidad de nado de los inscritos</p><div className="space-y-5 w-full mt-2"><ProgressBar label="Saben Nadar" value={summary.totalSwimmers} max={totalRegs} colorClass="text-blue-600" bgClass="bg-blue-500" /><ProgressBar label="No Saben Nadar" value={summary.totalNonSwimmers} max={totalRegs} colorClass="text-slate-500" bgClass="bg-slate-400" /></div></div>
              )}
              
              {viewPrefs.chartMedical && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col"><h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Activity className="text-red-500" size={20} /> Condiciones de Salud</h3><p className="text-xs text-slate-400 mb-6">Incidencia de condiciones médicas especiales</p><div className="space-y-5 w-full mt-2"><ProgressBar label="Con Alergias" value={summary.totalAllergies} max={totalRegs} colorClass="text-orange-600" bgClass="bg-orange-500" /><ProgressBar label="Con Enfermedades" value={summary.totalDiseases} max={totalRegs} colorClass="text-red-600" bgClass="bg-red-500" /><ProgressBar label="Con Discapacidades" value={summary.totalDisabilities} max={totalRegs} colorClass="text-purple-600" bgClass="bg-purple-500" /></div></div>
              )}
              
              {viewPrefs.chartServers && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Users className="text-amber-500" size={20} /> Servidores</h3>
                  <p className="text-xs text-slate-400 mb-6">Distribución de servidores por asignación</p>
                  <div className="space-y-5 w-full mt-2">
                    <ProgressBar label="Total Servidores" value={summary.totalServers} max={totalRegs} colorClass="text-amber-600" bgClass="bg-amber-500" />
                    <ProgressBar label="Teens" value={allParticipants.filter(p => p.eventId === currentEvent?.id && p.isServer === 'Sí' && p.serverAssignment === 'Teens').length} max={summary.totalServers} colorClass="text-indigo-600" bgClass="bg-indigo-400" />
                    <ProgressBar label="Jóvenes" value={allParticipants.filter(p => p.eventId === currentEvent?.id && p.isServer === 'Sí' && p.serverAssignment === 'Jóvenes').length} max={summary.totalServers} colorClass="text-blue-600" bgClass="bg-blue-400" />
                    <ProgressBar label="Ambos" value={summary.totalServersBoth} max={summary.totalServers} colorClass="text-amber-600" bgClass="bg-amber-400" />
                  </div>
                </div>
              )}

              {viewPrefs.chartAges && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Users className="text-indigo-500" size={20} /> Asignación a Eventos</h3>
                  <p className="text-xs text-slate-400 mb-6">Teens (&lt;18) vs Jóvenes (18+)</p>
                  <div className="space-y-5 w-full mt-2">
                    <ProgressBar label="Teens (<18)" value={summary.totalMinors} max={summary.totalMinors + summary.totalAdults} colorClass="text-indigo-600" bgClass="bg-indigo-500" />
                    <ProgressBar label="Jóvenes (18+)" value={summary.totalAdults} max={summary.totalMinors + summary.totalAdults} colorClass="text-blue-500" bgClass="bg-blue-400" />
                    {summary.totalServersBoth > 0 && (
                      <div className="pt-4 mt-2 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-bold"><span className="text-amber-600 uppercase tracking-wider">Servidores en Ambos</span><span className="text-amber-600 font-black">{summary.totalServersBoth}</span></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {isGeneral && currentEvent.customFields && viewPrefs.chartCustom && currentEvent.customFields.map((field, idx) => {
            const stats = summary.customFieldsStats[field] || {};
            const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
            return (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><ListPlus className="text-indigo-500" size={20} /> {field}</h3>
                <p className="text-xs text-slate-400 mb-6">Distribución de respuestas</p>
                <div className="space-y-4 w-full mt-2 max-h-48 overflow-y-auto pr-2">
                  {entries.map(([val, count], i) => (
                    <ProgressBar key={i} label={val} value={count} max={totalRegs} colorClass="text-indigo-600" bgClass="bg-indigo-500" />
                  ))}
                  {entries.length === 0 && <p className="text-xs text-slate-400 italic">No hay datos registrados aún.</p>}
                </div>
              </div>
            );
          })}
        </div>

        {viewPrefs.tableDetails && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><TableProperties size={20} /></div>
                <div><h3 className="text-lg font-bold text-slate-800">Visualización de Datos Generales</h3><p className="text-xs text-slate-400">Desglose detallado por sede</p></div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {isCampa && (
                  <>
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-slate-400" />
                      <select className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer" value={summaryView} onChange={(e) => setSummaryView(e.target.value)}>
                        <option value="all">Becados/Regulares</option>
                        <option value="regular">Regulares</option>
                        <option value="scholarship">Becados</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400" />
                      <select className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer" value={summaryServerView} onChange={(e) => setSummaryServerView(e.target.value)}>
                        <option value="all">Servidores: Todos</option>
                        <option value="Sí">Servidores</option>
                        <option value="No">Camperos</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                    <th className="px-6 py-4">Sede</th>
                    <th className="px-6 py-4 text-center">Inscritos</th>
                    {isCampa && summaryView === 'all' && <th className="px-6 py-4 text-center text-purple-600">Becados</th>}
                    {isCampa && summaryServerView === 'all' && <th className="px-6 py-4 text-center text-amber-600">Servidores</th>}
                    <th className="px-6 py-4 text-right">Recaudado</th>
                    <th className="px-6 py-4 text-right">Pendiente</th>
                    <th className="px-6 py-4 text-right">Total Esperado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tableData.map(({ loc, stats }) => (
                    <tr key={loc} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-bold text-slate-700">{loc}</td>
                      <td className="px-6 py-3 text-center font-medium text-slate-600">{stats.count}</td>
                      {isCampa && summaryView === 'all' && <td className="px-6 py-3 text-center text-purple-600 font-bold">{stats.scholarship}</td>}
                      {isCampa && summaryServerView === 'all' && <td className="px-6 py-3 text-center text-amber-600 font-bold">{stats.servers}</td>}
                      <td className="px-6 py-3 text-right font-bold text-green-600">{formatMoney(stats.paid)}</td>
                      <td className="px-6 py-3 text-right font-bold text-orange-500">{formatMoney(stats.pending)}</td>
                      <td className="px-6 py-3 text-right font-black text-slate-800">{formatMoney(stats.expected)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                    <td className="px-6 py-4 font-black text-indigo-900 uppercase">Global</td>
                    <td className="px-6 py-4 text-center font-black text-indigo-900">{globalTableStats.count}</td>
                    {isCampa && summaryView === 'all' && <td className="px-6 py-4 text-center font-black text-purple-700">{globalTableStats.scholarship}</td>}
                    {isCampa && summaryServerView === 'all' && <td className="px-6 py-4 text-center font-black text-amber-700">{globalTableStats.servers}</td>}
                    <td className="px-6 py-4 text-right font-black text-green-700">{formatMoney(globalTableStats.paid)}</td>
                    <td className="px-6 py-4 text-right font-black text-orange-600">{formatMoney(globalTableStats.pending)}</td>
                    <td className="px-6 py-4 text-right font-black text-indigo-900">{formatMoney(globalTableStats.expected)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderLocationSheet = (loc) => (
    <div className="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isLocOpen(loc) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><MapPin size={24} /></div>
          <div><h2 className="text-2xl font-bold text-slate-800">Sede {loc}</h2><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${isLocOpen(loc) ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} /><p className="text-xs font-bold uppercase text-slate-400">Registro {isLocOpen(loc) ? 'Abierto' : 'Cerrado'}</p></div></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasAdminRights && (
            <button onClick={() => toggleRegStatus(loc)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${isLocOpen(loc) ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}><Power size={16} />{isLocOpen(loc) ? 'Desactivar Registro' : 'Activar Registro'}</button>
          )}
        </div>
      </div>

      {currentUser?.role !== 'Lector' && (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-opacity ${!isLocOpen(loc) ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Plus size={14} /> Nuevo Registro</h3>
            {isGeneral && hasAdminRights && (
              <button onClick={() => setCustomFieldsModal({ isOpen: true })} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"><ListPlus size={14} /> Configurar Campos Extra</button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1"><label className={labelClasses}>Nombre Completo</label><input placeholder="Ej. Juan Pérez" className={inputClasses} value={newEntry.name} onChange={e => handleNameInput(e.target.value) && setNewEntry({ ...newEntry, name: e.target.value })} /></div>
            <div className="space-y-1"><label className={labelClasses}>Teléfono Personal</label><input placeholder="55-1234-5678" className={inputClasses} value={newEntry.phone} onChange={e => setNewEntry({ ...newEntry, phone: formatPhoneNumber(e.target.value) })} /></div>
            <div className="space-y-1"><label className={labelClasses}>Edad {!isCampa && "(Opcional)"}</label><input type="number" placeholder="Años" className={inputClasses} value={newEntry.age} onChange={e => setNewEntry({ ...newEntry, age: e.target.value })} /></div>
            <div className="space-y-1"><label className={labelClasses}>Género {!isCampa && "(Opcional)"}</label>
              <select className={inputClasses} value={newEntry.gender} onChange={e => setNewEntry({ ...newEntry, gender: e.target.value })}>
                <option value="">Seleccionar {!isCampa && "(Opcional)"}</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {(isCampa || isGeneral) && (
              <>
                <div className="space-y-1"><label className={labelClasses}>Contacto Emergencia {isGeneral && "(Opcional)"}</label><input placeholder="Nombre contacto" className={inputClasses} value={newEntry.emergencyContact} onChange={e => handleNameInput(e.target.value) && setNewEntry({ ...newEntry, emergencyContact: e.target.value })} /></div>
                <div className="space-y-1"><label className={labelClasses}>Tel. Emergencia {isGeneral && "(Opcional)"}</label><input placeholder="55-1234-5678" className={inputClasses} value={newEntry.emergencyPhone} onChange={e => setNewEntry({ ...newEntry, emergencyPhone: formatPhoneNumber(e.target.value) })} /></div>
              </>
            )}

            {isCampa && (
              <>
                <div className="space-y-1"><label className={labelClasses}>Alergias</label><div className="flex gap-2"><select className={`p-3 bg-slate-50 border rounded-xl outline-none text-sm transition-colors ${newEntry.hasAllergy === 'Sí' ? 'border-orange-300 text-orange-700 bg-orange-50' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'}`} value={newEntry.hasAllergy} onChange={e => setNewEntry({ ...newEntry, hasAllergy: e.target.value })}><option value="No">No</option><option value="Sí">Sí</option></select>{newEntry.hasAllergy === 'Sí' && <input placeholder="¿Cuál?" className="flex-1 p-3 bg-slate-50 border border-orange-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm" value={newEntry.allergyDetails} onChange={e => setNewEntry({ ...newEntry, allergyDetails: e.target.value })} />}</div></div>
                <div className="space-y-1"><label className={labelClasses}>Enfermedades</label><div className="flex gap-2"><select className={`p-3 bg-slate-50 border rounded-xl outline-none text-sm transition-colors ${newEntry.hasDisease === 'Sí' ? 'border-red-300 text-red-700 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'}`} value={newEntry.hasDisease} onChange={e => setNewEntry({ ...newEntry, hasDisease: e.target.value })}><option value="No">No</option><option value="Sí">Sí</option></select>{newEntry.hasDisease === 'Sí' && <input placeholder="Especifique" className="flex-1 p-3 bg-slate-50 border border-red-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm" value={newEntry.diseaseDetails} onChange={e => setNewEntry({ ...newEntry, diseaseDetails: e.target.value })} />}</div></div>
                <div className="space-y-1"><label className={labelClasses}>Discapacidades</label><div className="flex gap-2"><select className={`p-3 bg-slate-50 border rounded-xl outline-none text-sm transition-colors ${newEntry.hasDisability === 'Sí' ? 'border-purple-300 text-purple-700 bg-purple-50' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'}`} value={newEntry.hasDisability} onChange={e => setNewEntry({ ...newEntry, hasDisability: e.target.value })}><option value="No">No</option><option value="Sí">Sí</option></select>{newEntry.hasDisability === 'Sí' && <input placeholder="Detalles" className="flex-1 p-3 bg-slate-50 border border-purple-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" value={newEntry.disabilityDetails} onChange={e => setNewEntry({ ...newEntry, disabilityDetails: e.target.value })} />}</div></div>
                <div className="space-y-1"><label className={labelClasses}>Sangre / Nadar</label><div className="flex gap-2"><select className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={newEntry.bloodType} onChange={e => setNewEntry({ ...newEntry, bloodType: e.target.value })}>{BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}</select><button type="button" onClick={() => setNewEntry({ ...newEntry, canSwim: newEntry.canSwim === 'Sí' ? 'No' : 'Sí' })} className={`px-3 py-3 rounded-xl text-[10px] font-bold uppercase transition-all border ${newEntry.canSwim === 'Sí' ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>Nado: {newEntry.canSwim}</button></div></div>
                <div className="space-y-1"><label className={labelClasses}>Becado</label><button type="button" onClick={() => setNewEntry({ ...newEntry, isScholarship: newEntry.isScholarship === 'Sí' ? 'No' : 'Sí' })} className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${newEntry.isScholarship === 'Sí' ? 'bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-100' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'}`}><GraduationCap size={18} className={newEntry.isScholarship === 'Sí' ? 'text-white' : 'text-slate-400'} /> {newEntry.isScholarship}</button></div>
                <div className="space-y-1">
                  <label className={labelClasses}>Servidor</label>
                  <button type="button" onClick={() => setNewEntry({ ...newEntry, isServer: newEntry.isServer === 'Sí' ? 'No' : 'Sí', serverAssignment: '' })} className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${newEntry.isServer === 'Sí' ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-100' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'}`}><Users size={18} className={newEntry.isServer === 'Sí' ? 'text-white' : 'text-slate-400'} /> {newEntry.isServer}</button>
                </div>
                {newEntry.isServer === 'Sí' && (
                  <div className="space-y-1 md:col-span-2">
                    <label className={labelClasses}>Asignación de Servidor</label>
                    <select className={inputClasses} value={newEntry.serverAssignment} onChange={e => setNewEntry({ ...newEntry, serverAssignment: e.target.value })}>
                      <option value="">Selecciona a qué evento servirá...</option>
                      <option value="Teens">Teens (Menores de 18)</option>
                      <option value="Jóvenes">Jóvenes (Mayores de 18)</option>
                      <option value="Ambos">Ambos Eventos</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {isGeneral && currentEvent.customFields && currentEvent.customFields.map((field, idx) => (
              <div className="space-y-1" key={idx}>
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 truncate block tracking-widest" title={field}>{field}</label>
                <input className={inputClasses} value={newEntry.customData?.[field] || ''} onChange={e => setNewEntry({ ...newEntry, customData: { ...(newEntry.customData || {}), [field]: e.target.value } })} />
              </div>
            ))}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between">
                <span>Abono Inicial ($)</span>
                {!(isCampa && newEntry.isScholarship === 'Sí') && <span className="text-indigo-400 normal-case tracking-normal">Mín. ${currentEvent.minDeposit}</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  className="w-full pl-7 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-green-600 outline-none focus:ring-2 focus:ring-green-500"
                  value={newEntry.paid}
                  placeholder="0.00"
                  onChange={e => {
                    let val = e.target.value;
                    if (val === '') { setNewEntry({ ...newEntry, paid: '' }); return; }
                    let numVal = parseFloat(val);
                    if (numVal < 0) numVal = 0;
                    const bc = (newEntry.isServer === 'Sí' && newEntry.serverAssignment === 'Ambos') ? currentPricing.server : currentPricing.global;
                    if (numVal > bc) numVal = bc;
                    setNewEntry({ ...newEntry, paid: numVal });
                  }}
                />
                {!(isCampa && newEntry.isScholarship === 'Sí') && newEntry.paid !== '' && parseFloat(newEntry.paid) < currentEvent.minDeposit && (
                  <span className="text-[10px] text-red-500 font-bold px-1 absolute top-full left-0 mt-0.5 whitespace-nowrap z-10">Falta ${currentEvent.minDeposit - (parseFloat(newEntry.paid) || 0)} para el apartado</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={() => handleAddEntry(loc)} disabled={!isFormValid || !isLocOpen(loc)} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${isFormValid && isLocOpen(loc) ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' : 'bg-slate-300 text-slate-400 cursor-not-allowed shadow-none'}`}><Plus size={20} /> Registrar</button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="relative w-full xl:w-1/4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 lg:flex-none"><ArrowUpDown size={14} className="text-slate-400" /><select className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="none">Ordenar...</option><option value="name-asc">Nombre (A-Z)</option><option value="name-desc">Nombre (Z-A)</option><option value="debt-asc">Deuda (Menor a Mayor)</option><option value="debt-desc">Deuda (Mayor a Menor)</option></select></div>
          {isCampa && (
            <>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 lg:flex-none"><MapPin size={14} className="text-slate-400" /><select className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full" value={filterAssignment} onChange={e => setFilterAssignment(e.target.value)}><option value="all">Asignación: Todas</option><option value="Teens">Teens</option><option value="Jóvenes">Jóvenes</option><option value="Ambos">Ambos (Servidores)</option></select></div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 lg:flex-none"><GraduationCap size={14} className="text-slate-400" /><select className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full" value={filterScholarship} onChange={e => setFilterScholarship(e.target.value)}><option value="all">Becados/Regulares</option><option value="Sí">Becados</option><option value="No">Regulares</option></select></div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 lg:flex-none"><Filter size={14} className="text-slate-400" /><select className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full" value={filterMedical} onChange={e => setFilterMedical(e.target.value)}><option value="all">Salud: Todos</option><option value="allergy">Con Alergias</option><option value="disease">Con Enfermedades</option><option value="disability">Con Discapacidades</option></select></div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 lg:flex-none"><Filter size={14} className="text-slate-400" /><select className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full" value={filterSwim} onChange={e => setFilterSwim(e.target.value)}><option value="all">Nado: Todos</option><option value="Sí">Saben nadar</option><option value="No">No saben nadar</option></select></div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 lg:flex-none"><Users size={14} className="text-slate-400" /><select className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full" value={filterServer} onChange={e => setFilterServer(e.target.value)}><option value="all">Servidores: Todos</option><option value="Sí">Servidores</option><option value="No">Camperos</option><option value="Teens">Asig. Teens</option><option value="Jóvenes">Asig. Jóvenes</option><option value="Ambos">Asig. Ambos</option></select></div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                <th className="px-4 py-4">Participante</th>
                {isCampa ? <th className="px-4 py-4">Salud y Nado</th> : <th className="px-4 py-4">Detalles</th>}
                <th className="px-4 py-4">Finanzas</th>
                <th className="px-4 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(() => {
                let processedData = [...(data[loc] || [])];
                if (searchTerm) processedData = processedData.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
                if (isCampa) {
                  if (filterAssignment !== 'all') {
                    processedData = processedData.filter(p => {
                      const assign = p.isServer === 'Sí' ? p.serverAssignment : p.campAssignment;
                      return assign === filterAssignment;
                    });
                  }
                  if (filterSwim !== 'all') processedData = processedData.filter(p => p.canSwim === filterSwim);
                  if (filterScholarship !== 'all') processedData = processedData.filter(p => p.isScholarship === filterScholarship);
                  if (filterServer === 'Sí') processedData = processedData.filter(p => p.isServer === 'Sí');
                  else if (filterServer === 'No') processedData = processedData.filter(p => p.isServer !== 'Sí');
                  else if (filterServer === 'Teens') processedData = processedData.filter(p => p.isServer === 'Sí' && p.serverAssignment === 'Teens');
                  else if (filterServer === 'Jóvenes') processedData = processedData.filter(p => p.isServer === 'Sí' && p.serverAssignment === 'Jóvenes');
                  else if (filterServer === 'Ambos') processedData = processedData.filter(p => p.isServer === 'Sí' && p.serverAssignment === 'Ambos');
                  if (filterMedical === 'allergy') processedData = processedData.filter(p => p.hasAllergy === 'Sí');
                  else if (filterMedical === 'disease') processedData = processedData.filter(p => p.hasDisease === 'Sí');
                  else if (filterMedical === 'disability') processedData = processedData.filter(p => p.hasDisability === 'Sí');
                }
                const getDebt = (p) => p.isScholarship === 'Sí' ? 0 : (p.registeredCost != null ? Number(p.registeredCost) : getPersonCost(p, currentPricing)) - parseFloat(p.paid || 0);
                if (sortBy === 'name-asc') processedData.sort((a, b) => a.name.localeCompare(b.name));
                if (sortBy === 'name-desc') processedData.sort((a, b) => b.name.localeCompare(a.name));
                if (sortBy === 'debt-asc') processedData.sort((a, b) => getDebt(a) - getDebt(b));
                if (sortBy === 'debt-desc') processedData.sort((a, b) => getDebt(b) - getDebt(a));
                if (processedData.length === 0) return <tr><td colSpan="4" className="px-6 py-16 text-center text-slate-400 italic font-medium">No hay registros para mostrar en {loc}.</td></tr>;

                return processedData.map((person) => {
                  const isExpanded = expandedRows.has(person.id);
                  const isBecado = isCampa && person.isScholarship === 'Sí';
                  const baseCost = person.registeredCost != null ? Number(person.registeredCost) : getPersonCost(person, currentPricing);
                  const balance = isBecado ? 0 : baseCost - parseFloat(person.paid || 0);
                  const payHistory = person.paymentHistory || [];

                  return (
                    <React.Fragment key={person.id}>
                      <tr className={`hover:bg-slate-50/50 transition-colors group ${isExpanded ? 'bg-slate-50/50' : ''}`}>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                {person.name}
                                {person._isDebug && person._debugSessionId === globalConfig?.debugSessionId && (
                                  <Bug size={14} className="text-orange-500 inline-block" title="Cambio no permanente" />
                                )}
                              </p>
                              {isBecado && <span className="bg-purple-100 text-purple-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><GraduationCap size={10} /> Becado</span>}
                              {person.isServer === 'Sí' ? (
                                <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><Users size={10} /> Servidor {person.serverAssignment ? `(${person.serverAssignment})` : ''}</span>
                              ) : (
                                isCampa && <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><Users size={10} /> {person.campAssignment || (parseInt(person.age) < 18 ? 'Teens' : 'Jóvenes')}</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-1"><span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" />{person.phone}</span></div>
                          </div>
                        </td>
                        {isCampa ? (
                          <td className="px-4 py-4 align-top"><div className="flex flex-col gap-2 text-xs"><div className="flex flex-wrap items-center gap-2"><span className="px-2 py-0.5 bg-red-50 text-red-600 rounded font-black border border-red-100 uppercase text-[10px]">Sangre: {person.bloodType}</span><span className={`px-2 py-0.5 rounded font-bold text-[10px] border flex items-center gap-1 ${person.canSwim === 'Sí' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{person.canSwim === 'Sí' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Nadador: {person.canSwim}</span></div></div></td>
                        ) : (
                          <td className="px-4 py-4 align-top">
                            <div className="text-xs text-slate-500 space-y-0.5">
                              {person.age ? <p><strong className="text-slate-600">Edad:</strong> {person.age} años</p> : <p className="italic text-slate-400">Edad no provista</p>}
                              {person.gender ? <p><strong className="text-slate-600">Género:</strong> {person.gender}</p> : <p className="italic text-slate-400">Género no provisto</p>}
                              {isGeneral && person.customData && Object.keys(person.customData).length > 0 && <p className="text-[10px] mt-1 text-indigo-500 font-bold tracking-wider pt-1">+ Datos Extra ({Object.keys(person.customData).length})</p>}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-2 w-full max-w-[140px]">
                            <div className="text-left space-y-0.5">
                              <p className="text-xs font-black text-green-600 flex justify-between"><span>Pagado:</span> <span>{formatMoney(person.paid || 0)}</span></p>
                              <p className={`text-[10px] font-bold flex justify-between ${isBecado ? 'text-purple-600' : balance > 0 ? 'text-orange-500' : 'text-green-600'}`}><span>Restante:</span> <span>{isBecado ? 'No requerido' : balance > 0 ? formatMoney(balance) : 'Liquidado'}</span></p>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-green-50 transition-all" style={{ width: `${Math.min(((person.paid || 0) / baseCost) * 100, 100)}%` }} /></div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => toggleRow(person.id)} className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`} title="Detalles">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                            {currentUser?.role !== 'Lector' && (
                              <>
                                <button onClick={() => setEditRegistryModal({ isOpen: true, loc, data: { ...person, registeredCost: baseCost, campAssignment: person.campAssignment || (parseInt(person.age) < 18 ? 'Teens' : 'Jóvenes') } })} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Editar Registro"><Edit3 size={18} /></button>
                                <button onClick={() => setPaymentModal({ isOpen: true, loc, id: person.id, personName: person.name, amount: '', currentPaid: parseFloat(person.paid || 0), error: '', isScholarship: isBecado ? 'Sí' : 'No', baseCost })} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Abonar Pago"><CreditCard size={18} /></button>
                                <button onClick={() => removeEntry(loc, person.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar Registro"><Trash2 size={18} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-indigo-50/30 border-b border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                          <td colSpan="4" className="px-6 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs items-start">
                              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                <p className="font-bold text-indigo-900 mb-2 uppercase tracking-wider text-[10px]">Detalles Generales</p>
                                <p className="mb-1 text-slate-600"><strong>Edad:</strong> {person.age || 'N/A'}</p>
                                <p className="text-slate-600"><strong>Género:</strong> {person.gender || 'N/A'}</p>
                              </div>
                              {(isCampa || isGeneral) ? (
                                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                  <p className="font-bold text-indigo-900 mb-2 uppercase tracking-wider text-[10px]">Contacto de Emergencia</p>
                                  {person.emergencyContact ? (<><p className="text-slate-700 font-semibold mb-1">{person.emergencyContact}</p><p className="flex items-center gap-1 text-slate-500 font-mono"><Phone size={10} /> {person.emergencyPhone}</p></>) : <p className="text-slate-400 italic">No provisto</p>}
                                </div>
                              ) : <div />}
                              {isCampa && (
                                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100"><p className="font-bold text-indigo-900 mb-2 uppercase tracking-wider text-[10px]">Condiciones Especiales</p><div className="space-y-1.5"><p className="text-slate-600"><strong>Alergias:</strong> {person.hasAllergy === 'Sí' ? <span className="text-orange-600 font-bold">{person.allergyDetails}</span> : <span>Ninguna</span>}</p><p className="text-slate-600"><strong>Enfermedades:</strong> {person.hasDisease === 'Sí' ? <span className="text-red-600 font-bold">{person.diseaseDetails}</span> : <span>Ninguna</span>}</p><p className="text-slate-600"><strong>Discapacidades:</strong> {person.hasDisability === 'Sí' ? <span className="text-purple-600 font-bold">{person.disabilityDetails}</span> : <span>Ninguna</span>}</p></div></div>
                              )}
                              {isGeneral && person.customData && Object.keys(person.customData).length > 0 && (
                                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                  <p className="font-bold text-indigo-900 mb-2 uppercase tracking-wider text-[10px]">Datos Extra</p>
                                  <div className="space-y-1.5">{Object.entries(person.customData).map(([key, val], i) => <p key={i} className="text-slate-600"><strong>{key}:</strong> {val || <span className="italic text-slate-400">N/A</span>}</p>)}</div>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><p className="font-bold text-indigo-900 uppercase tracking-wider text-[10px] flex items-center gap-2"><Receipt size={12} className="text-green-500" /> Historial de Pagos</p><span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100">{payHistory.length} {payHistory.length === 1 ? 'movimiento' : 'movimientos'}</span></div>
                              {payHistory.length === 0 ? <div className="px-4 py-6 text-center"><p className="text-[11px] text-slate-400 italic">Sin movimientos registrados.</p></div> : (
                                <div className="divide-y divide-slate-50">
                                  {payHistory.map((pay, idx) => (
                                    <div key={pay.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                      <div className="flex items-center gap-3"><span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black flex items-center justify-center flex-shrink-0">{idx + 1}</span><div><p className="text-[11px] font-mono text-slate-500">{pay.date}</p><div className="flex items-center gap-1.5 mt-0.5"><UserCircle size={10} className="text-slate-400" /><p className="text-[10px] text-slate-400 font-semibold">{pay.registeredBy}</p>{pay.isManualAdjustment && <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-bold uppercase">Ajuste Admin</span>}</div></div></div>
                                      <div className="text-right"><p className={`text-sm font-black ${pay.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>{pay.amount < 0 ? '-' : '+'}{formatMoney(Math.abs(pay.amount))}</p></div>
                                    </div>
                                  ))}
                                  <div className="px-4 py-2.5 bg-green-50 flex items-center justify-between"><span className="text-[10px] font-black text-green-800 uppercase tracking-wider">Total acumulado</span><span className="text-sm font-black text-green-700">{formatMoney(person.paid || 0)}</span></div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex overflow-hidden relative">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-5 py-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-5 fade-in flex items-center gap-3 font-bold text-sm border border-slate-700">
          <ShieldAlert size={20} className="text-amber-400" />{toast}
        </div>
      )}

      {debugToast && currentUser && selectedEventId && (
        <div className="fixed bottom-6 left-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 max-w-sm animate-in slide-in-from-bottom-5 border-l-4 border-orange-500 flex items-start gap-3">
          <Bug className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-xs font-bold leading-relaxed">{debugToast.msg}</p>
        </div>
      )}

      <aside className="w-80 bg-slate-900 text-white flex-shrink-0 flex-col hidden lg:flex z-20">
        <div className="p-8 pb-4">
          <div className="flex items-start gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 mt-1"><Edit3 size={20} /></div>
            <div className="w-full">
              <div className="flex items-start gap-2 pr-2">
                <h2 className="text-white font-black text-lg leading-tight w-full" style={{ wordBreak: 'break-word' }}>
                  {currentEvent?.name}
                </h2>
                {hasAdminRights && (
                  <button onClick={() => setRenameModal({isOpen: true, id: currentEvent.id, name: currentEvent.name})} className="text-slate-400 hover:text-indigo-300 mt-1 flex-shrink-0 transition-colors" title="Renombrar Evento">
                    <Edit3 size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <CalendarRange size={14} className="text-white" />
                <input
                  type="date"
                  value={tempEventDate}
                  disabled={!hasAdminRights}
                  onChange={(e) => setTempEventDate(e.target.value)}
                  onBlur={async (e) => {
                    const newVal = e.target.value;
                    if (newVal !== (currentEvent.date || '')) {
                      const payload = { date: newVal };
                      if (globalConfig?.isDebugMode) { payload._isDebug = true; payload._debugSessionId = globalConfig.debugSessionId; }
                      await updateDoc(getDocRef('app_events', currentEvent.id), payload);
                      addLog('Evento', `Fecha: "${currentEvent.date || 'Sin fecha'}" -> "${newVal}"`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
                    }
                  }}
                  className={`bg-transparent border-b border-dashed border-slate-600 text-indigo-200 text-xs font-bold focus:outline-none focus:border-indigo-400 transition-colors pb-0.5 [color-scheme:dark] ${hasAdminRights ? 'cursor-pointer' : 'cursor-default border-transparent'}`}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Registros Vida Nueva</p>
            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase font-bold">{currentEvent.eventType}</span>
          </div>
        </div>
        <div className="px-6 mb-4">
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Estado Global</p>
            <div className="flex justify-between items-center"><span className="text-xs font-bold">Inscritos Totales</span><span className="text-xs font-black text-indigo-400">{summary.globalStats.all.count}</span></div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-6">
          <div className="pt-2 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Principal</div>
          <button onClick={() => goTo(systemView, selectedEventId, "Summary")} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all mb-1 ${activeTab === 'Summary' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}><div className="flex items-center gap-3"><BarChart3 size={20} className={activeTab === 'Summary' ? 'text-indigo-400' : ''} /><span className="font-bold">Resumen General</span></div>{activeTab === 'Summary' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}</button>
          
          <div className="flex items-center justify-between py-2 px-4 border-t border-slate-800/50 pt-4">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Sedes Disponibles</span>
            {hasAdminRights && <button onClick={() => setIsAddLocModalOpen(true)} className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 p-1 rounded transition-colors" title="Añadir Sede"><Plus size={14} /></button>}
          </div>
          {(currentEvent?.locations || []).map(loc => (
            <div key={loc} className="flex flex-col mb-1">
              <button onClick={() => goTo(systemView, selectedEventId, loc)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${activeTab === loc ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
                <div className="flex items-center gap-3"><MapPin size={20} className={activeTab === loc ? 'text-white' : 'text-slate-700 group-hover:text-slate-500'} /><span className="font-bold">{loc}</span></div>
                <div className="flex items-center gap-2">
                  {!isLocOpen(loc) && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 rounded uppercase font-bold border border-red-500/30">Cerrada</span>}
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === loc ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{(data[loc] || []).length}</div>
                  {hasAdminRights && <div onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc); }} className={`p-1.5 rounded-lg transition-colors ${activeTab === loc ? 'hover:bg-indigo-500 text-indigo-200 hover:text-white' : 'text-slate-600 hover:bg-slate-800 hover:text-red-400'}`} title="Eliminar Sede"><Trash2 size={14} /></div>}
                </div>
              </button>
              {locError === loc && <span className="text-[10px] text-red-400 font-bold px-4 pt-1 animate-in slide-in-from-top-1 text-left">Sede con registros.</span>}
            </div>
          ))}
          <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border-t border-slate-800/50 mt-4">Sistema</div>
          <button onClick={() => goTo('users', null, "Summary")} className="w-full flex items-center justify-between p-4 rounded-2xl transition-all text-slate-500 hover:text-slate-300"><div className="flex items-center gap-3"><UserCog size={20} /><span className="font-bold">Registro de Usuarios</span></div></button>
          {currentUser?.role !== 'Lector' && (
            <button onClick={() => goTo('logs', null, "Summary")} className="w-full flex items-center justify-between p-4 rounded-2xl transition-all text-slate-500 hover:text-slate-300"><div className="flex items-center gap-3"><History size={20} /><span className="font-bold">Logs Globales</span></div></button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => goTo('events', null, "Summary")} className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold transition-all text-sm"><LayoutDashboard size={16} /> Cambiar de Evento</button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl font-bold transition-all text-sm"><LogOut size={16} /> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
            {navHistory.length > 0 && (
              <button
                onClick={goBack}
                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-indigo-600 transition-colors flex-shrink-0"
                title="Regresar"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <div className="lg:hidden flex items-center gap-3 flex-1 min-w-0">
              <h2 className="text-slate-800 font-black text-base truncate flex-1 flex items-center gap-2">
                {currentEvent?.name}
                {currentEvent?._isDebug && currentEvent?._debugSessionId === globalConfig?.debugSessionId && <Bug size={14} className="text-orange-500" title="Cambio no permanente" />}
              </h2>
              {hasAdminRights && (
                <button onClick={() => setRenameModal({isOpen: true, id: currentEvent.id, name: currentEvent.name})} className="text-slate-400 hover:text-indigo-600 p-1 flex-shrink-0">
                  <Edit3 size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 relative">
            <div className="hidden lg:flex items-center gap-2 mr-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200"><UserCircle size={16} className="text-slate-400" /><span className="text-xs font-bold text-slate-600">{currentUser.username}</span></div>
            <button onClick={exportToCSV} className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 rounded-full text-[10px] md:text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors" title="Exportar a CSV"><Download size={14} /><span className="hidden sm:inline">Exportar</span></button>
            
            {hasFinancialAccess && (
              <button onClick={() => setShowMoney(!showMoney)} className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 rounded-full text-[10px] md:text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors" title={showMoney ? 'Ocultar Dinero' : 'Mostrar Dinero'}>{showMoney ? <EyeOff size={14} /> : <Eye size={14} />}<span className="hidden sm:inline">{showMoney ? 'Ocultar Dinero' : 'Mostrar Dinero'}</span></button>
            )}
            
            {activeTab === "Summary" && (
              <div className="relative">
                <button onClick={() => setShowViewSettings(!showViewSettings)} className={`flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 rounded-full text-[10px] md:text-xs font-bold transition-colors ${showViewSettings ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`} title="Configurar Vista">
                  <SlidersHorizontal size={14} /><span className="hidden sm:inline">Vista</span>
                </button>
                {showViewSettings && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowViewSettings(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in slide-in-from-top-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Configurar Resumen</h4>
                      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                        {[
                          { key: 'statsConfig', label: 'Tarjetas Principales' },
                          { key: 'chartLocations', label: 'Gráfica: Sedes' },
                          { key: 'chartIncome', label: 'Gráfica: Ingresos' },
                          { key: 'chartPaymentStatus', label: 'Gráfica: Estado de Pagos' },
                          { key: 'chartGender', label: 'Gráfica: Género' },
                          { key: 'chartAgeBrackets', label: 'Gráfica: Rangos de Edad' },
                          { key: 'chartBloodType', label: 'Gráfica: Tipo de Sangre', show: isCampa },
                          { key: 'chartScholarship', label: 'Gráfica: Becas', show: isCampa },
                          { key: 'chartSwimming', label: 'Gráfica: Nado', show: isCampa },
                          { key: 'chartMedical', label: 'Gráfica: Salud', show: isCampa },
                          { key: 'chartServers', label: 'Gráfica: Servidores', show: isCampa },
                          { key: 'chartAges', label: 'Gráfica: Asignación', show: isCampa },
                          { key: 'chartCustom', label: 'Gráfica: Campos Extra', show: isGeneral && currentEvent?.customFields?.length > 0 },
                          { key: 'tableDetails', label: 'Tabla de Desglose General' },
                        ].filter(item => item.show !== false).map(item => (
                          <label key={item.key} className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <span className="text-xs font-bold text-slate-600">{item.label}</span>
                            <div className="relative flex items-center">
                              <input type="checkbox" className="sr-only peer" checked={viewPrefs[item.key] !== false} onChange={() => togglePref(item.key)} />
                              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="bg-slate-100 rounded-full p-1 hidden sm:flex ml-2">
              <button onClick={() => goTo(systemView, selectedEventId, "Summary")} className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${activeTab === 'Summary' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Resumen General</button>
            </div>
            <button onClick={() => goTo('events', null, 'Summary')} className="lg:hidden bg-indigo-50 text-indigo-600 p-2 rounded-xl ml-1"><LayoutDashboard size={18} /></button>
          </div>
        </header>
        {activeTab === "Summary" && renderSummary()}
        {(currentEvent?.locations || []).includes(activeTab) && renderLocationSheet(activeTab)}
      </main>

      {/* EDIT REGISTRY MODAL */}
      {editRegistryModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-auto animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <div><h3 className="text-xl font-bold flex items-center gap-2"><Edit3 /> Editar Participante</h3><p className="text-indigo-100 text-xs">Actualizando registro de {editRegistryModal.data.name}</p></div>
              <button onClick={() => setEditRegistryModal({ isOpen: false, loc: '', data: null })} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleUpdateEntry} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1"><label className={labelClasses}>Nombre Completo</label><input type="text" required className={inputClasses} value={editRegistryModal.data.name} onChange={e => handleNameInput(e.target.value) && setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, name: e.target.value } })} /></div>
                <div className="space-y-1"><label className={labelClasses}>Teléfono</label><input type="text" required className={inputClasses} value={editRegistryModal.data.phone} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, phone: formatPhoneNumber(e.target.value) } })} /></div>
                <div className="space-y-1"><label className={labelClasses}>Edad {!isCampa && "(Opcional)"}</label><input type="number" required={isCampa} className={inputClasses} value={editRegistryModal.data.age} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, age: e.target.value } })} /></div>
                <div className="space-y-1"><label className={labelClasses}>Género {!isCampa && "(Opcional)"}</label>
                  <select required={isCampa} className={inputClasses} value={editRegistryModal.data.gender} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, gender: e.target.value } })}>
                    <option value="">Seleccionar {!isCampa && "(Opcional)"}</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {(isCampa || isGeneral) && (
                  <>
                    <div className="space-y-1"><label className={labelClasses}>Contacto Emergencia {isGeneral && "(Opcional)"}</label><input type="text" required={isCampa} className={inputClasses} value={editRegistryModal.data.emergencyContact} onChange={e => handleNameInput(e.target.value) && setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, emergencyContact: e.target.value } })} /></div>
                    <div className="space-y-1"><label className={labelClasses}>Tel. Emergencia {isGeneral && "(Opcional)"}</label><input type="text" required={isCampa} className={inputClasses} value={editRegistryModal.data.emergencyPhone} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, emergencyPhone: formatPhoneNumber(e.target.value) } })} /></div>
                  </>
                )}
                {isGeneral && currentEvent.customFields && currentEvent.customFields.map((field, idx) => (
                  <div className="space-y-1" key={idx}>
                    <label className={`${labelClasses} truncate`} title={field}>{field}</label>
                    <input className={inputClasses} value={editRegistryModal.data.customData?.[field] || ''} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, customData: { ...(editRegistryModal.data.customData || {}), [field]: e.target.value } } })} />
                  </div>
                ))}
              </div>

              {isCampa && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-red-50/30 rounded-2xl border border-red-100">
                  <h4 className="col-span-full text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pb-2 border-b border-red-100">Condiciones Médicas</h4>
                  <div className="space-y-1"><label className={labelClasses}>Alergias</label><div className="flex gap-2"><select className={`p-2.5 bg-white border rounded-xl outline-none text-xs font-bold ${editRegistryModal.data.hasAllergy === 'Sí' ? 'border-orange-300 text-orange-600' : 'border-slate-200'}`} value={editRegistryModal.data.hasAllergy} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, hasAllergy: e.target.value } })}><option value="No">No</option><option value="Sí">Sí</option></select>{editRegistryModal.data.hasAllergy === 'Sí' && <input placeholder="¿Cuál?" className="flex-1 p-2.5 bg-white border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold" value={editRegistryModal.data.allergyDetails} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, allergyDetails: e.target.value } })} />}</div></div>
                  <div className="space-y-1"><label className={labelClasses}>Enfermedades</label><div className="flex gap-2"><select className={`p-2.5 bg-white border rounded-xl outline-none text-xs font-bold ${editRegistryModal.data.hasDisease === 'Sí' ? 'border-red-300 text-red-600' : 'border-slate-200'}`} value={editRegistryModal.data.hasDisease} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, hasDisease: e.target.value } })}><option value="No">No</option><option value="Sí">Sí</option></select>{editRegistryModal.data.hasDisease === 'Sí' && <input placeholder="¿Cuál?" className="flex-1 p-2.5 bg-white border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold" value={editRegistryModal.data.diseaseDetails} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, diseaseDetails: e.target.value } })} />}</div></div>
                  <div className="space-y-1"><label className={labelClasses}>Discapacidades</label><div className="flex gap-2"><select className={`p-2.5 bg-white border rounded-xl outline-none text-xs font-bold ${editRegistryModal.data.hasDisability === 'Sí' ? 'border-purple-300 text-purple-600' : 'border-slate-200'}`} value={editRegistryModal.data.hasDisability} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, hasDisability: e.target.value } })}><option value="No">No</option><option value="Sí">Sí</option></select>{editRegistryModal.data.hasDisability === 'Sí' && <input placeholder="¿Cuál?" className="flex-1 p-2.5 bg-white border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold" value={editRegistryModal.data.disabilityDetails} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, disabilityDetails: e.target.value } })} />}</div></div>
                </div>
              )}

              {isCampa && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 pb-2">Tipo de Sangre y Nado</h4>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <label className={labelClasses}>Tipo de Sangre</label>
                        <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" value={editRegistryModal.data.bloodType || 'O+'} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, bloodType: e.target.value } })}>
                          {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className={labelClasses}>¿Sabe Nadar?</label>
                        <button type="button" onClick={() => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, canSwim: editRegistryModal.data.canSwim === 'Sí' ? 'No' : 'Sí' } })} className={`w-full py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${editRegistryModal.data.canSwim === 'Sí' ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-white text-slate-500 border-slate-200'}`}><Droplets size={16} /> Nado: {editRegistryModal.data.canSwim}</button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 pb-2">Configuración Especial</h4>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, isScholarship: editRegistryModal.data.isScholarship === 'Sí' ? 'No' : 'Sí' } })} className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${editRegistryModal.data.isScholarship === 'Sí' ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-white text-slate-500 border-slate-200'}`}><GraduationCap size={16} /> Becado: {editRegistryModal.data.isScholarship}</button>
                      <button type="button" onClick={() => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, isServer: editRegistryModal.data.isServer === 'Sí' ? 'No' : 'Sí', serverAssignment: '' } })} className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${editRegistryModal.data.isServer === 'Sí' ? 'bg-amber-500 text-white border-amber-400 shadow-lg' : 'bg-white text-slate-500 border-slate-200'}`}><Users size={16} /> Servidor: {editRegistryModal.data.isServer || 'No'}</button>
                    </div>
                    {editRegistryModal.data.isServer === 'Sí' ? (
                      <div className="space-y-1 mt-3">
                        <label className={labelClasses}>Asignación de Servidor</label>
                        <select className={inputClasses} value={editRegistryModal.data.serverAssignment || ''} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, serverAssignment: e.target.value } })}>
                          <option value="">Selecciona a qué evento servirá...</option>
                          <option value="Teens">Teens (Menores de 18)</option>
                          <option value="Jóvenes">Jóvenes (Mayores de 18)</option>
                          <option value="Ambos">Ambos Eventos</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-3">
                        <label className={labelClasses}>Asignación de Campista</label>
                        <select className={inputClasses} value={editRegistryModal.data.campAssignment} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, campAssignment: e.target.value } })}>
                          <option value="Teens">Teens (Menores de 18)</option>
                          <option value="Jóvenes">Jóvenes (Mayores de 18)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 mb-4 flex items-center justify-between">
                  <span>Costo Fijado (Total a Cobrar)</span>
                  {!hasAdminRights && <span className="flex items-center gap-1 text-amber-500 normal-case tracking-normal text-[9px]"><Lock size={10} /> Solo Administrador</span>}
                </h4>
                {hasAdminRights ? (
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input type="number" className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-slate-800 font-bold"
                      value={editRegistryModal.data.registeredCost !== undefined ? editRegistryModal.data.registeredCost : getPersonCost(editRegistryModal.data, currentPricing)}
                      onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, registeredCost: e.target.value } })}
                    />
                  </div>
                ) : (
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-300">$</span>
                    <div className="w-full pl-8 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 font-bold text-sm cursor-not-allowed select-none flex items-center justify-between">
                      <span>{parseFloat(editRegistryModal.data.registeredCost || 0).toLocaleString()}</span>
                      <Lock size={14} className="text-slate-300" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditRegistryModal({ isOpen: false, loc: '', data: null })} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-sm uppercase">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-200 flex justify-center items-center gap-2 text-sm uppercase"><CheckCircle2 size={20} /> Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICING MODAL */}
      {pricingModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><Settings2 className="text-indigo-600" /> Configuración de Precios</h3>
            <p className="text-sm text-slate-500 mb-6">Elige si el precio será fijo o si cambiará automáticamente según la fecha de registro.</p>
            <div className="flex gap-4 mb-6">
              <button onClick={() => setPricingForm({ ...pricingForm, type: 'fixed' })} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${pricingForm.type === 'fixed' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>Precio Fijo</button>
              <button onClick={() => setPricingForm({ ...pricingForm, type: 'dynamic' })} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${pricingForm.type === 'dynamic' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>Por Fechas (Dinámico)</button>
            </div>
            {pricingForm.type === 'fixed' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="space-y-1"><label className={labelClasses}>Costo Base</label><input type="number" className={inputClasses} value={pricingForm.globalCost} onChange={e => setPricingForm({ ...pricingForm, globalCost: e.target.value })} /></div>
                {isCampa && <div className="space-y-1"><label className={labelClasses}>Costo Servidor (Ambos)</label><input type="number" className={inputClasses} value={pricingForm.serverCost} onChange={e => setPricingForm({ ...pricingForm, serverCost: e.target.value })} /></div>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-4 max-h-[300px] overflow-y-auto">
                  {pricingForm.phases.map((phase, index) => (
                    <div key={phase.id} className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                      <div className="w-full md:w-auto flex-1 space-y-1"><label className={labelClasses}>Hasta la fecha</label><input type="date" max={currentEvent.date || undefined} className={inputClasses} value={phase.dateUntil} onChange={e => { const newPhases = [...pricingForm.phases]; newPhases[index].dateUntil = e.target.value; setPricingForm({ ...pricingForm, phases: newPhases }); }} /></div>
                      <div className="w-full md:w-auto flex-1 space-y-1"><label className={labelClasses}>Costo Base</label><input type="number" className={inputClasses} value={phase.globalCost} onChange={e => { const newPhases = [...pricingForm.phases]; newPhases[index].globalCost = e.target.value; setPricingForm({ ...pricingForm, phases: newPhases }); }} /></div>
                      {isCampa && <div className="w-full md:w-auto flex-1 space-y-1"><label className={labelClasses}>Costo Serv. (Ambos)</label><input type="number" className={inputClasses} value={phase.serverCost} onChange={e => { const newPhases = [...pricingForm.phases]; newPhases[index].serverCost = e.target.value; setPricingForm({ ...pricingForm, phases: newPhases }); }} /></div>}
                      <button onClick={() => { const newPhases = pricingForm.phases.filter((_, i) => i !== index); setPricingForm({ ...pricingForm, phases: newPhases }); }} className="p-2 mb-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                  <button onClick={() => setPricingForm({ ...pricingForm, phases: [...pricingForm.phases, { id: Date.now(), dateUntil: '', globalCost: 0, serverCost: 0 }] })} className="w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-500 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Añadir Fase</button>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4">
                  <p className="text-xs font-bold text-slate-600 mb-3">Precio Final (Cuando pasen todas las fechas anteriores):</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className={labelClasses}>Costo Base Final</label><input type="number" className={inputClasses} value={pricingForm.globalCost} onChange={e => setPricingForm({ ...pricingForm, globalCost: e.target.value })} /></div>
                    {isCampa && <div className="space-y-1"><label className={labelClasses}>Costo Servidor Final (Ambos)</label><input type="number" className={inputClasses} value={pricingForm.serverCost} onChange={e => setPricingForm({ ...pricingForm, serverCost: e.target.value })} /></div>}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-4 pt-6 mt-6 border-t border-slate-100">
              <button onClick={() => setPricingModal({ isOpen: false })} className={btnSecondary}>Cancelar</button>
              <button onClick={handleSavePricing} className={btnPrimary}><CheckCircle2 size={20} /> Guardar Precios</button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Abonar Pago</h3>
            <p className="text-sm text-slate-500 mb-6">Registrando abono para <strong className="text-slate-700">{paymentModal.personName}</strong></p>
            <div className="space-y-6">
              <div>
                <label className={labelClasses}>Monto a abonar ($)</label>
                <div className="relative mt-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${paymentModal.error ? 'text-red-400' : 'text-slate-400'}`}>$</span>
                  <input type="number" autoFocus className={`w-full pl-8 pr-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 font-bold ${paymentModal.error ? 'border-red-300 text-red-700 focus:ring-red-500' : 'border-slate-200 text-green-700 focus:ring-green-500'}`} placeholder="0.00" value={paymentModal.amount} onChange={e => setPaymentModal({ ...paymentModal, amount: e.target.value, error: '' })} onKeyDown={e => e.key === 'Enter' && submitAbono()} />
                  {paymentModal.isScholarship === 'No' && !paymentModal.error && <span className="text-[10px] text-red-500 font-bold px-1 absolute top-full left-0 mt-1 whitespace-nowrap z-10">Resta para liquidar: ${paymentModal.baseCost - paymentModal.currentPaid}</span>}
                </div>
                {paymentModal.error && <p className="text-[10px] text-red-500 font-bold mt-1 px-1 animate-in slide-in-from-top-1">{paymentModal.error}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPaymentModal({ isOpen: false, loc: '', id: null, personName: '', amount: '', currentPaid: 0, error: '', isScholarship: 'No', baseCost: 0 })} className={btnSecondary}>Cancelar</button>
                <button onClick={submitAbono} className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-200 text-sm flex justify-center items-center gap-2"><CreditCard size={18} /> Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM FIELDS MODAL */}
      {customFieldsModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div><h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2"><ListPlus size={24} className="text-indigo-600" /> Campos Personalizados</h3><p className="text-sm text-slate-500">Añade o elimina preguntas extra para este evento.</p></div>
              <button onClick={() => setCustomFieldsModal({ isOpen: false })} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><XCircle size={20} /></button>
            </div>
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
              {currentEvent?.customFields && currentEvent.customFields.length > 0 ? (
                currentEvent.customFields.map((field, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="font-bold text-slate-700 text-sm truncate">{field}</span>
                    <button onClick={() => handleRemoveCustomField(field)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))
              ) : <p className="text-center text-sm italic text-slate-400 py-4">No hay campos extra configurados.</p>}
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <label className={labelClasses}>Añadir Nuevo Campo</label>
              <div className="flex gap-2">
                <input type="text" className={inputClasses} placeholder="Ej. Talla de playera" value={newCustomField} onChange={e => setNewCustomField(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomField()} />
                <button onClick={handleAddCustomField} disabled={!newCustomField.trim()} className={btnPrimary}><Plus size={18} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD LOCATION MODAL */}
      {isAddLocModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Añadir Nueva Sede</h3>
            <p className="text-sm text-slate-500 mb-6">Ingresa el nombre de la nueva ubicación para este evento.</p>
            <div className="space-y-4">
              <input type="text" autoFocus className={inputClasses} placeholder="Ej. Querétaro" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddLocation()} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setIsAddLocModalOpen(false); setNewLocationName(''); }} className={btnSecondary}>Cancelar</button>
                <button onClick={handleAddLocation} disabled={!newLocationName.trim()} className={btnPrimary}><Plus size={18} /> Añadir</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
