// Variables globales para almacenar datos
let datosReporteHoy = {};
let datosReporteFecha = {};
let datosReporteRango = {};

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    const hoy = new Date();
    const fechaFormateada = hoy.toLocaleDateString('es-ES');

    document.getElementById('fechaHoy').textContent = fechaFormateada;
    document.getElementById('fechaActualHoy').textContent = fechaFormateada;
    document.getElementById('fechaActualFecha').textContent = fechaFormateada;
    document.getElementById('fechaActualRango').textContent = fechaFormateada;

    const hoyModal = document.getElementById('reporteHoyModal');
    hoyModal.addEventListener('shown.bs.modal', () => {
        cargarReporteHoy();
    });
});

// Función para formatear números como moneda
function formatearMoneda(numero) {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
    }).format(numero);
}

// Función para formatear fechas
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-PE');
}

// Mostrar estadísticas en tabla
function mostrarEstadisticas(data, tablaId, totalId) {
    const tbody = document.querySelector(`#${tablaId} tbody`);
    tbody.innerHTML = '';

    if (data.servicios && data.servicios.length > 0) {
        data.servicios.forEach(servicio => {
            const row = `
                <tr>
                    <td>${servicio.servicio}</td>
                    <td>${servicio.cantidad_vendida}</td>
                    <td>${formatearMoneda(servicio.precio)}</td>
                    <td>${formatearMoneda(servicio.total_servicio)}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay datos para mostrar</td></tr>';
    }

    document.getElementById(totalId).textContent = formatearMoneda(data.totalGeneral || 0);
}

// Mostrar ventas en tabla
function mostrarVentas(ventas, tablaId) {
    const tbody = document.querySelector(`#${tablaId} tbody`);
    tbody.innerHTML = '';

    if (ventas && ventas.length > 0) {
        ventas.forEach(venta => {
            const row = `
                <tr>
                    <td>${venta.id}</td>
                    <td>${formatearFecha(venta.fecha_venta)}</td>
                    <td>${venta.cliente_nombre}</td>
                    <td>${venta.servicios}</td>
                    <td>${formatearMoneda(venta.total)}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay ventas para mostrar</td></tr>';
    }
}

// Cargar reporte del día
async function cargarReporteHoy() {
    try {
        const token = localStorage.getItem('token');

        const [estadisticasRes, ventasRes] = await Promise.all([
            fetch('/api/reportes/estadisticas/hoy', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/reportes/ventas/hoy', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const estadisticas = await estadisticasRes.json();
        const ventas = await ventasRes.json();

        datosReporteHoy = { estadisticas, ventas };

        mostrarEstadisticas(estadisticas, 'tablaEstadisticasHoy', 'totalGeneralHoy');
        mostrarVentas(ventas, 'tablaVentasHoy');

    } catch (err) {
        console.error('Error al cargar reporte de hoy:', err);
    }
}

// Cargar reporte por fecha específica
async function cargarReporteFecha() {
    const fecha = document.getElementById('fechaEspecifica').value;
    if (!fecha) return;

    try {
        const token = localStorage.getItem('token');

        const [estadisticasRes, ventasRes] = await Promise.all([
            fetch(`/api/reportes/estadisticas/fecha/${fecha}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`/api/reportes/fecha/${fecha}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const estadisticas = await estadisticasRes.json();
        const ventas = await ventasRes.json();

        datosReporteFecha = { estadisticas, ventas, fecha };

        document.getElementById('fechaSeleccionada').textContent = formatearFecha(fecha);
        document.getElementById('contenidoReporteFecha').style.display = 'block';
        document.getElementById('btnPDFFecha').disabled = false;

        mostrarEstadisticas(estadisticas, 'tablaEstadisticasFecha', 'totalGeneralFecha');
        mostrarVentas(ventas, 'tablaVentasFecha');

    } catch (err) {
        console.error('Error al cargar reporte de fecha:', err);
    }
}

// Cargar reporte por rango
async function cargarReporteRango() {
    const inicio = document.getElementById('fechaInicio').value;
    const fin = document.getElementById('fechaFin').value;

    if (!inicio || !fin) return;

    try {
        const token = localStorage.getItem('token');

        const [estadisticasRes, ventasRes] = await Promise.all([
            fetch(`/api/reportes/estadisticas/rango/${inicio}/${fin}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`/api/reportes/rango/${inicio}/${fin}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const estadisticas = await estadisticasRes.json();
        const ventas = await ventasRes.json();

        datosReporteRango = { estadisticas, ventas, inicio, fin };

        document.getElementById('rangoSeleccionado').textContent = `${formatearFecha(inicio)} - ${formatearFecha(fin)}`;
        document.getElementById('contenidoReporteRango').style.display = 'block';
        document.getElementById('btnPDFRango').disabled = false;

        mostrarEstadisticas(estadisticas, 'tablaEstadisticasRango', 'totalGeneralRango');
        mostrarVentas(ventas, 'tablaVentasRango');

    } catch (err) {
        console.error('Error al cargar reporte de rango:', err);
    }
}
