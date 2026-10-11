# CampusLab Twin — konfigurimi i gjashtë testeve funksionale

Ky konfigurim është **i dedikuar për laboratorin e testimit**, jo ndryshim i pragjeve globale të platformës. Sensorët instalohen vetëm pas zgjedhjes së një laboratori me kapacitet **25 persona**. Instaluesi nuk prek sensorët me kode të tjera dhe, pa `--apply`, vetëm shfaq planin.

## Pragjet e ruajtura në databazë

`server/seeds/thesis-test-sensors.js` përcakton katër sensorë. `server/scripts/seed-thesis-sensors.js` i krijon ose përditëson në tabelën `sensors` sipas kodit të tyre unik. Krahasimet në backend janë strikte: alarmi krijohet për vlerë **nën** minimumin ose **mbi** maksimumin. Kufijtë kritikë kontrollohen përpara atyre paralajmërues (`server/src/modules/alerts/rule-engine.js:8–24`). `NULL` do të thotë se ai kufi nuk përdoret.

| Sensori / kodi | `warningMin` | `warningMax` | `criticalMin` | `criticalMax` | Shembulli i testit |
|---|---:|---:|---:|---:|---|
| Temperaturë / `CLT-THESIS-TEMP` | 18 °C | 26 °C | 15 °C | 31 °C | 29 °C → Warning |
| Lagështi / `CLT-THESIS-HUM` | 30% | 60% | 20% | 72% | 70% → Warning |
| Prani / `CLT-THESIS-OCC` | NULL | 25 persona | NULL | 29 persona | 30 persona → Critical |
| Fuqi / `CLT-THESIS-POWER` | 500 W | 5000 W | NULL | 6000 W | 7000 W → Critical |

**Arsyetimi.** Kufijtë paralajmërues përkojnë me skajet e intervaleve orientuese të Tabelës 1. Kufiri kritik i lartë i temperaturës (31 °C) dhe lagështisë (72%) lë hapësirë paralajmërimi përpara nivelit kritik. Për zënien, 30 persona janë 20% mbi kapacitetin 25; `criticalMax=29` e bën vlerën 30 kritike, sepse krahasimi përdor `>`. Për fuqinë, `criticalMax=6000 W` është 20% mbi kufirin orientues 5000 W. Kufijtë kritikë të ulët 15 °C dhe 20% lejojnë testimin edhe të devijimeve në anën e ulët. Nuk ka kufi kritik të ulët për fuqinë ose zënien, sepse ky konfigurim i tezës i klasifikon si problem vetëm tejkalimet e larta (fuqia nën 500 W jep Warning).

## Rezultati i pritur nga rregulli aktual

| Skenari | Vlera | Klasifikimi |
|---|---|---|
| Gjendja normale | 23 °C; 45%; 10 persona; 2 kW; pajisja `active` | Normal |
| Temperaturë e lartë | 29 °C | Warning |
| Lagështi e lartë | 70% | Warning |
| Kapacitet i tejkaluar | 30 persona | Critical |
| Fuqi e lartë | 7 kW = 7000 W, **lexim i sensorit të fuqisë së laboratorit** | Critical |
| Defekt i pajisjes | status `fault` | Problem state only |

`fault` është status në tabelën `equipment`, jo prag numerik `Warning/Critical`. Digital Twin e shfaq vizualisht si `alarm`, por ndryshimi i këtij statusi nuk krijon automatikisht rresht në `alerts` (`server/src/modules/equipment/service.js:5`; `client/src/components/digital-twin/dynamic-scene.js:27–43`). Një sensor i veçantë `equipment_health` mund të prodhojë alarm numerik, por kjo nuk është e njëjta gjë me testin e statusit `fault`.

Kontrolli i veçantë i energjisë nuk përdor pragjet e mësipërme: punon me leximin **për pajisje** dhe krijon njoftim `energy_abnormal` kur `power_watts > energy_rating_watts × 1.2`, pa nivel `Warning/Critical` (`server/src/modules/energy/anomaly-worker.js:1–5`; `server/src/modules/energy/anomaly-repository.js:11–38,77–91`). Sensori `CLT-THESIS-POWER` është sensor në nivel laboratori, pa lidhje me pajisje; testi 7 kW kontrollon motorin e pragjeve të sensorëve, jo worker-in e veçantë të energjisë.

## Instalimi i sigurt

Nga dosja `server`:

```powershell
npm run db:seed-thesis -- --laboratory-code=KODI_I_LABORATORIT
npm run db:seed-thesis -- --laboratory-code=KODI_I_LABORATORIT --apply
```

Komanda e parë vetëm verifikon laboratorin dhe shfaq sensorët. E dyta i ruan. Nëse kapaciteti nuk është 25, skripti ndalet dhe kërkon që ai të ndryshohet me vetëdije në aplikacion. **`npm run db:seed` nuk i përditëson universitetet demo të krijuara më parë**; ky instalues i veçantë ekziston pikërisht për laboratorin real të testit. Derisa të jepet kodi i saktë i laboratorit, konfigurimi është në kod dhe testet automatike, por **nuk është aplikuar ende në databazën tënde**.

## Regjistrimi i një prove finale me vlera fikse

Skripti `server/scripts/run-thesis-tests.js` ekzekuton gjashtë rastet **një herë** për laboratorin e zgjedhur. Ai kërkon paraprakisht katër sensorët e mësipërm, kapacitetin 25, mungesën e një simulimi aktiv dhe mungesën e alarmeve aktive për ata sensorë. Krijon lexime `sensor_readings` me `source='imported'`, i klasifikon me **të njëjtin funksion** `evaluateSensorReading` që përdor simulimi, ruan alarmet për shkeljet dhe njofton administratorët. Në fund ruan ID-të e leximeve, ID-të e alarmeve dhe klasifikimet në `activity_logs` me veprimin `thesis_test.completed`. I gjithë regjistrimi është një transaksion: gabimi e kthen mbrapsht provën. Një provë e dytë në të njëjtin laborator ndalohet për të mos përzier rezultatet.

Zgjidhni **njërën** nga dy rrugët për skenarin e defektit:

```powershell
npm run db:run-thesis-tests -- --laboratory-code=KODI_I_LABORATORIT --create-test-equipment
npm run db:run-thesis-tests -- --laboratory-code=KODI_I_LABORATORIT --create-test-equipment --apply
```

Kjo krijon pajisjen e veçantë `CLT-THESIS-DEVICE`, fillimisht `active`, pastaj e ndryshon në `fault`. Nuk prek pajisjet e tjera. Nëse duhet përdorur një pajisje ekzistuese, zëvendësoni `--create-test-equipment` me `--equipment-code=KODI_I_PAJISJES`; **kjo do ta lërë pajisjen ekzistuese në status `fault`**. Pa `--apply`, skripti vetëm kontrollon dhe paraqet planin. Pas `--apply`, lexoni JSON-in e kthyer dhe ruani `activityLogId` si referencë për kapitullin 6.

**Kufizim i sinqertë:** kjo provë përdor vlera fikse testuese të importuara, jo dalje natyrore të gjeneratorit dhe jo rrjedhë Socket.IO. Pas provës, faqet e aplikacionit mund t’i lexojnë rezultatet nga DB pas rifreskimit. Worker-i i veçantë i energjisë nuk testohet nga leximi 7 kW i sensorit të laboratorit: ai kontrollon `energy_readings` për pajisje, ndërsa ky test krijon `sensor_readings` të tipit `power`.

## Kufizimet e gjeneratorit

Gjeneratori aktual e afron leximin gradualisht te objektivi (`server/src/modules/simulator/generator.js:69–82`) dhe skenarët nuk marrin drejtpërdrejt një vlerë fikse 29 °C, 70%, 30 persona apo 7 kW. Prandaj, vetëm nisja e simulimit nuk garanton matjet e sakta të gjashtë skenarëve. Testi automatik `server/test/thesis-test-sensors.test.js` i provon këto vlera fikse kundrejt **funksionit real** `evaluateSensorReading`; skripti i mësipërm i ruan si lexime testuese të importuara vetëm kur ekzekutohet me `--apply`.

Krahasimi me abstraktin e konferencës nuk mund të bëhet fjalë për fjalë pa tekstin e tij. Nëse abstrakti thotë se 7 kW jep alarm kritik **nga worker-i i energjisë** ose se `fault` krijon alarm kritik, ai pohim nuk përputhet me implementimin aktual.
