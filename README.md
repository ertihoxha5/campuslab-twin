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

Secili universitet ka edhe llogari për rolet e tjera. Zëvendësoni domain-in me
`uni-prishtina.demo` ose `upt.demo`:

- `menaxher@<domain>` — menaxheri i laboratorit
- `teknik@<domain>` — tekniku
- `akademik@<domain>` — personeli akademik
- `vezhgues@<domain>` — vëzhguesi

Këto janë vetëm llogari zhvillimi. Ndryshoni fjalëkalimin demonstrues dhe mos e
përdorni në prodhim.

Klienti dërgon kërkesa te API me `credentials: "include"`. Autentikimi përdor
access JWT jetëshkurtër dhe refresh token të rrotulluar në cookie `HttpOnly`.
Token-at nuk ruhen në `localStorage`; databaza ruan vetëm hash-et e refresh/reset
token-ave. Universitetet joaktive, të refuzuara ose të pezulluara nuk mund të
hyjnë në workspace.

## API e autentikimit

Endpoint-et e universitetit:

- `POST /api/public/university-registrations`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Endpoint-et e administratorit të platformës:

- `POST /api/platform/auth/login`
- `POST /api/platform/auth/refresh`
- `GET /api/platform/auth/me`
- `POST /api/platform/auth/logout`

Sesioni i administratorit të platformës përdor cookie, audience JWT dhe tabela
të veçanta nga sesionet tenant. Veprimet e autentikimit dhe regjistrimit
auditohen. `forgot-password` kthen gjithmonë të njëjtën përgjigje publike,
pavarësisht nëse llogaria ekziston. Dërgimi real i email-it bëhet përmes
adapter-it `passwordResetNotifier`; konfigurimi i një ofruesi email-i mbetet
integrim i ambientit të vendosjes dhe token-i nuk shkruhet në log apo databazë.

Mos vendosni sekrete reale në skedarët `.env.example`.

## Objektivi i performancës 3D

Pamja Digital Twin synon të mbajë të paktën 30 FPS në një laptop me 4 bërthama,
8 GB RAM dhe grafikë të integruar, me një model GLB deri në 15 MB, 100 pajisje,
100 sensorë dhe 16 figura të instancuara. Matja bëhet në Chrome, në madhësinë
1440 × 900, pas ngarkimit të plotë të modelit dhe gjatë 60 sekondave navigim.

Modaliteti `Automatike` zgjedh cilësi të ulët për pajisjet me jo më shumë se
4 bërthama, jo më shumë se 4 GB memorie të raportuar ose me reduced motion.
Rezolucioni i renderimit kufizohet në 1.5 DPR. Pamjet statike renderohen vetëm
kur skena ndryshon; cikli i vazhdueshëm aktivizohet vetëm në navigimin në vetën
e parë. Nëse objektivi 30 FPS nuk arrihet, përdoret opsioni `E ulët`.

Payload-et e grafikëve të analitikës kufizohen në 400 pika. API refuzon një
kombinim periudhe/grupimi që e tejkalon këtë kufi dhe kërkon grupim më të gjerë,
në vend që të transferojë mijëra pika në shfletues.

Rezultatet dhe matrica e QA-së së CLT-17 dokumentohen te
[`docs/clt-17-qa.md`](docs/clt-17-qa.md).

## Dokumentacioni teknik

- [Instalimi, ambienti dhe verifikimi](docs/setup.md)
- [Arkitektura dhe rrjedha multi-tenant](docs/architecture.md)
- [Databaza dhe ERD](docs/database.md)
- [Matrica RBAC dhe kodet e lejeve](docs/rbac.md)
- [Referenca REST API](docs/api.md)
- [Testimi i API-së me Bruno](bruno/README.md)
- [Referenca Socket.IO](docs/socket-io.md)
- [Simulimi, formula e shëndetit dhe raportimi](docs/simulation-and-reporting.md)
- [Skenari i demonstrimit dhe kufizimet](docs/demo-and-limitations.md)
- [Baseline-i i QA-së](docs/clt-17-qa.md)
