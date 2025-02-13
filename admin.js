class AdminPanel {
    constructor() {
        this.initializeFirebase();
        this.setupMenuNavigation();
        this.trafficStats = null; // Inicializamos como null
    }

    setupMenuNavigation() {
        const menuItems = document.querySelectorAll('.admin-menu-item');
        
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
                
                // Inicializar TrafficStats cuando se muestra la sección de tráfico
                if (section === 'traffic' && !this.trafficStats) {
                    this.trafficStats = new TrafficStats();
                }
                
                // Actualizar clase activa
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    showSection(sectionName) {
        // Ocultar todas las secciones
        document.querySelectorAll('.admin-section').forEach(section => {
            section.style.display = 'none';
        });

        // Mostrar la sección seleccionada
        const section = document.getElementById(`${sectionName}Section`);
        if (section) {
            section.style.display = 'block';
        }
    }

    async initializeFirebase() {
        try {
            let attempts = 0;
            while (typeof window.db === 'undefined' && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof window.db === 'undefined') {
                throw new Error('Firebase no se inicializó correctamente');
            }

            if (!this.checkAuth()) {
                window.location.href = 'login.html';
                return;
            }
            
            this.messages = [];
            this.init();
            this.setupFirebaseListener();
            setupReviewsAdmin();
            
            // Ya no inicializamos TrafficStats aquí
            
            // Mostrar la sección inicial (mensajes)
            this.showSection('messages');
        } catch (error) {
            console.error('Error al inicializar AdminPanel:', error);
            alert('Error al conectar con el servidor. Por favor, recarga la página.');
        }
    }

    // Agregar método para verificar autenticación
    checkAuth() {
        const authData = JSON.parse(localStorage.getItem('adminAuth'));
        
        if (!authData || !authData.authenticated || !authData.isAdmin) {
            return false;
        }

        // Verificar si la sesión ha expirado
        const now = Date.now();
        const sessionExpired = (now - authData.timestamp) > authData.expiresIn;

        if (sessionExpired) {
            localStorage.removeItem('adminAuth');
            return false;
        }

        return true;
    }

    init() {
        this.loadMessages();
        this.setupEventListeners();
    }

    loadMessages() {
        // Cargar mensajes del localStorage
        this.messages = JSON.parse(localStorage.getItem('adminMessages') || '[]');
        this.renderMessages();
    }

    setupEventListeners() {
        document.getElementById('deleteSelected').addEventListener('click', () => this.deleteSelected());
        document.getElementById('markAsRead').addEventListener('click', () => this.markSelectedAsRead());
    }

    renderMessages() {
        const messagesList = document.querySelector('.messages-list');
        messagesList.innerHTML = '';

        // Ordenar mensajes por fecha, más recientes primero
        this.messages.sort((a, b) => b.id - a.id);

        this.messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message-item ${message.read ? 'read' : 'unread'}`;
            messageElement.dataset.id = message.id;
            
            messageElement.innerHTML = `
                <div class="message-header">
                    <input type="checkbox" class="message-checkbox">
                    <div class="message-info">
                        <span class="message-name">${message.name}</span>
                        <span class="message-email">${message.email}</span>
                        <span class="message-date">${message.date}</span>
                    </div>
                </div>
                <div class="message-content">
                    <p>${message.message}</p>
                </div>
            `;
            
            messagesList.appendChild(messageElement);
        });

        // Actualizar contador de mensajes
        const totalMessages = this.messages.length;
        const unreadMessages = this.messages.filter(m => !m.read).length;
        document.querySelector('.admin-header h1').textContent = 
            `Mensajes (${unreadMessages} sin leer de ${totalMessages})`;
    }

    toggleRead(id) {
        const message = this.messages.find(m => m.id === id);
        if (message) {
            message.read = !message.read;
            this.renderMessages();
        }
    }

    deleteMessage(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
            this.messages = this.messages.filter(m => m.id !== id);
            this.renderMessages();
        }
    }

    deleteSelected() {
        const selectedIds = Array.from(document.querySelectorAll('.message-checkbox:checked'))
            .map(checkbox => checkbox.closest('.message-item').dataset.id);
        
        if (selectedIds.length === 0) {
            alert('Por favor, selecciona al menos un mensaje para eliminar.');
            return;
        }

        if (confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} mensaje(s)?`)) {
            // Eliminar mensajes de Firebase
            selectedIds.forEach(id => {
                const message = this.messages.find(m => m.id.toString() === id);
                if (message && message.firebaseKey) {
                    db.ref('messages').child(message.firebaseKey).remove();
                }
            });
        }
    }

    markSelectedAsRead() {
        const selectedIds = Array.from(document.querySelectorAll('.message-checkbox:checked'))
            .map(checkbox => checkbox.closest('.message-item').dataset.id);
        
        if (selectedIds.length === 0) {
            alert('Por favor, selecciona al menos un mensaje para marcar como leído.');
            return;
        }

        // Marcar mensajes como leídos en Firebase
        selectedIds.forEach(id => {
            const message = this.messages.find(m => m.id.toString() === id);
            if (message && message.firebaseKey) {
                db.ref('messages').child(message.firebaseKey).update({ read: true });
            }
        });
    }

    logout() {
        localStorage.removeItem('adminAuth');
        window.location.href = 'login.html';
    }

    setupFirebaseListener() {
        if (!window.db) {
            console.error('Firebase no está inicializado');
            return;
        }
        
        window.db.ref('messages').on('value', (snapshot) => {
            this.messages = [];
            snapshot.forEach((child) => {
                this.messages.push({
                    ...child.val(),
                    firebaseKey: child.key
                });
            });
            this.renderMessages();
        });
    }
}

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const adminPanel = new AdminPanel();
});

// Agregar esta función para manejar las reseñas
function setupReviewsAdmin() {
    const pendingReviewsList = document.getElementById('pendingReviewsList');
    const approvedReviewsList = document.getElementById('approvedReviewsList'); // Nueva lista para reseñas aprobadas

    // Cargar reseñas pendientes
    function loadPendingReviews() {
        db.ref('reviews').orderByChild('status').equalTo('pending').on('value', (snapshot) => {
            pendingReviewsList.innerHTML = '';
            
            if (!snapshot.exists()) {
                pendingReviewsList.innerHTML = '<p class="no-reviews">No hay reseñas pendientes</p>';
                return;
            }

            snapshot.forEach((child) => {
                const review = child.val();
                const date = new Date(review.timestamp);
                const reviewElement = document.createElement('div');
                reviewElement.className = 'review-card admin-review';
                const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating); // Generar estrellas
                reviewElement.innerHTML = `
                    <div class="review-header">
                        <span class="review-author">${review.nombre}</span>
                        <span class="review-date">${date.toLocaleDateString()}</span>
                    </div>
                    <div class="review-subject">${review.asunto}</div>
                    <div class="review-rating">${stars}</div> <!-- Mostrar estrellas -->
                    <div class="review-content">${review.descripcion}</div>
                    <div class="review-actions">
                        <button class="btn-primary approve-review" data-id="${child.key}">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button class="btn-danger reject-review" data-id="${child.key}">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </div>
                `;
                
                pendingReviewsList.appendChild(reviewElement);
            });

            // Agregar event listeners para los botones
            document.querySelectorAll('.approve-review').forEach(button => {
                button.addEventListener('click', function() {
                    const reviewId = this.dataset.id;
                    approveReview(reviewId);
                });
            });

            document.querySelectorAll('.reject-review').forEach(button => {
                button.addEventListener('click', function() {
                    const reviewId = this.dataset.id;
                    rejectReview(reviewId);
                });
            });
        });
    }

    // Cargar reseñas aprobadas
    function loadApprovedReviews() {
        db.ref('reviews').orderByChild('status').equalTo('approved').on('value', (snapshot) => {
            approvedReviewsList.innerHTML = '';
            
            if (!snapshot.exists()) {
                approvedReviewsList.innerHTML = '<p class="no-reviews">No hay reseñas aprobadas</p>';
                return;
            }

            snapshot.forEach((child) => {
                const review = child.val();
                const date = new Date(review.timestamp);
                const reviewElement = document.createElement('div');
                reviewElement.className = 'review-card admin-review';
                const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating); // Generar estrellas
                reviewElement.innerHTML = `
                    <div class="review-header">
                        <span class="review-author">${review.nombre}</span>
                        <span class="review-date">${date.toLocaleDateString()}</span>
                    </div>
                    <div class="review-subject">${review.asunto}</div>
                    <div class="review-rating">${stars}</div> <!-- Mostrar estrellas -->
                    <div class="review-content">${review.descripcion}</div>
                    <div class="review-actions">
                        <button class="btn-danger delete-review" data-id="${child.key}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                `;
                
                approvedReviewsList.appendChild(reviewElement);
            });

            // Agregar event listeners para los botones de eliminar
            document.querySelectorAll('.delete-review').forEach(button => {
                button.addEventListener('click', function() {
                    const reviewId = this.dataset.id;
                    deleteReview(reviewId);
                });
            });
        });
    }

    function approveReview(reviewId) {
        db.ref(`reviews/${reviewId}`).update({
            status: 'approved'
        }).then(() => {
            showNotification('Reseña aprobada correctamente');
            loadApprovedReviews(); // Recargar reseñas aprobadas después de aprobar
        }).catch(error => {
            console.error('Error:', error);
            showNotification('Error al aprobar la reseña', 'error');
        });
    }

    function rejectReview(reviewId) {
        if (confirm('¿Estás seguro de que quieres rechazar esta reseña?')) {
            db.ref(`reviews/${reviewId}`).remove()
                .then(() => {
                    showNotification('Reseña rechazada correctamente');
                    loadPendingReviews(); // Recargar reseñas pendientes después de rechazar
                }).catch(error => {
                    console.error('Error:', error);
                    showNotification('Error al rechazar la reseña', 'error');
                });
        }
    }

    function deleteReview(reviewId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta reseña?')) {
            db.ref(`reviews/${reviewId}`).remove()
                .then(() => {
                    showNotification('Reseña eliminada correctamente');
                    loadApprovedReviews(); // Recargar reseñas aprobadas después de eliminar
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotification('Error al eliminar la reseña', 'error');
                });
        }
    }

    loadPendingReviews();
    loadApprovedReviews(); // Cargar reseñas aprobadas al inicio
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Agregar estos estilos en styles.css 

// Agregar después de la clase AdminPanel
class TrafficStats {
    constructor() {
        this.chart = null;
        this.detailCharts = {
            pages: null,
            devices: null,
            browsers: null,
            referrers: null
        };
        // Asegurarnos de que los elementos existen antes de inicializar
        if (this.checkElements()) {
            this.initializeCharts();
            this.setupEventListeners();
            this.loadStats();
            this.setupRealtimeUpdates();
        } else {
            console.error('No se encontraron todos los elementos necesarios para las estadísticas');
        }
    }

    checkElements() {
        const requiredElements = [
            'trafficChart',
            'pagesChart',
            'devicesChart',
            'browsersChart',
            'referrersChart',
            'trafficPeriod'
        ];
        
        return requiredElements.every(id => document.getElementById(id) !== null);
    }

    initializeCharts() {
        // Gráfico principal de visitas
        const ctx = document.getElementById('trafficChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Visitas',
                    data: [],
                    borderColor: '#2f81f7',
                    backgroundColor: 'rgba(47, 129, 247, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#7d8590'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#7d8590'
                        }
                    }
                }
            }
        });

        // Inicializar gráficos de detalles
        this.initializeDetailChart('pages', 'Páginas');
        this.initializeDetailChart('devices', 'Dispositivos');
        this.initializeDetailChart('browsers', 'Navegadores');
        this.initializeDetailChart('referrers', 'Fuentes');
    }

    initializeDetailChart(type, label) {
        const container = document.getElementById(`${type}Chart`);
        const canvas = container.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        
        this.detailCharts[type] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#2f81f7',
                        '#238636',
                        '#a371f7',
                        '#f778ba',
                        '#db61a2',
                        '#f85149'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#7d8590',
                            padding: 10,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: true,
                        text: label,
                        color: '#e6edf3',
                        padding: 20
                    }
                }
            }
        });
    }

    async loadStats(days = 7) {
        try {
            const statsRef = db.ref('pageStats');
            const snapshot = await statsRef.orderByChild('timestamp')
                .limitToLast(parseInt(days))
                .once('value');
            
            const stats = [];
            snapshot.forEach((childSnapshot) => {
                stats.push({
                    ...childSnapshot.val(),
                    date: new Date(childSnapshot.val().timestamp)
                });
            });

            stats.sort((a, b) => a.date - b.date);

            // Actualizar todos los gráficos
            this.updateMainChart(stats);
            this.updateDetailCharts(stats);
            this.updateGeneralStats(stats);

        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            showNotification('Error al cargar estadísticas', 'error');
        }
    }

    updateMainChart(stats) {
        const labels = stats.map(stat => 
            stat.date.toLocaleDateString('es-ES', { 
                month: 'short', 
                day: 'numeric' 
            })
        );
        const data = stats.map(stat => stat.visits);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
    }

    updateDetailCharts(stats) {
        // Combinar datos de todos los días
        const combined = stats.reduce((acc, stat) => {
            // Páginas
            Object.entries(stat.pages || {}).forEach(([page, count]) => {
                acc.pages[page] = (acc.pages[page] || 0) + count;
            });
            // Dispositivos
            Object.entries(stat.devices || {}).forEach(([device, count]) => {
                acc.devices[device] = (acc.devices[device] || 0) + count;
            });
            // Navegadores
            Object.entries(stat.browsers || {}).forEach(([browser, count]) => {
                acc.browsers[browser] = (acc.browsers[browser] || 0) + count;
            });
            // Fuentes de tráfico
            Object.entries(stat.referrers || {}).forEach(([referrer, count]) => {
                acc.referrers[referrer] = (acc.referrers[referrer] || 0) + count;
            });
            return acc;
        }, { pages: {}, devices: {}, browsers: {}, referrers: {} });

        // Actualizar cada gráfico
        this.updateDetailChart('pages', combined.pages);
        this.updateDetailChart('devices', combined.devices);
        this.updateDetailChart('browsers', combined.browsers);
        this.updateDetailChart('referrers', combined.referrers);
    }

    updateDetailChart(type, data) {
        // Ordenar datos por valor y tomar los top 5
        const sortedData = Object.entries(data)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        const labels = sortedData.map(([key]) => this.formatLabel(key, type));
        const values = sortedData.map(([,value]) => value);

        this.detailCharts[type].data.labels = labels;
        this.detailCharts[type].data.datasets[0].data = values;
        this.detailCharts[type].update();
    }

    formatLabel(key, type) {
        // Formatear etiquetas para mejor visualización
        switch(type) {
            case 'pages':
                return key === 'home' ? 'Inicio' : key.charAt(0).toUpperCase() + key.slice(1);
            case 'devices':
                const deviceLabels = {
                    desktop: 'Escritorio',
                    mobile: 'Móvil',
                    tablet: 'Tablet'
                };
                return deviceLabels[key] || key;
            case 'browsers':
                return key.charAt(0).toUpperCase() + key.slice(1);
            case 'referrers':
                const referrerLabels = {
                    direct: 'Directo',
                    google: 'Google',
                    facebook: 'Facebook',
                    twitter: 'Twitter',
                    instagram: 'Instagram',
                    other: 'Otros'
                };
                return referrerLabels[key] || key;
            default:
                return key;
        }
    }

    updateGeneralStats(stats) {
        // Calcular visitas totales
        const totalVisits = stats.reduce((sum, stat) => sum + stat.visits, 0);

        // Calcular tiempo promedio correctamente
        const avgTimeInMinutes = stats.reduce((sum, stat) => {
            // Asegurarnos de que avgTime existe y es un número
            const avgTime = stat.avgTime || 0;
            return sum + avgTime;
        }, 0) / (stats.length || 1); // Evitar división por cero

        // Obtener estadísticas de hoy
        const today = new Date().toDateString();
        const todayStats = stats.find(stat => stat.date.toDateString() === today);

        // Actualizar el DOM con los valores formateados
        document.getElementById('totalVisitors').textContent = totalVisits.toLocaleString();
        document.getElementById('avgTime').textContent = 
            Number.isFinite(avgTimeInMinutes) ? 
            `${Math.round(avgTimeInMinutes)} min` : 
            '0 min';
        document.getElementById('todayVisits').textContent = 
            (todayStats ? todayStats.visits : 0).toLocaleString();
    }

    setupEventListeners() {
        document.getElementById('trafficPeriod').addEventListener('change', (e) => {
            this.loadStats(e.target.value);
        });
    }

    setupRealtimeUpdates() {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        db.ref(`pageStats/${today}`).on('value', (snapshot) => {
            if (snapshot.exists()) {
                const todayStats = {
                    ...snapshot.val(),
                    date: new Date(snapshot.val().timestamp)
                };
                this.updateTodayStats(todayStats);
            }
        });
    }

    updateTodayStats(todayStats) {
        document.getElementById('todayVisits').textContent = 
            todayStats.visits.toLocaleString();
        // Actualizar otros elementos si es necesario
        this.loadStats(document.getElementById('trafficPeriod').value);
    }
}

// Función temporal para generar datos de prueba
async function generateTestData() {
    try {
        const today = new Date();
        
        // Generar datos para los últimos 7 días
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0].replace(/-/g, '');
            
            await db.ref(`pageStats/${dateKey}`).set({
                timestamp: date.getTime(),
                visits: Math.floor(Math.random() * 100) + 50,
                avgTime: Math.floor(Math.random() * 10) + 2,
                totalTime: Math.floor(Math.random() * 1000) + 500,
                sessions: Math.floor(Math.random() * 80) + 30,
                devices: {
                    desktop: Math.floor(Math.random() * 60) + 20,
                    mobile: Math.floor(Math.random() * 40) + 10,
                    tablet: Math.floor(Math.random() * 20) + 5
                },
                browsers: {
                    chrome: Math.floor(Math.random() * 50) + 20,
                    firefox: Math.floor(Math.random() * 30) + 10,
                    safari: Math.floor(Math.random() * 20) + 5,
                    edge: Math.floor(Math.random() * 10) + 5
                },
                pages: {
                    home: Math.floor(Math.random() * 40) + 20,
                    servicios: Math.floor(Math.random() * 30) + 15,
                    contacto: Math.floor(Math.random() * 20) + 10,
                    reviews: Math.floor(Math.random() * 15) + 5
                },
                referrers: {
                    direct: Math.floor(Math.random() * 30) + 15,
                    google: Math.floor(Math.random() * 40) + 20,
                    facebook: Math.floor(Math.random() * 20) + 10,
                    twitter: Math.floor(Math.random() * 10) + 5
                }
            });
        }
        console.log('Datos de prueba generados correctamente');
    } catch (error) {
        console.error('Error al generar datos de prueba:', error);
    }
}

// Puedes llamar a esta función desde la consola del navegador con:
// generateTestData() 