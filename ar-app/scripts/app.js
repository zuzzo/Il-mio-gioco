/**
 * Applicazione principale per AR Geolocalizzata
 */
class App {
    constructor() {
        this.geoManager = new GeoManager();
        this.arManager = new ARManager();
        this.initialized = false;
        
        // Elementi UI
        this.getLocationBtn = document.getElementById('getLocationBtn');
        this.placeObjectBtn = document.getElementById('placeObjectBtn');
        this.startARBtn = document.getElementById('startARBtn');
        this.modelSelect = document.getElementById('model-select');
        this.customModelInput = document.getElementById('custom-model');
        this.fileUploadDiv = document.querySelector('.file-upload');
        this.orientationInfo = document.getElementById('orientationInfo');
        
        // Dati dell'applicazione
        this.objectPlaced = false;
        this.selectedModelPath = this.modelSelect ? this.modelSelect.value : 'assets/models/treasure.glb';
        this.customModelUrl = null;
        
        // Dati di posizionamento
        this.savedData = {
            position: null,
            orientation: null
        };
    }
    
    /**
     * Inizializza l'applicazione
     */
    async init() {
        try {
            // Inizializza i gestori
            const geoSupported = this.geoManager.init();
            if (!geoSupported) {
                this.showStatus("Geolocalizzazione non supportata");
                return;
            }
            
            const arSupported = await this.arManager.init('renderCanvas');
            if (!arSupported) {
                this.showStatus("Realtà aumentata WebXR non supportata. Assicurati di utilizzare un browser compatibile su un dispositivo Android recente.");
            } else {
                this.showStatus("Sistema pronto. Clicca su 'Ottieni posizione' per iniziare.");
            }
            
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
     * Avvia il display delle informazioni di orientamento
     */
    startOrientationDisplay() {
        if (this.orientationInfo) {
            // Aggiorna le informazioni di orientamento ogni 200ms
            setInterval(() => {
                if (this.geoManager.currentOrientation) {
                    const orientation = this.geoManager.currentOrientation;
                    this.orientationInfo.textContent = `Bussola: ${orientation.alpha.toFixed(1)}° | Inclinazione: ${orientation.beta.toFixed(1)}° / ${orientation.gamma.toFixed(1)}°`;
                    this.orientationInfo.classList.remove('hidden');
                }
            }, 200);
        }
    }
    
    /**
     * Configura i listener degli eventi
     */
    setupEventListeners() {
        // Ottieni posizione GPS
        this.getLocationBtn.addEventListener('click', async () => {
            try {
                await this.geoManager.getCurrentPosition();
                this.placeObjectBtn.disabled = false;
                this.geoManager.startPositionWatch();
            } catch (error) {
                console.error(error);
            }
        });
        
        // Selettore modello 3D
        if (this.modelSelect) {
            this.modelSelect.addEventListener('change', () => {
                this.selectedModelPath = this.modelSelect.value;
                
                // Mostra o nascondi l'input per il caricamento di file personalizzati
                if (this.selectedModelPath === 'assets/models/custom.glb') {
                    this.fileUploadDiv.classList.remove('hidden');
                } else {
                    this.fileUploadDiv.classList.add('hidden');
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
                }
            });
        }
        
        // Posiziona oggetto virtuale
        this.placeObjectBtn.addEventListener('click', () => {
            // Salva sia la posizione che l'orientamento
            const data = this.geoManager.saveCurrentPositionAndOrientation();
            if (data) {
                this.savedData = data;
                this.objectPlaced = true;
                this.startARBtn.disabled = false;
                
                // Mostra un messaggio informativo
                if (data.orientation) {
                    this.showStatus(`Oggetto posizionato con direzione: ${data.orientation.alpha.toFixed(1)}°`);
                } else {
                    this.showStatus("Oggetto posizionato. Orientamento non disponibile.");
                }
            }
        });
        
        // Avvia visualizzazione AR
        this.startARBtn.addEventListener('click', async () => {
            if (!this.objectPlaced) {
                this.showStatus("Prima posiziona un oggetto!");
                return;
            }
            
            try {
                // Determina quale modello usare
                let modelToUse = this.selectedModelPath;
                if (this.selectedModelPath === 'assets/models/custom.glb' && this.customModelUrl) {
                    modelToUse = this.customModelUrl;
                }
                
                const arStarted = await this.arManager.startARExperience();
                if (!arStarted) {
                    this.showStatus("Impossibile avviare l'esperienza AR");
                } else {
                    this.showStatus(`AR avviata. Cerca l'oggetto 3D!`);
                    
                    // Ottiene l'orientamento del dispositivo al momento del posizionamento
                    const objectOrientation = this.savedData.orientation ? this.savedData.orientation.alpha : 0;
                    
                    // Carica il modello 3D selezionato con l'orientamento salvato
                    await this.arManager.placeVirtualObject(modelToUse, objectOrientation);
                    
                    // Calcola la distanza dall'oggetto posizionato
                    const distance = this.geoManager.calculateDistance(
                        this.geoManager.currentPosition.latitude,
                        this.geoManager.currentPosition.longitude,
                        this.savedData.position.latitude,
                        this.savedData.position.longitude
                    );
                    
                    // Calcola la direzione verso l'oggetto
                    const bearing = this.geoManager.calculateBearing(
                        this.geoManager.currentPosition.latitude,
                        this.geoManager.currentPosition.longitude,
                        this.savedData.position.latitude,
                        this.savedData.position.longitude
                    );
                    
                    // Ottiene l'orientamento attuale del dispositivo
                    const currentDeviceHeading = this.geoManager.currentOrientation ? 
                        this.geoManager.currentOrientation.alpha : 0;
                    
                    // Aggiorna la posizione dell'oggetto in base alla distanza e alla direzione
                    this.arManager.updateObjectPosition(distance, bearing, currentDeviceHeading);
                    
                    // Imposta un aggiornamento continuo della posizione dell'oggetto
                    // basato sui cambiamenti di posizione e orientamento
                    this.startARUpdates();
                }
            } catch (error) {
                console.error("Errore nell'avvio dell'AR:", error);
                this.showStatus("Errore: " + error.message);
            }
        });
    }
    
    /**
     * Avvia gli aggiornamenti continui per l'esperienza AR
     */
    startARUpdates() {
        // Aggiorna la posizione dell'oggetto ogni 500ms
        const updateInterval = setInterval(() => {
            if (!this.objectPlaced || !this.arManager.isARMode) {
                clearInterval(updateInterval);
                return;
            }
            
            // Calcola la distanza dall'oggetto posizionato
            const distance = this.geoManager.calculateDistance(
                this.geoManager.currentPosition.latitude,
                this.geoManager.currentPosition.longitude,
                this.savedData.position.latitude,
                this.savedData.position.longitude
            );
            
            // Calcola la direzione verso l'oggetto
            const bearing = this.geoManager.calculateBearing(
                this.geoManager.currentPosition.latitude,
                this.geoManager.currentPosition.longitude,
                this.savedData.position.latitude,
                this.savedData.position.longitude
            );
            
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
    }
}

// Avvia l'applicazione quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});