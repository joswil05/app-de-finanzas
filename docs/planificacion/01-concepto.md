# App de finanzas personales — concepto y decisiones

Fecha: 2026-10-15. Estado: PWA/Firebase y usuarios independientes confirmados; construcción autorizada y en curso. Consultar docs/ejecucion/estado.md para progreso real.

## Objetivo

Aplicación de finanzas personales, inicialmente usada por su creador, con varios usuarios independientes admitidos desde la primera versión. Principalmente móvil, utilizable en iOS y Android sin conexión, con sincronización entre dispositivos de la misma persona. Presupuesto inicial de servicios: US$0. Posible publicación futura en tiendas. La confirmación posterior de usuarios independientes reemplaza la restricción inicial a una persona.

## Decisiones del usuario

- Efectivo, cuentas bancarias y tarjetas de crédito.
- Ingresos y gastos manuales. Sin importación bancaria ni conexión a bancos en la primera versión.
- Dinero recibido del negocio como ingreso personal con origen «Mi negocio». Sin ventas, costos ni contabilidad del negocio.
- Monedas NIO y USD. Vistas separadas y resumen convertido a una moneda elegida.
- Tipo de cambio consultado automáticamente con corrección manual.
- Tarjetas: límite, corte, vencimiento, cuotas, deuda y saldos por moneda.
- Préstamos recibidos y dinero prestado: persona o entidad, importe, moneda, vencimiento, abonos y saldo; intereses manuales.
- Inversiones: aportes, retiros, rendimientos y valor actualizado manualmente.
- Metas como apartados virtuales, con varias metas en una cuenta.
- Presupuestos por categoría con reinicio o acumulación configurable por categoría.
- Recurrentes pendientes de confirmar antes de afectar saldos.
- Avisos internos y notificaciones del teléfono.
- Acceso con correo y contraseña, y Google.
- Bloqueo con PIN; biometría si es viable en la tecnología elegida.
- Fotografías de recibos en una etapa posterior.
- Diseño equilibrado, tomando referencias de apps similares y criterios de Emil Kowalski.

## Concepto propuesto

Inicio con saldos por moneda, ingresos y gastos del mes, próximos vencimientos y progreso de presupuestos. Registro rápido de movimientos. Navegación propuesta actual: Inicio, Movimientos, Cuentas, Planificar y Asistente. Planificar enlaza presupuestos, metas, agenda, préstamos e inversiones; Inicio enlaza reportes y simulador; ajustes se abre desde el encabezado. El usuario solicita inventario textual para agentes, sin maquetas ni prototipo. Ver `04-inventario-interfaces.md`: 24 pantallas base y 12 familias auxiliares con contenido, acciones y estados. Esta propuesta sustituye la navegación anterior con «Más».

Reglas propuestas: transferencias no son ingresos ni gastos; pagar una tarjeta no duplica gastos; asignar una meta no mueve dinero ni crea gasto; separar rendimientos cobrados de variaciones de valoración. Distinguir liquidez, deuda y patrimonio. Conservar moneda e importe originales y el cambio aplicado en operaciones entre monedas.

## Base elegida y arquitectura propuesta

El usuario elige PWA y expresa preferencia por Firebase. Propuesta actual: React, TypeScript y Vite; Cloud Firestore con persistencia web explícitamente habilitada; Firebase Authentication para correo/contraseña y Google; Firebase Hosting clásico para archivos estáticos; futura adaptación con Capacitor para tiendas. Sustituye la propuesta anterior de Supabase y Dexie. No añadir Dexie por defecto: evaluar si la caché de Firestore cubre la disponibilidad de todo el historial requerido y las necesidades de protección local.

Firestore facilita persistencia y sincronización, pero solo almacena localmente los datos obtenidos y conservados en caché. Los conflictos de escritura en el mismo documento usan última escritura; diseñar operaciones financieras para evitar pérdida silenciosa. Las transacciones que requieren lecturas fallan sin conexión; los lotes de escritura admiten trabajo offline. La caché de datos no sustituye el service worker para abrir la interfaz sin internet.

## Condiciones que debe resolver la especificación

- Primera carga y autenticación requieren conexión; el trabajo posterior puede ser local.
- Guardado local transaccional, cola persistente, operaciones idempotentes y resolución explícita de conflictos; no sobrescribir movimientos financieros silenciosamente.
- Sincronizar al abrir, regresar al primer plano o recuperar conexión con la app activa. No prometer ejecución permanente en segundo plano.
- iOS: Web Push para apps añadidas a pantalla de inicio desde iOS 16.4; permiso del usuario. Entrega sujeta al sistema y conexión; avisos internos como respaldo.
- Bloqueo local, autenticación y cifrado son requisitos distintos. No asumir que un PIN de interfaz cifra los datos. Validar biometría y recuperación antes de prometerlas.
- Validar aislamiento por usuario en servidor aunque inicialmente solo haya uno.
- Exportación y restauración verificables; sincronización no sustituye un respaldo. Contemplar pérdida del almacenamiento local y cambios de sesión.
- Partir de Firebase Spark, sin activar facturación. Firebase Hosting clásico, Authentication y Firestore dentro de sus cuotas. No confundir Hosting con App Hosting. Cloud Functions requiere Blaze; las notificaciones programadas necesitan un emisor seguro y programador por resolver antes de cerrar el plan. FCM gratuito no incluye por sí mismo ese programador. No retirar el requisito de notificaciones: validar una solución gratuita externa o presentar el costo/limitación al usuario. Las fotos siguen pospuestas; Cloud Storage requiere revisar Blaze cuando se incorporen.
- Validar fuente automática de NIO/USD, disponibilidad y condiciones. Guardar fuente, fecha y último valor válido; indicar cuando esté desactualizado. No sustituir el cambio real de una operación por la referencia oficial.
- Precisar reglas de cuotas, cortes, pagos parciales, reembolsos, ajustes y operaciones retroactivas en la especificación.
- Precisar monedas de presupuestos y metas, valoración histórica y traslado de saldos presupuestarios.
- Validar compatibilidad en dispositivos físicos iOS y Android, además de pruebas automatizadas.
- Acceso a tiendas es una fase futura con requisitos, pruebas y costos propios; Capacitor no garantiza aprobación ni elimina adaptación.

## Criterios visuales propuestos

Cifras legibles, jerarquía clara, formularios breves, controles táctiles accesibles, respuesta inmediata al guardar localmente y estado de sincronización comprensible. Animaciones discretas con propósito, reducidas en acciones frecuentes y respetando movimiento reducido. No depender solo de colores para comunicar deuda o exceso de presupuesto.

## Fuentes consultadas

- Wallet: https://budgetbakers.com/en/products/wallet/
- Spendee: https://www.spendee.com/
- YNAB: https://www.ynab.com/ynab-method
- Web Push iOS: https://webkit.org/blog/13878/
- Capacitor: https://capacitorjs.com/docs
- Expo: https://docs.expo.dev/faq/
- Dexie: https://dexie.org/
- Supabase pausa: https://supabase.com/docs/guides/platform/free-project-pausing
- Supabase correo: https://supabase.com/docs/guides/auth/auth-smtp
- Cloudflare Pages límites: https://developers.cloudflare.com/pages/platform/limits/
- BCN servicio de cambio: https://bcn.gob.ni/servicio-web-tipo-de-cambio
- Firebase precios: https://firebase.google.com/pricing
- Firestore offline: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firestore transacciones: https://firebase.google.com/docs/firestore/manage-data/transactions
- FCM entorno servidor: https://firebase.google.com/docs/cloud-messaging/server-environment

## Próximo entregable

Desarrollar especificación funcional y técnica sobre PWA y Firebase, resolviendo especialmente conflictos, disponibilidad offline, protección local y notificaciones programadas sin presupuesto. Tras acordarla, redactar plan ejecutable por agentes con dependencias, contratos, archivos, pruebas, criterios de aceptación y puntos de integración. No iniciar construcción hasta que el usuario indique pasar a ejecución.
