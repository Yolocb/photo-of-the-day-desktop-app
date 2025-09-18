# Photo of the Day - Foto des Tages

Eine lokale Desktop-Anwendung für Windows, die Fotos basierend auf dem Kalendertag (Tag und Monat, unabhängig vom Jahr) anzeigt - ähnlich der "Foto-des-Tages"-Funktion von Windows 10, jedoch als eigenständige lokale App.

## 🌟 Features

- **Kalendertag-basierte Filterung**: Zeigt Fotos vom gleichen Tag/Monat aus verschiedenen Jahren an
- **Rekursive Verzeichnissuche**: Durchsucht ausgewählte Verzeichnisse und Unterverzeichnisse nach Bildern
- **EXIF-Datenextraktion**: Liest Aufnahmedaten aus Foto-Metadaten (mit Fallback auf Datei-Änderungsdatum)
- **Moderne Benutzeroberfläche**: Glassmorphism-Design mit Thumbnail- und Listen-Ansicht
- **Custom Titlebar**: Native Window-Controls (Minimize, Maximize, Close) für professionelles Look & Feel
- **Dark/Light Theme**: Wechselbares Theme mit automatischer Persistierung
- **Micro-Interaktionen**: Smooth Animationen und moderne UI-Transitions
- **1000+ Icons**: Lucide Icon Library für perfekte visuelle Konsistenz
- **Toast-Benachrichtigungen**: Elegantes Feedback-System für alle Benutzeraktionen
- **Foto-Details**: Großansicht mit Metadaten und Dateipfad-Informationen
- **Unterstützte Formate**: JPG, JPEG, PNG, TIFF, BMP, GIF, WebP
- **Rein lokal**: Keine Internet-Verbindung oder Cloud-Services erforderlich

## 🚀 Installation und Start

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm (normalerweise mit Node.js installiert)

### Installation
```bash
# Dependencies installieren
npm install

# Anwendung im Entwicklungsmodus starten
npm run dev

# Produktive Anwendung starten
npm start
```

### Build für Distribution
```bash
# App für aktuelle Plattform packen
npm run pack

# Installer erstellen
npm run dist
```

## 🎯 Verwendung

1. **Verzeichnis auswählen**: Klicken Sie auf "📁 Verzeichnis auswählen" und wählen Sie einen Ordner mit Ihren Fotos
2. **Automatische Analyse**: Die App durchsucht rekursiv alle Unterordner und extrahiert Metadaten
3. **Datum filtern**: Wählen Sie Tag und Monat aus den Dropdown-Menüs oder verwenden Sie das heutige Datum
4. **Fotos durchstöbern**: Betrachten Sie Thumbnails oder wechseln Sie zur Listen-Ansicht
5. **Details anzeigen**: Klicken Sie auf ein Foto für Großansicht und Metadaten

## 🏗️ Projektstruktur

```
photo-of-the-day-app/
├── src/
│   ├── main/
│   │   ├── main.js          # Electron-Hauptprozess
│   │   └── preload.js       # Preload-Skript für sichere IPC
│   └── renderer/
│       ├── index.html       # Hauptoberfläche
│       ├── styles.css       # Styling (Glassmorphism)
│       └── renderer.js      # Frontend-Logik
├── package.json             # Projekt-Konfiguration
└── README.md               # Diese Datei
```

## 🔧 Technische Details

### Hauptkomponenten

1. **Main-Prozess** (`main.js`):
   - Electron-App-Verwaltung
   - Verzeichnis-Dialog
   - EXIF-Datenextraktion mit `exifr`
   - Foto-Filterung nach Kalendertag

2. **Preload-Skript** (`preload.js`):
   - Sichere IPC-Kommunikation zwischen Main- und Renderer-Prozess
   - Context Bridge API

3. **Renderer-Prozess** (`renderer.js`):
   - Benutzeroberfläche und Interaktion
   - Galerie-Darstellung
   - Modal-Fenster für Foto-Details

### EXIF-Datenverarbeitung

Die App verwendet die `exifr`-Bibliothek zur Extraktion von Metadaten:
- **Primär**: `DateTimeOriginal` (Kamera-Aufnahmedatum)
- **Fallback**: `DateTime`, `CreateDate`, `ModifyDate`
- **Letzter Fallback**: Datei-Änderungsdatum

### Unterstützte Bildformate
- JPG/JPEG
- PNG
- TIFF/TIF
- BMP
- GIF
- WebP

## ⌨️ Tastatur-Shortcuts

- **Ctrl+O**: Verzeichnis auswählen
- **F5**: Fotos neu durchsuchen
- **ESC**: Modal schließen

## 🎨 Design-Features

- **Glassmorphism-Oberfläche**: Moderne, transparente Elemente mit Blur-Effekten
- **Responsive Layout**: Anpassung an verschiedene Fenstergrößen
- **Dark/Light Indicators**: Visuelle EXIF-Status-Anzeige
- **Toast-Benachrichtigungen**: Nutzerfreundliche Statusmeldungen
- **Lazy Loading**: Effiziente Bild-Darstellung

## 🛠️ Entwicklung

### Dependencies
- **Electron**: Desktop-App-Framework
- **exifr**: EXIF-Datenextraktion
- **glob**: Datei-Pattern-Matching

### Scripts
```bash
npm run dev     # Entwicklungsmodus mit DevTools
npm start       # Produktiver Start
npm run pack    # App ohne Installer packen
npm run dist    # Installer erstellen
```

### Debugging
- DevTools öffnen sich automatisch im `--dev` Modus
- Console-Logs sowohl im Main- als auch Renderer-Prozess
- Toast-Benachrichtigungen für Benutzer-Feedback

## 📋 Systemanforderungen

- **Betriebssystem**: Windows 10/11
- **RAM**: Mindestens 4GB (8GB empfohlen für große Foto-Sammlungen)
- **Speicher**: Ca. 200MB für die App + Platz für temporäre Thumbnails
- **Prozessor**: Moderne CPU (2015 oder neuer)

## 🔒 Datenschutz & Sicherheit

- **100% lokal**: Keine Datenübertragung ins Internet
- **Nur Lesezugriff**: App verändert keine Original-Dateien
- **Sichere IPC**: Context Isolation zwischen Main- und Renderer-Prozess
- **Keine Tracking**: Keinerlei Telemetrie oder Analytics

## 🚨 Bekannte Limitierungen

- Sehr große Foto-Sammlungen (>10.000 Bilder) können die Performance beeinträchtigen
- EXIF-Daten sind nicht bei allen Bildformaten verfügbar
- Korrupte Bilddateien werden übersprungen

## 📝 Lizenz

MIT License - siehe package.json für Details

## 🤝 Entwickelt für

Diese Anwendung wurde speziell entwickelt für Nutzer, die:
- Eine lokale Alternative zu Cloud-basierten Foto-Apps suchen
- Ihre Foto-Erinnerungen anhand von Kalendertagen durchstöbern möchten
- Wert auf Datenschutz und lokale Datenkontrolle legen
- Eine moderne, benutzerfreundliche Desktop-Anwendung bevorzugen
