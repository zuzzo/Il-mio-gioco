/**
 * Gestisce il pannello di debug
 */
class DebugUtil {
    constructor(app) {
        this.app = app;
        this.panelElement = document.getElementById('debug-panel');
        this.contentElement = document.getElementById('debug-content');
        this.logs = [];
    }

    init() {
        // Inizializza eventuali event listener
    }

    log(message) {
        const timestamp = new Date().toISOString();
        this.logs.push(`[${timestamp}] ${message}`);
        console.log(message);
        
        // Aggiorna il contenuto se il pannello è visibile
        if (this.panelElement && !this.panelElement.classList.contains('hidden')) {
            this.updateContent();
        }
    }

    show() {
        this.panelElement.classList.remove('hidden');
        this.updateContent();
    }

    hide() {
        this.panelElement.classList.add('hidden');
    }

    updateContent() {
        this.contentElement.textContent = this.logs.join('\n');
    }
}

window.DebugUtil = DebugUtil;
