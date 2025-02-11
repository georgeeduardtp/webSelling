class AdminPanel {
    constructor() {
        // Verificar autenticación
        if (!this.checkAuth()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.messages = [];
        this.init();
        this.setupFirebaseListener();
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
        db.ref('messages').on('value', (snapshot) => {
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

// Inicializar el panel de administración
const adminPanel = new AdminPanel(); 