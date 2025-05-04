/**
 * Gestisce la geolocalizzazione, l'orientamento, il calcolo delle distanze
 * e l'identificazione degli oggetti vicini.
 */
class GeoManager {
    constructor(app) { // Aggiunto riferimento all'app principale
        this.app = app; // Memorizza riferimento all'app
        this.currentPosition = null;
        this.currentOrientation = null;
        this.watchId = null;
        this.isListeningOrientation = false;

        // Variabili per migliorare la stabilità
        this.positionHistory = [];
        this.orientationHistory = [];
        this.maxHistoryLength = 5; // Numero di letture da memorizzare per smussare
        this.historyWeight = 0.7; // Peso per le letture recenti vs quelle vecchie
    }

    /**
     * Inizializza il gestore di geolocalizzazione
     */
    init() {
        if (!navigator.geolocation) {
            console.error("Il browser non supporta la geolocalizzazione");
            return false;
        }

        // Verifica il supporto per l'orientamento del dispositivo
        if (window.DeviceOrientationEvent) {
            this.startOrientationTracking();
        } else {
            console.warn("Il dispositivo non supporta la rilevazione dell'orientamento");
        }

        // Avvia il monitoraggio della posizione
        this.startPositionWatch();

        return true;
    }

    /**
     * Inizia a monitorare l'orientamento del dispositivo
     */
    startOrientationTracking() {
        if (this.isListeningOrientation) return;

        // Verifichiamo se è necessaria un'autorizzazione (iOS 13+)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log("Richiesta permesso per l'orientamento...");

            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        this.addOrientationListener();
                    } else {
                        console.warn("Permesso per l'orientamento negato");
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
        console.log("Monitoraggio orientamento avviato");
    }

    /**
     * Gestisce i dati di orientamento del dispositivo
     * @param {DeviceOrientationEvent} event - Evento di orientamento
     */
    handleOrientation(event) {
        // Alpha: rotazione attorno all'asse z (0-360)
        // Beta: rotazione attorno all'asse x (-180 to 180)
        // Gamma: rotazione attorno all'asse y (-90 to 90)

        // Dati grezzi dell'orientamento
        const rawOrientation = {
            alpha: event.alpha, // Direzione bussola (0-360)
            beta: event.beta,   // Inclinazione frontale/posteriore
            gamma: event.gamma  // Inclinazione laterale
        };

        // Aggiungi alla cronologia e mantieni la lunghezza massima
        this.orientationHistory.unshift(rawOrientation);
        if (this.orientationHistory.length > this.maxHistoryLength) {
            this.orientationHistory.pop();
        }

        // Calcola l'orientamento smussato
        this.currentOrientation = this.calculateSmoothedOrientation();
    }

    /**
     * Calcola l'orientamento smussato dalla cronologia
     */
    calculateSmoothedOrientation() {
        if (this.orientationHistory.length === 0) {
            return null;
        }

        // Se c'è solo una lettura, usala direttamente
        if (this.orientationHistory.length === 1) {
            return {...this.orientationHistory[0]};
        }

        // Inizializza con valori zero
        let alphaSin = 0, alphaCos = 0;
        let betaSum = 0, gammaSum = 0;
        let totalWeight = 0;

        // Calcola la media pesata, dando più peso alle letture recenti
        this.orientationHistory.forEach((reading, index) => {
            // Peso decrescente per le letture più vecchie
            const weight = Math.pow(this.historyWeight, index);
            totalWeight += weight;

            // Per alpha (direzione bussola) dobbiamo usare seno e coseno per gestire il wrap-around a 360°
            const alphaRad = (reading.alpha * Math.PI) / 180;
            alphaSin += Math.sin(alphaRad) * weight;
            alphaCos += Math.cos(alphaRad) * weight;

            // Per beta e gamma possiamo usare medie normali
            betaSum += reading.beta * weight;
            gammaSum += reading.gamma * weight;
        });

        // Normalizza e converti indietro
        alphaSin /= totalWeight;
        alphaCos /= totalWeight;
        const alphaSmoothed = (Math.atan2(alphaSin, alphaCos) * 180 / Math.PI + 360) % 360;

        betaSum /= totalWeight;
        gammaSum /= totalWeight;

        return {
            alpha: alphaSmoothed,
            beta: betaSum,
            gamma: gammaSum
        };
    }

    /**
     * Ottiene la posizione attuale
     * @returns {Promise} Promessa con la posizione
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            console.log("Ottenimento della posizione...");

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const rawPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };

                    // Aggiungi alla cronologia delle posizioni
                    this.positionHistory.unshift(rawPosition);
                    if (this.positionHistory.length > this.maxHistoryLength) {
                        this.positionHistory.pop();
                    }

                    // Calcola la posizione smussata
                    this.currentPosition = this.calculateSmoothedPosition();

                    console.log("Posizione ottenuta con successo!");
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
                    console.error(errorMessage);
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
     * Calcola la posizione smussata dalla cronologia
     */
    calculateSmoothedPosition() {
        if (this.positionHistory.length === 0) {
            return null;
        }

        // Se c'è solo una lettura, usala direttamente
        if (this.positionHistory.length === 1) {
            return {...this.positionHistory[0]};
        }

        // Filtra le posizioni con precisione molto scarsa
        const maxAcceptableAccuracy = 100; // metri
        const filteredPositions = this.positionHistory.filter(
            pos => pos.accuracy <= maxAcceptableAccuracy
        );

        // Se non ci sono posizioni valide, usa la più recente
        if (filteredPositions.length === 0) {
            return {...this.positionHistory[0]};
        }

        // Inizializza con zero
        let latSum = 0, lonSum = 0, accSum = 0;
        let totalWeight = 0;

        // Calcola la media pesata, dando più peso alle letture recenti e precise
        filteredPositions.forEach((reading, index) => {
            // Peso basato su recenza e precisione
            const recencyWeight = Math.pow(this.historyWeight, index);
            const accuracyWeight = 1 / (reading.accuracy + 1); // +1 per evitare divisione per zero
            const weight = recencyWeight * accuracyWeight;

            totalWeight += weight;
            latSum += reading.latitude * weight;
            lonSum += reading.longitude * weight;
            accSum += reading.accuracy * weight;
        });

        // Normalizza
        latSum /= totalWeight;
        lonSum /= totalWeight;
        accSum /= totalWeight;

        return {
            latitude: latSum,
            longitude: lonSum,
            accuracy: accSum,
            timestamp: Date.now()
        };
    }

    /**
     * Avvia il monitoraggio continuo della posizione
     */
    startPositionWatch() {
        if (this.watchId !== null) return;

        console.log("Monitoraggio posizione attivo...");

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const rawPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                // Aggiungi alla cronologia
                this.positionHistory.unshift(rawPosition);
                if (this.positionHistory.length > this.maxHistoryLength) {
                    this.positionHistory.pop();
                }

                // Applica lo smussamento
                this.currentPosition = this.calculateSmoothedPosition();
            },
            (error) => {
                console.error("Errore durante il monitoraggio della posizione:", error);
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
            console.log("Monitoraggio posizione fermato");
        }
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
     * @param {number} lat1 - Latitudine punto di partenza
     * @param {number} lon1 - Longitudine punto di partenza
     * @param {number} lat2 - Latitudine punto di destinazione
     * @param {number} lon2 - Longitudine punto di destinazione
     * @returns {number} Direzione in gradi
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
     * Calcola la distanza in metri tra due latitudini
     * @param {number} lat1 - Latitudine punto 1
     * @param {number} lat2 - Latitudine punto 2
     * @returns {number} Distanza in metri
     */
    calculateLatitudeDistance(lat1, lat2) {
        const R = 6371000; // Raggio della Terra in metri
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;

        return R * (φ2 - φ1);
    }

    /**
     * Calcola la distanza in metri tra due longitudini
     * @param {number} lon1 - Longitudine punto 1
     * @param {number} lon2 - Longitudine punto 2
     * @param {number} lat - Latitudine del punto (necessaria per il calcolo)
     * @returns {number} Distanza in metri
     */
    calculateLongitudeDistance(lon1, lon2, lat) {
        const R = 6371000; // Raggio della Terra in metri
        const φ = lat * Math.PI / 180; // Latitudine in radianti
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        return R * Math.cos(φ) * Δλ;
    }

    /**
     * Ottiene gli oggetti salvati che si trovano entro una certa distanza dalla posizione attuale.
     * @param {number} maxDistance - La distanza massima in metri per considerare un oggetto "visibile".
     * @returns {Array} Lista di oggetti visibili (con aggiunta della proprietà 'distance').
     */
    getVisibleObjects(maxDistance = 10) { // Impostato default a 10 metri
        if (!this.currentPosition || !this.app || !this.app.storageManager) {
            console.warn("Posizione attuale o storageManager non disponibili per getVisibleObjects.");
            return [];
        }

        const allObjects = this.app.storageManager.getAllObjects();
        const visibleObjects = [];

        allObjects.forEach(obj => {
            // Assicurati che l'oggetto abbia una posizione salvata
            if (obj.position && typeof obj.position.latitude === 'number' && typeof obj.position.longitude === 'number') {
                const distance = this.calculateDistance(
                    this.currentPosition.latitude,
                    this.currentPosition.longitude,
                    obj.position.latitude,
                    obj.position.longitude
                );

                if (distance <= maxDistance) {
                    visibleObjects.push({
                        ...obj,
                        distance // Aggiunge la distanza calcolata all'oggetto
                    });
                }
            } else {
                console.warn(`Oggetto con ID ${obj.id} non ha dati di posizione validi.`);
            }
        });

        // Ordina per distanza (opzionale, ma utile)
        visibleObjects.sort((a, b) => a.distance - b.distance);

        return visibleObjects;
    }
}

// Esporta la classe
window.GeoManager = GeoManager;
