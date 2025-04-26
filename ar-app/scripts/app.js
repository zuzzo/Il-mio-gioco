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
        
        // Dati dell'applicazione
        this.objectPlaced = false;
        this.bearing = 0; // Direzione dell'oggetto rispetto al nord
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
            
            this.initialized = true;
        } catch (error) {
            console.error("Errore nell'inizializzazione:", error);
            this.showStatus("Errore durante l'inizializzazione dell'app: " + error.message);
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
        
        // Posiziona oggetto virtuale
        this.placeObjectBtn.addEventListener('click', () => {
            const savedPosition = this.geoManager.saveCurrentPosition();
            if (savedPosition) {
                this.objectPlaced = true;
                this.startARBtn.disabled = false;
                // Per semplicità, impostiamo la direzione a Nord (0 gradi)
                this.bearing = 0;
            }
        });
        
        // Avvia visualizzazione AR
        this.startARBtn.addEventListener('click', async () => {
            if (!this.objectPlaced) {
                this.showStatus("Prima posiziona un oggetto!");
                return;
            }
            
            try {
                const arStarted = await this.arManager.startARExperience();
                if (!arStarted) {
                    this.showStatus("Impossibile avviare l'esperienza AR");
                } else {
                    this.showStatus("AR avviata. Cerca l'oggetto rosso!");
                    
                    // In una implementazione completa, qui dovresti:
                    // 1. Ottenere l'orientamento del dispositivo
                    // 2. Calcolare la direzione verso l'oggetto
                    // 3. Posizionare correttamente l'oggetto virtuale rispetto alla posizione reale
                    
                    // Per semplicità, per ora posizioneremo l'oggetto a 5 metri di distanza nella direzione specificata
                    const distance = this.geoManager.calculateDistance(
                        this.geoManager.currentPosition.latitude,
                        this.geoManager.currentPosition.longitude,
                        this.geoManager.savedPosition.latitude,
                        this.geoManager.savedPosition.longitude
                    );
                    
                    this.arManager.updateObjectPosition(distance, this.bearing);
                }
            } catch (error) {
                console.error("Errore nell'avvio dell'AR:", error);
                this.showStatus("Errore: " + error.message);
            }
        });
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
