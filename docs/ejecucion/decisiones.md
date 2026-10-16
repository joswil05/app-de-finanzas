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
