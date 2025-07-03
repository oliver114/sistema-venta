let clientes = [];
let servicios = [];
let serviciosSeleccionados = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarClientes();
    cargarServicios();
});

// CLIENTES - VERSIÓN CORREGIDA CON DNI
async function cargarClientes() {
    try {
        const token = localStorage.getItem('token');
const response = await fetch('/api/clientes', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

        clientes = await response.json();

        const select = document.getElementById('clienteSelect');
        select.innerHTML = '<option value="">Seleccionar cliente...</option>';

        clientes.forEach(cliente => {
            // Incluye el atributo data-dni para buscar después
            const option = document.createElement("option");
            option.value = cliente.id;
            option.textContent = `${cliente.nombre} (${cliente.email})`;
            option.dataset.dni = cliente.dni || ''; // <- clave para el filtro por DNI
            option.dataset.nombre = cliente.nombre || '';
            option.dataset.email = cliente.email || '';
            option.dataset.telefono = cliente.telefono || '';
            option.dataset.direccion = cliente.direccion || '';
            select.appendChild(option);
        });

        console.log('Clientes cargados:', clientes.length); // Para debug
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        alert('Error al cargar clientes');
    }
}

// BÚSQUEDA POR DNI - CORREGIDA
// document.getElementById("buscarDNI").addEventListener("input", function () {
//     const dniIngresado = this.value.trim();
//     const clienteSelect = document.getElementById("clienteSelect");

//     console.log('Buscando DNI:', dniIngresado); // Para debug

//     if (!dniIngresado) {
//         // Si no hay DNI, resetear la selección
//         clienteSelect.value = "";
//         document.getElementById('clienteInfo').style.display = 'none';
//         actualizarEstadoForm();
//         return;
//     }

//     // Buscar la opción que coincida con el DNI
//     const optionEncontrada = Array.from(clienteSelect.options).find(opt => 
//         opt.dataset.dni && opt.dataset.dni === dniIngresado
//     );

//     if (optionEncontrada) {
//         console.log('Cliente encontrado:', optionEncontrada.textContent); // Para debug
//         clienteSelect.value = optionEncontrada.value;
//         clienteSelect.dispatchEvent(new Event("change"));
        
//         // Mostrar mensaje de éxito
//         this.style.borderColor = '#28a745';
//         this.style.backgroundColor = '#d4edda';
//     } else {
//         console.log('Cliente no encontrado para DNI:', dniIngresado); // Para debug
//         clienteSelect.value = "";
//         document.getElementById('clienteInfo').style.display = 'none';
        
//         // Mostrar que no se encontró
//         this.style.borderColor = '#dc3545';
//         this.style.backgroundColor = '#f8d7da';
//         actualizarEstadoForm();
//     }
// });

// Función para buscar cliente por DNI en el formulario de venta
async function buscarClientePorDNI() {
    const dniInput = document.getElementById('buscarDNI');
    const clienteSelect = document.getElementById('clienteSelect');
    const dni = dniInput.value.trim();

    if (!dni) {
        alert('Por favor ingrese un DNI para buscar');
        return;
    }

    const dniRegex = /^\d{7,8}$/;
    if (!dniRegex.test(dni)) {
        alert('Por favor ingrese un DNI válido (7-8 dígitos)');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Sesión expirada. Por favor inicia sesión nuevamente.');
        window.location.href = '/login.html';
        return;
    }

    try {
        console.log('Buscando cliente con DNI:', dni);

        const response = await fetch(`/api/clientes/buscar/${dni}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        console.log('Resultado de búsqueda:', result);

        if (response.ok && result.cliente) {
            clienteSelect.innerHTML = `
                <option value="${result.cliente.id}" selected>
                    ${result.cliente.nombre} ${result.cliente.apellido || ''} - DNI: ${result.cliente.dni}
                </option>
            `;
            clienteSelect.dispatchEvent(new Event('change'));
            mostrarMensaje('Cliente encontrado correctamente', 'success');
            mostrarDatosCliente(result.cliente);

        } else {
            clienteSelect.innerHTML = '<option value="">Seleccionar cliente</option>';
            mostrarMensaje('Cliente no encontrado. ¿Desea registrarlo?', 'warning');
            if (confirm('Cliente no encontrado. ¿Desea registrarlo?')) {
                window.open('/nuevo-cliente', '_blank');
            }
        }

    } catch (error) {
        console.error('Error al buscar cliente:', error);
        mostrarMensaje('Error al buscar cliente', 'danger');
        clienteSelect.innerHTML = '<option value="">Seleccionar cliente</option>';
    }
}



document.addEventListener('DOMContentLoaded', function () {
    const clienteSelect = document.getElementById('cliente_id');
    clienteSelect.addEventListener('change', async function () {
        const selectedId = this.value;

        if (selectedId) {
            try {
                const response = await fetch(`/api/clientes/${selectedId}`);
                const cliente = await response.json();

                // Rellenar campo de DNI automáticamente
                document.getElementById('dni_buscar').value = cliente.dni || '';

                // Mostrar datos
                mostrarDatosCliente(cliente);
            } catch (error) {
                console.error('Error al obtener datos del cliente:', error);
            }
        } else {
            // Si se deselecciona
            document.getElementById('dni_buscar').value = '';
            limpiarBusqueda();
        }
    });
});


document.addEventListener('DOMContentLoaded', function () {
    const dniInput = document.getElementById('buscarDNI'); // CORREGIDO

    if (dniInput) {
        dniInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarClientePorDNI();
            }
        });
    }
});


// Función auxiliar para mostrar datos adicionales del cliente
function mostrarDatosCliente(cliente) {
    // Si tienes campos para mostrar datos adicionales del cliente
    const datosClienteDiv = document.getElementById('datos_cliente');
    if (datosClienteDiv) {
        datosClienteDiv.innerHTML = `
            <div class="card mt-2">
                <div class="card-body">
                    <h6>Datos del Cliente:</h6>
                    <p><strong>Nombre:</strong> ${cliente.nombre} ${cliente.apellido || ''}</p>
                    <p><strong>DNI:</strong> ${cliente.dni}</p>
                    <p><strong>Teléfono:</strong> ${cliente.telefono || 'No registrado'}</p>
                    <p><strong>Email:</strong> ${cliente.email || 'No registrado'}</p>
                </div>
            </div>
        `;
    }
}

// Función auxiliar para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
    // Crear elemento de mensaje si no existe
    let mensajeDiv = document.getElementById('mensaje_busqueda');
    if (!mensajeDiv) {
        mensajeDiv = document.createElement('div');
        mensajeDiv.id = 'mensaje_busqueda';
        mensajeDiv.className = 'alert mt-2';
        
        // Insertarlo después del campo de búsqueda
        const dniInput = document.getElementById('dni_buscar');
        dniInput.parentNode.insertBefore(mensajeDiv, dniInput.nextSibling);
    }
    
    // Configurar clase según el tipo
    mensajeDiv.className = `alert mt-2 alert-${tipo === 'success' ? 'success' : tipo === 'warning' ? 'warning' : 'danger'}`;
    mensajeDiv.textContent = mensaje;
    mensajeDiv.style.display = 'block';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 3000);
}

// Función para limpiar la búsqueda
function limpiarBusqueda() {
    document.getElementById('dni_buscar').value = '';
    document.getElementById('cliente_id').innerHTML = '<option value="">Seleccionar cliente</option>';
    
    const datosClienteDiv = document.getElementById('datos_cliente');
    if (datosClienteDiv) {
        datosClienteDiv.innerHTML = '';
    }
    
    const mensajeDiv = document.getElementById('mensaje_busqueda');
    if (mensajeDiv) {
        mensajeDiv.style.display = 'none';
    }
}

// Event listener para buscar al presionar Enter
document.addEventListener('DOMContentLoaded', function() {
    const dniInput = document.getElementById('dni_buscar');
    if (dniInput) {
        dniInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarClientePorDNI();
            }
        });
        
        // Validar que solo se ingresen números
        dniInput.addEventListener('input', function(e) {
            const dni = e.target.value;
            const dniRegex = /^\d{0,8}$/;
            
            if (!dniRegex.test(dni)) {
                e.target.value = dni.slice(0, -1);
            }
        });
    }
});

// Resetear colores cuando se borre el campo DNI
document.getElementById("buscarDNI").addEventListener("focus", function () {
    this.style.borderColor = '';
    this.style.backgroundColor = '';
});

// SERVICIOS
async function cargarServicios() {
    try {
        const token = localStorage.getItem('token');
const response = await fetch('/api/servicios', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

        servicios = await response.json();

        const container = document.getElementById('serviciosContainer');
        container.innerHTML = servicios.map(servicio => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="service-item p-3" onclick="toggleServicio(${servicio.id})">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="servicio_${servicio.id}">
                        <label class="form-check-label w-100" for="servicio_${servicio.id}">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${servicio.nombre}</h6>
                                    <small class="text-muted">${servicio.descripcion || ''}</small>
                                </div>
                                <div class="text-end">
                                    
                                    <strong class="text-success">S/ ${parseFloat(servicio.precio || 0).toFixed(2)}</strong>
                                </div>
                            </div>
                            <div class="mt-2" id="cantidad_${servicio.id}" style="display: none;">
                                <label class="form-label">Cantidad:</label>
                                <input type="number" class="form-control form-control-sm" 
                                       min="1" value="1" 
                                       onchange="actualizarCantidad(${servicio.id}, this.value)"
                                       onclick="event.stopPropagation();">
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        `).join('');

        console.log('Servicios cargados:', servicios.length); // Para debug
    } catch (error) {
        console.error('Error al cargar servicios:', error);
        alert('Error al cargar servicios');
    }
}

// CLIENTE INFO - MEJORADA
document.getElementById('clienteSelect').addEventListener('change', () => {
    const clienteId = document.getElementById('clienteSelect').value;
    const cliente = clientes.find(c => c.id == clienteId);
    const info = document.getElementById('clienteInfo');
    const detalles = document.getElementById('clienteDetalles');

    if (cliente) {
        detalles.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Nombre:</strong> ${cliente.nombre}</p>
                    <p><strong>Email:</strong> ${cliente.email}</p>
                    <p><strong>DNI:</strong> ${cliente.dni || 'No especificado'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Teléfono:</strong> ${cliente.telefono || 'No especificado'}</p>
                    <p><strong>Dirección:</strong> ${cliente.direccion || 'No especificada'}</p>
                </div>
            </div>
        `;
        info.style.display = 'block';

        // También actualizar el campo DNI si se selecciona desde el dropdown
        const dniBuscar = document.getElementById('buscarDNI');
        if (cliente.dni && !dniBuscar.value) {
            dniBuscar.value = cliente.dni;
            dniBuscar.style.borderColor = '#28a745';
            dniBuscar.style.backgroundColor = '#d4edda';
        }
    } else {
        info.style.display = 'none';
        // Limpiar campo DNI si no hay cliente seleccionado
        const dniBuscar = document.getElementById('buscarDNI');
        dniBuscar.value = '';
        dniBuscar.style.borderColor = '';
        dniBuscar.style.backgroundColor = '';
    }

    actualizarEstadoForm();
});

// SELECCIÓN DE SERVICIOS
function toggleServicio(servicioId) {
    const checkbox = document.getElementById(`servicio_${servicioId}`);
    const cantidadDiv = document.getElementById(`cantidad_${servicioId}`);
    const serviceItem = checkbox.closest('.service-item');

    checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
        cantidadDiv.style.display = 'block';
        serviceItem.classList.add('selected');
        agregarServicio(servicioId, 1);
    } else {
        cantidadDiv.style.display = 'none';
        serviceItem.classList.remove('selected');
        quitarServicio(servicioId);
    }
}

function agregarServicio(servicioId, cantidad) {
    const servicio = servicios.find(s => s.id === servicioId);
    const existente = serviciosSeleccionados.find(s => s.servicio_id === servicioId);

    if (existente) {
        existente.cantidad = cantidad;
    } else {
        serviciosSeleccionados.push({
            servicio_id: servicioId,
            cantidad,
            servicio
        });
    }

    actualizarResumen();
}

function quitarServicio(servicioId) {
    serviciosSeleccionados = serviciosSeleccionados.filter(s => s.servicio_id !== servicioId);
    actualizarResumen();
}

function actualizarCantidad(servicioId, cantidad) {
    const seleccionado = serviciosSeleccionados.find(s => s.servicio_id === servicioId);
    if (seleccionado) {
        seleccionado.cantidad = parseInt(cantidad);
        actualizarResumen();
    }
}

function actualizarResumen() {
    const resumenDiv = document.getElementById('resumenServicios');
    const totalDiv = document.getElementById('totalVenta');

    if (serviciosSeleccionados.length === 0) {
        resumenDiv.innerHTML = '<p class="text-muted text-center">No hay servicios seleccionados</p>';
        totalDiv.textContent = 'S/ 0.00';
    } else {
        let total = 0;
        resumenDiv.innerHTML = serviciosSeleccionados.map(item => {
            const subtotal = (item.servicio.precio || 0) * item.cantidad;
            total += subtotal;
            return `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                    <div>
                        <strong>${item.servicio.nombre}</strong>
                        <small class="text-muted d-block">Cantidad: ${item.cantidad}</small>
                    </div>
                    <div>
                        <strong class="text-success">S/ ${subtotal.toFixed(2)}</strong>
                    </div>
                </div>
            `;
        }).join('');

        totalDiv.textContent = `S/ ${total.toFixed(2)}`;
    }

    actualizarEstadoForm();
}

function actualizarEstadoForm() {
    const clienteId = document.getElementById('clienteSelect').value;
    const submitBtn = document.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = !clienteId || serviciosSeleccionados.length === 0;
        
        // Cambiar texto del botón según el estado
        if (submitBtn.disabled) {
            submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Seleccione cliente y servicios';
        } else {
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Procesar Venta';
        }
    }
}

// ENVÍO DEL FORMULARIO - MEJORADO
// ENVÍO DEL FORMULARIO - CORREGIDO
document.getElementById('ventaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const clienteId = document.getElementById('clienteSelect').value;
    const submitBtn = document.querySelector('button[type="submit"]');
    
    // Validaciones adicionales
    if (!clienteId) {
        alert('Por favor seleccione un cliente');
        return;
    }
    
    if (serviciosSeleccionados.length === 0) {
        alert('Por favor seleccione al menos un servicio');
        return;
    }

    // Mostrar loading
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
    submitBtn.disabled = true;

    try {
        console.log('Enviando venta:', {
            cliente_id: parseInt(clienteId),
            servicios: serviciosSeleccionados.map(s => ({
                servicio_id: s.servicio_id,
                cantidad: s.cantidad
            }))
        });

        // Enviar los datos de la venta
        const token = localStorage.getItem('token');

        const postResponse = await fetch('/api/ventas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cliente_id: parseInt(clienteId),
                servicios: serviciosSeleccionados.map(s => ({
                    servicio_id: s.servicio_id,
                    cantidad: s.cantidad
                }))
            })
        });


        // Verificar si la respuesta fue exitosa
        if (!postResponse.ok) {
            const errorText = await postResponse.text();
            throw new Error("Error al procesar venta: " + errorText);
        }

        // Obtener el ID de la nueva venta
        const data = await postResponse.json();
        const ventaId = data.id;
        

        // Obtener los detalles completos de la venta
        const ventaRes = await fetch(`/api/ventas/${ventaId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!ventaRes.ok) {
            const errorText = await ventaRes.text();
            throw new Error("Error al obtener boleta: " + errorText);
        }

        const venta = await ventaRes.json();

        // Construir el HTML de la boleta
        const boletaHTML = `
            <div class="detalles-venta">
                <h5><i class="fas fa-receipt"></i> Boleta de Venta</h5>
                <p><strong>Cliente:</strong> ${venta.cliente_nombre}</p>
                <p><strong>Email:</strong> ${venta.cliente_email}</p>
                <p><strong>Teléfono:</strong> ${venta.telefono || '-'}</p>
                <p><strong>Dirección:</strong> ${venta.direccion || '-'}</p>
                <p><strong>Servicios:</strong></p>
                <ul>
                    ${venta.servicios.map(s => `<li>${s.nombre} (x${s.cantidad}) - S/ ${parseFloat(s.subtotal).toFixed(2)}</li>`).join("")}
                </ul>
                <p><strong>Total:</strong> <span class="text-success">S/ ${parseFloat(venta.total).toFixed(2)}</span></p>
                <p><strong>Fecha:</strong> ${new Date(venta.fecha_venta).toLocaleDateString()}</p>
            </div>
        `;

        // Mostrar en el modal
        document.getElementById("ventaBoleta").innerHTML = boletaHTML;
        new bootstrap.Modal(document.getElementById("confirmModal")).show();

        // Resetear formulario después de mostrar la boleta
        setTimeout(() => {
            resetearFormulario();
        }, 1000);

    } catch (error) {
        console.error('Error al procesar venta:', error);
        alert(`Error al procesar venta: ${error.message}`);
    } finally {
        // Restaurar botón
        submitBtn.innerHTML = originalContent;
        submitBtn.disabled = false;
        actualizarEstadoForm();
    }
});
// fin envio del formulario - mejorado

function mostrarConfirmacion(venta) {
    document.getElementById('ventaDetalles').innerHTML = `
        <div class="text-center">
            <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
            <h4 class="mt-3">¡Venta Procesada Exitosamente!</h4>
            <div class="mt-3">
                <strong>Venta #${venta.id}</strong><br>
                <strong>Cliente:</strong> ${venta.cliente_nombre}<br>
                <strong>Email:</strong> ${venta.cliente_email}<br>
                <strong>Total:</strong> <span class="text-success">S/ ${parseFloat(venta.total || 0).toFixed(2)}</span>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();

    // Reset form después de mostrar la confirmación
    setTimeout(() => {
        resetearFormulario();
    }, 1000);
}

function resetearFormulario() {
    // Reset form
    document.getElementById('ventaForm').reset();
    document.getElementById('buscarDNI').value = '';
    document.getElementById('buscarDNI').style.borderColor = '';
    document.getElementById('buscarDNI').style.backgroundColor = '';
    
    serviciosSeleccionados = [];
    document.getElementById('clienteInfo').style.display = 'none';
    
    // Reset servicios
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('.form-check-input').checked = false;
        const cantidadDiv = item.querySelector('[id^="cantidad_"]');
        if (cantidadDiv) cantidadDiv.style.display = 'none';
    });
    
    actualizarResumen();
    console.log('Formulario reseteado');
}