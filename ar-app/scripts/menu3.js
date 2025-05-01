/**
 * Gestisce la pagina della mappa (Menu 3)
 */
class Menu3 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu3');
        
        // Elementi UI
        this.mapContainer = document.getElementById('map-container');
        this.centerMapBtn = document.getElementById('center-map-btn');
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.backBtn = document.getElementById('back-menu1-from-map-btn');
        
        // Stato mappa
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.userPositionCircle = null;
        this.mapInitialized = false;
        
        // Bind dei metodi
        this.onCenterMapClick = this.onCenterMapClick.bind(this);
        this.onZoomInClick = this.onZoomInClick.bind(this);
        this.onZoomOutClick = this.onZoomOutClick.bind(this);
        this.onBackClick = this.onBackClick.bind(this);
        this.updateMap = this.updateMap.bind(this);
    }
    
    /**
     * Inizializza la pagina
     */
    init() {
        // Aggiunge gli event listener
        this.centerMapBtn.addEventListener('click', this.onCenterMapClick);
        this.zoomInBtn.addEventListener('click', this.onZoomInClick);
        this.zoomOutBtn.addEventListener('click', this.onZoomOutClick);
        this.backBtn.addEventListener('click', this.onBackClick);
    }
    
    /**
     * Mostra questa pagina
     */
    show() {
        this.menuElement.classList.remove('hidden');
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
     * Nasconde questa pagina
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
            // Questa è una versione semplificata, in un'applicazione reale 
            // si utilizzerebbe una libreria come Leaflet o Google Maps
            
            // Creiamo un canvas per disegnare la mappa
            const canvas = document.createElement('canvas');
            canvas.width = this.mapContainer.clientWidth;
            canvas.height = this.mapContainer.clientHeight;
            this.mapContainer.innerHTML = '';
            this.mapContainer.appendChild(canvas);
            
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
            
            // Segnala che la mappa è inizializzata
            this.mapInitialized = true;
            
            // Aggiorna la mappa
            this.updateMap();
            
            // Aggiungi event listener per il resize della finestra
            window.addEventListener('resize', () => {
                this.resizeMap();
            });
        } catch (error) {
            console.error("Errore nell'inizializzazione della mappa:", error);
            this.app.log("Errore mappa: " + error.message);
        }
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
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Disegna una griglia semplice
        ctx.strokeStyle = '#ddd';
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
        const objects = this.app.storageManager.getAllObjects();
        
        // Ottieni la posizione corrente
        const currentPosition = this.app.geoManager.currentPosition;
        
        if (currentPosition) {
            // Disegna il punto della posizione corrente
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Disegna un cerchio per la precisione
            const accuracyRadius = currentPosition.accuracy / this.map.zoom;
            ctx.beginPath();
            ctx.arc(centerX, centerY, accuracyRadius, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0, 120, 255, 0.2)';
            ctx.fill();
            
            // Disegna il marker dell'utente
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#0078FF';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Disegna tutti gli oggetti
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
                
                // Disegna il marker dell'oggetto
                ctx.beginPath();
                ctx.arc(pixelX, pixelY, 6, 0, 2 * Math.PI);
                ctx.fillStyle = '#F44336';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Disegna il nome dell'oggetto
                ctx.fillStyle = '#333';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(obj.name || 'Oggetto', pixelX, pixelY - 10);
            }
        } else {
            // Posizione non disponibile
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Posizione non disponibile', canvas.width / 2, canvas.height / 2);
        }
    }
    
    /**
     * Calcola la distanza in metri tra due longitudini
     */
    calculateLongitudeDistance(lon1, lon2, lat) {
        const R = 6371000; // Raggio della Terra in metri
        const φ = lat * Math.PI / 180; // Latitudine in radianti
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        return R * Math.cos(φ) * Δλ;
    }
    
    /**
     * Calcola la distanza in metri tra due latitudini
     */
    calculateLatitudeDistance(lat1, lat2) {
        const R = 6371000; // Raggio della Terra in metri
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        
        return R * (φ2 - φ1);
    }
    
    /**
     * Gestisce il ridimensionamento della mappa
     */
    resizeMap() {
        if (!this.map) return;
        
        // Aggiorna le dimensioni del canvas
        this.map.canvas.width = this.mapContainer.clientWidth;
        this.map.canvas.height = this.mapContainer.clientHeight;
        
        // Ridisegna la mappa
        this.updateMap();
    }
    
    /**
     * Gestisce il click sul pulsante centra mappa
     */
    onCenterMapClick() {
        if (!this.map) return;
        
        // Aggiorna il centro della mappa con la posizione corrente
        const position = this.app.geoManager.currentPosition;
        if (position) {
            this.map.center = {
                latitude: position.latitude,
                longitude: position.longitude
            };
            
            // Aggiorna la mappa
            this.updateMap();
        }
    }
    
    /**
     * Gestisce il click sul pulsante zoom in
     */
    onZoomInClick() {
        if (!this.map) return;
        
        // Aumenta il livello di zoom (riduce metri per pixel)
        this.map.zoom *= 1.5;
        
        // Aggiorna la mappa
        this.updateMap();
    }
    
    /**
     * Gestisce il click sul pulsante zoom out
     */
    onZoomOutClick() {
        if (!this.map) return;
        
        // Diminuisce il livello di zoom (aumenta metri per pixel)
        this.map.zoom /= 1.5;
        
        // Aggiorna la mappa
        this.updateMap();
    }
    
    /**
     * Gestisce il click sul pulsante indietro
     */
    onBackClick() {
        this.hide();
        this.app.showMenu1();
    }
}

// Esporta la classe
window.Menu3 = Menu3;