/**
 * Gestione della mappa e dell'area di gioco (Menu 3)
 */
class Menu3 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu3');
        this.mapContainer = document.getElementById('map-container');
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.selectedObjectId = null;
        this.mapInitialized = false;
    }

    init() {
        this.menuElement.addEventListener('click', this.onMenuClick.bind(this));
        this.mapContainer.addEventListener('click', this.onMapClick.bind(this));
    }

    show() {
        this.menuElement.classList.remove('hidden');
        this.initMap();
    }

    hide() {
        this.menuItem.classList.add('hidden');
    }

    initMap() {
        if (this.mapInitialized) return;
        
        this.map = L.map(this.mapContainer).setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        this.userMarker = L.marker([51.505, -0.09]).addTo(this.map)
            .bindPopup('Your position')
            .openPopup();

        this.mapInitialized = true;
    }

    onMenuClick(e) {
        // Gestione click sul menu
    }

    onMapClick(e) {
        // Gestione click sulla mappa
    }

    addMarker(lat, lng, title) {
        const marker = L.marker([lat, lng]).addTo(this.map)
            .bindPopup(title);
        this.markers.push(marker);
        return marker;
    }

    removeMarker(marker) {
        this.map.removeLayer(marker);
        this.markers = this.markers.filter(m => m !== marker);
    }

    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }
}

// Esportazione della classe
window.Menu3 = Menu3;
