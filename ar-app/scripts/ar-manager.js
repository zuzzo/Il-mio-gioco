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
        this.smoothingFactor = 0.1; // Fattore di smorzamento
        this.anchorTimeout = null;
        this.anchorDistance = 5; // Distanza in metri entro cui tentare l'ancoraggio
        this.maxAnchorDistance = 15; // Distanza oltre la quale rimuovere l'ancoraggio
        
        // Nuovi parametri per la personalizzazione dell'oggetto
        this.objectRotationY = 0; // Rotazione personalizzata utente (gradi)
        this.objectScale = 1.0; // Scala personalizzata utente (moltiplicatore)
    }

    /**
     * Inizializza il motore di rendering 3D
     */
    async init(canvasId, videoId = 'camera-feed') {
        this.startTime = Date.now();
        this.canvas = document.getElementById(canvasId);
        this.videoElement = document.getElementById(videoId);
        
        console.log("[AR] Inizializzazione AR Manager");
        
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
            
        // Rimuove l'inizializzazione del debug
            
            // Avvia subito il flusso video dalla fotocamera (come fa il debug)
            // Questo risolve il problema dello schermo nero
            this.updateStatus("Attivazione fotocamera...");
            const cameraStarted = await this.startVideoStream();
            
            if (!cameraStarted) {
                console.warn("[AR] Attivazione automatica camera fallita, riprova manualmente");
                this.updateStatus("Tocca per attivare la fotocamera");
                
                // Aggiungi event listener per tentare di avviare la camera al tocco
                document.addEventListener('click', async () => {
                    await this.startVideoStream();
                }, { once: true });
            } else {
                this.updateStatus("Fotocamera pronta. Ottieni posizione per iniziare.");
            }
            
            // Verifica supporto AR
            this.isARSupported = await this.checkARSupport();
            
            // Carica le impostazioni dell'oggetto se disponibili
            this.loadObjectSettings();
            
            return this.isARSupported;
        } catch (error) {
            console.error("Errore nell'inizializzazione dell'AR Manager:", error);
            this.updateStatus("Errore inizializzazione: " + error.message);
            return false;
        }
    }
    
    /**
     * Avvia il flusso video dalla fotocamera - usando l'approccio che funziona nel debug
     */
    async startVideoStream() {
        try {
            // Verifica elemento video
            if (!this.videoElement) {
                console.error("[Camera] Elemento video non trovato");
                return false;
            }
            
            // Verifica se MediaDevices è supportato
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("[Camera] MediaDevices API non supportata");
                return false;
            }
            
            // Arresta eventuali stream precedenti
            if (this.videoElement.srcObject) {
                const tracks = this.videoElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                this.videoElement.srcObject = null;
            }
            
            // Richiedi access alla fotocamera - usando lo stesso approccio del pulsante debug
            const constraints = { 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            };
            
            console.log("[Camera] Richiesta accesso fotocamera con constraints:", JSON.stringify(constraints));
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
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
                this.videoElement.style.opacity = "1";
                this.videoElement.style.visibility = "visible";
                
                console.log("[Camera] Stream ottenuto, avvio video");
                
                // Avvia il video
                await this.videoElement.play();
                console.log("[Camera] Video avviato con successo");
                
                return true;
            } catch (err) {
                console.error("[Camera] Errore accesso fotocamera:", err.message);
                return false;
            }
        } catch (error) {
            console.error("[Camera] Errore generale:", error);
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
            // Se la fotocamera non è attiva, avviala
            if (!this.videoElement.srcObject || this.videoElement.paused) {
                await this.startVideoStream();
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
     * Carica le impostazioni dell'oggetto dal localStorage
     */
    loadObjectSettings() {
        try {
            const settings = localStorage.getItem('arObjectSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.objectRotationY = parsed.rotation || 0;
                this.objectScale = parsed.scale || 1.0;
                console.log("[AR] Impostazioni oggetto caricate:", this.objectRotationY, this.objectScale);
            }
        } catch (e) {
            console.error("[AR] Errore nel caricamento impostazioni:", e);
        }
    }
    
    /**
     * Salva le impostazioni dell'oggetto nel localStorage
     */
    saveObjectSettings() {
        try {
            const settings = {
                rotation: this.objectRotationY,
                scale: this.objectScale
            };
            localStorage.setItem('arObjectSettings', JSON.stringify(settings));
            console.log("[AR] Impostazioni oggetto salvate");
        } catch (e) {
            console.error("[AR] Errore nel salvataggio impostazioni:", e);
        }
    }
    
    /**
     * Aggiorna la rotazione personalizzata dell'oggetto
     * @param {number} angle - Angolo in gradi (0-360)
     */
    setObjectRotation(angle) {
        this.objectRotationY = angle;
        if (this.arObject) {
            // Applica la rotazione all'oggetto esistente
            // Convertiamo l'angolo in radianti per Babylon.js
            const orientationRad = (this.savedObjectOrientation * Math.PI) / 180;
            const customRotationRad = (this.objectRotationY * Math.PI) / 180;
            
            // Combina l'orientamento del dispositivo con la rotazione personalizzata
            this.arObject.rotation.y = -orientationRad + customRotationRad;
        }
        this.saveObjectSettings();
    }
    
    /**
     * Aggiorna la scala personalizzata dell'oggetto
     * @param {number} scale - Fattore di scala (0.1-3.0)
     */
    setObjectScale(scale) {
        this.objectScale = scale;
        if (this.arObject) {
            // Applica la scala all'oggetto esistente
            const baseScale = this.arObject.scaling.x / this.objectScale;
            const newScale = baseScale * scale;
            
            this.arObject.scaling = new BABYLON.Vector3(newScale, newScale, newScale);
        }
        this.saveObjectSettings();
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
            
            // Applica la scala base e poi la scala personalizzata
            const finalScale = scaleFactor * this.objectScale;
            this.arObject.scaling = new BABYLON.Vector3(finalScale, finalScale, finalScale);
            
            // Posiziona l'oggetto di fronte alla camera inizialmente
            // Nota: questo sarà aggiornato in base alla geolocalizzazione
            this.arObject.position = new BABYLON.Vector3(0, 0, 3);
            
            // Applica la rotazione basata sull'orientamento del dispositivo
            // e la rotazione personalizzata
            const orientationRad = (this.savedObjectOrientation * Math.PI) / 180;
            const customRotationRad = (this.objectRotationY * Math.PI) / 180;
            this.arObject.rotation.y = -orientationRad + customRotationRad;
            
            // Rimuovi il placeholder
            placeholder.dispose();
            
            // Mostra la freccia direzionale
            const directionArrow = document.getElementById('directionArrow');
            if (directionArrow) {
                directionArrow.classList.remove('hidden');
            }
            
            // Mostra i controlli degli slider
            document.getElementById('rotationSliderContainer').classList.remove('hidden');
            document.getElementById('scaleSliderContainer').classList.remove('hidden');
            
            // Imposta i valori degli slider alle impostazioni attuali
            document.getElementById('rotationSlider').value = this.objectRotationY;
            document.getElementById('scaleSlider').value = this.objectScale * 10; // Moltiplicato per 10 per l'interfaccia
            
            // Animazione di rotazione leggera
            this.scene.registerBeforeRender(() => {
                if (this.arObject && this.arActive) {
                    // Piccola rotazione automatica ma più leggera
                    const rotationSpeed = this.isAnchored ? 0.0005 : 0.001;
                    this.arObject.rotation.y += rotationSpeed;
                }
            });
            
            // Salva le coordinate dell'oggetto in un file di testo (simulato con localStorage)
            this.saveObjectCoordinates();
            
            this.updateStatus("Oggetto 3D posizionato");
            return this.arObject;
        } catch (error) {
            console.error("[AR] Errore generale nel posizionamento dell'oggetto:", error);
            this.updateStatus("Errore: " + error.message);
            return null;
        }
    }
    
    /**
     * Salva le coordinate dell'oggetto
     */
    saveObjectCoordinates() {
        // Simulazione di salvataggio in un file di testo usando localStorage
        try {
            if (this.savedData && this.savedData.position) {
                const coordinates = {
                    latitude: this.savedData.position.latitude,
                    longitude: this.savedData.position.longitude,
                    orientation: this.savedObjectOrientation,
                    rotation: this.objectRotationY,
                    scale: this.objectScale,
                    timestamp: new Date().toISOString()
                };
                
                // Salva i dati
                localStorage.setItem('arObjectCoordinates', JSON.stringify(coordinates));
                
                // Puoi anche simulare la scrittura su file per debug
                console.log("[AR] Coordinate oggetto salvate:");
                console.log(JSON.stringify(coordinates, null, 2));
            }
        } catch (e) {
            console.error("[AR] Errore nel salvataggio coordinate:", e);
        }
    }
    
    /**
     * Carica le coordinate dell'oggetto
     */
    loadObjectCoordinates() {
        try {
            const savedCoords = localStorage.getItem('arObjectCoordinates');
            if (savedCoords) {
                return JSON.parse(savedCoords);
            }
        } catch (e) {
            console.error("[AR] Errore nel caricamento coordinate:", e);
        }
        return null;
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
        
        // Nascondi gli slider di controllo
        document.getElementById('rotationSliderContainer').classList.add('hidden');
        document.getElementById('scaleSliderContainer').classList.add('hidden');
        
        // Nascondi l'oggetto se presente
        if (this.arObject) {
            this.arObject.isVisible = false;
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
        const forceCameraBtn = document.getElementById('forceCameraBtn');
        if (forceCameraBtn) {
            forceCameraBtn.addEventListener('click', async () => {
                document.getElementById('cameraStatus').textContent = "Tentativo forzato di accesso alla fotocamera...";
                const result = await this.startVideoStream();
                document.getElementById('cameraStatus').textContent = result 
                    ? "Camera avviata con successo" 
                    : "Errore nell'avvio della camera";
            });
        }
        
        const refreshVideoBtn = document.getElementById('refreshVideoBtn');
        if (refreshVideoBtn) {
            refreshVideoBtn.addEventListener('click', () => {
                if (this.videoElement) {
                    // Forza la visibilità
                    this.videoElement.style.display = 'block';
                    this.videoElement.style.opacity = '1';
                    this.videoElement.style.visibility = 'visible';
                    this.videoElement.style.zIndex = '10';
                    document.getElementById('cameraStatus').textContent = "Video refreshed";
                } else {
                    document.getElementById('cameraStatus').textContent = "Elemento video non trovato";
                }
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
