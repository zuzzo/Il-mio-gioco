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
        this.savedObjectOrientation = 0;
        this.videoElement = null;
        this.arActive = false;
        
        // Parametri per l'ancoraggio
        this.isAnchored = false;
        this.anchorPosition = null;
        this.smoothingFactor = 0.1;
        this.anchorTimeout = null;
        this.anchorDistance = 5;
        this.maxAnchorDistance = 15;
    }

    /**
     * Inizializza il motore di rendering 3D
     */
    async init(canvasId, videoId = 'camera-feed') {
        this.canvas = document.getElementById(canvasId);
        this.videoElement = document.getElementById(videoId);
        
        if (!this.canvas) {
            console.error("Canvas element non trovato:", canvasId);
            this.updateStatus("Errore: elemento canvas non trovato");
            return false;
        }
        
        if (!this.videoElement) {
            console.error("Video element non trovato:", videoId);
            this.updateStatus("Errore: elemento video non trovato");
            return false;
        }
        
        try {
            this.engine = new BABYLON.Engine(this.canvas, true);
            this.scene = this.createScene();
            
            this.engine.runRenderLoop(() => {
                this.scene.render();
            });
            
            window.addEventListener('resize', () => {
                this.engine.resize();
            });
            
            this.initCameraDebug();
            const cameraStarted = await this.startVideoStream();
            
            if (!cameraStarted) {
                this.updateStatus("Impossibile avviare la fotocamera. Verifica i permessi.");
                console.warn("Fotocamera non avviata correttamente");
            }
            
            this.isARSupported = await this.checkARSupport();
            return this.isARSupported;
        } catch (error) {
            console.error("Errore nell'inizializzazione dell'AR Manager:", error);
            this.updateStatus("Errore inizializzazione: " + error.message);
            return false;
        }
    }
    
    /**
     * Avvia il flusso video dalla fotocamera
     */
    async startVideoStream() {
        try {
            if (!this.videoElement) {
                console.error("Elemento video non trovato");
                this.updateStatus("Errore: elemento video non trovato");
                return false;
            }

            // Forza attributi per compatibilità mobile
            this.videoElement.setAttribute('playsinline', '');
            this.videoElement.setAttribute('webkit-playsinline', '');
            this.videoElement.muted = true;
            this.videoElement.style.transform = 'scaleX(-1)';

            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            const stream = await this.getCameraStream(constraints);
            if (!stream) return false;

            this.videoElement.srcObject = stream;
            await this.playVideo();
            return true;
        } catch (error) {
            console.error("Errore nell'accesso alla fotocamera:", error);
            this.updateStatus("Errore fotocamera: " + error.message);
            return false;
        }
    }

    /**
     * Ottiene lo stream della fotocamera con fallback
     */
    async getCameraStream(constraints) {
        const fallbackConstraints = [
            { video: { facingMode: 'environment' } },
            { video: true },
            { video: { facingMode: { exact: 'environment' } } }
        ];

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (primaryError) {
            console.error("Errore constraint principale:", primaryError);
            
            for (const fallback of fallbackConstraints) {
                try {
                    return await navigator.mediaDevices.getUserMedia(fallback);
                } catch (fallbackError) {
                    console.error("Errore fallback:", fallbackError);
                }
            }
            
            this.updateStatus("Impossibile accedere alla fotocamera");
            return null;
        }
    }

    /**
     * Tenta di riprodurre il video
     */
    async playVideo() {
        try {
            await this.videoElement.play();
            this.videoElement.style.display = 'block';
            this.updateStatus("Fotocamera attiva");
            return true;
        } catch (error) {
            console.error("Errore riproduzione video:", error);
            this.updateStatus("Tocca lo schermo per attivare la fotocamera");
            return false;
        }
    }

    /**
     * Posiziona un oggetto virtuale
     */
    updateObjectPosition(distance, bearing, deviceHeading = 0) {
        if (!this.arObject || !this.arActive) return null;

        const maxDistance = 50;
        const clampedDistance = Math.min(distance, maxDistance);
        const scaleFactor = Math.max(0.1, 1 - (clampedDistance / maxDistance) * 0.9);
        
        const bearingRad = (bearing * Math.PI) / 180;
        const targetX = Math.sin(bearingRad) * clampedDistance / 10;
        const targetZ = Math.cos(bearingRad) * clampedDistance / 10;

        // Gestione ancoraggio
        if (distance < 5 && !this.isAnchored) {
            this.isAnchored = true;
            this.anchorPosition = { x: targetX, z: targetZ };
            this.updateStatus("Oggetto ancorato");
        }

        if (this.isAnchored) {
            this.arObject.position = new BABYLON.Vector3(
                this.anchorPosition.x,
                0,
                this.anchorPosition.z
            );
        } else {
            this.arObject.position = new BABYLON.Vector3(targetX, 0, targetZ);
        }

        this.arObject.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
        this.arObject.rotation.y += 0.001;

        return this.arObject;
    }

    // ... (altri metodi rimangono invariati)
}

window.ARManager = ARManager;
