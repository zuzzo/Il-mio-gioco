/**
 * Gestisce la geolocalizzazione e il calcolo delle distanze
 */
class GeoManager {
    constructor() {
        this.currentPosition = null;
        this.savedPosition = null;
        this.watchId = null;
    }

    /**
     * Inizializza il gestore di geolocalizzazione
     */
    init() {
        if (!navigator.geolocation) {
            this.updateStatus("Il tuo browser non supporta la geolocalizzazione.");
            return false;
        }
        return true;
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
     * Salva la posizione corrente
     */
    saveCurrentPosition() {
        if (this.currentPosition) {
            this.savedPosition = {...this.currentPosition};
            this.updateStatus("Oggetto posizionato alle coordinate: " +
                this.savedPosition.latitude.toFixed(6) + ", " + 
                this.savedPosition.longitude.toFixed(6));
            return this.savedPosition;
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
}

// Esporta la classe
window.GeoManager = GeoManager;
