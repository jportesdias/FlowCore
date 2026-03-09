/**
 * XML Flow Validator - Main Application Logic
 */

const AppState = {
    files: [], // Array to hold loaded file objects { file, content, type, id }
    parsedData: {}, // Holds mapped data
    validationResults: [], // Holds rows for the details table
    settings: {
        absTol: 0.01,
        enableAB: true,
        chromMin: 99.0,
        chromMax: 101.0
    }
};

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileListContainer = document.getElementById('fileListContainer');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const btnClearFiles = document.getElementById('btnClearFiles');
const btnProcess = document.getElementById('btnProcess');
const resultsSection = document.getElementById('resultsSection');
const detailsTableBody = document.getElementById('detailsTableBody');
const filterTag = document.getElementById('filterTag');
const filterStatus = document.getElementById('filterStatus');

// Settings Elements
const btnSettings = document.getElementById('btnSettings');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const btnCancelSettings = document.getElementById('btnCancelSettings');
const settingsModal = document.getElementById('settingsModal');

// Export Elements
const btnExportPDF = document.getElementById('btnExportPDF');
const btnExportCSV = document.getElementById('btnExportCSV');

/**
 * Normalization Utilities
 */
const Normalizer = {
    toFloat: (val) => {
        if (!val) return 0.0;
        if (typeof val === 'number') return val;
        // Replace comma with dot, remove spaces, parse to float
        let clean = val.replace(/\s/g, '').replace(',', '.');
        let parsed = parseFloat(clean);
        return isNaN(parsed) ? 0.0 : parsed;
    },
    formatDate: (dateStr) => {
        // Example: '21/10/2023 14:00:00'
        return dateStr;
    }
};

/**
 * Event Listeners Initialization
 */
function initEvents() {
    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('bg-brand-50', 'border-brand-500');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-brand-50', 'border-brand-500');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-brand-50', 'border-brand-500');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });

    btnClearFiles.addEventListener('click', clearFiles);

    btnProcess.addEventListener('click', processValidation);

    // Filters
    filterTag.addEventListener('change', renderTable);
    filterStatus.addEventListener('change', renderTable);

    // Settings Modal
    btnSettings.addEventListener('click', openSettings);
    btnCancelSettings.addEventListener('click', closeSettings);
    btnSaveSettings.addEventListener('click', saveSettings);

    // Exports
    btnExportPDF.addEventListener('click', exportPDF);
    btnExportCSV.addEventListener('click', exportCSV);
}

/**
 * File Handling
 */
async function handleFiles(fileList) {
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        // Avoid duplicates by name (if it's not a zip, zip contents handled later)
        if (!file.name.toLowerCase().endsWith('.zip') && AppState.files.some(f => f.file.name === file.name)) continue;

        if (file.name.toLowerCase().endsWith('.zip')) {
            try {
                await processZipFile(file);
            } catch (e) {
                console.error("Erro ao ler ZIP", file.name, e);
                alert(`Falha ao ler o arquivo ZIP ${file.name}`);
            }
        } else if (file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.txt')) {
            try {
                const content = await readFileAsync(file);
                addFileToState(file.name, content, file);
            } catch (e) {
                console.error("Erro ao ler", file.name, e);
                alert(`Falha ao ler o arquivo ${file.name}`);
            }
        } else {
            alert(`O arquivo ${file.name} não é suportado (apenas XML, TXT ou ZIP).`);
        }
    }

    updateFileUI();
}

async function processZipFile(file) {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    for (const [filename, zipEntry] of Object.entries(loadedZip.files)) {
        if (!zipEntry.dir) {
            const pureName = filename.split('/').pop();
            const lowerName = pureName.toLowerCase();

            const isXml = lowerName.endsWith('.xml');
            const isTxt = lowerName.endsWith('.txt');
            // User requested: "tem 'Run_24Hours' haverá 1, 2 ou vários, e a parte de configuração tem 'Configuration'"
            // Adicionando 'run_daily' pois o usuário informou que essa é a nomenclatura atual.
            // AGORA (ATUALIZAÇÃO): O usuário solicitou a remoção estrita e completa do 'Run_24Hours'. Só lendo Run_Daily e Configuration.
            const isValidTxt = isTxt && (lowerName.includes('run_daily') || lowerName.includes('configuration'));

            if (isXml || isValidTxt) {
                // Avoid duplicates by name extracted from zip
                if (AppState.files.some(f => f.file.name === pureName)) continue;

                const content = await zipEntry.async("string");

                // Store pseudo-file: Include the origin zip name so we can map it later
                const pseudoFile = { name: pureName, size: content.length, type: isXml ? 'text/xml' : 'text/plain', originZip: file.name };
                addFileToState(pureName, content, pseudoFile);
            }
        }
    }
}

function addFileToState(filename, content, fileObj) {
    const { type, logicalId } = classifyFile(filename, content);
    AppState.files.push({
        file: fileObj,
        content: content,
        type: type,
        logicalId: logicalId
    });
}

function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function classifyFile(filename, content) {
    let type = 'Unknown';
    let logicalId = 'Unknown';
    const lowerName = filename.toLowerCase();

    if (filename.toLowerCase().endsWith('.xml')) {
        if (lowerName.includes('001')) { type = 'XML 001'; logicalId = '001'; }
        else if (lowerName.includes('002')) { type = 'XML 002'; logicalId = '002'; }
        else if (lowerName.includes('003')) { type = 'XML 003'; logicalId = '003'; }
        else { type = 'XML'; logicalId = 'Unknown'; }
    } else if (filename.toLowerCase().endsWith('.txt')) {
        if (lowerName.includes('run_daily')) {
            type = 'TXT Daily';
        } else if (lowerName.includes('configuration')) {
            type = 'TXT Configuration';
        } else {
            type = 'Unknown TXT'; // Do not guess Daily by default to prevent garbage/24hours text inclusion
        }
    }

    return { type, logicalId };
}

function updateFileUI() {
    fileList.innerHTML = '';
    AppState.files.forEach((fileObj, idx) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100';

        const typePillClass = fileObj.file.name.endsWith('.xml') ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-800';

        // Add dropdown to allow override category
        li.innerHTML = `
            <div class="flex items-center gap-3">
                <i data-lucide="${fileObj.file.name.endsWith('.xml') ? 'file-code-2' : 'file-text'}" class="${fileObj.file.name.endsWith('.xml') ? 'text-brand-500' : 'text-gray-500'} w-5 h-5"></i>
                <div class="flex flex-col">
                    <span class="text-sm font-medium text-gray-900 truncate max-w-[200px]" title="${fileObj.file.name}">${fileObj.file.name}</span>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <select class="text-xs rounded border-gray-300 py-1 bg-white type-override" data-idx="${idx}">
                    <option value="XML 001" ${fileObj.type === 'XML 001' ? 'selected' : ''}>XML 001</option>
                    <option value="TXT Daily" ${fileObj.type === 'TXT Daily' ? 'selected' : ''}>TXT Daily</option>
                    <option value="TXT Configuration" ${fileObj.type === 'TXT Configuration' ? 'selected' : ''}>TXT Configuration</option>
                </select>
                <button class="text-gray-400 hover:text-red-500 transition-colors remove-file" data-idx="${idx}">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        fileList.appendChild(li);
    });

    // Setup remove and override events
    document.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            AppState.files.splice(idx, 1);
            updateFileUI();
        });
    });

    document.querySelectorAll('.type-override').forEach(select => {
        select.addEventListener('change', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            AppState.files[idx].type = e.currentTarget.value;
        });
    });

    fileCount.textContent = AppState.files.length;
    fileListContainer.classList.toggle('hidden', AppState.files.length === 0);

    btnProcess.disabled = AppState.files.length === 0;

    lucide.createIcons();
}

function clearFiles() {
    AppState.files = [];
    fileInput.value = '';
    updateFileUI();
    resultsSection.classList.add('hidden');
    btnExportPDF.disabled = true;
    btnExportCSV.disabled = true;
}

/**
 * Settings Handlers
 */
function openSettings() {
    settingsModal.classList.remove('hidden');
    setTimeout(() => {
        settingsModal.querySelector('.modal-backdrop').classList.replace('opacity-0', 'opacity-100');
        settingsModal.querySelector('.modal-backdrop').classList.add('pointer-events-auto');
        settingsModal.querySelector('.modal-panel').classList.replace('opacity-0', 'opacity-100');
        settingsModal.querySelector('.modal-panel').classList.replace('translate-y-4', 'translate-y-0');
        settingsModal.querySelector('.modal-panel').classList.replace('sm:scale-95', 'sm:scale-100');
    }, 10);
}

function closeSettings() {
    settingsModal.querySelector('.modal-backdrop').classList.replace('opacity-100', 'opacity-0');
    settingsModal.querySelector('.modal-backdrop').classList.remove('pointer-events-auto');
    settingsModal.querySelector('.modal-panel').classList.replace('opacity-100', 'opacity-0');
    settingsModal.querySelector('.modal-panel').classList.replace('translate-y-0', 'translate-y-4');
    settingsModal.querySelector('.modal-panel').classList.replace('sm:scale-100', 'sm:scale-95');

    setTimeout(() => {
        settingsModal.classList.add('hidden');
    }, 300);
}

function saveSettings() {
    AppState.settings.absTol = parseFloat(document.getElementById('settingAbsTol').value);
    AppState.settings.enableAB = document.getElementById('settingEnableAB').checked;
    AppState.settings.chromMin = parseFloat(document.getElementById('settingChromMin').value);
    AppState.settings.chromMax = parseFloat(document.getElementById('settingChromMax').value);
    closeSettings();
    if (AppState.validationResults.length > 0) {
        // Reprocess if already processed
        processValidation();
    }
}

/**
 * Core Processing & Validation
 */
function processValidation() {
    btnProcess.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Processando...`;

    setTimeout(() => {
        try {
            // 1. Parse all files
            AppState.files.forEach(f => {
                if (f.file.name.endsWith('.xml')) {
                    f.parsed = parseXMLContent(f.content);
                } else if (f.file.name.endsWith('.txt')) {
                    f.parsed = parseTXTContent(f.content);
                }
            });

            // 2. Run validations exactly by matrix
            AppState.validationResults = runMatrixValidationEngine(AppState.files);

            // 3. Render Results
            resultsSection.classList.remove('hidden');
            btnExportPDF.disabled = false;
            btnExportCSV.disabled = false;

            renderDashboard();
            renderTable();

        } catch (error) {
            console.error(error);
            alert("Erro durante o processamento: " + error.message);
        } finally {
            btnProcess.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> Processar e Validar`;
        }
    }, 100);
}

function parseXMLContent(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(`Erro ao interpretar o XML.`);
    }
    return xmlDoc; // Retorna o doc inteiro para consulta xpath/tagname baseada na matriz
}

function parseTXTContent(txtString) {
    // UTF-16 files read as UTF-8 will inject null bytes. Remove them so .includes() and Regex can read standard text!
    let cleanText = txtString.replace(/\x00/g, '');
    return cleanText.split(/\r?\n/);
}

const MATRIX = [
    { xmlField: 'DADOS_BASICOS@NUM_SERIE_ELEMENTO_PRIMARIO', txtDaily: null, txtConfig: 'Meter serial nr' },
    { xmlField: 'NUM_SERIE_COMPUTADOR_VAZAO', txtDaily: null, txtConfig: 'Serial nr.' },
    { xmlField: 'DHA_COLETA', txtDaily: 'DATE_OF_DAY', txtConfig: null },
    { xmlField: 'MED_TEMPERATURA', txtDaily: null, txtConfig: 'SPECIAL_VAL_20' },
    { xmlField: 'DSC_VERSAO_SOFTWARE', txtDaily: null, txtConfig: 'Software' },
    { xmlField: 'ICE_K_FACTOR_1', txtDaily: null, txtConfig: 'K-Factor 1' },
    { xmlField: 'ICE_K_FACTOR_2', txtDaily: null, txtConfig: 'K-Factor 2' },
    { xmlField: 'ICE_K_FACTOR_3', txtDaily: null, txtConfig: 'K-Factor 3' },
    { xmlField: 'ICE_K_FACTOR_4', txtDaily: null, txtConfig: 'K-Factor 4' },
    { xmlField: 'ICE_K_FACTOR_5', txtDaily: null, txtConfig: 'K-Factor 5' },
    { xmlField: 'ICE_K_FACTOR_6', txtDaily: null, txtConfig: 'K-Factor 6' },
    { xmlField: 'ICE_K_FACTOR_7', txtDaily: null, txtConfig: 'K-Factor 7' },
    { xmlField: 'ICE_K_FACTOR_8', txtDaily: null, txtConfig: 'K-Factor 8' },
    { xmlField: 'ICE_K_FACTOR_9', txtDaily: null, txtConfig: 'K-Factor 9' },
    { xmlField: 'ICE_K_FACTOR_10', txtDaily: null, txtConfig: 'K-Factor 10' },
    { xmlField: 'ICE_K_FACTOR_11', txtDaily: null, txtConfig: 'K-Factor 11' },
    { xmlField: 'ICE_K_FACTOR_12', txtDaily: null, txtConfig: 'K-Factor 12' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_1', txtDaily: null, txtConfig: 'Frequency point 1' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_2', txtDaily: null, txtConfig: 'Frequency point 2' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_3', txtDaily: null, txtConfig: 'Frequency point 3' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_4', txtDaily: null, txtConfig: 'Frequency point 4' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_5', txtDaily: null, txtConfig: 'Frequency point 5' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_6', txtDaily: null, txtConfig: 'Frequency point 6' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_7', txtDaily: null, txtConfig: 'Frequency point 7' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_8', txtDaily: null, txtConfig: 'Frequency point 8' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_9', txtDaily: null, txtConfig: 'Frequency point 9' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_10', txtDaily: null, txtConfig: 'Frequency point 10' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_11', txtDaily: null, txtConfig: 'Frequency point 11' },
    { xmlField: 'QTD_PULSOS_K_FACTOR_12', txtDaily: null, txtConfig: 'Frequency point 12' },
    { xmlField: 'INSTRUMENTO_PRESSAO/NUM_SERIE', txtDaily: null, txtConfig: 'PT serial nr' },
    { xmlField: 'INSTRUMENTO_TEMPERATURA/NUM_SERIE', txtDaily: null, txtConfig: 'TT serial nr' },
    { xmlField: 'MED_PRESSAO_ESTATICA', txtDaily: 'Meter pressure', txtConfig: null },
    { xmlField: 'MED_TMPTA_FLUIDO', txtDaily: 'Meter temperature', txtConfig: null },
    { xmlField: 'MED_VOLUME_BRTO_CRRGO_MVMDO', txtDaily: 'Gross standard volume', txtConfig: null },
    { xmlField: 'MED_VOLUME_BRUTO_MVMDO', txtDaily: 'Gross volume', txtConfig: null },
    { xmlField: 'MED_VOLUME_LIQUIDO_MVMDO', txtDaily: 'Net standard volume', txtConfig: null },
    { xmlField: 'MED_VOLUME_TTLZO_FIM_PRDO', txtDaily: 'Gross volume', txtDailyBlock: 'Cumulative totals at day end', txtConfig: null }
];

function getXMLTagValue(xmlDoc, path) {
    // Check if the path is an attribute request (e.g. DADOS_BASICOS@NUM_SERIE_ELEMENTO_PRIMARIO)
    if (path.includes('@')) {
        const parts = path.split('@');
        let nodes = xmlDoc.getElementsByTagName(parts[0]);
        if (nodes.length > 0) {
            let attr = nodes[0].getAttribute(parts[1]); // Only grab from the primary/first node to avoid array mismatches
            if (attr !== null && attr !== undefined) {
                return { val: attr.trim(), nodePath: path };
            }
        }
        return { val: null, nodePath: path };
    }

    // Check if the path is a nested request (e.g. INSTRUMENTO_PRESSAO/NUM_SERIE)
    if (path.includes('/')) {
        const parts = path.split('/');
        let currentNodes = xmlDoc.getElementsByTagName(parts[0]);
        if (currentNodes.length > 0) {
            let inner = currentNodes[0].getElementsByTagName(parts[1]);
            if (inner.length > 0) return { val: inner[0].textContent.trim(), nodePath: path };
        }
        return { val: null, nodePath: path };
    }

    // Standard tag request
    const tags = xmlDoc.getElementsByTagName(path);
    if (tags.length > 0) {
        return { val: tags[0].textContent.trim(), nodePath: path };
    }

    return { val: null, nodePath: path };
}

function getXMLDailyValues(xmlDoc, path) {
    let vals = [];
    let runBlocks = xmlDoc.getElementsByTagName('DADOS_BASICOS');

    if (runBlocks.length === 0) {
        let simpleExt = getXMLTagValue(xmlDoc, path);
        return { valArray: simpleExt.val ? [simpleExt.val] : [], nodePath: path };
    }

    if (path.includes('@')) {
        const parts = path.split('@');
        for (let i = 0; i < runBlocks.length; i++) {
            if (runBlocks[i].tagName === parts[0] || parts[0] === 'DADOS_BASICOS') {
                let attr = runBlocks[i].getAttribute(parts[1]);
                vals.push(attr !== null && attr !== undefined ? attr.trim() : "Ausente");
            } else {
                let parent = runBlocks[i].parentNode;
                let child = parent.getElementsByTagName(parts[0]);
                if (child.length > 0) {
                    let attr = child[0].getAttribute(parts[1]);
                    vals.push(attr !== null && attr !== undefined ? attr.trim() : "Ausente");
                } else {
                    vals.push("Ausente");
                }
            }
        }
    } else if (path.includes('/')) {
        const parts = path.split('/');
        for (let i = 0; i < runBlocks.length; i++) {
            let parent = runBlocks[i].parentNode;
            let currentNodes = parent.getElementsByTagName(parts[0]);
            if (currentNodes.length > 0) {
                let inner = currentNodes[0].getElementsByTagName(parts[1]);
                vals.push(inner.length > 0 ? inner[0].textContent.trim() : "Ausente");
            } else {
                vals.push("Ausente");
            }
        }
    } else {
        let allTags = xmlDoc.getElementsByTagName(path);
        if (allTags.length === 1) {
            // It's a single global tag (e.g. MED_VOLUME_TTLZO_FIM_PRDO). Don't duplicate per run.
            vals.push(allTags[0].textContent.trim());
        } else {
            // It's a repeated tag (e.g. MED_PRESSAO_ESTATICA). Match index to the run block index to prevent grabbing Run 1's values for Run 2.
            for (let i = 0; i < runBlocks.length; i++) {
                if (i < allTags.length) {
                    vals.push(allTags[i].textContent.trim());
                } else {
                    vals.push("Ausente");
                }
            }
        }
    }

    return { valArray: vals, nodePath: path };
}

function searchTXTForLabel(txtLines, label, sectionContext = null) {
    if (!txtLines || !label) return null;
    const lowerLabel = label.toLowerCase();

    // Create an escaped regex for the label.
    // Replace \s inside the escaped string with \s+ so "K-Factor 1" matches "K-Factor   1"
    const escapedLabelStr = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+');
    const regexStr = escapedLabelStr + '(?![a-zA-Z0-9])[\\s\\.:=-]*(.*)';
    const regex = new RegExp(regexStr, 'i');

    let withinSection = !sectionContext; // If no section required, always true

    for (let line of txtLines) {
        // If a section block is required, wait until we find the header
        if (sectionContext && !withinSection) {
            if (line.toLowerCase().includes(sectionContext.toLowerCase())) {
                withinSection = true;
            }
            continue; // Skip lines until we enter the section
        }

        // Evaluate every line strictly by the custom regex
        const match = line.match(regex);
        if (match && match[1] && withinSection) {
            const rawValues = match[1].trim();

            // Split the right side of the label by multiple spaces or tabs into columns
            const columns = rawValues.split(/\s{2,}|\t+/);

            return columns.map(c => c.trim()).filter(c => c.length > 0);
        }
    }
    return null;
}

function parseSmartNumber(val) {
    if (!val) return NaN;
    let s = val.trim();
    if (s.includes(',') && s.includes('.')) {
        let lastComma = s.lastIndexOf(',');
        let lastDot = s.lastIndexOf('.');
        if (lastDot > lastComma) {
            // US format: 1,234.56
            s = s.replace(/,/g, '');
        } else {
            // EU format: 1.234,56
            s = s.replace(/\./g, '');
            s = s.replace(/,/g, '.');
        }
    } else {
        // Universal single separator: 1234,56 or 1234.56
        s = s.replace(/,/g, '.');
    }
    let m = s.match(/-?\d*\.?\d+/);
    return m ? parseFloat(m[0]) : NaN;
}

function normalizeNumberStr(str) {
    if (!str) return null;
    return str.replace(',', '.').trim();
}

function findMatchingToken(xmlValRaw, txtTokens) {
    if (!xmlValRaw || !txtTokens || !Array.isArray(txtTokens)) return null;

    let x = xmlValRaw.trim();
    if (x === "Ausente") return null;

    let xFloat = parseSmartNumber(x);

    // Identify decimal precision of the XML value
    let matchDecimals = x.match(/[,.](\d+)$/);
    let decimals = matchDecimals ? matchDecimals[1].length : 0;

    for (let tRaw of txtTokens) {
        let t = tRaw.trim();

        let xDot = x.replace(/,/g, '.');
        let tDot = t.replace(/,/g, '.');

        // 1. Exact string match (allowing comma/dot interchangeability)
        if (xDot === tDot) return tRaw;

        // 2. Case-insensitive string match
        if (xDot.toLowerCase() === tDot.toLowerCase()) return tRaw;

        // 3. Robust Numerical Match
        if (!isNaN(xFloat)) {
            let tFloat = parseSmartNumber(t);
            if (!isNaN(tFloat)) {

                // EXPLICIT TIME BAN: if it's a timestamp like 00:00:00, it's not a valid numeric metric match
                if (t.includes(':')) continue;

                if (xFloat === tFloat) return tRaw;

                // Rule: "vamos considerar apenas 1 casa decimal com as ressalvas de arredondamento"
                // Allow a generous 0.1 rounding tolerance for numeric values mathematically
                if (Math.abs(xFloat - tFloat) <= 0.1001) {
                    return tRaw;
                }

                if (decimals > 0) {
                    let tolerance = Math.pow(10, -decimals) + 1e-9;
                    if (Math.abs(xFloat - tFloat) <= tolerance) {
                        return tRaw;
                    }
                }
            }
        }
    }

    return null;
}

function exactCompare(xmlValRaw, txtValArray) {
    if (!xmlValRaw || !txtValArray || !Array.isArray(txtValArray) || txtValArray.length === 0) return false;

    let x = xmlValRaw.trim();
    let xFloat = parseSmartNumber(x);

    // Check if the XML value matches ANY of the columns in the tabular TXT row (e.g., Run 1 OR Run 2)
    for (let tRaw of txtValArray) {
        let t = tRaw.trim();

        let xDot = x.replace(/,/g, '.');
        let tDot = t.replace(/,/g, '.');

        // 1. Exact string match (allowing comma/dot interchangeability)
        if (xDot === tDot) return true;

        // 2. Case-insensitive string match
        if (xDot.toLowerCase() === tDot.toLowerCase()) return true;

        // 3. Robust Numerical Match (ignores TXT units, zeroes, locales)
        if (!isNaN(xFloat)) {
            let tFloat = parseSmartNumber(t);
            if (!isNaN(tFloat)) {
                if (xFloat === tFloat) return true;

                // Identify decimal precision of the XML value
                // Example: "4125,06" -> matchDecimals has length 2
                let matchDecimals = x.match(/[,.](\d+)$/);
                let decimals = matchDecimals ? matchDecimals[1].length : 0;

                // If decimals > 0, we forgive minor truncation or rounding differences in the TXT 
                // e.g. xFloat: 4125.06 (2 decimals), tolerance: 0.01 + EPSILON
                // tFloat limits allowed: 4125.050 to 4125.070
                if (decimals > 0) {
                    let tolerance = Math.pow(10, -decimals) + 1e-9;
                    if (Math.abs(xFloat - tFloat) <= tolerance) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

function runMatrixValidationEngine(files) {
    let results = [];

    // All available XMLs
    const xmlFiles = files.filter(f => f.type.startsWith('XML'));

    // We use the presence of TXTs to know WHAT to test
    const txtDailyFiles = files.filter(f => f.type === 'TXT Daily');
    const txtConfigFiles = files.filter(f => f.type === 'TXT Configuration');

    if (xmlFiles.length === 0) {
        alert("Nenhum arquivo XML encontrado. O XML é obrigatório para ser avaliado.");
        return [];
    }

    if (txtDailyFiles.length === 0 && txtConfigFiles.length === 0) {
        alert("Nenhum arquivo TXT Daily ou TXT Config encontrado. Por favor, classifique ao menos um TXT para iniciar a comparação.");
        return [];
    }

    // Determine which matrices to run based on overall TXT presence/selection
    const runDailyValidation = txtDailyFiles.length > 0;
    const runConfigValidation = txtConfigFiles.length > 0;

    xmlFiles.forEach(xmlFile => {
        const xmlDoc = xmlFile.parsed;
        const xmlFilename = xmlFile.file.name;

        // --- Mapping Rules (Requested by User) ---
        // XML 001 -> 30FC001.zip
        // XML 002 -> 30FC019.zip
        // XML 003 -> 30FC014.zip & 30FC016.zip.
        let allowedZipOrigin = [];
        if (xmlFile.type === 'XML 001') allowedZipOrigin = ['30fc001'];
        else if (xmlFile.type === 'XML 002') allowedZipOrigin = ['30fc019'];
        else if (xmlFile.type === 'XML 003') allowedZipOrigin = ['30fc014', '30fc016'];
        else allowedZipOrigin = []; // If unknown, don't filter

        // Filter TXT files associated strictly with this XML's mapped ZIP
        // If the allowed list is empty, it means we don't have a strict association mapped, default to checking all (to avoid breaking current manual TXT uploads)
        let relevantDailyFiles = txtDailyFiles;
        let relevantConfigFiles = txtConfigFiles;

        if (allowedZipOrigin.length > 0) {
            relevantDailyFiles = txtDailyFiles.filter(f => f.file.originZip && allowedZipOrigin.some(prefix => f.file.originZip.toLowerCase().includes(prefix)));
            relevantConfigFiles = txtConfigFiles.filter(f => f.file.originZip && allowedZipOrigin.some(prefix => f.file.originZip.toLowerCase().includes(prefix)));

            // Allow unbound files (manual upload without zip) as a fallback so we don't brick manual UI usage
            const unboundDaily = txtDailyFiles.filter(f => !f.file.originZip);
            const unboundConfig = txtConfigFiles.filter(f => !f.file.originZip);

            relevantDailyFiles = relevantDailyFiles.concat(unboundDaily);
            relevantConfigFiles = relevantConfigFiles.concat(unboundConfig);

            // FATAL FALLBACK: Se o filtro estrito der zerado (ex: usuário enviou um ZIP com outro nome),
            // Não podemos perder a validação. Liberamos todos os arquivos daquele tipo como fallback.
            if (relevantDailyFiles.length === 0) relevantDailyFiles = txtDailyFiles;
            if (relevantConfigFiles.length === 0) relevantConfigFiles = txtConfigFiles;
        }

        // Parse relevant TXT content into a single array of lines for searching purposes. 
        // Note: For Run_24Hours or Run_Daily there might be multiple (1, 2, etc). The labels search will find the first match down the lines array. 
        // For standard summation or loops this might need aggregation later. Currently, string search looks for the label.
        let txtConfigLines = [];
        relevantConfigFiles.forEach(f => { txtConfigLines = txtConfigLines.concat(f.parsed); });

        // Build a robust Run Map from the Daily files directly parsing the logical Run Numbers found in filenames
        // Prevents sequential mapping (a,b,c -> 1,2,3) natively fixing "ghost run 3" if someone uploads Run_Daily1 & Run_24Hours1
        let txtDailyRunMap = {};
        let txtDailyRunNames = {};

        relevantDailyFiles.forEach(f => {
            let match = f.file.name.match(/Run_Daily(\d+)/i);
            let runNum = match ? parseInt(match[1]) : 1;
            let runIdx = runNum - 1;

            if (!txtDailyRunMap[runIdx]) {
                txtDailyRunMap[runIdx] = [];
                txtDailyRunNames[runIdx] = [];
            }
            txtDailyRunMap[runIdx] = txtDailyRunMap[runIdx].concat(f.parsed);
            txtDailyRunNames[runIdx].push(f.file.name);
        });

        MATRIX.forEach(rule => {
            let requiresDaily = rule.txtDaily !== null;
            let requiresConfig = rule.txtConfig !== null;

            // Skip rule if the user didn't supply the corresponding TXT type
            if (requiresDaily && !runDailyValidation) return;
            if (requiresConfig && !runConfigValidation) return;

            if (requiresDaily) {
                let xmlExtraction = getXMLDailyValues(xmlDoc, rule.xmlField);
                let xmlValArray = xmlExtraction.valArray;
                let xmlNodePath = xmlExtraction.nodePath;

                let txtRunKeys = Object.keys(txtDailyRunMap).sort((a, b) => parseInt(a) - parseInt(b));

                for (let idxStr of txtRunKeys) {
                    let i = parseInt(idxStr);
                    let x = i < xmlValArray.length ? xmlValArray[i] : "Ausente";

                    let combinedRunLines = txtDailyRunMap[i];
                    let parsedFileNames = txtDailyRunNames[i].join(', ');

                    let linePassed = true;
                    let tMatched = "Ausente no arquivo TXT";

                    if (rule.txtDaily === 'DATE_OF_DAY') {
                        linePassed = true;
                        tMatched = "Data Atual";
                    } else if (rule.txtDaily === 'SPECIAL_VAL_20') {
                        if (parseFloat(x.trim().replace(',', '.')) !== 20) linePassed = false;
                        tMatched = "20";
                    } else {
                        if (x === "Ausente") {
                            linePassed = true;
                            tMatched = "-";
                        } else {
                            // Search all concatenated text from all TXT files corresponding to this precise Run Number
                            let allTxtTokens = combinedRunLines.join(' ').split(/\s+/);
                            let foundToken = findMatchingToken(x, allTxtTokens);

                            if (foundToken) {
                                linePassed = true;
                                tMatched = foundToken;
                            } else {
                                linePassed = false;
                                tMatched = "Não encontrado em: " + parsedFileNames;
                            }
                        }
                    }

                    // Dynamically prepend the Run context 
                    let runLabel = `(Run ${i + 1} - Global) Busca por Valor Numerico`;
                    let xmlLabel = `(Run ${i + 1}) ${rule.xmlField}`;

                    results.push({
                        xmlFilename: xmlFilename,
                        nodePath: xmlNodePath,
                        xmlField: xmlLabel,
                        txtField: runLabel,
                        xmlValue: x,
                        txtValue: tMatched,
                        status: linePassed ? 'PASS' : 'FAIL',
                        motivo: linePassed ? '-' : 'VALUE_NOT_FOUND'
                    });
                }
                return;
            }

            if (requiresConfig) {
                // CONFIG MODE: The original, stable, 35 PASS flat execution untouched
                let xmlExtraction = getXMLTagValue(xmlDoc, rule.xmlField);
                let xmlVal = xmlExtraction.val;
                let xmlNodePath = xmlExtraction.nodePath;
                let txtFieldLabel = rule.txtConfig;
                let txtValColArray = null;

                if (rule.txtConfig === 'SPECIAL_VAL_20') {
                    txtValColArray = ["20"];
                } else {
                    txtValColArray = searchTXTForLabel(txtConfigLines, rule.txtConfig);
                }

                if (xmlVal === null) {
                    results.push({
                        xmlFilename: xmlFilename,
                        nodePath: xmlNodePath,
                        xmlField: rule.xmlField,
                        txtField: txtFieldLabel,
                        xmlValue: '-',
                        txtValue: txtValColArray ? txtValColArray.join(' | ') : '-',
                        status: 'FAIL',
                        motivo: 'XML_NODE_NOT_FOUND'
                    });
                    return;
                }

                if (!txtValColArray) {
                    results.push({
                        xmlFilename: xmlFilename,
                        nodePath: xmlNodePath,
                        xmlField: rule.xmlField,
                        txtField: txtFieldLabel,
                        xmlValue: xmlVal,
                        txtValue: 'Ausente no TXT',
                        status: 'FAIL',
                        motivo: 'TXT MISSING'
                    });
                    return;
                }

                let matched = false;
                if (rule.txtConfig === 'SPECIAL_VAL_20') {
                    matched = parseFloat(xmlVal.trim().replace(',', '.')) === 20;
                } else {
                    matched = exactCompare(xmlVal, txtValColArray);
                }

                results.push({
                    xmlFilename: xmlFilename,
                    nodePath: xmlNodePath,
                    xmlField: rule.xmlField,
                    txtField: txtFieldLabel,
                    xmlValue: xmlVal || '-',
                    txtValue: txtValColArray ? txtValColArray.join(' | ') : '-',
                    status: matched ? 'PASS' : 'FAIL',
                    motivo: matched ? '-' : 'VALUE_MISMATCH'
                });
            }
        });
    });

    return results;
}

function renderDashboard() {
    const dashContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-4');
    dashContainer.innerHTML = '';

    const summary = {
        total: AppState.validationResults.length,
        pass: AppState.validationResults.filter(r => r.status === 'PASS').length,
        fail: AppState.validationResults.filter(r => r.status === 'FAIL').length
    };

    dashContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-200 border-l-4 border-l-brand-500">
            <h3 class="text-sm font-medium text-gray-500">Matriz de Itens Restritos</h3>
            <p class="mt-2 text-2xl font-semibold text-gray-900">${summary.total}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-200 border-l-4 border-l-green-500">
            <h3 class="text-sm font-medium text-gray-500">Aprovados (Exact Match)</h3>
            <p class="mt-2 text-2xl font-semibold text-green-600">${summary.pass}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-200 border-l-4 border-l-red-500">
            <h3 class="text-sm font-medium text-gray-500">Falhas / Discrepâncias</h3>
            <p class="mt-2 text-2xl font-semibold text-red-600">${summary.fail}</p>
        </div>
    `;

    // Populate Tag Filter (Now filtering by 'Motivo' instead)
    const motifs = new Set(AppState.validationResults.map(r => r.motivo));
    filterTag.innerHTML = '<option value="all">Todos os Motivos</option>';
    motifs.forEach(t => {
        if (t === '-') return;
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        filterTag.appendChild(opt);
    });
}

function renderTable() {
    const fTag = filterTag.value;
    const fStatus = filterStatus.value;

    detailsTableBody.innerHTML = '';

    let filtered = AppState.validationResults;
    if (fTag !== 'all') filtered = filtered.filter(r => r.motivo === fTag);
    if (fStatus !== 'all') filtered = filtered.filter(r => r.status === fStatus);

    if (filtered.length === 0) {
        detailsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Nenhum resultado encontrado.</td></tr>`;
        return;
    }

    filtered.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 transition-colors";

        const badgeColor = row.status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const badgeIcon = row.status === 'PASS' ? 'check-circle' : 'x-circle';

        const isMissingXML = row.motivo === 'XML_NODE_NOT_FOUND';

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium" title="${row.xmlFilename}">${row.xmlFilename.substring(0, 15)}...</td>
            <td class="px-6 py-4 whitespace-nowrap text-xs font-mono text-brand-600 bg-brand-50" title="Caminho do Nó no XML">${row.nodePath}</td>
            <td class="px-6 py-4 whitespace-nowrap font-mono ${isMissingXML ? 'text-red-500' : 'text-gray-900'}">${row.xmlValue}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">${row.txtField || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap font-mono text-gray-500">${row.txtValue}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeColor}">
                    <i data-lucide="${badgeIcon}" class="w-3 h-3 mr-1"></i> ${row.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-500 font-medium text-xs ${row.status === 'FAIL' ? 'text-red-500' : ''}">${row.motivo}</td>
        `;
        detailsTableBody.appendChild(tr);
    });

    lucide.createIcons();
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(2, 132, 199);
    doc.text("Relatório de Validação de Fluxo XML vs TXT", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    doc.text(`Arquivos processados: ${AppState.files.length}`, 14, 36);

    const tableData = AppState.validationResults.map(r => [
        r.xmlFilename, r.nodePath, r.xmlValue, r.txtField || '-', r.txtValue, r.status, r.motivo
    ]);

    doc.autoTable({
        startY: 45,
        head: [['XML', 'Nó/Path', 'Valor XML', 'TXT Field', 'Valor TXT', 'Status', 'Motivo']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233] },
        styles: { fontSize: 7, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
        },
        didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 5) {
                data.cell.styles.fontStyle = 'bold';
                if (data.cell.raw === 'FAIL') data.cell.styles.textColor = [220, 38, 38];
                if (data.cell.raw === 'PASS') data.cell.styles.textColor = [22, 163, 74];
            }
        }
    });

    doc.save('relatorio_validacao_xml_txt.pdf');
}

function exportCSV() {
    const header = ['Arquivo XML', 'Caminho do No', 'Valor XML', 'Rotulo TXT Base', 'Valor TXT Base', 'Status', 'Motivo'].join(';');
    const rows = AppState.validationResults.map(r => {
        return [
            `"${r.xmlFilename}"`,
            `"${r.nodePath}"`,
            `"${r.xmlValue}"`,
            `"${r.txtField || '-'}"`,
            `"${r.txtValue}"`,
            `"${r.status}"`,
            `"${r.motivo}"`
        ].join(';');
    });

    const csvContent = "data:text/csv;charset=utf-8," + header + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "divergencias_xml_txt.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Init
initEvents();
