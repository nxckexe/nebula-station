# 🚀 Nebula Station

Ein Weltraum-MMO im Cartoon-Stil: dock als Alien an eine Raumstation an,
lauf herum, chatte, mach Emotes und trag Accessoires — alles live mit
anderen Spielern.

---

## A) Lokal testen (auf deinem Rechner)

Voraussetzung: **Node.js 18+** (https://nodejs.org). Prüfen: `node -v`

```bash
npm install     # nur beim ersten Mal
npm start
```

Öffne **http://localhost:3000**. Für Multiplayer: mehrere Browser-Tabs öffnen.

---

## B) Online stellen mit Render

### 1. Code zu GitHub
Lade diesen Ordner als Repository zu GitHub hoch. Am einfachsten über die
GitHub-Website: „New repository" → „uploading an existing file" → alle
Dateien reinziehen (den Ordner `node_modules` NICHT hochladen — die
`.gitignore` sorgt normalerweise dafür).

Oder per Terminal:
```bash
git init
git add .
git commit -m "Nebula Station"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/nebula-station.git
git push -u origin main
```

### 2. Render-Web-Service anlegen
1. Auf https://render.com einloggen → **New → Web Service**
2. Dein GitHub-Repo verbinden und auswählen
3. Einstellungen:
   - **Runtime / Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (zum Testen) oder Starter (immer an)
4. **Create Web Service** klicken

Render baut das Projekt und gibt dir eine öffentliche URL
(z.B. `https://nebula-station.onrender.com`). Fertig — teil die URL,
und mehrere Leute können gleichzeitig spielen.

### Wichtig zum Free-Tarif
- Der Server **schläft nach 15 Min ohne Besucher ein** und braucht beim
  nächsten Aufruf ~1 Minute zum Aufwachen. Für einen Dauerbetrieb: Starter-Plan.
- Der Port wird automatisch über `process.env.PORT` gesetzt — der Code nutzt
  das schon, du musst nichts einstellen.

---

## Als Nächstes: Accounts
Für dauerhafte Konten (Login, gespeichertes Alien, Sternenstaub) kommt eine
**Datenbank** dazu (z.B. Render Postgres oder Supabase). Das bauen wir als
nächsten Schritt ein — dann werden `join` und Inventar pro Account gespeichert
statt nur für die aktuelle Sitzung.

## Wie es funktioniert
- **`server.js`** = die „Wahrheit": kennt alle Spieler, verteilt Bewegung,
  Chat, Emotes, Accessoires und Raumwechsel.
- **`public/index.html`** = der Client: zeichnet die Welt und die Aliens.

Die Orbs sind aktuell rein kosmetisch (pro Sitzung) — der Punktestand wird
erst mit den Accounts dauerhaft gespeichert.
