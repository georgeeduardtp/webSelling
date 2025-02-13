class TrackingService {
    constructor() {
        this.sessionStart = Date.now();
        this.isTracking = false;
        this.initializeTracking();
    }

    initializeTracking() {
        try {
            // Esperar a que Firebase esté disponible
            let attempts = 0;
            const checkFirebase = setInterval(() => {
                if (typeof window.db !== 'undefined' || attempts >= 10) {
                    clearInterval(checkFirebase);
                    if (typeof window.db !== 'undefined') {
                        this.startTracking();
                    }
                }
                attempts++;
            }, 100);
        } catch (error) {
            console.error('Error al inicializar tracking:', error);
        }
    }

    async startTracking() {
        if (this.isTracking) return;
        this.isTracking = true;

        // Obtener la fecha actual en formato YYYYMMDD
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        // Referencia a las estadísticas de hoy
        const statsRef = db.ref(`pageStats/${today}`);
        
        try {
            // Recopilar información adicional
            const deviceInfo = this.getDeviceInfo();
            const pageInfo = this.getPageInfo();
            const referrerInfo = this.getReferrerInfo();

            // Incrementar el contador de visitas
            await statsRef.transaction((currentData) => {
                if (currentData === null) {
                    return {
                        timestamp: Date.now(),
                        visits: 1,
                        avgTime: 0,
                        totalTime: 0,
                        sessions: 1,
                        devices: {
                            [deviceInfo.type]: 1
                        },
                        browsers: {
                            [deviceInfo.browser]: 1
                        },
                        pages: {
                            [pageInfo.path]: 1
                        },
                        referrers: {
                            [referrerInfo.source]: 1
                        }
                    };
                }
                
                // Actualizar contadores existentes
                const devices = currentData.devices || {};
                devices[deviceInfo.type] = (devices[deviceInfo.type] || 0) + 1;

                const browsers = currentData.browsers || {};
                browsers[deviceInfo.browser] = (browsers[deviceInfo.browser] || 0) + 1;

                const pages = currentData.pages || {};
                pages[pageInfo.path] = (pages[pageInfo.path] || 0) + 1;

                const referrers = currentData.referrers || {};
                referrers[referrerInfo.source] = (referrers[referrerInfo.source] || 0) + 1;

                return {
                    ...currentData,
                    visits: currentData.visits + 1,
                    sessions: currentData.sessions + 1,
                    devices,
                    browsers,
                    pages,
                    referrers
                };
            });

            // Actualizar tiempo promedio cuando el usuario sale de la página
            this.setupTimeTracking(statsRef);

        } catch (error) {
            console.error('Error al registrar visita:', error);
        }
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        let type = 'desktop';
        let browser = 'unknown';

        // Detectar tipo de dispositivo
        if (/mobile/i.test(ua)) type = 'mobile';
        else if (/tablet/i.test(ua)) type = 'tablet';

        // Detectar navegador
        if (/firefox/i.test(ua)) browser = 'firefox';
        else if (/chrome/i.test(ua)) browser = 'chrome';
        else if (/safari/i.test(ua)) browser = 'safari';
        else if (/edge/i.test(ua)) browser = 'edge';
        else if (/opera/i.test(ua)) browser = 'opera';

        return { type, browser };
    }

    getPageInfo() {
        const path = window.location.pathname;
        return {
            path: path === '/' ? 'home' : path.replace(/^\/|\.html$/g, '')
        };
    }

    getReferrerInfo() {
        const referrer = document.referrer;
        let source = 'direct';

        if (referrer) {
            if (referrer.includes('google')) source = 'google';
            else if (referrer.includes('facebook')) source = 'facebook';
            else if (referrer.includes('twitter')) source = 'twitter';
            else if (referrer.includes('instagram')) source = 'instagram';
            else source = 'other';
        }

        return { source };
    }

    setupTimeTracking(statsRef) {
        // Actualizar tiempo cuando el usuario cierra la página
        window.addEventListener('beforeunload', async () => {
            const sessionDuration = (Date.now() - this.sessionStart) / 1000 / 60; // en minutos

            try {
                await statsRef.transaction((currentData) => {
                    if (currentData === null) return null;

                    const totalTime = currentData.totalTime || 0;
                    const newTotalTime = totalTime + sessionDuration;
                    const newAvgTime = newTotalTime / currentData.sessions;

                    return {
                        ...currentData,
                        totalTime: newTotalTime,
                        avgTime: newAvgTime
                    };
                });
            } catch (error) {
                console.error('Error al actualizar tiempo:', error);
            }
        });

        // También actualizar cuando el usuario cambia de pestaña
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                const sessionDuration = (Date.now() - this.sessionStart) / 1000 / 60;
                statsRef.transaction((currentData) => {
                    if (currentData === null) return null;

                    const totalTime = currentData.totalTime || 0;
                    const newTotalTime = totalTime + sessionDuration;
                    const newAvgTime = newTotalTime / currentData.sessions;

                    return {
                        ...currentData,
                        totalTime: newTotalTime,
                        avgTime: newAvgTime
                    };
                });
                this.sessionStart = Date.now(); // Reiniciar el tiempo de sesión
            }
        });
    }
}

// Iniciar el tracking cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    new TrackingService();
}); 