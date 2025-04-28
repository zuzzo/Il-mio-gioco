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
<<<<<<< HEAD
        this.isARMode = false;
        this.arObject = null;
        this.directionIndicator = null;
        this.savedObjectOrientation = 0; // Angolo in gradi
        this.videoElement = null;
        this.arActive = false;
        
        // Nuovi parametri per l'ancoraggio
        this.isAnchored = false;
        this.anchorPosition = null;
        this.smoothingFactor = 0.1; // Fattore di smorzamento (più basso = più fluido)
        this.anchorTimeout = null;
        this.anchorDistance = 5; // Distanza in metri entro cui tentare l'ancoraggio
        this.maxAnchorDistance = 15; // Distanza oltre la quale rimuovere l'ancoraggio
=======
        this.isARMode = false; // Flag per modalità AR immersiva attiva
        this.xrExperienceHelper = null; // Riferimento all'helper XR
        this.arObjects = new Map(); // Mappa per tenere traccia degli oggetti AR per ID { id: meshNode }
        this.previewObject = null; // Riferimento all'oggetto mostrato in anteprima nel placement mode

        this.cameraFeedVideo = null; // Elemento video per il feed camera
        this.cameraFeedStream = null; // Stream della camera
>>>>>>> 9202b8e125413375069e04180c2952e8341550ee
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
            
            // Reset dello stato di ancoraggio
            this.isAnchored = false;
            this.anchorPosition = null;
            
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
<<<<<<< HEAD
        
        // Reset dello stato di ancoraggio quando si posiziona un nuovo oggetto
        this.isAnchored = false;
        this.anchorPosition = null;
        
        if (!this.arObject) {
=======
    }

    /**
     * Rimuove tutti gli oggetti AR dalla scena e dalla mappa interna.
     */
    clearARObjects() {
        this.arObjects.forEach(mesh => {
            if (mesh) {
                mesh.dispose();
            }
        });
        this.arObjects.clear();
        console.log("Cleared all AR objects from the scene.");
    }

    /**
     * Pulisce l'oggetto di anteprima (se presente) dalla scena.
     */
    clearPreviewObject() {
        if (this.previewObject) {
            this.previewObject.dispose();
            this.previewObject = null;
            console.log("Cleared preview object.");
        }
    }

    /**
     * Mostra un singolo oggetto in anteprima nella vista camera (modalità piazzamento).
     * @param {string} modelPath - Percorso o URL del modello (.glb).
     * @param {number} orientationAlpha - Orientamento bussola (gradi) da applicare.
     */
    async placeSingleObjectForPreview(modelPath, orientationAlpha) {
        if (this.isARMode) {
            console.warn("Cannot place preview object while in AR mode.");
            return;
        }
        if (!this.scene) {
            console.error("Scene not available for preview.");
            return;
        }

        this.clearPreviewObject(); // Rimuovi anteprima precedente

        try {
            console.log(`Loading preview model: ${modelPath}`);
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", modelPath, this.scene, undefined, ".glb");

            if (!result.meshes || result.meshes.length === 0) {
                throw new Error(`Preview model ${modelPath} loaded empty.`);
            }

            this.previewObject = result.meshes[0];
            this.previewObject.name = "previewObject";

            // Scala come gli oggetti AR
            const boundingInfo = this.calculateBoundingInfo(result.meshes);
            const maxDimension = Math.max(
                boundingInfo.maximum.x - boundingInfo.minimum.x,
                boundingInfo.maximum.y - boundingInfo.minimum.y,
                boundingInfo.maximum.z - boundingInfo.minimum.z
            );
            const desiredHeight = 0.4; // Leggermente più piccolo per l'anteprima?
            const scaleFactor = maxDimension > 0 ? desiredHeight / maxDimension : 1;
            this.previewObject.scaling.scaleInPlace(scaleFactor);

            // Posiziona davanti alla camera di default (assumendo sia attiva)
            // Potremmo legarlo alla camera attiva se cambia
            const camera = this.scene.activeCamera || this.scene.getCameraByName("defaultCam");
            if (camera) {
                 // Posiziona a 1.5 unità davanti alla camera, leggermente in basso
                 const forward = camera.getDirection(BABYLON.Axis.Z);
                 const position = camera.position.add(forward.scale(1.5));
                 position.y -= 0.2; // Abbassa leggermente
                 this.previewObject.position = position;
            } else {
                 this.previewObject.position = new BABYLON.Vector3(0, -0.2, 1.5); // Fallback position
            }


            // Applica rotazione
            const orientationRad = (orientationAlpha * Math.PI) / 180;
            this.previewObject.rotation.y = -orientationRad;

            console.log("Preview object placed.");

        } catch (error) {
            console.error("Error placing preview object:", error);
            this.showStatus(`Errore anteprima: ${error.message}`, 'placement'); // Usa showStatus da App? No, logga qui.
            this.clearPreviewObject();
        }
    }


    /**
     * Carica e posiziona multipli oggetti virtuali nella scena AR.
     * @param {Array} objectsData - Array di oggetti { id, model, position, orientation }
     */
    async placeMultipleVirtualObjects(objectsData) {
        if (!this.isARMode || !this.xrExperienceHelper) {
            console.error("AR non attiva. Impossibile piazzare oggetti.");
            return;
        }

        this.clearARObjects(); // Rimuovi eventuali oggetti precedenti

        console.log(`Placing ${objectsData.length} objects in AR scene...`);

        const loadPromises = objectsData.map(async (objData) => {
            // --- AGGIUNTA: Salta i placeholder dei modelli custom ---
            if (objData.model === 'assets/models/custom_placeholder.glb') {
                console.log(`Skipping placeholder object ${objData.id}`);
                return; // Non caricare questo oggetto
            }
            // --- FINE AGGIUNTA ---

>>>>>>> 9202b8e125413375069e04180c2952e8341550ee
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
                
                // Aggiungi un effetto di glowing al modello per indicare che non è ancora ancorato
                const glowLayer = new BABYLON.GlowLayer("glow", this.scene);
                glowLayer.intensity = 0.5;
                
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
            
            // Reset dello stato di ancoraggio
            this.isAnchored = false;
            this.anchorPosition = null;
        }
        
        // Aggiungi un'animazione di rotazione delicata
        this.scene.registerBeforeRender(() => {
            if (this.arObject) {
                // Rotazione più lenta quando l'oggetto è ancorato
                const rotationSpeed = this.isAnchored ? 0.001 : 0.002;
                this.arObject.rotation.y += rotationSpeed;
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
        
        // Calcola la posizione target relativa
        const targetX = clampedDistance * Math.sin(bearingRad) * 0.5; // Ridotto per finestra
        const targetZ = clampedDistance * Math.cos(bearingRad) * 0.5; // Ridotto per finestra
        
        // Gestione dell'ancoraggio
        // Se l'oggetto è già ancorato e la distanza è ragionevole
        if (this.isAnchored && distance < this.maxAnchorDistance) {
            // Applica solo piccoli aggiustamenti alla posizione ancorata
            // Usa un fattore di smorzamento più piccolo per l'oggetto ancorato
            const anchorSmoothing = this.smoothingFactor * 0.2;
            
            // Calcola una piccola correzione basata sulla posizione GPS
            if (this.arObject.position) {
                this.arObject.position.x += (this.anchorPosition.x - this.arObject.position.x) * anchorSmoothing;
                this.arObject.position.z += (this.anchorPosition.z - this.arObject.position.z) * anchorSmoothing;
            }
            
            // Aggiorna la scala in base alla distanza, ma con variazioni più contenute
            const anchoredScale = Math.max(0.4, 1 - (clampedDistance / maxDistance) * 0.5);
            this.arObject.scaling = new BABYLON.Vector3(
                anchoredScale, 
                anchoredScale, 
                anchoredScale
            );
            
            // Mostra un indicatore di stato ancorato
            const statusElement = document.getElementById('statusMessage');
            if (statusElement && statusElement.textContent.indexOf("ancorato") === -1) {
                statusElement.textContent = "Oggetto ancorato - posizione stabile";
            }
            
            // Aggiungiamo una piccola oscillazione per dare un senso di vita all'oggetto ancorato
            this.arObject.position.y = 0.05 * Math.sin(Date.now() * 0.001);
            
        } else {
            // Se l'oggetto non è ancorato o è troppo lontano
            
            // Se l'oggetto è vicino ma non ancora ancorato, considera l'ancoraggio
            if (!this.isAnchored && distance < this.anchorDistance) {
                // Imposta un timer per l'ancoraggio se non esiste già
                if (!this.anchorTimeout) {
                    this.anchorTimeout = setTimeout(() => {
                        // Salva la posizione attuale come punto di ancoraggio
                        if (this.arObject && this.arObject.position) {
                            this.anchorPosition = {
                                x: this.arObject.position.x,
                                z: this.arObject.position.z
                            };
                            this.isAnchored = true;
                            console.log("Oggetto ancorato alla posizione corrente");
                            
                            // Aggiungi un effetto visivo per l'ancoraggio
                            this.scene.beginAnimation(this.arObject, 0, 10, false, 1.0);
                        }
                        this.anchorTimeout = null;
                    }, 1500); // Attendi 1.5 secondi di stabilità prima di ancorare
                }
            } else {
                // Cancella il timer di ancoraggio se ci si allontana
                if (this.anchorTimeout) {
                    clearTimeout(this.anchorTimeout);
                    this.anchorTimeout = null;
                }
            }
            
            // Se l'oggetto era ancorato ma ora è troppo lontano, rimuovi l'ancoraggio
            if (this.isAnchored && distance > this.maxAnchorDistance) {
                this.isAnchored = false;
                this.anchorPosition = null;
                console.log("Ancoraggio rimosso - oggetto troppo distante");
            }
            
            // Movimento fluido dell'oggetto quando non è ancorato
            if (this.arObject.position) {
                // Applica smorzamento per rendere il movimento più fluido (lerp)
                this.arObject.position.x += (targetX - this.arObject.position.x) * this.smoothingFactor;
                this.arObject.position.z += (targetZ - this.arObject.position.z) * this.smoothingFactor;
                
                // Leggera oscillazione verticale per dare un senso di fluidità
                this.arObject.position.y = 0.1 * Math.sin(Date.now() * 0.002);
            } else {
                // Prima posizione, imposta direttamente
                this.arObject.position = new BABYLON.Vector3(targetX, 0, targetZ);
            }
            
            // Aggiorna la scala in base alla distanza
            this.arObject.scaling = new BABYLON.Vector3(
                scaleFactor, 
                scaleFactor, 
                scaleFactor
            );
        }
        
        // Aggiorna l'orientamento della freccia direzionale
        const directionArrow = document.getElementById('directionArrow');
        if (directionArrow) {
            // Calcola la differenza tra la direzione dell'oggetto e l'orientamento del dispositivo
            const headingDifference = (bearing - deviceHeading + 360) % 360;
            
            // Cambia lo stile della freccia in base allo stato di ancoraggio
            if (this.isAnchored) {
                directionArrow.style.color = "#00ff00"; // Verde per indicare che è ancorato
            } else {
                directionArrow.style.color = "#ffcc00"; // Colore originale
            }
            
            // Aggiorna la rotazione
            directionArrow.style.transform = `translate(-50%, -50%) rotate(${headingDifference}deg)`;
        }
        
        // Aggiorna la visualizzazione di distanza con indicazione di ancoraggio
        const distanceEl = document.getElementById('distance');
        if (distanceEl) {
            if (this.isAnchored) {
                distanceEl.textContent = `Distanza: ${distance.toFixed(1)} m (ancorato)`;
            } else {
                distanceEl.textContent = `Distanza: ${distance.toFixed(1)} m`;
            }
        }
        
        return this.arObject;
    }
    
    /**
     * Ferma l'esperienza AR
     */
    stopARExperience() {
        this.isARMode = false;
        this.arActive = false;
        this.isAnchored = false;
        this.anchorPosition = null;
        
        if (this.anchorTimeout) {
            clearTimeout(this.anchorTimeout);
            this.anchorTimeout = null;
        }
        
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