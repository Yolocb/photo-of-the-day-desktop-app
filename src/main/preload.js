const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload-Skript für sichere Kommunikation zwischen Main- und Renderer-Prozess
 * Stellt eine sichere API für den Renderer-Prozess zur Verfügung
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Öffnet einen Dialog zur Verzeichnisauswahl
   * @returns {Promise<string|null>} Pfad zum ausgewählten Verzeichnis oder null
   */
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  /**
   * Durchsucht ein Verzeichnis nach Fotos und extrahiert Metadaten
   * @param {string} directoryPath - Pfad zum zu durchsuchenden Verzeichnis
   * @returns {Promise<Array>} Array mit Foto-Objekten und Metadaten
   */
  scanPhotos: (directoryPath) => ipcRenderer.invoke('scan-photos', directoryPath),

  /**
   * Filtert Fotos nach einem bestimmten Kalendertag (Tag und Monat)
   * @param {Array} photos - Array mit Foto-Objekten
   * @param {number} targetDay - Ziel-Tag (1-31)
   * @param {number} targetMonth - Ziel-Monat (1-12)
   * @returns {Promise<Array>} Gefilterte Foto-Objekte
   */
  filterPhotosByDate: (photos, targetDay, targetMonth) => 
    ipcRenderer.invoke('filter-photos-by-date', photos, targetDay, targetMonth),

  /**
   * Konvertiert einen Dateipfad zu einer file:// URL
   * @param {string} filePath - Pfad zur Datei
   * @returns {Promise<string>} File-URL für die Verwendung in img-Tags
   */
  getFileUrl: (filePath) => ipcRenderer.invoke('get-file-url', filePath),

  /**
   * Window-Control-Funktionen für custom titlebar
   */
  windowControls: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  },

  /**
   * Aktualisiert die Titlebar-Farben basierend auf dem aktuellen Theme
   * @param {boolean} isDarkTheme - true für Dark Theme, false für Light Theme
   * @returns {Promise<boolean>} Erfolg der Aktualisierung
   */
  updateTitlebarTheme: (isDarkTheme) => ipcRenderer.invoke('update-titlebar-theme', isDarkTheme),

  /**
   * Progress-Event-Listener für Performance-optimierte Foto-Verarbeitung
   * @param {function} callback - Callback-Funktion für Progress-Updates
   */
  onScanProgress: (callback) => {
    ipcRenderer.on('scan-progress', (event, data) => callback(data));
  },

  /**
   * Entfernt Progress-Event-Listener
   */
  removeScanProgressListener: () => {
    ipcRenderer.removeAllListeners('scan-progress');
  }
});
