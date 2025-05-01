/**
 * Classe principale dell'applicazione AR
 */
class ARApp {
    constructor() {
        // Inizializza i manager
        this.geoManager = new GeoManager();
        this.arManager = new ARManager();
        this.storageManager = new StorageManager();
        this.debugPanel = new DebugPanel(this);

        // Inizializza i menu
        this.menu1 = new Menu1(this);
        this.menu2 = new Menu2(this);
        this.menu3 = new Menu3(this);
        this.menu4 = new Menu4(this);

        // Stato iniziale
        this.currentMenu = null;
    }

    /**
     * Inizializza l'applicazione
     */
    init() {
        // Inizializza i manager
        this.geoManager.init();
        this.arManager.init();
        this.storageManager.init();
        this.debugPanel.init();

        // Inizializza i menu
        this.menu1.init();
        this.menu2.init();
        this.menu3.init();
        this.menu4.init();

        // Mostra il menu principale
        this.showMenu1();

        console.log("Applicazione AR inizializzata");
    }

    /**
     * Mostra il menu principale
     */
    showMenu1() {
        if (this.currentMenu) {
            this.currentMenu.hide();
        }
        this.currentMenu = this.menu1;
        this.menu1.show();
    }

    /**
     * Mostra il menu di piazzamento oggetti
     */
    showMenu2() {
        if (this.currentMenu) {
            this.currentMenu.hide();
        }
        this.currentMenu = this.menu2;
        this.menu2.show();
    }

    /**
     * Mostra il menu mappa
     */
    showMenu3() {
        if (this.currentMenu) {
            this.currentMenu.hide();
        }
        this.currentMenu = this.menu3;
        this.menu3.show();
    }

    /**
     * Mostra il menu esplora
     */
    showMenu4() {
        if (this.currentMenu) {
            this.currentMenu.hide();
        }
        this.currentMenu = this.menu4;
        this.menu4.show();
    }

    /**
     * Mostra il pannello di debug
     */
    showDebugPanel() {
        this.debugPanel.show();
    }

    /**
     * Registra un messaggio nel log
     */
    log(message) {
        this.debugPanel.log(message);
    }

    /**
     * Mostra un messaggio all'utente
     */
    showMessage(message) {
        // Implementazione temporanea - da migliorare con un sistema di notifiche
        alert(message);
    }
}

// Crea e avvia l'applicazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ARApp();
    window.app.init();
});
