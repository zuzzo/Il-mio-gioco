/**
 * Gestisce la pagina della mappa (Menu 3)
 */
class Menu3 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu3');
        
        // Elementi UI
        this.mapContainer = document.getElementById('map-container');
        this.selectedObjectName = document.getElementById('selected-object-name');
        this.centerMapBtn = document.getElementById('center-map-btn');
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.deleteObjectBtn = document.getElementById('delete-object-btn');
        this.drawAreaBtn = document.getElementById('draw-area-btn');
        this.backBtn = document.getElementById('back-menu1-from-map-btn');
        
        // Stato mappa
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.selectedObjectId = null;
        this.mapInitialized = false;
        
        // Bind dei metodi
        this.onCenterMapClick = this.onCenterMapClick.bind(this);
        this.onZoomInClick = this.onZoomInClick.bind(this);
        this.onZoomOutClick = this.onZoomOutClick.bind(this);
        this.onDeleteObjectClick = this.onDeleteObjectClick.bind(this);
        this.onDrawAreaClick = this.onDrawAreaClick.bind(this);
        this.onBackClick = this.onBackClick.bind(this);
        this.updateMap = this.updateMap.bind(this);
    }
    
    /**
     * Inizializza il menu
     */
    init() {
        // Aggiungi event listeners
        this.centerMapBtn.addEventListener('click', this.onCenterMapClick);
        this.zoomInBtn.addEventListener('click', this.onZoomInClick);
        this.zoomOutBtn.addEventListener('click', this.onZoomOutClick);
        this.deleteObjectBtn.addEventListener('click', this.onDeleteObjectClick);
        this.drawAreaBtn.addEventListener('click', this.onDrawAreaClick);
        this.backBtn.addEventListener('click', this.onBackClick);
    }
    
    /**
     * Mostra questo menu
     */
    show() {
        // Mostra il menu
        this.menuElement.classList.remove('hidden');
        
        // Mostra la vista mappa
        document.getElementById('ar-view').classList.add('hidden');
        document.getElementById('map-view').classList.remove('hidden');
        
        // Inizializza la mappa se non l'ha ancora fatto
        if (!this.mapInitialized) {
            this.initMap();
        } else {
            // Aggiorna la mappa se già inizializzata
            this.updateMap();
        }
    }
    
    /**
     * Nasconde questo menu
     */
    hide() {
        this.menuElement.classList.add('hidden');
    }
    
    /**
     * Inizializza la mappa
     */
    initMap() {
        try {
            // Verifica che la posizione sia disponibile
            const position = this.app.geoManager.currentPosition;
            if (!position) {
                this.app.showMessage("Posizione non disponibile. Riprova più tardi.");
                return;
            }
            
            // Crea un semplice renderer canvas per la mappa
            const canvas = document.createElement('canvas');
            canvas.width = this.mapContainer.clientWidth;
            canvas.height = this.mapContainer.clientHeight;
            this.mapContainer.innerHTML = '';
            this.mapContainer.appendChild(canvas);
            
            // Configura il contesto 2D
            const ctx = canvas.getContext('2d');
            
            // Setta lo stato della mappa
            this.map = {
                ctx: ctx,
                canvas: canvas,
                center: {
                    latitude: position.latitude,
                    longitude: position.longitude
                },
                zoom: 18, // Livello di zoom (metri per pixel)
                objects: []
            };
            
            // Aggiungi un event listener per il click sulla mappa
            canvas.addEventListener('click', (event) => {
                this.handleMapClick(event);
            });
            
            // Segnala che la mappa è inizializzata
            this.mapInitialized = true;
            
            // Aggiorna la mappa
            this.updateMap();
            
            // Aggiungi event listener per il resize della finestra
            window.addEventListener('resize', () => {
                this.resizeMap();
            });
            
            this.app.log("Mappa inizializzata");
        } catch (error) {
            console.error("Errore nell'inizializzazione della mappa:", error);
            this.app.log("Errore mappa: " + error.message);
        }
    }
    
    /**
     * Gestisce il click sulla mappa
     */
    handleMapClick(event) {
        if (!this.map) return;
        
        const canvas = this.map.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Ottieni la posizione corrente
        const currentPosition = this.app.geoManager.currentPosition;
        if (!currentPosition) return;
        
        // Ottieni tutti gli oggetti salvati
        const objects = this.app.storageManager.getAllObjects();
        
        // Calcola il centro della mappa
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Controlla se il click è su un oggetto
        for (const obj of objects) {
            // Calcola la posizione relativa sulla mappa
            const dx = this.calculateLongitudeDistance(
                currentPosition.longitude, 
                obj.position.longitude, 
                currentPosition.latitude
            );
            
            const dy = this.calculateLatitudeDistance(
                currentPosition.latitude, 
                obj.position.latitude
            );
            
            // Converti in pixel
            const pixelX = centerX + (dx / this.map.zoom);
            const pixelY = centerY - (dy / this.map.zoom); // Invertito perché l'asse Y è invertito nel canvas
            
            // Verifica se il click è sull'oggetto (entro un raggio di 15 pixel)
            const distance = Math.sqrt(Math.pow(x - pixelX, 2) + Math.pow(y - pixelY, 2));
            
            if (distance <= 15) {
                this.selectObject(obj);
                return;
            }
        }
        
        // Se il click non è su nessun oggetto, deseleziona
        this.deselectObject();
    }
    
    /**
     * Seleziona un oggetto
     */
    selectObject(object) {
        this.selectedObjectId = object.id;
        this.selectedObjectName.textContent = object.name || 'Oggetto selezionato';
        this.deleteObjectBtn.disabled = false;
        
        this.app.log(`Oggetto selezionato: ${object.name || 'Oggetto'} (ID: ${object.id})`);
        
        // Ridisegna la mappa per evidenziare l'oggetto selezionato
        this.updateMap();
    }
    
    /**
     * Deseleziona l'oggetto corrente
     */
    deselectObject() {
        this.selectedObjectId = null;
        this.selectedObjectName.textContent = 'Nessun oggetto selezionato';
        this.deleteObjectBtn.disabled = true;
        
        // Ridisegna la mappa
        this.updateMap();
    }
    
    /**
     * Aggiorna la mappa
     */
    updateMap() {
        if (!this.map) return;
        
        const ctx = this.map.ctx;
        const canvas = this.map.canvas;
        
        // Pulisci il canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Disegna lo sfondo della mappa
        ctx.fillStyle = '#e8f4ea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Disegna una griglia semplice
        ctx.strokeStyle = '#c0d6c9';
        ctx.lineWidth = 1;
        
        const gridSize = 20;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Ottieni tutti gli oggetti salvati