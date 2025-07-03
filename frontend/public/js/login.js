document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Si ya está logueado, redirige
    const token = localStorage.getItem('token');
    if (token && (window.location.pathname === '/login' || window.location.pathname === '/login.html')) {
        window.location.href = '/caja.html';  // o '/caja'

    }
});

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorBox = document.getElementById('error-message');
    const loginBtn = document.querySelector('.login-btn');

    if (!email || !password) {
        showError('Por favor completa todos los campos.');
        return;
    }

    setLoading(true);

    try {
        console.log('🔄 Enviando login...');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('📥 Respuesta del servidor:', data);

        if (response.ok && data.token) {
            console.log('✅ Login exitoso');
            
            // Guardar datos en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Mostrar mensaje de éxito
            showSuccess('Login exitoso. Redirigiendo...');
            
            // Redirigir después de un breve delay
            // Redirigir según el rol
            const rol = data.user.rol;

            setTimeout(() => {
                if (rol === 'administrador') {
                    window.location.href = '/admin.html';
                } else if (rol === 'cajero') {
                    window.location.href = '/caja.html';
                } else {
                    showError('Rol no reconocido.');
                }
            }, 1000);


            
        } else {
            console.error('❌ Error en login:', data);
            showError(data.error || data.message || 'Credenciales inválidas');
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
        showError('Error de conexión con el servidor.');
    } finally {
        setLoading(false);
    }
}

function showError(message) {
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
        errorBox.className = 'alert alert-danger';
    }
}

function showSuccess(message) {
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
        errorBox.className = 'alert alert-success';
    }
}

function setLoading(loading) {
    const btn = document.querySelector('.login-btn');
    if (btn) {
        btn.disabled = loading;
        btn.innerHTML = loading ? 
            '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...' : 
            'Iniciar Sesión';
    }
}