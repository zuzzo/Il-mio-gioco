/**
 * Gestisce la geolocalizzazione, l'orientamento e il calcolo delle distanze.
 * Utilizza callbacks per comunicare con l'applicazione principale.
 */
class GeoManager {
    constructor() {
        this.currentPosition = null; // { latitude, longitude, accuracy }
        this.currentOrientation = null; // { alpha, beta, gamma }
        this.watchId = null;
        this.isListeningOrientation = false;

        // Callbacks per aggiornare l'UI (verranno impostate da App.js)
        this.onStatusUpdate = (message) => console.log("GeoStatus:", message); // Default logger
        this.onPositionUpdate = (position) => {};
        this.onOrientationUpdate = (orientation) => {};
    }

    /**
     * Inizializza il gestore di geolocalizzazione e orientamento.
     * @param {function(string)} statusCallback - Funzione per aggiornare lo stato.
     * @param {function(object)} positionCallback - Funzione per aggiornare le coordinate.
     * @param {function(object)} orientationCallback - Funzione per aggiornare l'orientamento.
     */
    init(statusCallback, positionCallback, orientationCallback) {
        if (statusCallback) this.onStatusUpdate = statusCallback;
        if (positionCallback) this.onPositionUpdate = positionCallback;
        if (orientationCallback) this.onOrientationUpdate = orientationCallback;

        if (!navigator.geolocation) {
            this.onStatusUpdate("Il tuo browser non supporta la geolocalizzazione.");
            return false;
        }

        // Verifica e avvia il monitoraggio dell'orientamento
        if (window.DeviceOrientationEvent) {
            this.startOrientationTracking();
        } else {
            this.onStatusUpdate("Attenzione: il tuo dispositivo non supporta la rilevazione dell'orientamento.");
        }

        return true;
    }

    /**
     * Inizia a monitorare l'orientamento del dispositivo
     */
    startOrientationTracking() {
        if (this.isListeningOrientation) return;

        const handlePermission = (permissionState) => {
            if (permissionState === 'granted') {
                this.addOrientationListener();
                this.onStatusUpdate("Permesso orientamento concesso.");
            } else {
                this.onStatusUpdate("Permesso per l'orientamento negato.");
            }
        };

        // Verifica se è necessaria un'autorizzazione (iOS 13+)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            // Controlla lo stato attuale del permesso prima di richiederlo
            // Nota: Questa API è sperimentale e potrebbe non essere standard
            if (navigator.permissions && navigator.permissions.query) {
                 navigator.permissions.query({ name: 'accelerometer' }) // Usa un sensore correlato
                    .then(result => {
                        if (result.state === 'granted') {
                             this.addOrientationListener();
                        } else if (result.state === 'prompt') {
                             DeviceOrientationEvent.requestPermission().then(handlePermission).catch(err => console.error(err));
                        } else { // denied
                             this.onStatusUpdate("Permesso per l'orientamento negato.");
                        }
                    }).catch(e => {
                         // Fallback se query non supportata per accelerometer
                         console.warn("Query permesso sensore non supportata, richiedo direttamente orientamento.");
                         DeviceOrientationEvent.requestPermission().then(handlePermission).catch(err => console.error(err));
                    });
            } else {
                 // Fallback se Permissions API non supportata per sensori
                 DeviceOrientationEvent.requestPermission().then(handlePermission).catch(err => console.error(err));
            }

        } else {
            // Non è richiesta l'autorizzazione, aggiungiamo direttamente il listener
            this.addOrientationListener();
        }
    }

    /**
     * Aggiunge l'event listener per l'orientamento
     */
    addOrientationListener() {
        if (this.isListeningOrientation) return;
        window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
        this.isListeningOrientation = true;
        console.log("Orientation listener added.");
    }

    /**
     * Gestisce i dati di orientamento del dispositivo
     * @param {DeviceOrientationEvent} event - Evento di orientamento
     */
    handleOrientation(event) {
        // Arrotonda i valori per ridurre le fluttuazioni minori
        const alpha = event.alpha ? Math.round(event.alpha * 10) / 10 : 0;
        const beta = event.beta ? Math.round(event.beta * 10) / 10 : 0;
        const gamma = event.gamma ? Math.round(event.gamma * 10) / 10 : 0;

        // Aggiorna solo se c'è una differenza significativa per evitare troppi update
        if (!this.currentOrientation ||
            Math.abs(alpha - this.currentOrientation.alpha) > 0.5 ||
            Math.abs(beta - this.currentOrientation.beta) > 0.5 ||
            Math.abs(gamma - this.currentOrientation.gamma) > 0.5)
        {
            this.currentOrientation = { alpha, beta, gamma };
            this.onOrientationUpdate(this.currentOrientation); // Notifica l'app
        }
    }

    /**
     * Ottiene la posizione attuale
     * @returns {Promise<object>} Promessa con la posizione { latitude, longitude, accuracy }
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            this.onStatusUpdate("Ottenimento della posizione...");

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    this.onPositionUpdate(this.currentPosition); // Notifica l'app
                    this.onStatusUpdate(`Posizione ottenuta (Acc: ${this.currentPosition.accuracy.toFixed(1)}m)`);
                    resolve(this.currentPosition);
                },
                (error) => {
                    let errorMessage;
                    switch(error.code) {
                        case error.PERMISSION_DENIED: errorMessage = "Permesso geolocalizzazione negato."; break;
                        case error.POSITION_UNAVAILABLE: errorMessage = "Posizione non disponibile."; break;
                        case error.TIMEOUT: errorMessage = "Timeout richiesta posizione."; break;
                        default: errorMessage = "Errore sconosciuto geolocalizzazione.";
                    }
                    this.onStatusUpdate(errorMessage);
                    console.error("Geolocation error:", error);
                    reject(errorMessage);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // Timeout aumentato
            );
        });
    }

    /**
     * Avvia il monitoraggio continuo della posizione
     */
    startPositionWatch() {
        if (this.watchId !== null) {
            console.log("Position watch already active.");
            return;
        }

        this.onStatusUpdate("Avvio monitoraggio posizione...");
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                this.onPositionUpdate(this.currentPosition); // Notifica l'app

                // Potremmo aggiungere qui logica per calcolare distanza/direzione
                // all'oggetto più vicino e notificarlo tramite un'altra callback,
                // ma per ora lo lasciamo fare ad App.js nel suo loop di update AR.
            },
            (error) => {
                this.onStatusUpdate("Errore durante il monitoraggio della posizione.");
                console.error("Errore watchPosition:", error);
                // Tentiamo di riavviare? O fermiamo? Per ora fermiamo.
                this.stopPositionWatch();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 } // maximumAge > 0 per usare cache
        );
        console.log("Position watch started (ID:", this.watchId, ")");
    }

    /**
     * Ferma il monitoraggio della posizione
     */
    stopPositionWatch() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            console.log("Position watch stopped (ID:", this.watchId, ")");
            this.watchId = null;
            this.onStatusUpdate("Monitoraggio posizione fermato.");
        }
    }

    /**
     * Calcola la distanza tra due punti GPS in metri usando la formula di Haversine
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
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
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
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

    // Metodi rimossi: saveCurrentPositionAndOrientation, updateStatus, updateCoordinates, updateDistance, updateDirection
    // La logica di salvataggio è ora in App.js
    // Gli aggiornamenti UI avvengono tramite le callbacks fornite in init()
}

// Esporta la classe (se necessario nel contesto globale)
window.GeoManager = GeoManager;
