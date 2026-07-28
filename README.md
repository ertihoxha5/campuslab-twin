# CampusLab Twin

Prototip i Digital Twin për menaxhimin e laboratorëve universitarë.

## Struktura

- `client/` — React, Vite, React Router, Tailwind CSS dhe shadcn/ui
- `server/` — Express dhe MySQL me `mysql2/promise`

Identifikuesit në kod shkruhen në anglisht. Përmbajtja që shfaqet te përdoruesi
shkruhet në shqip.

## Konfigurimi lokal

Kërkohet Node.js 22 ose më i ri.

```bash
npm install
copy .env.example .env
npm run dev
```

- Klienti: `http://localhost:5173`
- API: `http://localhost:3000`
- Kontrolli i API-së: `GET http://localhost:3000/api/health`

Përditësoni vlerat `DB_*` në `.env` për instalimin tuaj lokal të MySQL. Serveri
ndalon me një mesazh të qartë nëse konfigurimi mungon ose lidhja me MySQL dështon.

## Komandat

```bash
npm run dev
npm run lint
npm test
npm run build
npm run format:check
```

Klienti dërgon kërkesa te API me `credentials: "include"`. Gjendja fillestare e
autentikimit është qëllimisht e panjohur; ajo do të lidhet me sesionin real në
CLT-03 dhe nuk zëvendësohet me përdorues demonstrues.

Mos vendosni sekrete reale në skedarët `.env.example`.
