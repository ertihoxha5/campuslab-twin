# CLT-17 — Baseline i QA-së

Data e verifikimit: 11 gusht 2026

## Rezultati i automatizuar

| Shtresa  | Komanda                                         | Rezultati                           |
| -------- | ----------------------------------------------- | ----------------------------------- |
| Backend  | `npm test --workspace server`                   | 290/290 teste kalojnë               |
| Frontend | `npm test --workspace client -- --maxWorkers=1` | 138/138 teste kalojnë në 44 skedarë |
| Lint     | `npm run lint`                                  | Kalon për klientin dhe serverin     |
| Build    | `npm run build`                                 | Kalon për klientin dhe serverin     |

Testet e frontend-it ekzekutohen me një worker për një rezultat të qëndrueshëm
në kompjuterët me më pak memorie.

## Mbulimi i matricës

- Autentikimi tenant dhe autentikimi i ndarë i administratorit të platformës.
- RBAC, route të mbrojtura dhe navigim sipas lejeve.
- Izolimi tenant për lista, kërkim, detaje, burime të ndërthurura, analitikë,
  raporte, skedarë dhe Socket.IO.
- Validimi, transaksionet, rollback-u dhe përgjigjet e sigurta të gabimeve.
- CORS, cookies, rate limiting, kufiri i kërkesave dhe siguria e upload-eve.
- Formularët kryesorë, gjendjet bosh/gabim, dialogët dhe navigimi me tastierë.
- Përditësimet live, offline/reconnect dhe batch-et e monitorimit.
- Kufiri prej 400 pikash për grafikët dhe strategjia e performancës 3D.

## Hapi i mbetur

Smoke flow-i i plotë duhet të ekzekutohet si një rrjedhë e vetme: regjistrim,
miratim, hyrje e administratorit të universitetit, krijim laboratori/pajisjeje/
sensori, simulim, alarm, Digital Twin, mirëmbajtje, skenar dhe raport.
