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
                    this.placeVirtualObject();
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
     */
    placeVirtualObject() {
        // Crea un cubo rosso come oggetto virtuale di esempio
        if (!this.arObject) {
            this.arObject = BABYLON.MeshBuilder.CreateBox("arObject", {
                width: 0.5,
                height: 0.5,
                depth: 0.5
            }, this.scene);
            
            // Materiale rosso
            const material = new BABYLON.StandardMaterial("objectMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            material.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
            this.arObject.material = material;
            
            // Posiziona l'oggetto davanti alla camera
            this.arObject.position = new BABYLON.Vector3(0, 0, 2);
        } else {
            this.arObject.isVisible = true;
        }
        
        // Animazione di rotazione
        this.scene.registerBeforeRender(() => {
            if (this.arObject) {
                this.arObject.rotation.y += 0.01;
            }
        });
        
        return this.arObject;
    }
    
    /**
     * Posiziona un oggetto virtuale basato su una posizione geo relativa
     * @param {number} distance - Distanza in metri
     * @param {number} bearing - Direzione in gradi (0 = Nord, 90 = Est)
     */
    updateObjectPosition(distance, bearing) {
        if (!this.arObject) {
            this.placeVirtualObject();
        }
        
        // Converti la direzione da gradi a radianti
        const bearingRad = (bearing * Math.PI) / 180;
        
        // Calcola la posizione relativa (semplificate per un esempio base)
        // In una implementazione completa dovresti considerare l'orientamento del dispositivo
        const x = distance * Math.sin(bearingRad);
        const z = distance * Math.cos(bearingRad);
        
        // Aggiorna la posizione
        this.arObject.position = new BABYLON.Vector3(x, 0, z);
    }
}

// Esporta la classe
window.ARManager = ARManager;
