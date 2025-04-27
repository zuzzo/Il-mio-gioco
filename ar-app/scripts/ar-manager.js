/**
 * Gestisce la realtà aumentata con Babylon.js
 */
class ARManager {
    constructor() {
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.isARSupported = false;
        this.isARMode = false;
        this.arObject = null;
        this.directionIndicator = null;
        this.savedObjectOrientation = 0; // Angolo in gradi
    }

    /**
     * Inizializza il motore di rendering 3D
     */
    async init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.engine = new BABYLON.Engine(this.canvas, true);
        
        // Crea una scena vuota
        this.scene = this.createScene();
        
        // Avvia il loop di rendering
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
        
        // Gestisce il ridimensionamento della finestra
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        
        // Controlla se WebXR è supportato
        this.isARSupported = await this.checkARSupport();
        
        return this.isARSupported;
    }
    
    /**
     * Crea la scena di base
     */
    createScene() {
        const scene = new BABYLON.Scene(this.engine);
        
        // Luce ambientale
        const hemisphericLight = new BABYLON.HemisphericLight(
            "hemisphericLight", 
            new BABYLON.Vector3(0, 1, 0), 
            scene
        );
        hemisphericLight.intensity = 0.7;
        
        // Luce direzionale
        const directionalLight = new BABYLON.DirectionalLight(
            "directionalLight",
            new BABYLON.Vector3(0, -1, 1),
            scene
        );
        directionalLight.intensity = 0.5;
        
        return scene;
    }
    
    /**
     * Controlla se la realtà aumentata è supportata
     */
    async checkARSupport() {
        try {
            if (navigator.xr) {
                const isSupported = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');
                return isSupported;
            }
            return false;
        } catch (error) {
            console.error("Errore nel controllo del supporto AR:", error);
            return false;
        }
    }
    
    /**
     * Avvia l'esperienza AR
     */
    async startARExperience() {
        if (!this.isARSupported) {
            console.error("AR non supportata su questo dispositivo");
            return false;
        }
        
        try {
            // Configura l'esperienza AR
            const xr = this.scene.createDefaultXRExperienceAsync({
                uiOptions: {
                    sessionMode: "immersive-ar",
                    referenceSpaceType: "local-floor"
                },
                optionalFeatures: true
            });
            
            this.isARMode = true;
            
            return xr.then((xrExperience) => {
                // Gestisce l'inizio della sessione AR
                xrExperience.baseExperience.onInitialXRPoseSetObservable.add((xrCamera) => {
                    console.log("Sessione AR iniziata");
                });
                
                return true;
            });
        } catch (error) {
            console.error("Errore nell'avvio dell'esperienza AR:", error);
            return false;
        }
    }
    
    /**
     * Posiziona un oggetto virtuale nella scena
     * @param {string} modelPath - Percorso del file del modello 3D da caricare
     * @param {number} deviceOrientation - Orientamento del dispositivo al momento del posizionamento (gradi)
     */
    async placeVirtualObject(modelPath = 'assets/models/treasure.glb', deviceOrientation = 0) {
        if (!this.arObject) {
            try {
                // Salva l'orientamento dell'oggetto
                this.savedObjectOrientation = deviceOrientation;
                
                // Mostra un cubo placeholder mentre il modello si carica
                const placeholder = BABYLON.MeshBuilder.CreateBox("placeholder", {
                    width: 0.2, height: 0.2, depth: 0.2
                }, this.scene);
                
                const placeholderMaterial = new BABYLON.StandardMaterial("placeholderMat", this.scene);
                placeholderMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                placeholderMaterial.alpha = 0.5;
                placeholder.material = placeholderMaterial;
                
                // Carica il modello 3D
                const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", modelPath, this.scene);
                
                // Il modello caricato è nell'array result.meshes
                this.arObject = result.meshes[0]; // Il nodo principale
                
                // Calcola la dimensione del modello e scala se necessario
                const boundingInfo = this.calculateBoundingInfo(result.meshes);
                const maxDimension = Math.max(
                    boundingInfo.maximum.x - boundingInfo.minimum.x,
                    boundingInfo.maximum.y - boundingInfo.minimum.y,
                    boundingInfo.maximum.z - boundingInfo.minimum.z
                );
                
                // Scala il modello a circa 0.5 metri di altezza
                const scaleFactor = 0.5 / maxDimension;
                this.arObject.scaling.scaleInPlace(scaleFactor);
                
                // Posiziona l'oggetto davanti alla camera
                this.arObject.position = new BABYLON.Vector3(0, 0, 2);
                
                // Applica la rotazione basata sull'orientamento del dispositivo
                // Convertiamo l'angolo della bussola in radianti per Babylon.js
                // Nota: Per la rotazione Y, usiamo il negativo dell'angolo perché
                // l'orientamento del dispositivo e la rotazione 3D lavorano in direzioni opposte
                const orientationRadians = (this.savedObjectOrientation * Math.PI) / 180;
                this.arObject.rotation.y = -orientationRadians;
                
                // Rimuovi il placeholder
                placeholder.dispose();
                
                console.log(`Oggetto posizionato con orientamento: ${this.savedObjectOrientation.toFixed(1)}°`);
                
            } catch (error) {
                console.error("Errore nel caricamento del modello 3D:", error);
                
                // In caso di errore, usa un cubo rosso come fallback
                this.arObject = BABYLON.MeshBuilder.CreateBox("arObject", {
                    width: 0.5, height: 0.5, depth: 0.5
                }, this.scene);
                
                const material = new BABYLON.StandardMaterial("objectMaterial", this.scene);
                material.diffuseColor = new BABYLON.Color3(1, 0, 0);
                material.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
                this.arObject.material = material;
                
                // Posiziona l'oggetto davanti alla camera
                this.arObject.position = new BABYLON.Vector3(0, 0, 2);
                
                // Applica comunque la rotazione
                const orientationRadians = (this.savedObjectOrientation * Math.PI) / 180;
                this.arObject.rotation.y = -orientationRadians;
            }
        } else {
            this.arObject.isVisible = true;
        }
        
        return this.arObject;
    }
    
    /**
     * Calcola la bounding box per un gruppo di mesh
     * @param {Array} meshes - Array di mesh
     * @returns {BABYLON.BoundingInfo} Informazioni sui limiti dell'oggetto
     */
    calculateBoundingInfo(meshes) {
        let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
        
        for (const mesh of meshes) {
            if (mesh.getBoundingInfo) {
                const boundingInfo = mesh.getBoundingInfo();
                const meshMin = boundingInfo.minimum;
                const meshMax = boundingInfo.maximum;
                
                min = BABYLON.Vector3.Minimize(min, meshMin);
                max = BABYLON.Vector3.Maximize(max, meshMax);
            }
        }
        
        return new BABYLON.BoundingInfo(min, max);
    }
    
    /**
     * Posiziona un oggetto virtuale basato su una posizione geo relativa
     * @param {number} distance - Distanza in metri
     * @param {number} bearing - Direzione in gradi (0 = Nord, 90 = Est)
     * @param {number} deviceHeading - Direzione attuale del dispositivo (bussola)
     */
    updateObjectPosition(distance, bearing, deviceHeading = 0) {
        if (!this.arObject) {
            return null;
        }
        
        // Limita la distanza massima per una migliore visualizzazione in AR
        // Gli oggetti troppo lontani possono essere difficili da vedere
        const maxDistance = 20; // metri
        const clampedDistance = Math.min(distance, maxDistance);
        
        // Converti la direzione da gradi a radianti
        const bearingRad = (bearing * Math.PI) / 180;
        
        // Calcola la posizione relativa
        // Usiamo l'angolo relativo tra la direzione dell'oggetto e quella attuale del dispositivo
        // In questo modo l'oggetto appare sempre nella direzione corretta rispetto all'utente
        const x = clampedDistance * Math.sin(bearingRad);
        const z = clampedDistance * Math.cos(bearingRad);
        
        // Aggiorna la posizione
        this.arObject.position = new BABYLON.Vector3(x, 0, z);
        
        // L'orientamento dell'oggetto è stato impostato durante il placeVirtualObject
        // basato sull'orientamento del dispositivo al momento del posizionamento
        
        console.log(`Oggetto aggiornato - Distanza: ${clampedDistance.toFixed(2)}m, Direzione: ${bearing.toFixed(1)}°`);
        
        return this.arObject;
    }
}

// Esporta la classe
window.ARManager = ARManager;