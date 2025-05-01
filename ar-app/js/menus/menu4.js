/**
 * Gestisce la pagina di esplorazione (Menu 4)
 */
class Menu4 {
    constructor(app) {
        this.app = app;
        this.menuElement = document.getElementById('menu4');
        
        // Elementi UI
        this.objectList = document.getElementById('object-list');
        this.backBtn = document.getElementById('back-menu1-from-explore-btn');
        
        // Bind dei metodi
        this.onBackClick = this.onBackClick.bind(this);
        this.onObjectClick = this.onObjectClick.bind(this);
    }
    
    /**
     * Inizializza la pagina
     */
    init() {
        // Aggiunge gli event listener
        this.backBtn.addEventListener('click', this.onBackClick);
    }
    
    /**
     * Mostra questa pagina
     */
    show() {
        this.menuElement.classList.remove('hidden');
        document.getElementById('ar-view').classList.remove('hidden');
        document.getElementById('map-view').classList.add('hidden');
        
        // Aggiorna la lista degli oggetti
        this.updateObjectList();
    }
    
    /**
     * Nasconde questa pagina
     */
    hide() {
        this.menuElement.classList.add('hidden');
    }
    
    /**
     * Aggiorna la lista degli oggetti
     */
    updateObjectList() {
        // Ottieni la posizione corrente
        const currentPosition = this.app.geoManager.currentPosition;
        
        if (!currentPosition) {
            this.objectList.innerHTML = '<div class="no-objects">Posizione non disponibile</div>';
            return;
        }
        
        // Ottieni gli oggetti vicini
        const nearbyObjects = this.app.storageManager.getNearbyObjects(currentPosition, 1000);
        
        if (nearbyObjects.length === 0) {
            this.objectList.innerHTML = '<div class="no-objects">Nessun oggetto nelle vicinanze</div>';
            return;
        }
        
        // Crea la lista degli oggetti
        this.objectList.innerHTML = '';
        
        for (const obj of nearbyObjects) {
            const objectItem = document.createElement('div');
            objectItem.className = 'object-item';
            objectItem.dataset.id = obj.id;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = obj.name || 'Oggetto';
            
            const distanceSpan = document.createElement('span');
            distanceSpan.className = 'distance';
            distanceSpan.textContent = `${obj.distance.toFixed(1)} m`;
            
            objectItem.appendChild(nameSpan);
            objectItem.appendChild(distanceSpan);
            
            // Aggiungi event listener per il click
            objectItem.addEventListener('click', () => this.onObjectClick(obj));
            
            this.objectList.appendChild(objectItem);
        }
    }
    
    /**
     * Gestisce il click su un oggetto nella lista
     */
    onObjectClick(object) {
        // Calcola la direzione verso l'oggetto
        const currentPosition = this.app.geoManager.currentPosition;
        
        if (!currentPosition) {
            this.app.showMessage("Posizione non disponibile");
            return;
        }
        
        const bearing = this.app.geoManager.calculateBearing(
            currentPosition.latitude,
            currentPosition.longitude,
            object.position.latitude,
            object.position.longitude
        );
        
        // Visualizza l'oggetto nell'AR
        this.app.arManager.showObject(object, bearing);
        
        // Mostra informazioni sull'oggetto
        this.app.showMessage(`Oggetto "${object.name}": distanza ${object.distance.toFixed(1)} m, direzione ${bearing.toFixed(1)}°`);
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
window.Menu4 = Menu4;