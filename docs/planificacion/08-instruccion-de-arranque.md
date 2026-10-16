# Instrucción de arranque para GPT‑6.1 Sol

Construí la app siguiendo `docs/planificacion/07-plan-maestro-agentes.md`. Antes de escribir código, leé también `05-especificacion-consolidada.md`, `06-contratos-y-pruebas.md` y `04-inventario-interfaces.md` de esa carpeta, y cualquier AGENTS.md aplicable.

Usá GPT‑6.1 Sol. Empezá por T01 o retomá la primera tarea pendiente con dependencias cumplidas en `docs/ejecucion/estado.md`. El plan permite agentes para tareas independientes, con propiedad de archivos definida y revisión separada; no paralelicés contratos, lockfile, router, reglas o service worker. Si trabajás secuencialmente, mantené las mismas verificaciones.

Construí todas las funciones acordadas, no solo pantallas. Implementá primero contratos y motor financiero; usá ese motor en todas las interfaces y en el asistente. No inventés cálculos distintos por módulo. Verificá cada tarea con sus pruebas y registrá resultados reales en `docs/ejecucion/Txx.md` antes de marcarla HECHA.

Admití varios usuarios independientes desde la primera versión. Cada UID tiene finanzas, configuración, sesión de chat, dispositivos y cuotas propios; sin cuentas compartidas. Implementá registro/verificación y probá A/B con acceso propio permitido y cruzado rechazado, incluso al cambiar de cuenta offline. No implementés la antigua allowlist de un único propietario. Leé V31–V38 y la matriz multiusuario del plan.

Tenés libertad para investigar, consultar documentación y coordinarte con los agentes participantes; el plan no es inmutable. Si algo no funciona como se esperaba, diagnosticá y adaptá librerías auxiliares, contratos internos, archivos, componentes, tareas u orden de ejecución conservando los requisitos. No pidas permiso por ajustes técnicos equivalentes. Seguí la política de autonomía del plan maestro, registrá decisiones materiales en `docs/ejecucion/decisiones.md`, actualizá documentos y consumidores, y probá el cambio. Consultá al usuario si cambia alcance, reglas financieras visibles, base PWA/Firebase, costos, privacidad o autorizaciones externas. No rebajés pruebas ni ocultés limitaciones para dar algo por terminado.

Mantené Firebase Spark y los demás servicios en planes gratuitos; no actives facturación. Usá datos ficticios durante desarrollo. Validá las integraciones y dispositivos de G01 antes de afirmar que funcionan. Si faltan credenciales o hardware, continuá tareas independientes y dejá explícitas las comprobaciones bloqueadas.

Conservá todo trabajo existente. No publiques servicios o la PWA, envíes datos reales a proveedores nuevos ni borres datos reales sin autorización aplicable. Prepará primero los resultados revisables. No pidas confirmación para cada cambio reversible ya autorizado.

Al terminar cada sesión, actualizá el estado, indicá tareas completadas con evidencia, bloqueos y siguiente tarea. No declares la app completa mientras falten pruebas reales de iOS/Android, seguridad, restauración o integraciones obligatorias.
