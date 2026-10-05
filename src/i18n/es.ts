// Todos los textos de la interfaz, en español rioplatense.
// Ningún componente debe tener textos escritos a mano: siempre se leen de acá.

import type { ColorToken } from '@/lib/colors';
import { compatTexts } from './compat';

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

// "a, b y c"
const joinWithAnd = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;

// Anticipación de una alerta de vencimiento: "el mismo día", "2 días antes", "1 semana antes".
const alertOffset = (days: number) => {
  if (days === 0) return 'el mismo día';
  if (days === 7) return '1 semana antes';
  return `${plural(days, 'día', 'días')} antes`;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const es = {
  common: {
    cancel: 'Cancelar',
    save: 'Guardar',
    create: 'Crear',
    done: 'Listo',
    close: 'Cerrar',
    delete: 'Eliminar',
    undo: 'Deshacer',
    back: 'Volver',
    move: 'Mover',
    edit: 'Editar',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    dragItem: (name: string) => `Reordenar "${name}"`,
    root: 'Inicio',
  },

  nav: {
    folders: 'Carpetas',
    today: 'Hoy',
    search: 'Buscar',
    settings: 'Ajustes',
    mainNavigation: 'Navegación principal',
    skipToContent: 'Saltar al contenido',
    collapseSidebar: 'Contraer barra lateral',
    expandSidebar: 'Expandir barra lateral',
  },

  dnd: {
    instructions:
      'Para reordenar, presioná espacio o Enter sobre el asa, movete con las flechas y volvé a presionar espacio o Enter para soltar. Escape cancela.',
    picked: (name: string) => `Tomaste "${name}".`,
    moved: (name: string, position: number, total: number) =>
      `"${name}" está en la posición ${position} de ${total}.`,
    dropped: (name: string, position: number, total: number) =>
      `Soltaste "${name}" en la posición ${position} de ${total}.`,
    cancelled: (name: string) => `Se canceló el movimiento de "${name}".`,
  },

  config: {
    title: 'Falta configurar la app',
    description:
      'No se encontraron las credenciales necesarias. Completá el archivo .env (ver .env.example y docs/SETUP.md) y volvé a iniciar la app.',
    missing: 'Variables faltantes o inválidas:',
  },

  auth: {
    title: 'Iniciar sesión',
    emailLabel: 'Email',
    emailPlaceholder: 'vos@email.com',
    sendCode: 'Enviar código',
    sending: 'Enviando…',
    codeSentTo: (email: string) => `Te enviamos un código a ${email}`,
    codeLabel: 'Código de verificación',
    verify: 'Verificar',
    verifying: 'Verificando…',
    changeEmail: 'Cambiar email',
    resendCode: 'Reenviar código',
    resendIn: (seconds: number) => `Reenviar en ${seconds} s`,
    codeResent: 'Te enviamos un código nuevo.',
    errors: {
      invalidEmail: 'Ingresá un email válido.',
      invalidCode: (length: number) => `El código tiene que tener ${length} números.`,
      wrongCode: 'El código no es válido o ya venció. Pedí uno nuevo.',
      rateLimited: 'Pediste demasiados códigos. Esperá unos minutos y probá de nuevo.',
      offline: 'Necesitás conexión a internet para iniciar sesión.',
      unavailable:
        'No pudimos comunicarnos con el servidor de inicio de sesión. Probá de nuevo en unos minutos.',
      emailFailed: 'No se pudo enviar el email con el código. Probá de nuevo en unos minutos.',
      captcha: 'No se pudo verificar que no sos un robot. Probá de nuevo.',
      generic: 'Algo salió mal. Probá de nuevo en unos minutos.',
    },
    captchaLabel: 'Verificación anti-bots',
  },

  sync: {
    synced: 'Sincronizado',
    syncing: 'Sincronizando…',
    offline: (pending: number) =>
      pending > 0 ? `Sin conexión · ${plural(pending, 'pendiente', 'pendientes')}` : 'Sin conexión',
    error: 'Error · reintentando',
    syncNow: 'Sincronizar ahora',
    pendingChanges: (pending: number) =>
      pending === 0
        ? 'Sin cambios pendientes'
        : plural(pending, 'cambio pendiente', 'cambios pendientes'),
    lastSynced: (when: string) => `Última sincronización: ${when}`,
    neverSynced: 'Todavía no se sincronizó',
  },

  folders: {
    sectionSubfolders: 'Subcarpetas',
    sectionTasks: 'Tareas',
    addSubfolder: 'Subcarpeta',
    addSubfolderLabel: 'Crear subcarpeta',
    newFolder: 'Nueva carpeta',
    newSubfolder: 'Nueva subcarpeta',
    editFolder: 'Editar carpeta',
    nameLabel: 'Nombre',
    namePlaceholder: 'Ej.: Universidad',
    colorLabel: 'Color (opcional)',
    pendingCount: (count: number) => `${count} pend.`,
    /** Para lectores de pantalla (sin abreviar). */
    pendingCountLong: (count: number) => plural(count, 'tarea pendiente', 'tareas pendientes'),
    hasOverdue: 'Tiene tareas vencidas',
    rename: 'Renombrar',
    color: 'Color',
    move: 'Mover',
    delete: 'Eliminar',
    folderMenu: (name: string) => `Opciones de la carpeta "${name}"`,
    moveTitle: (name: string) => `Mover "${name}" a…`,
    searchFolder: 'Buscar carpeta…',
    noSearchResults: 'No hay carpetas con ese nombre.',
    current: 'actual',
    deleteTitle: (name: string) => `¿Eliminar "${name}"?`,
    deleteDescription: (subfolders: number, tasks: number) => {
      if (subfolders === 0 && tasks === 0) {
        return 'La carpeta está vacía. Vas a poder deshacerlo desde el aviso.';
      }
      const parts: string[] = [];
      if (subfolders > 0) parts.push(plural(subfolders, 'subcarpeta', 'subcarpetas'));
      if (tasks > 0) parts.push(plural(tasks, 'tarea', 'tareas'));
      return `Esto borrará ${parts.join(' y ')}. Vas a poder deshacerlo desde el aviso.`;
    },
    deleted: 'Carpeta eliminada',
    rootEmptyTitle: 'Todavía no tenés carpetas.',
    rootEmptyHint: 'Tocá + para crear la primera.',
    rootEmptyHintDesktop: 'Creá la primera con el botón "Nueva carpeta" o con la tecla N.',
    /** Carpeta sin subcarpetas ni tareas (design/screens/folders.md). */
    emptyTitle: 'Todavía no hay nada acá.',
    /** Carpeta con subcarpetas pero sin tareas. */
    noTasksTitle: 'Esta carpeta no tiene tareas.',
    emptyHint: 'Tocá + para crear una tarea.',
    emptyHintDesktop: 'Creá una con el botón "Nueva tarea" o con la tecla N.',
    sidebarEmpty: 'Todavía no hay carpetas.',
    notFound: 'Esta carpeta no existe o fue eliminada.',
    goToRoot: 'Ir a Carpetas',
    createFolderFab: 'Crear carpeta',
    createTaskFab: 'Crear tarea',
    cannotMoveIntoItself: 'No se puede mover una carpeta dentro de sí misma.',
    breadcrumb: 'Ubicación de la carpeta',
    expand: (name: string) => `Mostrar subcarpetas de ${name}`,
    collapse: (name: string) => `Ocultar subcarpetas de ${name}`,
    moved: 'Carpeta movida',
  },

  tasks: {
    newTask: 'Nueva tarea',
    editTask: 'Editar tarea',
    createAndAddAnother: 'Crear y agregar otra',
    closeForm: 'Cerrar',
    discardTitle: '¿Descartar los cambios?',
    discardDescription: 'Lo que escribiste en esta tarea no se va a guardar.',
    discard: 'Descartar',
    changeFolder: 'Cambiar',
    chooseFolder: 'Elegir carpeta',
    choose: 'Elegir',
    showDetails: (title: string) => `Mostrar detalles de "${title}"`,
    hideDetails: (title: string) => `Ocultar detalles de "${title}"`,
    noDetails: 'Sin más detalles.',
    titlePlaceholder: 'Nombre de la tarea',
    titleLabel: 'Título',
    descriptionPlaceholder: 'Agregar descripción',
    descriptionLabel: 'Descripción',
    created: 'Tarea creada',
    deleted: 'Tarea eliminada',
    completed: 'Tarea completada',
    markDone: (title: string) => `Marcar "${title}" como hecha`,
    markUndone: (title: string) => `Marcar "${title}" como pendiente`,
    completedSection: (count: number) => `Completadas (${count})`,
    allDone: 'No quedan tareas pendientes en esta carpeta.',
    deletesIn: (days: number) =>
      days <= 0 ? 'Se borra hoy' : `Se borra en ${plural(days, 'día', 'días')}`,
    priority: 'Prioridad',
    markPriority: 'Marcar como prioritaria',
    unmarkPriority: 'Quitar prioridad',
    isPriority: 'Prioritaria',
    dueDate: 'Fecha límite',
    color: 'Color',
    folder: 'Carpeta',
    moveTo: 'Mover a…',
    moveTitle: (title: string) => `Mover "${title}" a…`,
    moved: 'Tarea movida',
    deleteTask: 'Eliminar tarea',
    pinned: 'Anclada',
    attachments: 'Adjuntos',
    menu: (title: string) => `Opciones de "${title}"`,
    notFound: 'Esta tarea no existe o fue eliminada.',
    swipeComplete: 'Completar',
    swipeDelete: 'Eliminar',
    dateShortcuts: {
      today: 'Hoy',
      tomorrow: 'Mañana',
      nextWeek: 'Próxima semana',
      none: 'Sin fecha',
    },
    titleTooLong: (max: number) => `El título puede tener hasta ${max} caracteres.`,
    titleRequired: 'Escribí un título.',
    goToFolder: 'Ir a la carpeta',
  },

  tags: {
    title: 'Etiquetas',
    addTag: 'Agregar etiqueta',
    editTags: 'Cambiar etiquetas',
    searchOrCreate: 'Buscar o crear etiqueta…',
    search: 'Buscar etiqueta…',
    create: (name: string) => `Crear etiqueta «${name}»`,
    noTagsYet: 'Todavía no tenés etiquetas.',
    noTagsHint: 'Escribí un nombre para crear la primera.',
    noMatches: 'No hay etiquetas con ese nombre.',
    remove: (name: string) => `Quitar la etiqueta ${name}`,
    more: (count: number) => `+${count}`,
    count: (count: number) => plural(count, 'etiqueta', 'etiquetas'),
    /** Etiquetas de una tarea, para lectores de pantalla. */
    listLabel: (names: string) => `Etiquetas: ${names}`,
    newTag: 'Nueva etiqueta',
    editTag: 'Editar etiqueta',
    nameLabel: 'Nombre',
    namePlaceholder: 'Ej.: Urgente',
    colorLabel: 'Color (opcional)',
    nameRequired: 'Escribí un nombre.',
    nameTooLong: (max: number) => `El nombre puede tener hasta ${max} caracteres.`,
    nameTaken: 'Ya existe una etiqueta con ese nombre.',
    menu: (name: string) => `Opciones de la etiqueta ${name}`,
    edit: 'Renombrar o cambiar color',
    delete: 'Eliminar',
    deleteTitle: (name: string) => `¿Eliminar la etiqueta "${name}"?`,
    deleteDescription: (tasks: number) =>
      tasks === 0
        ? 'No está asignada a ninguna tarea.'
        : `Se va a quitar de ${plural(tasks, 'tarea', 'tareas')}. Las tareas no se borran.`,
    deleted: 'Etiqueta eliminada',
    taskCount: (count: number) => plural(count, 'tarea', 'tareas'),
    emptyTitle: 'Todavía no tenés etiquetas.',
    emptyHint: 'Creá una con el botón + o desde una tarea.',
    allTags: 'Todas las etiquetas',
    filter: 'Etiqueta',
    filterTitle: 'Filtrar por etiqueta',
  },

  links: {
    add: 'Link',
    addLabel: 'Agregar link',
    urlLabel: 'Dirección',
    urlPlaceholder: 'ejemplo.com/documento',
    labelLabel: 'Texto (opcional)',
    labelPlaceholder: 'Ej.: Presupuesto del cliente',
    invalidUrl: 'Escribí una dirección válida, por ejemplo ejemplo.com o https://…',
    save: 'Listo',
    edit: (text: string) => `Editar el link ${text}`,
    remove: (text: string) => `Quitar el link ${text}`,
    open: (text: string) => `Abrir ${text} (se abre fuera de la app)`,
    count: (count: number) => plural(count, 'adjunto', 'adjuntos'),
    openError: 'No se pudo abrir el link.',
  },

  files: {
    add: 'Archivo',
    addLabel: 'Adjuntar archivos',
    preparing: 'Preparando…',
    tooLarge: (name: string, size: string, max: string) =>
      `«${name}» pesa ${size}. El límite es ${max} por archivo.`,
    saveError: 'No se pudieron guardar los archivos en este dispositivo.',
    list: 'Archivos adjuntos',
    open: (name: string) => `Abrir ${name}`,
    remove: (name: string) => `Quitar el archivo ${name}`,
    retry: 'Reintentar',
    retryLabel: (name: string) => `Reintentar la subida de ${name}`,
    status: {
      draft: 'Se adjunta al guardar',
      pending: 'Pendiente de subir',
      pendingOffline: 'Se sube cuando haya conexión',
      uploading: 'Subiendo…',
      failed: 'No se pudo subir',
      remote: 'En la nube',
    },
    downloading: 'Descargando…',
    offline: 'Sin conexión: este archivo todavía no está guardado en este dispositivo.',
    notUploadedYet: 'Este archivo todavía se está subiendo desde otro dispositivo.',
    openError: 'No se pudo abrir el archivo.',
    download: 'Descargar',
    viewerAlt: (name: string) => `Vista previa de ${name}`,
    storage: {
      title: 'Archivos adjuntos',
      cloud: (used: string, limit: string) =>
        `${used} en la nube (el plan gratuito de Supabase permite ${limit}).`,
      device: (size: string) => `${size} guardados en este dispositivo.`,
      help: 'Los archivos se descargan la primera vez que los abrís y quedan guardados para verlos sin conexión.',
      free: 'Liberar espacio',
      freeTitle: '¿Liberar espacio en este dispositivo?',
      freeDescription: (size: string) =>
        `Se borran de este dispositivo ${size} de archivos que ya están en la nube. Se vuelven a descargar cuando los abras con conexión. Los que todavía no se subieron se conservan.`,
      freed: 'Espacio liberado',
      nothingToFree:
        'Por ahora no hay nada para liberar: en este dispositivo no hay archivos que ya estén en la nube.',
    },
  },

  filters: {
    label: 'Filtros',
    priorityOnly: 'Solo prioritarias',
    clear: 'Quitar filtros',
    sectionTitle: 'Tareas pendientes filtradas',
    scopeFolder: 'Incluye las subcarpetas.',
    scopeRoot: 'Incluye todas las carpetas.',
    noResults: 'No hay tareas pendientes que coincidan con los filtros.',
  },

  dates: {
    today: 'Hoy',
    tomorrow: 'Mañana',
    yesterday: 'Ayer',
    overdueDays: (days: number) => `Vencida hace ${plural(days, 'día', 'días')}`,
    /** Fecha y hora de un recordatorio: "Mañana 09:00". */
    atTime: (day: string, time: string) => `${day} ${time}`,
  },

  colors: {
    none: 'Sin color',
    names: {
      slate: 'Gris',
      red: 'Rojo',
      orange: 'Naranja',
      amber: 'Ámbar',
      green: 'Verde',
      teal: 'Verde azulado',
      blue: 'Azul',
      indigo: 'Índigo',
      purple: 'Violeta',
      pink: 'Rosa',
    } satisfies Record<ColorToken, string>,
  },

  today: {
    title: 'Hoy',
    groups: {
      overdue: 'Vencidas',
      today: 'Hoy',
      tomorrow: 'Mañana',
      thisWeek: 'Esta semana',
      later: 'Más adelante',
    },
    groupHeader: (label: string, count: number) => `${label} (${count})`,
    emptyTitle: 'No tenés tareas pendientes con fecha límite.',
    emptyHint: 'Agregale una fecha a una tarea para verla acá.',
    emptyPriorityTitle: 'No hay tareas prioritarias con fecha límite.',
  },

  search: {
    title: 'Buscar',
    placeholder: 'Buscar tareas…',
    clear: 'Limpiar búsqueda',
    hintTitle: 'Buscá por título, descripción o etiqueta.',
    hintBody: 'No importan las mayúsculas ni las tildes.',
    noResultsHint: 'Probá con otra palabra: se busca también en las tareas completadas.',
    noResults: (query: string) => `No encontramos tareas para «${query}».`,
    noResultsTag: 'No hay tareas con esa etiqueta.',
    resultsCount: (count: number) => plural(count, 'resultado', 'resultados'),
  },

  settings: {
    title: 'Ajustes',
    groupAppearance: 'Apariencia',
    groupData: 'Datos',
    groupAccount: 'Cuenta',
    groupTasks: 'Tareas',
    tags: 'Etiquetas',
    retention: 'Retención de completadas',
    retentionHelp: 'Las tareas completadas se borran solas después de:',
    retentionValue: (days: number) => plural(days, 'día', 'días'),
    retentionDecrease: 'Un día menos',
    retentionIncrease: 'Un día más',
    retentionUnavailable: 'Vas a poder cambiarla cuando termine la primera sincronización.',
    saveError: 'No se pudo guardar el cambio. Probá de nuevo.',
    theme: 'Tema',
    themeSystem: 'Sistema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    sync: 'Sincronización',
    signOut: 'Cerrar sesión',
    signOutTitle: '¿Cerrar sesión?',
    signOutDescription:
      'Se borran los datos guardados en este dispositivo. Lo que ya está sincronizado queda en la nube y vuelve a descargarse al iniciar sesión.',
    signOutPendingWarning: (pending: number) =>
      pending === 1
        ? 'Atención: hay 1 cambio sin sincronizar que se va a perder.'
        : `Atención: hay ${pending} cambios sin sincronizar que se van a perder.`,
    about: 'Acerca de',
    version: (version: string) => `Versión ${version}`,
    email: 'Email',
  },

  dueAlerts: {
    title: 'Alertas de vencimiento',
    enable: 'Activar alertas',
    enableHelp: 'Avisos antes de que venza una tarea con fecha límite.',
    notifyOn: 'Avisar:',
    offset: (days: number) => capitalize(alertOffset(days)),
    time: 'Hora del aviso',
    keepOne:
      'Tiene que quedar al menos un día marcado. Para no recibir avisos, desactivá las alertas.',
    androidOnly: 'Los avisos llegan en la app de Android.',
    unavailable: 'Vas a poder cambiarlas cuando termine la primera sincronización.',
    summary: (offsets: readonly number[], time: string) =>
      `${capitalize(joinWithAnd(offsets.map(alertOffset)))} · ${time}`,
    summaryOff: 'Desactivadas',
  },

  reminders: {
    title: 'Recordatorios',
    add: 'Agregar recordatorio',
    newReminder: 'Nuevo recordatorio',
    editReminder: 'Editar recordatorio',
    messageLabel: 'Mensaje (opcional)',
    messagePlaceholder: 'Si lo dejás vacío, se usa el título de la tarea',
    timesLabel: 'Fechas y horas',
    timesHelp: 'Te avisa en cada una. Podés agregar varias.',
    dateLabel: (index: number) => `Fecha ${index}`,
    timeLabel: (index: number) => `Hora ${index}`,
    addTime: 'Agregar otra fecha',
    removeTime: (index: number) => `Quitar la fecha ${index}`,
    done: 'Listo',
    errorIncomplete: 'Elegí la fecha y la hora.',
    errorPast: 'Esa fecha y hora ya pasaron.',
    errorNoTimes: 'Agregá al menos una fecha.',
    errorTooMany: (max: number) => `Puede tener hasta ${max} fechas.`,
    errorMessageTooLong: (max: number) => `El mensaje puede tener hasta ${max} caracteres.`,
    empty: 'Sin recordatorios.',
    /** Fechas de un recordatorio en la lista: "Mañana 09:00, sáb 10 oct 18:00 y 1 más". */
    timesSummary: (times: readonly string[], more: number) =>
      more > 0 ? `${times.join(', ')} y ${more} más` : joinWithAnd(times),
    edit: (label: string) => `Editar el recordatorio "${label}"`,
    remove: (label: string) => `Quitar el recordatorio "${label}"`,
    /** Ícono de la fila, para lectores de pantalla. */
    indicator: (count: number) => plural(count, 'recordatorio', 'recordatorios'),
    androidNote: 'Los avisos llegan en la app de Android: se programan cuando la abrís.',
    added: 'Recordatorio agregado',
    pin: 'Anclar tarea',
    pinHelp: 'Queda fija en las notificaciones del celular hasta que la desancles.',
    pinDoneHelp: 'Las tareas completadas no se pueden anclar.',
    menuPin: 'Anclar',
    menuUnpin: 'Desanclar',
    pinnedToast: 'Tarea anclada',
    unpinnedToast: 'Tarea desanclada',
    permissionDenied: 'Las notificaciones están desactivadas en este celular.',
    permissionAction: 'Revisar',
  },

  notifications: {
    channelDue: 'Alertas de vencimiento',
    channelDueDescription: 'Avisos antes de que venza una tarea con fecha límite.',
    channelReminders: 'Recordatorios',
    channelRemindersDescription: 'Los recordatorios que agregaste a tus tareas.',
    channelPinned: 'Tareas ancladas',
    channelPinnedDescription: 'Tareas fijas en la barra de notificaciones. No suenan.',
    dueTitle: (days: number, title: string) => {
      if (days <= 0) return `Vence hoy: ${title}`;
      if (days === 1) return `Vence mañana: ${title}`;
      return `Vence en ${days} días: ${title}`;
    },
    reminderBody: (taskTitle: string, path: string) =>
      path ? `${taskTitle} · ${path}` : taskTitle,
    pinDue: (date: string) => `Vence el ${date}`,
    testTitle: 'Notificación de prueba',
    testBody: 'Si ves esto, los avisos funcionan en este celular.',
    title: 'Notificaciones',
    rowSummary: 'Permisos, alarmas y batería',
    androidOnly: 'Esta sección está disponible en la app de Android.',
    permission: 'Permiso de notificaciones',
    permissionOk: 'Permitidas.',
    permissionOff: 'Desactivadas: no vas a recibir avisos ni ver las tareas ancladas.',
    permissionPrompt: 'Todavía no las permitiste.',
    allow: 'Permitir',
    exactAlarms: 'Alarmas exactas',
    exactOk: 'Permitidas: los avisos llegan a la hora justa.',
    exactOff: 'Sin permiso: los avisos pueden llegar varios minutos tarde.',
    battery: 'Optimización de batería',
    batteryOk: 'Sin restricciones: los avisos llegan aunque la app esté cerrada.',
    batteryWarning: 'Android puede demorar los avisos para ahorrar batería.',
    batteryGuide:
      'Algunos celulares cierran las apps en segundo plano para ahorrar batería y los avisos dejan de llegar. En la lista de optimización de batería, buscá ToDo List y elegí "No optimizar" o "Sin restricciones". En Samsung revisá también Batería → Límites de uso en segundo plano.',
    openSettings: 'Abrir ajustes',
    statusOk: 'Correcto',
    statusWarning: 'Conviene revisarlo',
    statusError: 'Falta configurar',
    sendTest: 'Enviar notificación de prueba',
    testSent: 'Notificación de prueba enviada.',
    testFailed: 'No se pudo enviar. Revisá el permiso de notificaciones.',
    forceStopNote:
      'Si forzás la detención de la app desde los ajustes de Android, los avisos se reprograman la próxima vez que la abras.',
    pinnedTitle: 'Tareas ancladas',
    noPinned: 'No hay tareas ancladas.',
    unpin: (title: string) => `Desanclar "${title}"`,
  },

  shortcuts: {
    title: 'Atajos de teclado',
    newItem: 'Nueva tarea o carpeta',
    search: 'Buscar',
    close: 'Cerrar ventana o panel',
    confirm: 'Crear o confirmar',
    undo: 'Deshacer (mientras se ve el aviso)',
    or: 'o',
  },

  toasts: {
    /** Región de avisos para lectores de pantalla (Sonner agrega "alt+T"). */
    region: 'Avisos',
  },

  backup: {
    export: 'Exportar respaldo (JSON)',
    exporting: 'Exportando…',
    help: 'Guarda en un archivo tus carpetas, tareas, etiquetas, links y ajustes. Los archivos adjuntos no se incluyen.',
    lastBackup: (when: string) => `Último respaldo en este dispositivo: ${when}.`,
    neverBackedUp: 'Todavía no exportaste un respaldo en este dispositivo.',
    exported: (fileName: string) => `Respaldo exportado: ${fileName}`,
    error: 'No se pudo exportar el respaldo.',
    shareTitle: (appName: string) => `Respaldo de ${appName}`,
  },

  /** Navegador o WebView sin soporte (se muestra antes de cargar la app). */
  compat: compatTexts,

  pwa: {
    updateAvailable: 'Hay una nueva versión disponible.',
    update: 'Actualizar',
    offlineReady: 'La app ya funciona sin conexión.',
  },

  errors: {
    generic: 'Algo salió mal. Probá de nuevo.',
    notFoundTitle: 'Página no encontrada',
    goHome: 'Ir al inicio',
    reload: 'Recargar',
    appTitle: 'Algo salió mal',
    appDescription:
      'La app encontró un error inesperado. Recargá la página; tus datos quedan guardados en este dispositivo.',
    newVersion: 'Hay una versión nueva de la app. Recargá la página para seguir.',
    localDbTitle: 'No se pudo abrir la base de datos de este dispositivo',
    localDbDescription:
      'Puede pasar en una ventana privada, si el navegador bloquea el almacenamiento de los sitios o si el dispositivo se quedó sin espacio. Probá recargar; si sigue pasando, abrí la app en una ventana normal y liberá espacio.',
    signOutFailed: 'No se pudo cerrar la sesión. Probá de nuevo.',
  },
} as const;

export type Strings = typeof es;
