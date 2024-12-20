document.addEventListener('DOMContentLoaded', () => {
    // Verificar si ya hay sesión activa
    if (sessionStorage.getItem('userId')) {
        window.location.href = 'gestor_tareas.html';
        return;
    }

    const signInForm = document.querySelector('.sign-in-form');
    const signUpForm = document.querySelector('.sign-up-form');
    const container = document.querySelector(".container");

    // Evento para el formulario de inicio de sesión
  signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = signInForm.querySelector('input[name="email"]').value.trim();
    const password = signInForm.querySelector('input[name="password"]').value.trim();

    if (!email || !password) {
        await Swal.fire({
            icon: 'warning',
            title: 'Campos incompletos',
            text: 'Por favor, completa todos los campos.'
        });
        return;
    }

    try {
        // Mostrar mensaje de carga
        const loadingAlert = Swal.fire({
            title: 'Iniciando sesión',
            text: 'Por favor espere...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

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
            
            // Cerrar el mensaje de carga
            await loadingAlert;
            
            await Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: 'Inicio de sesión exitoso',
                timer: 1500,
                showConfirmButton: false
            });

            // Redirigir después del mensaje de éxito
            setTimeout(() => {
                window.location.href = 'https://windedwriter.github.io/gestor-de-tareas/gestor_tareas.html';
            }, 1500);
        } else {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Credenciales incorrectas'
            });
            signInForm.querySelector('input[name="password"]').value = '';
        }
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al iniciar sesión.'
        });
    }
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
