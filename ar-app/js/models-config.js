/**
 * Configurazione automatica dei modelli 3D
 * Questo script rileva automaticamente i modelli nella cartella assets/models/
 */

// Lista di modelli disponibili
window.availableModels = [];

// Percorso base dei modelli
const modelsBasePath = 'assets/models/';

// Funzione per convertire il nome del file in nome visualizzabile
function getDisplayName(fileName) {
    // Rimuovi estensione e sostituisci trattini/underscore con spazi
    const nameWithoutExt = fileName.replace(/\.(glb|gltf)$/, '')
                                  .replace(/[-_]/g, ' ');
    
    // Rendi maiuscola la prima lettera di ogni parola
    return nameWithoutExt.replace(/\b\w/g, l => l.toUpperCase());
}

// Funzione per caricare i modelli disponibili usando Fetch API
async function scanModelsDirectory() {
    try {
        // Fai una richiesta per ottenere il contenuto della directory
        // Questo endpoint dovrebbe restituire un JSON con l'elenco dei file
        const response = await fetch('assets/models/index.json');
        
        if (!response.ok) {
            throw new Error('Impossibile recuperare l\'elenco dei modelli');
        }
        
        const files = await response.json();
        
        // Pulisci l'array dei modelli
        window.availableModels = [];
        
        // Aggiungi tutti i modelli trovati
        files.forEach((fileName, index) => {
            // Verifica che sia un file 3D (glb o gltf)
            if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                const displayName = getDisplayName(fileName);
                
                window.availableModels.push({
                    id: 'model_' + index,
                    name: displayName,
                    path: modelsBasePath + fileName,
                    description: 'Modello 3D ' + displayName
                });
            }
        });
        
        // Aggiungi l'opzione per modello personalizzato
        window.availableModels.push({
            id: 'model_custom',
            name: 'Personalizzato...',
            path: 'custom',
            description: 'Carica un modello personalizzato'
        });
        
        // Aggiorna il menu a tendina
        populateModelSelect();
        
        console.log('Modelli caricati:', window.availableModels);
    } catch (error) {
        console.error('Errore nel caricamento dei modelli:', error);
        
        // Piano di fallback: usa un elenco predefinito di modelli che potrebbero essere presenti
        useFallbackModels();
    }
}

// Funzione di fallback con modelli predefiniti
function useFallbackModels() {
    // Pulisci l'array
    window.availableModels = [];
    
    // Carica modelli predefiniti che si presume esistano
    const defaultModels = ['treasure', 'chest', 'sword', 'coin', 'key'];
    
    defaultModels.forEach((name, index) => {
        window.availableModels.push({
            id: 'model_' + index,
            name: getDisplayName(name),
            path: modelsBasePath + name + '.glb',
            description: 'Modello 3D ' + getDisplayName(name)
        });
    });
    
    // Aggiungi l'opzione per modello personalizzato
    window.availableModels.push({
        id: 'model_custom',
        name: 'Personalizzato...',
        path: 'custom',
        description: 'Carica un modello personalizzato'
    });
    
    // Aggiorna il menu a tendina
    populateModelSelect();
    
    console.log('Utilizzando modelli predefiniti:', window.availableModels);
}

// Funzione per popolare dinamicamente il menu a tendina
function populateModelSelect() {
    const selectElement = document.getElementById('object-select');
    
    // Verifica che l'elemento select esista
    if (!selectElement) return;
    
    // Pulisci il select
    selectElement.innerHTML = '';
    
    // Aggiungi gli elementi dall'array
    for (const model of window.availableModels) {
        const option = document.createElement('option');
        option.value = model.path;
        option.textContent = model.name;
        selectElement.appendChild(option);
    }
}

// Avvia la scansione dei modelli disponibili
document.addEventListener('DOMContentLoaded', scanModelsDirectory);