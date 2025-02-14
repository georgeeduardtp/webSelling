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
        console.log('🔍 Procesando ruta original:', path);
        
        // Extraer solo la última parte de la ruta (después de la última barra)
        const lastPart = path.split('/').pop() || '';
        console.log('🔍 Última parte de la ruta:', lastPart);

        // Limpiar y normalizar la ruta
        let cleanPath = lastPart
            .toLowerCase()
            // Eliminar extensión .html
            .replace(/\.html$/, '')
            // Eliminar todos los caracteres no permitidos
            .replace(/[^a-z0-9]/g, '_')
            // Eliminar guiones bajos múltiples
            .replace(/_+/g, '_')
            // Eliminar guiones bajos al inicio y final
            .replace(/^_|_$/g, '')
            // Si está vacío, usar 'home'
            || 'home';
            
        console.log('✅ Ruta final limpia:', cleanPath);
        return cleanPath;
    }

    getPageInfo() {
        const path = this.sanitizePath(window.location.pathname);
        const pageInfo = {
            path: path,
            title: document.title || path
        };
        console.log('📄 Información de página:', pageInfo);
        return pageInfo;
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
                        pages: {},
                        devices: {},
                        browsers: {}
                    };
                    // Asegurar que los objetos anidados existan y tengan al menos un valor
                    newData.pages[pageInfo.path] = 1;
                    newData.devices[deviceInfo.type] = 1;
                    newData.browsers[deviceInfo.browser] = 1;
                    
                    console.log('🆕 Creando nuevos datos:', newData);
                    return newData;
                }

                // Asegurar que todos los objetos necesarios existan
                const pages = currentData.pages || {};
                const devices = currentData.devices || {};
                const browsers = currentData.browsers || {};

                // Actualizar contadores de manera segura
                pages[pageInfo.path] = (pages[pageInfo.path] || 0) + 1;
                devices[deviceInfo.type] = (devices[deviceInfo.type] || 0) + 1;
                browsers[deviceInfo.browser] = (browsers[deviceInfo.browser] || 0) + 1;

                const updatedData = {
                    timestamp: Date.now(),
                    visits: (currentData.visits || 0) + 1,
                    avgTime: currentData.avgTime || 0,
                    totalTime: currentData.totalTime || 0,
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
            if (error.message.includes('permission_denied')) {
                console.error('❌ Error de permisos. Verifica las reglas de Firebase');
            }
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