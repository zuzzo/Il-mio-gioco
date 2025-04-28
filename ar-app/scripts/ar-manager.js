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
        this.savedObjectOrientation = 0; // Angolo in gradi
        this.videoElement = null;
        this.arActive = false;
        
        // Parametri per l'ancoraggio
        this.isAnchored = false;
        this.anchorPosition = null;
        this.smoothingFactor = 0.1; // Fattore di smorzamento (più basso = più fluido)
        this.anchorTimeout = null;
        this.anchorDistance = 5; // Distanza in metri entro cui tentare l'ancoraggio
        this.maxAnchorDistance = 15; // Distanza oltre la quale rimuovere l'ancoraggio
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
            
            // Inizializza il sistema di debug della fotocamera
            this.initCameraDebug();
            
            // Avvia il flusso video dalla fotocamera
            const cameraStarted = await this.startVideoStream();
            
            if (!cameraStarted) {
                this.updateStatus("Impossibile avviare la fotocamera. Verifica i permessi.");
                console.warn("Fotocamera non avviata correttamente");
            }
            
            // Controlla se WebXR è supportato
            this.isARSupported = await this.checkARSupport();
            
            return this.isARSupported;
        } catch (error) {
            console.error("Errore nell'inizializzazione dell'AR Manager:", error);
            this.updateStatus("Errore inizializzazione: " + error.message);
            return false;
        }
    }
    
    /**
     * Avvia il flusso video dalla fotocamera con debug esteso
     */
    async startVideoStream() {
        try {
            // DEBUG: Verifica se l'elemento video esiste
            const videoExists = !!this.videoElement;
            console.log("[DEBUG Camera] Elemento video esiste:", videoExists);
            if (this.videoElement) {
                console.log("[DEBUG Camera] Video ID:", this.videoElement.id);
                console.log("[DEBUG Camera] Video dimensioni:", this.videoElement.width, "x", this.videoElement.height);
                console.log("[DEBUG Camera] Video è in DOM:", document.body.contains(this.videoElement));
                
                // Controlla i CSS applicati
                const computedStyle = window.getComputedStyle(this.videoElement);
                console.log("[DEBUG Camera] Video display:", computedStyle.display);
                console.log("[DEBUG Camera] Video visibility:", computedStyle.visibility);
                console.log("[DEBUG Camera] Video z-index:", computedStyle.zIndex);
                console.log("[DEBUG Camera] Video position:", computedStyle.position);
            }
            
            if (!this.videoElement) {
                console.error("[DEBUG Camera] Elemento video non trovato");
                this.updateStatus("Errore: elemento video non trovato nel DOM");
                
                // Crea l'elemento video se manca
                const newVideo = document.createElement('video');
                newVideo.id = 'camera-feed';
                newVideo.setAttribute('autoplay', '');
                newVideo.setAttribute('playsinline', '');
                newVideo.setAttribute('muted', '');
                newVideo.style.position = 'absolute';
                newVideo.style.width = '100%';
                newVideo.style.height = '100%';
                newVideo.style.objectFit = 'cover';
                newVideo.style.zIndex = '1';
                
                const arView = document.querySelector('.ar-view');
                if (arView) {
                    console.log("[DEBUG Camera] Creazione nuovo elemento video in .ar-view");
                    arView.prepend(newVideo);
                    this.videoElement = newVideo;
                } else {
                    console.error("[DEBUG Camera] Impossibile trovare il contenitore .ar-view");
                    return false;
                }
            }
            
            // DEBUG: Verifica supporto MediaDevices API
            const hasMediaDevices = !!navigator.mediaDevices;
            console.log("[DEBUG Camera] MediaDevices supportati:", hasMediaDevices);
            if (hasMediaDevices) {
                console.log("[DEBUG Camera] getUserMedia supportato:", !!navigator.mediaDevices.getUserMedia);
                
                // Lista i dispositivi disponibili
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices.filter(device => device.kind === 'videoinput');
                    console.log("[DEBUG Camera] Dispositivi video disponibili:", videoDevices.length);
                    videoDevices.forEach((device, index) => {
                        console.log(`[DEBUG Camera] Camera ${index}:`, device.label || `Camera ${index}`);
                    });
                } catch (err) {
                    console.error("[DEBUG Camera] Errore nell'enumerazione dispositivi:", err);
                }
            }
            
            // Supporta vecchi browser
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.log("[DEBUG Camera] MediaDevices non supportato, provo fallback");
                navigator.mediaDevices = {};
                navigator.mediaDevices.getUserMedia = function(constraints) {
                    const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                    if (!getUserMedia) {
                        console.error("[DEBUG Camera] getUserMedia non è supportato in questo browser");
                        return Promise.reject(new Error('getUserMedia non supportato'));
                    }
                    return new Promise(function(resolve, reject) {
                        getUserMedia.call(navigator, constraints, resolve, reject);
                    });
                };
            }
            
            const constraints = {
                video: {
                    facingMode: 'environment', // Usa la fotocamera posteriore
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            // Prove diverse modalità se quella principale fallisce
            const fallbackConstraints = [
                { video: { facingMode: 'environment' } },                        // Solo fotocamera posteriore senza specifiche
                { video: { deviceId: { exact: 'environment' } } },              // Prova exact deviceId
                { video: true },                                                // Qualsiasi fotocamera
                { video: { facingMode: { exact: 'environment' } } }             // Forza esattamente la fotocamera posteriore
            ];
            
            // Aggiungi un messaggio di stato
            this.updateStatus("Richiesta accesso alla fotocamera...");
            
            // Prova prima con i constraint principali
            let stream;
            try {
                console.log("[DEBUG Camera] Tentativo principale con constraint:", JSON.stringify(constraints));
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log("[DEBUG Camera] Stream ottenuto con successo dal constraint principale");
            } catch (primaryError) {
                console.error("[DEBUG Camera] Errore constraint principale:", primaryError.name, primaryError.message);
                
                // Prova con i fallback
                for (let i = 0; i < fallbackConstraints.length; i++) {
                    try {
                        console.log(`[DEBUG Camera] Tentativo fallback ${i+1} con:`, JSON.stringify(fallbackConstraints[i]));
                        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints[i]);
                        console.log(`[DEBUG Camera] Stream ottenuto con fallback ${i+1}`);
                        break;
                    } catch (fallbackError) {
                        console.error(`[DEBUG Camera] Errore fallback ${i+1}:`, fallbackError.name, fallbackError.message);
                    }
                }
            }
            
            if (!stream) {
                console.error("[DEBUG Camera] Tutti i tentativi di accesso alla fotocamera falliti");
                this.updateStatus("Impossibile accedere alla fotocamera dopo multipli tentativi");
                return false;
            }
            
            // DEBUG: Controlla le tracce video ottenute
            console.log("[DEBUG Camera] Stream ottenuto, tracce video:", stream.getVideoTracks().length);
            stream.getVideoTracks().forEach((track, index) => {
                console.log(`[DEBUG Camera] Traccia ${index} attiva:`, track.enabled);
                console.log(`[DEBUG Camera] Traccia ${index} settings:`, JSON.stringify(track.getSettings()));
                console.log(`[DEBUG Camera] Traccia ${index} constraints:`, JSON.stringify(track.getConstraints()));
            });
            
            // Assegna lo stream al video
            this.videoElement.srcObject = stream;
            
            // DEBUG: Verifica le proprietà di srcObject
            console.log("[DEBUG Camera] srcObject impostato:", !!this.videoElement.srcObject);
            console.log("[DEBUG Camera] Video paused:", this.videoElement.paused);
            console.log("[DEBUG Camera] Video muted:", this.videoElement.muted);
            
            // Forza alcuni attributi per compatibilità mobile
            this.videoElement.setAttribute('playsinline', 'playsinline');
            this.videoElement.setAttribute('webkit-playsinline', 'webkit-playsinline');
            this.videoElement.muted = true;
            
            // Aggiungi gestori degli eventi
            this.videoElement.onerror = (e) => {
                console.error("[DEBUG Camera] Errore elemento video:", e);
                this.updateStatus("Errore nell'inizializzazione del video");
            };
            
            // DEBUG: Aggiungi handlers per tutti gli eventi video
            const videoEvents = ['loadedmetadata', 'playing', 'play', 'pause', 'error', 'stalled', 'suspend', 'waiting'];
            videoEvents.forEach(eventName => {
                this.videoElement.addEventListener(eventName, () => {
                    console.log(`[DEBUG Camera] Evento video: ${eventName}`);
                    if (eventName === 'error') {
                        console.error("[DEBUG Camera] Errore video:", this.videoElement.error);
                    }
                });
            });
            
            // Attendi che il video sia pronto
            return new Promise((resolve) => {
                // Se il video è già caricato
                if (this.videoElement.readyState >= 2) {
                    console.log("[DEBUG Camera] Video già caricato (readyState:", this.videoElement.readyState + ")");
                    this.playVideo().then(success => resolve(success));
                    return;
                }
                
                // Altrimenti attendi loadedmetadata
                this.videoElement.onloadedmetadata = () => {
                    console.log("[DEBUG Camera] Video metadata caricati, dimensioni:", 
                        this.videoElement.videoWidth, "x", this.videoElement.videoHeight);
                    this.updateStatus("Fotocamera pronta, avvio riproduzione...");
                    this.playVideo().then(success => resolve(success));
                };
                
                // Timeout per evitare blocchi
                setTimeout(() => {
                    if (this.videoElement.paused) {
                        console.warn("[DEBUG Camera] Timeout nell'attesa del caricamento del video");
                        this.updateStatus("Timeout fotocamera - tentativo di riproduzione forzata");
                        this.playVideo().then(success => resolve(success));
                    }
                }, 3000);
            });
        } catch (error) {
            console.error("[DEBUG Camera] Errore generale nell'accesso alla fotocamera:", error.name, error.message);
            this.updateStatus("Errore fotocamera: " + error.message);
            return false;
        }
    }
    
    /**
     * Metodo separato per tentare la riproduzione del video
     */
    async playVideo() {
        try {
            console.log("[DEBUG Camera] Tentativo di riproduzione video");
            await this.videoElement.play();
            console.log("[DEBUG Camera] Video avviato con successo");
            
            // Dopo la riproduzione, verifica di nuovo lo stato
            console.log("[DEBUG Camera] Stato post-play - paused:", this.videoElement.paused);
            console.log("[DEBUG Camera] Stato post-play - currentTime:", this.videoElement.currentTime);
            console.log("[DEBUG Camera] Stato post-play - videoWidth:", this.videoElement.videoWidth);
            
            // Forza la visibilità
            this.videoElement.style.display = 'block';
            
            // Forza un reflow del browser
            void this.videoElement.offsetHeight;
            
            this.updateStatus("Fotocamera attiva");
            return true;
        } catch (playError) {
            console.error("[DEBUG Camera] Errore riproduzione video:", playError.name, playError.message);
            
            // Se l'autoplay fallisce, mostro un messaggio che richiede interazione utente
            this.updateStatus("Autorizza l'accesso alla fotocamera e tocca lo schermo");
            
            // Aggiungi un listener per il tocco dell'utente 
            document.body.addEventListener('click', async () => {
                try {
                    console.log("[DEBUG Camera] Tentativo riproduzione dopo interazione utente");
                    await this.videoElement.play();
                    console.log("[DEBUG Camera] Video avviato dopo interazione utente");
                    this.updateStatus("Fotocamera attiva");
                } catch (e) {
                    console.error("[DEBUG Camera] Errore anche dopo interazione:", e);
                    this.updateStatus("Impossibile avviare la fotocamera");
                }
            }, {once: true});
            
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
            const isCameraSupported = !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
            
            if (!isCameraSupported) {
                this.updateStatus("Il tuo dispositivo non supporta l'accesso alla fotocamera");
                return false;
            }
            
            return true;
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
            this.updateStatus("Errore: video non trovato");
            return false;
        }
        
        try {
            // Assicurati che il video sia in esecuzione
            if (this.videoElement.paused) {
                console.log("Video in pausa, riavvio...");
                try {
                    await this.videoElement.play();
                    console.log("Video riavviato con successo");
                } catch (e) {
                    console.error("Impossibile riavviare il video:", e);
                    
                    // Riprova a inizializzare lo stream
                    await this.startVideoStream();
                }
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
            
            // Verifica che il video sia effettivamente visibile
            const videoComputed = window.getComputedStyle(this.videoElement);
            console.log("Video visibility:", videoComputed.display, videoComputed.visibility);
            
            console.log("Esperienza AR avviata in modalità finestra");
            this.updateStatus("AR avviata");
            return true;
        } catch (error) {
            console.error("Errore nell'avvio dell'esperienza AR:", error);
            this.updateStatus("Errore AR: " + error.message);
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
            console.warn("AR non attiva, impossibile posizionare oggetto");
            return null;
        }
        
        // Reset dello stato di ancoraggio quando si posiziona un nuovo oggetto
        this.isAnchored = false;
        this.anchorPosition = null;
        
        try {
            // Se esiste già un oggetto, rimuovilo
            if (this.arObject) {
                this.arObject.dispose();
                this.arObject = null;
            }
            
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
            
            this.updateStatus("Caricamento modello 3D...");
            
            // Carica il modello 3D
            try {
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
                
                this.updateStatus("Modello 3D caricato");
            } catch (modelError) {
                console.error("Errore nel caricamento del modello:", modelError);
                this.updateStatus("Errore modello: " + modelError.message);
                
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
            
            // Rimuovi il placeholder
            placeholder.dispose();
            
            console.log(`Oggetto posizionato con orientamento: ${this.savedObjectOrientation.toFixed(1)}°`);
            
            // Mostra la freccia direzionale
            const directionArrow = document.getElementById('directionArrow');
            if (directionArrow) {
                directionArrow.classList.remove('hidden');
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
        } catch (error) {
            console.error("Errore nel posizionamento dell'oggetto virtuale:", error);
            this.updateStatus("Errore: " + error.message);
            return null;
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
                this.updateStatus("Oggetto ancorato - posizione stabile");
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
        this.updateStatus("AR fermata");
    }
    
    /**
     * Inizializza il sistema di debug della fotocamera
     */
    initCameraDebug() {
        // Elementi UI
        const debugPanel = document.getElementById('cameraDebugPanel');
        const toggleBtn = document.getElementById('toggleCameraDebugBtn');
        const cameraStatusEl = document.getElementById('cameraStatus');
        const videoElementStatusEl = document.getElementById('videoElementStatus');
        const streamInfoEl = document.getElementById('streamInfo');
        const cameraErrorsEl = document.getElementById('cameraErrors');
        const videoDimensionsEl = document.getElementById('videoDimensions');
        const videoPlayStateEl = document.getElementById('videoPlayState');
        
        // Pulsanti azioni
        const forceCameraBtn = document.getElementById('forceCameraBtn');
        const refreshVideoBtn = document.getElementById('refreshVideoBtn');
        const showHiddenDataBtn = document.getElementById('showHiddenDataBtn');
        
        // Se gli elementi non esistono, esci
        if (!debugPanel || !toggleBtn) return;
        
        // Mostra/nascondi pannello di debug
        toggleBtn.addEventListener('click', () => {
            debugPanel.classList.toggle('hidden');
            this.updateCameraDebugInfo();
        });
        
        // Aggiorna informazioni ad intervalli regolari
        setInterval(() => {
            if (!debugPanel.classList.contains('hidden')) {
                this.updateCameraDebugInfo();
            }
        }, 1000);
        
        // Funzioni per i pulsanti di debug
        if (forceCameraBtn) {
            forceCameraBtn.addEventListener('click', async () => {
                cameraStatusEl.textContent = "Tentativo forzato di accesso alla fotocamera...";
                try {
                    const constraints = { 
                        video: { 
                            facingMode: 'environment',
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                        } 
                    };
                    
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    if (this.videoElement) {
                        this.videoElement.srcObject = stream;
                        this.videoElement.play()
                            .then(() => {
                                cameraStatusEl.textContent = "Camera avviata manualmente con successo";
                                // Forza la visibilità
                                this.videoElement.style.display = 'block';
                                this.videoElement.style.opacity = '1';
                                this.videoElement.classList.add('video-debug');
                            })
                            .catch(err => {
                                cameraStatusEl.textContent = "Errore avvio video: " + err.message;
                            });
                    } else {
                        cameraStatusEl.textContent = "Elemento video non trovato!";
                    }
                } catch (err) {
                    cameraStatusEl.textContent = "Errore accesso camera: " + err.message;
                }
            });
        }
        
        if (refreshVideoBtn) {
            refreshVideoBtn.addEventListener('click', () => {
                if (this.videoElement && this.videoElement.srcObject) {
                    cameraStatusEl.textContent = "Video refreshed";
                    
                    // Forza la visibilità
                    this.videoElement.style.display = 'block';
                    this.videoElement.style.opacity = '1';
                    this.videoElement.style.visibility = 'visible';
                    this.videoElement.style.zIndex = '10';
                    
                    // Rimuovi e riattacca l'elemento per forzare un refresh
                    const parent = this.videoElement.parentNode;
                    const next = this.videoElement.nextSibling;
                    parent.removeChild(this.videoElement);
                    parent.insertBefore(this.videoElement, next);
                    
                    // Highlight per debug
                    this.videoElement.classList.toggle('video-debug');
                } else {
                    cameraStatusEl.textContent = "Nessun video da refreshare";
                }
            });
        }
        
        if (showHiddenDataBtn) {
            showHiddenDataBtn.addEventListener('click', () => {
                document.body.classList.toggle('show-borders');
                
                // Trova tutti gli elementi video nascosti
                const videoElements = document.querySelectorAll('video');
                let hiddenVideos = 0;
                
                videoElements.forEach(video => {
                    const style = window.getComputedStyle(video);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                        video.style.display = 'block';
                        video.style.visibility = 'visible';
                        video.style.opacity = '1';
                        video.style.border = '3px solid red';
                        hiddenVideos++;
                    }
                });
                
                cameraStatusEl.textContent = `Trovati ${videoElements.length} elementi video, ${hiddenVideos} erano nascosti`;
            });
        }
    }
    
    /**
     * Metodo per aggiornare le informazioni di debug della fotocamera
     */
    updateCameraDebugInfo() {
        const videoElementStatusEl = document.getElementById('videoElementStatus');
        const streamInfoEl = document.getElementById('streamInfo');
        const cameraErrorsEl = document.getElementById('cameraErrors');
        const videoDimensionsEl = document.getElementById('videoDimensions');
        const videoPlayStateEl = document.getElementById('videoPlayState');
        
        if (!videoElementStatusEl) return;
        
        // Informazioni sull'elemento video
        if (this.videoElement) {
            const computedStyle = window.getComputedStyle(this.videoElement);
            videoElementStatusEl.textContent = `Trovato (${this.videoElement.id})`;
            videoDimensionsEl.textContent = `${this.videoElement.videoWidth || 0}x${this.videoElement.videoHeight || 0} - CSS: ${computedStyle.width}x${computedStyle.height}`;
            videoPlayStateEl.textContent = `Paused: ${this.videoElement.paused}, Muted: ${this.videoElement.muted}, ReadyState: ${this.videoElement.readyState}, Display: ${computedStyle.display}`;
            
            // Informazioni sullo stream
            if (this.videoElement.srcObject) {
                const videoTracks = this.videoElement.srcObject.getVideoTracks();
                streamInfoEl.textContent = `${videoTracks.length} tracce. Attiva: ${videoTracks.length > 0 ? videoTracks[0].enabled : 'No'}`;
                
                if (videoTracks.length > 0) {
                    try {
                        const settings = videoTracks[0].getSettings();
                        streamInfoEl.textContent += ` - ${settings.width}x${settings.height} ${settings.facingMode || ''}`;
                    } catch (e) {
                        streamInfoEl.textContent += ` (errore settings: ${e.message})`;
                    }
                }
            } else {
                streamInfoEl.textContent = "Nessuno stream attivo";
            }
            
            // Errori
            if (this.videoElement.error) {
                cameraErrorsEl.textContent = `ERROR: ${this.videoElement.error.code} - ${this.videoElement.error.message}`;
            } else {
                cameraErrorsEl.textContent = "Nessun errore";
            }
        } else {
            videoElementStatusEl.textContent = "Non trovato";
            streamInfoEl.textContent = "N/A";
            cameraErrorsEl.textContent = "N/A";
            videoDimensionsEl.textContent = "N/A";
            videoPlayStateEl.textContent = "N/A";
        }
    }
    
    /**
     * Aggiorna lo stato visualizzato
     */
    updateStatus(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log("AR Status:", message);
    }
}

// Esporta la classe
window.ARManager = ARManager;