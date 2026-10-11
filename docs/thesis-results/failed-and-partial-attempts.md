# CampusLab Twin — tentativat e dështuara dhe rezultatet e pjesshme

Audituar më 11 tetor 2026 nga `simulation_runs`, `simulation_run_events`, `sensor_readings`, `alerts`, `notifications`, `activity_logs`, konfigurimi i sensorëve dhe skedarët e rezultateve. Mjedisi: UBT, `LAB-AUT-01` (laboratori ID 5). Ky dokument dallon **rezultatin në momentin e provës** nga **gjendja aktuale e alarmit**. Nuk e trajton mungesën e screenshot-it si dështim të provuar të një sensori.

## Tentativat me problem të provuar

| Skenari / tentativa | Vlera | Rezultati i pritur | Rezultati aktual | Niveli i pritur | Niveli aktual | Statusi | Arsyeja |
|---|---|---|---|---|---|---|---|
| Përgatitja para gjashtë skenarëve | Kapaciteti i laboratorit 24; run 8 aktiv | Mjedis testimi me kapacitet 25 dhe pa simulim aktiv | Prova nuk mund të nisej pa ndryshime | — | — | FAILED (përgatitje, jo skenar i ekzekutuar) | Konfigurim testimi: kapaciteti nuk përputhej dhe run 8 ishte `running`. Nuk ka lexim apo alarm të dështuar nga kjo tentativë. |
| Temperatura 29 °C — tentativa e parë e skriptit | 29 °C; run 10 | Lexim 29 °C, alarm Warning dhe verifikim i plotë nga skripti | Leximi 20, alarmi 4 Warning dhe dy njoftime u ruajtën; skripti u ndërpre para raportimit final | Warning | Warning në DB | PARTIALLY PASSED | Gabim i mekanizmit të testimit: `JSON.parse` u thirr mbi objektin JSON të kthyer nga MySQL (`"[object Object]" is not valid JSON`). Nuk ishte gabim i motorit të alarmeve ose i persistencës. Run 10 u ndal më pas. |
| Paraqitja e alarmeve në UI, pas run 10–13 | Alarmet 4–7 të krijuara në DB | Lista e alarmeve dhe detajet të duken në faqen “Alarmet” | Screenshot-i i përdoruesit tregoi tekstin placeholder “Nuk ka ende të dhëna…”; faqja nuk lexonte `/api/alerts` | Warning / Critical sipas alarmit | Asnjë nivel i paraqitur në atë faqe | FAILED | Frontend/UI: rruga `alarmet` përdorte `WorkspaceSectionPage`, jo listën e alarmeve. Kjo është një tentativë vizuale e dokumentuar, jo katër tentativa të ndara të sensorëve. |
| Fuqia 7 kW — kontrolli i mëvonshëm i alarmit aktiv | Run 13: 7000 W; run 15 më pas: 498.7095 W | Alarmi i krijuar nga 7 kW të mbetej i verifikueshëm si Critical në pamjen aktuale | Run 13 krijoi alarm `Critical` ID 7 dhe njoftime `alert_critical`; run 15 e përditësoi po ID 7 në `Warning` me përshkrimin 498.7095 W | Critical | Warning në rreshtin aktual ID 7 | FAILED për evidencën aktuale në UI | Logjikë e deduplikimit të alarmit + simulim i mëvonshëm: `ON DUPLICATE KEY UPDATE` ndryshon severity/përshkrimin e alarmit aktiv për të njëjtin sensor. Leximi 7000 W dhe ngjarja historike `alert_generated` e run 13 nuk u fshinë. |

Pragjet e sensorëve ekzistues të `LAB-AUT-01` ishin të ndryshme nga konfigurimi i tezës: temperatura `19/26/15/30`, lagështia `30/65/20/80`, prania `warningMax=14, criticalMax=16`, fuqia `warningMax=1400 W, criticalMax=1700 W` (renditja: warningMin/warningMax/criticalMin/criticalMax kur janë të katër). Këta sensorë nuk u ndryshuan dhe **nuk** u ekzekutua një tentativë e gjashtë skenarëve me këto pragje. Prandaj kjo është mospërputhje e zbuluar gjatë kontrollit paraprak, jo dështim i sajuar i një leximi.

### Probleme teknike jashtë gjashtë skenarëve

- `npm run db:verify` dështoi sepse universiteti demonstrues i Prishtinës nuk kishte grupin e plotë të të dhënave demo. Ky kontroll nuk ishte verifikim i skenarëve të UBT-së; nuk u rregullua në këtë punë.
- Nismat e para të testit të frontend-it dhe të Vite brenda sandbox-it dështuan me `spawn EPERM`; testi i `AlertsPage` kaloi pas ekzekutimit jashtë sandbox-it. Kjo nuk është dështim funksional i alarmeve.
- Një nisje e dytë e backend-it mori `EADDRINUSE` në portën 3001, sepse një instancë tjetër e mbante portën. Më 11 tetor u identifikua se procesi i nisur gjatë kësaj pune konkurronte me `node --watch` të përdoruesit; procesi i tepërt u ndal dhe porta u lirua. Më pas backend-i u nis si **një** instancë dhe `/api/health` ktheu `healthy`, edhe nëpërmjet proxy-t të Vite. Kjo nuk është dështim i skenarëve.

## Rregullimet dhe gjendja pas tyre

| Skenari / tentativa | Problemi | Ndryshimi i bërë | Rezultati pas rregullimit |
|---|---|---|---|
| Përgatitja | Kapacitet 24 dhe run 8 aktiv; pragjet ekzistuese nuk ishin konfigurimi i tezës | `server/scripts/prepare-thesis-laboratory.js` ndali run 8 me repository-n e aplikacionit dhe ndryshoi kapacitetin 24 → 25; `server/scripts/seed-thesis-sensors.js` dhe `server/seeds/thesis-test-sensors.js` shtuan katër sensorë të veçantë me pragjet e tezës | Run 9–14 u ekzekutuan dhe u ruajtën. **Nuk** pati tentativë të gjashtë skenarëve me konfigurimin e vjetër, prandaj nuk pretendohet “dështim i parë i pragjeve”. |
| Temperatura 29 °C — skripti | `JSON.parse` mbi objekt JSON; procesi u ndërpre pasi DB kishte ruajtur rezultatin | `server/scripts/run-thesis-scenarios.js` u ndryshua për të pranuar objekt ose tekst JSON; run 10 u ndal përmes `server/scripts/stop-thesis-run.js`; procesi vazhdoi nga skenari 3 | Evidenca e run 10 u verifikua: 29 °C, Warning, alarm 4, dy njoftime. Run 11–14 përfunduan. Nuk u përsërit artificialisht tentativa e temperaturës. |
| Faqja “Alarmet” | Placeholder pa kërkesë API | `client/src/App.jsx` përdor `AlertsPage`; faqja lexon `/api/alerts`, ofron filtra/detaje dhe paraqet gjashtë skenarët historikë nga endpoint-i `/api/alerts/executed-scenarios`. Testi i komponentit, shtatë testet përkatëse të API-së dhe build-i kaluan. | Query-ja reale e DB-së u verifikua për run 9–14. Dy screenshot-e të dërguara më pas nga përdoruesi tregojnë gjashtë kartat dhe regjistrin e katër alarmeve në sesionin UBT Admin. Problemi i placeholder-it është rregulluar në pamjen e treguar; ri-ekzekutimi final live mbetet i pakryer. |
| Fuqia 7 kW — alarmi aktual | Run 15 e mbishkroi nivelin/përshkrimin e ID 7 përmes deduplikimit | Run 15 u ndal më vonë; logjika e deduplikimit nuk u ndryshua. Seksioni historik i faqes “Alarmet” lexon ngjarjen `alert_generated` të run 13 dhe paraqet veçmas nivelin `Critical` atëherë dhe `Warning` aktualisht. | Screenshot-i i përdoruesit konfirmon që **karta historike** tregon 7 kW `Kritik` dhe `nivel aktual: Paralajmërim`. Regjistri aktual tregon 498.7095 W `Paralajmërim`; ai nuk provon 7 kW Critical si gjendje aktuale. Nuk pati ri-provë finale. |

## Përgjigjet e kërkuara për Kapitullin 6

**A. Tentativat e dështuara:** përgatitja fillestare (pa injektim vlere), faqja e vjetër “Alarmet” (placeholder) dhe kontrolli i mëvonshëm i alarmit të fuqisë ID 7 si evidencë vizuale e nivelit Critical. Nuk u gjet një ekzekutim fillestar i 29 °C, 70% ose 30 personave me nivel të gabuar në motorin e pragjeve.

**B. Rezultatet e pjesshme:** tentativa e parë e skriptit për 29 °C ruajti saktë leximin dhe alarmin, por raportimi u ndërpre nga gabimi JSON. Gjashtë skenarët kanë evidencë backend/DB dhe tani shfaqen në screenshot-in e faqes “Alarmet” nga sesioni UBT Admin. Mungon ri-ekzekutimi final i secilit skenar me vëzhgim live dhe screenshot më vete; kjo mungesë prove nuk klasifikohet vetvetiu si dështim i logjikës së sensorëve.

**C. Të rregulluara:** kapaciteti/run aktiv/pragjet e testit; gabimi JSON i skriptit; implementimi i faqes “Alarmet” (test unit + build, jo konfirmim live).

**D. Të pazgjidhura:** ID 7 nuk paraqet më 7 kW Critical në alarmet *aktuale*; screenshot-i i seksionit historik e dallon këtë nga niveli në momentin e run 13. Ri-ekzekutimi end-to-end me screenshot të veçantë për secilin skenar nuk është kryer. Gjeneratori gradual, publikimi Socket.IO dhe worker-i i veçantë i energjisë nuk u testuan në këtë seri. `fault` nuk krijon automatikisht alarm, por kjo **nuk është dështim** kundrejt pritshmërisë së këtij skenari, e cila kërkonte vetëm gjendje problematike.

**E. Rezultati final i gjashtë skenarëve në momentin e ekzekutimit:** normal (run 9, pa alarm), 29 °C (run 10, Warning), 70% (run 11, Warning), 30 persona (run 12, Critical), 7 kW (run 13, Critical nga sensori i fuqisë), `fault` (run 14, status problematik pa alarm të ri). Këto janë **6/6 rezultate backend/DB në momentin e testit**, jo 6/6 teste end-to-end të verifikuara vizualisht. Verifikuesi që lexon *gjendjen aktuale* kthen 5/6, sepse severity e ID 7 u ndryshua më vonë.

**F. Paragraf për tezën:** Gjatë përgatitjes së testeve funksionale u identifikuan mospërputhje të konfigurimit të laboratorit dhe një simulim ekzistues aktiv, të cilat u korrigjuan para injektimit të vlerave të provës. Një ndërprerje e skriptit të testimit nuk ndikoi në ruajtjen e leximit dhe alarmit të temperaturës, por kërkoi verifikim dhe vazhdim të kontrolluar. Testimi vizual zbuloi se faqja e alarmeve ishte ende placeholder; ajo u implementua më pas, por verifikimi live mbetet i hapur. Po ashtu, një simulim i mëvonshëm përditësoi alarmin aktiv të fuqisë nga niveli Critical në Warning, megjithëse leximi dhe ngjarja historike kritike e testit 7 kW mbetën të ruajtura. Këto kufizime janë raportuar veçmas nga rezultatet e suksesshme të gjashtë provave në backend.

## Gjurmë evidence

- Run 9–14 dhe lexime 16–39: `server/scripts/verify-thesis-results.js`, `docs/thesis-results/scenario-results.json`.
- Ngjarje `alert_generated`: run 10 → alarm 4 Warning; run 11 → 5 Warning; run 12 → 6 Critical; run 13 → 7 Critical. Auditi read-only: `server/scripts/audit-thesis-history.js`.
- Njoftimet e alarmit 7: ID 1069 dhe 1070, tip `alert_critical`; gjendja aktuale e alarmit 7: Warning, 498.7095 W, përditësuar nga run 15.
- Faqja e vjetër placeholder u dokumentua në screenshot-in e përdoruesit në bisedë; skedari i screenshot-it nuk është ruajtur në repo. Ndryshimi i faqes dhe testi: `client/src/App.jsx`, `client/src/pages/AlertsPage.jsx`, `client/src/pages/AlertsPage.test.jsx`.
- Seksioni historik i ri: `server/src/modules/alerts/repository.js`, `service.js`, `router.js` dhe `server/test/alerts-api.test.js`. Query-ja lexoi nga DB run 9–14, leximet përkatëse dhe nivelin `alert_generated` në momentin e ekzekutimit; testi i komponentit dhe shtatë testet e API-së kaluan. Kjo është evidencë kodi/API, jo screenshot UI.
- Dy screenshot-e të reja të dërguara nga përdoruesi në bisedë tregojnë (1) faqen “Alarmet” me `LAB-AUT-01` dhe gjashtë kartat run 9–14, dhe (2) regjistrin me alarmet 4–7. Ato u inspektuan vizualisht, por skedarët origjinalë nuk janë ruajtur në repo. Screenshot-i nuk provon një ri-ekzekutim live pas implementimit të seksionit historik.
- Deduplikimi që përditëson rreshtin aktiv: `server/src/modules/simulator/repository.js` (`ON DUPLICATE KEY UPDATE`). Motori i pragjeve: `server/src/modules/alerts/rule-engine.js`.
