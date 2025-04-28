/**
 * Gestisce la realtà aumentata con Babylon.js
 */
class ARManager {
    constructor() {
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.isARSupported = false;
        this.isARMode = false;
        this.arObject = null;
        this.directionIndicator = null;
        this.savedObjectOrientation = 0; // Angolo in gradi
        this.videoElement = null;
        this.arActive = false;
    }

    /**
     * Inizializza il motore di rendering 3D
     */
    async init(canvasId, videoId = 'camera-feed') {
        this.canvas = document.getElementById(canvasId);
        this.videoElement = document.getElementById(videoId);
        
        // Inizializza Babylon Engine
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
        
        // Avvia il flusso video dalla fotocamera
        await this.startVideoStream();
        
        // Controlla se WebXR è supportato
        this.isARSupported = await this.checkARSupport();
        
        return this.isARSupported;
    }
    
    /**
     * Avvia il flusso video dalla fotocamera
     */
    async startVideoStream() {
        try {
            if (!this.videoElement) {
                console.warn("Elemento video non trovato");
                return false;
            }
            
            const constraints = {
                video: {
                    facingMode: 'environment', // Usa la fotocamera posteriore
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = stream;
            
            // Attendi che il video sia pronto
            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve(true);
                };
            });
        } catch (error) {
            console.error("Errore nell'accesso alla fotocamera:", error);
            return false;
        }
    }
    
    /**
     * Crea la scena di base
     */
    createScene() {
        const scene = new BABYLON.Scene(this.engine);
        
        // Crea una fotocamera per visualizzare la scena
        this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -5), scene);
        this.camera.setTarget(BABYLON.Vector3.Zero());
        
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
        
        // Rendi trasparente lo sfondo della scena
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
        
        return scene;
    }
    
    /**
     * Controlla se la realtà aumentata è supportata
     */
    async checkARSupport() {
        try {
            // Per la nostra implementazione in finestra, non abbiamo bisogno del supporto WebXR completo
            // Verifichiamo solo se possiamo accedere alla fotocamera
            return !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
        } catch (error) {
            console.error("Errore nel controllo del supporto AR:", error);
            return false;
        }
    }
    
    /**
     * Avvia l'esperienza AR
     */
    async startARExperience() {
        if (!this.videoElement) {
            console.error("Elemento video non trovato");
            return false;
        }
        
        try {
            // Assicurati che il video sia in esecuzione
            if (this.videoElement.paused) {
                await this.videoElement.play();
            }
            
            // Imposta lo stato AR attivo
            this.isARMode = true;
            this.arActive = true;
            
            // Mostra gli elementi necessari
            this.videoElement.style.display = "block";
            this.canvas.style.display = "block";
            
            console.log("Esperienza AR avviata in modalità finestra");
            return true;
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
        if (!this.arActive) {
            return null;
        }
        
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
                
                // Scala il modello a circa 0.5 metri di altezza (adattato per la visualizzazione in finestra)
                const scaleFactor = 0.5 / maxDimension;
                this.arObject.scaling.scaleInPlace(scaleFactor);
                
                // Posiziona l'oggetto davanti alla camera
                this.arObject.position = new BABYLON.Vector3(0, 0, 2);
                
                // Applica la rotazione basata sull'orientamento del dispositivo
                // Convertiamo l'angolo della bussola in radianti per Babylon.js
                const orientationRadians = (this.savedObjectOrientation * Math.PI) / 180;
                this.arObject.rotation.y = -orientationRadians;
                
                // Rimuovi il placeholder
                placeholder.dispose();
                
                console.log(`Oggetto posizionato con orientamento: ${this.savedObjectOrientation.toFixed(1)}°`);
                
                // Mostra la freccia direzionale
                const directionArrow = document.getElementById('directionArrow');
                if (directionArrow) {
                    directionArrow.classList.remove('hidden');
                }
                
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
        
        // Aggiungi un'animazione di rotazione delicata
        this.scene.registerBeforeRender(() => {
            if (this.arObject) {
                this.arObject.rotation.y += 0.002; // Rotazione più lenta e sottile
            }
        });
        
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
        if (!this.arObject || !this.arActive) {
            return null;
        }
        
        // Limita la distanza massima per una migliore visualizzazione in finestra
        const maxDistance = 10; // metri (ridotto per visualizzazione in finestra)
        const clampedDistance = Math.min(distance, maxDistance);
        
        // Calcola un fattore di scala basato sulla distanza
        // Oggetti più lontani appariranno più piccoli
        const scaleFactor = Math.max(0.3, 1 - (clampedDistance / maxDistance) * 0.7);
        
        // Converti la direzione da gradi a radianti
        const bearingRad = (bearing * Math.PI) / 180;
        
        // Calcola la posizione relativa
        const x = clampedDistance * Math.sin(bearingRad) * 0.5; // Ridotto per finestra
        const z = clampedDistance * Math.cos(bearingRad) * 0.5; // Ridotto per finestra
        
        // Aggiorna la posizione
        this.arObject.position = new BABYLON.Vector3(x, 0, z);
        
        // Aggiorna la scala in base alla distanza
        this.arObject.scaling = new BABYLON.Vector3(
            scaleFactor, 
            scaleFactor, 
            scaleFactor
        );
        
        // Aggiorna l'orientamento della freccia direzionale
        const directionArrow = document.getElementById('directionArrow');
        if (directionArrow) {
            // Calcola la differenza tra la direzione dell'oggetto e l'orientamento del dispositivo
            const headingDifference = (bearing - deviceHeading + 360) % 360;
            // Converti in CSS transform
            directionArrow.style.transform = `translate(-50%, -50%) rotate(${headingDifference}deg)`;
        }
        
        return this.arObject;
    }
    
    /**
     * Ferma l'esperienza AR
     */
    stopARExperience() {
        this.isARMode = false;
        this.arActive = false;
        
        // Nascondi la freccia direzionale
        const directionArrow = document.getElementById('directionArrow');
        if (directionArrow) {
            directionArrow.classList.add('hidden');
        }
        
        if (this.arObject) {
            this.arObject.isVisible = false;
        }
        
        console.log("Esperienza AR fermata");
    }
}

// Esporta la classe
window.ARManager = ARManager;