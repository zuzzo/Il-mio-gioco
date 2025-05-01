/**
 * Gestisce la pagina principale (Menu 1)
 */
class Menu1 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu1');
        
        // Pulsanti
        this.placeObjectBtn = document.getElementById('place-object-btn');
        this.mapBtn = document.getElementById('map-btn');
        this.exploreBtn = document.getElementById('explore-btn');
        this.debugBtn = document.getElementById('debug-btn');
        
        // Opzioni
        this.imageAnchorToggle = document.getElementById('image-anchor-toggle');
        
        // Bind dei metodi
        this.onPlaceObjectClick = this.onPlaceObjectClick.bind(this);
        this.onMapClick = this.onMapClick.bind(this);
        this.onExploreClick = this.onExploreClick.bind(this);
        this.onDebugClick = this.onDebugClick.bind(this);
        this.onImageAnchorToggle = this.onImageAnchorToggle.bind(this);
    }
    
    /**
     * Inizializza la pagina
     */
    init() {
        // Aggiunge gli event listener
        this.placeObjectBtn.addEventListener('click', this.onPlaceObjectClick);
        this.mapBtn.addEventListener('click', this.onMapClick);
        this.exploreBtn.addEventListener('click', this.onExploreClick);
        this.debugBtn.addEventListener('click', this.onDebugClick);
        this.imageAnchorToggle.addEventListener('change', this.onImageAnchorToggle);
        
        // Stato iniziale
        this.imageAnchorToggle.checked = this.app.isImageAnchorEnabled;
    }
    
    /**
     * Mostra questa pagina
     */
    show() {
        this.menuElement.classList.remove('hidden');
        document.getElementById('ar-view').classList.remove('hidden');
        document.getElementById('map-view').classList.add('hidden');
    }
    
    /**
     * Nasconde questa pagina
     */
    hide() {
        this.menuElement.classList.add('hidden');
    }
    
    /**
     * Gestisce il click sul pulsante Piazza oggetto
     */
    onPlaceObjectClick() {
        this.hide();
        this.app.showMenu2();
    }
    
    /**
     * Gestisce il click sul pulsante Mappa
     */
    onMapClick() {
        this.hide();
        this.app.showMenu3();
    }
    
    /**
     * Gestisce il click sul pulsante Esplora
     */
    onExploreClick() {
        this.hide();
        this.app.showMenu4();
    }
    
    /**
     * Gestisce il click sul pulsante Debug
     */
    onDebugClick() {
        this.app.showDebugPanel();
    }
    
    /**
     * Gestisce il toggle per l'ancoraggio delle immagini
     */
    onImageAnchorToggle(event) {
        this.app.isImageAnchorEnabled = event.target.checked;
        this.app.log("Ancoraggio immagini: " + (this.app.isImageAnchorEnabled ? "attivato" : "disattivato"));
    }
}

// Esporta la classe
window.Menu1 = Menu1;