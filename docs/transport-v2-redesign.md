# Transporte v2 — Rediseño

## Problema (v1)
- Meta de carro en 4 fuentes: borrador registro, `carMetaBySource`, cache lazy, subcolección `transport_car_meta`, resumen en `app_events`.
- Registro acoplado a `App.jsx` (~70 referencias transporte).
- Escrituras Firestore en cadena (participante + batch car meta + updateDoc evento).
- `TransportPlanningPage.jsx` monolito (~4000 líneas).

## Modelo v2

### Subcolección `app_events/{eventId}/transport_vehicles/{vehicleId}`
Un documento por vehículo. `vehicleId` = `{ownerParticipantId}__c{carIndex}`.

### Flag en evento
`transportPlanning.transportVersion: 2` — activa lectura/escritura v2.

## API (`src/transport/v2/transportService.js`)
| Método | Uso |
|--------|-----|
| `isTransportV2(event)` | Comprueba versión |
| `getFamilyVehicles(eventId, ownerParticipantId)` | Lee vehículos de un titular |
| `validateRegistrationTransport(draft)` | Validación pura |
| `saveRegistrationTransport(...)` | Tras alta de participante (fire-and-forget) |
| `saveVehiclePatch(eventId, vehicleId, patch)` | Auto-guardado en Transporte |
| `migrateEventToV2(eventId, ...)` | Migración v1 → v2 |

## Migración
- Lazy al abrir Transporte si `transportVersion < 2`.
- Copia subcolección `transport_car_meta` → `transport_vehicles`.
- Marca evento con `transportVersion: 2`.

## Fases desplegadas
1. **v2 service + schema** — este commit
2. **Registro** — `registrationTransportBridge` en `handleAddEntry`
3. **Lectura dual** — `fetchCarMetaForTitular` intenta v2 primero
4. **UI modular** — hooks + secciones extraídas de TransportPlanningPage
