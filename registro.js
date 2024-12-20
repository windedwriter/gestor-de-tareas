document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('.register-form');

    if (!registerForm) {
        console.error("No se pudo encontrar el formulario de registro");
        return;
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validatePassword(password) {
        // Al menos 6 caracteres
        return password.length >= 6;
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = registerForm.querySelector('input[name="username"]').value.trim();
        const email = registerForm.querySelector('input[name="email"]').value.trim();
        const password = registerForm.querySelector('input[name="password"]').value.trim();
        const confirmPassword = registerForm.querySelector('input[name="confirmPassword"]').value.trim();

        // Validaciones
        if (!username || !email || !password || !confirmPassword) {
            await Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, completa todos los campos.'
            });
            return;
        }

        if (username.length < 3) {
            await Swal.fire({
                icon: 'error',
                title: 'Usuario inválido',
                text: 'El nombre de usuario debe tener al menos 3 caracteres.'
            });
            return;
        }

        if (!validateEmail(email)) {
            await Swal.fire({
                icon: 'error',
                title: 'Email inválido',
                text: 'Por favor, ingresa un correo electrónico válido.'
            });
            return;
        }

        if (!validatePassword(password)) {
            await Swal.fire({
                icon: 'error',
                title: 'Contraseña inválida',
                text: 'La contraseña debe tener al menos 6 caracteres.'
            });
            return;
        }

        if (password !== confirmPassword) {
            await Swal.fire({
                icon: 'error',
                title: 'Las contraseñas no coinciden',
                text: 'Por favor, verifica que las contraseñas sean iguales.'
            });
            return;
        }

        try {
            const response = await fetch('auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'register',
                    username: username,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Registro exitoso!',
                    text: data.message || '¡Tu cuenta ha sido creada correctamente!'
                });
                // Redirigir al login
                window.location.href = 'login.html';
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Hubo un error al crear tu cuenta.'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al crear tu cuenta. Por favor, intenta de nuevo.'
            });
        }
    });

    // Limpiar formulario al cargar la página
    window.addEventListener('load', () => {
        registerForm.reset();
    });

    // Manejar la tecla Enter
    registerForm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            registerForm.querySelector('button[type="submit"]').click();
        }
    });

    // Botón para volver al login
    const backToLoginBtn = document.querySelector('.login-link a');
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }

    // Evitar el envío del formulario en los botones de redes sociales
    const socialButtons = document.querySelectorAll('.social-icon');
    socialButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                icon: 'info',
                title: 'Próximamente',
                text: 'El registro con redes sociales estará disponible pronto.'
            });
        });
    });
});