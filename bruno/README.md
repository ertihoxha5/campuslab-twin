# Testimi i API-së me Bruno

Collection-i mbulon health check, autentikimin me cookie `HttpOnly`, API-të
kryesore tenant/platform, kontrollin e roleve dhe izolimin mes dy universiteteve.
Të gjitha URL-të dhe kredencialet demo merren nga `environments/local.bru`.

## Përgatitja

```bash
npm run db:migrate
npm run db:seed
npm run db:verify
npm run dev
```

Nëse seed-i është krijuar me fjalëkalim tjetër, ndryshoni `demoPassword` në
environment-in lokal. Në Bruno Desktop hapni direkt dosjen `bruno/`.

## Ekzekutimi

Nga Bruno Desktop zgjidhni environment-in `local` dhe ekzekutoni folder-at
sipas numrit. Health request-i është kontrolli i parë dhe duhet të kalojë para
autentikimit.

Bruno CLI nuk është dependency e projektit, sepse versionet e kontrolluara
sollën cenueshmëri high/critical në varësi transitore. Collection-i është
validuar me Bruno 3.2.0, por mënyra e rekomanduar është Bruno Desktop.

Bruno mban cookie jar-in e collection-it. Login-et e roleve zëvendësojnë sesionin
tenant, ndaj rendi i request-eve është i rëndësishëm. Sesioni i platformës përdor
cookie të veçantë.

## Variablat dinamike

Request-et e listave ruajnë automatikisht ID-të e para për laborator, pajisje,
sensor, alarm, mirëmbajtje, raport dhe njoftim. Mund t'i ndryshoni manualisht në
environment për të testuar një rekord tjetër.

Për testin cross-tenant:

1. Hyni si `admin@upt.demo` dhe merrni një ID laboratori të universitetit të dytë.
2. Vendoseni si `otherTenantLaboratoryId`.
3. Hyni si administratori i Prishtinës dhe ekzekutoni kërkesën e izolimit.
4. Rezultati i pritur është `404`, pa zbuluar ekzistencën e rekordit.

## Rregullat

- Request-et smoke janë read-only, përveç login/refresh/logout.
- Mos commit-oni environment-e me sekrete reale.
- Për endpoint-et mutating kopjoni shembullin përkatës dhe përdorni vetëm të
  dhëna testuese.
- `401` do të thotë sesion i munguar/skaduar; `403` mungesë permission-i; `404`
  përdoret edhe për burime cross-tenant; `422` është gabim validimi.
