/**
 * Gestore della realtà aumentata basato su Babylon.js
 */
class ARManager {
    constructor(app) { // Accetta l'istanza dell'app
        this.app = app; // Memorizza l'istanza dell'app
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.virtualObject = null;
        this.previewObject = null;
        this.videoTexture = null;
        this.arActive = false;
        this.imageAnchorEnabled = false;
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
            const canvas = document.getElementById(canvasId);
            if (!canvas) throw new Error(`Canvas con ID "${canvasId}" non trovato.`);
            this.engine = new BABYLON.Engine(canvas, true);

            // Crea la scena
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Trasparente

            // Configura la camera
            this.camera = new BABYLON.ArcRotateCamera(
                "ARcamera",
                -Math.PI / 2,
                Math.PI / 2,
                5,
                BABYLON.Vector3.Zero(),
                this.scene
            );
            this.camera.attachControl(canvas, true);
            this.camera.lowerRadiusLimit = 0.1;
            this.camera.upperRadiusLimit = 10;

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

            // Crea un piano per visualizzare il video come sfondo
            const plane = BABYLON.MeshBuilder.CreatePlane(
                "videoPlane",
                {width: 10, height: 5.625}, // Assuming 16:9 aspect ratio
                this.scene
            );
            // Position the plane far enough so it acts as a background
            // Adjust based on camera setup if needed
            plane.position = this.camera.position.add(new BABYLON.Vector3(0, 0, this.camera.radius + 1));
            plane.rotation.y = Math.PI; // Rotate to face the camera
            plane.parent = this.camera; // Attach to camera so it always stays behind

            const mat = new BABYLON.StandardMaterial("videoMat", this.scene);
            mat.diffuseTexture = this.videoTexture;
            mat.emissiveColor = new BABYLON.Color3(1, 1, 1); // Make it emissive to show video colors
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            mat.disableLighting = true;
            mat.backFaceCulling = false; // Render both sides
            plane.material = mat;

            // Configura fotocamera
            await this.setupCamera(video);

            // Avvia il loop di rendering
            this.startRenderLoop();

            // Gestione resize della finestra
            window.addEventListener('resize', () => {
                this.engine.resize();
            });

            this.arActive = true; // Mark AR as active
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
                    facingMode: 'environment', // Preferisci la fotocamera posteriore
                    width: { ideal: 1280 }, // Richieste comuni
                    height: { ideal: 720 }
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
     * Avvia il loop di rendering
     */
    startRenderLoop() {
        if (!this.engine) return;
        this.engine.runRenderLoop(() => {
            if (this.scene && this.scene.activeCamera) {
                this.scene.render();
            }
        });
        this.app.log("Loop di rendering avviato.");
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
        try {
            // Rimuovi l'oggetto di anteprima esistente
            if (this.previewObject) {
                this.previewObject.dispose();
                this.previewObject = null;
            }
             // Rimuovi anche l'oggetto virtuale principale se presente
            if (this.virtualObject) {
                this.virtualObject.dispose();
                this.virtualObject = null;
            }

            // Determina la root URL per il caricamento
            let rootUrl = "";
            let fileName = modelPath;
            if (modelPath.startsWith("blob:")) {
                // Se è un URL blob, non c'è rootUrl e il filename è l'URL stesso
                rootUrl = "";
                fileName = modelPath;
            } else {
                 // Altrimenti, estrai il percorso e il nome file
                const lastSlash = modelPath.lastIndexOf('/');
                if (lastSlash !== -1) {
                    rootUrl = modelPath.substring(0, lastSlash + 1);
                    fileName = modelPath.substring(lastSlash + 1);
                }
            }

            this.app.log(`Caricamento anteprima: ${fileName} da ${rootUrl || 'Blob URL'}`);

            // Carica il modello 3D
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                null, // Nomi mesh (null per tutti)
                rootUrl,
                fileName,
                this.scene
            );

            if (!result.meshes || result.meshes.length === 0) {
                throw new Error("Il modello caricato non contiene mesh.");
            }

            // Trova il root mesh (spesso il primo o uno chiamato __root__)
            const rootMesh = result.meshes[0];

            // Crea un parent vuoto per controllare posizione/rotazione/scala
            this.previewObject = new BABYLON.TransformNode("previewParent", this.scene);
            rootMesh.parent = this.previewObject;

            // Centra l'oggetto se necessario (opzionale, dipende dai modelli)
            // const boundingInfo = rootMesh.getHierarchyBoundingVectors();
            // const centerOffset = boundingInfo.center.scale(-1);
            // rootMesh.position = centerOffset;

            // Posiziona l'oggetto davanti alla camera (aggiusta la distanza se necessario)
            const previewDistance = 2;
            // Calcola la posizione davanti alla camera corrente
            const forwardDirection = this.camera.getDirection(BABYLON.Vector3.Forward());
            this.previewObject.position = this.camera.position.add(forwardDirection.scale(previewDistance));


            // Fai puntare l'oggetto verso la camera (opzionale)
            // this.previewObject.lookAt(this.camera.position);

            // Applica scala e rotazione
            this.previewObject.scaling = new BABYLON.Vector3(scale, scale, scale);
            // La rotazione è sull'asse Y
            this.previewObject.rotation = new BABYLON.Vector3(0, BABYLON.Tools.ToRadians(rotation), 0);

            this.app.log(`Anteprima aggiornata: ${modelPath}, Scala: ${scale}, Rotazione: ${rotation}°`);

        } catch (error) {
            console.error("Errore nell'aggiornamento dell'oggetto di anteprima:", error);
            this.app.log(`Errore anteprima: ${error.message}`);
            this.app.showMessage(`Errore caricamento anteprima: ${error.message}`);
            // Assicurati che l'oggetto venga rimosso in caso di errore
             if (this.previewObject) {
                this.previewObject.dispose();
                this.previewObject = null;
            }
        }
    }

    /**
     * Mostra un oggetto piazzato nel mondo AR (logica semplificata)
     * @param {Object} objectData - Dati dell'oggetto (modelPath, scale, rotation, position, orientation, isCustomModel, id?)
     */
    async showPlacedObject(objectData) {
         if (!this.scene || !this.app.geoManager.currentPosition) return;
         try {
             // Rimuovi anteprima se presente
             if (this.previewObject) {
                 this.previewObject.dispose();
                 this.previewObject = null;
             }
             // Rimuovi oggetto virtuale precedente se presente
             if (this.virtualObject) {
                 this.virtualObject.dispose();
                 this.virtualObject = null;
             }

             // Calcola posizione relativa (esempio molto semplificato)
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
             const userHeading = this.app.geoManager.currentOrientation?.alpha || 0;

             // Direzione relativa dell'oggetto rispetto all'utente
             const relativeBearing = (bearing - userHeading + 360) % 360;
             const relativeBearingRad = BABYLON.Tools.ToRadians(relativeBearing);

             // Posizionamento semplificato a distanza fissa nella direzione relativa
             const placementDistance = Math.min(distance, 5); // Mostra più vicino se è lontano, max 5m
             const x = Math.sin(relativeBearingRad) * placementDistance;
             const z = Math.cos(relativeBearingRad) * placementDistance;
             const y = 0; // Altezza dal suolo (da migliorare con hit-testing o ancoraggio)

             this.app.log(`Mostrando oggetto ${objectData.name} a distanza ${distance.toFixed(1)}m, direzione relativa ${relativeBearing.toFixed(1)}°`);

             // Carica il modello
             let rootUrl = "";
             let fileName = objectData.modelPath;
             // Gestione path per modelli predefiniti vs custom
             if (!objectData.isCustomModel && typeof fileName === 'string') {
                 const lastSlash = fileName.lastIndexOf('/');
                 if (lastSlash !== -1) {
                     rootUrl = fileName.substring(0, lastSlash + 1);
                     fileName = fileName.substring(lastSlash + 1);
                 }
             } else if (objectData.isCustomModel) {
                 // Se custom, modelPath potrebbe essere un URL Blob, gestito da ImportMeshAsync
                 rootUrl = ""; // Nessun rootUrl per Blob
                 fileName = objectData.modelPath;
             }


             const result = await BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, fileName, this.scene);
             if (!result.meshes || result.meshes.length === 0) {
                 throw new Error("Modello oggetto piazzato non contiene mesh.");
             }
             const rootMesh = result.meshes[0];

             this.virtualObject = new BABYLON.TransformNode(`placed_${objectData.id || Date.now()}`, this.scene);
             rootMesh.parent = this.virtualObject;

             // Applica posizione, rotazione, scala
             this.virtualObject.position = new BABYLON.Vector3(x, y, z);
             this.virtualObject.scaling = new BABYLON.Vector3(objectData.scale, objectData.scale, objectData.scale);
             // Applica la rotazione salvata (assumendo sia sull'asse Y rispetto al mondo)
             this.virtualObject.rotation = new BABYLON.Vector3(0, BABYLON.Tools.ToRadians(objectData.rotation), 0);


         } catch (error) {
             console.error(`Errore nel mostrare l'oggetto piazzato ${objectData.name}:`, error);
             this.app.log(`Errore visualizzazione oggetto ${objectData.name}: ${error.message}`);
             this.app.showMessage(`Impossibile visualizzare l'oggetto ${objectData.name}.`);
              if (this.virtualObject) {
                 this.virtualObject.dispose();
                 this.virtualObject = null;
             }
         }
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
        // Qui si potrebbe avviare/fermare il tracking di immagini se fosse implementato
    }

} // Chiusura della classe ARManager
