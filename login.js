import { CONFIG } from './config.js';
document.addEventListener('DOMContentLoaded', () => {
    const signInForm = document.querySelector('.sign-in-form');
    
    signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = signInForm.querySelector('input[name="email"]').value.trim();
        const password = signInForm.querySelector('input[name="password"]').value.trim();

        try {
            const response = await fetch('https://gestortareas.freesite.online/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    email: email,
                    password: password
                })
            });

            const data = await response.json();
            
            if (data.success) {
                sessionStorage.setItem('userId', data.user.id);
                window.location.href = 'gestor_tareas.html';  // Redirigir al gestor
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Credenciales incorrectas'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al conectar con el servidor'
            });
        }
    });
});
    // Evento para el formulario de registro
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = signUpForm.querySelector('input[name="username"]').value.trim();
        const email = signUpForm.querySelector('input[name="email"]').value.trim();
        const password = signUpForm.querySelector('input[name="password"]').value.trim();

        if (!username || !email || !password) {
            await Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, completa todos los campos.'
            });
            return;
        }

        if (!isValidEmail(email)) {
            await Swal.fire({
                icon: 'error',
                title: 'Email inválido',
                text: 'Por favor, ingresa un correo electrónico válido.'
            });
            return;
        }

        if (password.length < 6) {
            await Swal.fire({
                icon: 'error',
                title: 'Contraseña demasiado corta',
                text: 'La contraseña debe tener al menos 6 caracteres.'
            });
            return;
        }

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'register',
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Registro exitoso!',
                    text: 'Te has registrado correctamente. Ahora puedes iniciar sesión.',
                    allowOutsideClick: false
                });
                signUpForm.reset();
                switchToSignIn();
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Error al registrar el usuario.'
                });
                signUpForm.querySelector('input[name="password"]').value = '';
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al registrarte. Por favor, intenta de nuevo.'
            });
        }
    });

    // Funciones auxiliares
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function switchToSignUp() {
        container.classList.add("sign-up-mode");
        signInForm.reset();
    }

    function switchToSignIn() {
        container.classList.remove("sign-up-mode");
        signUpForm.reset();
    }

    // Event listeners para cambio de modo
    const leftPanelBtn = document.querySelector(".left-panel .btn.transparent");
    if (leftPanelBtn) {
        leftPanelBtn.addEventListener("click", (e) => {
            e.preventDefault();
            switchToSignUp();
        });
    }

    const rightPanelBtn = document.querySelector(".right-panel .btn.transparent");
    if (rightPanelBtn) {
        rightPanelBtn.addEventListener("click", (e) => {
            e.preventDefault();
            switchToSignIn();
        });
    }
});
