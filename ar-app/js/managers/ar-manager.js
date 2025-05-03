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
        this.arObject = null; // Oggetto 3D attualmente visualizzato (anteprima o piazzato)
        this.currentPlacedObjectData = null; // Dati dell'oggetto piazzato (per riferimento, non per posizionamento continuo)

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
     * Avvia il loop di rendering
     */
    startRenderLoop() {
        if (!this.engine) return;
        this.engine.runRenderLoop(() => {
            if (this.scene && this.scene.activeCamera) {
                // Il rendering e la pulizia sono gestiti da WebXR quando in sessione
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

    // --- METODI OBSOLETI (BASATI SU GPS/BUSSOLA) ---
    /*
    updateCameraOrientation() { ... }
    updateObjectPosition(objectData) { ... }
    */

    // --- METODO PLACEHOLDER ---
    setImageAnchorEnabled(enabled) {
        this.app.log(`Ancoraggio immagini (non WebXR) ${enabled ? 'attivato' : 'disattivato'} - Funzionalità non applicabile con WebXR.`);
        if (enabled) {
            this.app.showMessage("L'ancoraggio immagini non è gestito tramite questo toggle in modalità WebXR.");
        }
    }
}

// Esporta la classe
window.ARManager = ARManager;
