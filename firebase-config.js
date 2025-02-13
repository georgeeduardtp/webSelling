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

// Esperar a que firebase esté disponible
function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK no está cargado');
        }

        // Inicializar Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        window.db = firebase.database();

        // Agregar después de la inicialización de Firebase
        firebase.database().ref('.info/connected').on('value', function(snap) {
            if (snap.val() === true) {
                console.log('Conectado a Firebase');
            } else {
                console.error('Error de conexión con Firebase');
            }
        });
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
    }
}

// Intentar inicializar Firebase cuando el script se cargue
initializeFirebase();

// También intentar inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', initializeFirebase); 