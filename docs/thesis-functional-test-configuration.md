# CampusLab Twin — konfigurimi i propozuar për Kapitullin 6

Ky është konfigurim **opt-in** për katër sensorë testues të një laboratori me kapacitet 25. Më 11 tetor 2026 u aplikua vetëm në UBT `LAB-AUT-01` (ID 5); sensorët e mëparshëm nuk u ndryshuan. Rezultatet e ekzekutimit janë dokumentuar veçmas te `docs/thesis-results/chapter-6-results.md`.

| Parametri | warningMin | warningMax | criticalMin | criticalMax | Vlera e provës |
|---|---:|---:|---:|---:|---|
| Temperaturë, °C | 18 | 27 | NULL | 32 | 29 → Warning |
| Lagështi, % | 30 | 60 | NULL | 71.9999 | 70 → Warning; 72 → Critical |
| Prani, persona | NULL | 25 | NULL | 29 | 30 → Critical |
| Fuqi, W | 500 | 5000 | NULL | 6999.9999 | 7000 → Critical |

Vlerat janë në `server/seeds/thesis-test-sensors.js`; instaluesi është `server/scripts/seed-thesis-sensors.js`. Funksioni real `evaluateSensorReading` në `server/src/modules/alerts/rule-engine.js` përdor krahasimin strikt `>` / `<`. Prandaj vlerat 71.9999 dhe 6999.9999 afrojnë pragjet përkatëse gjithëpërfshirëse `>=72%` dhe `>=7 kW`; në kufijtë mes këtyre vlerave ekziston një diferencë e vogël numerike. Intervali 26–27 °C është gjithashtu boshllëk mes përshkrimit “normal deri 26” dhe rregullit “Warning >27”. Këto mospërputhje duhen sqaruar në tezë, jo fshehur.

Sensori i fuqisë mat fuqi të laboratorit në W dhe mund të prodhojë alarm të tipit të sensorit. Worker-i i veçantë i energjisë përdor `energy_readings` për pajisje dhe pragun `power_watts > energy_rating_watts × 1.2`; ai krijon njoftim, jo alarm Warning/Critical. Statusi `fault` i pajisjes shfaq gjendje problematike, por nuk krijon vetvetiu alarm sensorik.

Para provës, `LAB-AUT-01` kishte kapacitet 24 dhe simulimin aktiv ID 8. Me autorizimin e përdoruesit, simulimi u ndal përmes repository-së së aplikacionit, kapaciteti u vendos 25 dhe u shtuan sensorët testues ID 11–14. Komandat e instaluesit për një mjedis tjetër janë:

```powershell
cd server
npm run db:seed-thesis -- --laboratory-code=KODI
npm run db:seed-thesis -- --laboratory-code=KODI --apply
```

Komanda e parë është kontroll pa shkrim. Instalimi nuk ekzekuton gjashtë skenarët. Nuk duhet përdorur ish-skripti që fuste alarme drejtpërdrejt në DB: ai u hoq sepse nuk provonte krijimin e alarmit nga sistemi. Provat e tanishme përdorën `evaluateSimulationReadings` dhe `createSimulatorRepository.persistStep` të aplikacionit me lexime numerikisht të kontrolluara. Kjo verifikon rrjedhën e alarmit në backend, por jo gjeneratorin gradual, Socket.IO apo UI; këto kufizime duhet të mbeten të shënuara në tezë.
