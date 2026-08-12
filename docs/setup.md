# Instalimi dhe ekzekutimi

Ky udhëzues nis nga një checkout i pastër dhe përgatit mjedisin demonstrues të
CampusLab Twin. Komandat ekzekutohen nga rrënja e projektit.

## Parakushtet

- Node.js 22 ose më i ri dhe npm;
- MySQL 8 ose më i ri, aktiv dhe i arritshëm nga serveri;
- shfletues modern me WebGL 2 për Digital Twin 3D;
- Git për marrjen e kodit.

## 1. Instalimi i varësive

```bash
git clone <adresa-e-repozitorit>
cd campuslab-twin
npm install
```

Root package përdor npm workspaces, prandaj një `npm install` instalon klientin
dhe serverin. Mos ekzekutoni instalime të ndara në workspace pa nevojë.

## 2. Konfigurimi i ambientit

Kopjoni `.env.example` si `.env` në rrënjë:

```powershell
Copy-Item .env.example .env
```

Në Linux ose macOS përdorni `cp .env.example .env`. Plotësoni këto vlera:

| Variabla                               | Qëllimi                                            |
| -------------------------------------- | -------------------------------------------------- |
| `NODE_ENV`                             | `development`, `test` ose `production`             |
| `PORT`                                 | Porta e API-së; lokalisht `3000`                   |
| `CLIENT_ORIGIN`                        | Origjina e lejuar e klientit, pa slash në fund     |
| `DB_HOST`, `DB_PORT`                   | Adresa dhe porta e MySQL-it                        |
| `DB_NAME`                              | Emri i databazës; migruesi mund ta krijojë         |
| `DB_USER`, `DB_PASSWORD`               | Përdorues MySQL me leje për skemën                 |
| `DB_CONNECTION_LIMIT`                  | Madhësia maksimale e pool-it                       |
| `JWT_ACCESS_SECRET`                    | Sekret unik me të paktën 32 karaktere              |
| `ACCESS_TOKEN_MINUTES`                 | Jetëgjatësia 5–60 minuta                           |
| `REFRESH_TOKEN_DAYS`                   | Jetëgjatësia 1–30 ditë                             |
| `READING_AGGREGATION_INTERVAL_MINUTES` | Intervali i agregimit të leximeve                  |
| `READING_RAW_RETENTION_DAYS`           | Ditët e ruajtjes së leximeve të papërpunuara       |
| `READING_MAINTENANCE_INTERVAL_MINUTES` | Intervali i mirëmbajtjes së leximeve               |
| `DEMO_ACCOUNT_PASSWORD`                | Fjalëkalimi lokal i seed-it, minimumi 12 karaktere |

Mos commit-oni `.env`. Për prodhim gjeneroni sekrete të reja dhe ruajini në një
secret manager; vlerat e `.env.example` nuk janë kredenciale prodhimi.

## 3. Databaza demonstruese

Sigurohuni që përdoruesi MySQL mund të krijojë dhe ndryshojë `DB_NAME`, pastaj:

```bash
npm run db:migrate
npm run db:seed
npm run db:verify
```

Migrimet regjistrohen me version dhe checksum. Seed-i është idempotent kur të dy
universitetet demo ekzistojnë të plota. `db:verify` kontrollon skemën,
foreign keys, indekset tenant, hash-et bcrypt dhe dataset-in demonstrues.

Për kthimin e migrimit të fundit në zhvillim:

```bash
npm run db:rollback
```

Lexoni [databazën dhe ERD-në](database.md) para ndryshimeve në skemë. Mos bëni
rollback të pakontrolluar mbi të dhëna që duhen ruajtur.

## 4. Zhvillimi

```bash
npm run dev
```

- Klienti: `http://localhost:5173`
- API: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

Porta `3000` duhet të jetë e lirë. Nëse shfaqet `EADDRINUSE`, ndaloni procesin e
vjetër që po e përdor; mos nisni një kopje të dytë të serverit në të njëjtën
portë. Vite i përcjell kërkesat `/api` dhe Socket.IO te backend-i lokal.

## 5. Verifikimi

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run security:audit
```

Testet e serverit përdorin adapterë dhe databaza të kontrolluara sipas rastit.
`db:verify` është kontrolli që duhet ekzekutuar veçmas mbi MySQL-in e mbushur me
seed. Baseline-i i plotë dokumentohet te [CLT-17 QA](clt-17-qa.md).

## 6. Build dhe nisja e prodhimit

```bash
npm run build
npm run start --workspace server
```

Build-i i klientit krijohet në `client/dist`. Serveri Express shërben API-në;
në një vendosje reale, `client/dist` duhet të shërbehet nga web server/CDN dhe
`CLIENT_ORIGIN`, cookie-t HTTPS, proxy-ja dhe Socket.IO duhet të konfigurohen për
domain-in real. Ky milestone nuk përfshin konfigurim cloud ose deploy prodhimi.

## 7. Llogaritë dhe demonstrimi

Llogaritë lokale listohen në [README](../README.md#baza-e-të-dhënave). Të gjitha
përdorin `DEMO_ACCOUNT_PASSWORD`; seed-i ruan vetëm hash bcrypt. Ndiqni
[skenarin e demonstrimit](demo-and-limitations.md) për prezantimin e tezës.

## Zgjidhja e problemeve

- **API nuk nis:** kontrolloni mesazhin e validimit të `.env` dhe lidhjen MySQL.
- **`401 Unauthorized`:** kyçuni me llojin e duhur të llogarisë; platforma dhe
  universiteti përdorin endpoint-e dhe cookie të ndara.
- **`422 Unprocessable Entity`:** lexoni gabimet e validimit në përgjigjen JSON;
  formularët testues lejohen, por duhet të respektojnë formatet e kërkuara.
- **Socket.IO nuk lidhet:** verifikoni që backend-i punon në portën e konfiguruar
  dhe që `CLIENT_ORIGIN` është saktësisht origjina e Vite-s.
- **3D nuk hapet:** kontrolloni WebGL 2 dhe provoni cilësinë `E ulët`.
