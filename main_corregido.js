import { CONFIG } from './config.js';
import { AUTH } from './auth.js';

let calendar;
let currentUser = null;

// Código principal de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!AUTH.isAuthenticated()) {
            AUTH.redirectToindex();
            return;
        }

        // Cargar datos del usuario
        const response = await fetch('auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getUserData',
                userId: sessionStorage.getItem('userId')
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error('No se pudo cargar los datos del usuario');
        }

        currentUser = data.user;
        mostrarMensajeBienvenida();

        // Inicializar funcionalidades
        await initializeApp();

    } catch (error) {
        console.error('Error:', error);
        AUTH.handleAuthError(error);
    }
});

// Función para inicializar la aplicación
async function initializeApp() {
    try {
        inicializarCalendario();
        await actualizarListaTareas();
        setupEventListeners();
        aplicarModoGuardado();
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
        mostrarErrorInicializacion();
    }
}

// Configuración de event listeners
function setupEventListeners() {
    // Botones principales
    document.getElementById('userProfileBtn')?.addEventListener('click', mostrarPerfilUsuario);
    document.getElementById('agregarBtn')?.addEventListener('click', agregarTarea);
    document.getElementById('limpiarTareasBtn')?.addEventListener('click', limpiarTareas);
    document.getElementById('ordenarFechaBtn')?.addEventListener('click', ordenarTareasPorFecha);
    document.getElementById('ordenarPrioridadBtn')?.addEventListener('click', ordenarTareasPorPrioridad);
    document.getElementById('verHistorialBtn')?.addEventListener('click', mostrarHistorial);
    document.getElementById('toggleFilters')?.addEventListener('click', toggleFiltros);
    document.getElementById('toggleModoOscuro')?.addEventListener('click', toggleModoOscuro);
    document.getElementById('estadisticasBtn')?.addEventListener('click', mostrarEstadisticas);

    // Filtros y búsqueda
    document.getElementById('filtrarPrioridadSelect')?.addEventListener('change', function() {
        filtrarTareasPorPrioridad(this.value);
    });
    document.getElementById('filtrarCategoriaInput')?.addEventListener('input', filtrarTareasPorCategoria);
    document.getElementById('searchInput')?.addEventListener('input', buscarTareas);

    // Botón de cerrar sesión
    document.getElementById('cerrarSesionBtn')?.addEventListener('click', confirmarCerrarSesion);
}

// Función para mostrar error de inicialización
function mostrarErrorInicializacion() {
    Swal.fire({
        title: 'Error',
        text: 'No se pudo inicializar la aplicación. Por favor, intenta de nuevo más tarde.',
        icon: 'error'
    }).then(() => {
        AUTH.logout();
    });
}

// Función para confirmar cierre de sesión
function confirmarCerrarSesion() {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¿Deseas cerrar sesión?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            AUTH.logout();
        }
    });
}
function mostrarMensajeBienvenida() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (currentUser && welcomeMessage) {
        welcomeMessage.textContent = `¡Bienvenido, ${currentUser.username}!`;
    }
}
// Funciones del Calendario
function inicializarCalendario() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: Tareas(),
        eventClick: mostrarDetallesTarea,
        locale: 'es',
        eventDidMount: function(info) {
            const fechaTarea = new Date(info.event.start);
            const fechaActual = new Date();
            fechaActual.setHours(0, 0, 0, 0);
            fechaTarea.setHours(0, 0, 0, 0);
            
            if (fechaTarea < fechaActual && !info.event.extendedProps.completed) {
                info.el.style.backgroundColor = '#f0f0f0';
                info.el.style.borderColor = '#d0d0d0';
                info.el.style.color = '#666666';
            }
        }
    });
    calendar.render();
}

async function actualizarCalendario() {
    if (!calendar) return;
    calendar.removeAllEvents();
    const tareas = await cargarTareas();
    tareas.forEach(tarea => {
        const fechaTarea = new Date(tarea.start);
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        fechaTarea.setHours(0, 0, 0, 0);

        if (!tarea.extendedProps.completed) {
            tarea.backgroundColor = fechaTarea < fechaActual ? '#f0f0f0' : getColorForPrioridad(tarea.extendedProps.prioridad);
            tarea.borderColor = fechaTarea < fechaActual ? '#d0d0d0' : getColorForPrioridad(tarea.extendedProps.prioridad);
            tarea.textColor = fechaTarea < fechaActual ? '#666666' : '#ffffff';
            calendar.addEvent(tarea);
        }
    });
}

// Funciones de Gestión de Tareas
async function cargarTareas() {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getTasks',
                userId: currentUser.id
            })
        });

        const data = await response.json();
        if (data.success) {
            return data.tasks.map(task => ({
                id: task.id.toString(),
                title: task.title,
                start: task.start_date,
                allDay: true,
                backgroundColor: getColorForPrioridad(task.priority),
                borderColor: getColorForPrioridad(task.priority),
                extendedProps: {
                    prioridad: task.priority,
                    categoria: task.category,
                    completed: task.completed === '1'
                }
            }));
        }
        return [];
    } catch (error) {
        console.error('Error al cargar tareas:', error);
        return [];
    }
}

async function agregarTarea() {
    const tareaInput = document.getElementById('tareaInput');
    const prioridadInput = document.getElementById('prioridadInput');
    const fechaInput = document.getElementById('fechaInput');
    const categoriaInput = document.getElementById('categoriaInput');

    const tarea = tareaInput.value.trim();
    const prioridad = prioridadInput.value;
    const fecha = fechaInput.value;
    const categoria = categoriaInput.value.trim();

    if (!tarea || !fecha || !prioridad || !categoria) {
        await Swal.fire({
            title: 'Error',
            text: 'Todos los campos son requeridos',
            icon: 'error'
        });
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addTask',
                userId: currentUser.id,
                title: tarea,
                startDate: fecha,
                priority: prioridad,
                category: categoria
            })
        });

        const data = await response.json();
        if (data.success) {
            await actualizarCalendario();
            await actualizarListaTareas();
            limpiarFormulario();
            
            await Swal.fire({
                title: 'Éxito',
                text: 'Tarea agregada correctamente',
                icon: 'success'
            });
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            title: 'Error',
            text: 'No se pudo agregar la tarea: ' + error.message,
            icon: 'error'
        });
    }
}

function limpiarFormulario() {
    document.getElementById('tareaInput').value = '';
    document.getElementById('fechaInput').value = '';
    document.getElementById('prioridadInput').value = '';
    document.getElementById('categoriaInput').value = '';
}
function getColorForPrioridad(prioridad) {
    const colores = {
        'Alta': '#ff4d4d',
        'Media': '#ffa64d',
        'Baja': '#4da6ff'
    };
    return colores[prioridad] || '#4da6ff';
}

function actualizarListaTareas(tareasFiltradas) {
    const listaTareas = document.getElementById('listaTareas');
    if (!listaTareas) return;

    listaTareas.innerHTML = '';
    const tareas = tareasFiltradas || cargarTareas();
    
    tareas.filter(tarea => !tarea.extendedProps.completed).forEach(tarea => {
        const li = crearElementoTarea(tarea);
        listaTareas.appendChild(li);
    });
}

function crearElementoTarea(tarea) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    
    // Verificar si la tarea está vencida (fecha anterior a hoy y no completada)
    const fechaTarea = new Date(tarea.start);
    const fechaActual = new Date();
    // Establecer las horas a 0 para comparar solo fechas
    fechaActual.setHours(0, 0, 0, 0);
    fechaTarea.setHours(0, 0, 0, 0);
    
    // Marcar como vencida si la fecha es anterior a hoy y no está completada
    if (fechaTarea < fechaActual && !tarea.extendedProps.completed) {
        li.classList.add('task-expired');
    }
    
    li.innerHTML = `
        <div class="d-flex flex-column">
            <div class="d-flex align-items-center">
                <span class="badge bg-${getBadgeClass(tarea.extendedProps.prioridad)} me-2">${tarea.extendedProps.prioridad}</span>
                <span class="task-title">${tarea.title}</span>
            </div>
            <small class="text-muted">Fecha: ${new Date(tarea.start).toLocaleDateString()}</small>
            <small class="text-muted">Categoría: ${tarea.extendedProps.categoria}</small>
        </div>
        <div class="btn-group">
            <button class="btn btn-sm btn-success" onclick="marcarComoCompletada('${tarea.id}')">Completar</button>
            <button class="btn btn-sm btn-primary" onclick="editarTarea('${tarea.id}')">Editar</button>
        </div>
    `;
    
    return li;
}

function getBadgeClass(prioridad) {
    const clases = {
        'Alta': 'danger',
        'Media': 'warning',
        'Baja': 'primary'
    };
    return clases[prioridad] || 'secondary';
}

async function marcarComoCompletada(tareaId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'completeTask',
                taskId: tareaId,
                userId: currentUser.id
            })
        });

        const data = await response.json();

        if (data.success) {
            const evento = calendar.getEventById(tareaId);
            if (evento) {
                evento.remove();
            }
            actualizarListaTareas();
            
            await Swal.fire({
                title: 'Éxito',
                text: 'Tarea marcada como completada',
                icon: 'success'
            });
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            title: 'Error',
            text: 'No se pudo completar la tarea',
            icon: 'error'
        });
    }
}
function actualizarListaTareas(tareasFiltradas) {
    const listaTareas = document.getElementById('listaTareas');
    if (!listaTareas) return;

    listaTareas.innerHTML = '';
    const tareas = tareasFiltradas || cargarTareas();
    
    // Filtrar solo las tareas no completadas
    const tareasNoCompletadas = tareas.filter(tarea => !tarea.extendedProps.completed);
    
    // Ordenar las tareas: primero las no vencidas, luego las vencidas
    tareasNoCompletadas.sort((a, b) => {
        const fechaA = new Date(a.start);
        const fechaB = new Date(b.start);
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        
        const aVencida = fechaA < fechaActual;
        const bVencida = fechaB < fechaActual;
        
        if (aVencida === bVencida) {
            return fechaA - fechaB;
        }
        return aVencida ? 1 : -1;
    });

    tareasNoCompletadas.forEach(tarea => {
        const li = crearElementoTarea(tarea);
        listaTareas.appendChild(li);
    });
}

async function ordenarTareasPorFecha() {
    const tareas = await cargarTareas();
    tareas.sort((a, b) => new Date(a.start) - new Date(b.start));
    actualizarListaTareas(tareas);
    actualizarCalendario();
}
async function ordenarTareasPorPrioridad() {
    const prioridadOrden = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
    const tareas = await cargarTareas();
    
    tareas.sort((a, b) => {
        return prioridadOrden[a.extendedProps.prioridad] - prioridadOrden[b.extendedProps.prioridad];
    });
    
    actualizarListaTareas(tareas);
}
function filtrarTareasPorPrioridad(prioridad) {
    const tareas = cargarTareas();
    const tareasFiltradas = prioridad ? 
        tareas.filter(tarea => tarea.extendedProps.prioridad === prioridad) : 
        tareas;
    
    actualizarListaTareas(tareasFiltradas);
}

function filtrarTareasPorCategoria() {
    const categoria = document.getElementById('filtrarCategoriaInput').value.toLowerCase().trim();
    const tareas = cargarTareas();
    
    const tareasFiltradas = categoria ? 
        tareas.filter(tarea => tarea.extendedProps.categoria.toLowerCase().includes(categoria)) : 
        tareas;
    
    actualizarListaTareas(tareasFiltradas);
}

function buscarTareas() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const tareas = cargarTareas();
    
    const tareasFiltradas = searchTerm ? 
        tareas.filter(tarea => 
            tarea.title.toLowerCase().includes(searchTerm) || 
            tarea.extendedProps.categoria.toLowerCase().includes(searchTerm)
        ) : 
        tareas;
    
    actualizarListaTareas(tareasFiltradas);
}


async function mostrarHistorialConPaginacion(pagina = 1, filtro = 'todas') {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getTaskHistory',
                userId: currentUser.id,
                page: pagina,
                filter: filtro
            })
        });

        const data = await response.json();
        if (data.success) {
            const historialElement = document.getElementById('historialTareasCompletadas');
            historialElement.innerHTML = '';

            data.tasks.forEach(tarea => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span>${tarea.title}</span>
                        <div>
                            <span class="badge bg-${getBadgeClass(tarea.priority)} me-2">
                                ${tarea.priority}
                            </span>
                            <span class="badge bg-success">
                                Completada: ${new Date(tarea.completed_date).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <small class="text-muted">Categoría: ${tarea.category}</small>
                `;
                historialElement.appendChild(li);
            });

            // Agregar paginación
            if (data.totalPages > 1) {
                const paginacion = document.createElement('div');
                paginacion.className = 'mt-3 d-flex justify-content-center';
                paginacion.innerHTML = crearPaginacion(pagina, data.totalPages, filtro);
                historialElement.appendChild(paginacion);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo cargar el historial', 'error');
    }
}
function crearPaginacion(paginaActual, totalPaginas, filtro) {
    let html = '<nav><ul class="pagination">';
    
    // Botón anterior
    html += `
        <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="mostrarHistorialConPaginacion(${paginaActual - 1}, '${filtro}')">
                Anterior
            </a>
        </li>
    `;

    // Números de página
    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <a class="page-link" href="#" onclick="mostrarHistorialConPaginacion(${i}, '${filtro}')">
                    ${i}
                </a>
            </li>
        `;
    }

    // Botón siguiente
    html += `
        <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="mostrarHistorialConPaginacion(${paginaActual + 1}, '${filtro}')">
                Siguiente
            </a>
        </li>
    `;

    html += '</ul></nav>';
    return html;
}


async function mostrarEstadisticas() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getTaskStats',
                userId: currentUser.id
            })
        });

        const data = await response.json();
        if (data.success) {
            const stats = data.stats;
            
            await Swal.fire({
                title: 'Estadísticas de Tareas',
                html: `
                    <div class="text-start">
                        <h5>Resumen General</h5>
                        <p>Total de tareas: ${stats.total}</p>
                        <p>Completadas: ${stats.completadas} (${stats.porcentajeCompletadas}%)</p>
                        <p>Pendientes: ${stats.pendientes}</p>
                        <hr>
                        <h5>Por Prioridad</h5>
                        <p>Alta: ${stats.prioridades.alta} tareas</p>
                        <p>Media: ${stats.prioridades.media} tareas</p>
                        <p>Baja: ${stats.prioridades.baja} tareas</p>
                        <hr>
                        <h5>Rendimiento</h5>
                        <p>Tareas completadas a tiempo: ${stats.completadasATiempo}</p>
                        <p>Tareas vencidas: ${stats.vencidas}</p>
                        <p>Tasa de completado a tiempo: ${stats.tasaCompletadoATiempo}%</p>
                    </div>
                `,
                icon: 'info',
                width: 600
            });
        }
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar las estadísticas',
            icon: 'error'
        });
    }
}

function toggleFiltros() {
    const filtersDiv = document.getElementById('filters');
    filtersDiv.style.display = filtersDiv.style.display === 'none' ? 'block' : 'none';
}

function toggleModoOscuro() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

function aplicarModoGuardado() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
}

function mostrarDetallesTarea(info) {
    const tarea = info.event;
    Swal.fire({
        title: tarea.title,
        html: `
            <p>Fecha: ${new Date(tarea.start).toLocaleDateString()}</p>
            <p>Prioridad: ${tarea.extendedProps.prioridad}</p>
            <p>Categoría: ${tarea.extendedProps.categoria}</p>
            <p>Estado: ${tarea.extendedProps.completed ? 'Completada' : 'Pendiente'}</p>
        `,
        icon: 'info'
    });
}


async function limpiarTareas() {
    try {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción eliminará todas las tareas",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'clearTasks',
                    userId: currentUser.id
                })
            });

            const data = await response.json();
            if (data.success) {
                calendar.removeAllEvents();
                actualizarListaTareas();
                Swal.fire('Eliminado', 'Todas las tareas han sido eliminadas.', 'success');
            } else {
                throw new Error(data.message);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudieron eliminar las tareas', 'error');
    }
}
/**
 * Sistema centralizado de autenticación
 */
const AUTH = {
    /**
     * Verifica si el usuario está autenticado
     */
    isAuthenticated() {
        return sessionStorage.getItem('userId') !== null;
    },

    /**
     * Cierra la sesión del usuario
     */
    logout() {
        sessionStorage.clear();
        window.location.replace('/login_system/login.html');
    },

    /**
     * Realiza el proceso de login
     */
    async login(email, password) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    email,
                    password
                })
            });

            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('userId', data.user.id);
                window.location.replace('/login_system/gestor_tareas.html');
                return { success: true };
            } else {
                return {
                    success: false,
                    message: data.message || 'Credenciales incorrectas'
                };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return {
                success: false,
                message: 'Error al iniciar sesión'
            };
        }
    },

    /**
     * Verifica la autenticación y redirige según corresponda
     */
    checkAuth() {
        const isLoginPage = window.location.pathname.endsWith('login.html');
        const isGestorPage = window.location.pathname.endsWith('gestor_tareas.html');
        
        if (isLoginPage && this.isAuthenticated()) {
            window.location.replace('/login_system/gestor_tareas.html');
        } else if (isGestorPage && !this.isAuthenticated()) {
            window.location.replace('/login_system/login.html');
        }
    },

    /**
     * Maneja errores de autenticación
     */
    handleAuthError(error) {
        console.error('Error de autenticación:', error);
        this.logout();
    }
};

// Verificación única al cargar
document.addEventListener('DOMContentLoaded', () => {
    // Usamos setTimeout para asegurarnos de que la verificación ocurra después de cualquier otra inicialización
    setTimeout(() => AUTH.checkAuth(), 0);
});
async function guardarTareaEditada() {
    try {
        const tareaId = document.getElementById('editarTareaId').value;
        const title = document.getElementById('editarTareaInput').value;
        const startDate = document.getElementById('editarFechaInput').value;
        const priority = document.getElementById('editarPrioridadInput').value;
        const category = document.getElementById('editarCategoriaInput').value;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'updateTask',
                taskId: tareaId,
                userId: currentUser.id,
                title: title,
                startDate: startDate,
                priority: priority,
                category: category
            })
        });

        const data = await response.json();
        if (data.success) {
            await actualizarCalendario();
            await actualizarListaTareas();
            
            const editarTareaModal = bootstrap.Modal.getInstance(document.getElementById('editarTareaModal'));
            editarTareaModal.hide();

            Swal.fire('Éxito', 'Tarea actualizada correctamente', 'success');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo actualizar la tarea', 'error');
    }
}
async function mostrarPerfilUsuario() {
    if (!currentUser) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getUserStats',
                userId: currentUser.id
            })
        });

        const data = await response.json();
        if (data.success) {
            const stats = data.stats;
            
            await Swal.fire({
                title: 'Perfil de Usuario',
                html: `
                    <div class="text-start">
                        <p><strong>Usuario:</strong> ${currentUser.username}</p>
                        <p><strong>Email:</strong> ${currentUser.email}</p>
                        <p><strong>Cuenta creada:</strong> ${new Date(currentUser.created_at).toLocaleDateString()}</p>
                        <hr>
                        <p><strong>Tareas completadas:</strong> ${stats.completadas}</p>
                        <p><strong>Tareas pendientes:</strong> ${stats.pendientes}</p>
                        <p><strong>Tasa de completado:</strong> ${stats.tasaCompletado}%</p>
                    </div>
                `,
                icon: 'info'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar las estadísticas del usuario',
            icon: 'error'
        });
    }
}
