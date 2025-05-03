/**
 * Configurazione dei modelli 3D disponibili nell'applicazione.
 * Questo file definisce l'array `window.availableModels`
 * che viene utilizzato per popolare i menu di selezione degli oggetti.
 */

(function() {
    // Definisce l'array dei modelli direttamente nel codice.
    // Ogni oggetto nell'array rappresenta un modello disponibile.
    // 'name' è il nome visualizzato nel menu a tendina.
    // 'path' è il percorso relativo al file del modello 3D (.glb o .gltf).
    // 'type' indica se è un modello predefinito o personalizzato
    const models = [
        { 
            name: "Tesoro", 
            path: "assets/models/treasure.glb",
            type: "predefined"
        },
        { 
            name: "Chiave", 
            path: "assets/models/key.glb",
            type: "predefined"
        },
        { 
            name: "Porta", 
            path: "assets/models/door.glb",
            type: "predefined"
        },
        // Aggiungi qui altri modelli predefiniti se necessario
        // Esempio: { name: "Sfera", path: "assets/models/sphere.glb", type: "predefined" },
        // Esempio: { name: "Cubo", path: "assets/models/cube.glb", type: "predefined" },

        // Opzione speciale per caricare un modello personalizzato dall'utente
        { 
            name: "Carica modello...", 
            path: "custom",
            type: "custom"
        }
    ];

    // Assegna l'array alla variabile globale `window.availableModels`
    // Questo la rende accessibile agli altri script (es. menu2.js)
    window.availableModels = models;

    console.log("Modelli 3D configurati staticamente:", window.availableModels);

    // Funzione per popolare il menu a tendina (se necessario altrove, altrimenti può essere rimossa)
    // Questa logica è solitamente gestita all'interno del menu specifico (es. Menu2)
    function populateModelDropdown(selectElementId) {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) {
            console.error(`Elemento select con ID "${selectElementId}" non trovato.`);
            return;
        }

        // Pulisci opzioni esistenti
        selectElement.innerHTML = '';

        // Aggiungi le opzioni dei modelli
        window.availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.path;
            option.textContent = model.name;
            selectElement.appendChild(option);
        });
         console.log(`Dropdown "${selectElementId}" popolato con ${window.availableModels.length} modelli.`);
    }

    // Esempio di come potrebbe essere chiamata (ma è meglio farlo dal menu specifico)
    // document.addEventListener('DOMContentLoaded', () => {
    //     populateModelDropdown('object-select'); // Assumendo che l'ID del select in Menu2 sia 'object-select'
    // });

})(); // Funzione auto-eseguibile per evitare inquinamento globale
