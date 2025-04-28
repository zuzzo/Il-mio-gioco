/**
 * Applicazione principale per AR Geolocalizzata
 */
class App {
    constructor() {
        this.geoManager = new GeoManager();
        this.arManager = new ARManager();
        this.initialized = false;
        this.browserInfo = this.detectBrowser();
<<<<<<< HEAD
        
        // Elementi UI
        this.getLocationBtn = document.getElementById('getLocationBtn');
        this.placeObjectBtn = document.getElementById('placeObjectBtn');
        this.startARBtn = document.getElementById('startARBtn');
        this.modelSelect = document.getElementById('model-select');
        this.customModelInput = document.getElementById('custom-model');
        this.fileUploadDiv = document.querySelector('.file-upload');
        this.orientationInfo = document.getElementById('orientationInfo');
        this.debugBtn = document.getElementById('debugBtn');
        this.clearDataBtn = document.getElementById('clearDataBtn');
        
        // Dati dell'applicazione
        this.objectPlaced = false;
        this.selectedModelPath = this.modelSelect ? this.modelSelect.value : 'assets/models/treasure.glb';
=======
        this.currentMode = 'placement'; // 'placement' or 'exploration'
        this.placedObjects = []; // Array to store { id, model, position, orientation }
        this.localStorageKey = 'arAppPlacedObjects'; // Key for localStorage
        this.isMenuOpen = false;

        // --- Elementi UI ---
        // Menu Elements
        this.hamburgerIcon = document.getElementById('hamburger-icon');
        this.sideMenu = document.getElementById('side-menu');
        this.closeMenuBtn = document.getElementById('close-menu');
        this.menuGetLocation = document.getElementById('menu-get-location');
        this.menuModelSelect = document.getElementById('menu-model-select');
        this.menuCustomModelInput = document.getElementById('menu-custom-model');
        this.menuFileUploadDiv = document.querySelector('.menu-file-upload');
        this.menuPlaceObject = document.getElementById('menu-place-object');
        this.menuToggleAR = document.getElementById('menu-toggle-ar');
        this.menuClearData = document.getElementById('menu-clear-data');
        this.menuDebug = document.getElementById('menu-debug');

        // Mode Switching Elements
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
        // Placement Mode Elements (Keep references if needed for specific UI updates, but actions are via menu)
        this.placementCanvas = document.getElementById('renderCanvasPlacement');
        this.statusMessagePlacement = document.getElementById('statusMessagePlacement');
        this.coordinatesPlacement = document.getElementById('coordinatesPlacement');
        this.orientationInfoPlacement = document.getElementById('orientationInfoPlacement');
        this.savedDataInfoPlacement = document.getElementById('savedDataInfoPlacement');
        // Note: Original model select/inputs might still exist in HTML, but menu ones are primary
        // this.modelSelect = document.getElementById('model-select'); // Use menuModelSelect instead
        // this.customModelInput = document.getElementById('custom-model'); // Use menuCustomModelInput instead
        // this.fileUploadDiv = document.querySelector('#placementControls .file-upload'); // Use menuFileUploadDiv instead
        // this.getLocationBtn = document.getElementById('getLocationBtn'); // Action via menu-get-location
        // this.placeObjectBtn = document.getElementById('placeObjectBtn'); // Action via menu-place-object
        // this.clearDataBtn = document.getElementById('clearDataBtn'); // Action via menu-clear-data
        // this.debugBtn = document.getElementById('debugBtn'); // Action via menu-debug

        // Exploration Mode Elements (Keep references for UI updates)
        this.explorationCanvas = document.getElementById('renderCanvasExploration');
        // this.startExplorationBtn = document.getElementById('startExplorationBtn'); // Action via menu-toggle-ar
        this.statusMessageExploration = document.getElementById('statusMessageExploration');
        this.coordinatesExploration = document.getElementById('coordinatesExploration');
        this.distanceExploration = document.getElementById('distanceExploration');
        this.directionExploration = document.getElementById('directionExploration');
        this.directionArrowExploration = document.getElementById('directionArrowExploration');
        this.orientationInfoExploration = document.getElementById('orientationInfoExploration');
        this.savedDataInfoExploration = document.getElementById('savedDataInfoExploration');

        // Dati dell'applicazione
        this.selectedModelPath = this.menuModelSelect ? this.menuModelSelect.value : 'assets/models/treasure.glb'; // Use menu select
>>>>>>> 9202b8e125413375069e04180c2952e8341550ee
        this.customModelUrl = null;
        
        // Dati di posizionamento
        this.savedData = {
            position: null,
            orientation: null
        };
        
        // Stato AR
        this.arVisualizationActive = false;
    }
    
    /**
     * Rileva il browser in uso
     */
<<<<<<< HEAD
=======
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
        // Update menu items state
        this.menuToggleAR.classList.toggle('disabled', count === 0);
        this.menuClearData.classList.toggle('disabled', count === 0);
    }

    /** Toggle Hamburger Menu */
    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.sideMenu.classList.toggle('open', this.isMenuOpen);
    }

    /** Close Hamburger Menu */
    closeMenu() {
        if (this.isMenuOpen) {
            this.isMenuOpen = false;
            this.sideMenu.classList.remove('open');
        }
    }

    /** Rileva il browser in uso (invariato) */
>>>>>>> 9202b8e125413375069e04180c2952e8341550ee
    detectBrowser() {
        const userAgent = navigator.userAgent;
        let browserName = "Unknown";
        let isCompatible = false;
        
        if (userAgent.match(/chrome|chromium|crios/i)) {
            browserName = "Chrome";
            isCompatible = true;
        } else if (userAgent.indexOf("Edg") != -1) {
            browserName = "Edge";
            isCompatible = true;
        } else if (userAgent.match(/firefox|fxios/i)) {
            browserName = "Firefox";
            isCompatible = false; // WebXR supporto limitato
        } else if (userAgent.match(/safari/i) && !userAgent.match(/chrome|chromium|crios/i)) {
            browserName = "Safari";
            isCompatible = false; // WebXR supporto limitato
        } else if (userAgent.match(/opr\//i)) {
            browserName = "Opera";
            isCompatible = true; // Basato su Chromium
        }
        
        // Controlla se è un dispositivo mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        
        return { 
            name: browserName, 
            isCompatible: isCompatible, 
            isMobile: isMobile,
            userAgent: userAgent
        };
    }
    
    /**
     * Verifica e richiede tutti i permessi necessari
     */
    async requestAllPermissions() {
        try {
            // Array per raccogliere lo stato di tutti i permessi
            const permissionResults = [];
            
            // Permesso per la geolocalizzazione
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const geoPermission = await navigator.permissions.query({name: 'geolocation'});
                    permissionResults.push(`Geolocalizzazione: ${geoPermission.state}`);
                    
                    if (geoPermission.state === 'prompt') {
                        // Forza la richiesta del permesso
                        await new Promise((resolve) => {
                            navigator.geolocation.getCurrentPosition(
                                () => resolve(true),
                                () => resolve(false),
                                { timeout: 10000 }
                            );
                        });
                    }
                } catch (e) {
                    permissionResults.push(`Geolocalizzazione: errore (${e.message})`);
                }
            }
            
            // Permesso per la fotocamera (necessario per AR)
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    await navigator.mediaDevices.getUserMedia({video: true});
                    permissionResults.push("Fotocamera: concesso");
                } catch (e) {
                    permissionResults.push(`Fotocamera: negato (${e.message})`);
                }
            } else {
                permissionResults.push("Fotocamera: API non supportata");
            }
            
            // Permesso per l'orientamento del dispositivo (iOS 13+)
            if (typeof DeviceOrientationEvent !== 'undefined' && 
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    permissionResults.push(`Orientamento: ${permission}`);
                } catch (e) {
                    permissionResults.push(`Orientamento: errore (${e.message})`);
                }
            } else {
                permissionResults.push("Orientamento: non richiede permesso esplicito");
            }
            
            console.log("Stato permessi:", permissionResults.join(", "));
            return permissionResults;
        } catch (error) {
            console.error("Errore nella richiesta dei permessi:", error);
            return [`Errore generale: ${error.message}`];
        }
    }
    
    /**
     * Genera informazioni di debug
     */
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
            savedPosition: localStorage.getItem('arAppSavedPosition') ? 'Presente' : 'Assente',
            camera: navigator.mediaDevices ? 'Supportata' : 'Non supportata'
        };
    }
    
    /**
     * Mostra le informazioni di debug
     */
    showDebugInfo() {
        const debugInfo = this.generateDebugInfo();
        let debugText = "INFORMAZIONI DI DEBUG:\n\n";
        
        for (const [key, value] of Object.entries(debugInfo)) {
            debugText += `${key}: ${value}\n`;
        }
        
        alert(debugText);
        console.table(debugInfo);
    }
    
    /**
     * Verifica se l'AR è supportata e suggerisce alternative
     */
    checkARSupport() {
        if (!this.browserInfo.isCompatible) {
            let message = `Il tuo browser (${this.browserInfo.name}) potrebbe non supportare pienamente la realtà aumentata web. `;
            
            if (this.browserInfo.isMobile) {
                message += "Per un'esperienza migliore, prova a utilizzare Edge o Chrome su Android.";
            } else {
                message += "Questa funzionalità richiede un dispositivo mobile con un browser supportato.";
            }
            
            this.showStatus(message);
            console.warn(message);
            
            // Aggiunge un banner di avviso
            const warningBanner = document.createElement('div');
            warningBanner.className = 'warning-banner';
            warningBanner.innerHTML = `
                <p>${message}</p>
                <button id="dismissWarning">Ho capito</button>
            `;
            document.body.appendChild(warningBanner);
            
            document.getElementById('dismissWarning').addEventListener('click', () => {
                warningBanner.style.display = 'none';
            });
            
            return false;
        }
        
        return true;
    }
    
    /**
     * Inizializza l'applicazione
     */
    async init() {
        try {
            // Verifica compatibilità browser
            this.checkARSupport();
            
            // Inizializza i gestori
            const geoSupported = this.geoManager.init();
            if (!geoSupported) {
                this.showStatus("Geolocalizzazione non supportata");
                return;
            }
            
            // Richiedi i permessi necessari
            await this.requestAllPermissions();
            
            // Inizializza AR Manager con il video sempre attivo
            const arSupported = await this.arManager.init('renderCanvas', 'camera-feed');
            if (!arSupported) {
<<<<<<< HEAD
                this.showStatus("Accesso alla fotocamera non disponibile. Alcune funzionalità potrebbero non funzionare.");
            } else {
                this.showStatus("Sistema pronto. Clicca su 'Ottieni posizione' per iniziare.");
            }
            
            // Carica i dati salvati se esistono
            this.loadSavedData();
            
            // Configura i listener dei pulsanti
            this.setupEventListeners();
            
            // Avvia il monitoraggio dell'orientamento
            this.startOrientationDisplay();
            
            this.initialized = true;
=======
                this.showStatus("Realtà aumentata WebXR non supportata.", this.currentMode);
                // Disabilita modalità esplorazione se AR non supportata?
                if(this.switchToExplorationBtn) this.switchToExplorationBtn.disabled = true;
                if(this.startExplorationBtn) this.startExplorationBtn.disabled = true;
            }

            this.loadSavedData(); // Carica oggetti piazzati
            this.setupEventListeners(); // Configura listener pulsanti
            this.startOrientationDisplay(); // Avvia display orientamento iniziale

            // Avvia la camera per la modalità piazzamento iniziale
            await this.switchMode('placement'); // Attiva la modalità iniziale (placement)

            this.initialized = true;
            this.showStatus("Sistema pronto. Usa il menu per le azioni.", 'placement');

>>>>>>> 9202b8e125413375069e04180c2952e8341550ee
        } catch (error) {
            console.error("Errore nell'inizializzazione:", error);
            this.showStatus("Errore durante l'inizializzazione dell'app: " + error.message);
        }
    }
    
    /**
     * Carica i dati salvati dal localStorage
     */
    loadSavedData() {
        try {
            const savedPosition = localStorage.getItem('arAppSavedPosition');
            const savedOrientation = localStorage.getItem('arAppSavedOrientation');
            const savedModelPath = localStorage.getItem('arAppModelPath');
            
            if (savedPosition) {
                const position = JSON.parse(savedPosition);
                this.savedData.position = position;
                
                if (savedOrientation) {
                    this.savedData.orientation = JSON.parse(savedOrientation);
                }
                
                this.objectPlaced = true;
                this.showStatus("Posizione salvata caricata");
                
                // Aggiorna le informazioni sui dati salvati
                const savedDataInfo = document.getElementById('savedDataInfo');
                if (savedDataInfo) {
                    savedDataInfo.textContent = `Posizione salvata: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
                    savedDataInfo.classList.remove('hidden');
                }
                
                // Abilita i pulsanti appropriati
                setTimeout(() => {
                    if (this.placeObjectBtn) this.placeObjectBtn.disabled = false;
                    if (this.startARBtn) this.startARBtn.disabled = false;
                }, 1000);
                
                // Ripristina il modello selezionato se disponibile
                if (savedModelPath && this.modelSelect) {
                    this.modelSelect.value = savedModelPath;
                    this.selectedModelPath = savedModelPath;
                    
                    // Gestisce il caso del modello personalizzato
                    if (savedModelPath === 'assets/models/custom.glb' && this.fileUploadDiv) {
                        this.fileUploadDiv.classList.remove('hidden');
                    }
                }
            }
        } catch (error) {
            console.error("Errore nel caricamento dei dati salvati:", error);
            // Se c'è un errore nel parsing, cancella i dati corrotti
            localStorage.removeItem('arAppSavedPosition');
            localStorage.removeItem('arAppSavedOrientation');
            localStorage.removeItem('arAppModelPath');
        }
    }
    
    /**
     * Salva i dati correnti nel localStorage
     */
    saveDataToLocalStorage() {
        if (this.savedData.position) {
            localStorage.setItem('arAppSavedPosition', JSON.stringify(this.savedData.position));
            
            if (this.savedData.orientation) {
                localStorage.setItem('arAppSavedOrientation', JSON.stringify(this.savedData.orientation));
            }
            
            if (this.selectedModelPath) {
                localStorage.setItem('arAppModelPath', this.selectedModelPath);
            }
            
            // Aggiorna le informazioni sui dati salvati
            const savedDataInfo = document.getElementById('savedDataInfo');
            if (savedDataInfo) {
                savedDataInfo.textContent = `Posizione salvata: ${this.savedData.position.latitude.toFixed(6)}, ${this.savedData.position.longitude.toFixed(6)}`;
                savedDataInfo.classList.remove('hidden');
            }
            
            console.log("Dati salvati nel localStorage");
        }
    }
    
    /**
     * Cancella i dati salvati
     */
    clearSavedData() {
<<<<<<< HEAD
        localStorage.removeItem('arAppSavedPosition');
        localStorage.removeItem('arAppSavedOrientation');
        localStorage.removeItem('arAppModelPath');
        
        this.savedData = {
            position: null,
            orientation: null
        };
        
        this.objectPlaced = false;
        if (this.startARBtn) this.startARBtn.disabled = true;
        
        // Aggiorna UI
        const savedDataInfo = document.getElementById('savedDataInfo');
        if (savedDataInfo) {
            savedDataInfo.classList.add('hidden');
=======
        if (confirm(`Sei sicuro di voler cancellare tutti i ${this.placedObjects.length} oggetti piazzati?`)) {
            this.placedObjects = [];
            localStorage.removeItem(this.localStorageKey);
            this.showStatus("Tutti gli oggetti piazzati sono stati cancellati.", this.currentMode);
            this.saveDataToLocalStorage(); // Salva l'array vuoto e aggiorna UI
            this.closeMenu(); // Chiudi menu dopo azione
>>>>>>> 9202b8e125413375069e04180c2952e8341550ee
        }
        
        // Ferma la visualizzazione AR se attiva
        if (this.arVisualizationActive) {
            this.arManager.stopARExperience();
            this.arVisualizationActive = false;
        }
        
        this.showStatus("Dati salvati cancellati");
    }
    
    /**
     * Avvia il display delle informazioni di orientamento
     */
    startOrientationDisplay() {
        if (this.orientationInfo) {
            // Aggiorna le informazioni di orientamento ogni 500ms
            setInterval(() => {
                if (this.geoManager.currentOrientation) {
                    const orientation = this.geoManager.currentOrientation;
                    this.orientationInfo.textContent = `Bussola: ${orientation.alpha.toFixed(1)}°`;
                    this.orientationInfo.classList.remove('hidden');
                }
            }, 500);
        }
    }
    
    /**
     * Configura i listener degli eventi
     */
    setupEventListeners() {
<<<<<<< HEAD
        // Ottieni posizione GPS
        if (this.getLocationBtn) {
            this.getLocationBtn.addEventListener('click', async () => {
                try {
                    this.showStatus("Ottenimento della posizione...");
                    await this.geoManager.getCurrentPosition();
                    
                    if (this.placeObjectBtn) this.placeObjectBtn.disabled = false;
                    this.geoManager.startPositionWatch();
                    
                    this.showStatus("Posizione ottenuta! Ora puoi posizionare un oggetto.");
                } catch (error) {
                    console.error(error);
                }
            });
        }
        
        // Selettore modello 3D
        if (this.modelSelect) {
            this.modelSelect.addEventListener('change', () => {
                this.selectedModelPath = this.modelSelect.value;
                
                // Mostra o nascondi l'input per il caricamento di file personalizzati
                if (this.selectedModelPath === 'assets/models/custom.glb' && this.fileUploadDiv) {
                    this.fileUploadDiv.classList.remove('hidden');
                } else if (this.fileUploadDiv) {
                    this.fileUploadDiv.classList.add('hidden');
                }
                
                // Salva l'aggiornamento del modello se c'è già una posizione salvata
                if (this.objectPlaced) {
                    this.saveDataToLocalStorage();
                }
                
                // Se la visualizzazione AR è attiva, aggiorna il modello
                if (this.arVisualizationActive && this.savedData.orientation) {
                    this.arManager.placeVirtualObject(
                        this.selectedModelPath, 
                        this.savedData.orientation.alpha
                    );
                }
            });
        }
        
        // Caricamento modello personalizzato
        if (this.customModelInput) {
            this.customModelInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    // Crea un URL oggetto per il file caricato
                    this.customModelUrl = URL.createObjectURL(file);
                    this.showStatus(`Modello personalizzato caricato: ${file.name}`);
                    
                    // Se la visualizzazione AR è attiva, aggiorna il modello
                    if (this.arVisualizationActive && this.savedData.orientation) {
                        this.arManager.placeVirtualObject(
                            this.customModelUrl, 
                            this.savedData.orientation.alpha
                        );
                    }
                }
            });
        }
        
        // Posiziona oggetto virtuale
        if (this.placeObjectBtn) {
            this.placeObjectBtn.addEventListener('click', () => {
                // Salva sia la posizione che l'orientamento
                const data = this.geoManager.saveCurrentPositionAndOrientation();
                if (data) {
                    this.savedData = data;
                    this.objectPlaced = true;
                    
                    if (this.startARBtn) this.startARBtn.disabled = false;
                    
                    // Salva i dati nel localStorage
                    this.saveDataToLocalStorage();
                    
                    // Mostra un messaggio informativo
                    if (data.orientation) {
                        this.showStatus(`Oggetto posizionato con direzione: ${data.orientation.alpha.toFixed(1)}°`);
                    } else {
                        this.showStatus("Oggetto posizionato. Orientamento non disponibile.");
                    }
                    
                    // Se la visualizzazione AR è già attiva, aggiorna l'oggetto
                    if (this.arVisualizationActive) {
                        this.startARVisualization();
                    }
                }
            });
        }
        
        // Avvia visualizzazione AR
        if (this.startARBtn) {
            this.startARBtn.addEventListener('click', async () => {
                if (!this.objectPlaced) {
                    this.showStatus("Prima posiziona un oggetto!");
                    return;
                }
                
                if (this.arVisualizationActive) {
                    // Se l'AR è già attivo, fermalo
                    this.arManager.stopARExperience();
                    this.arVisualizationActive = false;
                    this.startARBtn.textContent = "Visualizza in AR";
                    this.showStatus("Visualizzazione AR fermata");
                } else {
                    // Altrimenti avvialo
                    this.startARVisualization();
                }
            });
=======
        // Cambio Modalità
        // Cambio Modalità (rimane uguale)
        this.switchToPlacementBtn.addEventListener('click', () => this.switchMode('placement'));
        this.switchToExplorationBtn.addEventListener('click', () => this.switchMode('exploration'));

        // --- Menu Listeners ---
        this.hamburgerIcon.addEventListener('click', () => this.toggleMenu());
        this.closeMenuBtn.addEventListener('click', () => this.closeMenu());

        // Ottieni Posizione (Menu)
        this.menuGetLocation.addEventListener('click', async (e) => {
            e.preventDefault();
            this.closeMenu();
            try {
                this.showStatus("Ottenimento posizione...", this.currentMode);
                await this.geoManager.getCurrentPosition();
                this.menuPlaceObject.classList.remove('disabled'); // Abilita piazzamento
                this.geoManager.startPositionWatch(); // Inizia a monitorare
                this.showStatus("Posizione ottenuta. Pronto a piazzare.", this.currentMode);
            } catch (error) {
                console.error(error);
                this.showStatus(`Errore posizione: ${error}`, this.currentMode);
            }
        });

        // Selezione Modello (Menu)
        if (this.menuModelSelect) {
            this.menuModelSelect.addEventListener('change', () => {
                this.selectedModelPath = this.menuModelSelect.value;
                this.menuFileUploadDiv.classList.toggle('hidden', this.selectedModelPath !== 'assets/models/custom.glb');
                // Se si cambia modello dopo aver caricato un custom, resetta l'URL custom
                if (this.selectedModelPath !== 'assets/models/custom.glb') {
                    if (this.customModelUrl) {
                        URL.revokeObjectURL(this.customModelUrl); // Libera memoria
                        this.customModelUrl = null;
                    }
                    this.menuCustomModelInput.value = ''; // Resetta input file
                }
            });
        }

        // Caricamento Modello Custom (Menu)
        if (this.menuCustomModelInput) {
            this.menuCustomModelInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                // Revoca URL precedente se esiste
                if (this.customModelUrl) {
                    URL.revokeObjectURL(this.customModelUrl);
                    this.customModelUrl = null;
                }
                if (file && file.name.toLowerCase().endsWith('.glb')) {
                    this.customModelUrl = URL.createObjectURL(file);
                    this.showStatus(`Modello personalizzato caricato: ${file.name}`, this.currentMode);
                } else {
                    this.showStatus("Seleziona un file .glb valido.", this.currentMode);
                    this.menuCustomModelInput.value = ''; // Resetta input
                }
            });
        }

        // Piazza Oggetto (Menu)
        this.menuPlaceObject.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.menuPlaceObject.classList.contains('disabled')) return;

            this.closeMenu();
            const currentPosition = this.geoManager.currentPosition;
            const currentOrientation = this.geoManager.currentOrientation;

            if (!currentPosition) {
                this.showStatus("Posizione GPS non ancora disponibile.", this.currentMode);
                return;
            }
            // Non blocchiamo più se l'orientamento non è pronto, usiamo default

            let modelToPlace = this.selectedModelPath;
            let isCustomFromUrl = false;
            if (modelToPlace === 'assets/models/custom.glb') {
                if (this.customModelUrl) {
                    modelToPlace = this.customModelUrl;
                    isCustomFromUrl = true;
                    console.warn("Piazzamento di modello custom tramite Object URL. Non persisterà tra le sessioni.");
                } else {
                    this.showStatus("Seleziona un file .glb personalizzato prima di piazzare.", this.currentMode);
                    return;
                }
            }

            const newObject = {
                id: Date.now(),
                // Se è custom da URL, salviamo un placeholder nel localStorage,
                // altrimenti l'URL non sarà valido al prossimo caricamento.
                // L'URL reale verrà usato solo per il caricamento immediato.
                model: isCustomFromUrl ? 'assets/models/custom_placeholder.glb' : modelToPlace,
                position: { ...currentPosition },
                orientation: currentOrientation ? { ...currentOrientation } : { alpha: 0, beta: 0, gamma: 0 }
            };

            this.placedObjects.push(newObject);
            this.saveDataToLocalStorage(); // Salva l'array aggiornato

            // Usa l'URL reale (se custom) per il piazzamento immediato nella scena (se in modalità piazzamento)
            const immediateModelPath = isCustomFromUrl ? this.customModelUrl : newObject.model;
            if (this.currentMode === 'placement') {
                 this.arManager.placeSingleObjectForPreview(immediateModelPath, newObject.orientation.alpha);
            }

            this.showStatus(`Oggetto ${this.placedObjects.length} (${immediateModelPath.split('/').pop()}) piazzato!`, this.currentMode);
        });

        // Cancella Dati (Menu)
        this.menuClearData.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.menuClearData.classList.contains('disabled')) return;
            this.clearSavedData(); // La funzione clearSavedData già chiude il menu
        });

        // Debug (Menu)
        this.menuDebug.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeMenu();
            this.showDebugInfo();
        });

        // Avvia/Ferma AR (Menu)
        this.menuToggleAR.addEventListener('click', async (e) => {
            e.preventDefault();
            if (this.menuToggleAR.classList.contains('disabled')) return;

            this.closeMenu();

            if (this.arManager.isARMode) {
                // --- Ferma AR ---
                this.showStatus("Chiusura AR...", 'exploration');
                await this.arManager.stopARExperience();
                this.explorationCanvas.classList.add('hidden'); // Nascondi canvas AR
                this.menuToggleAR.innerHTML = '<i class="fas fa-vr-cardboard"></i> Avvia AR'; // Aggiorna testo menu
                this.showStatus("AR Fermata.", 'exploration');
                // Torna alla modalità piazzamento? O resta in esplorazione UI?
                // Per ora resta in esplorazione UI
                await this.switchMode('exploration'); // Riattiva UI esplorazione base
            } else {
                // --- Avvia AR ---
                if (this.placedObjects.length === 0) {
                    this.showStatus("Nessun oggetto da esplorare.", 'exploration');
                    return;
                }

                this.showStatus("Avvio AR...", 'exploration');
                // Assicurati di essere in modalità esplorazione UI
                if (this.currentMode !== 'exploration') {
                    await this.switchMode('exploration');
                }

                this.explorationCanvas.width = window.innerWidth;
                this.explorationCanvas.height = window.innerHeight;
                this.explorationCanvas.classList.remove('hidden'); // Mostra canvas

                try {
                    this.arManager.stopCameraFeed(); // Ferma camera piazzamento se attiva
                    const arStarted = await this.arManager.startARExperience(this.explorationCanvas);

                    if (!arStarted) {
                        this.showStatus("Impossibile avviare AR.", 'exploration');
                        this.explorationCanvas.classList.add('hidden');
                        this.showFallbackOptions();
                    } else {
                        this.showStatus(`AR avviata! Cerca ${this.placedObjects.length} oggetti.`, 'exploration');
                        this.menuToggleAR.innerHTML = '<i class="fas fa-times-circle"></i> Ferma AR'; // Aggiorna testo menu

                        // Carica oggetti (gestisce anche placeholder custom)
                        await this.arManager.placeMultipleVirtualObjects(this.placedObjects);
                        this.startARUpdates();
                    }
                } catch (error) {
                    console.error("Errore nell'avvio dell'AR:", error);
                    this.showStatus("Errore avvio AR: " + error.message, 'exploration');
                    this.explorationCanvas.classList.add('hidden');
                    this.showFallbackOptions();
                }
            }
        });

        // Chiudi menu se si clicca fuori (opzionale ma utile)
        document.addEventListener('click', (event) => {
            if (!this.sideMenu.contains(event.target) && !this.hamburgerIcon.contains(event.target) && this.isMenuOpen) {
                this.closeMenu();
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
>>>>>>> 9202b8e125413375069e04180c2952e8341550ee
        }
        
        // Pulsante per cancellare i dati salvati
        if (this.clearDataBtn) {
            this.clearDataBtn.addEventListener('click', () => {
                if (confirm("Sei sicuro di voler cancellare tutti i dati salvati?")) {
                    this.clearSavedData();
                }
            });
        }
        
        // Pulsante per le informazioni di debug
        if (this.debugBtn) {
            this.debugBtn.addEventListener('click', () => {
                this.showDebugInfo();
            });
        }
    }
    
    /**
     * Avvia la visualizzazione AR
     */
    async startARVisualization() {
        // Prima di iniziare, verifica nuovamente i permessi
        await this.requestAllPermissions();
        
        try {
            // Determina quale modello usare
            let modelToUse = this.selectedModelPath;
            if (this.selectedModelPath === 'assets/models/custom.glb' && this.customModelUrl) {
                modelToUse = this.customModelUrl;
            }
            
            const arStarted = await this.arManager.startARExperience();
            if (!arStarted) {
                this.showStatus("Impossibile avviare la visualizzazione AR. Verifica che la fotocamera sia accessibile.");
                return;
            }
            
            this.arVisualizationActive = true;
            this.startARBtn.textContent = "Ferma AR";
            this.showStatus("Visualizzazione AR avviata");
            
            // Ottiene l'orientamento del dispositivo al momento del posizionamento
            const objectOrientation = this.savedData.orientation ? this.savedData.orientation.alpha : 0;
            
            // Carica il modello 3D selezionato con l'orientamento salvato
            await this.arManager.placeVirtualObject(modelToUse, objectOrientation);
            
            // Avvia gli aggiornamenti continui
            this.startARUpdates();
            
        } catch (error) {
            console.error("Errore nell'avvio dell'AR:", error);
            this.showStatus("Errore: " + error.message);
            this.arVisualizationActive = false;
        }
    }
    
    /**
     * Avvia gli aggiornamenti continui per l'esperienza AR
     */
    startARUpdates() {
        // Aggiorna la posizione dell'oggetto ogni 500ms
        const updateInterval = setInterval(() => {
            if (!this.objectPlaced || !this.arVisualizationActive) {
                clearInterval(updateInterval);
                return;
            }
            
            // Verifica che ci siano tutti i dati necessari
            if (!this.geoManager.currentPosition || !this.savedData.position) {
                return;
            }
            
            // Calcola la distanza dall'oggetto posizionato
            const distance = this.geoManager.calculateDistance(
                this.geoManager.currentPosition.latitude,
                this.geoManager.currentPosition.longitude,
                this.savedData.position.latitude,
                this.savedData.position.longitude
            );
            
            // Aggiorna la visualizzazione della distanza
            const distanceEl = document.getElementById('distance');
            if (distanceEl) {
                distanceEl.textContent = `Distanza: ${distance.toFixed(1)} m`;
                distanceEl.classList.remove('hidden');
            }
            
            // Calcola la direzione verso l'oggetto
            const bearing = this.geoManager.calculateBearing(
                this.geoManager.currentPosition.latitude,
                this.geoManager.currentPosition.longitude,
                this.savedData.position.latitude,
                this.savedData.position.longitude
            );
            
            // Aggiorna la visualizzazione della direzione
            const directionEl = document.getElementById('direction');
            if (directionEl) {
                directionEl.textContent = `Direzione: ${bearing.toFixed(1)}°`;
                directionEl.classList.remove('hidden');
            }
            
            // Ottiene l'orientamento attuale del dispositivo
            const currentDeviceHeading = this.geoManager.currentOrientation ? 
                this.geoManager.currentOrientation.alpha : 0;
            
            // Aggiorna la posizione dell'oggetto
            this.arManager.updateObjectPosition(distance, bearing, currentDeviceHeading);
            
        }, 500);
    }
    
    /**
     * Mostra un messaggio di stato
     */
    showStatus(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }
        
        // Registra anche nel log
        console.log("Status:", message);
    }
}

// Avvia l'applicazione quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});