/**
 * Gestore della realtà aumentata basato su Babylon.js
 * Basato sulla versione alfa che funzionava correttamente
 */
class ARManager {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.arObject = null;
        this.videoTexture = null;
        this.arActive = false;
        this.imageAnchorEnabled = false;
        this.savedObjectOrientation = 0; // Angolo in gradi
        this.currentPlacedObjectData = null; // Dati dell'oggetto piazzato attualmente visualizzato
    }

    /**
     * Inizializza il sistema AR
     * @param {string} canvasId - ID del canvas di rendering
     * @param {string} videoId - ID dell'elemento video per il feed della fotocamera
     * @returns {Promise<boolean>} - True se l'inizializzazione ha successo
     */
    async init(canvasId, videoId) {
        try {
            // Ottieni il canvas e crea l'engine Babylon
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) throw new Error(`Canvas con ID "${canvasId}" non trovato.`);
            this.engine = new BABYLON.Engine(this.canvas, true);

            // Crea la scena
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Trasparente

            // Configura la camera
            this.camera = new BABYLON.ArcRotateCamera(
                "ARcamera",
                -Math.PI / 2,
                Math.PI / 2,
                3,
                BABYLON.Vector3.Zero(),
                this.scene
            );
            // Disabilitiamo il controllo manuale della camera per la vista AR
            // this.camera.attachControl(this.canvas, true);
            this.camera.lowerRadiusLimit = 0.1; // Permetti zoom più vicino se necessario
            this.camera.upperRadiusLimit = 10; // Limita lo zoom indietro
            this.camera.inertia = 0.5;

            // Configura l'illuminazione
            const light = new BABYLON.HemisphericLight(
                "light",
                new BABYLON.Vector3(0, 1, 0),
                this.scene
            );
            light.intensity = 0.7;

            // Crea la texture dal video della fotocamera
            const video = document.getElementById(videoId);
            if (!video) throw new Error(`Elemento video con ID "${videoId}" non trovato.`);
            this.videoTexture = new BABYLON.VideoTexture(
                "videoTexture",
                video,
                this.scene,
                true,
                true
            );

            // Impostiamo lo sfondo della scena come trasparente
            this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Assicura trasparenza

            // Configura fotocamera
            await this.setupCamera(video);

            // Imposta la texture video come sfondo diretto della scena
            this.scene.backgroundTexture = this.videoTexture;
            // Invertiamo la scala verticale per correggere l'orientamento
            this.scene.backgroundTexture.vScale = -1;

            // Avvia il loop di rendering e aggiornamento camera/oggetti
            this.startRenderLoop();

            // Gestione resize della finestra
            window.addEventListener('resize', () => {
                this.engine.resize();
            });

            this.arActive = true;
            this.app.log("AR Manager inizializzato correttamente.");
            return true;
        } catch (error) {
            console.error("Errore nell'inizializzazione AR:", error);
            this.app.log(`Errore inizializzazione AR: ${error.message}`);
            this.app.showMessage(`Errore AR: ${error.message}. Controlla i permessi della fotocamera.`);
            return false;
        }
    }

    /**
     * Configura l'accesso alla fotocamera
     * @param {HTMLVideoElement} videoElement - Elemento video per il feed della camera
     */
    async setupCamera(videoElement) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("getUserMedia non è supportato dal browser.");
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment' // Preferisci la fotocamera posteriore
                    // Rimuoviamo le richieste specifiche di width/height
                }
            });

            videoElement.srcObject = stream;
            // Attendi che il video sia pronto per evitare errori
            await new Promise((resolve) => {
                videoElement.onloadedmetadata = () => {
                    resolve();
                };
            });
            await videoElement.play();
            this.app.log("Accesso alla fotocamera riuscito.");
            return true;
        } catch (error) {
            console.error("Errore nell'accesso alla fotocamera:", error);
            this.app.log(`Errore accesso fotocamera: ${error.name} - ${error.message}`);
            if (error.name === "NotAllowedError") {
                throw new Error("Permesso fotocamera negato.");
            } else if (error.name === "NotFoundError") {
                throw new Error("Nessuna fotocamera posteriore trovata.");
            } else {
                throw new Error(`Errore fotocamera: ${error.message}`);
            }
        }
    }

    /**
     * Avvia il loop di rendering e aggiornamento
     */
    startRenderLoop() {
        if (!this.engine) return;
        this.engine.runRenderLoop(() => {
            if (this.scene && this.scene.activeCamera) {
                // Non forziamo la pulizia qui per ora, concentriamoci sulla camera
                // this.engine.clear(this.scene.clearColor, true, true, true);

                // Aggiorna l'orientamento della camera in base alla bussola
                this.updateCameraOrientation();
                // Aggiorna la posizione dell'oggetto piazzato correntemente, se esiste
                if (this.currentPlacedObjectData && this.arObject) {
                    this.updateObjectPosition(this.currentPlacedObjectData);
                }

                this.scene.render();
            }
        });
        this.app.log("Loop di rendering e aggiornamento avviato.");
    }

    /**
     * Aggiorna l'orientamento della camera AR in base alla bussola del dispositivo
     */
    updateCameraOrientation() {
        if (!this.camera || !this.app.geoManager.currentOrientation) return;

        const userHeading = this.app.geoManager.currentOrientation.alpha;
        if (userHeading === null || userHeading === undefined) return;

        // Log per debug orientamento camera
        // console.log(`DEBUG: Camera Orientation - User Heading (alpha): ${userHeading.toFixed(2)}`);

        // Converte l'angolo della bussola (0-360, clockwise, 0=Nord)
        // in angolo alpha per ArcRotateCamera (radianti, counter-clockwise, 0=asse Z positivo)
        // Aggiustamento potrebbe essere necessario a seconda dell'orientamento iniziale della camera
        const headingRad = BABYLON.Tools.ToRadians(userHeading);
        // L'alpha della ArcRotateCamera è 0 lungo Z+, aumenta CCW.
        // La bussola è 0 per Nord (Z+), aumenta CW.
        // Quindi camera.alpha = -headingRad (o 2*PI - headingRad)
        // Aggiungiamo PI/2 perché la camera parte guardando lungo Z (alpha = -PI/2)
        this.camera.alpha = -headingRad - Math.PI / 2;

        // Potremmo anche voler regolare beta (inclinazione verticale) se disponibile
        // const userTilt = this.app.geoManager.currentOrientation.beta;
        // if (userTilt !== null) {
        //     const tiltRad = BABYLON.Tools.ToRadians(userTilt);
        //     // Beta della ArcRotateCamera è 0 all'equatore, PI/2 al polo nord.
        //     // L'orientamento beta è 0 orizzontale, 90 verticale.
        //     this.camera.beta = Math.PI / 2 - tiltRad;
        // }
    }

    /**
     * Ferma il loop di rendering
     */
    stopRenderLoop() {
        if (!this.engine) return;
        this.engine.stopRenderLoop();
        this.app.log("Loop di rendering fermato.");
    }

    /**
     * Aggiorna l'oggetto di anteprima nel Menu 2
     * @param {string} modelPath - Percorso del modello 3D o URL Blob
     * @param {number} scale - Scala dell'oggetto
     * @param {number} rotation - Rotazione dell'oggetto in gradi (asse Y)
     */
    async updatePreviewObject(modelPath, scale, rotation) {
        if (!this.scene) return;
        // Stiamo mostrando un'anteprima, non un oggetto piazzato
        this.currentPlacedObjectData = null;
        try {
            // Rimuovi l'oggetto esistente se presente
            if (this.arObject) {
                this.arObject.dispose();
                this.arObject = null;
            }

            // Mostra un cubo placeholder mentre il modello si carica
            const placeholder = BABYLON.MeshBuilder.CreateBox("placeholder", {
                width: 0.2, height: 0.2, depth: 0.2
            }, this.scene);
            
            const placeholderMaterial = new BABYLON.StandardMaterial("placeholderMat", this.scene);
            placeholderMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            placeholderMaterial.alpha = 0.5;
            placeholder.material = placeholderMaterial;
            
            try {
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
                
                // Scala il modello in base al parametro scale
                const scaleFactor = scale * (0.5 / maxDimension);
                this.arObject.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
                
                // Posiziona l'oggetto davanti alla camera
                const forwardDirection = this.camera.getDirection(BABYLON.Vector3.Forward());
                this.arObject.position = this.camera.position.add(forwardDirection.scale(2));
                
                // Applica la rotazione
                const rotationRadians = (rotation * Math.PI) / 180;
                this.arObject.rotation = new BABYLON.Vector3(0, rotationRadians, 0);
                
                // Rimuovi il placeholder
                placeholder.dispose();
                
                this.app.log(`Anteprima aggiornata: ${modelPath}, Scala: ${scale}, Rotazione: ${rotation}°`);
            } catch (error) {
                // In caso di errore, usa il placeholder come fallback
                this.app.log(`Errore caricamento modello: ${error.message}. Usando fallback.`);
                
                // Colora il placeholder in base al tipo di oggetto
                if (modelPath.includes("treasure")) {
                    placeholderMaterial.diffuseColor = new BABYLON.Color3(1, 0.84, 0); // Oro
                    placeholderMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);
                } else if (modelPath.includes("key")) {
                    placeholderMaterial.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.75); // Argento
                    placeholderMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                } else if (modelPath.includes("door")) {
                    placeholderMaterial.diffuseColor = new BABYLON.Color3(0.55, 0.27, 0.07); // Marrone
                    placeholderMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0);
                } else {
                    placeholderMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Rosso di default
                    placeholderMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
                }
                
                // Usa il placeholder come oggetto principale
                this.arObject = placeholder;
                
                // Posiziona l'oggetto davanti alla camera
                const forwardDirection = this.camera.getDirection(BABYLON.Vector3.Forward());
                this.arObject.position = this.camera.position.add(forwardDirection.scale(2));
                
                // Applica scala e rotazione
                this.arObject.scaling = new BABYLON.Vector3(scale, scale, scale);
                const rotationRadians = (rotation * Math.PI) / 180;
                this.arObject.rotation = new BABYLON.Vector3(0, rotationRadians, 0);
                
                this.app.showMessage("Usando un'anteprima semplificata. Nell'app finale verranno mostrati i modelli 3D completi.");
            }
        } catch (error) {
            console.error("Errore nell'aggiornamento dell'oggetto di anteprima:", error);
            this.app.log(`Errore anteprima: ${error.message}`);
            this.app.showMessage(`Errore caricamento anteprima: ${error.message}`);
            
            // Assicurati che l'oggetto venga rimosso in caso di errore
            if (this.arObject) {
                this.arObject.dispose();
                this.arObject = null;
            }
        }
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
     * Mostra un oggetto piazzato nel mondo AR
     * @param {Object} objectData - Dati dell'oggetto (modelPath, scale, rotation, position, orientation, isCustomModel, id?)
     */
    async showPlacedObject(objectData) {
        if (!this.scene || !this.app.geoManager.currentPosition) return;
        // Memorizza i dati dell'oggetto che stiamo mostrando
        this.currentPlacedObjectData = objectData;
        try {
            // Rimuovi l'oggetto esistente se presente
            if (this.arObject) {
                this.arObject.dispose();
                this.arObject = null;
            }

            // Salva l'orientamento dell'oggetto
            this.savedObjectOrientation = objectData.rotation;
            
            try {
                // Carica il modello 3D
                const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", objectData.modelPath, this.scene);
                
                // Il modello caricato è nell'array result.meshes
                this.arObject = result.meshes[0]; // Il nodo principale
                
                // Calcola la dimensione del modello e scala se necessario
                const boundingInfo = this.calculateBoundingInfo(result.meshes);
                const maxDimension = Math.max(
                    boundingInfo.maximum.x - boundingInfo.minimum.x,
                    boundingInfo.maximum.y - boundingInfo.minimum.y,
                    boundingInfo.maximum.z - boundingInfo.minimum.z
                );
                
                // Scala il modello in base al parametro scale
                const scaleFactor = objectData.scale * (0.5 / maxDimension);
                this.arObject.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
                
                // Posiziona inizialmente l'oggetto davanti alla camera
                this.arObject.position = new BABYLON.Vector3(0, 0, 2);
                
                // Applica la rotazione basata sull'orientamento salvato
                const orientationRadians = (this.savedObjectOrientation * Math.PI) / 180;
                this.arObject.rotation = new BABYLON.Vector3(0, -orientationRadians, 0);

                // La posizione verrà aggiornata continuamente dal render loop
                // this.updateObjectPosition(objectData); // Non più necessario chiamarla qui

                this.app.log(`Oggetto ${objectData.name} caricato con orientamento: ${this.savedObjectOrientation.toFixed(1)}°`);
            } catch (error) {
                this.app.log(`Errore caricamento modello: ${error.message}. Usando fallback.`);
                
                // In caso di errore, usa un cubo colorato come fallback
                this.arObject = BABYLON.MeshBuilder.CreateBox("arObject", {
                    width: 0.5, height: 0.5, depth: 0.5
                }, this.scene);
                
                const material = new BABYLON.StandardMaterial("objectMaterial", this.scene);
                
                // Colora il cubo in base al tipo di oggetto
                if (objectData.modelPath.includes("treasure")) {
                    material.diffuseColor = new BABYLON.Color3(1, 0.84, 0); // Oro
                    material.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);
                } else if (objectData.modelPath.includes("key")) {
                    material.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.75); // Argento
                    material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                } else if (objectData.modelPath.includes("door")) {
                    material.diffuseColor = new BABYLON.Color3(0.55, 0.27, 0.07); // Marrone
                    material.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0);
                } else {
                    material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Rosso di default
                    material.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
                }
                
                this.arObject.material = material;
                
                // Posiziona inizialmente l'oggetto davanti alla camera
                this.arObject.position = new BABYLON.Vector3(0, 0, 2);
                
                // Applica la rotazione basata sull'orientamento salvato
                const orientationRadians = (this.savedObjectOrientation * Math.PI) / 180;
                this.arObject.rotation = new BABYLON.Vector3(0, -orientationRadians, 0);

                // La posizione verrà aggiornata continuamente dal render loop
                // this.updateObjectPosition(objectData); // Non più necessario chiamarla qui

                this.app.showMessage("Usando un oggetto semplificato. Nell'app finale verranno mostrati i modelli 3D completi.");
            }
        } catch (error) {
            console.error(`Errore nel mostrare l'oggetto piazzato ${objectData.name}:`, error);
            this.app.log(`Errore visualizzazione oggetto ${objectData.name}: ${error.message}`);
            this.app.showMessage(`Impossibile visualizzare l'oggetto ${objectData.name}.`);
            // Resetta i dati dell'oggetto corrente in caso di errore
            if (this.arObject) {
                this.arObject.dispose();
                this.arObject = null;
            }
            this.currentPlacedObjectData = null;
        }
    }

    /**
     * Aggiorna la posizione dell'oggetto in base alla geolocalizzazione
     * @param {Object} objectData - Dati dell'oggetto
     */
    updateObjectPosition(objectData) {
        if (!this.arObject || !this.app.geoManager.currentPosition || !objectData || !objectData.position) {
             // console.log("DEBUG: updateObjectPosition - Dati mancanti", { hasArObject: !!this.arObject, hasUserPos: !!this.app.geoManager.currentPosition, hasObjectData: !!objectData });
             return;
        }

        // Calcola posizione relativa
        const userPos = this.app.geoManager.currentPosition;
        const objectPos = objectData.position;
        const distance = this.app.geoManager.calculateDistance(
            userPos.latitude, userPos.longitude,
            objectPos.latitude, objectPos.longitude
        );
        const bearing = this.app.geoManager.calculateBearing(
            userPos.latitude, userPos.longitude,
            objectPos.latitude, objectPos.longitude
        );
        const userHeading = this.app.geoManager.currentOrientation?.alpha; // Può essere null

        // Limita la distanza massima per una migliore visualizzazione in AR
        const maxDistance = 50; // Aumentiamo un po' la distanza massima
        const clampedDistance = Math.min(distance, maxDistance);
        
        // Converti la direzione (bearing rispetto a Nord) da gradi a radianti
        const bearingRad = BABYLON.Tools.ToRadians(bearing);

        // Calcola la posizione XZ dell'oggetto relativa all'utente (che consideriamo a 0,0)
        // X positivo = Est, Z positivo = Nord
        const x = clampedDistance * Math.sin(bearingRad);
        const z = clampedDistance * Math.cos(bearingRad);

        // Aggiorna la posizione dell'oggetto nel mondo 3D
        // L'utente è sempre all'origine (0,0,0) in questa visualizzazione semplificata
        this.arObject.position = new BABYLON.Vector3(x, 0, z);
        
        // Applica l'orientamento salvato dell'oggetto (rotazione attorno a Y)
        const savedOrientationRad = BABYLON.Tools.ToRadians(this.savedObjectOrientation);
        this.arObject.rotation.y = -savedOrientationRad; // Negativo per coerenza con bussola

        // Log per debug posizione oggetto
        // console.log(`DEBUG: Object Position - User: ${userPos.latitude.toFixed(6)},${userPos.longitude.toFixed(6)} | Obj: ${objectPos.latitude.toFixed(6)},${objectPos.longitude.toFixed(6)} | Dist: ${distance.toFixed(2)} | Bearing: ${bearing.toFixed(2)} | Heading: ${userHeading?.toFixed(2)} | 3D Pos: ${x.toFixed(2)},${z.toFixed(2)}`);
    }

    /**
     * Attiva/disattiva l'ancoraggio delle immagini (placeholder)
     * @param {boolean} enabled - Attiva/disattiva l'ancoraggio
     */
    setImageAnchorEnabled(enabled) {
        this.imageAnchorEnabled = enabled;
        // Logica placeholder - l'implementazione reale richiederebbe librerie specifiche
        this.app.log(`Ancoraggio immagini ${enabled ? 'attivato' : 'disattivato'} (Logica non implementata)`);
        if (enabled) {
            this.app.showMessage("Ancoraggio immagini non ancora implementato.");
        }
    }
}

// Esporta la classe
window.ARManager = ARManager;
