# Registro de decisiones de ejecución

Registrar aquí cambios materiales conforme a la política de autonomía del plan maestro. La construcción aún no ha comenzado.

## Formato por decisión

- ID y fecha.
- Tarea(s) afectada(s).
- Problema y evidencia reproducible o fuente oficial.
- Alternativas evaluadas y razón de la elección.
- Cambio elegido y alcance.
- Impacto en comportamiento financiero, datos, costo, privacidad y compatibilidad.
- Autoridad: ajuste técnico autónomo, coordinación interna o decisión explícita del usuario.
- Archivos y documentos actualizados; consumidores notificados.
- Pruebas ejecutadas y resultados.
- Reversión o migración necesaria.

No registrar cambios como aprobados por el usuario si solo fueron decididos técnicamente por un agente. Ajustes menores sin efecto en contratos o comportamiento se documentan en la evidencia de la tarea.

## D001 — Usuarios independientes desde la primera versión

- Fecha: 2026-10-15. Tareas: T02/T05/T06/T17/T19/T20/T21/T22/T23/T24.
- Autoridad: decisión explícita del usuario, seguida por autorización de construcción.
- Cambio: sustituir allowlist de un único propietario por registro/verificación y namespace UID; aislar datos, caché, PIN, borradores, chat, push y cuotas.
- Documentos: 01/03/04/05/06/07/08 y README actualizados; vectores V31–V38.
- Pruebas: pendientes de implementación; no existe evidencia de producción.
- Costos: cuotas de servicios gratuitas compartidas; límites individuales/globales, sin activar facturación.

## D002 — Desarrollo local mientras se crea infraestructura real

- Fecha: 2026-10-15. Tareas: T01 y G01.
- Evidencia: el usuario confirmó que todavía no tiene un proyecto Firebase.
- Elección: construir con emuladores, configuración .env.example y datos ficticios; integración real marcada NO EJECUTADO.
- Motivo: no bloquea dominio, interfaces ni reglas verificables localmente.
- Sin despliegue ni creación de cuentas externas por esta decisión. Preparar guía reproducible al integrar.

## D003 — Compromisos derivados y fixtures reproducibles

- Fecha: 2026-10-15. Tareas: T02/T04/T11/T14.
- Hallazgo: Snapshot contiene compromisos, pero las revisiones no definen un agregado de compromiso independiente. Son proyecciones de recurrentes, préstamos y tarjetas según la especificación.
- Elección: fixture baseline deriva obligación NIO500000 centavos de recurrente `commitment-monthly`, fecha2026-10-31, cuenta cash-nio; occurrenceId `commitment-monthly:2026-10-31:0`.
- Autoridad: aclaración técnica coordinada, sin cambio de regla financiera.
- Validación prevista: fixtureSnapshot y proyección de fixtureRevisions producen mismos saldos, reservas y disponible; tests de dominio aplican.

## D004 — Validación por capas ante presupuesto de expresiones Firestore

- Fecha: 2026-10-18. Tareas: T05/T04/T06 y consumidores de revisiones.
- Evidencia reproducible: las pruebas aisladas devolvieron `maximum of 1000 expressions` al validar completamente8 apuntes y60 cuotas en rules; documentos propios válidos se rechazaban. Proyecto exclusivo demo-finanzas-tests, Firestore8180, configuración firebase.rules-test.json.
- Autoridad: adaptación técnica coordinada por los agentes, dentro de la autonomía autorizada; no es una decisión financiera nueva del usuario.
- Elección: conservar límites de8 apuntes,4 flujos,20 padres y60 cuotas. Rules impone aislamiento absoluto por UID/correo, inmutabilidad, claves y estructuras acotadas por tipo. Los apuntes conservan validación estructural de todos sus elementos, moneda e importe entero; el dominio valida magnitud, balance y coherencia financiera completa. Planes de cuotas validan exterior/lista en servidor; cada cuota se valida íntegramente por Zod en append y lectura.
- Defensa del consumidor: repositorio aplica RevisionSchema, límite64KiB y el validateMovement canónico en ambos bordes. Lotes remotos corruptos quedan fuera de proyección confiable, error/rejected visible e hydrated=false; no mostrar totales completos. No atribuir validación financiera total a rules.
- Alternativas: reducir listas habría recortado requisitos; mantener expansión completa rechazaba registros válidos; validación privilegiada mediante endpoint servidor requeriría integración adicional. La última puede evaluarse después para endurecer datos propios; el aislamiento entre usuarios no depende de ella.
- Impacto: no cambia cálculos, cuotas máximas visibles, privacidad entre UID ni costo del servicio. Un cliente alterado puede guardar datos anidados inválidos en su propia cuenta; clientes legítimos los detectan y bloquean hidratación completa. No elimina el límite de tamaño de documento de Firestore ni sustituye recuperación administrativa de datos remotos corruptos.
- Archivos: firestore.rules, repositorio/outbox y tests/data+rules, docs/ejecucion/T05.md. Coordinación notificada a agente raíz y T06. Pruebas:9 unit de datos y7 de rules pasan localmente; sin validación en producción ni hardware.
- Migración: ninguna modificación de esquema persistido. Una futura validación servidor deberá reutilizar contratos/dominio y conservar IDs y formato de revisión.
