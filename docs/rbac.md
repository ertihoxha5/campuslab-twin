# Matrica RBAC

Lejet merren nga rolet e ruajtura në databazë dhe bashkohen pa duplikate kur një
përdorues ka më shumë se një rol. Frontend-i i përdor për navigim dhe route
guards; API-ja i verifikon përsëri me middleware. Kontrolli i frontend-it nuk
zëvendëson autorizimin e serverit.

## Matrica e aftësive

| Aftësia                                           | Platform Admin             | University Admin    | Lab Manager        | Technician           | Academic Staff    | Observer    |
| ------------------------------------------------- | -------------------------- | ------------------- | ------------------ | -------------------- | ----------------- | ----------- |
| Miraton dhe pezullon universitete                 | Po                         | Jo                  | Jo                 | Jo                   | Jo                | Jo          |
| Menaxhon cilësimet dhe auditin e platformës       | Po                         | Jo                  | Jo                 | Jo                   | Jo                | Jo          |
| Menaxhon profilin dhe përdoruesit e universitetit | Jo                         | Po                  | Jo                 | Jo                   | Jo                | Jo          |
| Krijon dhe arkivon laboratorë                     | Jo                         | Po                  | Jo                 | Jo                   | Jo                | Jo          |
| Menaxhon laboratorin                              | Jo                         | Të gjithë në tenant | Vetëm të caktuarit | Jo                   | Jo                | Jo          |
| Menaxhon pajisje dhe sensorë                      | Jo                         | Të gjithë në tenant | Vetëm të caktuarit | Mirëmbajtje/kalibrim | Jo                | Jo          |
| Shikon monitorimin live                           | Vetëm statistika platforme | Po                  | Të caktuarit       | Të caktuarit         | Të lejuarit       | Të lejuarit |
| Përgjigjet ndaj alarmeve                          | Jo                         | Po                  | Të caktuarit       | Të caktuarit         | Raporton probleme | Jo          |
| Menaxhon mirëmbajtjen                             | Jo                         | Po                  | Të caktuarit       | Detyrat e caktuara   | Jo                | Jo          |
| Ekzekuton simulime                                | Jo                         | Po                  | Të caktuarit       | Jo                   | Të lejuarit       | Jo          |
| Gjeneron raporte                                  | Jo                         | Po                  | Të caktuarit       | Jo                   | Të lejuarit       | Jo          |
| Shikon raporte                                    | Jo                         | Po                  | Të caktuarit       | Të caktuarit         | Të lejuarit       | Të lejuarit |

## Kodet e lejeve

Kjo listë është kontrata që përdoret nga route-t dhe testet.

<!-- permission-codes:start -->

- `platform.universities.review`
- `platform.statistics.view`
- `platform.settings.manage`
- `platform.audit.view`
- `university.profile.manage`
- `university.users.manage`
- `laboratories.create`
- `laboratories.manage`
- `laboratories.view`
- `assets.manage`
- `assets.maintain`
- `monitoring.view`
- `alerts.respond`
- `alerts.report`
- `maintenance.manage`
- `maintenance.assigned`
- `simulations.run`
- `reports.generate`
- `reports.view`

<!-- permission-codes:end -->

## Lejet sipas rolit

<!-- role-permissions:start -->

### platform_admin

- `platform.universities.review`
- `platform.statistics.view`
- `platform.settings.manage`
- `platform.audit.view`

### university_admin

- `university.profile.manage`
- `university.users.manage`
- `laboratories.create`
- `laboratories.manage`
- `laboratories.view`
- `assets.manage`
- `assets.maintain`
- `monitoring.view`
- `alerts.respond`
- `maintenance.manage`
- `maintenance.assigned`
- `simulations.run`
- `reports.generate`
- `reports.view`

### lab_manager

- `laboratories.manage`
- `laboratories.view`
- `assets.manage`
- `assets.maintain`
- `monitoring.view`
- `alerts.respond`
- `maintenance.manage`
- `maintenance.assigned`
- `simulations.run`
- `reports.generate`
- `reports.view`

### technician

- `laboratories.view`
- `assets.maintain`
- `monitoring.view`
- `alerts.respond`
- `maintenance.assigned`
- `reports.view`

### academic_staff

- `laboratories.view`
- `monitoring.view`
- `alerts.report`
- `simulations.run`
- `reports.generate`
- `reports.view`

### observer

- `laboratories.view`
- `monitoring.view`
- `reports.view`

<!-- role-permissions:end -->

## Kufizimi sipas laboratorit

`university_admin` ka qasje në të gjithë tenant-in. Rolet e tjera tenant marrin
vetëm laboratorët që ekzistojnë në `user_laboratory_assignments`. Repository-t
kombinojnë `university_id`, `user_id` dhe `laboratory_id`; një permission nuk e
anashkalon këtë kufizim.

Administratori i platformës nuk është përdorues tenant dhe nuk merr permission-e
të laboratorëve. Ai përdor tabelat, token-at, cookie-t dhe route-t e platformës.

## Zbatimi

Kur një endpoint kërkon permission:

1. middleware-i verifikon sesionin dhe statusin aktiv të universitetit;
2. rolet lexohen nga databaza, jo nga body ose nga pretendimet e klientit;
3. `requirePermissions` kontrollon permission-in;
4. për burimet e laboratorit kontrollohet edhe caktimi;
5. repository ekzekuton query tenant-scoped.
