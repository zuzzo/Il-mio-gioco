/**
 * Classe principale dell'applicazione AR
 */
class App {
    constructor() {
        // Elementi DOM principali
        this.arView = document.getElementById('ar-view');
        this.mapView = document.getElementById('map-view');
        this.debugPanel = document.getElementById('debug-panel');
        this.debugContent = document.getElementById('debug-content');

        // Manager
        this.geoManager = new GeoManager();
        // Istanzia ARManager passando l'istanza dell'app per la comunicazione (es. showMessage)
        this.arManager = new ARManager(this);
        this.storageManager = new StorageManager();

        // Menu
        this.menu1 = new Menu1(this);
        this.menu2 = new Menu2(this);
        this.menu3 = new Menu3(this);
        this.menu4 = new Menu4(this);
        this.debugUtil = new DebugUtil(this); // Assumendo che DebugUtil sia la classe in debug.js

        // Stato corrente
        this.currentMenu = null;
    }

    /**
     * Inizializza l'applicazione
     */
    async init() {
        console.log("Inizializzazione App...");
        this.log("Avvio applicazione...");

        // Inizializza i manager
        if (!this.geoManager.init()) {
            this.showMessage("Errore: Geolocalizzazione non supportata o permessi negati.");
            // Potrebbe essere necessario gestire questo caso in modo più robusto
        }
        // Chiama init di ARManager passando gli ID corretti e controlla il risultato
        const arInitialized = await this.arManager.init('render-canvas', 'camera-feed');
        if (!arInitialized) {
             this.showMessage("Errore critico: Impossibile inizializzare il sistema AR. Controlla i permessi della fotocamera e la console.");
             this.log("Inizializzazione AR fallita.");
             // Potremmo voler bloccare ulteriori inizializzazioni qui
             // return; // Decommenta se vuoi bloccare tutto in caso di fallimento AR
        } else {
            this.log("Inizializzazione AR completata.");
        }
        this.storageManager.init();

        // Inizializza i menu (aggiungono i loro listener)
        this.menu1.init();
        this.menu2.init();
        this.menu3.init();
        this.menu4.init();
        this.debugUtil.init();

        // Mostra il menu iniziale
        this.showMenu1();

        console.log("App inizializzata.");
        this.log("Applicazione pronta.");
    }

    /**
     * Mostra il Menu 1 (Principale)
     */
    showMenu1() {
        this.hideAllMenus();
        this.menu1.show();
        this.currentMenu = this.menu1;
        this.arView.classList.remove('hidden');
        this.mapView.classList.add('hidden');
        this.log("Menu 1 visualizzato.");
    }

    /**
     * Mostra il Menu 2 (Piazzamento Oggetti)
     */
    showMenu2() {
        this.hideAllMenus();
        this.menu2.show();
        this.currentMenu = this.menu2;
        this.arView.classList.remove('hidden');
        this.mapView.classList.add('hidden');
        this.log("Menu 2 visualizzato.");
    }

    /**
     * Mostra il Menu 3 (Mappa)
     */
    showMenu3() {
        this.hideAllMenus();
        this.menu3.show();
        this.currentMenu = this.menu3;
        this.arView.classList.add('hidden');
        this.mapView.classList.remove('hidden');
        this.log("Menu 3 visualizzato.");
        // Potrebbe essere necessario aggiornare la mappa qui
        this.menu3.updateMap();
    }

    /**
     * Mostra il Menu 4 (Esplora)
     */
    showMenu4() {
        this.hideAllMenus();
        this.menu4.show();
        this.currentMenu = this.menu4;
        this.arView.classList.remove('hidden');
        this.mapView.classList.add('hidden');
        this.log("Menu 4 visualizzato.");
    }

    /**
     * Nasconde tutti i pannelli dei menu
     */
    hideAllMenus() {
        if (this.currentMenu) {
            this.currentMenu.hide();
        }
        // Assicurati che tutti i pannelli siano nascosti per sicurezza
        document.querySelectorAll('.menu-panel').forEach(panel => panel.classList.add('hidden'));
    }

    /**
     * Mostra il pannello di debug
     */
    showDebugPanel() {
        this.debugUtil.show();
    }

    /**
     * Registra un messaggio nel pannello di debug
     * @param {string} message - Messaggio da registrare
     */
    log(message) {
        if (this.debugUtil) {
            this.debugUtil.log(message);
        } else {
            console.log("[DEBUG]", message); // Fallback se debugUtil non è pronto
        }
    }

    /**
     * Mostra un messaggio temporaneo all'utente (es. popup/toast)
     * @param {string} message - Messaggio da mostrare
     */
    showMessage(message) {
        // Implementazione semplice con alert, da migliorare con un sistema di notifiche UI
        alert(message);
        this.log(`Messaggio utente: ${message}`);
    }
}

// Avvia l'applicazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app; // Rendi l'app accessibile globalmente (per debug)
    app.init().catch(error => {
        console.error("Errore fatale durante l'inizializzazione:", error);
        alert("Errore grave durante l'avvio dell'applicazione. Controlla la console per i dettagli.");
    });
});
