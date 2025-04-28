/**
 * Gestisce la realtà aumentata con Babylon.js
 */
class ARManager {
    constructor() {
        // ... (costruttore esistente)

        // Aggiungi elemento per i toast
        this.toastElement = document.createElement('div');
        this.toastElement.id = 'ar-debug-toast';
        this.toastElement.style = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:white;padding:10px 20px;border-radius:5px;display:none;z-index:1000;';
        document.body.appendChild(this.toastElement);
    }

    // ... (altri metodi esistenti)

    initCameraDebug() {
        // Codice esistente...

        // Aggiungi pulsante Copia Log
        const copyLogBtn = document.createElement('button');
        copyLogBtn.textContent = 'Copia Log';
        copyLogBtn.className = 'debug-btn';
        copyLogBtn.addEventListener('click', () => this.copyDebugLogs());
        debugPanel.appendChild(copyLogBtn);
    }

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

    showToast(message) {
        this.toastElement.textContent = message;
        this.toastElement.style.display = 'block';
        setTimeout(() => {
            this.toastElement.style.display = 'none';
        }, 2000);
    }

    // ... (resto del codice esistente)
}

window.ARManager = ARManager;
