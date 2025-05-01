/**
 * Gestisce il pannello di debug
 */
class DebugPanel {
    constructor(app) {
        this.app = app;
        this.panelElement = document.getElementById('debug-panel');
        this.contentElement = document.getElementById('debug-content');
        this.copyBtn = document.getElementById('copy-debug-btn');
        this.closeBtn = document.getElementById('close-debug-btn');
        
        // Stato
        this.isVisible = false;
        this.logBuffer = [];
        
        // Bind dei metodi
        this.onCopyClick = this.onCopyClick.bind(this);
        this.onCloseClick = this.onCloseClick.bind(this);
    }
    
    /**
     * Inizializza il pannello
     */
    init() {
        // Aggiunge gli event listener
        this.copyBtn.addEventListener('click', this.onCopyClick);
        this.closeBtn.addEventListener('click', this.onCloseClick);
    }
    
    /**
     * Mostra il pannello di debug
     */
    show() {
        this.isVisible = true;
        this.panelElement.classList.remove('hidden');
        
        // Aggiorna il contenuto
        this.updateContent();
    }
    
    /**
     * Nasconde il pannello di debug
     */
    hide() {
        this.isVisible = false;
        this.panelElement.classList.add('hidden');
    }
    
    /**
     * Aggiunge un messaggio al log
     */
    log(message) {
        // Aggiungi timestamp
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        // Aggiungi al buffer
        this.logBuffer.push(logMessage);
        
        // Limita la dimensione del buffer
        if (this.logBuffer.length > 100) {
            this.logBuffer.shift();
        }
        
        // Aggiorna il contenuto se il pannello è visibile
        if (this.isVisible) {
            this.updateContent();
        }
        
        // Log anche nella console
        console.log(message);
    }
    
    /**
     * Aggiorna il contenuto del pannello
     */
    updateContent() {
        // Ottieni informazioni di debug
        const debugInfo = this.getDebugInfo();
        
        // Crea il contenuto
        let content = '';
        
        // Sezione Informazioni Sistema
        content += '=== INFORMAZIONI SISTEMA ===\n';
        for (const [key, value] of Object.entries(debugInfo.system)) {
            content += `${key}: ${value}\n`;
        }
        
        // Sezione Posizione
        content += '\n=== POSIZIONE ===\n';
        if (debugInfo.position) {
            for (const [key, value] of Object.entries(debugInfo.position)) {
                content += `${key}: ${value}\n`;
            }
        } else {
            content += 'Posizione non disponibile\n';
        }
        
        // Sezione Orientamento
        content += '\n=== ORIENTAMENTO ===\n';
        if (debugInfo.orientation) {
            for (const [key, value] of Object.entries(debugInfo.orientation)) {
                content += `${key}: ${value}\n`;
            }
        } else {
            content += 'Orientamento non disponibile\n';
        }
        
        // Sezione Oggetti
        content += '\n=== OGGETTI SALVATI ===\n';
        if (debugInfo.objects.length > 0) {
            for (const obj of debugInfo.objects) {
                content += `ID: ${obj.id}\n`;
                content += `Nome: ${obj.name}\n`;
                content += `Posizione: Lat ${obj.position.latitude.toFixed(6)}, Lng ${obj.position.longitude.toFixed(6)}\n`;
                content += `Scala: ${obj.scale}\n`;
                content += `Rotazione: ${obj.rotation}°\n`;
                content += `Timestamp: ${new Date(obj.timestamp).toLocaleString()}\n`;
                content += '\n';
            }
        } else {
            content += 'Nessun oggetto salvato\n';
        }
        
        // Sezione Log
        content += '\n=== LOG ===\n';
        if (this.logBuffer.length > 0) {
            content += this.logBuffer.join('\n');
        } else {
            content += 'Nessun messaggio di log\n';
        }
        
        // Aggiorna il contenuto
        this.contentElement.textContent = content;
    }
    
    /**
     * Ottiene le informazioni di debug
     */
    getDebugInfo() {
        return {
            system: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screenSize: `${window.innerWidth}x${window.innerHeight}`,
                devicePixelRatio: window.devicePixelRatio || 1,
                orientation: window.screen.orientation 
                    ? window.screen.orientation.type 
                    : 'non disponibile',
                language: navigator.language,
                online: navigator.onLine ? 'Sì' : 'No',
                https: location.protocol === 'https:' ? 'Sì' : 'No',
                geolocationSupported: navigator.geolocation ? 'Sì' : 'No',
                deviceOrientationSupported: window.DeviceOrientationEvent ? 'Sì' : 'No',
                webGLSupported: (() => {
                    try {
                        const canvas = document.createElement('canvas');
                        return !!(window.WebGLRenderingContext && 
                            (canvas.getContext('webgl') || 
                            canvas.getContext('experimental-webgl')));
                    } catch (e) {
                        return false;
                    }
                })() ? 'Sì' : 'No',
                babylonJSVersion: BABYLON ? BABYLON.Engine.Version : 'Non disponibile',
                imageAnchorEnabled: this.app.arManager.imageAnchorEnabled ? 'Sì' : 'No'
            },
            position: this.app.geoManager.currentPosition ? {
                latitude: this.app.geoManager.currentPosition.latitude.toFixed(6),
                longitude: this.app.geoManager.currentPosition.longitude.toFixed(6),
                accuracy: this.app.geoManager.currentPosition.accuracy.toFixed(1) + ' m',
                timestamp: new Date(this.app.geoManager.currentPosition.timestamp).toLocaleString()
            } : null,
            orientation: this.app.geoManager.currentOrientation ? {
                alpha: this.app.geoManager.currentOrientation.alpha.toFixed(1) + '°',
                beta: this.app.geoManager.currentOrientation.beta.toFixed(1) + '°',
                gamma: this.app.geoManager.currentOrientation.gamma.toFixed(1) + '°'
            } : null,
            objects: this.app.storageManager.getAllObjects()
        };
    }
    
    /**
     * Gestisce il click sul pulsante copia
     */
    onCopyClick() {
        try {
            // Copia il testo negli appunti
            navigator.clipboard.writeText(this.contentElement.textContent)
                .then(() => {
                    this.app.showMessage("Informazioni di debug copiate negli appunti");
                })
                .catch(err => {
                    console.error('Errore durante la copia:', err);
                    this.app.showMessage("Errore durante la copia");
                });
        } catch (error) {
            console.error('Errore durante la copia:', error);
            this.app.showMessage("Errore durante la copia");
            
            // Fallback per browser che non supportano clipboard API
            try {
                const tempTextArea = document.createElement('textarea');
                tempTextArea.value = this.contentElement.textContent;
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                document.execCommand('copy');
                document.body.removeChild(tempTextArea);
                this.app.showMessage("Informazioni di debug copiate negli appunti");
            } catch (err) {
                console.error('Fallback copy error:', err);
                this.app.showMessage("Impossibile copiare il testo");
            }
        }
    }
    
    /**
     * Gestisce il click sul pulsante chiudi
     */
    onCloseClick() {
        this.hide();
    }
}

// Esporta la classe
window.DebugPanel = DebugPanel;