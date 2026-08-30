# Referenca Socket.IO

Socket.IO përdor të njëjtin HTTP server në portin e API-së. Klienti lidhet me
`withCredentials: true` dhe transport `websocket`. Cookie tenant verifikohet
gjatë handshake-it; lidhja pa sesion universiteti refuzohet.

## Dhomat dhe izolimi

Pas autentikimit, serveri shton socket-in në:

- `university:<universityId>` për eventet e tenant-it;
- `university:<universityId>:user:<userId>` për njoftimet personale.

Laboratori nuk bashkohet automatikisht. Klienti kërkon bashkimin dhe serveri
kontrollon tenant-in dhe `user_laboratory_assignments`. Vetëm administratori i
universitetit e anashkalon nevojën e caktimit.

## Eventet nga klienti te serveri

### `laboratory:join`

```json
{ "laboratoryId": "15" }
```

Serveri përgjigjet përmes acknowledgment callback me rezultat suksesi ose gabim
të sigurt. Pas suksesit, socket-i merr eventet e atij laboratori.

### `laboratory:leave`

```json
{ "laboratoryId": "15" }
```

Socket-i largohet vetëm nga dhoma tenant-scoped e laboratorit të kërkuar.

## Eventet nga serveri te klienti

### `sensor:readings`

Një batch për çdo tick simulimi. Batch-i shmang një event të veçantë për çdo
sensor.

```json
{
  "laboratoryId": "15",
  "readings": [
    {
      "sensorId": "31",
      "sensorType": "temperature",
      "value": 24.2,
      "unit": "°C",
      "recordedAt": "2026-08-11T10:00:00.000Z",
      "source": "simulated",
      "simulationRunId": "51"
    }
  ]
}
```

Shtresa realtime e klientit e normalizon batch-in në callback-e
`sensor:reading`, që faqet ekzistuese të përditësojnë markerët dhe kartat pa
njohur formatin e transportit.

### `energy:readings`

```json
{
  "laboratoryId": "15",
  "readings": [
    {
      "equipmentId": "21",
      "powerWatts": 1200,
      "energyKwh": 0.02,
      "recordedAt": "2026-08-11T10:00:00.000Z",
      "source": "simulated",
      "simulationRunId": "51"
    }
  ]
}
```

Klienti e normalizon në callback-e `energy:reading`.

### `occupancy:updated`

```json
{
  "laboratoryId": "15",
  "value": 18,
  "recordedAt": "2026-08-11T10:00:00.000Z",
  "source": "simulated"
}
```

Vlera është shuma e sensorëve të pranisë në tick-un aktual.

### `simulation:updated`

```json
{
  "laboratoryId": "15",
  "simulationRunId": "51",
  "recordedAt": "2026-08-11T10:00:00.000Z",
  "event": null
}
```

`event` përmban incidentin determinist të skenarit ose `null`.

### `dashboard:refresh`

```json
{
  "laboratoryId": "15",
  "recordedAt": "2026-08-11T10:00:00.000Z",
  "reason": "simulation_reading"
}
```

Dashboard-i bashkon eventet e afërta me debounce para se të kërkojë summary-n.

### `alert:created` dhe `alert:updated`

```json
{
  "id": "71",
  "laboratoryId": "15",
  "sensorId": "31",
  "equipmentId": "21",
  "category": "sensor_temperature_threshold",
  "severity": "critical",
  "title": "Prag kritik: Temperatura",
  "description": "Temperatura kaloi pragun kritik.",
  "status": "new",
  "source": "simulated",
  "recordedAt": "2026-08-11T10:00:00.000Z"
}
```

Eventi dërgohet vetëm në dhomën e laboratorit përkatës.

### `notification:created`

```json
{
  "alertId": "71",
  "type": "alert_critical",
  "title": "Prag kritik: Temperatura",
  "message": "Temperatura kaloi pragun kritik.",
  "createdAt": "2026-08-11T10:00:00.000Z"
}
```

Dërgohet vetëm te dhomat personale të marrësve dhe vetëm kur alarmi krijohet,
jo në çdo përditësim të tij.

## Eventet operative të Digital Twin

Ndryshimet e editorit 3D publikohen vetëm në dhomën tenant të laboratorit:

- `twin:asset-created` — një aset u vendos në skenë; payload-i përmban rekordin e plotë të vendosjes.
- `twin:asset-updated` — pozicioni, rotacioni, shkalla, zona ose statusi i një aseti u ndryshua.
- `twin:asset-deleted` — aseti u hoq; payload-i përmban identifikuesin e tij.
- `twin:message-created` — u ruajt një mesazh i ri në kanalin e laboratorit, teknik ose të administratorëve.

Klienti duhet të aplikojë eventin vetëm mbi laboratorin aktiv dhe të përdorë
REST snapshot-in si burim autoritativ pas rilidhjes.

## Rilidhja

Socket.IO tenton rilidhjen automatikisht. Pas eventit `connect`, klienti kërkon
përsëri `laboratory:join` dhe rifreskon snapshot-in REST. Gjatë ndërprerjes,
faqja mban të dhënat e fundit dhe paraqet gjendjen offline/reconnect. REST mbetet
burimi autoritativ pas rilidhjes.

## Evente të rezervuara në klient

Klienti është gati të dëgjojë edhe `equipment:updated` dhe
`maintenance:updated`. Publisher-i aktual nuk i emeton; ato janë pika zgjerimi
për sinkronizim të ardhshëm pa ndryshuar kontratën e konsumuesve.
