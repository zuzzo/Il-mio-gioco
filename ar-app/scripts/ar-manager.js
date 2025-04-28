/**
 * Gestisce la realtà aumentata con Babylon.js
 */
class ARManager {
    constructor() {
        // Elementi DOM
        this.canvas = null;
        this.videoElement = null;
        
        // Babylon.js
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.arObject = null;
        
        // Stato AR
        this.arActive = false;
        this.cameraReady = false;
        
        // Dati salvati
        this.savedData = {
            position: null,
            orientation: null
        };
        
        // Aggiungi elemento per i toast
        this.toastElement = document.createElement('div');
        this.toastElement.id = 'ar-debug-toast';
        this.toastElement.style = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:white;padding:10px 20px;border-radius:5px;display:none;z-index:1000;';
        document.body.appendChild(this.toastElement);
        
        // Variabili per la gestione della posizione degli oggetti
        this.worldOrigin = new BABYLON.Vector3(0, 0, 0);
        this.objectPlaced = false;
        this.objectScale = 0.5; // Scala predefinita per gli oggetti 3D
        
        // Riferimento alla freccia direzionale
        this.directionArrow = null;
        
        // Debug
        this.debugMode = false;
        this.debugPanel = null;
    }

    /**
     * Inizializza il gestore AR
     * @param {string} canvasId - ID dell'elemento canvas
     * @param {string} videoId - ID dell'elemento video
     * @returns {Promise<boolean>} - True se l'inizializzazione è riuscita
     */
    async init(canvasId, videoId) {
        try {
            // Ottieni gli elementi DOM
            this.canvas = document.getElementById(canvasId);
            this.videoElement = document.getElementById(videoId);
            
            if (!this.canvas || !this.videoElement) {
                console.error("Elementi canvas o video non trovati");
                return false;
            }
            
            // Inizializza Babylon.js
            this.engine = new BABYLON.Engine(this.canvas, true);
            this.scene = new BABYLON.Scene(this.engine);
            
            // Crea una camera AR
            this.camera = new BABYLON.FreeCamera("arCamera", new BABYLON.Vector3(0, 0, 0), this.scene);
            this.camera.minZ = 0.1; // Imposta il piano di clipping vicino
            this.camera.maxZ = 1000; // Imposta il piano di clipping lontano
            this.camera.fov = 0.8; // Campo visivo più ampio per AR
            
            // Imposta la camera come camera attiva
            this.scene.activeCamera = this.camera;
            
            // Aggiungi luce ambientale
            const hemisphericLight = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
            hemisphericLight.intensity = 1.0;
            
            // Configura il loop di rendering
            this.engine.runRenderLoop(() => {
                if (this.scene) {
                    this.scene.render();
                }
            });
            
            // Gestisci il ridimensionamento della finestra
            window.addEventListener("resize", () => {
                this.engine.resize();
            });
            
            // Inizializza il debug della camera se necessario
            this.initCameraDebug();
            
            // Ottieni la freccia direzionale
            this.directionArrow = document.getElementById('directionArrow');
            
            return true;
        } catch (error) {
            console.error("Errore nell'inizializzazione AR:", error);
            return false;
        }
    }
    
    /**
     * Avvia l'esperienza AR
     * @returns {Promise<boolean>} - True se l'avvio è riuscito
     */
    async startARExperience() {
        try {
            // Verifica se la camera è già attiva
            if (this.arActive) {
                return true;
            }
            
            // Avvia lo stream video dalla fotocamera
            await this.startCameraStream();
            
            // Imposta lo sfondo della scena come trasparente
            this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
            
            // Attiva l'AR
            this.arActive = true;
            
            return true;
        } catch (error) {
            console.error("Errore nell'avvio dell'esperienza AR:", error);
            return false;
        }
    }
    
    /**
     * Ferma l'esperienza AR
     */
    stopARExperience() {
        // Ferma lo stream video
        this.stopCameraStream();
        
        // Rimuovi l'oggetto AR se presente
        if (this.arObject) {
            this.arObject.dispose();
            this.arObject = null;
        }
        
        // Disattiva l'AR
        this.arActive = false;
        
        // Nascondi la freccia direzionale
        if (this.directionArrow) {
            this.directionArrow.classList.add('hidden');
        }
    }
    
    /**
     * Avvia lo stream video dalla fotocamera
     * @returns {Promise<boolean>} - True se l'avvio è riuscito
     */
    async startCameraStream() {
        try {
            // Verifica se lo stream è già attivo
            if (this.videoElement.srcObject) {
                return true;
            }
            
            // Ottieni lo stream dalla fotocamera posteriore
            const constraints = {
                video: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Assegna lo stream al video element
            this.videoElement.srcObject = stream;
            
            // Attendi che il video sia pronto
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play()
                        .then(() => {
                            console.log("Video avviato con successo");
                            this.cameraReady = true;
                            resolve();
                        })
                        .catch(error => {
                            console.error("Errore nell'avvio del video:", error);
                            resolve();
                        });
                };
            });
            
            // Aggiorna lo stato del debug
            this.updateCameraDebugStatus();
            
            return true;
        } catch (error) {
            console.error("Errore nell'avvio dello stream video:", error);
            this.updateCameraDebugStatus(error);
            return false;
        }
    }
    
    /**
     * Ferma lo stream video
     */
    stopCameraStream() {
        if (this.videoElement && this.videoElement.srcObject) {
            const tracks = this.videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
            this.cameraReady = false;
        }
    }
    
    /**
     * Posiziona un oggetto virtuale nella scena
     * @param {string} modelPath - Percorso del modello 3D
     * @param {number} objectOrientation - Orientamento dell'oggetto in gradi
     * @returns {Promise<boolean>} - True se il posizionamento è riuscito
     */
    async placeVirtualObject(modelPath, objectOrientation = 0) {
        try {
            // Rimuovi l'oggetto precedente se presente
            if (this.arObject) {
                this.arObject.dispose();
                this.arObject = null;
            }
            
            // Crea un contenitore per l'oggetto
            this.arObject = new BABYLON.TransformNode("arObject", this.scene);
            
            // Carica il modello 3D
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", modelPath, this.scene);
            
            // Aggiungi le mesh al contenitore
            const meshes = result.meshes;
            if (meshes.length > 0) {
                // Imposta la mesh principale come figlio del contenitore
                meshes[0].parent = this.arObject;
                
                // Applica la scala
                this.arObject.scaling = new BABYLON.Vector3(this.objectScale, this.objectScale, this.objectScale);
                
                // Applica la rotazione iniziale (converti da gradi a radianti)
                const rotationRadians = (objectOrientation * Math.PI) / 180;
                this.arObject.rotation = new BABYLON.Vector3(0, rotationRadians, 0);
                
                // Posiziona l'oggetto davanti alla camera
                // Nota: questo è solo il posizionamento iniziale, verrà aggiornato da updateObjectPosition
                this.arObject.position = new BABYLON.Vector3(0, -0.5, 5);
                
                // Imposta l'oggetto come posizionato
                this.objectPlaced = true;
                
                console.log("Oggetto posizionato con successo");
                return true;
            } else {
                console.error("Nessuna mesh trovata nel modello");
                return false;
            }
        } catch (error) {
            console.error("Errore nel posizionamento dell'oggetto:", error);
            return false;
        }
    }
    
    /**
     * Aggiorna la posizione dell'oggetto in base alla posizione e all'orientamento dell'utente
     * @param {number} distance - Distanza dall'oggetto in metri
     * @param {number} bearing - Direzione verso l'oggetto in gradi
     * @param {number} deviceHeading - Orientamento attuale del dispositivo in gradi
     */
    updateObjectPosition(distance, bearing, deviceHeading) {
        if (!this.arObject || !this.objectPlaced) {
            return;
        }
        
        try {
            // Calcola la differenza tra la direzione dell'oggetto e l'orientamento del dispositivo
            const headingDifference = (bearing - deviceHeading + 360) % 360;
            
            // Converti la differenza di orientamento in radianti
            const headingRadians = (headingDifference * Math.PI) / 180;
            
            // Calcola la posizione dell'oggetto in coordinate cartesiane
            // Nota: la distanza è scalata per adattarsi meglio alla scena AR
            const distanceScale = 0.5; // Fattore di scala per la distanza
            const scaledDistance = Math.min(distance * distanceScale, 20); // Limita la distanza massima
            
            // Calcola le coordinate X e Z basate sulla distanza e direzione
            const x = Math.sin(headingRadians) * scaledDistance;
            const z = Math.cos(headingRadians) * scaledDistance;
            
            // Aggiorna la posizione dell'oggetto
            // Nota: l'oggetto è posizionato rispetto alla camera, non alla posizione GPS
            // Questo è il problema principale che stiamo risolvendo
            const targetPosition = new BABYLON.Vector3(x, -0.5, z);
            
            // Aggiorna la posizione dell'oggetto con un'animazione fluida
            BABYLON.Animation.CreateAndStartAnimation(
                "objectPositionAnimation",
                this.arObject,
                "position",
                30, // frame per secondo
                20, // numero di frame
                this.arObject.position,
                targetPosition,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            // Aggiorna la rotazione dell'oggetto per farlo guardare verso l'utente
            const lookAtPosition = new BABYLON.Vector3(0, this.arObject.position.y, 0);
            this.arObject.lookAt(lookAtPosition, 0, Math.PI, 0);
            
            // Aggiorna la freccia direzionale
            this.updateDirectionArrow(headingDifference);
            
            // Debug
            if (this.debugMode) {
                console.log(`Aggiornamento posizione oggetto: distanza=${distance.toFixed(1)}m, bearing=${bearing.toFixed(1)}°, heading=${deviceHeading.toFixed(1)}°, diff=${headingDifference.toFixed(1)}°`);
            }
        } catch (error) {
            console.error("Errore nell'aggiornamento della posizione dell'oggetto:", error);
        }
    }
    
    /**
     * Aggiorna la freccia direzionale
     * @param {number} headingDifference - Differenza tra la direzione dell'oggetto e l'orientamento del dispositivo
     */
    updateDirectionArrow(headingDifference) {
        if (!this.directionArrow) {
            return;
        }
        
        // Mostra la freccia solo se l'oggetto non è visibile nella vista corrente
        const isObjectInView = headingDifference > 315 || headingDifference < 45;
        
        if (!isObjectInView) {
            // Mostra la freccia
            this.directionArrow.classList.remove('hidden');
            
            // Calcola la rotazione della freccia
            let arrowRotation = 0;
            
            if (headingDifference >= 45 && headingDifference < 135) {
                // Oggetto a destra
                arrowRotation = 90;
            } else if (headingDifference >= 135 && headingDifference < 225) {
                // Oggetto dietro
                arrowRotation = 180;
            } else if (headingDifference >= 225 && headingDifference < 315) {
                // Oggetto a sinistra
                arrowRotation = 270;
            }
            
            // Applica la rotazione
            this.directionArrow.style.transform = `translate(-50%, -50%) rotate(${arrowRotation}deg)`;
        } else {
            // Nascondi la freccia se l'oggetto è nel campo visivo
            this.directionArrow.classList.add('hidden');
        }
    }
    
    /**
     * Inizializza il debug della camera
     */
    initCameraDebug() {
        // Ottieni il pannello di debug
        this.debugPanel = document.getElementById('cameraDebugPanel');
        if (!this.debugPanel) {
            return;
        }
        
        // Ottieni i pulsanti di debug
        const toggleCameraDebugBtn = document.getElementById('toggleCameraDebugBtn');
        const forceCameraBtn = document.getElementById('forceCameraBtn');
        const refreshVideoBtn = document.getElementById('refreshVideoBtn');
        
        // Configura i listener per i pulsanti
        if (toggleCameraDebugBtn) {
            toggleCameraDebugBtn.addEventListener('click', () => {
                this.debugPanel.classList.toggle('hidden');
                this.updateCameraDebugStatus();
            });
        }
        
        if (forceCameraBtn) {
            forceCameraBtn.addEventListener('click', async () => {
                await this.forceRestartCamera();
            });
        }
        
        if (refreshVideoBtn) {
            refreshVideoBtn.addEventListener('click', () => {
                this.refreshVideoElement();
            });
        }
        
        // Aggiungi pulsante Copia Log
        const copyLogBtn = document.createElement('button');
        copyLogBtn.textContent = 'Copia Log';
        copyLogBtn.className = 'debug-btn';
        copyLogBtn.addEventListener('click', () => this.copyDebugLogs());
        this.debugPanel.appendChild(copyLogBtn);
    }
    
    /**
     * Forza il riavvio della camera
     */
    async forceRestartCamera() {
        try {
            // Ferma lo stream corrente
            this.stopCameraStream();
            
            // Attendi un momento
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Riavvia lo stream
            const success = await this.startCameraStream();
            
            if (success) {
                this.showToast('Camera riavviata con successo');
            } else {
                this.showToast('Errore nel riavvio della camera');
            }
        } catch (error) {
            console.error("Errore nel riavvio forzato della camera:", error);
            this.showToast('Errore nel riavvio della camera');
        }
    }
    
    /**
     * Aggiorna lo stato del debug della camera
     */
    updateCameraDebugStatus(error = null) {
        if (!this.debugPanel) {
            return;
        }
        
        // Aggiorna lo stato della camera
        const cameraStatus = document.getElementById('cameraStatus');
        if (cameraStatus) {
            if (error) {
                cameraStatus.textContent = `Errore: ${error.message || 'Sconosciuto'}`;
                cameraStatus.style.color = 'red';
            } else if (this.cameraReady) {
                cameraStatus.textContent = 'Camera attiva';
                cameraStatus.style.color = 'green';
            } else {
                cameraStatus.textContent = 'Camera non attiva';
                cameraStatus.style.color = 'orange';
            }
        }
        
        // Aggiorna lo stato dell'elemento video
        const videoElementStatus = document.getElementById('videoElementStatus');
        if (videoElementStatus && this.videoElement) {
            const readyState = this.videoElement.readyState;
            let stateText = 'Sconosciuto';
            
            switch (readyState) {
                case 0: stateText = 'HAVE_NOTHING'; break;
                case 1: stateText = 'HAVE_METADATA'; break;
                case 2: stateText = 'HAVE_CURRENT_DATA'; break;
                case 3: stateText = 'HAVE_FUTURE_DATA'; break;
                case 4: stateText = 'HAVE_ENOUGH_DATA'; break;
            }
            
            videoElementStatus.textContent = stateText;
        }
        
        // Aggiorna le informazioni sullo stream
        const streamInfo = document.getElementById('streamInfo');
        if (streamInfo && this.videoElement && this.videoElement.srcObject) {
            const videoTracks = this.videoElement.srcObject.getVideoTracks();
            if (videoTracks.length > 0) {
                const track = videoTracks[0];
                const settings = track.getSettings();
                streamInfo.textContent = `${settings.width}x${settings.height}, ${track.label}`;
            } else {
                streamInfo.textContent = 'Nessuna traccia video';
            }
        } else if (streamInfo) {
            streamInfo.textContent = 'Nessuno stream attivo';
        }
        
        // Aggiorna le dimensioni del video
        const videoDimensions = document.getElementById('videoDimensions');
        if (videoDimensions && this.videoElement) {
            videoDimensions.textContent = `${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`;
        }
        
        // Aggiorna lo stato di riproduzione
        const videoPlayState = document.getElementById('videoPlayState');
        if (videoPlayState && this.videoElement) {
            videoPlayState.textContent = this.videoElement.paused ? 'In pausa' : 'In riproduzione';
        }
    }
    
    /**
     * Aggiorna l'elemento video
     */
    refreshVideoElement() {
        if (!this.videoElement || !this.videoElement.srcObject) {
            this.showToast('Nessuno stream video attivo');
            return;
        }
        
        // Forza un aggiornamento dell'elemento video
        this.videoElement.style.display = 'none';
        setTimeout(() => {
            this.videoElement.style.display = 'block';
            this.showToast('Video aggiornato');
        }, 100);
    }
    
    /**
     * Raccoglie i log di debug
     */
    collectDebugLogs() {
        return {
            timestamp: new Date().toISOString(),
            cameraStatus: this.videoElement ? this.videoElement.readyState : 'N/A',
            arStatus: this.arActive ? 'Attivo' : 'Inattivo',
            objects: this.arObject ? 'Presenti' : 'Assenti',
            position: this.savedData.position || 'N/A',
            orientation: this.savedData.orientation || 'N/A'
        };
    }

    /**
     * Copia i log di debug negli appunti
     */
    async copyDebugLogs() {
        try {
            const logs = this.collectDebugLogs();
            const logText = JSON.stringify(logs, null, 2);
            await navigator.clipboard.writeText(logText);
            this.showToast('Log copiato negli appunti!');
        } catch (error) {
            console.error('Errore copia log:', error);
            this.showToast('Errore durante la copia');
        }
    }

    /**
     * Mostra un toast con un messaggio
     */
    showToast(message) {
        this.toastElement.textContent = message;
        this.toastElement.style.display = 'block';
        setTimeout(() => {
            this.toastElement.style.display = 'none';
        }, 2000);
    }
}

window.ARManager = ARManager;
