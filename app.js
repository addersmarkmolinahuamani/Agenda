/**
 * PLANSYNC - PLANIFICADOR & AGENDA PRO
 * Lógica de la aplicación: Estado, Vistas en Filas & Calendario, Persistencia Local,
 * Sincronización en la Nube con Supabase y Soporte Móvil PWA.
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIGURACIÓN Y CONSTANTES
  // ==========================================
  const STORAGE_KEY = 'plansync_tasks_v1';
  const CLOUD_CONFIG_KEY = 'plansync_supabase_config';
  const THEME_KEY = 'agenda_theme';

  // Credenciales por defecto de Supabase vinculadas
  const DEFAULT_SUPABASE_URL = 'https://jzwjudqysrnhevpcqjqu.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'sb_publishable_rkZVJt0njBc3MNX6dc5Zaw_G4HgKk4D';

  // ==========================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================
  const STATE = {
    tasks: [],
    currentView: 'rows', // 'rows' | 'calendar'
    activeFilter: 'all',  // 'all' | 'pending' | 'with-date' | 'without-date' | 'completed'
    priorityFilter: 'all', // 'all' | 'high' | 'medium' | 'low'
    searchQuery: '',
    calendarDate: new Date(),
    selectedCalendarDate: formatDateToISO(new Date()),
    editingTaskId: null,
    theme: 'dark',
    
    // Supabase
    supabaseClient: null,
    isCloudConnected: false,
    cloudSyncing: false
  };

  // ==========================================
  // REFERENCIAS AL DOM
  // ==========================================
  const DOM = {
    currentDateDisplay: document.getElementById('current-date-display'),
    
    // Theme
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
    
    // View Switchers
    btnViewRows: document.getElementById('btn-view-rows'),
    btnViewCalendar: document.getElementById('btn-view-calendar'),
    viewRows: document.getElementById('view-rows'),
    viewCalendar: document.getElementById('view-calendar'),
    
    // Header actions
    btnOpenNewTask: document.getElementById('btn-open-new-task'),
    btnSyncSettings: document.getElementById('btn-sync-settings'),
    syncDot: document.getElementById('sync-dot'),
    syncStatusText: document.getElementById('sync-status-text'),

    // Métricas
    countTotal: document.getElementById('count-total'),
    countDueSoon: document.getElementById('count-due-soon'),
    countNoDate: document.getElementById('count-no-date'),
    countCompleted: document.getElementById('count-completed'),
    metricCards: {
      all: document.getElementById('metric-filter-all'),
      dueSoon: document.getElementById('metric-filter-due-soon'),
      noDate: document.getElementById('metric-filter-no-date'),
      completed: document.getElementById('metric-filter-completed')
    },

    // Filtros
    filterIndicator: document.getElementById('filter-indicator'),
    filterIndicatorText: document.getElementById('filter-indicator-text'),
    btnResetFilters: document.getElementById('btn-reset-filters'),

    // Vista Filas
    groupOverdue: document.getElementById('group-overdue'),
    listOverdue: document.getElementById('list-overdue'),
    countOverdueBadge: document.getElementById('count-overdue-badge'),
    
    groupUpcoming: document.getElementById('group-upcoming'),
    listUpcoming: document.getElementById('list-upcoming'),
    countUpcomingBadge: document.getElementById('count-upcoming-badge'),

    groupCompleted: document.getElementById('group-completed'),
    headerCompletedToggle: document.getElementById('header-completed-toggle'),
    listCompleted: document.getElementById('list-completed'),
    countCompletedBadge: document.getElementById('count-completed-badge'),

    listWithoutDate: document.getElementById('list-without-date'),
    countNodateBadge: document.getElementById('count-nodate-badge'),

    globalEmptyState: document.getElementById('global-empty-state'),

    // Vista Calendario
    calPrevMonth: document.getElementById('cal-prev-month'),
    calNextMonth: document.getElementById('cal-next-month'),
    calMonthYearLabel: document.getElementById('calendar-month-year-label'),
    calTodayBtn: document.getElementById('cal-today-btn'),
    calendarDaysGrid: document.getElementById('calendar-days-grid'),

    selectedDayBadge: document.getElementById('selected-day-badge'),
    selectedDayTitle: document.getElementById('selected-day-title'),
    btnAddOnSelectedDate: document.getElementById('btn-add-on-selected-date'),
    selectedDayTasksList: document.getElementById('selected-day-tasks-list'),
    selectedDayEmpty: document.getElementById('selected-day-empty'),
    btnQuickAddToDate: document.getElementById('btn-quick-add-to-date'),

    calendarNodateList: document.getElementById('calendar-nodate-list'),
    calCountNodate: document.getElementById('cal-count-nodate'),

    // Modal de Tarea
    taskModal: document.getElementById('task-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    taskForm: document.getElementById('task-form'),
    taskIdInput: document.getElementById('task-id-input'),
    taskTitleInput: document.getElementById('task-title-input'),
    taskDescInput: document.getElementById('task-desc-input'),
    taskHasDateToggle: document.getElementById('task-has-date-toggle'),
    dateInputsContainer: document.getElementById('date-inputs-container'),
    taskDateInput: document.getElementById('task-date-input'),
    taskTimeInput: document.getElementById('task-time-input'),
    taskPrioritySelect: document.getElementById('task-priority-select'),
    taskCategorySelect: document.getElementById('task-category-select'),
    modalSubmitBtn: document.getElementById('modal-submit-btn'),

    // Modal de Nube (Supabase)
    cloudModal: document.getElementById('cloud-modal'),
    cloudModalCloseBtn: document.getElementById('cloud-modal-close-btn'),
    supabaseUrlInput: document.getElementById('supabase-url-input'),
    supabaseKeyInput: document.getElementById('supabase-key-input'),
    cloudTestStatus: document.getElementById('cloud-test-status'),
    cloudStatusDesc: document.getElementById('cloud-status-desc'),
    btnSaveCloudConfig: document.getElementById('btn-save-cloud-config'),
    btnDisconnectCloud: document.getElementById('btn-disconnect-cloud'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================
  async function init() {
    initTheme();
    registerServiceWorker();
    renderCurrentHeaderDate();
    loadLocalTasks();
    bindEvents();
    renderAll();

    // Intentar inicializar Supabase si ya hay credenciales guardadas
    await initSupabaseFromStorage();
  }

  // ==========================================
  // GESTIÓN DE TEMAS (CLARO / OSCURO)
  // ==========================================
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    setTheme(savedTheme, false);
  }

  function setTheme(theme, notify = true) {
    STATE.theme = theme;
    localStorage.setItem(THEME_KEY, theme);

    if (theme === 'light') {
      document.body.classList.add('light-theme');
      if (DOM.sunIcon) DOM.sunIcon.classList.add('hidden');
      if (DOM.moonIcon) DOM.moonIcon.classList.remove('hidden');
      if (notify) showToast('Modo Claro activado ☀️', 'info');
    } else {
      document.body.classList.remove('light-theme');
      if (DOM.sunIcon) DOM.sunIcon.classList.remove('hidden');
      if (DOM.moonIcon) DOM.moonIcon.classList.add('hidden');
      if (notify) showToast('Modo Oscuro activado 🌙', 'info');
    }
  }

  function toggleTheme() {
    const nextTheme = STATE.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme, true);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.warn('PWA ServiceWorker error:', err);
        });
      });
    }
  }

  function renderCurrentHeaderDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.currentDateDisplay.textContent = today.toLocaleDateString('es-ES', options);
  }

  // ==========================================
  // CAPA DE SUPABASE & SINCRONIZACIÓN
  // ==========================================
  async function initSupabaseFromStorage() {
    let url = DEFAULT_SUPABASE_URL;
    let key = DEFAULT_SUPABASE_KEY;

    const savedConfig = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.url && parsed.key) {
          url = parsed.url;
          key = parsed.key;
        }
      } catch (e) {
        console.warn('Configuración de Supabase inválida en almacenamiento local:', e);
      }
    }

    if (url && key) {
      await connectToSupabase(url, key, false);
    } else {
      updateSyncStatusUI(false);
    }
  }

  async function connectToSupabase(url, key, isUserAction = true) {
    if (!window.supabase || !window.supabase.createClient) {
      if (isUserAction) showToast('El cliente de Supabase no está cargado. Revisa tu conexión a internet.', 'warning');
      return false;
    }

    setCloudSyncingState(true);

    try {
      const client = window.supabase.createClient(url.trim(), key.trim());
      
      // Probar lectura de la tabla tasks
      const { data, error } = await client.from('tasks').select('*').limit(500);

      if (error) {
        throw error;
      }

      STATE.supabaseClient = client;
      STATE.isCloudConnected = true;

      // Guardar configuración válida
      localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }));
      updateSyncStatusUI(true);

      // Si hay datos remotos, sincronizar
      if (data && data.length > 0) {
        STATE.tasks = data.map(dbRowToTask);
        saveLocalTasks();
        renderAll();
        if (isUserAction) showToast(`¡Conectado! Se sincronizaron ${data.length} pendientes desde la nube.`, 'success');
      } else if (STATE.tasks.length > 0) {
        // La tabla remota está vacía, subir las tareas locales existentes
        await pushAllTasksToCloud();
        if (isUserAction) showToast('¡Conectado! Tareas locales subidas a Supabase.', 'success');
      }

      // Suscribirse a cambios en tiempo real (Realtime)
      setupRealtimeSubscription();

      setCloudSyncingState(false);
      return true;

    } catch (err) {
      console.error('Error al conectar con Supabase:', err);
      STATE.supabaseClient = null;
      STATE.isCloudConnected = false;
      updateSyncStatusUI(false);
      setCloudSyncingState(false);
      
      if (isUserAction) {
        let errorMsg = 'Error al conectar con Supabase.';
        if (err.message && err.message.includes('relation "public.tasks" does not exist')) {
          errorMsg = 'Falta crear la tabla en Supabase. Ejecuta el script "supabase_setup.sql" en tu panel de Supabase.';
        } else if (err.message) {
          errorMsg += ` ${err.message}`;
        }
        showToast(errorMsg, 'warning');
      }
      return false;
    }
  }

  function setupRealtimeSubscription() {
    if (!STATE.supabaseClient) return;

    try {
      STATE.supabaseClient
        .channel('public:tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
          handleRealtimeEvent(payload);
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription no disponible:', e);
    }
  }

  function handleRealtimeEvent(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT') {
      const task = dbRowToTask(newRecord);
      if (!STATE.tasks.some(t => t.id === task.id)) {
        STATE.tasks.unshift(task);
        saveLocalTasks();
        renderAll();
      }
    } else if (eventType === 'UPDATE') {
      const updated = dbRowToTask(newRecord);
      const index = STATE.tasks.findIndex(t => t.id === updated.id);
      if (index !== -1) {
        STATE.tasks[index] = updated;
        saveLocalTasks();
        renderAll();
      }
    } else if (eventType === 'DELETE') {
      const index = STATE.tasks.findIndex(t => t.id === oldRecord.id);
      if (index !== -1) {
        STATE.tasks.splice(index, 1);
        saveLocalTasks();
        renderAll();
      }
    }
  }

  async function pushAllTasksToCloud() {
    if (!STATE.supabaseClient || !STATE.isCloudConnected) return;
    try {
      const rows = STATE.tasks.map(taskToDbRow);
      await STATE.supabaseClient.from('tasks').upsert(rows);
    } catch (e) {
      console.error('Error subiendo tareas a la nube:', e);
    }
  }

  async function syncTaskToCloud(task, action = 'upsert') {
    if (!STATE.supabaseClient || !STATE.isCloudConnected) return;
    try {
      if (action === 'upsert') {
        const row = taskToDbRow(task);
        await STATE.supabaseClient.from('tasks').upsert([row]);
      } else if (action === 'delete') {
        await STATE.supabaseClient.from('tasks').delete().eq('id', task.id);
      }
    } catch (e) {
      console.error('Error sincronizando cambio en Supabase:', e);
    }
  }

  function disconnectCloud() {
    localStorage.removeItem(CLOUD_CONFIG_KEY);
    STATE.supabaseClient = null;
    STATE.isCloudConnected = false;
    updateSyncStatusUI(false);
    showToast('Desconectado de Supabase. Operando en modo local.', 'info');
  }

  function updateSyncStatusUI(isConnected) {
    if (DOM.syncDot) {
      DOM.syncDot.className = isConnected ? 'sync-dot dot-online' : 'sync-dot dot-offline';
    }
    if (DOM.syncStatusText) {
      DOM.syncStatusText.textContent = isConnected ? 'En la Nube' : 'Modo Local';
    }
    if (DOM.btnDisconnectCloud) {
      DOM.btnDisconnectCloud.classList.toggle('hidden', !isConnected);
    }
    if (DOM.cloudStatusDesc) {
      DOM.cloudStatusDesc.textContent = isConnected 
        ? 'Conectado a Supabase. Sincronización activa con tu celular.' 
        : 'Modo Local. Conecta tu Supabase para sincronizar con tu celular.';
    }
  }

  function setCloudSyncingState(isSyncing) {
    STATE.cloudSyncing = isSyncing;
    if (DOM.syncDot) {
      DOM.syncDot.className = 'sync-dot dot-syncing';
    }
    if (DOM.syncStatusText) {
      DOM.syncStatusText.textContent = 'Sincronizando...';
    }
    if (!isSyncing) {
      updateSyncStatusUI(STATE.isCloudConnected);
    }
  }

  // Mapeo entre camelCase (JS) y snake_case (Base de datos PostgreSQL)
  function taskToDbRow(task) {
    return {
      id: task.id,
      title: task.title,
      notes: task.notes || null,
      has_due_date: Boolean(task.hasDueDate),
      due_date: task.dueDate || null,
      due_time: task.dueTime || null,
      priority: task.priority || 'medium',
      category: task.category || 'trabajo',
      completed: Boolean(task.completed),
      completed_at: task.completedAt || null,
      created_at: task.createdAt || Date.now()
    };
  }

  function dbRowToTask(row) {
    return {
      id: row.id,
      title: row.title,
      notes: row.notes || '',
      hasDueDate: Boolean(row.has_due_date),
      dueDate: row.due_date || null,
      dueTime: row.due_time || null,
      priority: row.priority || 'medium',
      category: row.category || 'trabajo',
      completed: Boolean(row.completed),
      completedAt: row.completed_at || null,
      createdAt: row.created_at || Date.now()
    };
  }

  // ==========================================
  // PERSISTENCIA LOCAL (OFFLINE FIRST)
  // ==========================================
  function loadLocalTasks() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        STATE.tasks = JSON.parse(saved);
        return;
      } catch (e) {
        console.error('Error leyendo tareas del almacenamiento local:', e);
      }
    }
    // Demostración inicial amigable
    STATE.tasks = generateSampleTasks();
    saveLocalTasks();
  }

  function saveLocalTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.tasks));
  }

  function generateSampleTasks() {
    const now = new Date();
    const todayStr = formatDateToISO(now);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateToISO(tomorrow);

    const inThreeDays = new Date(now);
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    const inThreeDaysStr = formatDateToISO(inThreeDays);

    const inFiveDays = new Date(now);
    inFiveDays.setDate(inFiveDays.getDate() + 5);
    const inFiveDaysStr = formatDateToISO(inFiveDays);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateToISO(yesterday);

    return [
      {
        id: 't-1',
        title: 'Revisión y entrega del reporte del proyecto',
        notes: 'Verificar métricas finales y anexar gráficos comparativos',
        hasDueDate: true,
        dueDate: todayStr,
        dueTime: '17:00',
        priority: 'high',
        category: 'trabajo',
        completed: false,
        completedAt: null,
        createdAt: Date.now() - 3600000 * 24
      },
      {
        id: 't-2',
        title: 'Comprar boletos para el seminario de tecnología',
        notes: 'Verificar si aún aplica el descuento por reserva temprana',
        hasDueDate: true,
        dueDate: tomorrowStr,
        dueTime: '11:30',
        priority: 'medium',
        category: 'estudio',
        completed: false,
        completedAt: null,
        createdAt: Date.now() - 3600000 * 12
      },
      {
        id: 't-3',
        title: 'Pago mensual de servicios y facturación',
        notes: 'Revisar recibos de internet y suscripciones de software',
        hasDueDate: true,
        dueDate: inThreeDaysStr,
        dueTime: '18:00',
        priority: 'medium',
        category: 'finanzas',
        completed: false,
        completedAt: null,
        createdAt: Date.now() - 3600000 * 6
      },
      {
        id: 't-4',
        title: 'Planificar menú saludable de la próxima semana',
        notes: 'Hacer lista de compras para el supermercado',
        hasDueDate: true,
        dueDate: inFiveDaysStr,
        dueTime: null,
        priority: 'low',
        category: 'salud',
        completed: false,
        completedAt: null,
        createdAt: Date.now() - 3600000 * 2
      },
      {
        id: 't-5',
        title: 'Organizar copias de seguridad en disco externo',
        notes: 'Clasificar fotos familiares y documentos de trabajo antiguos',
        hasDueDate: false,
        dueDate: null,
        dueTime: null,
        priority: 'medium',
        category: 'personal',
        completed: false,
        completedAt: null,
        createdAt: Date.now() - 3600000 * 48
      },
      {
        id: 't-6',
        title: 'Investigar framework moderno para la nueva app',
        notes: 'Revisar documentación y ejemplos de diseño UI/UX interactivo',
        hasDueDate: false,
        dueDate: null,
        dueTime: null,
        priority: 'high',
        category: 'trabajo',
        completed: false,
        completedAt: null,
        createdAt: Date.now() - 3600000 * 30
      },
      {
        id: 't-7',
        title: 'Reemplazar bombillo LED del estudio',
        notes: 'Luz blanca cálida 9W',
        hasDueDate: false,
        dueDate: null,
        dueTime: null,
        priority: 'low',
        category: 'personal',
        completed: false,
        completedAt: null,
        createdAt: Date.now() - 3600000 * 18
      },
      {
        id: 't-8',
        title: 'Agendar cita odontológica de rutina',
        notes: 'Llamar a la clínica para coordinar horario de mañana',
        hasDueDate: true,
        dueDate: yesterdayStr,
        dueTime: '09:00',
        priority: 'high',
        category: 'salud',
        completed: true,
        completedAt: Date.now() - 3600000 * 4,
        createdAt: Date.now() - 3600000 * 72
      }
    ];
  }

  // ==========================================
  // EVENT LISTENERS & VINCULACIÓN
  // ==========================================
  function bindEvents() {
    // Alternar Tema Claro / Oscuro
    if (DOM.btnThemeToggle) {
      DOM.btnThemeToggle.addEventListener('click', toggleTheme);
    }

    // Cambio de Vista
    DOM.btnViewRows.addEventListener('click', () => switchView('rows'));
    DOM.btnViewCalendar.addEventListener('click', () => switchView('calendar'));

    // Modal de Tarea
    DOM.btnOpenNewTask.addEventListener('click', () => openTaskModal());
    DOM.modalCloseBtn.addEventListener('click', closeTaskModal);
    DOM.modalCancelBtn.addEventListener('click', closeTaskModal);
    DOM.taskModal.addEventListener('click', (e) => {
      if (e.target === DOM.taskModal) closeTaskModal();
    });

    // Modal de Nube (Supabase) - Si los controles existen en el DOM
    if (DOM.btnSyncSettings) DOM.btnSyncSettings.addEventListener('click', openCloudModal);
    if (DOM.cloudModalCloseBtn) DOM.cloudModalCloseBtn.addEventListener('click', closeCloudModal);
    if (DOM.cloudModal) {
      DOM.cloudModal.addEventListener('click', (e) => {
        if (e.target === DOM.cloudModal) closeCloudModal();
      });
    }

    if (DOM.btnSaveCloudConfig) {
      DOM.btnSaveCloudConfig.addEventListener('click', async () => {
        const url = DOM.supabaseUrlInput ? DOM.supabaseUrlInput.value.trim() : '';
        const key = DOM.supabaseKeyInput ? DOM.supabaseKeyInput.value.trim() : '';
        if (!url || !key) {
          showToast('Por favor ingresa tanto la URL como la Anon Key de Supabase.', 'warning');
          return;
        }
        const success = await connectToSupabase(url, key, true);
        if (success) {
          closeCloudModal();
        }
      });
    }

    if (DOM.btnDisconnectCloud) {
      DOM.btnDisconnectCloud.addEventListener('click', () => {
        disconnectCloud();
        closeCloudModal();
      });
    }

    // Toggle de Fecha en el Modal
    DOM.taskHasDateToggle.addEventListener('change', (e) => {
      toggleDateInputs(e.target.checked);
    });

    // Submit del Formulario
    DOM.taskForm.addEventListener('submit', handleTaskFormSubmit);

    DOM.btnResetFilters.addEventListener('click', resetAllFilters);

    // Clics en tarjetas de métricas para filtrar rápidamente
    DOM.metricCards.all.addEventListener('click', () => setFilterPill('all'));
    DOM.metricCards.dueSoon.addEventListener('click', () => setFilterPill('with-date'));
    DOM.metricCards.noDate.addEventListener('click', () => setFilterPill('without-date'));
    DOM.metricCards.completed.addEventListener('click', () => setFilterPill('completed'));

    // Acordeón de tareas realizadas
    DOM.headerCompletedToggle.addEventListener('click', () => {
      DOM.groupCompleted.classList.toggle('collapsed');
    });

    // Controles de Navegación del Calendario
    DOM.calPrevMonth.addEventListener('click', () => {
      STATE.calendarDate.setMonth(STATE.calendarDate.getMonth() - 1);
      renderCalendarView();
    });

    DOM.calNextMonth.addEventListener('click', () => {
      STATE.calendarDate.setMonth(STATE.calendarDate.getMonth() + 1);
      renderCalendarView();
    });

    DOM.calTodayBtn.addEventListener('click', () => {
      const today = new Date();
      STATE.calendarDate = new Date(today);
      STATE.selectedCalendarDate = formatDateToISO(today);
      renderCalendarView();
    });

    // Acciones del día seleccionado en el Calendario
    DOM.btnAddOnSelectedDate.addEventListener('click', () => {
      openTaskModal({
        hasDueDate: true,
        dueDate: STATE.selectedCalendarDate
      });
    });

    DOM.btnQuickAddToDate.addEventListener('click', () => {
      openTaskModal({
        hasDueDate: true,
        dueDate: STATE.selectedCalendarDate
      });
    });

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (DOM.taskModal && !DOM.taskModal.classList.contains('hidden')) closeTaskModal();
        if (DOM.cloudModal && !DOM.cloudModal.classList.contains('hidden')) closeCloudModal();
      }
    });
  }

  // ==========================================
  // MODAL DE NUBE (SUPABASE)
  // ==========================================
  function openCloudModal() {
    if (!DOM.cloudModal) return;
    const savedConfig = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (savedConfig) {
      try {
        const { url, key } = JSON.parse(savedConfig);
        if (DOM.supabaseUrlInput) DOM.supabaseUrlInput.value = url || '';
        if (DOM.supabaseKeyInput) DOM.supabaseKeyInput.value = key || '';
      } catch (e) {}
    }
    DOM.cloudModal.classList.remove('hidden');
  }

  function closeCloudModal() {
    if (DOM.cloudModal) {
      DOM.cloudModal.classList.add('hidden');
    }
  }

  // ==========================================
  // CONTROL DE VISTAS (FILAS VS CALENDARIO)
  // ==========================================
  function switchView(viewName) {
    if (STATE.currentView === viewName) return;
    STATE.currentView = viewName;

    if (viewName === 'rows') {
      DOM.btnViewRows.classList.add('active');
      DOM.btnViewRows.setAttribute('aria-selected', 'true');
      DOM.btnViewCalendar.classList.remove('active');
      DOM.btnViewCalendar.setAttribute('aria-selected', 'false');

      DOM.viewRows.classList.add('active');
      DOM.viewCalendar.classList.remove('active');
      renderRowsView();
    } else {
      DOM.btnViewCalendar.classList.add('active');
      DOM.btnViewCalendar.setAttribute('aria-selected', 'true');
      DOM.btnViewRows.classList.remove('active');
      DOM.btnViewRows.setAttribute('aria-selected', 'false');

      DOM.viewCalendar.classList.add('active');
      DOM.viewRows.classList.remove('active');
      renderCalendarView();
    }
  }

  function setFilterPill(filterType) {
    STATE.activeFilter = filterType;
    renderAll();
  }

  function resetAllFilters() {
    STATE.searchQuery = '';
    STATE.priorityFilter = 'all';
    STATE.activeFilter = 'all';
    renderAll();
  }

  // ==========================================
  // RENDERIZADO GLOBAL & FILTRADO
  // ==========================================
  function renderAll() {
    renderMetrics();
    updateFilterIndicator();

    if (STATE.currentView === 'rows') {
      renderRowsView();
    } else {
      renderCalendarView();
    }
  }

  function renderMetrics() {
    const total = STATE.tasks.length;
    const completed = STATE.tasks.filter(t => t.completed).length;
    const noDate = STATE.tasks.filter(t => !t.hasDueDate && !t.completed).length;
    const dueSoon = STATE.tasks.filter(t => t.hasDueDate && !t.completed).length;

    DOM.countTotal.textContent = total;
    DOM.countCompleted.textContent = completed;
    DOM.countNoDate.textContent = noDate;
    DOM.countDueSoon.textContent = dueSoon;

    DOM.countNodateBadge.textContent = noDate;
    if (DOM.calCountNodate) DOM.calCountNodate.textContent = noDate;
    DOM.countCompletedBadge.textContent = completed;
  }

  function updateFilterIndicator() {
    const isFiltered = STATE.searchQuery !== '' || STATE.activeFilter !== 'all' || STATE.priorityFilter !== 'all';
    DOM.filterIndicator.classList.toggle('hidden', !isFiltered);

    if (isFiltered) {
      let desc = 'Filtros aplicados: ';
      const parts = [];
      if (STATE.activeFilter !== 'all') parts.push(`Vista [${getFilterName(STATE.activeFilter)}]`);
      if (STATE.priorityFilter !== 'all') parts.push(`Prioridad [${STATE.priorityFilter}]`);
      if (STATE.searchQuery) parts.push(`Búsqueda "${STATE.searchQuery}"`);
      DOM.filterIndicatorText.textContent = desc + parts.join(' • ');
    }
  }

  function getFilterName(filter) {
    switch (filter) {
      case 'pending': return 'Solo pendientes';
      case 'with-date': return 'Solo con fecha';
      case 'without-date': return 'Solo sin fecha';
      case 'completed': return 'Solo completados';
      default: return 'Todos';
    }
  }

  function applyFilters(tasksList) {
    return tasksList.filter(task => {
      if (STATE.activeFilter === 'pending' && task.completed) return false;
      if (STATE.activeFilter === 'completed' && !task.completed) return false;
      if (STATE.activeFilter === 'with-date' && !task.hasDueDate) return false;
      if (STATE.activeFilter === 'without-date' && task.hasDueDate) return false;

      if (STATE.priorityFilter !== 'all' && task.priority !== STATE.priorityFilter) return false;

      if (STATE.searchQuery) {
        const query = STATE.searchQuery;
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = task.notes ? task.notes.toLowerCase().includes(query) : false;
        const matchesCategory = task.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes && !matchesCategory) return false;
      }

      return true;
    });
  }

  // ==========================================================================
  // VISTA 1: EN FILAS (CRONOLÓGICO: FECHAS PRÓXIMAS ARRIBA)
  // ==========================================================================
  function renderRowsView() {
    const filteredTasks = applyFilters(STATE.tasks);

    const overdueTasks = [];
    const upcomingTasks = [];
    const withoutDateTasks = [];
    const completedTasks = [];

    filteredTasks.forEach(task => {
      if (task.completed) {
        completedTasks.push(task);
      } else if (!task.hasDueDate) {
        withoutDateTasks.push(task);
      } else {
        if (isOverdue(task.dueDate, task.dueTime)) {
          overdueTasks.push(task);
        } else {
          upcomingTasks.push(task);
        }
      }
    });

    // Ordenamiento estricto: fechas más próximas arriba
    upcomingTasks.sort((a, b) => getTaskSortTime(a) - getTaskSortTime(b));
    overdueTasks.sort((a, b) => getTaskSortTime(b) - getTaskSortTime(a));
    withoutDateTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    completedTasks.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

    // RENDER GRUPO VENCIDOS
    DOM.countOverdueBadge.textContent = overdueTasks.length;
    if (overdueTasks.length > 0) {
      DOM.groupOverdue.classList.remove('hidden');
      DOM.listOverdue.innerHTML = overdueTasks.map(t => createTaskItemHTML(t, 'overdue')).join('');
    } else {
      DOM.groupOverdue.classList.add('hidden');
      DOM.listOverdue.innerHTML = '';
    }

    // RENDER GRUPO PRÓXIMOS A CUMPLIR (CON FECHA)
    DOM.countUpcomingBadge.textContent = upcomingTasks.length;
    if (upcomingTasks.length > 0) {
      DOM.groupUpcoming.classList.remove('hidden');
      DOM.listUpcoming.innerHTML = upcomingTasks.map(t => createTaskItemHTML(t, 'upcoming')).join('');
    } else {
      if (overdueTasks.length === 0 && withoutDateTasks.length === 0 && completedTasks.length === 0) {
        DOM.groupUpcoming.classList.add('hidden');
      } else {
        DOM.groupUpcoming.classList.remove('hidden');
        DOM.listUpcoming.innerHTML = `<div class="day-empty-hint"><p>No hay pendientes programados para los próximos días.</p></div>`;
      }
    }

    // RENDER GRUPO SIN FECHA (BACKLOG FLEXIBLE)
    DOM.countNodateBadge.textContent = withoutDateTasks.length;
    if (withoutDateTasks.length > 0) {
      DOM.listWithoutDate.innerHTML = withoutDateTasks.map(t => createTaskItemHTML(t, 'nodate')).join('');
    } else {
      DOM.listWithoutDate.innerHTML = `<div class="day-empty-hint"><p>No hay pendientes sin fecha.</p></div>`;
    }

    // RENDER GRUPO COMPLETADOS
    DOM.countCompletedBadge.textContent = completedTasks.length;
    if (completedTasks.length > 0) {
      DOM.groupCompleted.classList.remove('hidden');
      DOM.listCompleted.innerHTML = completedTasks.map(t => createTaskItemHTML(t, 'completed')).join('');
    } else {
      DOM.groupCompleted.classList.add('hidden');
      DOM.listCompleted.innerHTML = '';
    }

    const totalShown = overdueTasks.length + upcomingTasks.length + withoutDateTasks.length + completedTasks.length;
    DOM.globalEmptyState.classList.toggle('hidden', totalShown > 0);

    bindTaskItemActions();
  }

  function createTaskItemHTML(task, context) {
    const isCompleted = task.completed;
    const priorityClass = `priority-${task.priority}`;
    const categoryTag = `<span class="tag-badge tag-${task.category}">${getCategoryLabel(task.category)}</span>`;

    let dateBadgeHTML = '';
    if (task.hasDueDate && task.dueDate) {
      const dateInfo = formatDueDateInfo(task.dueDate, task.dueTime, isCompleted);
      dateBadgeHTML = `
        <span class="due-pill ${dateInfo.className}" title="${dateInfo.fullText}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>${dateInfo.label}</span>
        </span>
      `;
    } else {
      dateBadgeHTML = `
        <button class="btn-assign-date-pill btn-quick-assign-date" data-id="${task.id}" title="Asignarle una fecha a este pendiente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-inline">
            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>Agendar fecha</span>
        </button>
      `;
    }

    return `
      <div class="task-item ${priorityClass} ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
        <div class="task-left">
          <button class="custom-checkbox-btn btn-toggle-complete" data-id="${task.id}" title="${isCompleted ? 'Marcar como pendiente' : 'Marcar como realizado'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <div class="task-details">
            <span class="task-title" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}</span>
            ${task.notes ? `<span class="task-notes" title="${escapeHTML(task.notes)}">${escapeHTML(task.notes)}</span>` : ''}
          </div>
        </div>

        <div class="task-meta">
          ${categoryTag}
          ${dateBadgeHTML}
          <div class="task-actions">
            <button class="btn-icon-sm btn-edit-task" data-id="${task.id}" title="Editar pendiente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button class="btn-icon-sm btn-delete btn-delete-task" data-id="${task.id}" title="Eliminar pendiente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // VISTA 2: CALENDARIO INTERACTIVO
  // ==========================================================================
  function renderCalendarView() {
    const date = STATE.calendarDate;
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
    DOM.calMonthYearLabel.textContent = monthFormatter.format(date);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDaysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const todayISO = formatDateToISO(new Date());

    let gridHTML = '';

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDateNum = prevMonthLastDate - i;
      const prevDate = new Date(year, month - 1, prevDateNum);
      const iso = formatDateToISO(prevDate);
      gridHTML += createCalendarDayCellHTML(prevDateNum, iso, true, todayISO);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const iso = formatDateToISO(currentDate);
      gridHTML += createCalendarDayCellHTML(day, iso, false, todayISO);
    }

    const totalCells = startDayOfWeek + totalDaysInMonth;
    const nextDaysNeeded = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= nextDaysNeeded; day++) {
      const nextDate = new Date(year, month + 1, day);
      const iso = formatDateToISO(nextDate);
      gridHTML += createCalendarDayCellHTML(day, iso, true, todayISO);
    }

    DOM.calendarDaysGrid.innerHTML = gridHTML;

    renderCalendarSelectedDayPanel();
    renderCalendarNoDateDrawer();

    DOM.calendarDaysGrid.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateISO = cell.dataset.date;
        STATE.selectedCalendarDate = dateISO;
        DOM.calendarDaysGrid.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('is-selected'));
        cell.classList.add('is-selected');
        renderCalendarSelectedDayPanel();
      });
    });

    bindTaskItemActions();
  }

  function createCalendarDayCellHTML(dayNumber, isoString, isOtherMonth, todayISO) {
    const isToday = isoString === todayISO;
    const isSelected = isoString === STATE.selectedCalendarDate;

    const tasksOnThisDay = STATE.tasks.filter(t => t.hasDueDate && t.dueDate === isoString);

    let chipsHTML = '';
    const maxVisibleChips = 3;
    const visibleTasks = tasksOnThisDay.slice(0, maxVisibleChips);

    visibleTasks.forEach(task => {
      chipsHTML += `
        <div class="cal-task-chip priority-${task.priority} ${task.completed ? 'completed' : ''}" title="${escapeHTML(task.title)}">
          <span>${task.dueTime ? `<small>${task.dueTime}</small> ` : ''}${escapeHTML(task.title)}</span>
        </div>
      `;
    });

    if (tasksOnThisDay.length > maxVisibleChips) {
      const remaining = tasksOnThisDay.length - maxVisibleChips;
      chipsHTML += `<div class="cal-more-chip">+${remaining} más</div>`;
    }

    return `
      <div class="cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-date="${isoString}">
        <div class="cal-day-header">
          <span class="cal-day-number">${dayNumber}</span>
          ${isToday ? '<span class="cal-today-badge">Hoy</span>' : ''}
        </div>
        <div class="cal-day-tasks">
          ${chipsHTML}
        </div>
      </div>
    `;
  }

  function renderCalendarSelectedDayPanel() {
    const selDateObj = parseDate(STATE.selectedCalendarDate);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    DOM.selectedDayTitle.textContent = selDateObj.toLocaleDateString('es-ES', options);

    const isToday = STATE.selectedCalendarDate === formatDateToISO(new Date());
    DOM.selectedDayBadge.textContent = isToday ? 'Día de Hoy' : 'Fecha Seleccionada';

    const dayTasks = STATE.tasks.filter(t => t.hasDueDate && t.dueDate === STATE.selectedCalendarDate);

    dayTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.dueTime || '23:59').localeCompare(b.dueTime || '23:59');
    });

    if (dayTasks.length > 0) {
      DOM.selectedDayTasksList.innerHTML = dayTasks.map(t => createTaskItemHTML(t, 'calendar-day')).join('');
      DOM.selectedDayEmpty.classList.add('hidden');
    } else {
      DOM.selectedDayTasksList.innerHTML = '';
      DOM.selectedDayEmpty.classList.remove('hidden');
    }

    bindTaskItemActions();
  }

  function renderCalendarNoDateDrawer() {
    const noDateTasks = STATE.tasks.filter(t => !t.hasDueDate && !t.completed);
    DOM.calCountNodate.textContent = noDateTasks.length;

    if (noDateTasks.length > 0) {
      DOM.calendarNodateList.innerHTML = noDateTasks.map(t => {
        return `
          <div class="task-item priority-${t.priority}" data-id="${t.id}">
            <div class="task-left">
              <button class="custom-checkbox-btn btn-toggle-complete" data-id="${t.id}" title="Marcar como realizado">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <div class="task-details">
                <span class="task-title" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</span>
              </div>
            </div>
            <div class="task-meta">
              <button class="btn-assign-date-pill btn-schedule-to-selected-date" data-id="${t.id}" title="Agendar para la fecha seleccionada en el calendario">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-inline">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span>Agendar aquí</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      DOM.calendarNodateList.innerHTML = `<div class="day-empty-hint"><p>Bandeja sin fecha vacía.</p></div>`;
    }

    bindTaskItemActions();
  }

  // ==========================================
  // MANIPULACIÓN DE TAREAS (CRUD & ACCIONES)
  // ==========================================
  function bindTaskItemActions() {
    document.querySelectorAll('.btn-toggle-complete').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        toggleTaskCompletion(btn.dataset.id, btn);
      };
    });

    document.querySelectorAll('.btn-edit-task').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const task = STATE.tasks.find(t => t.id === btn.dataset.id);
        if (task) openTaskModal(task);
      };
    });

    document.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        deleteTask(btn.dataset.id);
      };
    });

    document.querySelectorAll('.btn-quick-assign-date').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const task = STATE.tasks.find(t => t.id === btn.dataset.id);
        if (task) {
          openTaskModal({
            ...task,
            hasDueDate: true,
            dueDate: formatDateToISO(new Date())
          });
        }
      };
    });

    document.querySelectorAll('.btn-schedule-to-selected-date').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        scheduleTaskToDate(btn.dataset.id, STATE.selectedCalendarDate);
      };
    });
  }

  async function toggleTaskCompletion(taskId, buttonElement) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;
    saveLocalTasks();

    if (task.completed) {
      playSuccessChime();
      triggerConfetti(buttonElement);
      showToast('¡Pendiente marcado como completado! 🎉', 'success');
    } else {
      showToast('Pendiente reactivado a la lista.', 'info');
    }

    renderAll();
    await syncTaskToCloud(task, 'upsert');
  }

  async function deleteTask(taskId) {
    const taskIndex = STATE.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = STATE.tasks[taskIndex];
    STATE.tasks.splice(taskIndex, 1);
    saveLocalTasks();

    showToast(`"${escapeHTML(task.title)}" eliminado.`, 'info');
    renderAll();
    await syncTaskToCloud(task, 'delete');
  }

  async function scheduleTaskToDate(taskId, targetDateISO) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.hasDueDate = true;
    task.dueDate = targetDateISO;
    saveLocalTasks();

    showToast(`Pendiente programado para el ${formatReadableDate(targetDateISO)}`, 'success');
    renderAll();
    await syncTaskToCloud(task, 'upsert');
  }

  // ==========================================
  // MODAL DE CREACIÓN / EDICIÓN
  // ==========================================
  function openTaskModal(prefillData = null) {
    DOM.taskForm.reset();

    if (prefillData && prefillData.id) {
      STATE.editingTaskId = prefillData.id;
      DOM.modalTitle.textContent = 'Editar Pendiente';
      DOM.modalSubmitBtn.textContent = 'Guardar Cambios';

      DOM.taskIdInput.value = prefillData.id;
      DOM.taskTitleInput.value = prefillData.title;
      DOM.taskDescInput.value = prefillData.notes || '';
      DOM.taskPrioritySelect.value = prefillData.priority || 'medium';
      DOM.taskCategorySelect.value = prefillData.category || 'trabajo';

      const hasDate = Boolean(prefillData.hasDueDate && prefillData.dueDate);
      DOM.taskHasDateToggle.checked = hasDate;
      toggleDateInputs(hasDate);

      if (hasDate) {
        DOM.taskDateInput.value = prefillData.dueDate;
        DOM.taskTimeInput.value = prefillData.dueTime || '';
      } else {
        DOM.taskDateInput.value = formatDateToISO(new Date());
        DOM.taskTimeInput.value = '';
      }
    } else {
      STATE.editingTaskId = null;
      DOM.modalTitle.textContent = 'Nuevo Pendiente';
      DOM.modalSubmitBtn.textContent = 'Guardar Pendiente';
      DOM.taskIdInput.value = '';

      if (prefillData && prefillData.hasDueDate) {
        DOM.taskHasDateToggle.checked = true;
        toggleDateInputs(true);
        DOM.taskDateInput.value = prefillData.dueDate || formatDateToISO(new Date());
      } else {
        DOM.taskHasDateToggle.checked = false;
        toggleDateInputs(false);
        DOM.taskDateInput.value = formatDateToISO(new Date());
      }
      DOM.taskTimeInput.value = '';
    }

    DOM.taskModal.classList.remove('hidden');
    DOM.taskTitleInput.focus();
  }

  function closeTaskModal() {
    DOM.taskModal.classList.add('hidden');
    STATE.editingTaskId = null;
  }

  function toggleDateInputs(show) {
    DOM.dateInputsContainer.classList.toggle('hidden', !show);
    DOM.taskDateInput.required = show;
  }

  async function handleTaskFormSubmit(e) {
    e.preventDefault();

    const title = DOM.taskTitleInput.value.trim();
    if (!title) return;

    const notes = DOM.taskDescInput.value.trim();
    const hasDueDate = DOM.taskHasDateToggle.checked;
    const dueDate = hasDueDate ? DOM.taskDateInput.value : null;
    const dueTime = hasDueDate && DOM.taskTimeInput.value ? DOM.taskTimeInput.value : null;
    const priority = DOM.taskPrioritySelect.value;
    const category = DOM.taskCategorySelect.value;

    let targetTask = null;

    if (STATE.editingTaskId) {
      targetTask = STATE.tasks.find(t => t.id === STATE.editingTaskId);
      if (targetTask) {
        targetTask.title = title;
        targetTask.notes = notes;
        targetTask.hasDueDate = hasDueDate;
        targetTask.dueDate = dueDate;
        targetTask.dueTime = dueTime;
        targetTask.priority = priority;
        targetTask.category = category;
        saveLocalTasks();
        showToast('Pendiente actualizado correctamente.', 'success');
      }
    } else {
      targetTask = {
        id: 't-' + Date.now(),
        title: title,
        notes: notes,
        hasDueDate: hasDueDate,
        dueDate: dueDate,
        dueTime: dueTime,
        priority: priority,
        category: category,
        completed: false,
        completedAt: null,
        createdAt: Date.now()
      };
      STATE.tasks.push(targetTask);
      saveLocalTasks();
      showToast('¡Nuevo pendiente agregado exitosamente!', 'success');
    }

    closeTaskModal();
    renderAll();

    if (targetTask) {
      await syncTaskToCloud(targetTask, 'upsert');
    }
  }

  // ==========================================
  // HELPERS DE FECHAS & CRONOLOGÍA
  // ==========================================
  function formatDateToISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDate(isoString) {
    if (!isoString) return new Date();
    const [y, m, d] = isoString.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function getStartOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function isOverdue(dueDateStr, dueTimeStr) {
    if (!dueDateStr) return false;
    const now = new Date();
    const [y, m, d] = dueDateStr.split('-').map(Number);
    
    let hours = 23;
    let minutes = 59;
    if (dueTimeStr) {
      const [h, min] = dueTimeStr.split(':').map(Number);
      hours = h;
      minutes = min;
    }

    const taskDeadline = new Date(y, m - 1, d, hours, minutes, 59);
    return taskDeadline.getTime() < now.getTime();
  }

  function getTaskSortTime(task) {
    if (!task.hasDueDate || !task.dueDate) return Infinity;
    const [y, m, d] = task.dueDate.split('-').map(Number);
    let h = 23, min = 59;
    if (task.dueTime) {
      const [th, tmin] = task.dueTime.split(':').map(Number);
      h = th;
      min = tmin;
    }
    return new Date(y, m - 1, d, h, min).getTime();
  }

  function formatDueDateInfo(dueDateStr, dueTimeStr, isCompleted) {
    const today = getStartOfDay(new Date());
    const due = getStartOfDay(parseDate(dueDateStr));
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const timeFormatted = dueTimeStr ? ` a las ${dueTimeStr}` : '';

    if (isCompleted) {
      return {
        className: 'due-future',
        label: `${formatReadableDate(dueDateStr)}${timeFormatted}`,
        fullText: `Fecha límite: ${dueDateStr}`
      };
    }

    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      const text = absDays === 1 ? 'Venció ayer' : `Venció hace ${absDays} días`;
      return {
        className: 'due-overdue',
        label: `🚨 ${text}${timeFormatted}`,
        fullText: `Venció el ${dueDateStr}${timeFormatted}`
      };
    } else if (diffDays === 0) {
      return {
        className: 'due-today',
        label: `⚡ Hoy${timeFormatted}`,
        fullText: `Vence hoy${timeFormatted}`
      };
    } else if (diffDays === 1) {
      return {
        className: 'due-tomorrow',
        label: `Mañana${timeFormatted}`,
        fullText: `Vence mañana${timeFormatted}`
      };
    } else if (diffDays <= 6) {
      return {
        className: 'due-future',
        label: `En ${diffDays} días${timeFormatted}`,
        fullText: `Vence el ${formatReadableDate(dueDateStr)}${timeFormatted}`
      };
    } else {
      return {
        className: 'due-future',
        label: `${formatReadableDate(dueDateStr)}${timeFormatted}`,
        fullText: `Vence el ${formatReadableDate(dueDateStr)}${timeFormatted}`
      };
    }
  }

  function formatReadableDate(isoString) {
    const d = parseDate(isoString);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  function getCategoryLabel(category) {
    const map = {
      trabajo: '💼 Trabajo',
      personal: '🏠 Personal',
      estudio: '📚 Estudio',
      salud: '🩺 Salud',
      finanzas: '💰 Finanzas',
      otro: '✨ General'
    };
    return map[category] || '✨ General';
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // ==========================================
  // AUDIO & EFECTOS VISUALES (CONFETI)
  // ==========================================
  function playSuccessChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  function triggerConfetti(originEl) {
    const rect = originEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;

      document.body.appendChild(p);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 40 + Math.random() * 80;
      const targetX = Math.cos(angle) * velocity;
      const targetY = Math.sin(angle) * velocity - 25;

      p.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${targetX}px, ${targetY}px) scale(0)`, opacity: 0 }
      ], {
        duration: 650 + Math.random() * 300,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
      }).onfinish = () => p.remove();
    }
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.animate([
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-10px)' }
      ], { duration: 250, fill: 'forwards' }).onfinish = () => toast.remove();
    }, 3200);
  }

  window.openTaskModal = openTaskModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
