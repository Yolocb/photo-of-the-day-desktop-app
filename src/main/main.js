const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const glob = require('glob');
const exifr = require('exifr');
const { Worker } = require('worker_threads');
const os = require('os');

// Hauptfenster der Anwendung
let mainWindow;

/**
 * Erstellt das Hauptfenster der Anwendung
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Custom titlebar
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#333333',
      height: 40
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
    backgroundColor: '#f8fafc',
    vibrancy: 'under-window', // macOS vibrancy effect
    visualEffectState: 'active'
  });

  // Lade die HTML-Datei
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Zeige das Fenster erst, wenn es fertig geladen ist
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Entwicklungstools in Development-Modus öffnen
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * App-Event-Handler
 */
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/**
 * IPC-Handler für Verzeichnisauswahl
 */
ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Foto-Verzeichnis auswählen'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Fehler bei Verzeichnisauswahl:', error);
    return null;
  }
});

/**
 * Performance-optimierter IPC-Handler für das Durchsuchen großer Foto-Sammlungen
 * Nutzt Worker-Threads und Batch-Processing für maximale Geschwindigkeit
 */
ipcMain.handle('scan-photos', async (event, directoryPath) => {
  const startTime = Date.now();
  
  try {
    // Unterstützte Bildformate
    const imageExtensions = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp', 'gif', 'webp'];
    const patterns = imageExtensions.map(ext => `**/*.${ext}`);
    
    console.log(`🔍 Durchsuche Verzeichnis: ${directoryPath}`);
    
    // Optimierte Datei-Suche mit einzelnem glob-Aufruf
    const pattern = `**/*.{${imageExtensions.join(',')}}`;
    const imageFiles = glob.sync(pattern, { 
      cwd: directoryPath, 
      nocase: true,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/thumbs.db', '**/.DS_Store']
    });

    console.log(`📸 ${imageFiles.length} Bilddateien gefunden`);

    if (imageFiles.length === 0) {
      return [];
    }

    // Sende initialen Progress
    event.sender.send('scan-progress', {
      phase: 'analyzing',
      processed: 0,
      total: imageFiles.length,
      message: 'Bereite Analyse vor...'
    });

    // Performance-optimierte Batch-Verarbeitung
    const cpuCount = Math.min(os.cpus().length, 8); // Max 8 Worker für optimale Performance
    const optimalBatchSize = Math.max(50, Math.ceil(imageFiles.length / (cpuCount * 2)));
    
    // Teile Dateien in Batches auf
    const batches = [];
    for (let i = 0; i < imageFiles.length; i += optimalBatchSize) {
      batches.push(imageFiles.slice(i, i + optimalBatchSize));
    }

    console.log(`⚡ Verarbeite ${imageFiles.length} Fotos in ${batches.length} Batches mit ${cpuCount} Worker-Threads`);

    const allResults = [];
    const workers = [];
    const workerPromises = [];
    let completedBatches = 0;
    let totalProcessed = 0;

    // Worker-Pool für parallele Verarbeitung
    const processedBatches = new Array(batches.length).fill(false);
    
    for (let i = 0; i < Math.min(cpuCount, batches.length); i++) {
      const worker = new Worker(path.join(__dirname, 'photo-worker.js'), {
        workerData: {
          filePaths: batches[i],
          batchIndex: i,
          totalBatches: batches.length
        }
      });

      workers.push(worker);

      const workerPromise = new Promise((resolve, reject) => {
        worker.on('message', (message) => {
          switch (message.type) {
            case 'batch-start':
              event.sender.send('scan-progress', {
                phase: 'processing',
                processed: totalProcessed,
                total: imageFiles.length,
                message: `Verarbeite Batch ${message.batchIndex + 1}/${message.totalBatches}...`,
                batchIndex: message.batchIndex
              });
              break;

            case 'batch-progress':
              const globalProcessed = totalProcessed + message.processed;
              event.sender.send('scan-progress', {
                phase: 'processing',
                processed: globalProcessed,
                total: imageFiles.length,
                message: `Analysiere Fotos... (${globalProcessed}/${imageFiles.length})`,
                batchIndex: message.batchIndex
              });
              break;

            case 'batch-complete':
              allResults.push(...message.results);
              processedBatches[message.batchIndex] = true;
              completedBatches++;
              totalProcessed += message.total;
              
              console.log(`✅ Batch ${message.batchIndex + 1}/${batches.length} abgeschlossen: ${message.processed}/${message.total} Fotos verarbeitet`);
              
              event.sender.send('scan-progress', {
                phase: 'processing',
                processed: totalProcessed,
                total: imageFiles.length,
                message: `Batch ${completedBatches}/${batches.length} abgeschlossen`,
                batchIndex: message.batchIndex,
                batchComplete: true
              });
              break;

            case 'worker-complete':
              resolve();
              break;

            case 'worker-error':
              console.error(`❌ Worker Fehler in Batch ${message.batchIndex}:`, message.error);
              reject(new Error(`Worker-Fehler: ${message.error}`));
              break;
          }
        });

        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker beendet mit Exit-Code ${code}`));
          }
        });
      });

      workerPromises.push(workerPromise);
    }

    // Verarbeite verbleibende Batches wenn mehr Batches als Worker vorhanden
    let nextBatchIndex = Math.min(cpuCount, batches.length);
    
    const processNextBatch = async (workerIndex) => {
      if (nextBatchIndex < batches.length) {
        const batchIndex = nextBatchIndex++;
        const worker = workers[workerIndex];
        
        // Terminiere alten Worker und erstelle neuen für nächsten Batch
        await worker.terminate();
        
        const newWorker = new Worker(path.join(__dirname, 'photo-worker.js'), {
          workerData: {
            filePaths: batches[batchIndex],
            batchIndex: batchIndex,
            totalBatches: batches.length
          }
        });

        workers[workerIndex] = newWorker;

        return new Promise((resolve, reject) => {
          newWorker.on('message', (message) => {
            switch (message.type) {
              case 'batch-complete':
                allResults.push(...message.results);
                completedBatches++;
                totalProcessed += message.total;
                
                console.log(`✅ Batch ${message.batchIndex + 1}/${batches.length} abgeschlossen`);
                
                event.sender.send('scan-progress', {
                  phase: 'processing',
                  processed: totalProcessed,
                  total: imageFiles.length,
                  message: `Batch ${completedBatches}/${batches.length} abgeschlossen`,
                  batchComplete: true
                });
                break;

              case 'worker-complete':
                resolve();
                break;

              case 'worker-error':
                reject(new Error(message.error));
                break;
            }
          });

          newWorker.on('error', reject);
          newWorker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker Exit ${code}`));
          });
        });
      }
    };

    // Warte auf alle Worker
    await Promise.all(workerPromises);

    // Verarbeite verbleibende Batches sequenziell falls vorhanden
    for (let i = 0; i < workers.length && nextBatchIndex < batches.length; i++) {
      await processNextBatch(i);
    }

    // Cleanup alle Worker
    await Promise.all(workers.map(worker => worker.terminate()));

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    const photosPerSecond = (allResults.length / (processingTime || 1)).toFixed(0);

    console.log(`🎉 Verarbeitung abgeschlossen:`);
    console.log(`   📸 ${allResults.length} von ${imageFiles.length} Fotos erfolgreich verarbeitet`);
    console.log(`   ⏱️  ${processingTime}s Verarbeitungszeit`);
    console.log(`   🚀 ${photosPerSecond} Fotos/Sekunde`);

    // Finaler Progress-Update
    event.sender.send('scan-progress', {
      phase: 'complete',
      processed: allResults.length,
      total: imageFiles.length,
      message: `${allResults.length} Fotos erfolgreich analysiert`,
      processingTime: processingTime,
      photosPerSecond: photosPerSecond
    });

    return allResults;

  } catch (error) {
    console.error('❌ Fehler beim Durchsuchen der Fotos:', error);
    event.sender.send('scan-progress', {
      phase: 'error',
      message: `Fehler: ${error.message}`
    });
    throw error;
  }
});

/**
 * IPC-Handler für das Filtern von Fotos nach Kalendertag
 */
ipcMain.handle('filter-photos-by-date', async (event, photos, targetDay, targetMonth) => {
  try {
    const filteredPhotos = photos.filter(photo => {
      return photo.day === targetDay && photo.month === targetMonth;
    });

    console.log(`${filteredPhotos.length} Fotos für ${targetDay}.${targetMonth} gefunden`);
    return filteredPhotos;
  } catch (error) {
    console.error('Fehler beim Filtern der Fotos:', error);
    throw error;
  }
});

/**
 * IPC-Handler für das Erstellen eines Thumbnails
 */
ipcMain.handle('get-file-url', async (event, filePath) => {
  try {
    // Konvertiere Windows-Pfad zu file:// URL
    const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
    return fileUrl;
  } catch (error) {
    console.error('Fehler beim Erstellen der Datei-URL:', error);
    throw error;
  }
});

/**
 * IPC-Handler für Window-Controls
 */
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow.isMaximized();
});
