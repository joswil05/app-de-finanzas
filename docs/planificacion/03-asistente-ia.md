# Asistente: personalidad, proveedor y arquitectura propuesta

Fecha de investigación: 2026-10-15. Documento de planificación, sin llamadas a proveedores con datos del usuario.

## Decisiones confirmadas

El usuario quiere un asistente con IA en línea, basado en sus datos de la app. Personalidad: cercano, tranquilo, habla de vos, humor moderado; sin juicios ni reproches. Nombre provisional: Asistente. El registro manual, los cálculos y las simulaciones no dependerán de la IA.

## Recomendación de proveedor

GroqCloud Free como candidato principal para la primera versión personal, con Zero Data Retention activado y verificado antes de enviar datos reales. Su documentación permite activar ZDR a todos los clientes; los metadatos de uso se conservan y los datos se procesan externamente. No confundir ausencia de retención con procesamiento local.

Sin ZDR, la documentación contempla retención excepcional por fiabilidad o abuso hasta 30 días, salvo obligación legal. Evitar funcionalidades persistentes como batch y fine-tuning. Mantener desactivadas opciones voluntarias de compartición de datos. Verificar términos, disponibilidad de cuenta, límites y modelo antes de ejecución.

Groq dispone de plan gratuito con límites por modelo y organización y admite herramientas definidas por la app. El proveedor queda recomendado, no elegido expresamente por el usuario. No fijar modelo por una cifra promocional; escoger tras evaluación de español, voseo, fechas, NIO/USD, llamadas a herramientas y ambigüedad. Primero usar datos ficticios.

Alternativas evaluadas:

- Gemini gratuito: no recomendado para datos personales financieros por sus condiciones de servicios gratuitos.
- OpenRouter: añade un intermediario y políticas de proveedores distintos. No asumir que cualquier modelo gratis tiene las mismas garantías; no usar enrutamiento automático a proveedores sin verificar privacidad.
- Cerebras: su página de precios actual presenta crédito inicial de US$5 para autoservicio; no hay base suficiente en esa página para prometer gratuidad permanente.

## Arquitectura propuesta

PWA autenticada → Worker de Cloudflare → API de Groq. La clave del proveedor reside solo como secreto del Worker. Verificar token de Firebase (firma, emisor, audiencia y expiración), correo verificado y namespace de cada usuario independiente; límites por UID y globales de servicio. No hay allowlist de una sola persona. No registrar prompts, respuestas ni cifras en logs de producción.

La primera versión propone ejecutar las herramientas de lectura y cálculo en el motor local de la PWA, sobre una instantánea etiquetada con fecha y estado de sincronización. El modelo solicita herramientas de una lista cerrada; la app valida nombres y argumentos, calcula y devuelve solo el resultado mínimo. Esto incluye registros pendientes de sincronizar sin dar al modelo acceso administrativo a Firestore. Los resultados del cliente no autorizan escrituras privilegiadas en el servidor.

El Worker valida tamaño, roles y estructura; impone instrucciones de sistema y herramientas permitidas; limita número de turnos de herramientas, tokens y duración. Los textos de movimientos son datos, no instrucciones. No habilitar búsqueda web ni ejecución arbitraria para responder sobre el historial.

Herramientas conceptuales: consultar gastos por período/categoría, consultar saldos, consultar vencimientos, explicar disponible, simular compra al contado y preparar borrador de movimiento. El plan técnico posterior debe fijar contratos exactos.

Las cifras de tarjetas visuales proceden del motor financiero, no del texto generado. Validar referencias a resultados; si el texto contradice cifras, mostrar la tarjeta con explicación determinista. El asistente debe reconocer falta de registros y nunca garantizar que una compra sea segura.

Guardar o editar: el asistente genera un borrador; el usuario confirma una tarjeta con importe, moneda, fecha, cuenta y categoría. La confirmación aplica a esa versión del borrador; un cambio posterior requiere nueva confirmación. Simular no modifica los datos.

## Límites y continuidad

Mantener plan gratuito, sin conversión automática a pago ni proveedor de respaldo no autorizado. Una pregunta puede consumir varias llamadas; la cuota no equivale al número de mensajes. Ante 429, timeout o caída: explicación breve, reintentos limitados y acceso a registro manual, reportes y simulador. Sin conexión no prometer conversación generativa.

Historial de conversación: propuesta inicial de sesión temporal, no guardar chats completos en Firestore por defecto. La personalidad es configuración independiente del historial. No enviar nombres de terceros, números de cuenta ni notas completas salvo necesidad expresa; los agregados siguen siendo datos personales y no se denominan anónimos.

## Validación pendiente al ejecutar

1. Confirmar cuenta gratuita, controles de retención y disponibilidad regional.
2. Elegir modelo con evaluación de al menos: monedas ambiguas, fechas relativas, transferencias, pagos de tarjetas, cuotas, operaciones pendientes, datos faltantes y petición de modificar sin confirmación.
3. Verificar aislamiento entre usuarios y rechazo de tokens inválidos.
4. Medir CPU de Worker gratuito con autenticación y streaming; no asumir que toda la integración cabe automáticamente en su límite.
5. Comprobar límites de cuota y comportamiento sin servicio.
6. Probar que la personalidad no introduce burlas, presión, cifras inventadas ni afirmaciones de operaciones no realizadas.

## Fuentes oficiales

- https://console.groq.com/docs/your-data
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/tool-use/overview
- https://console.groq.com/docs/billing-faqs
- https://console.groq.com/docs/legal/services-agreement
- https://ai.google.dev/gemini-api/terms
- https://openrouter.ai/privacy/
- https://openrouter.ai/pricing
- https://www.cerebras.ai/pricing

## Estado

Recomendación documental, no validación práctica. No se ha creado ninguna cuenta ni enviado historial financiero a un proveedor. El concepto y la arquitectura global aún deben consolidarse en una especificación revisable antes del plan de implementación.
