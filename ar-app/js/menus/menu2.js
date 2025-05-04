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
        // Rimosso: this.imageAnchorToggle = document.getElementById('image-anchor-toggle2');
        
        // Stato
        this.selectedModelPath = this.objectSelect ? this.objectSelect.value : '';
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
        // Rimosso: this.onImageAnchorToggle = this.onImageAnchorToggle.bind(this);
    }
    
    /**
     * Inizializza il menu
     */
    init() {
        // Popola il menu a tendina con i modelli disponibili
        this.populateModelDropdown();
        
        // Aggiungi event listeners
        this.objectSelect.addEventListener('change', this.onObjectSelectChange);
        this.customModelInput.addEventListener('change', this.onCustomModelInput);
        this.scaleSlider.addEventListener('input', this.onScaleChange);
        this.rotationSlider.addEventListener('input', this.onRotationChange);
        this.confirmPlaceBtn.addEventListener('click', this.onConfirmPlaceClick);
        this.backBtn.addEventListener('click', this.onBackClick);
        this.debugBtn.addEventListener('click', this.onDebugClick);
        // Rimosso: this.imageAnchorToggle.addEventListener('change', this.onImageAnchorToggle);
        
        // Imposta il modello iniziale
        if (this.objectSelect && this.objectSelect.options.length > 0) {
            this.selectedModelPath = this.objectSelect.value;
            this.onObjectSelectChange();
        }
    }
    
    /**
     * Popola il menu a tendina con i modelli disponibili
     */
    populateModelDropdown() {
        if (!this.objectSelect) {
            console.error("Elemento select 'object-select' non trovato.");
            return;
        }
        
        // Pulisci opzioni esistenti
        this.objectSelect.innerHTML = '';
        
        // Verifica che window.availableModels esista
        if (!window.availableModels || !Array.isArray(window.availableModels)) {
            console.error("window.availableModels non è definito o non è un array.");
            return;
        }
        
        // Aggiungi le opzioni dei modelli
        window.availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.path;
            option.textContent = model.name;
            this.objectSelect.appendChild(option);
        });
        
        console.log(`Dropdown popolato con ${window.availableModels.length} modelli.`);
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
        
        // Avvia la sessione AR automaticamente se non già attiva
        this.app.arManager.enterARSession();
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
        
        // Trova il modello selezionato
        const selectedModel = window.availableModels.find(model => model.path === this.selectedModelPath);
        
        // Mostra/nascondi l'input file per modelli personalizzati
        if (selectedModel && selectedModel.type === 'custom') {
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
        // Trova il modello selezionato
        const selectedModel = window.availableModels.find(model => model.path === this.selectedModelPath);
        
        // Determina quale modello usare
        let modelToUse = this.selectedModelPath;
        
        // Se è un modello personalizzato, usa l'URL del file caricato
        if (selectedModel && selectedModel.type === 'custom' && this.customModelUrl) {
            modelToUse = this.customModelUrl;
        }
        
        // Aggiorna la preview nell'AR manager
        if (this.app.arManager && modelToUse) {
            this.app.arManager.updatePreviewObject(modelToUse, this.objectScale, this.objectRotation);
        }
    }
    
    /**
     * Gestisce il click sul pulsante "Piazza oggetto" (Logica WebXR)
     */
    async onConfirmPlaceClick() {
        // Verifica se l'hit-test è attivo e il marker è visibile
        if (!this.app.arManager || !this.app.arManager.hitTestActive || !this.app.arManager.hitTestMarker || !this.app.arManager.hitTestMarker.isVisible) {
            this.app.showMessage("Punta il dispositivo verso una superficie piana rilevata prima di piazzare l'oggetto.");
            return;
        }

        // Trova il modello selezionato
        const selectedModel = window.availableModels.find(model => model.path === this.selectedModelPath);
        
        // Determina quale modello usare
        let modelToUse = this.selectedModelPath;
        let modelName = this.getModelName();
        
        // Se è un modello personalizzato, usa l'URL del file caricato
        if (selectedModel && selectedModel.type === 'custom' && this.customModelUrl) {
            modelToUse = this.customModelUrl;
        }
        
        // Crea l'oggetto da salvare
        const object = {
            modelPath: this.selectedModelPath,
            isCustomModel: selectedModel && selectedModel.type === 'custom',
            // Posizione GPS al momento del piazzamento
            position: {...this.app.geoManager.currentPosition},
            // Orientamento Bussola al momento del piazzamento
            orientation: this.app.geoManager.currentOrientation ?
                {...this.app.geoManager.currentOrientation} : null,
            scale: this.objectScale,
            // Rotazione visuale impostata dalla slider
            visualRotation: this.objectRotation,
            name: modelName
            // NOTA: La posizione e l'orientamento GPS/Bussola sono ora salvati,
            // ma il piazzamento iniziale avviene ancora tramite WebXR/Hit-Test.
            // La logica di visualizzazione futura userà i dati salvati.
            // Potremmo salvarli come riferimento, ma il posizionamento reale
            // avviene nel mondo 3D rilevato da WebXR.
        };

        // Chiama la funzione di piazzamento dell'ARManager
        const placedMesh = await this.app.arManager.placeObjectAtHitTest(modelToUse, this.objectScale, this.objectRotation);

        if (placedMesh) {
            // Ottieni la posizione e rotazione reali dal mesh piazzato
            const position = placedMesh.position;
            const rotation = placedMesh.rotationQuaternion ? placedMesh.rotationQuaternion.toEulerAngles() : placedMesh.rotation;

            // TODO: Salvare l'oggetto nello storageManager con le coordinate WebXR
            // Questo richiede di decidere come rappresentare/salvare le coordinate
            // Salva l'oggetto nello storage con i dati GPS e di orientamento
            const savedObjectId = this.app.storageManager.addObject(object);
            this.app.log(`Oggetto salvato con ID: ${savedObjectId}, Pos: ${JSON.stringify(object.position)}, Orient: ${JSON.stringify(object.orientation)}`);

            // Messaggio di successo
            this.app.showMessage(`Oggetto "${object.name}" piazzato e salvato con successo!`);
            this.app.log(`Oggetto piazzato (WebXR): ${object.name} a ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);

            // TODO: Considerare se l'oggetto piazzato (placedMesh) debba rimanere
            // visibile o se debba essere rimosso in attesa della logica di
            // visualizzazione basata sullo storage. Per ora lo lasciamo.
        } else {
             this.app.showMessage(`Errore durante il piazzamento dell'oggetto "${object.name}".`);
             this.app.log(`Fallito piazzamento WebXR per: ${object.name}`);
        }
        
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
    
    // Rimosso: onImageAnchorToggle(event) { ... }
    
    /**
     * Ottiene un nome leggibile per il modello
     */
    getModelName() {
        // Trova il modello selezionato
        const selectedModel = window.availableModels.find(model => model.path === this.selectedModelPath);
        
        // Se è un modello personalizzato
        if (selectedModel && selectedModel.type === 'custom' && this.customModelInput.files[0]) {
            return this.customModelInput.files[0].name.replace('.glb', '').replace('.gltf', '');
        }
        
        // Se è un modello predefinito
        if (selectedModel) {
            return selectedModel.name;
        }
        
        // Fallback
        return 'Oggetto';
    }
}

// Esporta la classe
window.Menu2 = Menu2;
