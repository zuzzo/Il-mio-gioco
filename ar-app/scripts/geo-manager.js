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
            this.updateStatus("Ottenimento della posizione...");
            
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
            // Salviamo la posizione corrente senza lo smussamento
            // per avere un punto di riferimento preciso
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
            
            // Aggiungi informazione sulla precisione
            if (position.accuracy) {
                coordElement.textContent += ` (±${position.accuracy.toFixed(1)}m)`;
            }
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
            dirElement.textContent = `Direzione oggetto: ${bearing.toFixed(1)}°`;
            dirElement.classList.remove('hidden');
        }
    }
}

// Esporta la classe
window.GeoManager = GeoManager;