class TrackingService {
    constructor() {
        if (!window.db) {
            console.error('❌ Firebase no está inicializado');
            return;
        }
        console.log('🚀 Iniciando servicio de tracking...');
        this.sessionStart = Date.now();
        this.initializeTracking();
    }

    sanitizePath(path) {
        console.log('🔍 Procesando ruta:', path);
        // Si estamos en GitHub Pages, eliminar el nombre del repositorio
        const pathWithoutRepo = path.replace(/^\/[^/]+\//, '/');
        console.log('🔄 Ruta sin repositorio:', pathWithoutRepo);
        
        const finalPath = pathWithoutRepo
            .replace(/^\//, '')
            .replace(/\.html$/, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase()
            .replace(/^$/, 'home');
            
        console.log('✅ Ruta final:', finalPath);
        return finalPath;
    }

    getPageInfo() {
        const path = this.sanitizePath(window.location.pathname);
        return { 
            path: path || 'home',
            title: document.title || path 
        };
    }

    async initializeTracking() {
        try {
            if (!window.db) {
                console.error('❌ Firebase DB no disponible');
                return;
            }

            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const statsRef = window.db.ref(`pageStats/${today}`);
            const pageInfo = this.getPageInfo();
            const deviceInfo = this.getDeviceInfo();
            
            console.log('📊 Intentando registrar visita...', { 
                page: pageInfo.path,
                device: deviceInfo,
                date: today,
                url: window.location.href
            });
            
            await statsRef.transaction((currentData) => {
                console.log('💾 Datos actuales:', currentData);
                if (!currentData) {
                    const newData = {
                        timestamp: Date.now(),
                        visits: 1,
                        avgTime: 0,
                        totalTime: 0,
                        sessions: 1,
                        pages: {
                            [pageInfo.path]: 1
                        },
                        devices: {
                            [deviceInfo.type]: 1
                        },
                        browsers: {
                            [deviceInfo.browser]: 1
                        }
                    };
                    console.log('🆕 Creando nuevos datos:', newData);
                    return newData;
                }

                // Actualizar contadores
                const pages = currentData.pages || {};
                pages[pageInfo.path] = (pages[pageInfo.path] || 0) + 1;

                const devices = currentData.devices || {};
                devices[deviceInfo.type] = (devices[deviceInfo.type] || 0) + 1;

                const browsers = currentData.browsers || {};
                browsers[deviceInfo.browser] = (browsers[deviceInfo.browser] || 0) + 1;

                const updatedData = {
                    ...currentData,
                    visits: (currentData.visits || 0) + 1,
                    sessions: (currentData.sessions || 0) + 1,
                    pages,
                    devices,
                    browsers
                };
                
                console.log('🔄 Actualizando datos:', updatedData);
                return updatedData;
            });

            console.log('✅ Visita registrada correctamente');
            this.setupTimeTracking(statsRef);
            
            // Verificar datos inmediatamente después de registrar
            this.verifyTracking(today);
        } catch (error) {
            console.error('❌ Error en tracking:', error);
        }
    }

    verifyTracking(today) {
        window.db.ref(`pageStats/${today}`).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    console.log('✅ Verificación de datos:', snapshot.val());
                } else {
                    console.error('❌ No se encontraron datos después de registrar');
                }
            })
            .catch(error => {
                console.error('❌ Error al verificar datos:', error);
            });
    }

    getDeviceInfo() {
        const ua = navigator.userAgent.toLowerCase();
        let type = 'desktop';
        let browser = 'unknown';

        // Detectar tipo de dispositivo
        if (/(android|webos|iphone|ipad|ipod|blackberry|windows phone)/.test(ua)) {
            type = 'mobile';
            if (/(ipad|tablet)/.test(ua)) {
                type = 'tablet';
            }
        }

        // Detectar navegador
        if (ua.includes('firefox')) browser = 'firefox';
        else if (ua.includes('chrome')) browser = 'chrome';
        else if (ua.includes('safari')) browser = 'safari';
        else if (ua.includes('edge')) browser = 'edge';
        else if (ua.includes('opera')) browser = 'opera';

        return { type, browser };
    }

    setupTimeTracking(statsRef) {
        // ... resto del código de setupTimeTracking sin cambios ...
    }
}

// Iniciar tracking con reintento
document.addEventListener('DOMContentLoaded', () => {
    let attempts = 0;
    const maxAttempts = 3;
    
    function initializeTrackingService() {
        console.log(`🔄 Intento ${attempts + 1} de inicializar tracking...`);
        if (window.db) {
            console.log('✅ DB disponible, iniciando TrackingService');
            new TrackingService();
        } else if (attempts < maxAttempts) {
            attempts++;
            console.log(`⏳ DB no disponible, reintentando en 1 segundo...`);
            setTimeout(initializeTrackingService, 1000);
        } else {
            console.error('❌ No se pudo inicializar el tracking después de varios intentos');
        }
    }
    
    setTimeout(initializeTrackingService, 1000);
});

// Función para verificar datos
function checkTrackingData() {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    console.log('📊 Verificando datos de tracking...');
    
    window.db.ref(`pageStats/${today}`).on('value', (snapshot) => {
        if (snapshot.exists()) {
            console.log('📈 Datos de hoy:', {
                visitas: snapshot.val().visits,
                dispositivos: snapshot.val().devices,
                navegadores: snapshot.val().browsers,
                paginas: snapshot.val().pages
            });
        } else {
            console.log('ℹ️ No hay datos para hoy todavía');
        }
    });
}

// Llamar a la función después de 5 segundos
setTimeout(checkTrackingData, 5000);

// Mostrar estado de conexión
function showConnectionStatus() {
    const statusIndicator = document.createElement('div');
    statusIndicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 9999;
        display: none;
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(statusIndicator);

    window.db.ref('.info/connected').on('value', (snap) => {
        statusIndicator.style.display = 'block';
        statusIndicator.style.opacity = '1';
        
        if (snap.val() === true) {
            statusIndicator.innerHTML = '✅ Tracking activo';
            statusIndicator.style.backgroundColor = 'rgba(46, 160, 67, 0.9)';
        } else {
            statusIndicator.innerHTML = '❌ Tracking desconectado';
            statusIndicator.style.backgroundColor = 'rgba(248, 81, 73, 0.9)';
        }

        setTimeout(() => {
            statusIndicator.style.opacity = '0';
            setTimeout(() => {
                statusIndicator.style.display = 'none';
            }, 300);
        }, 3000);
    });
}

// Iniciar monitoreo de conexión
showConnectionStatus(); 