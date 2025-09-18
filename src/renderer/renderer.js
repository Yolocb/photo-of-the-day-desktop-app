/**
 * Renderer-Prozess für Photo of the Day App
 * Verwaltet die Benutzeroberfläche und kommuniziert mit dem Main-Prozess
 */

// Globale Variablen
let allPhotos = [];
let currentPhotos = [];
let selectedDirectory = null;
let currentViewMode = 'thumbnail'; // 'thumbnail', 'grid', 'collage', or 'list'
let intersectionObserver = null; // Für Lazy Loading

// DOM-Elemente
const elements = {
    // Window controls
    minimizeBtn: document.getElementById('minimizeBtn'),
    maximizeBtn: document.getElementById('maximizeBtn'),
    closeBtn: document.getElementById('closeBtn'),
    
    // Theme toggle
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.querySelector('.theme-icon'),
    
    // Buttons
    selectDirectoryBtn: document.getElementById('selectDirectoryBtn'),
    filterBtn: document.getElementById('filterBtn'),
    thumbnailViewBtn: document.getElementById('thumbnailViewBtn'),
    gridViewBtn: document.getElementById('gridViewBtn'),
    collageViewBtn: document.getElementById('collageViewBtn'),
    listViewBtn: document.getElementById('listViewBtn'),
    selectDifferentDateBtn: document.getElementById('selectDifferentDateBtn'),
    
    // Date selectors
    daySelect: document.getElementById('daySelect'),
    monthSelect: document.getElementById('monthSelect'),
    
    // Info displays
    currentDate: document.getElementById('currentDate'),
    photoCount: document.getElementById('photoCount'),
    directoryInfo: document.getElementById('directoryInfo'),
    directoryPath: document.getElementById('directoryPath'),
    
    // Stats
    statsPanel: document.getElementById('statsPanel'),
    totalPhotos: document.getElementById('totalPhotos'),
    filteredPhotos: document.getElementById('filteredPhotos'),
    exifPhotos: document.getElementById('exifPhotos'),
    
    // Gallery states
    loadingIndicator: document.getElementById('loadingIndicator'),
    emptyState: document.getElementById('emptyState'),
    photoGallery: document.getElementById('photoGallery'),
    galleryHeaderSection: document.getElementById('galleryHeaderSection'),
    noPhotosState: document.getElementById('noPhotosState'),
    noPhotosMessage: document.getElementById('noPhotosMessage'),
    galleryTitle: document.getElementById('galleryTitle'),
    galleryGrid: document.getElementById('galleryGrid'),
    
    // Modal
    imageModal: document.getElementById('imageModal'),
    modalImage: document.getElementById('modalImage'),
    modalTitle: document.getElementById('modalTitle'),
    modalFileName: document.getElementById('modalFileName'),
    modalDateTime: document.getElementById('modalDateTime'),
    modalFilePath: document.getElementById('modalFilePath'),
    modalExifStatus: document.getElementById('modalExifStatus'),
    
    // Toast container
    toastContainer: document.getElementById('toastContainer')
};

/**
 * Initialisierung der App
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Photo of the Day App gestartet');
    
    // Initialisiere UI
    initializeUI();
    
    // Event Listeners registrieren
    registerEventListeners();
    
    // Prüfe, ob electronAPI verfügbar ist
    if (!window.electronAPI) {
        showToast('Fehler: Electron API nicht verfügbar!', 'error');
        return;
    }
    
    console.log('Initialisierung abgeschlossen');
});

/**
 * Initialisiert die Benutzeroberfläche
 */
function initializeUI() {
    // Aktuelles Datum anzeigen
    updateCurrentDate();
    
    // Tag-Select mit Optionen füllen
    populateDaySelect();
    
    // Standard-Datum auf heute setzen
    setCurrentDateInSelectors();
    
    // Initial-State anzeigen
    showEmptyState();
}

/**
 * Registriert alle Event Listeners
 */
function registerEventListeners() {
    // Window Controls
    elements.minimizeBtn?.addEventListener('click', async () => {
        await window.electronAPI.windowControls.minimize();
    });
    
    elements.maximizeBtn?.addEventListener('click', async () => {
        await window.electronAPI.windowControls.maximize();
    });
    
    elements.closeBtn?.addEventListener('click', async () => {
        await window.electronAPI.windowControls.close();
    });
    
    // Theme Toggle
    elements.themeToggle?.addEventListener('click', toggleTheme);
    
    // Verzeichnis auswählen
    elements.selectDirectoryBtn.addEventListener('click', selectDirectory);
    
    // Fotos filtern
    elements.filterBtn.addEventListener('click', filterPhotos);
    
    // View Mode ändern - Neue Layout-Optionen
    elements.thumbnailViewBtn.addEventListener('click', () => setViewMode('thumbnail'));
    elements.gridViewBtn.addEventListener('click', () => setViewMode('grid'));
    elements.collageViewBtn.addEventListener('click', () => setViewMode('collage'));
    elements.listViewBtn.addEventListener('click', () => setViewMode('list'));
    
    // Anderes Datum auswählen
    elements.selectDifferentDateBtn.addEventListener('click', () => {
        showEmptyState();
        elements.daySelect.focus();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Behandelt Tastatur-Shortcuts
 */
function handleKeyboardShortcuts(event) {
    // ESC zum Schließen des Modals
    if (event.key === 'Escape') {
        closeModal();
    }
    
    // Ctrl+O zum Öffnen eines Verzeichnisses
    if (event.ctrlKey && event.key === 'o') {
        event.preventDefault();
        selectDirectory();
    }
    
    // F5 zum Aktualisieren
    if (event.key === 'F5') {
        event.preventDefault();
        if (selectedDirectory) {
            scanPhotosInDirectory();
        }
    }
}

/**
 * Aktualisiert die Datumsanzeige im Header
 */
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    elements.currentDate.textContent = now.toLocaleDateString('de-DE', options);
}

/**
 * Füllt das Tag-Select mit Optionen 1-31
 */
function populateDaySelect() {
    elements.daySelect.innerHTML = '';
    for (let day = 1; day <= 31; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day;
        elements.daySelect.appendChild(option);
    }
}

/**
 * Setzt die aktuellen Datum-Selektoren auf heute
 */
function setCurrentDateInSelectors() {
    const now = new Date();
    elements.daySelect.value = now.getDate();
    elements.monthSelect.value = now.getMonth() + 1;
}

/**
 * Öffnet Dialog zur Verzeichnisauswahl
 */
async function selectDirectory() {
    try {
        showLoading('Verzeichnis wird ausgewählt...');
        
        const directoryPath = await window.electronAPI.selectDirectory();
        
        if (directoryPath) {
            selectedDirectory = directoryPath;
            elements.directoryPath.textContent = directoryPath;
            elements.directoryInfo.style.display = 'block';
            elements.filterBtn.disabled = false;
            
            showToast(`Verzeichnis ausgewählt: ${directoryPath}`);
            
            // Automatisch Fotos durchsuchen
            await scanPhotosInDirectory();
        } else {
            hideLoading();
            showToast('Keine Verzeichnis ausgewählt', 'warning');
        }
    } catch (error) {
        hideLoading();
        console.error('Fehler bei Verzeichnisauswahl:', error);
        showToast('Fehler beim Auswählen des Verzeichnisses', 'error');
    }
}

/**
 * Performance-optimiertes Durchsuchen großer Foto-Sammlungen
 * Unterstützt Real-time Progress-Updates und Worker-Threading
 */
async function scanPhotosInDirectory() {
    if (!selectedDirectory) return;
    
    try {
        // Setup Progress-Tracking
        let progressData = { processed: 0, total: 0, phase: 'starting' };
        
        // Progress-Listener registrieren
        window.electronAPI.onScanProgress((data) => {
            progressData = data;
            updateScanProgress(data);
        });
        
        showLoading('Bereite Foto-Analyse vor...');
        
        console.log(`🔍 Starte Performance-optimierte Durchsuchung: ${selectedDirectory}`);
        const startTime = Date.now();
        
        // Starte Performance-optimierte Verarbeitung
        allPhotos = await window.electronAPI.scanPhotos(selectedDirectory);
        
        // Cleanup Progress-Listener
        window.electronAPI.removeScanProgressListener();
        
        const endTime = Date.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`🎉 Durchsuchung abgeschlossen: ${allPhotos.length} Fotos in ${totalTime}s`);
        
        // Statistiken aktualisieren
        updateStatistics();
        
        // Performance-Metriken anzeigen
        if (progressData.photosPerSecond) {
            showToast(`${allPhotos.length} Fotos analysiert (${progressData.photosPerSecond} Fotos/s)`, 'success');
        } else {
            showToast(`${allPhotos.length} Fotos erfolgreich durchsucht`, 'success');
        }
        
        // Automatisch filtern basierend auf aktueller Datumsauswahl
        await filterPhotosInternal();
        
        hideLoading();
        
    } catch (error) {
        // Cleanup bei Fehler
        window.electronAPI.removeScanProgressListener();
        hideLoading();
        console.error('❌ Fehler beim Durchsuchen der Fotos:', error);
        showToast('Fehler beim Durchsuchen der Fotos', 'error');
    }
}

/**
 * Aktualisiert die Progress-Anzeige während der Foto-Verarbeitung
 * @param {Object} data - Progress-Daten vom Main-Prozess
 */
function updateScanProgress(data) {
    const { phase, processed, total, message, photosPerSecond, processingTime } = data;
    
    // Progress-Text aktualisieren
    const loadingText = elements.loadingIndicator.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = message || 'Verarbeite Fotos...';
    }
    
    // Progress-Bar erstellen falls nicht vorhanden
    let progressBar = elements.loadingIndicator.querySelector('.progress-bar');
    if (!progressBar && total > 0) {
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = `
            <div class="progress-bar-container">
                <div class="progress-bar-fill"></div>
                <div class="progress-bar-text">0%</div>
            </div>
            <div class="progress-details">
                <span class="progress-count">0 / 0</span>
                <span class="progress-speed"></span>
            </div>
        `;
        elements.loadingIndicator.appendChild(progressBar);
    }
    
    // Progress-Bar Update
    if (progressBar && total > 0) {
        const percentage = Math.round((processed / total) * 100);
        const progressFill = progressBar.querySelector('.progress-bar-fill');
        const progressText = progressBar.querySelector('.progress-bar-text');
        const progressCount = progressBar.querySelector('.progress-count');
        const progressSpeed = progressBar.querySelector('.progress-speed');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            progressFill.style.background = `linear-gradient(90deg, 
                #667eea 0%, 
                #764ba2 ${percentage}%, 
                #667eea 100%)`;
        }
        
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }
        
        if (progressCount) {
            progressCount.textContent = `${processed.toLocaleString()} / ${total.toLocaleString()}`;
        }
        
        if (progressSpeed && photosPerSecond) {
            progressSpeed.textContent = `${photosPerSecond} Fotos/s`;
        }
    }
    
    // Console-Logging für Debugging
    if (phase === 'complete') {
        console.log(`✅ Verarbeitung abgeschlossen: ${processed}/${total} Fotos`);
        if (processingTime && photosPerSecond) {
            console.log(`⚡ Performance: ${processingTime}s, ${photosPerSecond} Fotos/Sekunde`);
        }
    } else if (data.batchComplete) {
        console.log(`📦 Batch ${data.batchIndex + 1} abgeschlossen`);
    }
}

/**
 * Filtert Fotos basierend auf ausgewähltem Datum
 */
async function filterPhotos() {
    await filterPhotosInternal();
}

/**
 * Interne Filterfunktion
 */
async function filterPhotosInternal() {
    if (allPhotos.length === 0) {
        showToast('Keine Fotos zum Filtern vorhanden', 'warning');
        return;
    }
    
    try {
        const selectedDay = parseInt(elements.daySelect.value);
        const selectedMonth = parseInt(elements.monthSelect.value);
        
        showLoading('Fotos werden gefiltert...');
        
        console.log(`Filtere Fotos für ${selectedDay}.${selectedMonth}`);
        
        currentPhotos = await window.electronAPI.filterPhotosByDate(
            allPhotos, 
            selectedDay, 
            selectedMonth
        );
        
        console.log(`${currentPhotos.length} Fotos gefiltert`);
        
        // UI aktualisieren
        updatePhotoCount();
        updateGalleryTitle(selectedDay, selectedMonth);
        
        if (currentPhotos.length > 0) {
            await displayPhotos();
            showPhotoGallery();
        } else {
            showNoPhotosState(selectedDay, selectedMonth);
        }
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('Fehler beim Filtern der Fotos:', error);
        showToast('Fehler beim Filtern der Fotos', 'error');
    }
}

/**
 * Zeigt die gefilterten Fotos in der Galerie an mit Performance-Optimierungen
 */
async function displayPhotos() {
    elements.galleryGrid.innerHTML = '';
    
    // Performance-optimierte Anzeige mit Lazy Loading
    for (let i = 0; i < currentPhotos.length; i++) {
        const photo = currentPhotos[i];
        const photoElement = await createPhotoElementEnhanced(photo, i);
        elements.galleryGrid.appendChild(photoElement);
    }
    
    // View Mode anwenden
    updateViewMode();
    
    // Lazy Loading initialisieren
    initializeLazyLoading();
    
    console.log(`🖼️ ${currentPhotos.length} Fotos in ${currentViewMode}-Modus angezeigt`);
}

/**
 * Erstellt ein HTML-Element für ein Foto
 */
async function createPhotoElement(photo) {
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    photoItem.addEventListener('click', () => openPhotoModal(photo));
    
    try {
        // File URL für das Bild erstellen
        const fileUrl = await window.electronAPI.getFileUrl(photo.filePath);
        
        const photoDate = new Date(photo.dateTime);
        const dateString = photoDate.toLocaleDateString('de-DE');
        const yearString = photoDate.getFullYear().toString();
        
        photoItem.innerHTML = `
            <img class="photo-thumbnail" 
                 src="${fileUrl}" 
                 alt="${photo.fileName}"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjdGQUZDIi8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDEwMEg3NUwxMDAgNzVaIiBmaWxsPSIjQ0JENUUwIi8+CjwvY3ZnPg=='" />
            <div class="photo-info">
                <div class="photo-filename">${photo.fileName}</div>
                <div class="photo-date">${dateString}</div>
                <div class="photo-year">
                    ${yearString}
                    <span class="exif-indicator ${photo.hasExifDate ? 'has-exif' : 'no-exif'}" 
                          title="${photo.hasExifDate ? 'EXIF-Datum verfügbar' : 'Kein EXIF-Datum, Datei-Datum verwendet'}"></span>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Fehler beim Erstellen des Foto-Elements:', error);
        
        // Fallback ohne Bild
        photoItem.innerHTML = `
            <div class="photo-thumbnail" style="display: flex; align-items: center; justify-content: center; background: #f7fafc; color: #718096;">
                📷 Bild nicht verfügbar
            </div>
            <div class="photo-info">
                <div class="photo-filename">${photo.fileName}</div>
                <div class="photo-date">Fehler beim Laden</div>
            </div>
        `;
    }
    
    return photoItem;
}

/**
 * Öffnet das Modal mit Foto-Details
 */
async function openPhotoModal(photo) {
    try {
        const fileUrl = await window.electronAPI.getFileUrl(photo.filePath);
        const photoDate = new Date(photo.dateTime);
        
        elements.modalImage.src = fileUrl;
        elements.modalTitle.textContent = 'Foto-Details';
        elements.modalFileName.textContent = photo.fileName;
        elements.modalDateTime.textContent = photoDate.toLocaleString('de-DE');
        elements.modalFilePath.textContent = photo.filePath;
        elements.modalExifStatus.textContent = photo.hasExifDate ? 
            'EXIF-Datum verfügbar' : 'Kein EXIF-Datum (Datei-Datum verwendet)';
        
        elements.imageModal.style.display = 'flex';
        
    } catch (error) {
        console.error('Fehler beim Öffnen des Foto-Modals:', error);
        showToast('Fehler beim Öffnen des Fotos', 'error');
    }
}

/**
 * Schließt das Foto-Modal
 */
function closeModal() {
    elements.imageModal.style.display = 'none';
    elements.modalImage.src = '';
}

// Globale Funktion für Modal-Schließen (wird vom HTML aufgerufen)
window.closeModal = closeModal;

/**
 * Setzt den View-Modus (Thumbnail oder Liste)
 */
function setViewMode(mode) {
    currentViewMode = mode;
    updateViewMode();
    
    // Button-States aktualisieren
    if (mode === 'thumbnail') {
        elements.thumbnailViewBtn.style.background = '#667eea';
        elements.thumbnailViewBtn.style.color = 'white';
        elements.listViewBtn.style.background = '#e2e8f0';
        elements.listViewBtn.style.color = '#4a5568';
    } else {
        elements.listViewBtn.style.background = '#667eea';
        elements.listViewBtn.style.color = 'white';
        elements.thumbnailViewBtn.style.background = '#e2e8f0';
        elements.thumbnailViewBtn.style.color = '#4a5568';
    }
}

/**
 * Aktualisiert die Darstellung basierend auf dem View-Modus
 */
function updateViewMode() {
    if (currentViewMode === 'list') {
        elements.galleryGrid.classList.add('list-view');
        elements.galleryGrid.querySelectorAll('.photo-item').forEach(item => {
            item.classList.add('list-view');
        });
    } else {
        elements.galleryGrid.classList.remove('list-view');
        elements.galleryGrid.querySelectorAll('.photo-item').forEach(item => {
            item.classList.remove('list-view');
        });
    }
}

/**
 * Aktualisiert die Statistiken
 */
function updateStatistics() {
    const exifPhotosCount = allPhotos.filter(photo => photo.hasExifDate).length;
    
    elements.totalPhotos.textContent = allPhotos.length;
    elements.exifPhotos.textContent = exifPhotosCount;
    elements.statsPanel.style.display = 'block';
}

/**
 * Aktualisiert die Foto-Anzahl-Anzeige
 */
function updatePhotoCount() {
    if (currentPhotos.length > 0) {
        elements.photoCount.textContent = `${currentPhotos.length} Foto${currentPhotos.length !== 1 ? 's' : ''} gefunden`;
    } else {
        elements.photoCount.textContent = 'Keine Fotos gefunden';
    }
    
    elements.filteredPhotos.textContent = currentPhotos.length;
}

/**
 * Aktualisiert den Galerie-Titel
 */
function updateGalleryTitle(day, month) {
    const monthNames = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    
    elements.galleryTitle.textContent = `Fotos vom ${day}. ${monthNames[month - 1]}`;
}

/**
 * Zeigt den Lade-Indikator
 */
function showLoading(message = 'Lädt...') {
    elements.loadingIndicator.style.display = 'flex';
    elements.loadingIndicator.querySelector('.loading-text').textContent = message;
    
    // Andere States ausblenden
    elements.emptyState.style.display = 'none';
    elements.photoGallery.style.display = 'none';
    elements.noPhotosState.style.display = 'none';
}

/**
 * Versteckt den Lade-Indikator
 */
function hideLoading() {
    elements.loadingIndicator.style.display = 'none';
}

/**
 * Zeigt den leeren Zustand
 */
function showEmptyState() {
    elements.emptyState.style.display = 'flex';
    
    // Andere States ausblenden
    elements.loadingIndicator.style.display = 'none';
    elements.photoGallery.style.display = 'none';
    elements.noPhotosState.style.display = 'none';
}

/**
 * Zeigt die Foto-Galerie
 */
function showPhotoGallery() {
    elements.photoGallery.style.display = 'block';
    elements.galleryHeaderSection.style.display = 'flex';
    
    // Andere States ausblenden
    elements.emptyState.style.display = 'none';
    elements.loadingIndicator.style.display = 'none';
    elements.noPhotosState.style.display = 'none';
}

/**
 * Zeigt den "Keine Fotos gefunden" Zustand
 */
function showNoPhotosState(day, month) {
    const monthNames = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    
    elements.noPhotosMessage.textContent = 
        `Für den ${day}. ${monthNames[month - 1]} wurden keine Fotos gefunden.`;
    elements.noPhotosState.style.display = 'flex';
    
    // Andere States ausblenden
    elements.emptyState.style.display = 'none';
    elements.loadingIndicator.style.display = 'none';
    elements.photoGallery.style.display = 'none';
}

/**
 * Wechselt zwischen Dark und Light Theme
 */
async function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    
    if (isDark) {
        // Wechsel zu Light Theme
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        
        // Icon zu Sun wechseln
        if (elements.themeIcon) {
            elements.themeIcon.setAttribute('data-lucide', 'sun');
            lucide.createIcons();
        }
        
        // Titlebar-Theme aktualisieren
        await window.electronAPI.updateTitlebarTheme(false);
        
        localStorage.setItem('theme', 'light');
        showToast('Light Theme aktiviert');
    } else {
        // Wechsel zu Dark Theme
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        
        // Icon zu Moon wechseln
        if (elements.themeIcon) {
            elements.themeIcon.setAttribute('data-lucide', 'moon');
            lucide.createIcons();
        }
        
        // Titlebar-Theme aktualisieren
        await window.electronAPI.updateTitlebarTheme(true);
        
        localStorage.setItem('theme', 'dark');
        showToast('Dark Theme aktiviert');
    }
}

/**
 * Lädt das gespeicherte Theme beim Start
 */
async function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const isDarkTheme = savedTheme === 'dark';
    
    // Alle Theme-Klassen entfernen
    body.classList.remove('light-theme', 'dark-theme');
    
    if (isDarkTheme) {
        body.classList.add('dark-theme');
        
        if (elements.themeIcon) {
            elements.themeIcon.setAttribute('data-lucide', 'moon');
        }
    } else {
        // Default: Light Theme
        body.classList.add('light-theme');
        
        if (elements.themeIcon) {
            elements.themeIcon.setAttribute('data-lucide', 'sun');
        }
    }
    
    // Titlebar-Theme beim Start setzen
    if (window.electronAPI && window.electronAPI.updateTitlebarTheme) {
        try {
            await window.electronAPI.updateTitlebarTheme(isDarkTheme);
        } catch (error) {
            console.error('Fehler beim Setzen des initialen Titlebar-Themes:', error);
        }
    }
    
    // Icons neu laden
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    console.log(`Theme geladen: ${savedTheme || 'light'}`);
}

/**
 * Erweiterte View-Mode-Umschaltung für alle Layout-Optionen
 * Unterstützt: thumbnail, grid, collage, list
 */
function setViewMode(mode) {
    const validModes = ['thumbnail', 'grid', 'collage', 'list'];
    if (!validModes.includes(mode)) {
        console.warn(`Ungültiger View-Mode: ${mode}`);
        return;
    }
    
    currentViewMode = mode;
    
    // Layout-Wechsel Animation
    animateLayoutTransition(() => {
        updateViewMode();
        initializeLazyLoading();
    });
    
    // Button-States für alle Modi aktualisieren
    elements.thumbnailViewBtn.classList.toggle('active', mode === 'thumbnail');
    elements.gridViewBtn.classList.toggle('active', mode === 'grid');
    elements.collageViewBtn.classList.toggle('active', mode === 'collage');
    elements.listViewBtn.classList.toggle('active', mode === 'list');
    
    // User Feedback
    const modeNames = {
        'thumbnail': 'Standard-Thumbnails',
        'grid': 'Mehrspaltige Galerie',
        'collage': 'Künstlerische Collage',
        'list': 'Listen-Ansicht'
    };
    
    showToast(`Layout geändert: ${modeNames[mode]}`);
    
    console.log(`📱 View-Mode gewechselt zu: ${mode}`);
}

/**
 * Erweiterte updateViewMode Funktion für alle Layout-Modi
 */
function updateViewMode() {
    const galleryGrid = elements.galleryGrid;
    
    // Alle View-Klassen entfernen
    galleryGrid.classList.remove('list-view', 'grid-view', 'collage-view');
    
    // Entsprechende Klasse hinzufügen
    switch (currentViewMode) {
        case 'grid':
            galleryGrid.classList.add('grid-view');
            break;
        case 'collage':
            galleryGrid.classList.add('collage-view');
            setupCollageLayout();
            break;
        case 'list':
            galleryGrid.classList.add('list-view');
            break;
        case 'thumbnail':
        default:
            // Standard Thumbnail-View (keine spezielle Klasse)
            break;
    }
    
    // Photo-Item Klassen aktualisieren
    const photoItems = galleryGrid.querySelectorAll('.photo-item');
    photoItems.forEach(item => {
        item.classList.remove('list-view');
        if (currentViewMode === 'list') {
            item.classList.add('list-view');
        }
    });
}

/**
 * Initialisiert Lazy Loading für Performance-Optimierung
 */
function initializeLazyLoading() {
    // Cleanup existing observer
    if (intersectionObserver) {
        intersectionObserver.disconnect();
    }
    
    // Erstelle neuen Intersection Observer für Lazy Loading
    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                
                // Lade Bild nur wenn noch nicht geladen
                if (img.classList.contains('loading')) {
                    loadImageLazily(img);
                    intersectionObserver.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px' // Lade Bilder 50px bevor sie sichtbar werden
    });
    
    // Überwache alle Thumbnails
    const thumbnails = elements.galleryGrid.querySelectorAll('.photo-thumbnail');
    thumbnails.forEach(thumbnail => {
        if (thumbnail.src.startsWith('data:') || !thumbnail.complete) {
            thumbnail.classList.add('loading');
            intersectionObserver.observe(thumbnail);
        }
    });
}

/**
 * Lädt ein Bild lazy
 */
async function loadImageLazily(img) {
    try {
        img.classList.remove('loading');
        
        // Smooth fade-in Animation
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease-in-out';
        
        img.onload = () => {
            img.style.opacity = '1';
        };
        
        // Trigger load falls bereits cached
        if (img.complete) {
            img.style.opacity = '1';
        }
        
    } catch (error) {
        console.error('Fehler beim Lazy Loading:', error);
        img.classList.remove('loading');
    }
}

/**
 * Setup für Collage-Layout mit dynamischen Positionen
 */
function setupCollageLayout() {
    const photoItems = elements.galleryGrid.querySelectorAll('.photo-item');
    
    // Verhindere Überlappung bei vielen Bildern
    if (photoItems.length > 10) {
        // Für mehr als 10 Bilder - kompakteres Layout
        photoItems.forEach((item, index) => {
            if (index >= 10) {
                item.style.display = 'none';
            }
        });
        
        showToast(`Collage-Ansicht zeigt die ersten 10 von ${photoItems.length} Fotos`, 'info');
    }
    
    // Dynamic Positioning für bessere Verteilung
    if (photoItems.length <= 5) {
        adjustCollageForFewItems(photoItems);
    }
}

/**
 * Anpassung der Collage für wenige Bilder
 */
function adjustCollageForFewItems(items) {
    const positions = [
        { width: '320px', height: '240px', top: '20%', left: '20%', rotate: '-2deg', zIndex: 5 },
        { width: '280px', height: '350px', top: '25%', right: '20%', rotate: '3deg', zIndex: 4 },
        { width: '240px', height: '200px', bottom: '30%', left: '15%', rotate: '4deg', zIndex: 6 },
        { width: '300px', height: '220px', top: '50%', left: '40%', rotate: '-1deg', zIndex: 3 },
        { width: '260px', height: '320px', bottom: '15%', right: '25%', rotate: '2deg', zIndex: 4 }
    ];
    
    items.forEach((item, index) => {
        if (positions[index]) {
            const pos = positions[index];
            item.style.width = pos.width;
            item.style.height = pos.height;
            item.style.top = pos.top || 'auto';
            item.style.bottom = pos.bottom || 'auto';
            item.style.left = pos.left || 'auto';
            item.style.right = pos.right || 'auto';
            item.style.transform = `rotate(${pos.rotate})`;
            item.style.zIndex = pos.zIndex;
        }
    });
}

/**
 * Animiert Layout-Übergänge
 */
function animateLayoutTransition(callback) {
    const galleryGrid = elements.galleryGrid;
    
    // Fade-out Animation
    galleryGrid.classList.add('layout-transition');
    
    setTimeout(() => {
        // Layout ändern
        callback();
        
        // Fade-in Animation
        galleryGrid.classList.remove('layout-transition');
        galleryGrid.classList.add('layout-active');
        
        setTimeout(() => {
            galleryGrid.classList.remove('layout-active');
        }, 300);
        
    }, 150);
}

/**
 * Erweiterte createPhotoElement Funktion mit Lazy Loading Support
 */
async function createPhotoElementEnhanced(photo, index = 0) {
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    photoItem.addEventListener('click', () => openPhotoModal(photo));
    
    // Lazy Loading für bessere Performance
    const shouldLazyLoad = index > 8; // Erste 8 Bilder sofort laden
    
    try {
        const photoDate = new Date(photo.dateTime);
        const dateString = photoDate.toLocaleDateString('de-DE');
        const yearString = photoDate.getFullYear().toString();
        
        let imgSrc = '';
        let imgClass = 'photo-thumbnail';
        
        if (shouldLazyLoad) {
            // Placeholder für Lazy Loading
            imgSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjdGQUZDIi8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDEwMEg3NUwxMDAgNzVaIiBmaWxsPSIjQ0JENUUwIi8+CjwvY3ZnPg==';
            imgClass += ' loading';
            photoItem.dataset.imagePath = photo.filePath;
        } else {
            // Sofort laden
            imgSrc = await window.electronAPI.getFileUrl(photo.filePath);
        }
        
        photoItem.innerHTML = `
            <img class="${imgClass}" 
                 src="${imgSrc}" 
                 alt="${photo.fileName}"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjdGQUZDIi8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDEwMEg3NUwxMDAgNzVaIiBmaWxsPSIjQ0JENUUwIi8+PC9zdmc+'" />
            <div class="photo-info">
                <div class="photo-filename">${photo.fileName}</div>
                <div class="photo-date">${dateString}</div>
                <div class="photo-year">
                    ${yearString}
                    <span class="exif-indicator ${photo.hasExifDate ? 'has-exif' : 'no-exif'}" 
                          title="${photo.hasExifDate ? 'EXIF-Datum verfügbar' : 'Kein EXIF-Datum, Datei-Datum verwendet'}"></span>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Fehler beim Erstellen des Foto-Elements:', error);
        
        // Fallback ohne Bild
        photoItem.innerHTML = `
            <div class="photo-thumbnail loading" style="display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); color: var(--text-muted);">
                📷
            </div>
            <div class="photo-info">
                <div class="photo-filename">${photo.fileName}</div>
                <div class="photo-date">Fehler beim Laden</div>
            </div>
        `;
    }
    
    return photoItem;
}

/**
 * Zeigt eine Toast-Benachrichtigung
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    // Toast nach 4 Sekunden automatisch entfernen
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
    
    console.log(`Toast [${type}]: ${message}`);
}

// Erweiterte Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    // Theme laden
    loadSavedTheme();
    
    // View-Mode initialisieren
    setViewMode('thumbnail');
    
    // Gallery Header initial ausblenden
    if (elements.galleryHeaderSection) {
        elements.galleryHeaderSection.style.display = 'none';
    }
});
