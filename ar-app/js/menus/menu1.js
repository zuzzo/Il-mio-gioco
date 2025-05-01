/**
 * Gestisce la pagina principale (Menu 1)
 */
class Menu1 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu1');
        
        // Elementi UI
        this.placeBtn = document.getElementById('place-btn');
        this.mapBtn = document.getElementById('map-btn');
        this.exploreBtn = document.getElementById('explore-btn');
        this.debugBtn = document.getElementById('debug-btn');
        this.imageAnchorToggle = document.getElementById('image-anchor-toggle');
        
        // Bind dei metodi
        this.onPlaceBtnClick = this.onPlaceBtnClick.bind(this);
        this.onMapBtnClick = this.onMapBtnClick.bind(this);
        this.onExploreBtnClick = this.onExploreBtnClick.bind(this);
        this.onDebugBtnClick = this.onDebugBtnClick.bind(this);
        this.onImageAnchorToggle = this.onImageAnchorToggle.bind(this);
    }
    
    /**
     * Inizializza il menu
     */
    init() {
        // Aggiungi event listeners
        this.placeBtn.addEventListener('click', this.onPlaceBtnClick);
        this.mapBtn.addEventListener('click', this.onMapBtnClick);
        this.exploreBtn.addEventListener('click', this.onExploreBtnClick);
        this.debugBtn.addEventListener('click', this.onDebugBtnClick);
        this.imageAnchorToggle.addEventListener('change', this.onImageAnchorToggle);
        
        // Imposta lo stato iniziale del toggle
        this.imageAnchorToggle.checked = this.app.arManager.imageAnchorEnabled;
    }
    
    /**
     * Mostra questo menu
     */
    show() {
        // Mostra il menu
        this.menuElement.classList.remove('hidden');
        
        // Mostra la vista AR
        document.getElementById('ar-view').classList.remove('hidden');
        document.getElementById('map-view').classList.add('hidden');
        
        // Aggiorna lo stato del toggle
        this.imageAnchorToggle.checked = this.app.arManager.imageAnchorEnabled;
    }
    
    /**
     * Nasconde questo menu
     */
    hide() {
        this.menuElement.classList.add('hidden');
    }
    
    /**
     * Gestisce il click sul pulsante "Piazza oggetti"
     */
    onPlaceBtnClick() {
        this.app.log("Passaggio a Menu 2 (Piazza oggetti)");
        this.hide();
        this.app.showMenu2();
    }
    
    /**
     * Gestisce il click sul pulsante "Mappa"
     */
    onMapBtnClick() {
        this.app.log("Passaggio a Menu 3 (Mappa)");
        this.hide();
        this.app.showMenu3();
    }
    
    /**
     * Gestisce il click sul pulsante "Esplora"
     */
    onExploreBtnClick() {
        this.app.log("Passaggio a Menu 4 (Esplora)");
        this.hide();
        this.app.showMenu4();
    }
    
    /**
     * Gestisce il click sul pulsante "Debug"
     */
    onDebugBtnClick() {
        this.app.log("Apertura pannello Debug");
        this.app.showDebugPanel();
    }
    
    /**
     * Gestisce il toggle per l'ancoraggio delle immagini
     */
    onImageAnchorToggle(event) {
        const enabled = event.target.checked;
        this.app.arManager.setImageAnchorEnabled(enabled);
        this.app.log("Ancoraggio immagini: " + (enabled ? "attivato" : "disattivato"));
    }
}

// Esporta la classe
window.Menu1 = Menu1;