# G01: pruebas aisladas con datos ficticios

La instalación de un SDK y los resultados locales no validan los servicios reales. No enviar datos personales, activar facturación, crear cuentas ni desplegar como parte de estas pruebas.

## Comprobación local disponible

Desde la raíz: `node experiments/viability/probe-local.mjs`. Comprueba fecha Managua, firma/verificación RS256 efímera con JOSE y soporte WebCrypto. No utiliza credenciales ni red; no mide CPU de Cloudflare, no valida tokens de Firebase y no prueba streaming ni push.

## Ejecución externa pendiente

| Flujo | Preparación necesaria | Evidencia que debe guardarse |
|---|---|---|
| Firebase Auth/Firestore Spark | Proyecto del usuario, Google/email habilitados, dos usuarios ficticios, reglas T05 y app T06 | Inicio/cierre de sesión, denegación cruzada de UID, persistencia y reconexión |
| iOS/Android | Equipos físicos, SO/navegador anotados, PWA HTTPS preparada | Instalación, cierre/reapertura offline, teclado y notificación con PWA cerrada |
| Groq herramientas/ZDR | Cuenta gratuita del usuario y confirmación ZDR; secreto solo en Worker | Modelo exacto, cuotas, 20 preguntas ficticias, herramientas y retención verificada |
| Workers CPU | Cuenta Free y flujos implementados T19/T20, autorización de publicación aplicable | 30 ejecuciones por flujo con CPU del proveedor, percentiles y fallos; reloj local no equivale a CPU |
| BCN | Canal publicado identificado y condiciones revisadas en T18 | Respuesta fechada, validación de formato y caso sin tasa; una página accesible no es una tasa válida |

Los secretos se cargan fuera del repositorio con `wrangler secret put`. Los outputs sanitizados pueden conservarse en `experiments/viability/results/`, excluido de Git. Registrar fecha, entorno, esperado, observado, evidencia y PASS/FAIL/NO EJECUTADO en `docs/operacion/viabilidad.md`. Mientras falten requisitos, conservar G01 abierto y continuar tareas locales.
