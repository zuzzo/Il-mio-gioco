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
        this.startTime = null;
        
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
        this.startTime = Date.now();
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
            
            // Verifica subito il supporto per AR
            this.isARSupported = await this.checkARSupport();
            if (!this.isARSupported) {
                this.updateStatus("AR non supportata su questo dispositivo");
            }
            
            // Avvia il flusso video dalla fotocamera (rimuoviamo da qui, lo avvieremo con startARExperience)
            // const cameraStarted = await this.startVideoStream();
            
            this.updateStatus("Sistema pronto. Ottieni posizione per iniziare.");
            
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
        const startTime = Date.now();
        try {
            // Verifica elemento video
            console.log(`[Camera] Attivazione camera, tempo trascorso: ${Date.now() - this.startTime}ms`);
            
            if (!this.videoElement) {
                console.error("[Camera] Elemento video non trovato");
                this.updateStatus("Errore: elemento video non trovato");
                return false;
            }
            
            // Verifica se MediaDevices è supportato
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("[Camera] MediaDevices API non supportata");
                this.updateStatus("Il tuo browser non supporta l'accesso alla fotocamera");
                return false;
            }
            
            // Rimuovi eventuale srcObject esistente
            if (this.videoElement.srcObject) {
                const tracks = this.videoElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                this.videoElement.srcObject = null;
            }
            
            // Richiedi permessi per la fotocamera
            this.updateStatus("Richiesta accesso alla fotocamera...");
            
            // Prova diversi vincoli della fotocamera
            const constraints = [
                { video: { facingMode: "environment" } },                    // Prima scelta: fotocamera posteriore
                { video: true },                                            // Seconda scelta: qualsiasi fotocamera
                { video: { facingMode: { exact: "environment" } } }         // Terza scelta: forza fotocamera posteriore
            ];
            
            let stream = null;
            let error = null;
            
            // Prova ogni vincolo finché uno funziona
            for (let i = 0; i < constraints.length; i++) {
                try {
                    console.log(`[Camera] Tentativo ${i+1} con constraints:`, JSON.stringify(constraints[i]));
                    stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
                    console.log(`[Camera] Stream ottenuto con vincolo ${i+1}`);
                    break; // Esci dal ciclo se ottenuto con successo
                } catch (e) {
                    console.warn(`[Camera] Fallito tentativo ${i+1}:`, e.message);
                    error = e;
                }
            }
            
            if (!stream) {
                console.error("[Camera] Impossibile ottenere accesso alla fotocamera:", error?.message);
                this.updateStatus("Impossibile accedere alla fotocamera. Verifica i permessi.");
                return false;
            }
            
            // Assegna lo stream al video
            this.videoElement.srcObject = stream;
            
            // Imposta attributi importanti per mobile
            this.videoElement.setAttribute("autoplay", "true");
            this.videoElement.setAttribute("playsinline", "true");
            this.videoElement.setAttribute("muted", "true");
            this.videoElement.muted = true;
            
            // Forza la visualizzazione
            this.videoElement.style.display = "block";
            this.videoElement.style.width = "100%";
            this.videoElement.style.height = "100%";
            this.videoElement.style.objectFit = "cover";
            
            // Prova a riprodurre il video
            try {
                console.log("[Camera] Tentativo di avvio video");
                await this.videoElement.play();
                console.log("[Camera] Video avviato correttamente");
                this.updateStatus("Fotocamera attivata");
                return true;
            } catch (playError) {
                console.error("[Camera] Errore nella riproduzione video:", playError.message);
                
                // Su alcuni browser, il play() deve essere chiamato dopo un'interazione utente
                this.updateStatus("Tocca lo schermo per attivare la fotocamera");
                
                // Aggiungi event listener per il tocco
                const touchHandler = async () => {
                    try {
                        await this.videoElement.play();
                        console.log("[Camera] Video avviato dopo interazione utente");
                        this.updateStatus("Fotocamera attivata");
                        
                        // Rimuovi il touch listener
                        document.removeEventListener('touchstart', touchHandler);
                        document.removeEventListener('click', touchHandler);
                    } catch (e) {
                        console.error("[Camera] Errore anche dopo interazione:", e.message);
                    }
                };
                
                document.addEventListener('touchstart', touchHandler, { once: true });
                document.addEventListener('click', touchHandler, { once: true });
                
                return false;
            }
        } catch (error) {
            console.error("[Camera] Errore generale nell'accesso alla fotocamera:", error.message);
            this.updateStatus("Errore fotocamera: " + error.message);
            return false;
        }
    }
    
    /**
     * Crea la scena di base
     */
    createScene() {
        const scene = new BABYLON.Scene(this.engine);
        
        // Crea una fotocamera per visualizzare la scena 3D
        this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 1.7, -5), scene);
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
            // Verifica se il browser supporta mediaDevices
            return !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
        } catch (error) {
            console.error("[Camera] Errore nel controllo del supporto AR:", error);
            return false;
        }
    }
    
    /**
     * Avvia l'esperienza AR
     */
    async startARExperience() {
        console.log("[AR] Avvio esperienza AR");
        
        try {
            // Attiva la fotocamera se non è già attiva
            if (!this.videoElement.srcObject) {
                const cameraStarted = await this.startVideoStream();
                if (!cameraStarted) {
                    console.error("[AR] Impossibile avviare la fotocamera");
                    return false;
                }
            } else if (this.videoElement.paused) {
                // Se il video è in pausa, riavvialo
                try {
                    await this.videoElement.play();
                } catch (e) {
                    console.error("[AR] Errore nel riavvio del video:", e.message);
                    await this.startVideoStream(); // Prova a riavviare completamente
                }
            }
            
            // Imposta lo stato AR attivo
            this.isARMode = true;
            this.arActive = true;
            
            // Reset dello stato di ancoraggio
            this.isAnchored = false;
            this.anchorPosition = null;
            
            // Assicurati che il video sia visibile
            this.videoElement.style.display = "block";
            
            // Assicurati che il canvas sia visibile
            this.canvas.style.display = "block";
            
            this.updateStatus("AR attivata, pronta a visualizzare oggetti");
            return true;
        } catch (error) {
            console.error("[AR] Errore nell'avvio dell'esperienza AR:", error);
            this.updateStatus("Errore nell'avvio AR: " + error.message);
            return false;
        }
    }
    
    /**
     * Posiziona un oggetto virtuale nella scena
     * @param {string} modelPath - Percorso del file del modello 3D da caricare
     * @param {number} deviceOrientation - Orientamento del dispositivo al momento del posizionamento (gradi)
     */
    async placeVirtualObject(modelPath = 'assets/models/treasure.glb', deviceOrientation = 0) {
        console.log("[AR] Posizionamento oggetto virtuale", modelPath);
        
        if (!this.arActive) {
            console.warn("[AR] AR non attiva, impossibile posizionare oggetto");
            return null;
        }
        
        try {
            // Se esiste già un oggetto, rimuovilo
            if (this.arObject) {
                this.arObject.dispose();
                this.arObject = null;
            }
            
            // Reset dello stato di ancoraggio quando si posiziona un nuovo oggetto
            this.isAnchored = false;
            this.anchorPosition = null;
            
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
            let model = null;
            try {
                console.log("[AR] Caricamento modello:", modelPath);
                const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", modelPath, this.scene);
                console.log("[AR] Modello caricato con successo");
                
                // Il modello caricato è nell'array result.meshes
                model = result.meshes[0]; // Il nodo principale
            } catch (modelError) {
                console.error("[AR] Errore nel caricamento del modello:", modelError);
                this.updateStatus("Errore caricamento modello, uso cubo rosso");
                
                // In caso di errore, usa un cubo rosso come fallback
                model = BABYLON.MeshBuilder.CreateBox("arObject", {
                    width: 0.5, height: 0.5, depth: 0.5
                }, this.scene);
                
                const material = new BABYLON.StandardMaterial("objectMaterial", this.scene);
                material.diffuseColor = new BABYLON.Color3(1, 0, 0);
                material.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
                model.material = material;
            }
            
            // Assegna il modello all'oggetto AR
            this.arObject = model;
            
            // Calcola la dimensione del modello e scala se necessario
            let size = 0.5; // Dimensione predefinita
            try {
                const boundingInfo = this.arObject.getBoundingInfo();
                const min = boundingInfo.minimum;
                const max = boundingInfo.maximum;
                
                const maxDimension = Math.max(
                    max.x - min.x,
                    max.y - min.y,
                    max.z - min.z
                );
                
                // Scala il modello a circa 0.5 metri di altezza
                size = maxDimension;
            } catch (e) {
                console.warn("[AR] Impossibile determinare la dimensione del modello", e);
            }
            
            // Scala il modello per una dimensione ragionevole
            const scaleFactor = 0.5 / (size || 1);
            this.arObject.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            
            // Posiziona l'oggetto di fronte alla camera inizialmente
            // Nota: questo sarà aggiornato in base alla geolocalizzazione
            this.arObject.position = new BABYLON.Vector3(0, 0, 3);
            
            // Applica la rotazione basata sull'orientamento del dispositivo
            const orientationRadians = (this.savedObjectOrientation * Math.PI) / 180;
            this.arObject.rotation.y = -orientationRadians;
            
            // Rimuovi il placeholder
            placeholder.dispose();
            
            // Mostra la freccia direzionale
            const directionArrow = document.getElementById('directionArrow');
            if (directionArrow) {
                directionArrow.classList.remove('hidden');
            }
            
            // Animazione di rotazione leggera
            this.scene.registerBeforeRender(() => {
                if (this.arObject && this.arActive) {
                    // Rotazione più lenta quando l'oggetto è ancorato
                    const rotationSpeed = this.isAnchored ? 0.001 : 0.002;
                    this.arObject.rotation.y += rotationSpeed;
                }
            });
            
            this.updateStatus("Oggetto 3D posizionato");
            return this.arObject;
        } catch (error) {
            console.error("[AR] Errore generale nel posizionamento dell'oggetto:", error);
            this.updateStatus("Errore: " + error.message);
            return null;
        }
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
        
        try {
            // Limita la distanza massima per una migliore visualizzazione
            const maxDistance = 10; // metri
            const clampedDistance = Math.min(distance, maxDistance);
            
            // Calcola un fattore di scala basato sulla distanza
            const scaleFactor = Math.max(0.3, 1 - (clampedDistance / maxDistance) * 0.7);
            
            // Converti la direzione da gradi a radianti
            const bearingRad = (bearing * Math.PI) / 180;
            
            // Calcola la posizione target relativa - questa è la chiave per il posizionamento corretto
            // Usa direzione in avanti (Z) e laterale (X) per posizionare l'oggetto
            const targetX = clampedDistance * Math.sin(bearingRad) * 0.5;
            const targetZ = clampedDistance * Math.cos(bearingRad) * 0.5;
            
            // Gestione dell'ancoraggio
            if (this.isAnchored && distance < this.maxAnchorDistance) {
                // Oggetto ancorato - applica solo piccoli aggiustamenti
                if (this.arObject.position && this.anchorPosition) {
                    const anchorSmoothing = this.smoothingFactor * 0.2;
                    this.arObject.position.x += (this.anchorPosition.x - this.arObject.position.x) * anchorSmoothing;
                    this.arObject.position.z += (this.anchorPosition.z - this.arObject.position.z) * anchorSmoothing;
                    this.arObject.position.y = 0.05 * Math.sin(Date.now() * 0.001); // Piccola oscillazione
                }
                
                // Aggiorna stato ancorato nell'UI
                if (document.getElementById('statusMessage') && 
                    document.getElementById('statusMessage').textContent.indexOf("ancorato") === -1) {
                    this.updateStatus("Oggetto ancorato - posizione stabile");
                }
            } else {
                // Oggetto non ancorato o troppo lontano
                
                // Considera l'ancoraggio se è vicino
                if (!this.isAnchored && distance < this.anchorDistance) {
                    if (!this.anchorTimeout) {
                        this.anchorTimeout = setTimeout(() => {
                            // Salva la posizione attuale come punto di ancoraggio
                            if (this.arObject && this.arObject.position) {
                                this.anchorPosition = {
                                    x: this.arObject.position.x,
                                    z: this.arObject.position.z
                                };
                                this.isAnchored = true;
                                console.log("[AR] Oggetto ancorato alla posizione corrente");
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
                    
                    // Rimuovi ancoraggio se troppo lontano
                    if (this.isAnchored && distance > this.maxAnchorDistance) {
                        this.isAnchored = false;
                        this.anchorPosition = null;
                        console.log("[AR] Ancoraggio rimosso - oggetto troppo distante");
                    }
                }
                
                // Aggiorna la posizione con smorzamento per movimento fluido
                if (this.arObject.position) {
                    this.arObject.position.x += (targetX - this.arObject.position.x) * this.smoothingFactor;
                    this.arObject.position.z += (targetZ - this.arObject.position.z) * this.smoothingFactor;
                    this.arObject.position.y = 0.1 * Math.sin(Date.now() * 0.002);
                } else {
                    this.arObject.position = new BABYLON.Vector3(targetX, 0, targetZ);
                }
            }
            
            // Aggiorna la scala in base alla distanza
            this.arObject.scaling = new BABYLON.Vector3(
                scaleFactor, 
                scaleFactor, 
                scaleFactor
            );
            
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
            
            // Aggiorna la visualizzazione di distanza
            const distanceEl = document.getElementById('distance');
            if (distanceEl) {
                if (this.isAnchored) {
                    distanceEl.textContent = `Distanza: ${distance.toFixed(1)} m (ancorato)`;
                } else {
                    distanceEl.textContent = `Distanza: ${distance.toFixed(1)} m`;
                }
            }
            
            return this.arObject;
        } catch (error) {
            console.error("[AR] Errore nell'aggiornamento della posizione:", error);
            return null;
        }
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
        
        // Nascondi l'oggetto se presente
        if (this.arObject) {
            this.arObject.isVisible = false;
        }
        
        // Arresta lo stream video se presente
        if (this.videoElement && this.videoElement.srcObject) {
            const tracks = this.videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        
        console.log("[AR] Esperienza AR fermata");
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
        console.log("[AR Status]", message);
    }
}

// Esporta la classe
window.ARManager = ARManager;