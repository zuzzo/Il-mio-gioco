/**
 * Gestisce la geolocalizzazione, l'orientamento e il calcolo delle distanze
 */
class GeoManager {
    constructor() {
        this.currentPosition = null;
        this.savedPosition = null;
        this.currentOrientation = null;
        this.savedOrientation = null;
        this.watchId = null;
        this.isListeningOrientation = false;
    }

    /**
     * Inizializza il gestore di geolocalizzazione
     */
    init() {
        if (!navigator.geolocation) {
            this.updateStatus("Il tuo browser non supporta la geolocalizzazione.");
            return false;
        }
        
        // Verifica il supporto per l'orientamento del dispositivo
        if (window.DeviceOrientationEvent) {
            this.startOrientationTracking();
        } else {
            this.updateStatus("Attenzione: il tuo dispositivo non supporta la rilevazione dell'orientamento.");
        }
        
        return true;
    }

    /**
     * Inizia a monitorare l'orientamento del dispositivo
     */
    startOrientationTracking() {
        if (this.isListeningOrientation) return;

        // Prima verifichiamo se è necessaria un'autorizzazione (iOS 13+)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            this.updateStatus("Richiesta permesso per l'orientamento...");

            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        this.addOrientationListener();
                    } else {
                        this.updateStatus("Permesso per l'orientamento negato.");
                    }
                })
                .catch(error => {
                    console.error("Errore nella richiesta di permesso:", error);
                    // Tentiamo comunque di aggiungere il listener, potrebbe funzionare su altri dispositivi
                    this.addOrientationListener();
                });
        } else {
            // Non è richiesta l'autorizzazione, aggiungiamo direttamente il listener
            this.addOrientationListener();
        }
    }

    /**
     * Aggiunge l'event listener per l'orientamento
     */
    addOrientationListener() {
        window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
        this.isListeningOrientation = true;
    }

    /**
     * Gestisce i dati di orientamento del dispositivo
     * @param {DeviceOrientationEvent} event - Evento di orientamento
     */
    handleOrientation(event) {
        // Alpha: rotazione attorno all'asse z (0-360)
        // Beta: rotazione attorno all'asse x (-180 to 180)
        // Gamma: rotazione attorno all'asse y (-90 to 90)
        this.currentOrientation = {
            alpha: event.alpha, // Direzione bussola (0-360)
            beta: event.beta,   // Inclinazione frontale/posteriore
            gamma: event.gamma  // Inclinazione laterale
        };
    }

    /**
     * Ottiene la posizione attuale
     * @returns {Promise} Promessa con la posizione
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            this.updateStatus("Ottenimento della posizione...");
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    this.updateCoordinates(this.currentPosition);
                    this.updateStatus("Posizione ottenuta con successo!");
                    resolve(this.currentPosition);
                },
                (error) => {
                    let errorMessage;
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Permesso di geolocalizzazione negato.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Posizione non disponibile.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "Timeout nella richiesta di posizione.";
                            break;
                        default:
                            errorMessage = "Errore sconosciuto nella geolocalizzazione.";
                    }
                    this.updateStatus(errorMessage);
                    reject(errorMessage);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Avvia il monitoraggio continuo della posizione
     */
    startPositionWatch() {
        if (this.watchId !== null) return;
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                
                this.updateCoordinates(this.currentPosition);
                
                if (this.savedPosition) {
                    const distance = this.calculateDistance(
                        this.currentPosition.latitude,
                        this.currentPosition.longitude,
                        this.savedPosition.latitude,
                        this.savedPosition.longitude
                    );
                    this.updateDistance(distance);
                    
                    // Calcolare la direzione verso l'oggetto posizionato
                    if (this.savedOrientation) {
                        const bearing = this.calculateBearing(
                            this.currentPosition.latitude,
                            this.currentPosition.longitude,
                            this.savedPosition.latitude,
                            this.savedPosition.longitude
                        );
                        
                        // Calcola la differenza tra la direzione della bussola e la direzione verso l'oggetto
                        // Questo può essere usato per guidare l'utente verso l'oggetto
                        const headingDifference = this.currentOrientation ? 
                            (bearing - this.currentOrientation.alpha + 360) % 360 : 0;
                            
                        // Aggiorniamo l'UI con la direzione
                        this.updateDirection(bearing, headingDifference);
                    }
                }
            },
            (error) => {
                this.updateStatus("Errore durante il monitoraggio della posizione.");
                console.error("Errore di geolocalizzazione:", error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    /**
     * Ferma il monitoraggio della posizione
     */
    stopPositionWatch() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    /**
     * Salva la posizione e l'orientamento correnti
     */
    saveCurrentPositionAndOrientation() {
        if (this.currentPosition) {
            this.savedPosition = {...this.currentPosition};
            
            if (this.currentOrientation) {
                this.savedOrientation = {...this.currentOrientation};
                this.updateStatus(
                    `Oggetto posizionato alle coordinate: ${this.savedPosition.latitude.toFixed(6)}, ${this.savedPosition.longitude.toFixed(6)} ` +
                    `con direzione: ${this.savedOrientation.alpha.toFixed(1)}°`
                );
            } else {
                this.updateStatus(
                    `Oggetto posizionato alle coordinate: ${this.savedPosition.latitude.toFixed(6)}, ${this.savedPosition.longitude.toFixed(6)} ` +
                    `(orientamento non disponibile)`
                );
            }
            
            return {
                position: this.savedPosition,
                orientation: this.savedOrientation
            };
        }
        return null;
    }

    /**
     * Calcola la distanza tra due punti GPS in metri usando la formula di Haversine
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Raggio della Terra in metri
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c; // Distanza in metri
    }
    
    /**
     * Calcola la direzione in gradi da un punto a un altro (bearing)
     * 0° = Nord, 90° = Est, 180° = Sud, 270° = Ovest
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
                
        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360; // Converti in 0-360
        
        return bearing;
    }

    /**
     * Aggiorna lo stato visualizzato
     */
    updateStatus(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    /**
     * Aggiorna le coordinate visualizzate
     */
    updateCoordinates(position) {
        const coordElement = document.getElementById('coordinates');
        if (coordElement && position) {
            coordElement.textContent = `Lat: ${position.latitude.toFixed(6)}, Long: ${position.longitude.toFixed(6)}`;
        }
    }

    /**
     * Aggiorna la distanza visualizzata
     */
    updateDistance(distance) {
        const distElement = document.getElementById('distance');
        if (distElement) {
            distElement.textContent = `Distanza dall'oggetto: ${distance.toFixed(2)} metri`;
            distElement.classList.remove('hidden');
        }
    }
    
    /**
     * Aggiorna la direzione visualizzata
     */
    updateDirection(bearing, headingDifference) {
        const dirElement = document.getElementById('direction');
        if (dirElement) {
            dirElement.textContent = `Direzione oggetto: ${bearing.toFixed(1)}°, Differenza: ${headingDifference.toFixed(1)}°`;
            dirElement.classList.remove('hidden');
            
            // Possiamo usare anche una freccia per indicare la direzione
            const arrowElement = document.getElementById('directionArrow');
            if (arrowElement) {
                arrowElement.style.transform = `rotate(${headingDifference}deg)`;
                arrowElement.classList.remove('hidden');
            }
        }
    }
}

// Esporta la classe
window.GeoManager = GeoManager;