/**
 * Applicazione principale per AR Geolocalizzata
 */
class App {
    constructor() {
        // Inizializza i gestori
        this.geoManager = new GeoManager();
        this.arManager = new ARManager();
        this.storageManager = new StorageManager();
        this.debugPanel = new DebugPanel(this);
        
        // Inizializza le pagine di menu
        this.menu1 = new Menu1(this);
        this.menu2 = new Menu2(this);
        this.menu3 = new Menu3(this);
        this.menu4 = new Menu4(this);
        
        // Stato dell'applicazione
        this.initialized = false;
        this.isImageAnchorEnabled = false;
    }
    
    /**
     * Inizializza l'applicazione
     */
    async init() {
        try {
            // Inizializza i gestori
            this.geoManager.init();
            await this.arManager.init('render-canvas', 'camera-feed');
            
            // Inizializza i menu
            this.menu1.init();
            this.menu2.init();
            this.menu3.init();
            this.menu4.init();
            
            // Inizializza il pannello di debug
            this.debugPanel.init();
            
            // Avvia il monitoraggio della posizione
            this.geoManager.startPositionWatch();
            
            // Inizializzazione completata
            this.initialized = true;
            
            // Mostra il menu principale
            this.showMenu1();
            
            // Log di avvio
            this.log("Applicazione AR inizializzata con successo");
        } catch (error) {
            console.error("Errore nell'inizializzazione dell'app:", error);
            alert("Errore nell'inizializzazione dell'app: " + error.message);
        }
    }
    
    /**
     * Mostra il menu principale (Menu 1)
     */
    showMenu1() {
        this.menu1.show();
        this.menu2.hide();
        this.menu3.hide();
        this.menu4.hide();
    }
    
    /**
     * Mostra il menu di piazzamento oggetti (Menu 2)
     */
    showMenu2() {
        this.menu1.hide();
        this.menu2.show();
        this.menu3.hide();
        this.menu4.hide();
    }
    
    /**
     * Mostra il menu della mappa (Menu 3)
     */
    showMenu3() {
        this.menu1.hide();
        this.menu2.hide();
        this.menu3.show();
        this.menu4.hide();
    }
    
    /**
     * Mostra il menu di esplorazione (Menu 4)
     */
    showMenu4() {
        this.menu1.hide();
        this.menu2.hide();
        this.menu3.hide();
        this.menu4.show();
    }
    
    /**
     * Mostra il pannello di debug
     */
    showDebugPanel() {
        this.debugPanel.show();
    }
    
    /**
     * Aggiunge un messaggio al log di debug
     */
    log(message) {
        this.debugPanel.log(message);
    }
    
    /**
     * Mostra un messaggio all'utente
     */
    showMessage(message) {
        // Crea un elemento per il messaggio
        const messageElement = document.createElement('div');
        messageElement.className = 'notification';
        messageElement.textContent = message;
        
        // Aggiungi un pulsante per chiudere
        const closeButton = document.createElement('button');
        closeButton.className = 'close-notification';
        closeButton.textContent = 'OK';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(messageElement);
        });
        
        messageElement.appendChild(closeButton);
        
        // Aggiungi alla pagina
        document.body.appendChild(messageElement);
        
        // Rimuovi automaticamente dopo 5 secondi
        setTimeout(() => {
            if (document.body.contains(messageElement)) {
                document.body.removeChild(messageElement);
            }
        }, 5000);
        
        // Log anche nel debug
        this.log(message);
    }
}

// Avvia l'applicazione quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});