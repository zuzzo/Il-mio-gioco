/**
 * Gestore dello storage per gli oggetti AR posizionati
 */
class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'ar-app-objects';
        this.objects = this.loadObjects();
    }
    
    /**
     * Carica gli oggetti salvati dal localStorage
     */
    loadObjects() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error("Errore nel caricamento degli oggetti:", error);
            return [];
        }
    }
    
    /**
     * Salva gli oggetti nel localStorage
     */
    saveObjects() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.objects));
            return true;
        } catch (error) {
            console.error("Errore nel salvataggio degli oggetti:", error);
            return false;
        }
    }
    
    /**
     * Aggiunge un nuovo oggetto
     * @param {Object} object - Oggetto da aggiungere
     * @returns {string} ID dell'oggetto aggiunto
     */
    addObject(object) {
        // Genera un ID unico
        const objectId = 'obj_' + Date.now();
        
        // Aggiungi l'ID all'oggetto
        const newObject = {
            id: objectId,
            ...object,
            timestamp: Date.now()
        };
        
        // Aggiungi alla lista e salva
        this.objects.push(newObject);
        this.saveObjects();
        
        return objectId;
    }
    
    /**
     * Ottiene un oggetto specifico per ID
     * @param {string} objectId - ID dell'oggetto da ottenere
     * @returns {Object|null} L'oggetto trovato o null
     */
    getObject(objectId) {
        return this.objects.find(obj => obj.id === objectId) || null;
    }
    
    /**
     * Ottiene tutti gli oggetti salvati
     * @returns {Array} Lista di oggetti
     */
    getAllObjects() {
        return [...this.objects];
    }
    
    /**
     * Aggiorna un oggetto esistente
     * @param {string} objectId - ID dell'oggetto da aggiornare
     * @param {Object} updates - Proprietà da aggiornare
     * @returns {boolean} True se l'oggetto è stato aggiornato
     */
    updateObject(objectId, updates) {
        const index = this.objects.findIndex(obj => obj.id === objectId);
        
        if (index === -1) return false;
        
        // Aggiorna l'oggetto mantenendo l'ID originale
        this.objects[index] = {
            ...this.objects[index],
            ...updates,
            id: objectId,
            lastModified: Date.now()
        };
        
        this.saveObjects();
        return true;
    }
    
    /**
     * Elimina un oggetto
     * @param {string} objectId - ID dell'oggetto da eliminare
     * @returns {boolean} True se l'oggetto è stato eliminato
     */
    deleteObject(objectId) {
        const initialLength = this.objects.length;
        this.objects = this.objects.filter(obj => obj.id !== objectId);
        
        if (this.objects.length !== initialLength) {
            this.saveObjects();
            return true;
        }
        
        return false;
    }
    
    /**
     * Ottiene gli oggetti vicini a una posizione
     * @param {Object} position - Posizione (lat, lng)
     * @param {number} maxDistance - Distanza massima in metri
     * @returns {Array} Lista di oggetti con distanze
     */
    getNearbyObjects(position, maxDistance = 1000) {
        return this.objects
            .map(obj => {
                const distance = this.calculateDistance(
                    position.latitude, 
                    position.longitude,
                    obj.position.latitude, 
                    obj.position.longitude
                );
                
                return {
                    ...obj,
                    distance
                };
            })
            .filter(obj => obj.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance);
    }
    
    /**
     * Calcola la distanza tra due punti GPS in metri
     * @param {number} lat1 - Latitudine punto 1
     * @param {number} lon1 - Longitudine punto 1
     * @param {number} lat2 - Latitudine punto 2
     * @param {number} lon2 - Longitudine punto 2
     * @returns {number} Distanza in metri
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Raggio della Terra in metri
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c; // Distanza in metri
    }
    
    /**
     * Cancella tutti gli oggetti salvati
     */
    clearAllObjects() {
        this.objects = [];
        this.saveObjects();
    }
}

// Esporta la classe
window.StorageManager = StorageManager;
