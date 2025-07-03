// Configuración de la API
const API_BASE_URL = 'http://localhost:3000/api/admin';

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    alertContainer.innerHTML = alertHTML;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// Función para mostrar/ocultar loading
function toggleLoading(show) {
    const loadingSpinner = document.querySelector('.loading');
    const submitBtn = document.querySelector('button[type="submit"]');
    
    if (show) {
        loadingSpinner.classList.add('show');
        submitBtn.disabled = true;
    } else {
        loadingSpinner.classList.remove('show');
        submitBtn.disabled = false;
    }
}

// Manejar el envío del formulario
document.getElementById('registroForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const datos = {
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        password: formData.get('password'),
        rol: formData.get('rol')
    };
    
    // Validaciones básicas
    if (!datos.nombre || !datos.email || !datos.password || !datos.rol) {
        mostrarAlerta('Por favor, complete todos los campos', 'danger');
        return;
    }
    
    if (datos.password.length < 6) {
        mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'danger');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(datos.email)) {
        mostrarAlerta('Por favor, ingrese un email válido', 'danger');
        return;
    }
    
    toggleLoading(true);
    
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // ✅ Enviar token
            },
            body: JSON.stringify(datos)
        });

        
        const resultado = await response.json();
        
        if (resultado.success) {
            mostrarAlerta(`Usuario registrado exitosamente. ID: ${resultado.userId}`, 'success');
            document.getElementById('registroForm').reset();
            
            // Actualizar la lista de usuarios si está visible
            const usuariosCard = document.getElementById('usuariosCard');
            if (usuariosCard.style.display !== 'none') {
                cargarUsuarios();
            }
        } else {
            mostrarAlerta(resultado.message || 'Error al registrar usuario', 'danger');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión. Verifica que el servidor esté ejecutándose.', 'danger');
    } finally {
        toggleLoading(false);
    }
});

// Función para cargar y mostrar usuarios
async function cargarUsuarios() {
    try {
       const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const resultado = await response.json();
        
        if (resultado.success) {
            const usuariosCard = document.getElementById('usuariosCard');
            const tableBody = document.getElementById('usuariosTableBody');
            
            if (resultado.usuarios.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            <i class="fas fa-users me-2"></i>
                            No hay usuarios registrados
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = resultado.usuarios.map(usuario => `
                <tr>
                    <td><strong>${usuario.id}</strong></td>
                    <td>
                        <i class="fas fa-user me-2 text-primary"></i>
                        ${usuario.nombre}
                    </td>
                    <td>
                        <i class="fas fa-envelope me-2 text-info"></i>
                        ${usuario.email}
                    </td>
                    <td>
                        <span class="badge bg-${getRolColor(usuario.rol)} rounded-pill">
                            <i class="fas fa-user-tag me-1"></i>
                            ${usuario.rol}
                        </span>
                    </td>
                    <td>
                        <i class="fas fa-calendar me-2 text-muted"></i>
                        ${formatearFecha(usuario.created_at)}
                    </td>
                    <td>
                        <input type="checkbox" class="form-check-input" 
                            ${usuario.activo ? 'checked' : ''} 
                            onchange="toggleUsuarioActivo(${usuario.id}, this.checked)">
                    </td>
                </tr>
            `).join('');

            }
            
            usuariosCard.style.display = 'block';
            usuariosCard.scrollIntoView({ behavior: 'smooth' });
            
        } else {
            mostrarAlerta('Error al cargar usuarios: ' + resultado.message, 'danger');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión al cargar usuarios', 'danger');
    }
}

// Función auxiliar para obtener color del rol
function getRolColor(rol) {
    const colores = {
        'administrador': 'danger',
        'cajero': 'primary'
    };
    return colores[rol] || 'secondary';
}

function logout() {
    localStorage.removeItem('token'); // elimina el token
    window.location.href = 'login.html'; // redirige al login
}



// Función auxiliar para formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    
    const date = new Date(fecha);
    const opciones = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('es-ES', opciones);
}

// Validación en tiempo real
document.getElementById('email').addEventListener('blur', function() {
    const email = this.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email && !emailRegex.test(email)) {
        this.classList.add('is-invalid');
    } else {
        this.classList.remove('is-invalid');
    }
});

document.getElementById('password').addEventListener('input', function() {
    const password = this.value;
    
    if (password.length > 0 && password.length < 6) {
        this.classList.add('is-invalid');
    } else {
        this.classList.remove('is-invalid');
    }
});

// Limpiar alertas al resetear el formulario
document.querySelector('button[type="reset"]').addEventListener('click', function() {
    document.getElementById('alertContainer').innerHTML = '';
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
});

// Mensaje de bienvenida
document.addEventListener('DOMContentLoaded', function() {
    mostrarAlerta('Sistema de administración cargado correctamente', 'success');
});

async function toggleUsuarioActivo(usuarioId, activo) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}/activo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // ✅ enviar token
            },
            body: JSON.stringify({ activo })
        });

        const result = await response.json();

        if (result.success) {
            mostrarAlerta(result.message, 'success');
        } else {
            mostrarAlerta(result.message || 'Error al actualizar estado del usuario', 'danger');
        }
    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error);
        mostrarAlerta('Error de conexión al cambiar estado', 'danger');
    }
}

async function mostrarResumenTurnos() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/resumen-turnos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const resultado = await response.json();

        if (resultado.success) {
            const tablaBody = document.getElementById('tablaResumenTurnosBody');
            tablaBody.innerHTML = resultado.turnos.map(turno => `
                <tr>
                    <td>${turno.turno_id}</td>
                    <td>${turno.usuario}</td>
                    <td>${turno.email}</td>
                    <td>${formatearFecha(turno.fecha_apertura)}</td>
                    <td>${turno.fecha_cierre ? formatearFecha(turno.fecha_cierre) : '---'}</td>
                    <td>S/. ${Number(turno.saldo_inicial).toFixed(2)}</td>
                    <td>${turno.saldo_final !== null ? `S/. ${Number(turno.saldo_final).toFixed(2)}` : '---'}</td>
                    <td><strong>S/. ${Number(turno.total_ventas).toFixed(2)}</strong></td>
                    <td>
                        <span class="badge bg-${turno.estado === 'abierto' ? 'success' : 'secondary'}">
                            ${turno.estado}
                        </span>
                    </td>
                </tr>
            `).join('');

            document.getElementById('resumenTurnosCard').style.display = 'block';
            document.getElementById('resumenTurnosCard').scrollIntoView({ behavior: 'smooth' });
        } else {
            mostrarAlerta('Error al cargar resumen de turnos', 'danger');
        }

    } catch (error) {
        console.error('Error al cargar resumen de turnos:', error);
        mostrarAlerta('Error de conexión al obtener resumen de turnos', 'danger');
    }
}

