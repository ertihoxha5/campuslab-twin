# Rezultatet përfundimtare — Kapitulli 6

Laboratori: LAB-AUT-01 · Batch: e14ef4e8-7635-428c-8333-d2e6bf9deab3

| Skenari | Vlera e simuluar | Rezultati i pritur | Rezultati i arritur | Niveli | Statusi |
| --- | --- | --- | --- | --- | --- |
| Gjendja normale | 23 °C, 45 %, 10 persona, 2 kW, active | Pa alarm; pajisja aktive | Pa alarm; pajisja aktive | Normal | PASS |
| Temperatura e lartë | 29 °C | Alarm paralajmërues | Alarm paralajmërues | Warning | PASS |
| Lagështia e lartë | 70 % | Alarm paralajmërues | Alarm paralajmërues | Warning | PASS |
| Tejkalimi i pranisë | 30 persona | Alarm kritik | Alarm kritik | Critical | PASS |
| Fuqia e lartë | 7 kW | Alarm kritik | Alarm kritik | Critical | PASS |
| Defekt në pajisje | status = fault | Pajisja në gjendje fault | Pajisja në gjendje fault | Problem state only | PASS |

Rezultati përfundimtar: 6 / 6 PASS; 0 / 6 FAIL.

Të gjashtë skenarët prodhuan rezultatin e pritur.

Vlerësimi bazohet në leximet, alarmet dhe statusin e pajisjes të ruajtur gjatë ekzekutimit. Nuk është test automatik i paraqitjes vizuale në shfletues.
