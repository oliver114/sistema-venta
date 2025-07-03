// js/index.js - Sistema completo integrado con autenticación, caja y ventas

// Variables globales
let ventasData = [];
let estadoCaja = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    inicializarSistema();
    
    // Configurar eventos adicionales
    const input = document.getElementById('buscarDNIIndex');
    input?.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            filtrarVentasPorDNI();
        }
    });

    // Configurar formulario de edición
    const editForm = document.getElementById("editarVentaForm");
    if (editForm) {
        editForm.addEventListener("submit", guardarEdicionVenta);
    }
});

// ===== SISTEMA DE AUTENTICACIÓN =====

// ===== SISTEMA DE AUTENTICACIÓN CORREGIDO =====

// Verificar autenticación
function checkAuthentication() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    console.log('🔍 Verificando autenticación...');
    console.log('Token encontrado:', !!token);
    console.log('Usuario:', user);
    
    if (!token) {
        console.log('❌ No hay token, redirigiendo al login');
        alert('Sesión expirada. Redirigiendo al login...');
        window.location.href = '/login'; // Cambiado de '/login.html' a '/login'
        return;
    }
    
    console.log('✅ Token encontrado, usuario autenticado');
    
    // Mostrar información del usuario
    const userInfo = document.getElementById('userInfo');
    if (userInfo && user.nombre) {
        userInfo.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="me-3">
                    <i class="fas fa-user text-primary"></i> 
                    Bienvenido, <strong>${user.nombre}</strong>
                    <small class="text-muted">(${user.rol || 'usuario'})</small>
                </span>
                <button class="btn btn-outline-danger btn-sm" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>
        `;
    }
}

// Realizar petición autenticada
async function makeAuthenticatedRequest(url, method = 'GET', data = null) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No hay token para la petición');
        logout();
        return;
    }
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    console.log(`📡 Realizando petición ${method} a ${url}`);
    
    try {
        const response = await fetch(url, options);
        
        if (response.status === 401) {
            console.log('❌ Token expirado o inválido');
            alert('Sesión expirada. Redirigiendo al login...');
            logout();
            return;
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Error en la petición');
        }
        
        console.log('✅ Petición exitosa');
        return result;
        
    } catch (error) {
        console.error('❌ Error en petición:', error);
        throw error;
    }
}

// Cerrar sesión
function logout() {
    console.log('🚪 Cerrando sesión...');
    
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        // Limpiar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        console.log('✅ Sesión cerrada, redirigiendo...');
        
        // Redirigir al login
        window.location.href = '/login'; // Cambiado de '/login.html' a '/login'
    }
}

// ===== SISTEMA DE CAJA =====

// Inicializar sistema
async function inicializarSistema() {
    try {
        await verificarEstadoCaja();
        await cargarVentas();
        await cargarResumen();
        await cargarVentasDeHoy();
    } catch (error) {
        console.error('Error al inicializar sistema:', error);
        mostrarAlerta('Error al cargar el sistema', 'danger');
    }
}

// Verificar estado de la caja
async function verificarEstadoCaja() {
    try {
        const response = await makeAuthenticatedRequest('/api/caja/estado');
        
        if (response.cajaAbierta) {
            estadoCaja = response.turno;
            mostrarCajaAbierta();
        } else {
            estadoCaja = null;
            mostrarCajaCerrada();
        }
    } catch (error) {
        console.error('Error al verificar caja:', error);
        // Si no hay endpoint de caja, asumir que está abierta
        estadoCaja = { abierta: true };
        mostrarCajaAbierta();
    }
}

// Mostrar caja abierta
function mostrarCajaAbierta() {
    const cajaStatus = document.getElementById('cajaStatus');
    if (cajaStatus) {
        cajaStatus.innerHTML = `
            <div class="alert alert-success d-flex justify-content-between align-items-center">
                <span><i class="fas fa-cash-register"></i> Caja Abierta - Sistema listo para ventas</span>
                <div>
                    <button class="btn btn-info btn-sm me-2" onclick="verEstadoCaja()">
                        <i class="fas fa-eye"></i> Ver Estado
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="cerrarCaja()">
                        <i class="fas fa-lock"></i> Cerrar Caja
                    </button>
                </div>
            </div>
        `;
    }
    
    // Habilitar botones de venta
    habilitarVentas(true);
}

// Mostrar caja cerrada
function mostrarCajaCerrada() {
    const cajaStatus = document.getElementById('cajaStatus');
    if (cajaStatus) {
        cajaStatus.innerHTML = `
            <div class="alert alert-warning d-flex justify-content-between align-items-center">
                <span><i class="fas fa-lock"></i> Caja Cerrada - Abre la caja para realizar ventas</span>
                <button class="btn btn-success btn-sm" onclick="abrirCaja()">
                    <i class="fas fa-unlock"></i> Abrir Caja
                </button>
            </div>
        `;
    }
    
    // Deshabilitar botones de venta
    habilitarVentas(false);
}

// Habilitar/deshabilitar ventas
function habilitarVentas(habilitar) {
    const nuevaVentaBtn = document.querySelector('a[href="/nueva-venta"]');
    if (nuevaVentaBtn) {
        if (habilitar) {
            nuevaVentaBtn.classList.remove('disabled');
            nuevaVentaBtn.style.pointerEvents = 'auto';
        } else {
            nuevaVentaBtn.classList.add('disabled');
            nuevaVentaBtn.style.pointerEvents = 'none';
        }
    }
}

// Abrir caja
async function abrirCaja() {
    const saldoInicial = prompt('Ingresa el saldo inicial de la caja:', '0.00');
    
    if (saldoInicial === null) return;
    
    const saldo = parseFloat(saldoInicial);
    if (isNaN(saldo) || saldo < 0) {
        alert('Ingresa un saldo válido (mayor o igual a 0)');
        return;
    }
    
    try {
        await makeAuthenticatedRequest('/api/caja/abrir', 'POST', {
            saldo_inicial: saldo,
            observaciones: 'Apertura desde sistema principal'
        });
        
        mostrarAlerta('Caja abierta exitosamente', 'success');
        await verificarEstadoCaja();
        
    } catch (error) {
        console.error('Error al abrir caja:', error);
        mostrarAlerta('Error al abrir la caja', 'danger');
    }
}

// Cerrar caja
async function cerrarCaja() {
    if (!confirm('¿Estás seguro de cerrar la caja? Esto deshabilitará las ventas.')) {
        return;
    }
    
    const saldoFinal = prompt('Ingresa el saldo final de la caja:');
    
    if (saldoFinal === null) return;
    
    const saldo = parseFloat(saldoFinal);
    if (isNaN(saldo) || saldo < 0) {
        alert('Ingresa un saldo válido (mayor o igual a 0)');
        return;
    }
    
    try {
        await makeAuthenticatedRequest('/api/caja/cerrar', 'POST', {
            saldo_final: saldo,
            observaciones: 'Cierre desde sistema principal'
        });
        
        mostrarAlerta('Caja cerrada exitosamente', 'success');
        await verificarEstadoCaja();
        
    } catch (error) {
        console.error('Error al cerrar caja:', error);
        mostrarAlerta('Error al cerrar la caja', 'danger');
    }
}

// Ver estado de caja
function verEstadoCaja() {
    window.open('/caja.html', '_blank');
}

// ===== SISTEMA DE VENTAS =====

// Cargar ventas (versión mejorada)
async function cargarVentas(ventasLista = null) {
    const tbody = document.getElementById("ventasTableBody");
    
    if (!tbody) return;
    
    // Mostrar loading
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            </td>
        </tr>
    `;

    try {
        let ventas;
        
        if (ventasLista) {
            ventas = ventasLista;
        } else {
            ventas = await makeAuthenticatedRequest('/api/ventas');
        }

        
        tbody.innerHTML = "";

        if (!ventas || ventas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> No hay ventas registradas
                    </td>
                </tr>
            `;
            return;
        }

        ventas.forEach((venta) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>#${venta.id}</strong></td>
                <td>${venta.cliente_nombre}</td>
                <td>${venta.cliente_email || 'N/A'}</td>
                <td>${venta.servicios}</td>
                <td><strong>S/ ${parseFloat(venta.total).toFixed(2)}</strong></td>
                <td>${formatearFecha(venta.fecha_venta)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-info btn-sm" onclick="verDetalle(${venta.id})" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="editarVenta(${venta.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarVenta(${venta.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Actualizar variable global
        ventasData = ventas;


    } catch (error) {
        console.error('Error al cargar ventas:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle"></i> Error al cargar las ventas
                    <br>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="cargarVentas()">
                        <i class="fas fa-refresh"></i> Reintentar
                    </button>
                </td>
            </tr>
        `;
    }
}

// Filtrar ventas por DNI
async function filtrarVentasPorDNI() {
    const dni = document.getElementById('buscarDNIIndex').value.trim();

    if (!dni) {
        // Si no hay DNI, cargar todas las ventas
        cargarVentas();
        return;
    }

    if (!/^\d{7,8}$/.test(dni)) {
        alert('Ingrese un DNI válido de 7 u 8 dígitos');
        return;
    }

    try {
        const clienteResp = await makeAuthenticatedRequest(`/api/clientes/buscar/${dni}`);

        if (!clienteResp.cliente) {
            alert('Cliente no encontrado');
            return;
        }

        const clienteId = clienteResp.cliente.id;
        const ventas = await makeAuthenticatedRequest('/api/ventas');
        const filtradas = ventas.filter(v => v.cliente_id === clienteId);

        cargarVentas(filtradas);
        
    } catch (error) {
        console.error('Error al filtrar ventas:', error);
        alert('Error al filtrar ventas');
    }
}

// Ver detalle de venta
async function verDetalle(id) {
    try {
        const venta = await makeAuthenticatedRequest(`/api/ventas/${id}`);
        const modalBody = document.getElementById("detalleVentaContent");

        if (!modalBody) return;

        // Calcular el total sumando subtotales de los servicios
        let total = 0;
        const serviciosHTML = venta.servicios.map(s => {
            const subtotal = parseFloat(s.subtotal || 0);
            total += subtotal;

            const subtotalFormateado = new Intl.NumberFormat("es-PE", {
                style: "currency",
                currency: "PEN"
            }).format(subtotal);

            return `<li>${s.nombre} (x${s.cantidad}) - ${subtotalFormateado}</li>`;
        }).join("");

        const totalFormateado = new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN"
        }).format(total);

        modalBody.innerHTML = `
            <p><strong>Cliente:</strong> ${venta.cliente_nombre}</p>
            <p><strong>Email:</strong> ${venta.cliente_email || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${venta.telefono || 'N/A'}</p>
            <p><strong>Dirección:</strong> ${venta.direccion || 'N/A'}</p>
            <p><strong>Servicios:</strong></p>
            <ul>${serviciosHTML}</ul>
            <p><strong>Total:</strong> ${totalFormateado}</p>
            <p><strong>Fecha:</strong> ${formatearFecha(venta.fecha_venta)}</p>
        `;

        new bootstrap.Modal(document.getElementById("detalleVentaModal")).show();
        
    } catch (error) {
        console.error("Error al obtener detalle de venta:", error);
        alert("No se pudo cargar el detalle de la venta.");
    }
}

// Editar venta
async function editarVenta(id) {
    try {
        const venta = await makeAuthenticatedRequest(`/api/ventas/${id}`);
        
        // Rellenar campos del cliente
        document.getElementById("editVentaId").value = venta.id;
        document.getElementById("editClienteNombre").value = venta.cliente_nombre;
        document.getElementById("editClienteEmail").value = venta.cliente_email || '';
        document.getElementById("editClienteTelefono").value = venta.telefono || '';
        document.getElementById("editClienteDireccion").value = venta.direccion || '';

        // Calcular total desde los subtotales
        const total = venta.servicios.reduce((sum, s) => sum + (parseFloat(s.subtotal) || 0), 0);

        const totalFormateado = new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN"
        }).format(total);

        document.getElementById("editTotal").value = totalFormateado;
        document.getElementById("editServicios").value = venta.servicios.map(s => s.nombre).join(", ");

        new bootstrap.Modal(document.getElementById("editarVentaModal")).show();
        
    } catch (error) {
        console.error("Error al cargar venta para editar:", error);
        alert("No se pudo cargar la venta.");
    }
}

// Guardar edición de venta
async function guardarEdicionVenta(e) {
    e.preventDefault();

    const id = document.getElementById("editVentaId").value;
    const data = {
        cliente_nombre: document.getElementById("editClienteNombre").value,
        cliente_email: document.getElementById("editClienteEmail").value,
        cliente_telefono: document.getElementById("editClienteTelefono").value,
        cliente_direccion: document.getElementById("editClienteDireccion").value,
        servicios: document.getElementById("editServicios").value
    };

    try {
        await makeAuthenticatedRequest(`/api/ventas/${id}`, 'PUT', data);
        
        alert("✅ Venta actualizada correctamente.");
        bootstrap.Modal.getInstance(document.getElementById("editarVentaModal")).hide();
        cargarVentas();
        
    } catch (error) {
        console.error("❌ Error al guardar la venta:", error);
        alert("No se pudo guardar la venta.");
    }
}

// Eliminar venta
async function eliminarVenta(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta venta?")) return;

    try {
        await makeAuthenticatedRequest(`/api/ventas/${id}`, 'DELETE');
        
        alert("Venta eliminada correctamente.");
        cargarVentas();
        
    } catch (error) {
        console.error("Error al eliminar venta:", error);
        alert("No se pudo eliminar la venta.");
    }
}

// ===== SISTEMA DE ESTADÍSTICAS =====

// Cargar resumen de estadísticas
async function cargarResumen() {
    try {
        const response = await makeAuthenticatedRequest('/api/ventas/resumen/estadisticas');
        
        const totalVentasEl = document.getElementById("totalVentas");
        const totalClientesEl = document.getElementById("totalClientes");
        const ingresosTotalesEl = document.getElementById("ingresosTotales");
        const totalServiciosEl = document.getElementById("totalServicios");
        
        if (totalVentasEl) totalVentasEl.textContent = Number(response.total_ventas) || 0;
        if (totalClientesEl) totalClientesEl.textContent = Number(response.total_clientes) || 0;
        if (ingresosTotalesEl) ingresosTotalesEl.textContent = `S/ ${Number(response.ingresos_totales).toFixed(2) || '0.00'}`;
        if (totalServiciosEl) totalServiciosEl.textContent = response.servicios_mas_vendidos?.length || 0;
        
        // Mostrar sección de resumen
        const resumenSection = document.getElementById("resumenStats");
        if (resumenSection) {
            resumenSection.style.display = "flex";
        }
        
    } catch (error) {
        console.error("❌ Error al cargar el resumen:", error);
        // No mostrar alerta para no molestar al usuario
    }
}

// ===== SISTEMA DE REPORTES =====

// Generar reporte de hoy
async function generarReporteHoy() {
    const modalBody = document.getElementById('contenidoReporteHoy');
    if (!modalBody) return;
    
    modalBody.innerHTML = '<p class="text-muted">Cargando datos...</p>';
    actualizarFechaModal();
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalReporteHoy'));
    modal.show();

    try {
        const datos = await makeAuthenticatedRequest('/api/reportes/hoy');
        console.log("📊 Datos recibidos del backend:", datos);

        if (!datos || datos.length === 0) {
            modalBody.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-info-circle me-1"></i> No se encontraron ventas para hoy.
                </div>
            `;
            return;
        }

        let tabla = `
            <table class="table table-bordered table-striped mt-3">
                <thead class="table-dark">
                    <tr>
                        <th># Venta</th>
                        <th>Cliente</th>
                        <th>Servicios</th>
                        <th>Total (S/)</th>
                        <th>Hora</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let totalDia = 0;
        datos.forEach(venta => {
            const total = parseFloat(venta.total);
            totalDia += total;
            
            tabla += `
                <tr>
                    <td>#${venta.id}</td>
                    <td>${venta.cliente_nombre}</td>
                    <td>${venta.servicios}</td>
                    <td>S/ ${total.toFixed(2)}</td>
                    <td>${new Date(venta.fecha_venta).toLocaleTimeString()}</td>
                </tr>
            `;
        });

        tabla += `
                </tbody>
                <tfoot class="table-secondary">
                    <tr>
                        <th colspan="3">TOTAL DEL DÍA</th>
                        <th>S/ ${totalDia.toFixed(2)}</th>
                        <th>${datos.length} ventas</th>
                    </tr>
                </tfoot>
            </table>
        `;
        
        modalBody.innerHTML = `
            <p><strong>📊 Reporte de Ventas - ${new Date().toLocaleDateString('es-PE')}</strong></p>
            ${tabla}
        `;

    } catch (error) {
        console.error('Error al generar reporte:', error);
        modalBody.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> Error al generar el reporte
            </div>
        `;
    }
}

// Mostrar sección de reportes
function mostrarSeccionReportes() {
    generarReporteHoy();
}

// Actualizar fecha en modal
function actualizarFechaModal() {
    const fechaSpan = document.getElementById("fechaActualModal");
    if (fechaSpan) {
        const hoy = new Date();
        const dia = hoy.getDate().toString().padStart(2, '0');
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const anio = hoy.getFullYear();
        fechaSpan.textContent = `${dia}/${mes}/${anio}`;
    }
}

// ===== UTILIDADES =====

// Mostrar alerta
function mostrarAlerta(mensaje, tipo = 'info') {
    // Remover alertas existentes
    const alertaExistente = document.querySelector('.alert-flotante');
    if (alertaExistente) {
        alertaExistente.remove();
    }
    
    // Crear nueva alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-flotante position-fixed`;
    alerta.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    alerta.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span>${mensaje}</span>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(alerta);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alerta.parentElement) {
            alerta.remove();
        }
    }, 5000);
}

// Formatear fecha
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
f
async function cargarVentasDeHoy() {
  const cuerpo = document.getElementById('tablaVentasHoyUsuario');
  
  // ✅ Verificar si el elemento existe
  if (!cuerpo) {
    console.warn('Elemento tablaVentasHoyUsuario no encontrado en el DOM');
    return; // Salir de la función si no existe
  }
  
  cuerpo.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  try {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/reportes/ventas/hoy', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('No autorizado');

    const ventas = await response.json();

    if (!Array.isArray(ventas) || ventas.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="5" class="text-center">No hay ventas registradas hoy.</td></tr>';
      return;
    }

    let filas = '';
    ventas.forEach((venta, i) => {
      filas += `
        <tr>
          <td>${i + 1}</td>
          <td>${new Date(venta.fecha_venta).toLocaleString()}</td>
          <td>${venta.cliente_nombre}</td>
          <td>${venta.servicios}</td>
          <td>S/ ${parseFloat(venta.total).toFixed(2)}</td>
        </tr>
      `;
    });

    cuerpo.innerHTML = filas;

  } catch (error) {
    console.error('Error al cargar ventas del día:', error);
    if (cuerpo) { // ✅ Verificar nuevamente antes de usar
      cuerpo.innerHTML = '<tr><td colspan="5" class="text-danger">Error al cargar datos.</td></tr>';
    }
  }
}






// ===== FUNCIONES DE COMPATIBILIDAD =====

// Alias para mantener compatibilidad
function verDetalleVenta(id) {
    verDetalle(id);
}