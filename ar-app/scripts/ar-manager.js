/**
 * Gestisce la realtà aumentata con Babylon.js per modalità Piazzamento e Esplorazione
 */
class ARManager {
    constructor() {
        this.placementCanvas = null;
        this.explorationCanvas = null;
        this.engine = null;
        this.scene = null; // Scena principale (usata per entrambe le modalità?)
        this.placementScene = null; // Scena separata per il feed camera? O usiamo la stessa? -> Usiamo la stessa per semplicità
        this.explorationScene = null; // Scena per AR immersiva

        this.isARSupported = false;
        this.isARMode = false; // Flag per modalità AR immersiva attiva
        this.xrExperienceHelper = null; // Riferimento all'helper XR
        this.arObjects = new Map(); // Mappa per tenere traccia degli oggetti AR per ID { id: meshNode }

        this.cameraFeedVideo = null; // Elemento video per il feed camera
        this.cameraFeedStream = null; // Stream della camera
    }

    /**
     * Inizializza il motore di rendering 3D e verifica supporto AR.
     * @param {HTMLCanvasElement} placementCanvas - Canvas per la modalità piazzamento.
     * @param {HTMLCanvasElement} explorationCanvas - Canvas per la modalità esplorazione.
     */
    async init(placementCanvas, explorationCanvas) {
        this.placementCanvas = placementCanvas;
        this.explorationCanvas = explorationCanvas;

        // Usa il canvas di esplorazione per inizializzare il motore,
        // dato che è quello che userà WebXR. Potremmo dover switchare il rendering target.
        this.engine = new BABYLON.Engine(this.explorationCanvas, true, {
             preserveDrawingBuffer: true, stencil: true // Opzioni standard
        });

        // Crea la scena principale
        this.scene = this.createScene(this.engine);

        // Avvia il loop di rendering principale
        this.engine.runRenderLoop(() => {
            if (this.scene && this.scene.activeCamera) {
                 this.scene.render();
            }
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
     * Crea la scena di base di Babylon.js
     * @param {BABYLON.Engine} engine - L'istanza del motore.
     */
    createScene(engine) {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Sfondo trasparente di default

        // Camera di default (verrà sostituita dalla camera XR o da una camera per il feed)
        const defaultCamera = new BABYLON.FreeCamera("defaultCam", new BABYLON.Vector3(0, 1, -2), scene);
        defaultCamera.attachControl(this.explorationCanvas, true); // Controlli di base

        // Luce ambientale
        const hemisphericLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemisphericLight.intensity = 0.8;

        return scene;
    }

    /**
     * Avvia il feed della camera sul canvas di piazzamento.
     * @param {HTMLCanvasElement} canvas - Il canvas dove mostrare il feed.
     */
    async startCameraFeed(canvas) {
        if (this.cameraFeedStream) return; // Già attivo

        try {
            this.cameraFeedStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

            this.cameraFeedVideo = document.createElement('video');
            this.cameraFeedVideo.setAttribute('autoplay', '');
            this.cameraFeedVideo.setAttribute('muted', '');
            this.cameraFeedVideo.setAttribute('playsinline', '');
            this.cameraFeedVideo.srcObject = this.cameraFeedStream;
            await this.cameraFeedVideo.play();

            // Usa il video come texture di sfondo nella scena
            const backgroundMaterial = new BABYLON.BackgroundMaterial("backgroundMat", this.scene);
            backgroundMaterial.diffuseTexture = new BABYLON.VideoTexture("videoTex", this.cameraFeedVideo, this.scene, true, false);
            backgroundMaterial.diffuseTexture.vFlip = true; // Spesso necessario per l'orientamento corretto
            backgroundMaterial.shadowLevel = 0.5; // Evita che lo sfondo sia troppo luminoso
            backgroundMaterial.alpha = 1.0; // Opaco

            // Assicurati che la scena abbia una camera standard attiva per vedere lo sfondo
            if (!this.scene.activeCamera || this.scene.activeCamera.name === "defaultCam") {
                 // Potremmo creare una camera fissa per la vista piazzamento se necessario
                 // this.scene.activeCamera = new BABYLON.FreeCamera("placementCam", new BABYLON.Vector3(0, 0, 0), this.scene);
            }
             // Switch engine rendering target? No, basta impostare lo sfondo sulla scena principale.
             console.log("Camera feed started for placement view.");

        } catch (error) {
            console.error("Errore nell'avvio del feed camera:", error);
            this.stopCameraFeed(); // Pulisci in caso di errore
            throw error; // Rilancia l'errore
        }
    }

    /**
     * Ferma il feed della camera.
     */
    stopCameraFeed() {
        if (this.cameraFeedStream) {
            this.cameraFeedStream.getTracks().forEach(track => track.stop());
            this.cameraFeedStream = null;
            console.log("Camera feed stopped.");
        }
        if (this.cameraFeedVideo) {
            this.cameraFeedVideo.pause();
            this.cameraFeedVideo.srcObject = null;
            this.cameraFeedVideo = null;
        }
        // Rimuovi la texture di sfondo dalla scena
        const background = this.scene.getMaterialByName("backgroundMat");
        if (background) {
            background.dispose(true, true); // Forza dispose di texture
        }
         // Potremmo voler ripristinare la camera di default se l'abbiamo cambiata
         // if (this.scene.activeCamera.name === "placementCam") {
         //     this.scene.activeCamera = this.scene.getCameraByName("defaultCam");
         // }
    }


    /**
     * Controlla se la realtà aumentata è supportata
     */
    async checkARSupport() {
        try {
            return (navigator.xr && await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar'));
        } catch (error) {
            console.error("Errore nel controllo del supporto AR:", error);
            return false;
        }
    }

    /**
     * Avvia l'esperienza AR immersiva sul canvas di esplorazione.
     * @param {HTMLCanvasElement} canvas - Il canvas per l'AR.
     */
    async startARExperience(canvas) {
        if (!this.isARSupported) {
            console.error("AR non supportata.");
            return false;
        }
        if (this.isARMode) {
             console.warn("AR experience already active.");
             return true; // Già attiva
        }

        try {
            // Assicurati che il feed camera sia fermo
            this.stopCameraFeed();

            // Crea l'helper per l'esperienza XR
            this.xrExperienceHelper = await this.scene.createDefaultXRExperienceAsync({
                uiOptions: {
                    sessionMode: "immersive-ar",
                    referenceSpaceType: "local-floor" // Usa il pavimento come riferimento
                },
                optionalFeatures: true // Abilita feature come hit-testing, anchors se disponibili
            });

            // Controlla se l'helper è stato creato correttamente
             if (!this.xrExperienceHelper || !this.xrExperienceHelper.baseExperience) {
                 throw new Error("Impossibile creare l'esperienza XR.");
             }

            this.isARMode = true;
            console.log("AR experience started.");

            // Eventuale logica aggiuntiva all'avvio della sessione AR
            this.xrExperienceHelper.baseExperience.onStateChangedObservable.add((state) => {
                console.log("XR State:", BABYLON.WebXRState[state]);
                if (state === BABYLON.WebXRState.EXITING) {
                    this.isARMode = false;
                    this.clearARObjects(); // Rimuovi oggetti AR quando si esce
                    console.log("AR experience exited.");
                } else if (state === BABYLON.WebXRState.ENTERING) {
                     // Potremmo dover riposizionare gli oggetti qui se necessario
                }
            });

            return true;

        } catch (error) {
            console.error("Errore nell'avvio dell'esperienza AR:", error);
            this.isARMode = false;
            this.xrExperienceHelper = null;
            return false;
        }
    }

    /**
     * Ferma l'esperienza AR immersiva.
     */
    async stopARExperience() {
        if (this.isARMode && this.xrExperienceHelper) {
            try {
                await this.xrExperienceHelper.baseExperience.exitXRAsync();
                console.log("AR experience stopped via method call.");
            } catch (error) {
                 console.error("Errore durante l'uscita dalla sessione XR:", error);
            } finally {
                 this.isARMode = false;
                 this.xrExperienceHelper = null; // Rilascia riferimento
                 this.clearARObjects(); // Rimuovi oggetti dalla scena
            }
        }
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
            try {
                // Carica il modello 3D
                const result = await BABYLON.SceneLoader.ImportMeshAsync(
                    "", // meshNames
                    "", // rootUrl
                    objData.model, // sceneFilename
                    this.scene, // scene
                    undefined, // onProgress
                    ".glb" // pluginExtension
                );

                if (!result.meshes || result.meshes.length === 0) {
                    throw new Error(`Modello ${objData.model} non caricato correttamente o vuoto.`);
                }

                const rootMesh = result.meshes[0]; // Assumiamo che il primo sia il nodo radice
                rootMesh.name = `arObject_${objData.id}`;

                // Calcola la dimensione e scala (come prima)
                const boundingInfo = this.calculateBoundingInfo(result.meshes);
                const maxDimension = Math.max(
                    boundingInfo.maximum.x - boundingInfo.minimum.x,
                    boundingInfo.maximum.y - boundingInfo.minimum.y,
                    boundingInfo.maximum.z - boundingInfo.minimum.z
                );
                const desiredHeight = 0.5; // Altezza desiderata in metri
                const scaleFactor = maxDimension > 0 ? desiredHeight / maxDimension : 1;
                rootMesh.scaling.scaleInPlace(scaleFactor);

                // Posizione iniziale (verrà aggiornata subito dopo)
                rootMesh.position = new BABYLON.Vector3(0, 0, 2); // Placeholder davanti

                // Applica rotazione salvata (Y-axis, convertita in radianti)
                const savedOrientationRad = (objData.orientation.alpha * Math.PI) / 180;
                rootMesh.rotation.y = -savedOrientationRad; // Negativo per allineare bussola e rotazione 3D

                this.arObjects.set(objData.id, rootMesh); // Aggiungi alla mappa
                console.log(`Object ${objData.id} (${objData.model.split('/').pop()}) loaded.`);

            } catch (error) {
                console.error(`Errore nel caricamento/piazzamento dell'oggetto ${objData.id} (${objData.model}):`, error);
                // Potremmo creare un placeholder per l'oggetto fallito?
            }
        });

        await Promise.all(loadPromises);
        console.log("Finished placing initial AR objects.");
        // La posizione verrà aggiornata dal loop di update
    }

    /**
     * Aggiorna la posizione di tutti gli oggetti AR nella scena.
     * @param {Array} objectsData - Array di oggetti { id, model, position, orientation }
     * @param {object} currentPosition - Posizione GPS attuale dell'utente { latitude, longitude, accuracy }
     * @param {number} currentDeviceHeading - Orientamento attuale del dispositivo (bussola, gradi)
     * @param {GeoManager} geoManager - Istanza per usare i calcoli di distanza/bearing
     */
    updateMultipleObjectPositions(objectsData, currentPosition, currentDeviceHeading, geoManager) {
        if (!this.isARMode || !currentPosition || this.arObjects.size === 0) {
            return;
        }

        const headingRad = (currentDeviceHeading * Math.PI) / 180;

        objectsData.forEach(objData => {
            const mesh = this.arObjects.get(objData.id);
            if (!mesh) return; // Oggetto non trovato o non caricato

            // Calcola distanza e direzione dall'utente all'oggetto
            const distance = geoManager.calculateDistance(
                currentPosition.latitude, currentPosition.longitude,
                objData.position.latitude, objData.position.longitude
            );
            const bearing = geoManager.calculateBearing(
                currentPosition.latitude, currentPosition.longitude,
                objData.position.latitude, objData.position.longitude
            );

            // Limita distanza massima per visibilità
            const maxDistance = 50; // Aumentata un po'
            const clampedDistance = Math.min(distance, maxDistance);

            // Calcola la posizione relativa nello spazio XR
            // La direzione (bearing) è relativa al Nord. Dobbiamo renderla relativa alla direzione del dispositivo.
            const bearingRad = (bearing * Math.PI) / 180;
            const relativeAngleRad = bearingRad - headingRad; // Angolo rispetto a dove guarda il dispositivo

            // Calcola coordinate XZ nello spazio locale (Y è l'altezza, Z è avanti)
            // Il sistema di coordinate XR: +X destra, +Y alto, +Z dietro (convenzione WebXR/Babylon)
            // Quindi, per posizionare davanti, usiamo Z positivo.
            // L'angolo 0 (Nord) dovrebbe essere Z positivo. Est (90°) dovrebbe essere X positivo.
            // Math.sin(0) = 0, Math.cos(0) = 1 -> Nord (0°) -> (0, 0, +dist)
            // Math.sin(PI/2) = 1, Math.cos(PI/2) = 0 -> Est (90°) -> (+dist, 0, 0)
            // Math.sin(PI) = 0, Math.cos(PI) = -1 -> Sud (180°) -> (0, 0, -dist)
            // Math.sin(3PI/2) = -1, Math.cos(3PI/2) = 0 -> Ovest (270°) -> (-dist, 0, 0)
            // Questo non sembra corretto rispetto all'angolo relativo.

            // Riproviamo: Angolo relativo 0 = davanti (Z+). Angolo relativo PI/2 (90° a destra) = X+.
            const x = clampedDistance * Math.sin(relativeAngleRad);
            const z = clampedDistance * Math.cos(relativeAngleRad);

            // Aggiorna la posizione della mesh nello spazio XR
            // Assumiamo che l'altezza (Y) sia 0 rispetto al pavimento (local-floor)
            mesh.position.x = x;
            mesh.position.y = 0; // O leggermente sopra il pavimento? es. 0.1
            mesh.position.z = z;

            // La rotazione dell'oggetto (mesh.rotation.y) è già stata impostata
            // durante il placeMultipleVirtualObjects e rimane fissa rispetto al mondo.
        });
    }

    /**
     * Calcola la bounding box per un gruppo di mesh (invariato)
     */
    calculateBoundingInfo(meshes) {
        let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        meshes.forEach(mesh => {
            if (mesh.getBoundingInfo && !mesh.infiniteDistance) {
                const worldMatrix = mesh.getWorldMatrix();
                const boundingInfo = mesh.getBoundingInfo();
                if (boundingInfo) {
                    const meshMin = BABYLON.Vector3.TransformCoordinates(boundingInfo.minimum, worldMatrix);
                    const meshMax = BABYLON.Vector3.TransformCoordinates(boundingInfo.maximum, worldMatrix);
                    min = BABYLON.Vector3.Minimize(min, meshMin);
                    max = BABYLON.Vector3.Maximize(max, meshMax);
                }
            }
        });
        if (min.x === Infinity) return new BABYLON.BoundingInfo(BABYLON.Vector3.Zero(), BABYLON.Vector3.Zero());
        return new BABYLON.BoundingInfo(min, max);
    }
}

// Esporta la classe (se necessario nel contesto globale)
window.ARManager = ARManager;
