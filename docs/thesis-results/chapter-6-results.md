# CampusLab Twin — rezultatet e Kapitullit 6

Data e provës: 11 tetor 2026. Mjedisi: databaza lokale MySQL, universiteti UBT (ID 6), `LAB-AUT-01` / Laboratori i Automatizimit (ID 5). Simulimi i mëparshëm ID 8 u ndal me mekanizmin e aplikacionit. Kapaciteti u ndryshua nga 24 në 25. Sensorët testues kanë ID 11 (temperaturë), 12 (lagështi), 13 (prani), 14 (fuqi). Pajisja testuese ka ID 13.

Leximet fikse u futën në `createSimulatorRepository.persistStep`, pasi kandidatët e alarmit u llogaritën me **funksionin real** `evaluateSimulationReadings`. Për secilin rast u nis dhe u ndal një `simulation_run` real. Kjo provon rrjedhën e vlerësimit, ruajtjes, krijimit të alarmit dhe njoftimit, por **jo gjeneratorin gradual të vlerave** dhe **jo transmetimin Socket.IO**. Alarmet nuk u futën drejtpërdrejt në databazë. Nuk ka prova HTTP/UI apo screenshot-e të kryera; prandaj asnjë rresht nuk shënohet ende `PASSED` sipas kriterit të plotë të tezës.

| Skenari | Vlera e simuluar | Rezultati i pritur | Rezultati i arritur në DB | Niveli | Statusi end-to-end |
|---|---|---|---|---|---|
| 1. Normal | 23 °C; 45%; 10 persona; 2 kW; active | Pa alarm | 4 lexime, 0 alarme; run 9 | Normal | Në pritje të UI/API |
| 2. Temperaturë | 29 °C | Alarm Warning | Leximi 20; alarmi 4; 2 njoftime; run 10 | Warning | Në pritje të UI/API |
| 3. Lagështi | 70% | Alarm Warning | Leximi 25; alarmi 5; 2 njoftime; run 11 | Warning | Në pritje të UI/API |
| 4. Prani | 30 persona | Alarm Critical | Leximi 30; alarmi 6; 2 njoftime; run 12 | Critical | Në pritje të UI/API |
| 5. Fuqi | 7 kW | Alarm/rezultat i energjisë | Run 13 krijoi leximin 35, alarm kritik ID 7 dhe 2 njoftime; run 15 e përditësoi më vonë të njëjtin alarm në Warning për 498.7095 W | Critical **në momentin e provës**; Warning aktualisht | Nuk verifikohet si Critical në UI aktuale |
| 6. Defekt | fault | Gjendje problematike | Pajisja testuese 13: `fault`; 0 alarme të reja; run 14 | Problem state | Në pritje të UI/API |

**Evidenca e databazës: 6/6 përputhen me pritshmërinë në nivel leximi/klasifikimi/ruajtjeje. Teste të plota të kaluara: ende të papërcaktuara; UI/API i autentikuar nuk është verifikuar.** Backend-i nisi në portën 3001 dhe `/api/health` ktheu `healthy`; Vite nisi në portën 5173. Mjedisi i automatizimit nuk ofroi shfletues/sesion të autentikuar, ndaj nuk u kapën screenshot-e. Mos e përdorni këtë tabelë si pohim “gjashtë teste të kaluara” në tezë ose konferencë para kontrollit të UI.

Më vonë përdoruesi nisi simulimin ID 15 në të njëjtin laborator. Deduplikimi e përditësoi alarmin aktiv ID 7 nga `Critical` për 7000 W në `Warning` për 498.7095 W. Ngjarja e pandryshueshme `alert_generated` e run 13 dhe njoftimet `alert_critical` ruajnë evidencën e rezultatit fillestar, por screenshot-i i alarmit aktual **nuk** provon më skenarin 7 kW si kritik. Simulimi ID 15 nuk u ndal ose ndryshua nga kjo verifikim.

Për evidencën e plotë, hyni si administrator i UBT, hapni `/aplikacioni/sensoret` dhe sensorët testues, si dhe `/aplikacioni/alarmet` ose faqen përkatëse të alarmeve. Kapni të paktën alarmet ID 4 (29 °C), 5 (70%) dhe 6 (30 persona), bashkë me vlerën dhe laboratorin. Kontrolloni edhe alarmin ID 7 të fuqisë dhe pajisjen `CLT-THESIS-DEVICE` në faqen e pajisjeve. Pas këtij kontrolli mund të vendosen statuset përfundimtare.

## Përgjigje të përkohshme për pyetjet kërkimore

1. Implementimi përdor laboratorë, sensorë me pragje, lexime kohore, pajisje, simulime, alarme dhe njoftime. Shtresa e Digital Twin i bashkon këto të dhëna në pamje operative, por kjo pamje nuk u verifikua gjatë provës së tanishme.
2. Platforma përdor skenarë simulimi, lexime të ruajtura me identitet laboratori/universiteti, motorin e pragjeve dhe rrjedhën transaksionale për alarmet/njoftimet. Vlerat e kësaj prove u injektuan në kufirin e ruajtjes së simulimit për saktësi numerike, jo nga gjeneratori gradual.
3. Në databazë, të gjashtë rastet dhanë përgjigjen e pritur. Saktësia e paraqitjes në UI mbetet pa evidencë.

**Hipoteza:** nuk mund të vlerësohet ende përfundimisht pa verifikuar pamjen e integruar Digital Twin. Për momentin: **Konfirmohet pjesërisht**, vetëm për rrjedhën e të dhënave dhe identifikimin në backend; jo për pretendimin e një pamjeje të vetme të verifikuar.

**Fjali e saktë për abstraktin në këtë fazë:** “All six controlled scenarios produced the expected database-side outcomes; end-to-end UI validation remains pending.”

## Mospërputhje dhe kufizime

- `7 kW` krijoi alarm `Critical` nga sensori i fuqisë i laboratorit; worker-i i veçantë i energjisë nuk u testua dhe përdor rregullin `> 1.2 × fuqia nominale` për njoftim pa shkallë Warning/Critical.
- `fault` nuk krijoi alarm ose njoftim automatik. U verifikua vetëm statusi i pajisjes në DB; paraqitja vizuale mbetet për t'u kontrolluar.
- Motori përdor `>` strikt. `criticalMax=71.9999%` dhe `6999.9999 W` afrojnë kërkesat `>=72%` dhe `>=7 kW`, por ka diferencë shumë të vogël në kufi. Po ashtu, intervali 26–27 °C mbetet i papërcaktuar në përshkrimin e tezës.
- Kohët e kthimit të `recorded_at` dhe `created_at` tregojnë diferencë dyorëshe nga interpretimi i zonës kohore MySQL/klient; përdorni ID-të e ekzekutimit/leximit për lidhje, jo vetëm orën e paraqitur.
