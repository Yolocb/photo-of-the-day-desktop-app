/**
 * Worker Thread für Performance-optimierte EXIF-Verarbeitung
 * Verarbeitet Fotos in Batches für maximale Performance bei großen Sammlungen
 */

const { parentPort, workerData } = require('worker_threads');
const exifr = require('exifr');
const fs = require('fs').promises;
const path = require('path');
const metadataCache = require('./metadata-cache');

/**
 * Verarbeitet einen Batch von Foto-Dateien
 * @param {string[]} filePaths - Array von Dateipfaden
 * @param {number} batchIndex - Index des aktuellen Batches
 * @param {number} totalBatches - Gesamtanzahl der Batches
 */
async function processBatch(filePaths, batchIndex, totalBatches) {
    const results = [];
    const batchSize = filePaths.length;
    
    // Sende Progress-Update
    parentPort.postMessage({
        type: 'batch-start',
        batchIndex,
        totalBatches,
        batchSize
    });

    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        
        try {
            // Optimierte EXIF-Extraktion mit nur notwendigen Feldern
            const exifData = await exifr.parse(filePath, {
                pick: ['DateTimeOriginal', 'DateTime', 'CreateDate', 'ModifyDate'],
                translateKeys: false,
                translateValues: false,
                reviveValues: false,
                sanitize: false,
                mergeOutput: false
            });

            let dateTime = null;
            let hasExifDate = false;
            
            // Priorisiere DateTimeOriginal (echtes Aufnahmedatum)
            if (exifData && exifData.DateTimeOriginal) {
                dateTime = exifData.DateTimeOriginal;
                hasExifDate = true;
            } else if (exifData && (exifData.DateTime || exifData.CreateDate || exifData.ModifyDate)) {
                dateTime = exifData.DateTime || exifData.CreateDate || exifData.ModifyDate;
                hasExifDate = true;
            }

            // Fallback auf Datei-Metadaten nur wenn kein EXIF vorhanden
            if (!dateTime) {
                try {
                    const stats = await fs.stat(filePath);
                    dateTime = stats.mtime;
                    hasExifDate = false;
                } catch (statError) {
                    // Überspringe Datei bei Stat-Fehler
                    continue;
                }
            }

            if (dateTime) {
                const photoDate = new Date(dateTime);
                
                // Validiere Datum
                if (!isNaN(photoDate.getTime())) {
                    results.push({
                        filePath: filePath,
                        fileName: path.basename(filePath),
                        dateTime: photoDate.toISOString(),
                        day: photoDate.getDate(),
                        month: photoDate.getMonth() + 1,
                        year: photoDate.getFullYear(),
                        hasExifDate: hasExifDate
                    });
                }
            }

        } catch (error) {
            // Stille Behandlung von EXIF-Fehlern - versuche Fallback
            try {
                const stats = await fs.stat(filePath);
                const photoDate = new Date(stats.mtime);
                
                if (!isNaN(photoDate.getTime())) {
                    results.push({
                        filePath: filePath,
                        fileName: path.basename(filePath),
                        dateTime: photoDate.toISOString(),
                        day: photoDate.getDate(),
                        month: photoDate.getMonth() + 1,
                        year: photoDate.getFullYear(),
                        hasExifDate: false
                    });
                }
            } catch (statError) {
                // Überspringe diese Datei komplett
            }
        }

        // Sende Progress-Update alle 10 Dateien
        if (i % 10 === 0 || i === filePaths.length - 1) {
            parentPort.postMessage({
                type: 'batch-progress', 
                batchIndex,
                processed: i + 1,
                total: batchSize,
                totalBatches
            });
        }
    }

    // Sende Batch-Ergebnis
    parentPort.postMessage({
        type: 'batch-complete',
        batchIndex,
        results,
        processed: results.length,
        total: batchSize
    });
}

// Worker-Hauptlogik
if (workerData) {
    const { filePaths, batchIndex, totalBatches } = workerData;
    
    processBatch(filePaths, batchIndex, totalBatches)
        .then(() => {
            parentPort.postMessage({ type: 'worker-complete' });
        })
        .catch(error => {
            parentPort.postMessage({ 
                type: 'worker-error', 
                error: error.message,
                batchIndex 
            });
        });
}
