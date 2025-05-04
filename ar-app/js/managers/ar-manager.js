/**
 * Gestore della realtà aumentata basato su WebXR e Babylon.js
 * Implementa Plane Detection e Hit-Testing.
 */
class ARManager {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.xrExperience = null; // Oggetto esperienza WebXR
        this.hitTestMarker = null; // Mesh per visualizzare il punto di hit-test
        this.planeMeshes = {}; // Oggetto per memorizzare i mesh dei piani rilevati
        this.arObject = null; // Oggetto 3D di anteprima o piazzato *manualmente*
        // this.currentPlacedObjectData = null; // Non più usato in questo modo

        // Oggetti AR attualmente visualizzati basati sulla geolocalizzazione
        this.displayedObjects = {}; // Mappa: { objectId: babylonMesh }

        // Controllo periodico visibilità
        this.lastCheckTime = 0;
        this.checkInterval = 1000; // Millisecondi (controlla ogni secondo)

        // Stato
        this.arActive = false;
        this.hitTestActive = false;
        this.planeDetectionActive = false;
    }

    /**
     * Inizializza il sistema AR con WebXR
     * @param {string} canvasId - ID del canvas di rendering
     * @returns {Promise<boolean>} - True se l'inizializzazione ha successo
     */
    async init(canvasId) {
        try {
            this.app.log("Inizializzazione ARManager con WebXR...");
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) throw new Error(`Canvas con ID "${canvasId}" non trovato.`);

            this.engine = new BABYLON.Engine(this.canvas, true);
            this.scene = new BABYLON.Scene(this.engine);

            // Camera di base (verrà sostituita dalla camera WebXR durante la sessione)
            const camera = new BABYLON.FreeCamera("fallbackCamera", new BABYLON.Vector3(0, 1.6, -2), this.scene);
            camera.setTarget(BABYLON.Vector3.Zero());

            // Illuminazione
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
            light.intensity = 1.0;

            // Verifica supporto WebXR AR
            if (!navigator.xr) {
                throw new Error("WebXR non supportato dal browser.");
            }
            const xrSupported = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');
            if (!xrSupported) {
                throw new Error("Modalità 'immersive-ar' WebXR non supportata su questo dispositivo.");
            }

            // Crea l'esperienza WebXR
            this.xrExperience = await this.scene.createDefaultXRExperienceAsync({
                uiOptions: {
                    sessionMode: 'immersive-ar',
                    referenceSpaceType: 'local-floor' // Usa il pavimento come riferimento
                },
                optionalFeatures: true // Abilita la gestione manuale delle features
            });

            this.app.log("WebXR Experience creata.");

            // Verifica se l'esperienza è stata creata correttamente
            if (!this.xrExperience || !this.xrExperience.baseExperience) {
                throw new Error("Impossibile creare l'esperienza WebXR.");
            }

            // Abilita Hit-Testing
            this.enableHitTesting();

            // Abilita Plane Detection
            this.enablePlaneDetection();

            // Gestione uscita dalla sessione XR
            this.xrExperience.baseExperience.onStateChangedObservable.add((state) => {
                this.app.log(`Stato WebXR cambiato: ${BABYLON.WebXRState[state]}`);
                if (state === BABYLON.WebXRState.NOT_IN_XR) {
                    this.arActive = false;
                    // Nascondi marker e piani quando si esce da AR
                    if (this.hitTestMarker) this.hitTestMarker.isVisible = false;
                    Object.values(this.planeMeshes).forEach(mesh => mesh.isVisible = false);
                } else if (state === BABYLON.WebXRState.IN_XR) {
                    this.arActive = true;
                }
            });

            // Avvia il loop di rendering
            this.startRenderLoop();

            // Gestione resize
            window.addEventListener('resize', () => {
                this.engine.resize();
            });

            this.app.log("AR Manager (WebXR) inizializzato correttamente.");
            return true;

        } catch (error) {
            console.error("Errore nell'inizializzazione AR (WebXR):", error);
            this.app.log(`Errore inizializzazione AR: ${error.message}`);
            this.app.showMessage(`Errore AR: ${error.message}. Assicurati che il browser e il dispositivo supportino WebXR AR.`);
            this.arActive = false;
            return false;
        }
    }

    /**
     * Abilita e configura la feature Hit-Testing di WebXR
     */
    enableHitTesting() {
        if (!this.xrExperience || !this.xrExperience.baseExperience) return;
        const featuresManager = this.xrExperience.baseExperience.featuresManager;

        try {
            const hitTestFeature = featuresManager.enableFeature(BABYLON.WebXRHitTest, "latest");
            if (!hitTestFeature) {
                this.app.log("Impossibile abilitare WebXRHitTest.");
                return;
            }
            this.hitTestActive = true;
            this.app.log("WebXR Hit-Testing abilitato.");

            // Crea il marker visivo per l'hit test (un anello)
            this.hitTestMarker = BABYLON.MeshBuilder.CreateTorus("hitTestMarker", {
                diameter: 0.15,
                thickness: 0.01,
                tessellation: 32
            }, this.scene);
            const markerMaterial = new BABYLON.StandardMaterial("hitTestMat", this.scene);
            markerMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Verde
            markerMaterial.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
            markerMaterial.disableLighting = true;
            this.hitTestMarker.material = markerMaterial;
            this.hitTestMarker.isVisible = false; // Nascosto finché non c'è un hit
            this.hitTestMarker.rotation.x = Math.PI / 2; // Ruota per essere piatto sul pavimento

            // Ascolta i risultati dell'hit test
            hitTestFeature.onHitTestResultObservable.add((results) => {
                if (results.length) {
                    // Usa il primo risultato valido
                    const hitResult = results[0];
                    this.hitTestMarker.isVisible = true;
                    // Applica la matrice di trasformazione del risultato al marker
                    this.hitTestMarker.position.copyFrom(hitResult.position);
                    this.hitTestMarker.rotationQuaternion = hitResult.rotationQuaternion;
                    // Potremmo voler forzare la rotazione X per mantenerlo piatto se l'orientamento del piano non ci interessa
                    // this.hitTestMarker.rotation.x = Math.PI / 2;
                    // this.hitTestMarker.rotation.y = 0;
                    // this.hitTestMarker.rotation.z = 0;
                } else {
                    this.hitTestMarker.isVisible = false;
                }
            });

        } catch (error) {
            console.error("Errore durante l'abilitazione di Hit-Testing:", error);
            this.app.log(`Errore Hit-Testing: ${error.message}`);
        }
    }

    /**
     * Abilita e configura la feature Plane Detection di WebXR
     */
    enablePlaneDetection() {
        if (!this.xrExperience || !this.xrExperience.baseExperience) return;
        const featuresManager = this.xrExperience.baseExperience.featuresManager;

        try {
            const planeDetectorFeature = featuresManager.enableFeature(BABYLON.WebXRPlaneDetector, "latest");
            if (!planeDetectorFeature) {
                this.app.log("Impossibile abilitare WebXRPlaneDetector.");
                return;
            }
            this.planeDetectionActive = true;
            this.app.log("WebXR Plane Detection abilitato.");

            const planeMaterial = new BABYLON.StandardMaterial("planeMat", this.scene);
            planeMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
            planeMaterial.alpha = 0.3; // Rendi i piani semi-trasparenti

            // Gestione aggiunta di un piano
            planeDetectorFeature.onPlaneAddedObservable.add((plane) => {
                this.app.log(`Piano rilevato: ${plane.id}`);
                const planeMesh = plane.polygonMesh; // Babylon crea già un mesh per noi
                if (planeMesh) {
                    planeMesh.material = planeMaterial;
                    this.planeMeshes[plane.id] = planeMesh;
                }
            });

            // Gestione aggiornamento di un piano
            planeDetectorFeature.onPlaneUpdatedObservable.add((plane) => {
                 // Il mesh viene aggiornato automaticamente da Babylon.js
                 // Potremmo voler fare qualcosa qui se necessario
                 // console.log(`Piano aggiornato: ${plane.id}`);
            });

            // Gestione rimozione di un piano
            planeDetectorFeature.onPlaneRemovedObservable.add((plane) => {
                this.app.log(`Piano rimosso: ${plane.id}`);
                if (this.planeMeshes[plane.id]) {
                    this.planeMeshes[plane.id].dispose();
                    delete this.planeMeshes[plane.id];
                }
            });

        } catch (error) {
            console.error("Errore durante l'abilitazione di Plane Detection:", error);
            this.app.log(`Errore Plane Detection: ${error.message}`);
        }
    }


    /**
     * Avvia il loop di rendering e il controllo degli oggetti visibili
     */
    startRenderLoop() {
        if (!this.engine) return;

        this.engine.runRenderLoop(() => {
            if (this.scene && this.scene.activeCamera && this.arActive) {
                const now = Date.now();

                // --- Controllo periodico oggetti visibili ---
                if (now - this.lastCheckTime > this.checkInterval) {
                    this.lastCheckTime = now;
                    this.updateVisibleObjects(); // Chiama la nuova funzione di aggiornamento
                }

                // --- Rendering della scena ---
                this.scene.render();
            } else if (this.scene) {
                 // Renderizza anche se non in AR per eventuali elementi UI o scene fallback
                 this.scene.render();
            }
        });
        this.app.log("Loop di rendering avviato.");
    }

    /**
     * Controlla quali oggetti dovrebbero essere visibili e aggiorna la scena.
     * Chiamato periodicamente dal render loop.
     */
    updateVisibleObjects() {
        if (!this.app.geoManager || !this.app.storageManager) return;

        // Ottieni gli oggetti nel raggio di 10 metri
        const visibleObjectsData = this.app.geoManager.getVisibleObjects(10);
        const visibleObjectIds = new Set(visibleObjectsData.map(obj => obj.id));
        const currentlyDisplayedIds = new Set(Object.keys(this.displayedObjects));

        // Oggetti da aggiungere: sono in visible ma non in displayed
        visibleObjectsData.forEach(objData => {
            if (!currentlyDisplayedIds.has(objData.id)) {
                this.app.log(`Oggetto ${objData.id} (${objData.name}) entrato nel raggio. Tentativo di visualizzazione.`);
                this.displayARObject(objData);
            }
        });

        // Oggetti da rimuovere: sono in displayed ma non più in visible
        currentlyDisplayedIds.forEach(displayedId => {
            if (!visibleObjectIds.has(displayedId)) {
                this.app.log(`Oggetto ${displayedId} uscito dal raggio. Rimozione.`);
                this.removeARObject(displayedId);
            }
        });
    }

    /**
     * Carica e visualizza un oggetto AR nella scena, posizionandolo
     * secondo la logica di ancoraggio (Image Tracking o fallback).
     * @param {Object} objectData - Dati dell'oggetto da storageManager.
     */
    async displayARObject(objectData) {
        // Evita di caricare lo stesso oggetto più volte
        if (this.displayedObjects[objectData.id]) {
            // this.app.log(`Oggetto ${objectData.id} già visualizzato.`);
            return;
        }

        this.app.log(`Tentativo di caricare e visualizzare ${objectData.name} (ID: ${objectData.id})`);

        // TODO: Implementare Image Tracking qui come priorità

        // --- Fallback: Posizionamento basato su GPS/Bussola (Semplificato per ora) ---
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", objectData.modelPath, this.scene);
            const mesh = result.meshes[0];
            mesh.name = `ar_object_${objectData.id}`; // Assegna un nome univoco

            // 1. Calcola Scala (usando la logica di placeObjectAtHitTest per coerenza)
            const boundingInfo = this.calculateBoundingInfo(result.meshes);
            const maxDimension = Math.max(
                boundingInfo.maximum.x - boundingInfo.minimum.x,
                boundingInfo.maximum.y - boundingInfo.minimum.y,
                boundingInfo.maximum.z - boundingInfo.minimum.z
            );
            // Assicurati che maxDimension non sia zero o troppo piccolo
             const safeMaxDimension = Math.max(maxDimension, 0.01);
            const scaleFactor = objectData.scale * (0.5 / safeMaxDimension); // Adatta scala base (0.5 è un valore arbitrario)
            mesh.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            this.app.log(`Scala applicata a ${objectData.id}: ${scaleFactor.toFixed(3)} (base: ${objectData.scale})`);

            // 2. Calcola Orientamento (relativo al Nord)
            let targetRotationY = 0;
            if (objectData.orientation && typeof objectData.orientation.alpha === 'number') {
                 // L'orientamento salvato (alpha) è rispetto al Nord.
                 // Vogliamo che l'oggetto punti in quella direzione assoluta.
                 // La rotazione Y in Babylon.js è 0 lungo l'asse Z positivo.
                 // Se alpha=0 è Nord, alpha=90 è Est (rotazione Y = -90° o 270°), alpha=180 è Sud (rotazione Y = 180°), alpha=270 è Ovest (rotazione Y = 90°)
                 // Quindi, la rotazione Y desiderata è -alpha (o 360-alpha).
                 targetRotationY = (360 - objectData.orientation.alpha) % 360;
                 this.app.log(`Orientamento target per ${objectData.id}: ${objectData.orientation.alpha.toFixed(1)}° Nord -> Rotazione Y: ${targetRotationY.toFixed(1)}°`);
            } else {
                 this.app.log(`Orientamento non disponibile per ${objectData.id}, usando 0°`);
            }
            const rotationRadiansY = BABYLON.Tools.ToRadians(targetRotationY);
            mesh.rotation = new BABYLON.Vector3(0, rotationRadiansY, 0);

            // 3. Calcola Posizione Relativa GPS
            let targetPosition = new BABYLON.Vector3(0, 0, 2); // Posizione di fallback
            const userPos = this.app.geoManager.currentPosition;
            const userHeading = this.app.geoManager.currentOrientation?.alpha; // Gradi da Nord

            if (userPos && typeof userHeading === 'number' && objectData.position && this.scene.activeCamera) {
                const objLat = objectData.position.latitude;
                const objLon = objectData.position.longitude;
                const userLat = userPos.latitude;
                const userLon = userPos.longitude;

                // Calcola offset Nord/Est in metri
                const deltaNorth = this.app.geoManager.calculateLatitudeDistance(userLat, objLat);
                const deltaEast = this.app.geoManager.calculateLongitudeDistance(userLon, objLon, userLat);

                // Angolo dell'utente rispetto al Nord (in radianti)
                const userHeadingRad = BABYLON.Tools.ToRadians(userHeading);

                // Ruota l'offset per allinearlo alla vista dell'utente
                // Angolo di rotazione necessario = -userHeadingRad
                const angle = -userHeadingRad;
                const cosAngle = Math.cos(angle);
                const sinAngle = Math.sin(angle);

                // Calcola offset relativo X (destra/sinistra) e Z (avanti/indietro)
                // Assumendo X = Est ruotato, Z = Nord ruotato
                const relativeX = deltaEast * cosAngle - deltaNorth * sinAngle;
                const relativeZ = deltaEast * sinAngle + deltaNorth * cosAngle;

                // Posizione target = Posizione camera + offset relativo
                // Manteniamo la Y della camera per ora (oggetto fluttuante all'altezza degli occhi)
                // TODO: Proiettare su un piano rilevato vicino a questa posizione
                targetPosition = this.scene.activeCamera.position.add(new BABYLON.Vector3(relativeX, 0, relativeZ));

                this.app.log(`Posizione calcolata per ${objectData.id}: dN=${deltaNorth.toFixed(1)}m, dE=${deltaEast.toFixed(1)}m -> rX=${relativeX.toFixed(1)}m, rZ=${relativeZ.toFixed(1)}m -> World=${targetPosition.x.toFixed(1)},${targetPosition.y.toFixed(1)},${targetPosition.z.toFixed(1)}`);

            } else {
                this.app.log(`Dati GPS/Heading/Camera insufficienti per calcolo posizione ${objectData.id}. Usando fallback.`);
                if (this.scene.activeCamera) {
                     const forwardDirection = this.scene.activeCamera.getDirection(BABYLON.Vector3.Forward());
                     const forwardXZ = new BABYLON.Vector3(forwardDirection.x, 0, forwardDirection.z).normalize();
                     targetPosition = this.scene.activeCamera.position.add(forwardXZ.scale(2));
                }
            }
            mesh.position = targetPosition;


            // 4. Aggiungi alla mappa degli oggetti visualizzati
            this.displayedObjects[objectData.id] = mesh;
            this.app.log(`Oggetto ${objectData.id} (${objectData.name}) visualizzato con successo (orientamento applicato, posizione placeholder).`);

        } catch (error) {
            console.error(`Errore durante la visualizzazione dell'oggetto ${objectData.id}:`, error);
            this.app.log(`Errore visualizzazione ${objectData.name}: ${error.message}`);
            // Assicurati che non rimanga nella mappa se il caricamento fallisce
            if (this.displayedObjects[objectData.id]) {
                delete this.displayedObjects[objectData.id];
            }
        }
    }

    /**
     * Rimuove un oggetto AR dalla scena.
     * @param {string} objectId - ID dell'oggetto da rimuovere.
     */
    removeARObject(objectId) {
        const mesh = this.displayedObjects[objectId];
        if (mesh) {
            mesh.dispose(); // Rimuovi dalla scena e libera risorse
            delete this.displayedObjects[objectId]; // Rimuovi dalla mappa
            this.app.log(`Oggetto ${objectId} rimosso dalla scena.`);
        } else {
            this.app.log(`Tentativo di rimuovere oggetto ${objectId} non trovato nella scena.`);
        }
    }

    /**
     * Ferma il loop di rendering
     */
    stopRenderLoop() {
        if (!this.engine) return;
        this.engine.stopRenderLoop();
        this.app.log("Loop di rendering fermato.");
    }

    // --- METODI DI POSIZIONAMENTO OGGETTI (DA RIFARE PER WEBXR/HIT-TEST) ---

    /**
     * Aggiorna l'oggetto di anteprima nel Menu 2 (Logica da rifare per WebXR)
     * @param {string} modelPath - Percorso del modello 3D o URL Blob
     * @param {number} scale - Scala dell'oggetto
     * @param {number} rotation - Rotazione dell'oggetto in gradi (asse Y)
     */
    async updatePreviewObject(modelPath, scale, rotation) {
        this.app.log("ARManager.updatePreviewObject chiamato - Logica WebXR da implementare.");
        this.currentPlacedObjectData = null; // Non stiamo mostrando un oggetto piazzato

        // Rimuovi oggetto precedente
        if (this.arObject) {
            this.arObject.dispose();
            this.arObject = null;
        }

        // TODO: Caricare il modello e forse attaccarlo al marker hit-test o mostrarlo flottante?
        // Per ora, non facciamo nulla per evitare errori.
        this.app.showMessage("Anteprima oggetto con WebXR non ancora implementata.");

        /* Esempio di come potrebbe funzionare (molto semplificato):
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", modelPath, this.scene);
            this.arObject = result.meshes[0];
            // Scalare e ruotare come prima...
            // Posizionare l'oggetto dove si trova il marker hit-test?
            if (this.hitTestMarker && this.hitTestMarker.isVisible) {
                 this.arObject.position.copyFrom(this.hitTestMarker.position);
                 // Applicare scala/rotazione
            } else {
                 // Mostra flottante?
                 this.arObject.position = this.scene.activeCamera.position.add(this.scene.activeCamera.getDirection(BABYLON.Vector3.Forward()).scale(1.5));
            }
        } catch (error) {
            console.error("Errore caricamento anteprima WebXR:", error);
        }
        */
    }

    /**
     * Mostra un oggetto piazzato nel mondo AR (Logica da rifare per WebXR)
     * @param {Object} objectData - Dati dell'oggetto (ora usati solo per riferimento)
     */
    async showPlacedObject(objectData) {
         this.app.log("ARManager.showPlacedObject chiamato - Logica WebXR da implementare.");
         this.currentPlacedObjectData = objectData; // Memorizza per riferimento

         // Rimuovi oggetto precedente
         if (this.arObject) {
             this.arObject.dispose();
             this.arObject = null;
         }

         // TODO: In un'app completa, questo metodo probabilmente non caricherebbe
         // l'oggetto direttamente. Invece, l'utente dovrebbe "piazzare" l'oggetto
         // toccando lo schermo quando il marker hit-test è nella posizione desiderata.
         // La funzione chiamata al tocco caricherebbe il modello e lo posizionerebbe
         // usando le coordinate dell'hit-test.

         // Per ora, non facciamo nulla qui.
         this.app.showMessage("Visualizzazione oggetto piazzato con WebXR non ancora implementata.");
    }

    /**
     * Funzione ipotetica per piazzare l'oggetto attualmente selezionato
     * nel punto indicato dall'hit-test. Chiamata da un input utente (es. tap).
     */
    async placeObjectAtHitTest(modelPath, scale, rotation) {
        if (!this.hitTestMarker || !this.hitTestMarker.isVisible) {
            this.app.showMessage("Punta il dispositivo verso una superficie piana rilevata.");
            return null;
        }

        this.app.log(`Tentativo di piazzare ${modelPath} alla posizione hit-test.`);

        // Rimuovi oggetto precedente (se è un'anteprima)
        if (this.arObject) {
            this.arObject.dispose();
            this.arObject = null;
        }

        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", modelPath, this.scene);
            const placedObject = result.meshes[0];

            // Scalare e ruotare come necessario (logica simile a updatePreviewObject)
            const boundingInfo = this.calculateBoundingInfo(result.meshes);
            const maxDimension = Math.max(
                boundingInfo.maximum.x - boundingInfo.minimum.x,
                boundingInfo.maximum.y - boundingInfo.minimum.y,
                boundingInfo.maximum.z - boundingInfo.minimum.z
            );
            const scaleFactor = scale * (0.5 / maxDimension); // Adatta la scala base
            placedObject.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);

            const rotationRadians = (rotation * Math.PI) / 180;
            placedObject.rotation = new BABYLON.Vector3(0, rotationRadians, 0); // Applica rotazione Y

            // Posiziona l'oggetto alla posizione del marker hit-test
            placedObject.position.copyFrom(this.hitTestMarker.position);
            // Potremmo voler applicare anche la rotazione del piano se rilevante
            // placedObject.rotationQuaternion = this.hitTestMarker.rotationQuaternion;

            this.app.log("Oggetto piazzato con successo tramite hit-test.");
            // Potremmo voler salvare questo oggetto nello storage manager qui,
            // includendo la sua posizione e rotazione nel mondo reale.
            // const worldMatrix = placedObject.computeWorldMatrix(true);
            // Salvare worldMatrix o posizione/rotazione derivate.

            return placedObject; // Ritorna l'oggetto piazzato

        } catch (error) {
            console.error("Errore durante il piazzamento dell'oggetto via hit-test:", error);
            this.app.log(`Errore piazzamento hit-test: ${error.message}`);
            this.app.showMessage("Errore durante il piazzamento dell'oggetto.");
            return null;
        }
    }


    /**
     * Calcola la bounding box per un gruppo di mesh (riutilizzata)
     */
    calculateBoundingInfo(meshes) {
        let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

        for (const mesh of meshes) {
            // Assicurati che la mesh abbia getBoundingInfo e che sia calcolabile
            if (mesh.getBoundingInfo && mesh.geometry) {
                 try {
                    const boundingInfo = mesh.getBoundingInfo();
                    // Verifica che i vettori min/max siano validi
                    if (boundingInfo && boundingInfo.minimum && boundingInfo.maximum) {
                        const meshMin = boundingInfo.minimum.multiply(mesh.scaling);
                        const meshMax = boundingInfo.maximum.multiply(mesh.scaling);

                        min = BABYLON.Vector3.Minimize(min, meshMin);
                        max = BABYLON.Vector3.Maximize(max, meshMax);
                    }
                 } catch(e) {
                     console.warn("Impossibile calcolare bounding info per una mesh:", mesh.name, e);
                 }
            }
        }
         // Se min/max non sono stati aggiornati (es. nessuna mesh valida), ritorna valori di default
         if (min.x === Number.MAX_VALUE) min = BABYLON.Vector3.Zero();
         if (max.x === Number.MIN_VALUE) max = new BABYLON.Vector3(1, 1, 1); // Evita dimensione zero

        return new BABYLON.BoundingInfo(min, max);
    }

    // --- METODI OBSOLETI O DA RIVEDERE ---

    /* updatePreviewObject: Probabilmente non più necessario se la preview è gestita diversamente */
    /* showPlacedObject: Sostituito dalla logica in updateVisibleObjects/displayARObject */
    /* placeObjectAtHitTest: Usato solo per il piazzamento iniziale in Menu2, non per la visualizzazione continua */

    // --- METODO PER IMAGE TRACKING (DA IMPLEMENTARE) ---
    enableImageTracking(referenceImages) {
         if (!this.xrExperience || !this.xrExperience.baseExperience) return false;
         const featuresManager = this.xrExperience.baseExperience.featuresManager;

         try {
             const imageTrackingFeature = featuresManager.enableFeature(BABYLON.WebXRImageTracking, "latest", {
                 images: referenceImages // Array di { src: "url", estimatedWidthInMeters: width }
             });

             if (!imageTrackingFeature) {
                 this.app.log("Impossibile abilitare WebXRImageTracking.");
                 return false;
             }

             this.app.log("WebXR Image Tracking abilitato.");

             imageTrackingFeature.onTrackedImageUpdatedObservable.add((image) => {
                 // L'immagine è stata rilevata o aggiornata
                 this.app.log(`Immagine tracciata: ${image.id}, Posizione: ${image.transformationMatrix.getTranslation()}`);
                 // TODO: Qui dovremmo associare l'immagine tracciata all'oggetto AR corretto
                 // e aggiornare la posizione/rotazione del mesh di quell'oggetto.
                 // Potremmo usare image.id o un nome associato all'immagine.
                 const objectToUpdate = this.findObjectByImageAnchor(image.id); // Funzione da creare
                 if (objectToUpdate && this.displayedObjects[objectToUpdate.id]) {
                     const mesh = this.displayedObjects[objectToUpdate.id];
                     mesh.position.copyFrom(image.transformationMatrix.getTranslation());
                     mesh.rotationQuaternion.copyFrom(BABYLON.Quaternion.FromRotationMatrix(image.transformationMatrix.getRotationMatrix()));
                     // Potrebbe essere necessario applicare un offset o rotazione aggiuntiva
                 }
             });

             return true;
         } catch (error) {
             console.error("Errore durante l'abilitazione di Image Tracking:", error);
             this.app.log(`Errore Image Tracking: ${error.message}`);
             return false;
         }
    }

    // Funzione helper (da implementare o adattare)
    findObjectByImageAnchor(imageId) {
        // Cerca tra gli oggetti in this.app.storageManager.getAllObjects()
        // quello che ha un campo tipo 'imageAnchorId' === imageId
        return null; // Placeholder
    }


    // --- METODO PLACEHOLDER ---
    // Questo metodo probabilmente non ha più senso con WebXR Image Tracking
    setImageAnchorEnabled(enabled) {
        this.app.log(`Toggle Ancoraggio Immagini premuto: ${enabled}. La gestione avviene tramite WebXR Image Tracking ora.`);
        // Potremmo voler attivare/disattivare la feature WebXR qui, ma è complesso.
        // Meglio abilitarla all'inizio se si prevede di usarla.
        if (enabled) {
             this.app.showMessage("L'ancoraggio alle immagini è gestito automaticamente da WebXR se configurato.");
        }
    }
}

// Esporta la classe
window.ARManager = ARManager;
