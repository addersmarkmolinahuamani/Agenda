# 📅 PlanSync - Agenda & Planificador de Pendientes

Una aplicación web moderna, elegante y fluida diseñada para organizar tus tareas y pendientes de forma visual y productiva.

---

## ✨ Características Principales

### 1. Dos Modos de Visualización
- **📋 Vista en Filas (Cronológica)**:
  - **Próximos a cumplir en la parte superior**: Las tareas con fecha límite están ordenadas de forma ascendente estricta; las fechas más inminentes (Hoy, Mañana, esta semana) aparecen primero arriba.
  - **Detección inteligente de vencimiento**: Tareas atrasadas se resaltan de manera destacada para no perder ningún plazo.
  - **Bandeja de pendientes sin fecha (Backlog flexible)**: Panel dedicado para tareas que puedes realizar en cualquier momento, con ingreso rápido en 1 segundo y botón para asignarles fecha cuando decidas programarlas.
  - **Historial de realizados**: Sección colapsable que agrupa tus logros completados.

- **🗓️ Vista de Calendario Interactivo**:
  - Cuadrícula mensual con navegación fluida entre meses y botón para volver a **"Hoy"**.
  - Indicadores y chips de tareas en cada celda del día con códigos de color según prioridad.
  - Panel lateral interactivo: al seleccionar un día, visualiza todos los compromisos agendados y añade nuevos pendientes con un clic en esa fecha exacta.
  - Bandeja para agendar tareas sin fecha directamente en el día seleccionado.

### 2. Gestión Completa de Pendientes
- **Pendientes con fecha y hora**: Selector intuitivo con opción de hora específica.
- **Pendientes sin fecha**: Interruptor activo para tareas atemporales o ideas a futuro.
- **Niveles de Prioridad**: 🔥 Alta, ⚡ Media y 🌿 Baja con indicadores visuales en cada tarjeta.
- **Categorías**: 💼 Trabajo, 🏠 Personal, 📚 Estudio, 🩺 Salud, 💰 Finanzas y ✨ General.
- **Marcar como realizado**: Checkbox animado con sonido armónico (sintetizado mediante Web Audio API) y animación de confeti.
- **Edición y Eliminación**: Modificación rápida de cualquier detalle o notas adicionales.
- **Filtros y Búsqueda en tiempo real**: Busca por texto y filtra por estado o prioridad.

---

## 🚀 Cómo Usar la Aplicación

No requiere instalaciones complejas ni dependencias externas. Puedes abrirla de dos formas:

### Opción 1: Directamente en tu navegador
Haz doble clic sobre el archivo `index.html` en la carpeta del proyecto o ábrelo arrastrándolo a Chrome, Edge o Firefox.

### Opción 2: Con servidor local (Python)
Si prefieres servirla vía HTTP:
```bash
python -m http.server 8080
```
Y abre en tu navegador: [http://localhost:8080](http://localhost:8080)

---

## 💾 Persistencia de Datos
Tus tareas se guardan automáticamente en el almacenamiento local del navegador (`localStorage`), de modo que nunca perderás tus pendientes al recargar o cerrar la página.
