const firebaseConfig = {
    // Tu configuración de Firebase aquí
    apiKey: "AIzaSyD6hezS3KESTHkpv3jVWH0MIPHARw6SVo0",
    authDomain: "webselling-79240.firebaseapp.com",
    databaseURL: "https://webselling-79240-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "webselling-79240",
    storageBucket: "webselling-79240.firebasestorage.app",
    messagingSenderId: "55683953548",
    appId: "1:55683953548:web:41fe0d8f9b271109ad9ca9",
    measurementId: "G-LY5YXNR6B8"
};

// Objeto global para funciones de Firebase
window.FirebaseApp = {
    init() {
        try {
            console.log('🔄 Iniciando inicialización de Firebase...');
            console.log('Firebase disponible:', typeof firebase !== 'undefined');
            console.log('Firebase apps:', firebase.apps.length);

            if (!firebase.apps.length) {
                console.log('📱 Inicializando nueva app de Firebase...');
                firebase.initializeApp(firebaseConfig);
                console.log('✅ Firebase app inicializada');
            } else {
                console.log('ℹ️ Firebase app ya estaba inicializada');
            }

            console.log('🔄 Inicializando base de datos...');
            window.db = firebase.database();
            console.log('✅ Base de datos inicializada');

            // Verificar que la base de datos está accesible
            return window.db.ref('.info/connected').once('value')
                .then(snapshot => {
                    console.log('🔌 Estado de conexión inicial:', snapshot.val());
                    return true;
                })
                .catch(error => {
                    console.error('❌ Error al verificar conexión:', error);
                    return false;
                });
        } catch (error) {
            console.error('❌ Error en init:', error);
            return false;
        }
    },

    async checkConnection() {
        if (!window.db) {
            console.error('❌ La base de datos no está inicializada');
            return false;
        }

        try {
            const connectedRef = window.db.ref('.info/connected');
            connectedRef.on('value', (snap) => {
                const isConnected = snap.val() === true;
                console.log('🔌 Estado de conexión:', isConnected ? 'Conectado' : 'Desconectado');
                
                // Mostrar un indicador visual del estado de conexión
                this.showConnectionStatus(isConnected);
            });
            return true;
        } catch (error) {
            console.error('❌ Error al verificar conexión:', error);
            return false;
        }
    },

    showConnectionStatus(isConnected) {
        let statusDiv = document.getElementById('firebase-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'firebase-status';
            statusDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 9999;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusDiv);
        }

        statusDiv.style.backgroundColor = isConnected ? '#4caf50' : '#f44336';
        statusDiv.style.color = 'white';
        statusDiv.textContent = isConnected ? '✅ Conectado' : '❌ Desconectado';

        // Ocultar después de 3 segundos
        setTimeout(() => {
            statusDiv.style.opacity = '0';
            setTimeout(() => statusDiv.remove(), 300);
        }, 3000);
    }
};

// Inicializar Firebase cuando el documento esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📝 DOM cargado, iniciando Firebase...');
    try {
        const initialized = await FirebaseApp.init();
        if (initialized) {
            console.log('✅ Firebase inicializado completamente');
            FirebaseApp.checkConnection();
        } else {
            console.error('❌ No se pudo inicializar Firebase');
        }
    } catch (error) {
        console.error('💥 Error fatal:', error);
    }
});

// Función global de prueba
window.testFirebase = async function() {
    console.log('🔍 Iniciando pruebas de Firebase...');
    console.log('FirebaseApp disponible:', !!window.FirebaseApp);
    console.log('Database disponible:', !!window.db);
    
    if (window.FirebaseApp) {
        try {
            const testRef = window.db.ref('test');
            console.log('📝 Escribiendo datos de prueba...');
            await testRef.set({ timestamp: Date.now() });
            console.log('✅ Escritura exitosa');
            
            console.log('📖 Leyendo datos de prueba...');
            const snapshot = await testRef.once('value');
            console.log('✅ Lectura exitosa:', snapshot.val());
            
            console.log('🗑️ Limpiando datos de prueba...');
            await testRef.remove();
            console.log('✅ Limpieza exitosa');
        } catch (error) {
            console.error('❌ Error en pruebas:', error);
        }
    } else {
        console.error('❌ FirebaseApp no está disponible');
    }
}; 