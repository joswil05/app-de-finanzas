# Arranque de construcción — 2026-10-15

Autorización: el usuario confirmó usuarios independientes y pidió continuar y ejecutar el plan. Mantener GPT‑6.1 Sol, autonomía técnica y límites de costos/privacidad establecidos.

Estado inicial observado: solo documentación, sin aplicación, sin repositorio Git previo. Node24.14.1, npm11.11.0 y Java21 disponibles. Se inicializó repositorio local en rama codex/finance-pwa. No había rama principal, cambios de aplicación previos ni tests de base. Se trabaja en este repositorio nuevo dedicado, sin mover documentos a un checkout vacío; no se crea remoto ni se publica.

Modelo de trabajo: agentes con contexto aislado y archivos de propiedad disjuntos; coordinador integra configuración, contratos y revisiones. T01 produce instalación y configuración; T02 tipos; las tareas de dominio, datos y UI respetan dependencias, permitiendo exploración local independiente mientras no hay credenciales externas.

Servicios reales no configurados: Firebase, Groq, Cloudflare y notificaciones a hardware real. Emuladores y datos ficticios permiten construir y probar localmente. Nunca marcar integración real validada por usar un mock.

Actualización documental aplicada a inventario, especificación, contratos, tareas, README e instrucción de arranque: registro/verificación, namespace por UID, aislamiento de caché/outbox/PIN/chat, respaldo del mismo usuario, cuotas individuales/globales y notificaciones sin cruces. Vectores V31–V38 agregados; total38.
