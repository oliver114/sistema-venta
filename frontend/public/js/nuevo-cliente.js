// Función para obtener el token de autenticación
function getAuthToken() {
    return localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('authToken');
}

// Función para verificar si el usuario está autenticado
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        alert('⚠️ No estás autenticado. Serás redirigido al login.');
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) {
        return;
    }
});

document.getElementById("clienteForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    
    // Verificar autenticación antes de enviar
    if (!checkAuth()) {
        return;
    }
    
    const submitBtn = document.getElementById("submitBtn");
    const spinner = submitBtn.querySelector(".loading-spinner");
    const btnText = document.getElementById("btnText");
    const successMessage = document.getElementById("successMessage");
    
    // Obtener datos del formulario
    const formData = new FormData(this);
    const clienteData = {
        nombre: formData.get("nombre").trim(),
        email: formData.get("email").trim(),
        telefono: formData.get("telefono").trim(),
        direccion: formData.get("direccion").trim(),
        dni: formData.get("dni").trim()
    };
    
    console.log('Datos del cliente a enviar:', clienteData); // Para debug
    
    // Validaciones básicas
    if (!clienteData.nombre || !clienteData.email || !clienteData.dni) {
        alert("❌ Por favor complete los campos obligatorios (Nombre, Email y DNI)");
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clienteData.email)) {
        alert("❌ Por favor ingrese un email válido");
        return;
    }

    // Validar DNI (solo números, entre 7 y 8 dígitos)
    const dniRegex = /^\d{7,8}$/;
    if (!dniRegex.test(clienteData.dni)) {
        alert("❌ Por favor ingrese un DNI válido (7-8 dígitos)");
        return;
    }
    
    try {
        // Mostrar spinner y desactivar botón
        spinner.classList.remove("d-none");
        btnText.textContent = "Guardando...";
        submitBtn.disabled = true;
        successMessage.style.display = "none";
        
        console.log('Enviando datos al servidor...'); // Para debug
        
        // Obtener el token de autenticación
        const token = getAuthToken();
        
        // Enviar datos al servidor CON EL TOKEN
        const response = await fetch("/api/clientes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // 🔑 AQUÍ AGREGAMOS EL TOKEN
            },
            body: JSON.stringify(clienteData),
        });
        
        const result = await response.json();
        console.log('Respuesta del servidor:', result); // Para debug
        
        if (response.ok) {
            // Éxito - mostrar mensaje y limpiar formulario
            successMessage.style.display = "block";
            successMessage.scrollIntoView({ behavior: "smooth" });
            
            // Limpiar formulario
            document.getElementById("clienteForm").reset();
            
            // Opcional: redirigir después de un momento
            setTimeout(() => {
                if (confirm("Cliente guardado exitosamente. ¿Desea volver al inicio?")) {
                    window.location.href = "/";
                }
            }, 2000);
            
        } else {
            // Manejar errores específicos
            if (response.status === 401) {
                // Token inválido o expirado
                alert('⚠️ Su sesión ha expirado. Será redirigido al login.');
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                sessionStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            } else if (response.status === 400) {
                // Error de validación
                alert(`❌ Error de validación: ${result.error || 'Datos inválidos'}`);
            } else if (response.status === 409) {
                // Conflicto (cliente ya existe)
                alert(`❌ ${result.error || 'El cliente ya existe'}`);
            } else {
                // Otros errores del servidor
                throw new Error(result.error || "Error al guardar el cliente");
            }
        }
        
    } catch (error) {
        console.error("Error completo:", error);
        
        // Manejar errores de red
        if (error.message.includes('Failed to fetch')) {
            alert('❌ Error de conexión. Verifique su conexión a internet e intente nuevamente.');
        } else {
            alert(`❌ Error al guardar el cliente: ${error.message}`);
        }
    } finally {
        // Restaurar botón
        spinner.classList.remove("d-none");
        spinner.classList.add("d-none");
        btnText.textContent = "Guardar Cliente";
        submitBtn.disabled = false;
    }
});

function limpiarFormulario() {
    document.getElementById("clienteForm").reset();
    const successMessage = document.getElementById("successMessage");
    successMessage.style.display = "none";
}

// Función para validar DNI en tiempo real
document.getElementById("dni").addEventListener("input", function(e) {
    const dni = e.target.value;
    const dniRegex = /^\d{0,8}$/; // Permitir hasta 8 dígitos
    
    if (!dniRegex.test(dni)) {
        e.target.value = dni.slice(0, -1); // Eliminar el último carácter
    }
});

// Función para validar teléfono en tiempo real
document.getElementById("telefono").addEventListener("input", function(e) {
    const telefono = e.target.value;
    const telefonoRegex = /^[\d\s\+\-\(\)]*$/; // Solo números, espacios, +, -, (, )
    
    if (!telefonoRegex.test(telefono)) {
        e.target.value = telefono.slice(0, -1);
    }
});