import { CONFIG } from './config.js';

export const AUTH = {
    isAuthenticated() {
        return sessionStorage.getItem('userId') !== null;
    },

    logout() {
        sessionStorage.clear();
        window.location.href = CONFIG.ROUTES.LOGIN;
    },

    async login(email, password) {
        try {
            const response = await fetch(CONFIG.API_URL, {
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
                return { success: true, message: 'Login exitoso' };
            }
            return {
                success: false,
                message: data.message || 'Credenciales incorrectas'
            };
        } catch (error) {
            console.error('Error en login:', error);
            return {
                success: false,
                message: 'Error al iniciar sesión'
            };
        }
    },

    checkAuth() {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.endsWith('index.html') || currentPath.endsWith('/gestor-de-tareas/');
        const isGestorPage = currentPath.includes('gestor_tareas.html');
        
        if (isLoginPage && this.isAuthenticated()) {
            window.location.href = CONFIG.ROUTES.GESTOR;
        } else if (isGestorPage && !this.isAuthenticated()) {
            window.location.href = CONFIG.ROUTES.LOGIN;
        }
    },

    handleAuthError(error) {
        console.error('Error de autenticación:', error);
        this.logout();
    },

    async getCurrentUser() {
        try {
            const userId = sessionStorage.getItem('userId');
            if (!userId) return null;

            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'getUserData',
                    userId
                })
            });

            const data = await response.json();
            return data.success ? data.user : null;
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            return null;
        }
    }
};

export default AUTH;
