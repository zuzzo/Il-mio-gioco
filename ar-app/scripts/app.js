/**
 * Applicazione principale per AR Geolocalizzata
 */
class App {
    constructor() {
        this.geoManager = new GeoManager();
        this.arManager = new ARManager();
        this.initialized = false;
        this.browserInfo = this.detectBrowser();
        
        // Elementi UI
        this.getLocationBtn = document.getElementById('getLocationBtn');
        this.placeObjectBtn = document.getElementById('placeObjectBtn');
        this.startARBtn = document.getElementById('startARBtn');
        this.toggleAnchorBtn = document.getElementById('toggleAnchorBtn');
        this.modelSelect = document.getElementById('model-select');
        this.customModelInput = document.getElementById('custom-model');
        this.fileUploadDiv = document.querySelector('.file-upload');
        this.orientationInfo = document.getElementById('orientationInfo');
        this.debugBtn = document.getElementById('debugBtn');
        this.clearDataBtn = document.getElementById('clearDataBtn');

        // Stato ancoraggio
        this.isAnchored = false;
        this.anchoredPosition = null;
        
        // Dati dell'applicazione
        this.objectPlaced = false;
        this.selectedModelPath = this.modelSelect ? this.modelSelect.value : 'assets/models/treasure.glb';
        this.customModelUrl = null;
        
        // Dati di posizionamento
        this.savedData = {
            position: null,
            orientation: null
        };
        
        // Stato AR
        this.arVisualizationActive = false;
        this.isAnchored = false;
        this.anchoredPosition = null;
    }
    
    /**
     * Rileva il browser in uso
     */
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
        // Gestione ancoraggio
        if (this.toggleAnchorBtn) {
            this.toggleAnchorBtn.addEventListener('click', () => {
                this.toggleAnchor();
            });
        }

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
    toggleAnchor() {
        this.isAnchored = !this.isAnchored;
        if (this.isAnchored) {
            // Salva la posizione corrente
            this.anchoredPosition = {
                distance: this.geoManager.currentPosition,
                bearing: this.geoManager.currentOrientation?.alpha || 0,
                heading: this.geoManager.currentOrientation?.alpha || 0
            };
            this.toggleAnchorBtn.innerHTML = '<span class="lock-icon">🔒</span> Sblocca';
            this.showStatus("Oggetto ancorato all'immagine");
        } else {
            this.anchoredPosition = null;
            this.toggleAnchorBtn.innerHTML = '<span class="lock-icon">🔓</span> Ancora';
            this.showStatus("Oggetto sbloccato");
        }
    }

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
