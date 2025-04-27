/**
 * Applicazione principale per AR Geolocalizzata con modalità Piazzamento/Esplorazione
 */
class App {
    constructor() {
        this.geoManager = new GeoManager();
        this.arManager = new ARManager();
        this.initialized = false;
        this.browserInfo = this.detectBrowser();
        this.currentMode = 'placement'; // 'placement' or 'exploration'
        this.placedObjects = []; // Array to store { id, model, position, orientation }
        this.localStorageKey = 'arAppPlacedObjects'; // Key for localStorage

        // --- Elementi UI ---
        this.switchToPlacementBtn = document.getElementById('switchToPlacementBtn');
        this.switchToExplorationBtn = document.getElementById('switchToExplorationBtn');
        this.placementModeUI = document.getElementById('placementModeUI');
        this.explorationModeUI = document.getElementById('explorationModeUI');

        // Placement Mode Elements
        this.placementCanvas = document.getElementById('renderCanvasPlacement');
        this.statusMessagePlacement = document.getElementById('statusMessagePlacement');
        this.coordinatesPlacement = document.getElementById('coordinatesPlacement');
        this.orientationInfoPlacement = document.getElementById('orientationInfoPlacement');
        this.savedDataInfoPlacement = document.getElementById('savedDataInfoPlacement');
        this.modelSelect = document.getElementById('model-select');
        this.customModelInput = document.getElementById('custom-model');
        this.fileUploadDiv = document.querySelector('#placementControls .file-upload');
        this.getLocationBtn = document.getElementById('getLocationBtn');
        this.placeObjectBtn = document.getElementById('placeObjectBtn');
        this.clearDataBtn = document.getElementById('clearDataBtn');
        this.debugBtn = document.getElementById('debugBtn');

        // Exploration Mode Elements
        this.explorationCanvas = document.getElementById('renderCanvasExploration');
        this.startExplorationBtn = document.getElementById('startExplorationBtn');
        this.statusMessageExploration = document.getElementById('statusMessageExploration');
        this.coordinatesExploration = document.getElementById('coordinatesExploration');
        this.distanceExploration = document.getElementById('distanceExploration');
        this.directionExploration = document.getElementById('directionExploration');
        this.directionArrowExploration = document.getElementById('directionArrowExploration');
        this.orientationInfoExploration = document.getElementById('orientationInfoExploration');
        this.savedDataInfoExploration = document.getElementById('savedDataInfoExploration');

        // Dati dell'applicazione
        this.selectedModelPath = this.modelSelect ? this.modelSelect.value : 'assets/models/treasure.glb';
        this.customModelUrl = null;
        this.orientationInterval = null; // Per gestire l'intervallo di aggiornamento orientamento
    }

    /**
     * Cambia la modalità attiva dell'applicazione
     * @param {'placement' | 'exploration'} newMode
     */
    async switchMode(newMode) {
        if (this.currentMode === newMode || !this.initialized) return;

        this.currentMode = newMode;
        console.log(`Switching to ${newMode} mode`);

        // Aggiorna UI containers
        this.placementModeUI.classList.toggle('active', newMode === 'placement');
        this.explorationModeUI.classList.toggle('active', newMode === 'exploration');

        // Aggiorna bottoni modalità
        this.switchToPlacementBtn.classList.toggle('active', newMode === 'placement');
        this.switchToExplorationBtn.classList.toggle('active', newMode === 'exploration');

        // Ferma eventuali esperienze AR o camera attive
        await this.arManager.stopARExperience(); // Ferma AR immersiva se attiva
        this.arManager.stopCameraFeed(); // Ferma feed camera se attivo

        // Logica specifica per il cambio modalità
        if (newMode === 'placement') {
            this.explorationCanvas.classList.add('hidden');
            this.placementCanvas.classList.remove('hidden');
            await this.arManager.startCameraFeed(this.placementCanvas); // Avvia camera per piazzamento
            this.showStatus("Modalità Piazzamento Attiva", 'placement');
            this.geoManager.startPositionWatch(); // Assicurati che il GPS sia attivo
            this.startOrientationDisplay(); // Riavvia display orientamento per UI corretta
        } else { // newMode === 'exploration'
            this.placementCanvas.classList.add('hidden');
            this.showStatus("Modalità Esplorazione Attiva. Premi 'Avvia Esplorazione AR'.", 'exploration');
            // Non avviamo AR immersiva qui, ma al click del bottone
            this.startOrientationDisplay(); // Riavvia display orientamento per UI corretta
        }

        this.updatePlacedObjectsInfo();
    }

    /**
     * Aggiorna le informazioni UI sul numero di oggetti piazzati
     */
    updatePlacedObjectsInfo() {
        const count = this.placedObjects.length;
        const message = `Oggetti piazzati: ${count}`;
        if (this.savedDataInfoPlacement) {
            this.savedDataInfoPlacement.textContent = message;
            this.savedDataInfoPlacement.classList.toggle('hidden', count === 0);
        }
        if (this.savedDataInfoExploration) {
            this.savedDataInfoExploration.textContent = message;
            this.savedDataInfoExploration.classList.toggle('hidden', count === 0);
        }
        if (this.startExplorationBtn) {
            this.startExplorationBtn.disabled = count === 0;
        }
        if (this.clearDataBtn) {
             this.clearDataBtn.disabled = count === 0;
        }
    }

    /** Rileva il browser in uso (invariato) */
    detectBrowser() {
        const userAgent = navigator.userAgent;
        let browserName = "Unknown";
        let isCompatible = false;
        if (userAgent.match(/chrome|chromium|crios/i)) { browserName = "Chrome"; isCompatible = true; }
        else if (userAgent.indexOf("Edg") != -1) { browserName = "Edge"; isCompatible = true; }
        else if (userAgent.match(/firefox|fxios/i)) { browserName = "Firefox"; isCompatible = false; }
        else if (userAgent.match(/safari/i) && !userAgent.match(/chrome|chromium|crios/i)) { browserName = "Safari"; isCompatible = false; }
        else if (userAgent.match(/opr\//i)) { browserName = "Opera"; isCompatible = true; }
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        return { name: browserName, isCompatible: isCompatible, isMobile: isMobile, userAgent: userAgent };
    }

    /** Verifica e richiede tutti i permessi necessari (invariato) */
    async requestAllPermissions() {
        try {
            const permissionResults = [];
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const geoPermission = await navigator.permissions.query({name: 'geolocation'});
                    permissionResults.push(`Geolocalizzazione: ${geoPermission.state}`);
                    if (geoPermission.state === 'prompt') {
                        await new Promise((resolve) => { navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false), { timeout: 10000 }); });
                    }
                } catch (e) { permissionResults.push(`Geolocalizzazione: errore (${e.message})`); }
            }
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try { await navigator.mediaDevices.getUserMedia({video: true}); permissionResults.push("Fotocamera: concesso"); }
                catch (e) { permissionResults.push(`Fotocamera: negato (${e.message})`); }
            } else { permissionResults.push("Fotocamera: API non supportata"); }
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                try { const permission = await DeviceOrientationEvent.requestPermission(); permissionResults.push(`Orientamento: ${permission}`); }
                catch (e) { permissionResults.push(`Orientamento: errore (${e.message})`); }
            } else { permissionResults.push("Orientamento: non richiede permesso esplicito"); }
            console.log("Stato permessi:", permissionResults.join(", "));
            return permissionResults;
        } catch (error) { console.error("Errore nella richiesta dei permessi:", error); return [`Errore generale: ${error.message}`]; }
    }

    /** Genera informazioni di debug (modificato per includere numero oggetti) */
    generateDebugInfo() {
        return {
            browser: this.browserInfo.name,
            userAgent: navigator.userAgent,
            isMobile: this.browserInfo.isMobile,
            webxrSupported: (navigator.xr !== undefined) ? 'Sì' : 'No',
            geolocationSupported: (navigator.geolocation !== undefined) ? 'Sì' : 'No',
            deviceOrientationSupported: (window.DeviceOrientationEvent !== undefined) ? 'Sì' : 'No',
            https: location.protocol === 'https:' ? 'Sì' : 'No',
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            devicePixelRatio: window.devicePixelRatio || 1,
            localStorage: (window.localStorage !== undefined) ? 'Disponibile' : 'Non disponibile',
            placedObjectsCount: this.placedObjects.length,
            localStorageStatus: localStorage.getItem(this.localStorageKey) ? 'Presente' : 'Assente'
        };
    }

    /** Mostra le informazioni di debug (invariato) */
    showDebugInfo() {
        const debugInfo = this.generateDebugInfo();
        let debugText = "INFORMAZIONI DI DEBUG:\n\n";
        for (const [key, value] of Object.entries(debugInfo)) { debugText += `${key}: ${value}\n`; }
        alert(debugText); console.table(debugInfo);
    }

    /** Verifica se l'AR è supportata (invariato, ma il messaggio potrebbe essere aggiornato) */
    checkARSupport() {
        // ... (codice invariato, ma potremmo voler mostrare il banner solo se si tenta di avviare l'esplorazione AR)
        return true; // Assumiamo supportato per ora, la vera verifica avviene in ARManager
    }

    /**
     * Inizializza l'applicazione
     */
    async init() {
        try {
            this.checkARSupport(); // Mostra banner se incompatibile

            // Inizializza GeoManager con callbacks per aggiornare UI
            const geoSupported = this.geoManager.init(
                (message) => this.showStatus(message, this.currentMode),
                (position) => this.updateCoordinatesDisplay(position),
                (orientation) => this.updateOrientationDisplay(orientation) // Passa callback orientamento
            );
            if (!geoSupported) {
                this.showStatus("Geolocalizzazione non supportata", this.currentMode);
                return;
            }

            await this.requestAllPermissions(); // Richiedi permessi

            // Inizializza ARManager ora con il canvas giusto
            // Per Placement mode usiamo placementCanvas
            // Per Exploration mode usiamo explorationCanvas
            const arSupported = await this.arManager.init(
                this.placementCanvas, 
                this.explorationCanvas
            );
            
            // Assicurati che i canvas abbiano le giuste dimensioni
            this.placementCanvas.width = window.innerWidth;
            this.placementCanvas.height = window.innerHeight * 0.75;
            this.explorationCanvas.width = window.innerWidth;
            this.explorationCanvas.height = window.innerHeight;
            if (!arSupported) {
                this.showStatus("Realtà aumentata WebXR non supportata.", this.currentMode);
                // Disabilita modalità esplorazione se AR non supportata?
                if(this.switchToExplorationBtn) this.switchToExplorationBtn.disabled = true;
                if(this.startExplorationBtn) this.startExplorationBtn.disabled = true;
            }

            this.loadSavedData(); // Carica oggetti piazzati
            this.setupEventListeners(); // Configura listener pulsanti
            this.startOrientationDisplay(); // Avvia display orientamento iniziale

            // Avvia la camera per la modalità piazzamento iniziale
            // Assicurati che il canvas sia pronto prima di avviare
            if (this.placementCanvas) {
                this.placementCanvas.width = window.innerWidth;
                this.placementCanvas.height = window.innerHeight * 0.75;
                await this.switchMode('placement'); // Attiva la modalità iniziale (placement)
            } else {
                console.error("Placement canvas non trovato!");
                this.showStatus("Errore: Canvas non disponibile", 'placement');
            }

            this.initialized = true;
            this.showStatus("Sistema pronto. Ottieni la posizione per iniziare a piazzare oggetti.", 'placement');

        } catch (error) {
            console.error("Errore nell'inizializzazione:", error);
            this.showStatus("Errore durante l'inizializzazione: " + error.message, this.currentMode);
        }
    }

    /**
     * Carica gli oggetti salvati dal localStorage
     */
    loadSavedData() {
        try {
            const savedData = localStorage.getItem(this.localStorageKey);
            if (savedData) {
                this.placedObjects = JSON.parse(savedData);
                console.log(`Caricati ${this.placedObjects.length} oggetti dal localStorage.`);
            } else {
                this.placedObjects = [];
            }
        } catch (error) {
            console.error("Errore nel caricamento dei dati salvati:", error);
            this.placedObjects = [];
            localStorage.removeItem(this.localStorageKey); // Rimuovi dati corrotti
        }
        this.updatePlacedObjectsInfo(); // Aggiorna UI
    }

    /**
     * Salva l'array di oggetti piazzati nel localStorage
     */
    saveDataToLocalStorage() {
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(this.placedObjects));
            console.log(`Salvati ${this.placedObjects.length} oggetti nel localStorage.`);
        } catch (error) {
            console.error("Errore nel salvataggio dei dati nel localStorage:", error);
            this.showStatus("Errore durante il salvataggio dei dati.", this.currentMode);
        }
        this.updatePlacedObjectsInfo(); // Aggiorna UI
    }

    /**
     * Cancella tutti gli oggetti piazzati
     */
    clearSavedData() {
        if (confirm(`Sei sicuro di voler cancellare tutti i ${this.placedObjects.length} oggetti piazzati?`)) {
            this.placedObjects = [];
            localStorage.removeItem(this.localStorageKey);
            this.showStatus("Tutti gli oggetti piazzati sono stati cancellati.", this.currentMode);
            this.saveDataToLocalStorage(); // Salva l'array vuoto e aggiorna UI
        }
    }

    /**
     * Avvia/Aggiorna il display delle informazioni di orientamento
     */
    startOrientationDisplay() {
        if (this.orientationInterval) {
            clearInterval(this.orientationInterval); // Pulisci intervallo precedente
        }
        this.orientationInterval = setInterval(() => {
            if (this.geoManager.currentOrientation) {
                this.updateOrientationDisplay(this.geoManager.currentOrientation);
            }
        }, 200);
    }

    /** Helper: Aggiorna UI Orientamento */
    updateOrientationDisplay(orientation) {
        if (!orientation) return;
        const message = `Bussola: ${orientation.alpha.toFixed(1)}° | Incl: ${orientation.beta.toFixed(1)}°/${orientation.gamma.toFixed(1)}°`;
        const element = this.currentMode === 'placement' ? this.orientationInfoPlacement : this.orientationInfoExploration;
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
        // Aggiorna freccia in modalità esplorazione (se attiva)
        if (this.currentMode === 'exploration' && this.directionArrowExploration) {
             // TODO: Calcolare headingDifference rispetto all'oggetto più vicino?
             // Per ora, la freccia non viene aggiornata qui.
        }
    }

     /** Helper: Aggiorna UI Coordinate */
     updateCoordinatesDisplay(position) {
        if (!position) return;
        const message = `Lat: ${position.latitude.toFixed(6)}, Long: ${position.longitude.toFixed(6)} (Acc: ${position.accuracy.toFixed(1)}m)`;
        const element = this.currentMode === 'placement' ? this.coordinatesPlacement : this.coordinatesExploration;
         if (element) {
            element.textContent = message;
        }
     }

    /**
     * Configura i listener degli eventi
     */
    setupEventListeners() {
        // Cambio Modalità
        this.switchToPlacementBtn.addEventListener('click', () => this.switchMode('placement'));
        this.switchToExplorationBtn.addEventListener('click', () => this.switchMode('exploration'));

        // --- Placement Mode Listeners ---
        this.getLocationBtn.addEventListener('click', async () => {
            try {
                this.showStatus("Ottenimento posizione...", 'placement');
                await this.geoManager.getCurrentPosition();
                this.placeObjectBtn.disabled = false; // Abilita piazzamento dopo aver ottenuto la pos.
                this.geoManager.startPositionWatch(); // Inizia a monitorare
                this.showStatus("Posizione ottenuta. Pronto a piazzare.", 'placement');
            } catch (error) {
                console.error(error);
                this.showStatus(`Errore posizione: ${error}`, 'placement');
            }
        });

        if (this.modelSelect) {
            this.modelSelect.addEventListener('change', () => {
                this.selectedModelPath = this.modelSelect.value;
                this.fileUploadDiv.classList.toggle('hidden', this.selectedModelPath !== 'assets/models/custom.glb');
            });
        }

        if (this.customModelInput) {
            this.customModelInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file && file.name.toLowerCase().endsWith('.glb')) {
                    this.customModelUrl = URL.createObjectURL(file);
                    this.showStatus(`Modello personalizzato caricato: ${file.name}`, 'placement');
                } else {
                    this.customModelUrl = null;
                    this.showStatus("Seleziona un file .glb valido.", 'placement');
                    this.customModelInput.value = ''; // Resetta input
                }
            });
        }

        this.placeObjectBtn.addEventListener('click', () => {
            const currentPosition = this.geoManager.currentPosition;
            const currentOrientation = this.geoManager.currentOrientation;

            if (!currentPosition) {
                this.showStatus("Posizione GPS non ancora disponibile.", 'placement');
                return;
            }
             if (!currentOrientation) {
                this.showStatus("Orientamento non ancora disponibile.", 'placement');
                // Potremmo decidere di piazzare comunque con orientamento default?
                // return;
            }

            let modelToPlace = this.selectedModelPath;
            if (modelToPlace === 'assets/models/custom.glb') {
                if (this.customModelUrl) {
                    modelToPlace = this.customModelUrl; // Usa l'URL oggetto caricato
                    // Nota: questo URL è temporaneo. Per salvare permanentemente,
                    // servirebbe caricare il file su server o usare IndexedDB.
                    // Per ora, funzionerà solo nella sessione corrente.
                    console.warn("Piazzamento di modello custom tramite Object URL. Non persisterà tra le sessioni.");
                } else {
                    this.showStatus("Seleziona un file .glb personalizzato prima di piazzare.", 'placement');
                    return;
                }
            }

            const newObject = {
                id: Date.now(), // ID univoco semplice
                model: modelToPlace,
                position: { ...currentPosition },
                // Salva una copia dell'orientamento, o un default se non disponibile
                orientation: currentOrientation ? { ...currentOrientation } : { alpha: 0, beta: 0, gamma: 0 }
            };

            this.placedObjects.push(newObject);
            this.saveDataToLocalStorage(); // Salva l'array aggiornato

            this.showStatus(`Oggetto ${this.placedObjects.length} (${newObject.model.split('/').pop()}) piazzato!`, 'placement');
        });

        if (this.clearDataBtn) {
            this.clearDataBtn.addEventListener('click', () => this.clearSavedData());
        }

        if (this.debugBtn) {
            this.debugBtn.addEventListener('click', () => this.showDebugInfo());
        }

        // --- Exploration Mode Listeners ---
        this.startExplorationBtn.addEventListener('click', async () => {
            if (this.placedObjects.length === 0) {
                this.showStatus("Nessun oggetto da esplorare. Piazzane qualcuno prima!", 'exploration');
                return;
            }

            this.showStatus("Avvio AR...", 'exploration');
            // Assicurati che il canvas AR abbia le dimensioni corrette
            this.explorationCanvas.width = window.innerWidth;
            this.explorationCanvas.height = window.innerHeight;
            this.explorationCanvas.classList.remove('hidden');

            try {
                // Ferma camera feed piazzamento se ancora attiva
                this.arManager.stopCameraFeed();

                // Avvia esperienza AR immersiva
                const arStarted = await this.arManager.startARExperience(this.explorationCanvas);

                if (!arStarted) {
                    this.showStatus("Impossibile avviare AR. Verifica supporto WebXR.", 'exploration');
                    this.explorationCanvas.classList.add('hidden');
                    this.showFallbackOptions(); // Mostra opzioni alternative
                } else {
                    this.showStatus(`AR avviata! Cerca ${this.placedObjects.length} oggetti.`, 'exploration');

                    // Carica tutti gli oggetti piazzati nella scena AR
                    await this.arManager.placeMultipleVirtualObjects(this.placedObjects);

                    // Avvia aggiornamenti posizione oggetti AR
                    this.startARUpdates();
                }
            } catch (error) {
                console.error("Errore nell'avvio dell'AR:", error);
                this.showStatus("Errore avvio AR: " + error.message, 'exploration');
                this.explorationCanvas.classList.add('hidden');
                this.showFallbackOptions();
            }
        });
    }

    /**
     * Mostra opzioni alternative quando AR non è disponibile (modificato per usare dati array)
     */
    showFallbackOptions() {
        // Rimuovi eventuali fallback precedenti
        const existingFallback = document.querySelector('.fallback-options');
        if (existingFallback) existingFallback.remove();

        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'fallback-options';
        let content = `<h3>AR non disponibile</h3>
                       <p>La realtà aumentata non è disponibile o non è stato possibile avviarla.</p>`;

        if (this.placedObjects.length > 0) {
            const firstObject = this.placedObjects[0]; // Mostra info del primo oggetto come esempio
             content += `<p>Oggetti piazzati: ${this.placedObjects.length}</p>
                        <p>Primo oggetto a: ${firstObject.position.latitude.toFixed(6)}, ${firstObject.position.longitude.toFixed(6)}</p>
                        <button id="openMapFallback">Apri Mappa (Primo Oggetto)</button>`;
        } else {
             content += `<p>Nessun oggetto piazzato.</p>`;
        }
        content += `<button id="closeFallback">Chiudi</button>`;
        fallbackDiv.innerHTML = content;

        document.body.appendChild(fallbackDiv);

        document.getElementById('closeFallback').addEventListener('click', () => fallbackDiv.remove());

        const openMapBtn = document.getElementById('openMapFallback');
        if (openMapBtn) {
            openMapBtn.addEventListener('click', () => {
                const lat = this.placedObjects[0].position.latitude;
                const lng = this.placedObjects[0].position.longitude;
                window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
            });
        }
    }

    /**
     * Avvia gli aggiornamenti continui per l'esperienza AR (modificato per multipli oggetti)
     */
    startARUpdates() {
        // Aggiorna la posizione degli oggetti ogni 500ms
        const updateInterval = setInterval(() => {
            // Ferma se non siamo più in modalità AR o esplorazione
            if (this.currentMode !== 'exploration' || !this.arManager.isARMode) {
                clearInterval(updateInterval);
                console.log("AR Updates stopped.");
                return;
            }

            // Verifica che ci siano dati GPS
            if (!this.geoManager.currentPosition || this.placedObjects.length === 0) {
                return;
            }

            // Ottiene l'orientamento attuale del dispositivo
            const currentDeviceHeading = this.geoManager.currentOrientation ? this.geoManager.currentOrientation.alpha : 0;

            // Aggiorna la posizione di tutti gli oggetti nella scena AR
            this.arManager.updateMultipleObjectPositions(
                this.placedObjects,
                this.geoManager.currentPosition,
                currentDeviceHeading,
                this.geoManager // Passa geoManager per usare i suoi metodi di calcolo
            );

            // TODO: Aggiornare UI distanza/direzione (es. all'oggetto più vicino)
            // let nearestObject = this.findNearestObject();
            // if(nearestObject) { ... updateDistanceDisplay(nearestObject.distance) ... }

        }, 500); // Intervallo di aggiornamento
    }

    /**
     * Mostra un messaggio di stato nell'UI della modalità specificata
     * @param {string} message - Messaggio da mostrare
     * @param {'placement' | 'exploration'} mode - Modalità target
     */
    showStatus(message, mode = this.currentMode) {
        const statusElement = mode === 'placement' ? this.statusMessagePlacement : this.statusMessageExploration;
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log(`Status (${mode}):`, message);
    }
}

// Avvia l'applicazione quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
