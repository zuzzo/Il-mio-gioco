/**
 * Gestisce la pagina della mappa (Menu 3)
 */
class Menu3 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu3');
        this.mapContainer = document.getElementById('map-container');
        this.selectedObjectName = document.getElementById('selected-object-name');
        this.deleteObjectBtn = document.getElementById('delete-object-btn');
        this.drawAreaBtn = document.getElementById('draw-area-btn');
        this.backBtn = document.getElementById('back-menu1-from-map-btn');

        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.selectedObjectId = null;
        this.mapInitialized = false;
        this.gameAreaManager = null;

        // Bind dei metodi
        this.onCenterMapClick = this.onCenterMapClick.bind(this);
        this.onZoomInClick = this.onZoomInClick.bind(this);
        this.onZoomOutClick = this.onZoomOutClick.bind(this);
        this.onDeleteObjectClick = this.onDeleteObjectClick.bind(this);
        this.onDrawAreaClick = this.onDrawAreaClick.bind(this);
        this.onBackClick = this.onBackClick.bind(this);
    }

    init() {
        // Setup touch gestures
        this.mapContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), {passive: false});
        this.mapContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), {passive: false});
        this.mapContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Setup mouse events
        this.mapContainer.addEventListener('click', this.handleMouseClick.bind(this));
        
        this.deleteObjectBtn.addEventListener('click', this.onDeleteObjectClick);
        this.drawAreaBtn.addEventListener('click', this.onDrawAreaClick);
        this.backBtn.addEventListener('click', this.onBackClick);
        this.deleteObjectBtn.disabled = true;
    }
    
    handleMouseClick(e) {
        // Se siamo in modalità disegno, aggiungi un punto
        if (this.gameAreaManager?.drawing) {
            e.stopPropagation(); // Previeni altri handler
            
            const rect = this.mapContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const latlng = this.map.containerPointToLatLng(
                L.point(x, y)
            );
            
            this.gameAreaManager.addPointToPolygon(latlng);
            return false;
        }
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.touchStart = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            };
        }
    }

    handleTouchMove(e) {
        if (!this.touchStart || e.touches.length !== 1) return;
        e.preventDefault();
    }

    handleTouchEnd(e) {
        if (!this.touchStart) return;
        
        const touchEnd = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY,
            time: Date.now()
        };

        const dx = touchEnd.x - this.touchStart.x;
        const dy = touchEnd.y - this.touchStart.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const duration = touchEnd.time - this.touchStart.time;

        // Single tap
        if (distance < 10 && duration < 500) {
            this.handleSingleTap(touchEnd);
        }

        this.touchStart = null;
    }

    handleSingleTap(touchPos) {
        if (this.gameAreaManager?.drawing) {
            const rect = this.mapContainer.getBoundingClientRect();
            const x = touchPos.x - rect.left;
            const y = touchPos.y - rect.top;
            
            const latlng = this.map.containerPointToLatLng(
                L.point(x, y)
            );
            this.gameAreaManager.addPointToPolygon(latlng);
        }
    }

    show() {
        this.menuElement.classList.remove('hidden');
        document.getElementById('ar-view').classList.add('hidden');
        document.getElementById('map-view').classList.remove('hidden');

        if (!this.mapInitialized && this.app.geoManager.currentPosition) {
            this.initMap();
        } else if (this.mapInitialized) {
            this.updateMap();
        }
    }

    hide() {
        this.menuElement.classList.add('hidden');
    }

    initMap() {
        try {
            const position = this.app.geoManager.currentPosition;
            if (!position) return;

            this.mapContainer.innerHTML = '';
            this.map = L.map(this.mapContainer).setView([position.latitude, position.longitude], 16);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(this.map);

            const userIcon = L.divIcon({
                className: 'user-marker-icon',
                html: '<div style="background-color: #3498db; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                iconSize: [26, 26],
                iconAnchor: [13, 13],
            });

            this.userMarker = L.marker([position.latitude, position.longitude], { icon: userIcon }).addTo(this.map);
            this.map.on('click', (e) => {
                // Solo se non siamo in modalità disegno
                if (!this.gameAreaManager?.drawing) {
                    this.deselectObject();
                }
            });
            
            this.gameAreaManager = new GameAreaManager(this.map);
            this.mapInitialized = true;
            this.updateMap();
            setTimeout(() => this.map.invalidateSize(), 100);

        } catch (error) {
            console.error("Errore inizializzazione mappa:", error);
            this.app.showMessage("Errore durante l'inizializzazione della mappa.");
        }
    }

    updateMap() {
        if (!this.mapInitialized) return;
        
        const position = this.app.geoManager.currentPosition;
        if (!position) return;

        if (this.userMarker) {
            this.userMarker.setLatLng([position.latitude, position.longitude]);
        }

        const objects = this.app.storageManager.getAllObjects();
        const existingIds = this.markers.map(m => m.objectId);
        const currentIds = objects.map(o => o.id);

        // Rimuovi marker non più esistenti
        this.markers = this.markers.filter(marker => {
            if (!currentIds.includes(marker.objectId)) {
                this.map.removeLayer(marker);
                return false;
            }
            return true;
        });

        // Aggiungi nuovi marker
        objects.forEach(obj => {
            if (!existingIds.includes(obj.id)) {
                const icon = this.createObjectIcon(obj);
                const marker = L.marker([obj.position.latitude, obj.position.longitude], { icon })
                    .addTo(this.map)
                    .bindPopup(obj.name || `Oggetto ${obj.id}`);
                
                marker.objectId = obj.id;
                marker.on('click', () => this.selectObject(obj));
                this.markers.push(marker);
            }
        });
    }

    createObjectIcon(object) {
        let color = '#ff9800';
        let iconHtml = '';
        
        if (object.modelPath) {
            const modelName = object.modelPath.toLowerCase();
            if (modelName.includes('treasure')) {
                color = '#ffd700';
                iconHtml = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">💰</div>';
            } else if (modelName.includes('key')) {
                color = '#c0c0c0';
                iconHtml = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🔑</div>';
            } else if (modelName.includes('door')) {
                color = '#8b4513';
                iconHtml = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🚪</div>';
            }
        }
        
        if (!iconHtml) {
            iconHtml = `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>`;
        }
        
        return L.divIcon({
            className: 'object-marker-icon',
            html: iconHtml,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });
    }

    selectObject(object) {
        this.selectedObjectId = object.id;
        this.selectedObjectName.textContent = object.name || `Oggetto ${object.id}`;
        this.deleteObjectBtn.disabled = false;
        this.markers.forEach(m => m.setOpacity(m.objectId === object.id ? 1.0 : 0.6));
    }

    deselectObject() {
        this.selectedObjectId = null;
        this.selectedObjectName.textContent = 'Nessun oggetto selezionato';
        this.deleteObjectBtn.disabled = true;
        this.markers.forEach(m => m.setOpacity(1.0));
    }

    onCenterMapClick() {
        if (!this.mapInitialized) return;
        const pos = this.app.geoManager.currentPosition;
        if (pos) this.map.setView([pos.latitude, pos.longitude], this.map.getZoom());
    }

    onZoomInClick() {
        if (this.mapInitialized) this.map.zoomIn();
    }

    onZoomOutClick() {
        if (this.mapInitialized) this.map.zoomOut();
    }

    onDeleteObjectClick() {
        if (this.selectedObjectId && confirm("Sei sicuro di voler eliminare l'oggetto?")) {
            this.app.storageManager.deleteObject(this.selectedObjectId);
            this.deselectObject();
        }
    }

    onDrawAreaClick() {
        if (!this.gameAreaManager) return;
        
        if (this.gameAreaManager.drawing) {
            this.gameAreaManager.disableDrawing();
            this.drawAreaBtn.textContent = "Disegna area di gioco";
        } else {
            this.gameAreaManager.enableDrawing();
            this.drawAreaBtn.textContent = "Annulla disegno";
            this.app.showMessage("Disegna l'area di gioco toccando la mappa. Premi 'Conferma Area' quando hai finito.");
        }
    }

    onBackClick() {
        this.hide();
        this.app.showMenu1();
    }
}

class GameAreaManager {
    constructor(map) {
        this.map = map;
        this.drawing = false;
        this.areaLayer = null;
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
        this.points = [];
        this.tempLine = null;
        this.polygonStyle = {
            color: '#2e8b57',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.3
        };
    }

    enableDrawing() {
        this.drawing = true;
        this.points = [];
        
        // Disable map interactions
        this.map.dragging.disable();
        this.map.touchZoom.disable();
        this.map.doubleClickZoom.disable();
        this.map.scrollWheelZoom.disable();
        this.map.boxZoom.disable();
        this.map.keyboard.disable();
        this.map._container.style.cursor = 'crosshair';
        
        // Aggiungi pulsante di conferma
        this.addConfirmButton();
    }

    disableDrawing() {
        this.drawing = false;
        this.points = [];
        
        // Re-enable map interactions
        this.map.dragging.enable();
        this.map.touchZoom.enable();
        this.map.doubleClickZoom.enable();
        this.map.scrollWheelZoom.enable();
        this.map.boxZoom.enable();
        this.map.keyboard.enable();
        this.map._container.style.cursor = '';
        
        // Rimuovi pulsante di conferma
        this.removeConfirmButton();
        
        // Rimuovi linea temporanea
        if (this.tempLine) {
            this.map.removeLayer(this.tempLine);
            this.tempLine = null;
        }
    }
    
    addConfirmButton() {
        // Crea pulsante di conferma
        this.confirmButton = L.control({position: 'bottomright'});
        this.confirmButton.onAdd = () => {
            const div = L.DomUtil.create('div', 'confirm-area-button');
            div.innerHTML = '<button style="padding: 10px; background-color: #2e8b57; color: white; border: none; border-radius: 5px; cursor: pointer;">Conferma Area</button>';
            L.DomEvent.on(div, 'click', L.DomEvent.stop);
            L.DomEvent.on(div, 'click', () => this.completePolygon());
            return div;
        };
        this.confirmButton.addTo(this.map);
    }
    
    removeConfirmButton() {
        if (this.confirmButton) {
            this.confirmButton.remove();
            this.confirmButton = null;
        }
    }

    addPointToPolygon(latlng) {
        if (!this.drawing) return;
        
        // Aggiungi punto
        this.points.push(latlng);
        
        // Aggiorna visualizzazione
        this.updatePolygonPreview();
        
        // Feedback visivo
        L.circleMarker(latlng, {
            radius: 5,
            color: '#2e8b57',
            fillColor: '#2e8b57',
            fillOpacity: 1
        }).addTo(this.drawnItems);
    }
    
    updatePolygonPreview() {
        // Rimuovi linea temporanea precedente
        if (this.tempLine) {
            this.map.removeLayer(this.tempLine);
        }
        
        // Crea nuova linea temporanea
        if (this.points.length > 1) {
            this.tempLine = L.polyline(this.points, this.polygonStyle).addTo(this.map);
        }
    }
    
    completePolygon() {
        try {
            // Verifica numero minimo di punti
            if (this.points.length < 3) {
                alert('Devi disegnare almeno 3 punti per formare un poligono valido');
                return;
            }
            
            // Crea poligono
            const polygon = L.polygon(this.points, this.polygonStyle);
            
            // Converti in GeoJSON
            const geoJson = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [this.points.map(p => [p.lng, p.lat])]
                }
            };
            
            // Salva poligono
            this.drawnItems.clearLayers();
            this.drawnItems.addLayer(polygon);
            this.areaLayer = polygon;
            
            // Salva in localStorage
            localStorage.setItem('gameArea', JSON.stringify(geoJson));
            
            // Disabilita modalità disegno
            this.disableDrawing();
            
        } catch (error) {
            console.error('Errore nel salvataggio area:', error);
            alert("Errore durante il salvataggio dell'area");
        }
    }

    isInsideArea(lat, lng) {
        if (!this.areaLayer) return true;
        const point = turf.point([lng, lat]);
        const polygon = this.areaLayer.toGeoJSON();
        return turf.booleanPointInPolygon(point, polygon);
    }
}

window.Menu3 = Menu3;
