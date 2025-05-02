/**
 * Gestisce la pagina della mappa (Menu 3)
 */
class Menu3 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu3');
        this.mapContainer = document.getElementById('map-container');
        this.selectedObjectName = document.getElementById('selected-object-name');
        this.centerMapBtn = document.getElementById('center-map-btn');
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
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
        this.centerMapBtn.addEventListener('click', this.onCenterMapClick);
        this.zoomInBtn.addEventListener('click', this.onZoomInClick);
        this.zoomOutBtn.addEventListener('click', this.onZoomOutClick);
        this.deleteObjectBtn.addEventListener('click', this.onDeleteObjectClick);
        this.drawAreaBtn.addEventListener('click', this.onDrawAreaClick);
        this.backBtn.addEventListener('click', this.onBackClick);
        this.deleteObjectBtn.disabled = true;
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
            this.map.on('click', () => this.deselectObject());
            
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
            this.app.showMessage("Disegna l'area di gioco sulla mappa. Chiudi la forma cliccando sul primo punto.");
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
        
        this.drawControl = new L.Control.Draw({
            draw: {
                polygon: {
                    shapeOptions: {
                        color: '#2e8b57',
                        fillOpacity: 0.3
                    },
                    allowIntersection: false,
                    drawError: {
                        color: '#ff0000',
                        message: 'Il poligono non può intersecarsi'
                    },
                    closeOnClick: true,
                    minimumPoints: 3
                },
                polyline: false,
                rectangle: false,
                circle: false,
                marker: false
            }
        });
    }

    enableDrawing() {
        this.drawing = true;
        // Disable map interactions
        this.map.dragging.disable();
        this.map.touchZoom.disable();
        this.map.doubleClickZoom.disable();
        this.map.scrollWheelZoom.disable();
        this.map.boxZoom.disable();
        this.map.keyboard.disable();
        this.map._container.style.cursor = 'crosshair';
        
        // Enable drawing controls
        this.map.addControl(this.drawControl);
        this.map.on('draw:created', this.onDrawComplete, this);
    }

    disableDrawing() {
        this.drawing = false;
        // Re-enable map interactions
        this.map.dragging.enable();
        this.map.touchZoom.enable();
        this.map.doubleClickZoom.enable();
        this.map.scrollWheelZoom.enable();
        this.map.boxZoom.enable();
        this.map.keyboard.enable();
        this.map._container.style.cursor = '';
        
        // Remove drawing controls
        this.map.removeControl(this.drawControl);
        this.map.off('draw:created', this.onDrawComplete, this);
    }

    onDrawComplete(e) {
        const layer = e.layer;
        const polygon = layer.toGeoJSON();
        
        if (polygon.geometry.coordinates[0].length < 3) {
            alert('Devi disegnare almeno 3 punti per formare un poligono');
            return;
        }
        
        if (turf.booleanCrosses(polygon, polygon)) {
            alert('Il poligono non può intersecarsi');
            return;
        }
        
        this.drawnItems.clearLayers();
        this.drawnItems.addLayer(layer);
        this.areaLayer = layer;
        this.disableDrawing();
        localStorage.setItem('gameArea', JSON.stringify(polygon));
    }

    isInsideArea(lat, lng) {
        if (!this.areaLayer) return true;
        const point = turf.point([lng, lat]);
        const polygon = this.areaLayer.toGeoJSON();
        return turf.booleanPointInPolygon(point, polygon);
    }
}

window.Menu3 = Menu3;
