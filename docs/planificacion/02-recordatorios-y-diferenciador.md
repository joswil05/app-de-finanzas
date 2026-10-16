# Investigación: recordatorios gratuitos y diferenciador

Fecha: 2026-10-15. Estado: propuesta documental, sin implementación ni servicios creados.

## Recordatorios

Recomendación candidata: Firebase Spark para Authentication, Firestore y Hosting; FCM para entrega push; Cloudflare Workers Free con un Cron Trigger para consultar recordatorios vencidos y enviarlos mediante FCM HTTP v1. No requiere usar Cloud Functions de Firebase. La viabilidad documental no equivale a una prueba desplegada.

Flujo propuesto:

1. La PWA registra el dispositivo y guarda ocurrencias de recordatorios con identificadores estables, vencimiento UTC y zona America/Managua.
2. Al sincronizar, los recordatorios llegan a Firestore. El servidor no puede conocer cambios que sigan exclusivamente offline.
3. Un Worker programado cada 15 minutos consulta un conjunto limitado de pendientes mediante la API REST de Firestore. No recorre todo el historial financiero.
4. Obtiene un token OAuth de corta duración con una cuenta de servicio y envía a FCM. Credenciales privadas solo como secretos del servidor.
5. Registra intentos, resultado y vencimiento del mensaje. Usa identificador por ocurrencia/dispositivo, reclamación temporal y reintentos limitados; FCM y Firestore no comparten una transacción, por lo que no prometer entrega exactamente una vez. Colapsar notificaciones repetidas cuando sea posible.
6. Mantiene un centro de avisos dentro de la app, visible también si el push falla. Confirmar un pago cancela recordatorios futuros una vez sincronizado.

Propuesta de privacidad: mensaje genérico en pantalla bloqueada; abrir la app para importes. Cuenta de servicio con permisos mínimos viables. Las solicitudes con cuenta de servicio usan IAM y no las reglas de seguridad del cliente: el Worker debe limitar explícitamente las consultas y destinos autorizados. No exponer un endpoint público de envío sin autenticación.

Cuotas consultadas de Workers Free: 100,000 solicitudes al día, 5 Cron Triggers por cuenta, 10 ms de CPU por ejecución programada y 50 subsolicitudes por ejecución. Una revisión cada 15 minutos supone 96 ejecuciones diarias. La espera de red no cuenta como CPU. La firma/autenticación, procesamiento y tamaño de lote deben medirse: no basta con estar por debajo del número de solicitudes. Mantener SDK de servidor pesado fuera del Worker si no es necesario.

FCM es gratuito; Firebase Cloud Functions requiere Blaze. No activar Blaze para esta propuesta. Configurar solo planes gratuitos y comprobar condiciones vigentes al desplegar.

Condiciones iOS: PWA añadida a pantalla de inicio, iOS 16.4 o posterior y permiso de notificaciones. FCM debe validarse con detección de soporte y ensayo en iPhone físico. La entrega depende de red, permisos y sistema operativo; no garantizar hora exacta ni alarmas offline con la PWA cerrada.

Prueba de viabilidad requerida al iniciar ejecución: envío Android/iPhone con PWA cerrada, medición CPU en Workers Free, rechazo de credenciales insuficientes, token revocado, reintento, duplicados, zona horaria y cancelación sincronizada. Si no supera el límite gratuito, evaluar otro emisor gratuito o explicar el compromiso antes de cambiar requisitos. No presentar la solución como validada hasta completar esta prueba.

## Diferenciador propuesto, pendiente de elección

Actualización del usuario: le interesan conjuntamente los enfoques de disponible estimado/simulación y registro rápido. Solicita explorar un chat interactivo basado en datos de la app y con personalidad. El alcance y proveedor del asistente siguen por definir; no presupone autorización para enviar datos financieros a un proveedor.

Propuesta de asistente: interfaz conversacional con consultas acotadas y tarjetas calculadas por el motor financiero; registro por conversación genera un borrador y pide confirmación antes de guardar. Resolver moneda, cuenta y fecha ambiguas. La personalidad afecta el tono, nunca las cifras. Mostrar período, moneda y estado de sincronización de los resultados. Simular no escribe movimientos. Ningún modelo tiene acceso administrativo directo a Firestore.

Dos niveles candidatos: asistente guiado local mediante acciones y plantillas, sin comprensión libre general, disponible offline y sin costo de inferencia; asistente con modelo de lenguaje online mediante herramientas restringidas, sujeto a proveedor, privacidad y presupuesto. Ambos usan el mismo motor financiero. El nivel local ofrece continuidad cuando no hay red o cuota. No prometer un modelo de lenguaje completo offline en todos los teléfonos.

Personalidad sugerida, no elegida: cercana, clara, tranquila, sin reproches por gastos; puede usar voseo si el usuario lo prefiere. Nombre y apariencia pendientes. Aclarar límites de datos y evitar afirmar que una compra es segura con registros incompletos.

Investigación inicial de IA: Gemini ofrece ciertos modelos con cuota gratuita, pero la documentación distingue el uso de contenido para mejorar productos en servicios gratuitos y pagados. Revisar términos aplicables antes de seleccionar proveedor para datos financieros; no enviar datos personales o sensibles a servicios cuyos términos lo desaconsejan. Prototipos con datos ficticios son distintos del uso personal real. Fuentes: https://ai.google.dev/gemini-api/docs/pricing y https://ai.google.dev/gemini-api/terms . Function calling permite proponer herramientas; nuestra aplicación valida permisos y argumentos y ejecuta los cálculos: https://ai.google.dev/gemini-api/docs/function-calling .

Hipótesis: «Entiende cuánto puedes gastar en córdobas y dólares después de cubrir tus compromisos, y comprueba cómo una compra cambiaría tu mes».

No afirmar exclusividad: PocketGuard ya calcula Leftover; YNAB ofrece disponibilidad por categoría; Wallet y Spendee manejan múltiples monedas y pagos/presupuestos. La diferenciación buscada es la adecuación al uso personal NIO/USD, registro manual offline y explicación clara de compromisos, no inventar una función inexistente en el mercado.

Tres enfoques:

- Recomendado: disponible estimado por moneda y simulación de compras sobre el mismo cálculo.
- Alternativa: rapidez de registro, con favoritos y repetición de movimientos. Beneficio cotidiano, menor diferenciación.
- Alternativa: seguimiento de metas y patrimonio. Útil, pero ampliamente cubierto por competidores.

El disponible estimado parte del dinero líquido registrado y resta reservas únicas para compromisos y metas en un horizonte explícito, inicialmente hasta fin de mes. Los límites de presupuesto no son automáticamente dinero reservado. Si un pago ya está cubierto por una reserva, no restarlo dos veces. Diferenciar disponible dentro de un presupuesto de liquidez para pagarlo. No incluir crédito disponible, inversiones no liquidadas, préstamos por cobrar ni ingresos esperados como efectivo actual. Tratar ingresos previstos únicamente en escenarios separados.

Separar NIO y USD. El equivalente convertido es informativo: no significa que ya exista dinero en la moneda requerida. Advertir cuando una obligación requiere convertir fondos. Mostrar tasa, fecha de referencia, última sincronización y registros pendientes. La estimación depende de que los movimientos estén completos; nunca presentarla como garantía de que es seguro gastar.

Ejemplo simplificado NIO: efectivo y bancos 12,000; reservas para obligaciones 5,000; metas protegidas 2,000; disponible estimado 5,000. Una compra hipotética de 1,500 deja 3,500. Aclarar que no hay otras reservas ni superposiciones en este ejemplo. La simulación no crea movimientos, deuda ni modifica presupuestos hasta que se registre la compra explícitamente.

Primera versión candidata: indicador explicable y simulador sencillo de compra al contado. Escenarios de crédito/cuotas requieren reglas adicionales y se planifican después de fijar el tratamiento de tarjetas. No requiere un modelo de IA, suscripción ni envío del historial a un proveedor de IA.

## Fuentes

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://firebase.google.com/docs/cloud-messaging/send/v1-api
- https://firebase.google.com/docs/firestore/use-rest-api
- https://firebase.google.com/docs/web/environments-js-sdk
- https://firebase.google.com/pricing
- https://webkit.org/blog/13878/
- https://pocketguard.com/help/leftover/
- https://support.ynab.com/en_us/assigning-your-money-a-guide-SypgkrNJi
- https://help.spendee.com/article/231-how-to-setchange-the-currency-and-exchange-rate
- https://support.budgetbakers.com/hc/en-us/articles/7149418777746-Multiple-Currencies-Exchange-Rates
- https://budgetbakers.com/en/products/wallet/features/planned-payments/
