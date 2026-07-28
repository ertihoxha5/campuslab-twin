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

Në PowerShell mund të përdorni:

```powershell
Copy-Item .env.example .env
```

- Klienti: `http://localhost:5173`
- API: `http://localhost:3000`
- Kontrolli i API-së: `GET http://localhost:3000/api/health`

Përditësoni vlerat `DB_*` në `.env` për instalimin tuaj lokal të MySQL. Serveri
ndalon me një mesazh të qartë nëse konfigurimi mungon ose lidhja me MySQL dështon.
Skedari lexohet gjithmonë nga rrënja e projektit, pavarësisht nëse serveri niset
nga skripti kryesor apo nga workspace-i `server`.

## Komandat

```bash
npm run dev
npm run lint
npm test
npm run build
npm run format:check
```

## Baza e të dhënave

Pas konfigurimit të kredencialeve `DB_*` në `.env`, krijoni skemën dhe të dhënat
demonstruese:

```bash
npm run db:migrate
npm run db:seed
npm run db:verify
```

`db:migrate` krijon bazën kur ajo nuk ekziston, aplikon migrimet sipas versionit
dhe verifikon checksum-in e çdo migrimi të aplikuar. Për të kthyer vetëm migrimin
e fundit:

```bash
npm run db:rollback
```

Seed-i është idempotent dhe krijon dy universitete me të dhëna të ndryshme.
`db:verify` kontrollon skemën reale, kolonat dhe indekset tenant, foreign keys,
bcrypt hash-et dhe dallimin e të dhënave të dy universiteteve.
Llogaritë lokale përdorin vlerën `DEMO_ACCOUNT_PASSWORD` nga `.env`. Email-et
demonstruese janë:

- `admin@campuslab.demo` — administratori i platformës
- `admin@uni-prishtina.demo` — administratori i universitetit të parë
- `admin@upt.demo` — administratori i universitetit të dytë

Këto janë vetëm llogari zhvillimi. Ndryshoni fjalëkalimin demonstrues dhe mos e
përdorni në prodhim.

Klienti dërgon kërkesa te API me `credentials: "include"`. Gjendja fillestare e
autentikimit është qëllimisht e panjohur; ajo do të lidhet me sesionin real në
CLT-03 dhe nuk zëvendësohet me përdorues demonstrues.

Mos vendosni sekrete reale në skedarët `.env.example`.
