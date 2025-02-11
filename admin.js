class AdminPanel {
    constructor() {
        // Verificar autenticación
        if (!this.checkAuth()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.messages = [];
        this.init();
    }

    // Agregar método para verificar autenticación
    checkAuth() {
        const authData = JSON.parse(localStorage.getItem('adminAuth'));
        
        if (!authData || !authData.authenticated) {
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
        messagesList.innerHTML = this.messages.map(message => `
            <div class="message-item ${message.read ? '' : 'unread'}" data-id="${message.id}">
                <input type="checkbox" class="message-checkbox">
                <div class="message-content">
                    <div class="message-header">
                        <div class="message-info">
                            <strong>${message.name}</strong> &lt;${message.email}&gt;
                            <span class="message-date">${new Date(message.date).toLocaleDateString()}</span>
                        </div>
                        <div class="message-actions">
                            <button class="btn-icon" onclick="adminPanel.toggleRead(${message.id})">
                                <i class="fas ${message.read ? 'fa-envelope-open' : 'fa-envelope'}"></i>
                            </button>
                            <button class="btn-icon" onclick="adminPanel.deleteMessage(${message.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="message-body">${message.message}</div>
                </div>
            </div>
        `).join('');
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
            .map(checkbox => parseInt(checkbox.closest('.message-item').dataset.id));
        
        if (selectedIds.length === 0) {
            alert('Por favor, selecciona al menos un mensaje para eliminar.');
            return;
        }

        if (confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} mensaje(s)?`)) {
            this.messages = this.messages.filter(m => !selectedIds.includes(m.id));
            this.renderMessages();
        }
    }

    markSelectedAsRead() {
        const selectedIds = Array.from(document.querySelectorAll('.message-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.closest('.message-item').dataset.id));
        
        if (selectedIds.length === 0) {
            alert('Por favor, selecciona al menos un mensaje para marcar como leído.');
            return;
        }

        this.messages.forEach(message => {
            if (selectedIds.includes(message.id)) {
                message.read = true;
            }
        });
        this.renderMessages();
    }

    logout() {
        localStorage.removeItem('adminAuth');
        window.location.href = 'login.html';
    }
}

// Inicializar el panel de administración
const adminPanel = new AdminPanel(); 