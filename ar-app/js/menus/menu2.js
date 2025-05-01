/**
 * Gestisce la pagina di piazzamento oggetti (Menu 2)
 */
class Menu2 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu2');
        
        // Elementi UI
        this.objectSelect = document.getElementById('object-select');
        this.customModelInput = document.getElementById('custom-model-input');
        this.fileUploadDiv = document.querySelector('.file-upload');
        this.scaleSlider = document.getElementById('scale-slider');
        this.scaleValue = document.getElementById('scale-value');
        this.rotationSlider = document.getElementById('rotation-slider');
        this.rotationValue = document.getElementById('rotation-value');
        this.confirmPlaceBtn = document.getElementById('confirm-place-btn');
        this.backBtn = document.getElementById('back-menu1-btn');
        this.debugBtn = document.getElementById('debug-btn2');
        this.imageAnchorToggle = document.getElementById('image-anchor-toggle2');
        
        // Stato
        this.selectedModelPath = this.objectSelect ? this.objectSelect.value : 'assets/models/treasure.glb';
        this.customModelUrl = null;
        this.objectScale = 1.0;
        this.objectRotation = 0;
        
        // Bind dei metodi
        this.onObjectSelectChange = this.onObjectSelectChange.bind(this);
        this.onCustomModelInput = this.onCustomModelInput.bind(this);
        this.onScaleChange = this.onScaleChange.bind(this);
        this.onRotationChange = this.onRotationChange.bind(this);
        this.onConfirmPlaceClick = this.onConfirmPlaceClick.bind(this);
        this.onBackClick = this.onBackClick.bind(this);
        this.onDebugClick = this.onDebugClick.bind(this);
        this.onImageAnchorToggle = this.onImageAnchorToggle.bind(this);
    }
    
    /**
     * Inizializza il menu
     */
    init() {
        // Aggiungi event listeners
        this.objectSelect.addEventListener('change', this.onObjectSelectChange);
        this.customModelInput.addEventListener('change', this.onCustomModelInput);
        this.scaleSlider.addEventListener('input', this.onScaleChange);
        this.rotationSlider.addEventListener('input', this.onRotationChange);
        this.confirmPlaceBtn.addEventListener('click', this.onConfirmPlaceClick);
        this.backBtn.addEventListener('click', this.onBackClick);
        this.debugBtn.addEventListener('click', this.onDebugClick);
        this.imageAnchorToggle.addEventListener('change', this.onImageAnchorToggle);
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
        
        // Resetta i valori
        this.resetValues();
        
        // Aggiorna la preview
        this.updatePreview();
        
        // Aggiorna lo stato del toggle
        this.imageAnchorToggle.checked = this.app.arManager.imageAnchorEnabled;
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
     * Gestisce il cambio di modello selezionato
     */
    onObjectSelectChange() {
        this.selectedModelPath = this.objectSelect.value;
        
        // Mostra/nascondi l'input file per modelli personalizzati
        if (this.selectedModelPath === 'assets/models/custom.glb') {
            this.fileUploadDiv.classList.remove('hidden');
        } else {
            this.fileUploadDiv.classList.add('hidden');
        }
        
        this.updatePreview();
    }
    
    /**
     * Gestisce il caricamento di un modello personalizzato
     */
    onCustomModelInput(event) {
        const file = event.target.files[0];
        if (file) {
            // Crea un URL oggetto per il file caricato
            this.customModelUrl = URL.createObjectURL(file);
            this.app.log(`Modello personalizzato caricato: ${file.name}`);
            
            this.updatePreview();
        }
    }
    
    /**
     * Gestisce il cambio di scala
     */
    onScaleChange() {
        this.objectScale = parseFloat(this.scaleSlider.value);
        this.scaleValue.textContent = this.objectScale.toFixed(1);
        
        this.updatePreview();
    }
    
    /**
     * Gestisce il cambio di rotazione
     */
    onRotationChange() {
        this.objectRotation = parseInt(this.rotationSlider.value);
        this.rotationValue.textContent = this.objectRotation + '°';
        
        this.updatePreview();
    }
    
    /**
     * Aggiorna la preview dell'oggetto
     */
    updatePreview() {
        // Determina quale modello usare
        let modelToUse = this.selectedModelPath;
        if (this.selectedModelPath === 'assets/models/custom.glb' && this.customModelUrl) {
            modelToUse = this.customModelUrl;
        }
        
        // Aggiorna la preview nell'AR manager
        if (this.app.arManager) {
            this.app.arManager.updatePreviewObject(modelToUse, this.objectScale, this.objectRotation);
        }
    }
    
    /**
     * Gestisce il click sul pulsante "Piazza oggetto"
     */
    onConfirmPlaceClick() {
        // Verifica che la posizione sia disponibile
        if (!this.app.geoManager.currentPosition) {
            this.app.showMessage("Posizione non disponibile. Riprova più tardi.");
            return;
        }
        
        // Determina quale modello usare
        let modelToUse = this.selectedModelPath;
        let modelName = this.getModelName();
        
        if (this.selectedModelPath === 'assets/models/custom.glb' && this.customModelUrl) {
            modelToUse = this.customModelUrl;
        }
        
        // Crea l'oggetto da salvare
        const object = {
            modelPath: this.selectedModelPath,
            isCustomModel: this.selectedModelPath === 'assets/models/custom.glb',
            position: {...this.app.geoManager.currentPosition},
            orientation: this.app.geoManager.currentOrientation ? 
                {...this.app.geoManager.currentOrientation} : null,
            scale: this.objectScale,
            rotation: this.objectRotation,
            name: modelName
        };
        
        // Salva l'oggetto
        const objectId = this.app.storageManager.addObject(object);
        
        // Conferma all'utente
        this.app.showMessage(`Oggetto "${object.name}" posizionato con successo!`);
        this.app.log(`Oggetto piazzato: ${object.name} a Lat: ${object.position.latitude.toFixed(6)}, Lng: ${object.position.longitude.toFixed(6)}`);
        
        // Torna al menu principale
        this.hide();
        this.app.showMenu1();
    }
    
    /**
     * Gestisce il click sul pulsante indietro
     */
    onBackClick() {
        this.app.log("Ritorno a Menu 1");
        this.hide();
        this.app.showMenu1();
    }
    
    /**
     * Gestisce il click sul pulsante debug
     */
    onDebugClick() {
        this.app.log("Apertura pannello Debug da Menu 2");
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
    
    /**
     * Ottiene un nome leggibile per il modello
     */
    getModelName() {
        if (this.selectedModelPath === 'assets/models/custom.glb' && this.customModelInput.files[0]) {
            return this.customModelInput.files[0].name.replace('.glb', '').replace('.gltf', '');
        }
        
        switch (this.selectedModelPath) {
            case 'assets/models/treasure.glb':
                return 'Tesoro';
            case 'assets/models/cube.glb':
                return 'Cubo';
            case 'assets/models/sphere.glb':
                return 'Sfera';
            default:
                return 'Oggetto';
        }
    }
}

// Esporta la classe
window.Menu2 = Menu2;