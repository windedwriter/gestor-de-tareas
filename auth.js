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
            const response = await fetch('auth.php', {
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
                return { 
                    success: true,
                    message: 'Login exitoso'
                };
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