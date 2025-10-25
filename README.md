# Le Barobiou

Dashboard météo front-only (React + Vite + Tailwind + Recharts) avec PWA, consommant l'API Weather Underground. Déployable via Docker (Nginx).

## Prérequis
- Node.js 18+ (recommandé: 20)
- Clés API Weather Underground

## Variables d'environnement
A définir avant le build (et le `docker build`):

```bash
export VITE_WU_API_KEY="ta_cle_api"
export VITE_WU_STATION_ID="ta_station_id"
```

## Installation
```bash
npm install
```

## Développement local
```bash
npm run dev
```

## Build pour production
```bash
npm run build
```

## Docker
```bash
docker build -t meteo-dashboard .
docker run -d -p 80:80 meteo-dashboard
```

## Fonctionnalités
- Données en temps réel (rafraîchies toutes les 10 min) : température, humidité, pression, vent, pluie 1h/24h
- Vent: rafale max du jour, des 7 derniers jours et du mois via /v2/pws/history/daily (windgustHigh)
- Graphique intrajournalier (depuis 00:00) température + humidité + barres de précipitations
- Lever/Coucher du soleil (si lat/lon disponibles via l'observation courante)
- PWA installable (manifest + service worker via vite-plugin-pwa)
- Interface responsive et moderne (Tailwind)

## Astuces
- iOS: ajoutez l'app à l'écran d'accueil pour une expérience plein écran.
- Icônes PWA: remplacez les fichiers `/public/pwa-192.png`, `/public/pwa-512.png`, `/public/maskable-512.png` et `/public/apple-touch-icon.png` par vos propres icônes.
- Variables d'environnement: Vite expose les variables commençant par `VITE_` au frontend.

## Structure principale
- `src/components/WeatherCard.jsx` — cartes de métriques
- `src/components/WeatherChart.jsx` — graphique 24h (Recharts)
- `src/api/weather.js` — appels API WU (current + hourly) et calcul lever/coucher du soleil
- `src/App.jsx` — dashboard principal
- `src/main.jsx` — bootstrap React
- `public/manifest.json` — Manifest PWA
- `Dockerfile` — build + Nginx

## Notes API Weather Underground
- Endpoints utilisés: `/v2/pws/observations/current` (live), `/v2/pws/observations/all/1day` (séries intrajournalières depuis 00:00, ~5 min), et `/v2/pws/history/daily` (agrégats journaliers pour 7/30 jours)
- Paramètre `units=m` pour les unités métriques (°C, km/h, hPa)
- Toutes les requêtes incluent `numericPrecision=decimal` pour des valeurs décimales précises
- Les réponses peuvent varier selon la station; le code gère les champs manquants.
