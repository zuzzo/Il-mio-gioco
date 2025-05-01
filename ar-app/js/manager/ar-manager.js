/**
 * Gestore della realtà aumentata basato su Babylon.js
 */
class ARManager {
    constructor() {
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
                {width: 10, height: 5.625}, 
                this.scene
            );
            plane.position.z = 5;
            plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            
            const mat = new BABYLON.StandardMaterial("videoMat", this.scene);
            mat.diffuseTexture = this.videoTexture;
            mat.emissiveTexture = this.videoTexture;
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            mat.disableLighting = true;
            plane.material = mat;
            
            // Avvia il loop di rendering
            this.startRenderLoop();
            
            // Gestione resize della finestra
            window.addEventListener('resize', () => {
                this.engine.resize();
            });
            
            return true;
        } catch (error) {
            console.error("Errore nell'inizializzazione AR:", error);
            return false;
        }
    }

    /**
     * Avvia il loop di rendering
     */
    startRenderLoop() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    /**
     * Ferma il loop di rendering
     */
    stopRenderLoop() {
        this.engine.stopRenderLoop();
    }

    /**
     * Aggiorna l'oggetto di anteprima
     * @param {string} modelPath - Percorso del modello 3D
     * @param {number} scale - Scala dell'oggetto
     * @param {number} rotation - Rotazione dell'oggetto in gradi
     */
    async updatePreviewObject(modelPath, scale, rotation) {
        try {
            // Rimuovi l'oggetto esistente se presente
            if (this.previewObject) {
                this.previewObject.dispose();
                this.previewObject = null;
            }
            
            // Carica il modello 3D
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "", 
                "", 
                modelPath, 
                this.scene
            );
            
            // Crea un parent mesh per il modello
            this.previewObject = new BABYLON.Mesh("previewParent", this.scene);
            
            // Aggiungi tutti i mesh del modello come figli
            for (const mesh of result.meshes) {
                if (mesh !== result.meshes[0]) { // Ignora il root mesh
                    mesh.parent = this.previewObject;
                }
            }
            
            // Posiziona l'oggetto davanti alla camera
            this.previewObject.position = new BABYLON.Vector3(0, 0, 2);
            
            // Applica scala e rotazione
            this.previewObject.scaling = new BABYLON.Vector3(scale, scale, scale);
            this.previewObject.rotation = new BABYLON.Vector3(
                0, 
                BABYLON.Tools.ToRadians(rotation), 
                0
            );
        } catch (error) {
            console.error("Errore nell'aggiornamento dell'oggetto di anteprima:", error);
        }
    }

    /**
     * Mostra un oggetto nell'AR
     * @param {Object} object - Oggetto da mostrare
     * @param {number} bearing - Direzione verso l'oggetto in gradi
     */
    async showObject(object, bearing) {
        try {
            // Rimuovi l'oggetto virtuale esistente se presente
            if (this.virtualObject) {
                this.virtualObject.dispose();
                this.virtualObject = null;
            }
            
            // Rimuovi l'oggetto di anteprima se presente
            if (this.previewObject) {
                this.previewObject.dispose();
                this.previewObject = null;
            }
            
            // Carica il modello 3D
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "", 
                "", 
                object.modelPath, 
                this.scene
            );
            
            // Crea un parent mesh per il modello
            this.virtualObject = new BABYLON.Mesh("virtualParent", this.scene);
            
            // Aggiungi tutti i mesh del modello come figli
            for (const mesh of result.meshes) {
                if (mesh !== result.meshes[0]) { // Ignora il root mesh
                    mesh.parent = this.virtualObject;
                }
            }
            
            // Applica scala e rotazione
            this.virtualObject.scaling = new BABYLON.Vector3(
                object.scale, 
                object.scale, 
                object.scale
            );
            
            this.virtualObject.rotation = new BABYLON.Vector3(
                0, 
                BABYLON.Tools.ToRadians(object.rotation), 
                0
            );
            
            // Posiziona l'oggetto in base alla direzione
            const distance = 2; // Distanza fissa per la visualizzazione
            const bearingRad = BABYLON.Tools.ToRadians(bearing);
            
            const x = Math.sin(bearingRad) * distance;
            const z = Math.cos(bearingRad) * distance;
            
            this.virtualObject.position = new BABYLON.Vector3(x, 0, z);
            
            return true;
        } catch (error) {
            console.error("Errore nella visualizzazione dell'oggetto:", error);
            return false;
        }
    }

    /**
     * Attiva l'ancoraggio delle immagini
     * @param {boolean} enabled - Attiva/disattiva l'ancoraggio
     */
    setImageAnchorEnabled(enabled) {
        this.imageAnchorEnabled = enabled;
        
        // Qui si implementerebbe la logica per l'ancoraggio basato su immagini
        // Questa è una funzionalità avanzata che richiederebbe l'uso di
        // librerie specifiche per il riconoscimento delle immagini
        
        console.log("Ancoraggio immagini: " + (enabled ? "attivato" : "disattivato"));
    }
}

// Esporta la classe
window.ARManager = ARManager;