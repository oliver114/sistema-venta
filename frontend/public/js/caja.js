// js/caja.js - Frontend para Gestión de Caja

class CajaManager {
    constructor() {
        this.turnoActivo = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.verificarEstadoCaja();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token) {
            window.location.href = '/login';
            return;
        }

        document.getElementById('userName').textContent = user.nombre || 'Usuario';
    }

    setupEventListeners() {
        document.getElementById('ventaBtn').addEventListener('click', () => this.showPanel('venta'));
        document.getElementById('movimientoBtn').addEventListener('click', () => this.showPanel('movimiento'));
        document.getElementById('estadoBtn').addEventListener('click', () => this.showPanel('estado'));

        document.getElementById('abrirCajaBtn').addEventListener('click', () => this.showModalAbrirCaja());
        document.getElementById('cerrarCajaBtn').addEventListener('click', () => this.showModalCerrarCaja());

        document.getElementById('cancelarAbrirBtn').addEventListener('click', () => this.hideModal('modalAbrirCaja'));
        document.getElementById('cancelarCerrarBtn').addEventListener('click', () => this.hideModal('modalCerrarCaja'));

        document.getElementById('abrirCajaForm').addEventListener('submit', (e) => this.abrirCaja(e));
        document.getElementById('cerrarCajaForm').addEventListener('submit', (e) => this.cerrarCaja(e));
        document.getElementById('movimientoForm').addEventListener('submit', (e) => this.registrarMovimiento(e));

        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
    }

    showPanel(panelName) {
        document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(panelName + 'Panel').classList.add('active');

        if (panelName === 'venta') {
            document.getElementById('ventaBtn').classList.add('active');
            this.loadVentaContent();
        } else if (panelName === 'movimiento') {
            document.getElementById('movimientoBtn').classList.add('active');
        } else if (panelName === 'estado') {
            document.getElementById('estadoBtn').classList.add('active');
        }
    }

    loadVentaContent() {
        const ventaContent = document.getElementById('ventaContent');

        if (!this.turnoActivo) {
            ventaContent.innerHTML = '<p>Para realizar ventas, primero debes abrir la caja.</p>';
            return;
        }

        ventaContent.innerHTML = `
            <div class="venta-rapida">
                <h3>Venta Rápida</h3>
                <p>Caja abierta - Puedes realizar ventas</p>
                <a href="index.html" class="btn btn-primary">Ir a Nueva Venta</a>
            </div>
        `;

    }

    async verificarEstadoCaja() {
        try {
            const response = await this.makeRequest('/api/caja/estado');

            if (response.cajaAbierta) {
                this.turnoActivo = response.turno;
                this.mostrarCajaAbierta(response.turno);
            } else {
                this.turnoActivo = null;
                this.mostrarCajaCerrada();
            }
        } catch (error) {
            console.error('Error al verificar estado de caja:', error);
            this.showAlert('Error al verificar estado de la caja', 'error');
        }
    }

    mostrarCajaAbierta(turno) {
        document.getElementById('cajaCerrada').style.display = 'none';
        document.getElementById('cajaAbierta').style.display = 'block';

        document.getElementById('horaApertura').textContent = this.formatDateTime(turno.fecha_apertura);
        document.getElementById('saldoInicial').textContent = parseFloat(turno.saldo_inicial || 0).toFixed(2);
        document.getElementById('totalVentas').textContent = parseFloat(turno.total_ventas || 0).toFixed(2);

        const saldoActual = parseFloat(turno.saldo_inicial || 0) + parseFloat(turno.total_ventas || 0);
        document.getElementById('saldoActual').textContent = saldoActual.toFixed(2);

        document.getElementById('movimientoForm').style.display = 'block';
    }

    mostrarCajaCerrada() {
        document.getElementById('cajaAbierta').style.display = 'none';
        document.getElementById('cajaCerrada').style.display = 'block';
        document.getElementById('movimientoForm').style.display = 'none';
    }

    showModalAbrirCaja() {
        document.getElementById('modalAbrirCaja').style.display = 'flex';
        document.getElementById('saldoInicialInput').focus();
    }

    showModalCerrarCaja() {
        if (!this.turnoActivo) {
            this.showAlert('No hay caja abierta', 'error');
            return;
        }

        document.getElementById('modalCerrarCaja').style.display = 'flex';
        const saldoActual = parseFloat(this.turnoActivo.saldo_inicial || 0) + parseFloat(this.turnoActivo.total_ventas || 0);
        document.getElementById('saldoFinalInput').value = saldoActual.toFixed(2);
        document.getElementById('saldoFinalInput').focus();
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    async abrirCaja(e) {
  e.preventDefault();

  const saldoInicial = parseFloat(document.getElementById('saldoInicialInput').value) || 0;
  const observaciones = document.getElementById('observacionesAbrir').value;

  if (saldoInicial < 0) {
    this.showAlert('El saldo inicial no puede ser negativo', 'error');
    return;
  }

  try {
    const response = await this.makeRequest('/api/caja/abrir', 'POST', {
      saldo_inicial: saldoInicial,
      observaciones: observaciones
    });

    // Guardar el nuevo token con turno_id
    if (response.token) {
      localStorage.setItem('token', response.token);
    }

    this.showAlert('Caja abierta exitosamente', 'success');
    this.hideModal('modalAbrirCaja');
    document.getElementById('abrirCajaForm').reset();
    await this.verificarEstadoCaja();

  } catch (error) {
    console.error('Error al abrir caja:', error);
    this.showAlert(error.message || 'Error al abrir la caja', 'error');
  }
}


    async cerrarCaja(e) {
    e.preventDefault();

    const saldoFinal = parseFloat(document.getElementById('saldoFinalInput').value);
    const observaciones = document.getElementById('observacionesCerrar').value;

    if (isNaN(saldoFinal) || saldoFinal < 0) {
        this.showAlert('Ingresa un saldo final válido', 'error');
        return;
    }

    if (!confirm('¿Estás seguro de cerrar la caja? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await this.makeRequest('/api/caja/cerrar', 'POST', {
            saldo_final: saldoFinal,
            observaciones: observaciones
        });

        // 🔁 Reemplazar token por uno limpio (sin turno activo)
        if (response.token) {
            localStorage.setItem('token', response.token);
        }

        this.showAlert('Caja cerrada exitosamente', 'success');
        this.hideModal('modalCerrarCaja');
        document.getElementById('cerrarCajaForm').reset();
        await this.verificarEstadoCaja();

    } catch (error) {
        console.error('Error al cerrar caja:', error);
        this.showAlert(error.message || 'Error al cerrar la caja', 'error');
    }
}


    async registrarMovimiento(e) {
        e.preventDefault();

        const tipo = document.getElementById('tipoMovimiento').value;
        const monto = parseFloat(document.getElementById('montoMovimiento').value);
        const descripcion = document.getElementById('descripcionMovimiento').value;

        if (!tipo || isNaN(monto) || monto <= 0 || !descripcion.trim()) {
            this.showAlert('Completa todos los campos correctamente', 'error');
            return;
        }

        try {
            await this.makeRequest('/api/caja/movimiento', 'POST', {
                tipo: tipo,
                monto: monto,
                descripcion: descripcion.trim()
            });

            this.showAlert(`${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado exitosamente`, 'success');
            document.getElementById('movimientoForm').reset();
            await this.verificarEstadoCaja();

        } catch (error) {
            console.error('Error al registrar movimiento:', error);
            this.showAlert(error.message || 'Error al registrar el movimiento', 'error');
        }
    }

    async makeRequest(url, method = 'GET', data = null) {
        const token = localStorage.getItem('token');

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

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error en la petición');
        }

        return result;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showAlert(message, type = 'info') {
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) existingAlert.remove();

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `<span>${message}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        document.querySelector('.container').insertBefore(alert, document.querySelector('.header'));

        setTimeout(() => {
            if (alert.parentElement) alert.remove();
        }, 5000);
    }

    logout() {
        if (confirm('¿Estás seguro de cerrar sesión?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CajaManager();
});

function createAlertStyles() {
    if (!document.getElementById('caja-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'caja-alert-styles';
        style.textContent = `
            .alert {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 1000;
                min-width: 300px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .alert-success { background-color: #28a745; }
            .alert-error { background-color: #dc3545; }
            .alert-info { background-color: #17a2b8; }
            .alert-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-left: 10px;
            }
            .alert-close:hover { opacity: 0.7; }
            .venta-rapida {
                text-align: center;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 5px;
                margin-top: 20px;
            }
            .venta-rapida h3 { margin-bottom: 15px; color: #333; }
            .venta-rapida p { margin-bottom: 20px; color: #666; }
        `;
        document.head.appendChild(style);
    }
}

createAlertStyles();
