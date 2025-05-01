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
        this.map = null; // Conterrà { ctx, canvas, center, zoom, objects }
        this.markers = []; // Potrebbe non essere usato se disegniamo direttamente
        this.userMarker = null; // Potrebbe non essere usato se disegniamo direttamente
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
        this.resizeMap = this.resizeMap.bind(this); // Aggiunto bind per resize
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

        // Disabilita il pulsante elimina inizialmente
        this.deleteObjectBtn.disabled = true;
    }

    /**
     * Mostra questo menu
     */
    show() {
        // Mostra il menu
        this.menuElement.classList.remove('hidden');

        // Mostra la vista mappa, nascondi AR
        document.getElementById('ar-view').classList.add('hidden');
        document.getElementById('map-view').classList.remove('hidden');

        // Inizializza la mappa se non l'ha ancora fatto
        // È meglio inizializzare solo se la posizione è disponibile
        if (!this.mapInitialized && this.app.geoManager.currentPosition) {
            this.initMap();
        } else if (this.mapInitialized) {
            // Aggiorna la mappa se già inizializzata
            this.resizeMap(); // Assicura dimensioni corrette
            this.updateMap();
        } else {
             this.app.showMessage("In attesa della posizione GPS per inizializzare la mappa...");
             // Potremmo aggiungere un listener per quando la posizione diventa disponibile
        }
    }

    /**
     * Nasconde questo menu
     */
    hide() {
        this.menuElement.classList.add('hidden');
        // Potremmo voler fermare aggiornamenti mappa qui se consumano risorse
    }

    /**
     * Inizializza la mappa (usa Leaflet se disponibile, altrimenti canvas base)
     */
    initMap() {
        // Preferisci Leaflet se la libreria è inclusa
        if (typeof L !== 'undefined') {
            this.initLeafletMap();
        } else {
            // Fallback a canvas semplice se Leaflet non c'è
            this.initCanvasMap();
        }
    }

    /**
     * Inizializza mappa con Leaflet.js
     */
     initLeafletMap() {
        try {
            const position = this.app.geoManager.currentPosition;
            if (!position) {
                this.app.showMessage("Posizione GPS non disponibile per inizializzare la mappa.");
                return;
            }

            // Pulisci container precedente
            this.mapContainer.innerHTML = '';

            this.map = L.map(this.mapContainer).setView([position.latitude, position.longitude], 16); // Zoom iniziale

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);

            // Icona utente personalizzata
            const userIcon = L.icon({
                iconUrl: 'assets/icons/user-marker.png', // Assicurati che esista questa icona
                iconSize: [25, 25],
                iconAnchor: [12, 12],
            });

            // Aggiungi marcatore utente
            this.userMarker = L.marker([position.latitude, position.longitude], { icon: userIcon }).addTo(this.map);

            // Aggiungi listener per click sulla mappa
            this.map.on('click', (e) => {
                this.deselectObject(); // Deseleziona cliccando sulla mappa
            });

            this.mapInitialized = true;
            this.updateMap(); // Carica oggetti esistenti
            this.app.log("Mappa Leaflet inizializzata.");

            // Forza ridimensionamento mappa dopo un breve ritardo
             setTimeout(() => this.map.invalidateSize(), 100);

        } catch (error) {
            console.error("Errore inizializzazione Leaflet:", error);
            this.app.log(`Errore mappa Leaflet: ${error.message}`);
            this.app.showMessage("Errore durante l'inizializzazione della mappa.");
            // Prova fallback a canvas?
            // this.initCanvasMap();
        }
    }


    /**
     * Inizializza mappa con Canvas 2D (Fallback)
     */
    initCanvasMap() {
        try {
            const position = this.app.geoManager.currentPosition;
            if (!position) {
                this.app.showMessage("Posizione GPS non disponibile per inizializzare la mappa.");
                return;
            }

            const canvas = document.createElement('canvas');
            this.mapContainer.innerHTML = ''; // Pulisci container
            this.mapContainer.appendChild(canvas);

            this.map = {
                ctx: canvas.getContext('2d'),
                canvas: canvas,
                center: { latitude: position.latitude, longitude: position.longitude },
                zoom: 0.5, // Metri per pixel (zoom più ampio)
                objects: [] // Non usato direttamente qui
            };

            this.resizeMap(); // Imposta dimensioni iniziali

            canvas.addEventListener('click', (event) => this.handleMapClick(event));
            window.addEventListener('resize', this.resizeMap); // Usa il metodo associato

            this.mapInitialized = true;
            this.updateMap();
            this.app.log("Mappa Canvas 2D inizializzata (Fallback).");

        } catch (error) {
            console.error("Errore nell'inizializzazione della mappa Canvas:", error);
            this.app.log("Errore mappa Canvas: " + error.message);
        }
    }

     /**
     * Ridimensiona la mappa Canvas
     */
    resizeMap() {
        if (this.map && this.map.canvas) { // Verifica se è mappa canvas
            const canvas = this.map.canvas;
            canvas.width = this.mapContainer.clientWidth;
            canvas.height = this.mapContainer.clientHeight;
            this.updateMap(); // Ridisegna dopo resize
        } else if (this.map && typeof this.map.invalidateSize === 'function') { // Verifica se è mappa Leaflet
             this.map.invalidateSize();
        }
    }

    /**
     * Gestisce il click sulla mappa (per Canvas 2D)
     */
    handleMapClick(event) {
        if (!this.map || !this.map.canvas) return; // Solo per mappa canvas

        const canvas = this.map.canvas;
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const currentPosition = this.app.geoManager.currentPosition;
        if (!currentPosition) return;

        const objects = this.app.storageManager.getAllObjects();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const metersPerPixel = this.map.zoom;

        let objectClicked = null;

        for (const obj of objects) {
            const dx = this.app.geoManager.calculateLongitudeDistance(
                currentPosition.longitude, obj.position.longitude, currentPosition.latitude
            );
            const dy = this.app.geoManager.calculateLatitudeDistance(
                currentPosition.latitude, obj.position.latitude
            );

            const pixelX = centerX + (dx / metersPerPixel);
            const pixelY = centerY - (dy / metersPerPixel); // Y invertita

            // Distanza dal click al centro del marker (es. 10 pixel)
            const distance = Math.sqrt(Math.pow(clickX - pixelX, 2) + Math.pow(clickY - pixelY, 2));

            if (distance <= 10) { // Raggio di click
                objectClicked = obj;
                break;
            }
        }

        if (objectClicked) {
            this.selectObject(objectClicked);
        } else {
            this.deselectObject();
        }
    }

    /**
     * Seleziona un oggetto (aggiornato per Leaflet)
     */
    selectObject(object) {
        this.selectedObjectId = object.id;
        this.selectedObjectName.textContent = object.name || `Oggetto ${object.id}`;
        this.deleteObjectBtn.disabled = false;
        this.app.log(`Oggetto selezionato: ${object.name || 'Oggetto'} (ID: ${object.id})`);

        // Evidenzia su Leaflet (se presente)
        if (this.map && typeof this.map.eachLayer === 'function') {
             this.markers.forEach(marker => {
                 if (marker.objectId === object.id) {
                     // Cambia icona o aggiungi stile per evidenziare
                     marker.setOpacity(1.0); // Esempio: rendi opaco
                 } else {
                     marker.setOpacity(0.6); // Esempio: rendi semi-trasparente
                 }
             });
        } else {
            // Ridisegna mappa canvas per evidenziare
            this.updateMap();
        }
    }

    /**
     * Deseleziona l'oggetto corrente (aggiornato per Leaflet)
     */
    deselectObject() {
        this.selectedObjectId = null;
        this.selectedObjectName.textContent = 'Nessun oggetto selezionato';
        this.deleteObjectBtn.disabled = true;

        // Rimuovi evidenziazione Leaflet
        if (this.map && typeof this.map.eachLayer === 'function') {
            this.markers.forEach(marker => marker.setOpacity(1.0)); // Rendi tutti opachi
        } else {
            // Ridisegna mappa canvas
            this.updateMap();
        }
    }

    /**
     * Aggiorna la mappa (distingue tra Leaflet e Canvas)
     */
    updateMap() {
        if (!this.mapInitialized) return;

        if (this.map && typeof this.map.eachLayer === 'function') { // Leaflet
            this.updateLeafletMap();
        } else if (this.map && this.map.canvas) { // Canvas
            this.updateCanvasMap();
        }
    }

     /**
     * Aggiorna la mappa Leaflet
     */
    updateLeafletMap() {
        const position = this.app.geoManager.currentPosition;
        if (!position) return;

        // Aggiorna posizione utente
        if (this.userMarker) {
            this.userMarker.setLatLng([position.latitude, position.longitude]);
        }

        // Aggiorna oggetti
        const objects = this.app.storageManager.getAllObjects();
        const existingMarkerIds = this.markers.map(m => m.objectId);
        const currentObjectIds = objects.map(o => o.id);

        // Rimuovi marker non più esistenti
        this.markers = this.markers.filter(marker => {
            if (!currentObjectIds.includes(marker.objectId)) {
                this.map.removeLayer(marker);
                return false;
            }
            return true;
        });
        existingMarkerIds = this.markers.map(m => m.objectId); // Aggiorna ID esistenti

        // Aggiungi nuovi marker
        objects.forEach(obj => {
            if (!existingMarkerIds.includes(obj.id)) {
                const marker = L.marker([obj.position.latitude, obj.position.longitude])
                    .addTo(this.map)
                    .bindPopup(obj.name || `Oggetto ${obj.id}`); // Mostra nome su click

                marker.objectId = obj.id; // Associa ID al marker
                marker.on('click', () => this.selectObject(obj)); // Seleziona su click
                this.markers.push(marker);
            }
        });

         // Aggiorna opacità selezione
         this.markers.forEach(marker => {
             marker.setOpacity(marker.objectId === this.selectedObjectId ? 1.0 : 0.6);
         });
    }

    /**
     * Aggiorna la mappa Canvas 2D
     */
    updateCanvasMap() {
        if (!this.map || !this.map.canvas) return;

        const ctx = this.map.ctx;
        const canvas = this.map.canvas;
        const position = this.app.geoManager.currentPosition;

        // Pulisci canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Disegna sfondo
        ctx.fillStyle = '#e8f4ea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Disegna griglia
        ctx.strokeStyle = '#c0d6c9';
        ctx.lineWidth = 0.5;
        const gridSize = 50; // Pixel
        for (let x = 0; x < canvas.width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
        for (let y = 0; y < canvas.height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

        if (!position) return; // Serve posizione per disegnare oggetti relativi

        const objects = this.app.storageManager.getAllObjects();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const metersPerPixel = this.map.zoom;

        // Disegna oggetti
        objects.forEach(obj => {
            const dx = this.app.geoManager.calculateLongitudeDistance(
                position.longitude, obj.position.longitude, position.latitude
            );
            const dy = this.app.geoManager.calculateLatitudeDistance(
                position.latitude, obj.position.latitude
            );

            const pixelX = centerX + (dx / metersPerPixel);
            const pixelY = centerY - (dy / metersPerPixel); // Y invertita

            // Disegna marker oggetto
            ctx.beginPath();
            ctx.arc(pixelX, pixelY, 8, 0, Math.PI * 2); // Cerchio
            ctx.fillStyle = (obj.id === this.selectedObjectId) ? '#ff0000' : '#007bff'; // Rosso se selezionato
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

             // Scrivi nome oggetto (opzionale)
             ctx.fillStyle = '#333';
             ctx.font = '10px sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText(obj.name || `ID:${obj.id}`, pixelX, pixelY - 12);
        });

        // Disegna marcatore utente al centro
        ctx.beginPath();
        ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#3498db';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Triangolo per direzione (se disponibile orientamento)
        const heading = this.app.geoManager.currentOrientation?.alpha || 0;
        const headingRad = heading * Math.PI / 180;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-headingRad); // Ruota in base alla direzione nord
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.closePath();
        ctx.fillStyle = '#2980b9';
        ctx.fill();
        ctx.restore();
    }


    /**
     * Gestisce il click sul pulsante "Centra su di me"
     */
    onCenterMapClick() {
        if (!this.mapInitialized) return;
        const position = this.app.geoManager.currentPosition;
        if (position) {
             if (this.map && typeof this.map.setView === 'function') { // Leaflet
                 this.map.setView([position.latitude, position.longitude], this.map.getZoom());
             } else if (this.map && this.map.center) { // Canvas
                 this.map.center = { latitude: position.latitude, longitude: position.longitude };
                 this.updateMap();
             }
            this.app.log("Mappa centrata sulla posizione utente.");
        } else {
            this.app.showMessage("Posizione utente non ancora disponibile.");
        }
    }

    /**
     * Gestisce il click sul pulsante "Zoom In"
     */
    onZoomInClick() {
        if (!this.mapInitialized) return;
         if (this.map && typeof this.map.zoomIn === 'function') { // Leaflet
             this.map.zoomIn();
         } else if (this.map && this.map.zoom) { // Canvas
             this.map.zoom /= 1.5; // Riduci metri per pixel
             this.updateMap();
         }
        this.app.log("Zoom In mappa.");
    }

    /**
     * Gestisce il click sul pulsante "Zoom Out"
     */
    onZoomOutClick() {
        if (!this.mapInitialized) return;
         if (this.map && typeof this.map.zoomOut === 'function') { // Leaflet
             this.map.zoomOut();
         } else if (this.map && this.map.zoom) { // Canvas
             this.map.zoom *= 1.5; // Aumenta metri per pixel
             this.updateMap();
         }
        this.app.log("Zoom Out mappa.");
    }

    /**
     * Gestisce il click sul pulsante "Elimina oggetto selezionato"
     */
    onDeleteObjectClick() {
        if (this.selectedObjectId !== null) {
            const objectName = this.selectedObjectName.textContent;
            if (confirm(`Sei sicuro di voler eliminare "${objectName}"?`)) {
                const success = this.app.storageManager.deleteObject(this.selectedObjectId);
                if (success) {
                    this.app.log(`Oggetto eliminato: ID ${this.selectedObjectId}`);
                    this.app.showMessage(`Oggetto "${objectName}" eliminato.`);
                    this.deselectObject(); // Deseleziona e aggiorna mappa
                } else {
                    this.app.log(`Errore eliminazione oggetto: ID ${this.selectedObjectId}`);
                    this.app.showMessage("Errore durante l'eliminazione dell'oggetto.");
                }
            }
        }
    }

    /**
     * Gestisce il click sul pulsante "Disegna area di gioco" (Placeholder)
     */
    onDrawAreaClick() {
        this.app.showMessage("Funzionalità 'Disegna area' non ancora implementata.");
        this.app.log("Tentativo di usare 'Disegna area' (non implementato).");
        // Qui si aggiungerebbe la logica per disegnare un poligono sulla mappa
    }

    /**
     * Gestisce il click sul pulsante "Torna al menu 1"
     */
    onBackClick() {
        this.hide();
        this.app.showMenu1();
    }
} // Chiusura classe Menu3

// Esporta la classe
window.Menu3 = Menu3;
