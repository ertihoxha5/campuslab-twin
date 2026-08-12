# Demonstrimi dhe kufizimet e prototipit

Ky udhëzues përmbledh një demonstrim 10–12 minutësh të CampusLab Twin. Para
prezantimit ekzekutoni migrimet dhe seed-in sipas README-së, nisni aplikacionin
me `npm run dev` dhe mbani hapur `http://localhost:5173`.

## Llogaritë demonstruese

Fjalëkalimi për të gjitha llogaritë merret nga `DEMO_ACCOUNT_PASSWORD` në
`.env`; vlera e skedarit shembull është vetëm për zhvillim lokal.

| Roli                                   | Email-i                       |
| -------------------------------------- | ----------------------------- |
| Administratori i platformës            | `admin@campuslab.demo`        |
| Administratori i universitetit të parë | `admin@uni-prishtina.demo`    |
| Menaxheri i laboratorit të parë        | `menaxher@uni-prishtina.demo` |
| Tekniku i universitetit të parë        | `teknik@uni-prishtina.demo`   |
| Administratori i universitetit të dytë | `admin@upt.demo`              |

Për rolet akademik dhe vëzhgues përdorni prefikset `akademik@` dhe
`vezhgues@` me domain-in e universitetit përkatës. Mos përdorni këto kredenciale
në prodhim.

## Para prezantimit

1. Ekzekutoni `npm run db:migrate`, `npm run db:seed` dhe `npm run db:verify`.
2. Ekzekutoni `npm test`, `npm run lint` dhe `npm run build`.
3. Verifikoni `GET http://localhost:3000/api/health` dhe hapni klientin.
4. Përdorni dy profile të ndara të shfletuesit për dy universitetet, që cookie-t
   `HttpOnly` të mos zëvendësojnë njëra-tjetrën.

## Skenari i prezantimit

1. **Faqja publike dhe regjistrimi — 1 minutë.** Prezantoni shkurt Digital Twin,
   hapni `Regjistro Universitetin`, plotësoni një kërkesë testuese dhe tregoni
   mesazhin që kërkesa pret shqyrtim. Të dhënat mund të jenë demonstrative, por
   duhet të plotësojnë validimin e formularit.
2. **Miratimi nga platforma — 1 minutë.** Hyni te `/administrimi/kycu` si
   administratori i platformës, hapni kërkesat dhe miratoni kërkesën. Theksoni
   se administratori i platformës është i ndarë nga përdoruesit tenant.
3. **Izolimi multi-tenant — 1 minutë.** Në dy profile hyni si administratorët e
   universiteteve. Krahasoni emrin, laboratorët dhe matjet e ndryshme; provoni
   një URL me ID të universitetit tjetër dhe tregoni përgjigjen `404`.
4. **Monitorimi — 1 minutë.** Në universitetin e Prishtinës hapni Laboratorin e
   Rrjeteve Kompjuterike, pastaj monitorimin në kohë reale. Shpjegoni etiketën e
   të dhënave të simuluara, vlerat e sensorëve dhe përditësimet Socket.IO.
5. **Digital Twin 3D — 2 minuta.** Hapni skenën 3D, ndërroni pamjen e kamerës,
   aktivizoni zbulimin e sensorëve dhe zgjidhni një pajisje. Tregoni zonat,
   gjendjen, shëndetin, energjinë dhe alarmet e lidhura me objektin.
6. **Alarmi — 1 minutë.** Nisni skenarin e rritjes së temperaturës ose të
   ventilimit. Hapni alarmin e krijuar, pranojeni dhe zgjidheni me shënim.
   Theksoni deduplikimin dhe përditësimin e të njëjtit burim në dashboard e 3D.
7. **Mirëmbajtja — 1 minutë.** Krijoni ose hapni një detyrë për pajisjen,
   caktojani teknikut dhe shtoni një përditësim. Tregoni historikun kronologjik.
8. **Simulimi dhe analitika — 1 minutë.** Hapni Simulimet, shfaqni konfigurimin,
   ndaloni ose rivendosni skenarin dhe krahasoni rezultatet në Analitikë.
   Sqaroni se rekomandimet bazohen në rregulla, jo në machine learning.
9. **Raporti — 1 minutë.** Gjeneroni një raport laboratori për periudhën e
   zgjedhur, hapni pamjen dhe shkarkoni PDF ose CSV. Tregoni universitetin,
   autorin, kohën dhe shënimin e burimit të simuluar.

## Pikat që duhen theksuar

- Identiteti i universitetit merret nga JWT-ja e verifikuar në server dhe nuk
  besohet nga body, query string ose header i ndryshueshëm.
- Çdo query e burimeve tenant filtrohet me `university_id`; rolet e kufizuara
  kontrollohen edhe sipas laboratorit të caktuar.
- Vlerat e sensorëve janë sintetike dhe identifikohen si simulim. Simulatori
  mund të zëvendësohet më vonë nga një adapter MQTT/HTTP për pajisje IoT reale.
- Raportet dhe modelet 3D shërbehen vetëm pas autentikimit dhe kontrollit të
  pronësisë tenant.

## Kufizimet e njohura

- Integrimi me pajisje fizike IoT, broker MQTT dhe kalibrimi hardware nuk janë
  pjesë e këtij prototipi; leximet prodhohen nga simulatori.
- Ruajtja e skedarëve është lokale. Vendosja në prodhim kërkon object storage,
  skanim malware, kopje rezervë dhe politika retention-i të administruara.
- Rikuperimi i fjalëkalimit ka adapter njoftimi, por dërgimi real i email-it
  kërkon konfigurimin e një ofruesi të jashtëm.
- Nuk përfshihen SSO universitar, aplikacion mobil, faturim, BIM/skanim
  fotorealist dhe modele parashikuese machine learning.
- Skena 3D është optimizuar për objektivin e dokumentuar të laptopit, por
  performanca ndryshon sipas GPU-së, shfletuesit dhe madhësisë së modelit GLB.
- Prototipi përdor një proces Node.js dhe storage lokal; disponueshmëria e lartë,
  autoscaling, CDN dhe observability e prodhimit kërkojnë infrastrukturë shtesë.
- Të dhënat dhe llogaritë e seed-it janë vetëm demonstrative. Para një vendosjeje
  reale duhen ndryshuar sekretet, fjalëkalimet, domain-et dhe politikat operative.

## Mbyllja e demonstrimit

Përfundoni duke lidhur rrjedhën: regjistrim → miratim → workspace i izoluar →
monitorim → Digital Twin 3D → alarm → mirëmbajtje → simulim → analitikë → raport.
Kjo tregon se ndërfaqja, API-ja, databaza dhe kanali real-time punojnë si një
sistem i vetëm tenant-aware.
