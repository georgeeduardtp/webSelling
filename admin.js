class AdminPanel {
    constructor() {
        this.initializeFirebase();
        this.setupMenuNavigation();
    }

    setupMenuNavigation() {
        const menuItems = document.querySelectorAll('.admin-menu-item');
        
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
                
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