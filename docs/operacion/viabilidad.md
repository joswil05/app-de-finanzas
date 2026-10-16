# Viabilidad de servicios — puerta G01

Fecha: 2026-10-15, America/Managua. Entorno local: Windows x64, Node 24.14.1, npm 11.11.0, Temurin Java 21.0.12.1.

**G01 ABIERTA.** El usuario confirmó que todavía no existe un proyecto Firebase. Tampoco hay credenciales Groq/Cloudflare ni acceso a iPhone/Android físicos en esta ejecución. No se crearon cuentas, se activó facturación ni se desplegaron servicios. La aplicación admite usuarios independientes; la autenticación y autorización deben aislar datos por UID, sin allowlist de un propietario.

| Fecha | Entorno | Caso | Esperado | Observado | Evidencia | Estado |
|---|---|---|---|---|---|---|
| 2026-10-15 | Windows local | Arnés, zona Managua, compilación base | Comandos reproducibles y fecha de negocio correcta | Registrar resultados definitivos en T01 | `docs/ejecucion/T01.md` | Pendiente de verificación local |
| 2026-10-15 | Windows local | JOSE/WebCrypto con clave efímera y datos ficticios | Firma válida y audiencia incorrecta rechazada | Pendiente de ejecución del probe local; no es token Firebase real | `experiments/viability/probe-local.mjs` | Pendiente de verificación local |
| 2026-10-15 | Firebase Spark real | Google/email, dos usuarios, aislamiento UID, persistencia y lotes offline | Sesión y datos aislados, cierre/reapertura y reconexión correctos | Usuario confirmó proyecto aún inexistente; código funcional corresponde T05/T06 | Requisitos en `experiments/viability/README.md` | NO EJECUTADO |
| 2026-10-15 | iPhone/Android físicos | Instalación, offline, teclado, push con app cerrada | Flujos demostrados con versiones de SO/navegador | No hay dispositivos conectados; app/PWA/push aún sin implementar | Matriz física por completar T19/T22 | NO EJECUTADO |
| 2026-10-15 | Groq Free real | Disponibilidad, modelo con tools, español, ZDR y cuotas | Evaluación ficticia y retención confirmadas | Sin cuenta/credencial ni confirmación ZDR | Evaluación por implementar T20/T21 | NO EJECUTADO |
| 2026-10-15 | Workers Free real | CPU de JWT/streaming/OAuth, 30 llamadas por flujo | Medición CPU del proveedor dentro del límite gratuito vigente | Sin cuenta ni flujos integrados; dry-run local no mide CPU remoto | Protocolo en `experiments/viability/README.md` | NO EJECUTADO |
| 2026-10-15 | BCN canal publicado | Tasa fechada, condiciones y formato; fallback | Fuente válida y alternativa manual visible | Canal/adaptador aún sin investigar e implementar T18 | Requisito pendiente T18; no se codificó tasa | NO EJECUTADO |

El límite de CPU indicado por el plan debe contrastarse con condiciones oficiales al realizar la medición real. La integración permanece abierta hasta reunir evidencia externa. Simulación de dispositivos y emuladores no sustituyen aceptación física ni proveedor real.

