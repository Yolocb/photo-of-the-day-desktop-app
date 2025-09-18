/**
 * Einfaches Metadaten-Cache-System für Performance-Optimierung
 * Cached EXIF-Daten basierend auf Dateipfad und Änderungsdatum
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class MetadataCache {
    constructor() {
        this.cache = new Map();
        this.cacheFile = path.join(os.tmpdir(), 'photo-of-the-day-cache.json');
        this.maxCacheSize = 10000; // Maximal 10k Einträge
        this.loadCache();
    }

    /**
     * Lädt Cache aus temporärer Datei
     */
    async loadCache() {
        try {
            const data = await fs.readFile(this.cacheFile, 'utf8');
            const cacheData = JSON.parse(data);
            this.cache = new Map(cacheData);
            console.log(`📦 Cache geladen: ${this.cache.size} Einträge`);
        } catch (error) {
            // Cache-Datei existiert nicht oder ist korrupt - nicht kritisch
            console.log('📦 Neuer Cache wird erstellt');
        }
    }

    /**
     * Speichert Cache in temporäre Datei
     */
    async saveCache() {
        try {
            const cacheData = Array.from(this.cache.entries());
            await fs.writeFile(this.cacheFile, JSON.stringify(cacheData), 'utf8');
            console.log(`💾 Cache gespeichert: ${this.cache.size} Einträge`);
        } catch (error) {
            console.warn('⚠️  Fehler beim Speichern des Caches:', error.message);
        }
    }

    /**
     * Generiert Cache-Key basierend auf Dateipfad und Änderungsdatum
     */
    generateCacheKey(filePath, modifiedTime) {
        return `${filePath}::${modifiedTime}`;
    }

    /**
     * Prüft ob Metadaten im Cache vorhanden sind
     */
    async getCachedMetadata(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const cacheKey = this.generateCacheKey(filePath, stats.mtime.getTime());
            
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Speichert Metadaten im Cache
     */
    async setCachedMetadata(filePath, metadata) {
        try {
            const stats = await fs.stat(filePath);
            const cacheKey = this.generateCacheKey(filePath, stats.mtime.getTime());
            
            // Cache-Größe begrenzen
            if (this.cache.size >= this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            
            this.cache.set(cacheKey, {
                ...metadata,
                cachedAt: Date.now()
            });
        } catch (error) {
            // Fehler beim Caching ist nicht kritisch
        }
    }

    /**
     * Bereinigt veraltete Cache-Einträge
     */
    cleanupCache() {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 Tage
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, value] of this.cache.entries()) {
            if (value.cachedAt && (now - value.cachedAt) > maxAge) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cache bereinigt: ${cleanedCount} veraltete Einträge entfernt`);
        }
    }

    /**
     * Cache-Statistiken
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            cacheFile: this.cacheFile
        };
    }
}

// Singleton-Instanz
const metadataCache = new MetadataCache();

// Cleanup bei App-Ende
process.on('exit', () => {
    metadataCache.saveCache();
});

process.on('SIGINT', () => {
    metadataCache.saveCache();
    process.exit();
});

process.on('SIGTERM', () => {
    metadataCache.saveCache();
    process.exit();
});

module.exports = metadataCache;
