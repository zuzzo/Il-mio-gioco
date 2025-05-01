/**
 * Gestisce la pagina di esplorazione (Menu 4)
 */
class Menu4 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu4');
        
        // Elementi UI
        this.collectedObjectsBtn = document.getElementById('collected-objects-btn');
        this.scoreBtn = document.getElementById('score-btn');
        this.backBtn = document.getElementById('back-menu1-from-explore-btn');
        this.debugBtn = document.getElementById('debug-btn4');
        this.imageAnchorToggle = document.getElementById('image-anchor-toggle4');
        this.scaleSlider = document.getElementById('scale-slider4');
        this.scaleValue = document.getElementById('scale-value4');
        this.rotationSlider = document.getElementById('rotation-slider4');
        this.rotationValue = document.getElementById('rotation-value4');
        
        // Stato
        this.currentObjectIndex = 0;
        this.nearbyObjects = [];
        this.objectScale = 1.0;
        this.objectRotation = 0;
        
        // Bind dei metodi
        this.onCollectedObjectsClick = this.onCollectedObjectsClick.bind(this);
        this.onScoreClick = this.onScoreClick.bind(this);
        this.onBackClick = this.onBackClick.bind(this);
        this.onDebugClick = this.onDebugClick.bind(this);
        this.onImageAnchorToggle = this.onImageAnchorToggle.bind(this);
        this.onScaleChange = this.onScaleChange.bind(this);
        this.onRotationChange = this.onRotationChange.bind(this);
    }
    
    /**
     * Inizializza il menu
     */
    init() {
        // Aggiungi event listeners
        this.collectedObjectsBtn.addEventListener('click', this.onCollectedObjectsClick);
        this.scoreBtn.addEventListener('click', this.onScoreClick);
        this.backBtn.addEventListener('click', this.onBackClick);
        this.debugBtn.addEventListener('click', this.onDebugClick);
        this.imageAnchorToggle.addEventListener('change', this.onImageAnchorToggle);
        this.scaleSlider.addEventListener('input', this.onScaleChange);
        this.rotationSlider.addEventListener('input', this.onRotationChange);
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
        
        // Resetta i valori degli slider
        this.resetValues();
        
        // Aggiorna lo stato del toggle
        this.imageAnchorToggle.checked = this.app.arManager.imageAnchorEnabled;
        
        // Carica gli oggetti nelle vicinanze
        this.loadNearbyObjects();
    }
    
    /**
     * Resetta i valori dei controlli
     */
    resetValues() {
        this.scaleSlider.value = 1.0;
        this.scaleValue.textContent = '1.0';
        this.rotationSlider.value = 0;
        this.rotationValue.textContent = '0°';
        this.objectScale = 1.0;
        this.objectRotation = 0;
    }
    
    /**
     * Nasconde questo menu
     */
    hide() {
        this.menuElement.classList.add('hidden');
    }
    
    /**
     * Carica gli oggetti nelle vicinanze
     */
    loadNearbyObjects() {
        // Ottieni la posizione corrente
        const currentPosition = this.app.geoManager.currentPosition;
        
        if (!currentPosition) {
            this.app.showMessage("Posizione non disponibile. Riprova più tardi.");
            return;
        }
        
        // Ottieni gli oggetti nelle vicinanze
        this.nearbyObjects = this.app.storageManager.getNearbyObjects(currentPosition, 1000);
        
        // Se ci sono oggetti, mostra il primo
        if (this.nearbyObjects.length > 0) {
            this.currentObjectIndex = 0;
            this.showCurrentObject();
        } else {
            this.app.showMessage("Nessun oggetto nelle vicinanze da esplorare.");
        }
    }
    
    /**
     * Mostra l'oggetto corrente
     */
    showCurrentObject() {
        if (this.nearbyObjects.length === 0) return;
        
        const object = this.nearbyObjects[this.currentObjectIndex];
        
        // Calcola la direzione verso l'oggetto
        const currentPosition = this.app.geoManager.currentPosition;
        
        if (!currentPosition) return;
        
        const bearing = this.app.geoManager.calculateBearing(
            currentPosition.latitude,
            currentPosition.longitude,
            object.position.latitude,
            object.position.longitude
        );
        
        // Visualizza l'oggetto nell'AR
        this.app.arManager.showObject(object, bearing);
        
        // Mostra informazioni sull'oggetto
        this.app.showMessage(
            `Oggetto ${this.currentObjectIndex + 1}/${this.nearbyObjects.length}: ` +
            `"${object.name}" - Distanza: ${object.distance.toFixed(1)}m, ` +
            `Direzione: ${bearing.toFixed(1)}°`
        );
    }
    
    /**
     * Gestisce il cambio di scala
     */
    onScaleChange() {
        this.objectScale = parseFloat(this.scaleSlider.value);
        this.scaleValue.textContent = this.objectScale.toFixed(1);
        
        // Aggiorna l'oggetto virtuale se presente
        if (this.app.arManager.virtualObject && this.nearbyObjects.length > 0) {
            this.app.arManager.virtualObject.scaling = new BABYLON.Vector3(
                this.objectScale,
                this.objectScale,
                this.objectScale
            );
        }
    }
    
    /**
     * Gestisce il cambio di rotazione
     */
    onRotationChange() {
        this.objectRotation = parseInt(this.rotationSlider.value);
        this.rotationValue.textContent = this.objectRotation + '°';
        
        // Aggiorna l'oggetto virtuale se presente
        if (this.app.arManager.virtualObject && this.nearbyObjects.length > 0) {
            this.app.arManager.virtualObject.rotation = new BABYLON.Vector3(
                0,
                BABYLON.Tools.ToRadians(this.objectRotation),
                0
            );
        }
    }
    
    /**
     * Gestisce il click sul pulsante "Oggetti collezionati"
     */
    onCollectedObjectsClick() {
        // In una versione completa, qui ci sarebbe una vista degli oggetti collezionati
        // Per ora, mostra un messaggio informativo
        this.app.showMessage("Hai collezionato 0 oggetti finora.");
        this.app.log("Visualizzazione oggetti collezionati");
    }
    
    /**
     * Gestisce il click sul pulsante "Punteggio"
     */
    onScoreClick() {
        // In una versione completa, qui ci sarebbe una vista del punteggio
        // Per ora, mostra un messaggio informativo
        this.app.showMessage("Il tuo punteggio attuale è: 0");
        this.app.log("Visualizzazione punteggio");
    }
    
    /**
     * Gestisce il click sul pulsante indietro
     */
    onBackClick() {
        this.app.log("Ritorno a Menu 1 da Menu 4");
        this.hide();
        this.app.showMenu1();
    }
    
    /**
     * Gestisce il click sul pulsante debug
     */
    onDebugClick() {
        this.app.log("Apertura pannello Debug da Menu 4");
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
window.Menu4 = Menu4;