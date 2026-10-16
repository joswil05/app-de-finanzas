# Especificación consolidada — Finanzas personales

Fecha: 2026-10-15. Versión: 1.0 de planificación. No se ha iniciado implementación.

## Autoridad y alcance

Este documento fija las decisiones técnicas recomendadas necesarias para ejecutar el proyecto. Complementa `04-inventario-interfaces.md`, que gobierna contenido, rutas y acciones de las 24 pantallas y 12 familias auxiliares. Los documentos 01–03 conservan investigación; ante discrepancia técnica rige este documento. Un cambio de alcance del usuario prevalece sobre todos ellos.

Las decisiones financieras que no se habían preguntado se fijan aquí como valores iniciales explícitos y revisables, no como preferencias previamente expresadas. No se requiere otra ronda de preguntas para construir dentro de estas reglas. Si una validación externa resulta incompatible, documentar evidencia y presentar alternativas; no reducir requisitos silenciosamente.

Actualización de autonomía: los agentes pueden adaptar decisiones técnicas conforme a la sección «Autonomía para investigar y adaptar el plan» de `07-plan-maestro-agentes.md`. No necesitan consultar al usuario por cada alternativa técnica equivalente. Mantener requisitos, documentar cambios materiales y actualizar contratos/pruebas; consultar cambios de reglas financieras visibles, alcance, costos o privacidad.

## Requisitos globales

- Solo planificación hasta que el usuario indique comenzar la construcción.
- PWA para iOS y Android, principalmente móvil; escritorio funcional.
- Presupuesto inicial de servicios: US$0; no activar planes con facturación automáticamente.
- Monedas admitidas: NIO y USD; importes internos en centavos enteros seguros.
- Zona inicial: America/Managua; fechas financieras locales YYYY-MM-DD.
- Interfaz en español con voseo; tono cercano, tranquilo y humor moderado solo cuando sea apropiado.
- Registro manual; no conexión/importación bancaria, fotos de recibos ni contabilidad del negocio en esta versión.
- Varios usuarios independientes desde la primera versión; cada UID accede solo a sus datos, sin cuentas ni finanzas compartidas.
- Todas las cifras financieras provienen de un único motor de dominio.
- Guardado local no equivale a sincronización ni a respaldo.
- La IA requiere conexión; registrar y consultar datos descargados y simular no requieren IA ni conexión.
- Operaciones propuestas por el asistente requieren confirmación humana explícita.
- No publicar en tiendas en esta versión; mantener adaptadores que permitan evaluar Capacitor después.

## Tecnologías y organización

React, TypeScript estricto y Vite para la PWA. CSS Modules y variables CSS compartidas para evitar una dependencia de diseño innecesaria: Tailwind había sido una propuesta, no una elección del usuario. React Router para las 24 rutas. Firebase SDK modular para Authentication y Firestore; Firebase Hosting clásico, no App Hosting. Workbox mediante vite-plugin-pwa para caché de la interfaz. Zod para validación de entradas, mensajes y exportaciones. Vitest y Testing Library para dominio/componentes; Playwright para recorridos; Firebase Emulator Suite y rules-unit-testing para aislamiento.

Cloudflare Workers Free: servicio de IA y servicio de recordatorios separados. GroqCloud Free como candidato inicial, sujeto a G01; retención cero habilitada antes de datos reales. FCM para push. Tipo de cambio BCN vía adaptador de servidor sin claves en cliente. No embeddings, base vectorial, búsqueda web del asistente ni entrenamiento de modelos.

Repositorio único, paquetes npm workspaces: `apps/web`, `workers/ai`, `workers/reminders`, `packages/domain`, `packages/contracts`, `packages/testkit`. Dependencias de producción mínimas. En T01 resolver versiones estables compatibles usando fuentes oficiales, registrar números exactos, motores Node/Java y fecha en `docs/operacion/versiones.md`, guardar lockfile y usar `npm ci` desde entonces. No instalar versiones preview, no usar `latest` en configuración entregada. Usar un Node LTS compatible con las versiones elegidas y registrar la versión exacta en `.node-version`. Esta resolución forma parte del trabajo inicial y no se deja a cada agente.

## G01: condiciones verificables antes de integrar servicios reales

Crear solo prototipos de validación con datos ficticios cuando se autorice ejecución. Registrar resultados en `docs/operacion/viabilidad.md` con columnas fecha, entorno, caso, esperado, observado, evidencia y estado PASS/FAIL/NO EJECUTADO.

1. Firebase Spark: Google y correo/contraseña, aislamiento UID, persistencia tras cerrar/reabrir PWA, lotes offline, reconexión y acceso a historial descargado.
2. iPhone y Android físicos: versión de SO/navegador, instalación, service worker, apertura offline, teclado y notificaciones con PWA cerrada. iOS mínimo para push: 16.4; definir matriz real probada. No sustituir hardware por emulación para declarar compatibilidad final.
3. Groq Free: cuenta/región disponibles, modelo de producción que soporte herramientas, ZDR confirmado, cuotas efectivas, español y herramientas evaluados con datos ficticios. No enviar datos reales hasta cumplir estas condiciones.
4. Workers Free: medir CPU con token Firebase verificado, streaming de IA y firma OAuth del recordatorio; límite documentado de 10 ms de CPU por invocación. Evaluar percentiles y fallos en 30 ejecuciones de prueba por flujo. No confiar en una única llamada exitosa ni en márgenes temporales tolerados por proveedor.
5. BCN: obtener una tasa fechada válida por canal publicado, revisar condiciones y validar formato; no codificar una tasa eterna. Si fuente falla, conservar último dato con fecha y permitir entrada manual. Si no se puede automatizar legal/técnicamente, bloquear el cierre del requisito y presentar alternativa.
6. Acceso a cuentas/secretos o dispositivo ausentes: marcar NO EJECUTADO y continuar tareas independientes con emuladores. No declarar app completa ni integración comprobada por ello.

Si G01 impide una función, se permite investigar otro proveedor gratuito manteniendo contratos, pero no enviar datos reales a un nuevo proveedor, activar pago ni quitar la función sin decisión del usuario. Los cambios documentales anteriores se actualizan al resolver el bloqueo.

## Modelo financiero y consistencia

### Dinero y cambio

Money = moneda + centavos enteros, rango absoluto máximo 9,000,000,000,000 centavos por operación. Rechazar NaN, infinito, notación exponencial, fracciones de centavo y desbordamiento. Entrada admite un separador decimal coma o punto y hasta dos decimales; sin separadores de miles en edición para eliminar ambigüedad. Presentación sí usa separadores locales y siempre C$/US$.

Tasa expresada como unidades NIO por USD, decimal positivo almacenado como cadena con hasta 8 decimales. Convertir usando aritmética entera/BigInt y redondeo mitad alejándose de cero al centavo; BigInt no se persiste. Una conversión se redondea una sola vez al resultado final, salvo cuotas que se distribuyen por centavos.

Transferencia entre monedas almacena ambos importes reales; la relación derivada no reemplaza la tasa histórica de otras operaciones. Comisión se registra como gasto vinculado separado. Reportes de flujo usan la tasa congelada al confirmar cada movimiento; si falta, el total convertido se marca incompleto, no se inventa. Resumen de patrimonio usa tasa de valoración seleccionada/última disponible y fecha. Nunca sumar NIO y USD como números desnudos.

### Libro de movimientos

Cada movimiento financiero tiene uno o varios apuntes balanceados por moneda en un único documento lógico. Para cada moneda, la suma de todos los apuntes es cero. Los apuntes usan variación firmada del saldo patrimonial: activos positivos, pasivos negativos. Ingreso y gasto son categorías, no cuentas bancarias. Contrapartidas técnicas de ingreso, gasto, patrimonio inicial, ajuste y puente de cambio completan el balance y se excluyen de liquidez.

Ejemplos NIO en centavos:

- Ingreso 100: banco +10000; contrapartida ingreso -10000; flujo ingreso +10000.
- Gasto 25: efectivo -2500; contrapartida gasto +2500; flujo gasto +2500.
- Transferencia 20: banco -2000; efectivo +2000; sin flujo ingreso/gasto.
- Compra tarjeta 30: tarjeta -3000; contrapartida gasto +3000; flujo gasto +3000.
- Pago tarjeta 10: banco -1000; tarjeta +1000; sin gasto adicional.
- Devolución 5: activo/tarjeta +500; contrapartida gasto -500; gasto negativo vinculado a la compra en la fecha de devolución.
- Saldo inicial: activo/pasivo y patrimonio inicial; nunca ingreso del mes.

Cambio USD→NIO: apuntes USD banco -10000/puente +10000; NIO banco +366243/puente -366243 para US$100→C$3,662.43. Cada moneda sigue balanceada. No crear saldo editable separado del libro; proyecciones de saldo son derivadas y reconstruibles.

### Revisiones y conflictos offline

Usar revisiones inmutables por agregado (cuenta, movimiento, presupuesto, meta, préstamo, inversión, recurrente, asignación). Colección por usuario `users/{uid}/revisions/{revisionId}`. Cada revisión contiene aggregateId, kind, parentIds, payload completo validado o tombstone, deviceId, createdAtClient y receivedAtServer. La fecha de negocio está en payload cuando corresponde. La API cliente solo crea; no actualiza/elimina revisiones existentes. ID aleatorio estable por acción; reintento reutiliza el ID y la misma carga. Archivar cuentas/categorías conserva payload con archived=true para mantener referencias y saldos históricos; no usar tombstone para borrar una cuenta usada. Tombstone anula un movimiento o elimina una entidad sin referencias según validación de dominio.

Una revisión inicial no tiene padres; una edición referencia la cabeza que vio. Dos ediciones offline con el mismo padre producen bifurcación, nunca última escritura silenciosa. Cabezas únicas se aplican; ante bifurcación mostrar conflicto y mantener el ancestro común único más reciente. Si no existe uno, excluir ese agregado de totales y marcar resultado incompleto. No ocultar advertencia. Resolución crea una revisión con todas las cabezas conocidas como padres y el payload elegido; rama que llega más tarde vuelve a abrir conflicto.

Procesar padres antes de hijos. Revisiones con padres aún no descargados quedan pendientes; no resolver por orden de llegada ni reloj del teléfono. Detectar padres de otro agregado y ciclos como inválidos. Operaciones relacionadas indivisibles (los dos lados de una transferencia) viven en un movimiento, no en dos documentos editables independientes.

Confirmación de recurrente usa aggregateId determinista por regla+fecha+ordinal; dos dispositivos que crean la misma ocurrencia se deduplican si la carga financiera normalizada es idéntica; si difiere, conflicto explícito. Igual para doble confirmación de borrador y pago. IDs y firmas de confirmación impiden que un botón se guarde dos veces.

### Offline, rechazos y sesión

Habilitar persistencia IndexedDB de Firestore explícitamente, caché sin expulsión automática por tamaño para el historial personal y gestión de pestañas. Al primer acceso descargar el conjunto completo de revisiones del UID autenticado antes de marcar «Disponible sin conexión»; progreso y fecha visibles. Luego suscribir novedades con metadatos de pendientes. No descargar todo en cada pantalla. Caché de proyecciones, borradores, bandeja, PIN y sesión de chat se identifican por UID; la hidratación de A nunca marca listo a B. Firestore puede compartir caché física del proyecto: una regla remota no protege por sí sola una lectura ya almacenada localmente. No hacer consultas offline ni renderizar hasta comprobar que el propietario de la sesión local coincide con el UID activo.

Detectar fallo de persistencia/cuota del navegador; sin persistencia durable no prometer guardado offline. Guardado muestra «Guardado en este dispositivo» solo tras escritura local durable comprobada. Mantener una bandeja IndexedDB local de comandos enviados hasta confirmación o rechazo del servidor; no es segunda base financiera. Al rechazar, conservar comando y error para corregir/exportar sin incluirlo como confirmado. Cierre de sesión con pendientes obliga a elegir sincronizar, exportar o cancelar; descartar requiere confirmación explícita. No limpiar la bandeja silenciosamente.

Cambio de usuario: resolver pendientes de la sesión anterior, desmontar vistas, cancelar suscripciones/peticiones/notificaciones activas y limpiar proyecciones, chat, borradores y caché Firestore local antes de habilitar otra cuenta. Coordinar pestañas con BroadcastChannel; si otra pestaña impide terminar/limpiar persistencia, bloquear el cambio y explicar cómo cerrar/reiniciar. Nunca reutilizar outbox/PIN/consentimiento de A con B. No permitir un primer acceso a otra identidad sin conexión. Tras cerrar sesión, botón Atrás y enlaces directos no revelan datos del usuario anterior.

La caché puede ser borrada por el navegador/SO. Exportaciones y copia remota son necesarias; nunca prometer durabilidad absoluta. Interfaz y recursos se precargan con service worker; actualización se ofrece cuando no hay formularios sucios. No cachear respuestas autenticadas del proxy ni chats en caché HTTP.

## Reglas por módulo

### Cuentas y tarjetas

Efectivo/banco: una moneda por cuenta. Tarjeta: agregado con subcuentas NIO/USD opcionales. Límite compartido expresado en una moneda o independiente por moneda, elección explícita al crear. Crédito disponible se calcula aparte, nunca es efectivo.

Corte y vencimiento por día del mes; día inexistente se ajusta al último día. El vencimiento es la primera fecha con ese día posterior al corte (si mismo día, mes siguiente). Operación del día de corte entra en ese corte; ciclo siguiente inicia al día siguiente. Todo en fecha local. Mostrar deuda total y saldo exigible por separado.

Compras a cuotas: reconocer gasto y deuda total al comprar; plan de cuotas solo reparte exigibilidad. Presupuesto consume la compra completa, no cada pago; explicarlo en UI. Interés/comisión conocido se registra separado; no calcular tasas de bancos ni pagos mínimos no proporcionados. Cuotas reparten centavos: primeras cuotas reciben el residuo. El usuario elige primer vencimiento; generar mensual ajustando fin de mes. Cuotas pagadas no se reescriben; corrección mediante movimientos compensatorios.

Pagos reducen deuda y se asignan primero al vencimiento más antiguo, por moneda. No convertir automáticamente un pago NIO a deuda USD: capturar ambos importes. Abonos anticipados se admiten; sobrepago produce saldo a favor etiquetado, no ingreso. Reembolso parcial no puede exceder importe neto original sin registrarse como ajuste distinto. Intereses solo son estimados si se introdujeron expresamente como previsión.

### Presupuestos

Una categoría y moneda de presupuesto por regla; gastos en otra moneda se convierten con tasa congelada del movimiento. Tasa faltante marca presupuesto incompleto. Arrastre inicial = 0; con acumulación, trasladar solo sobrante positivo del mes anterior; sobreconsumo no genera deuda presupuestaria automática. Sin acumulación reiniciar en límite. Devoluciones restan gasto en su fecha. Edición de límite aplica desde mes seleccionado; conservar versiones mensuales. Presupuestos son límites, no reservas de efectivo.

### Metas y disponible estimado

Meta tiene una moneda; asignaciones se respaldan en cuentas de esa misma moneda. Varias metas pueden compartir cuenta. No permitir nuevas asignaciones que excedan saldo libre actual. Si un gasto posterior o concurrencia deja reservas superiores al efectivo, mostrar déficit; no reducir metas automáticamente.

Disponible por moneda = liquidez (efectivo+bancos) − reservas únicas de compromisos pendientes hasta fin de mes − asignaciones activas de metas. Compromisos pueden estar respaldados por una meta: reservar la unión, no la suma. Cada compromiso lleva id estable y linkedGoalId opcional; parte ya cubierta por meta se descuenta de la reserva extra. No sumar ingresos previstos ni inversiones ni cuentas por cobrar. Mantener déficit como negativo, nunca clamp a cero.

Tarjeta reserva importe de cuotas/corte pendiente exigible dentro del horizonte, no toda la deuda futura; la UI lo explica. Gasto recurrente liquidado con tarjeta se reserva mediante compromiso de tarjeta correspondiente, no además como débito de banco; si no se conoce medio de pago, señalar necesidad de completar para estimación. Presupuestos no se descuentan automáticamente. El usuario verá que otros gastos cotidianos no registrados pueden reducir su margen.

Simulador inicial al contado: agrega gasto hipotético a una copia de la proyección, recalcula disponible y presupuesto, sin persistir. Para comprar en moneda distinta a cuenta, pedir importe debitado o aceptar explícitamente tasa de escenario. Registrar abre borrador con importes y fecha revisables. No introducir simulación de crédito hasta definir pruebas adicionales; control real de cuotas sí pertenece a esta versión.

### Préstamos e inversiones

Deuda existente se carga contra patrimonio inicial sin flujo de caja. Préstamo nuevo recibido aumenta banco y pasivo; no ingreso ganado. Dinero prestado reduce banco y aumenta activo por cobrar; no gasto. Cobro/abono principal mueve activos/pasivos sin ingreso/gasto; interés recibido es ingreso e interés pagado es gasto. No cobrar/abonar principal por encima del pendiente sin corregir explícitamente el préstamo. Sin interés automático ni amortización avanzada.

Inversión: aportes/retiros son transferencias, rendimiento cobrado es ingreso. Valoración es observación fechada, no movimiento de caja. Ganancia total desde inicio = valor actual + retiros + rendimientos distribuidos − aportes − valor inicial; mostrar componentes para no volver a añadir rendimiento ya incluido en un retiro. Operación selecciona retiro de capital o rendimiento, nunca ambos por defecto. Fechas sin valoración muestran última valoración y antigüedad. No calcular porcentaje anualizado.

### Recurrentes y negocio

Frecuencias diaria, semanal, mensual y anual; fecha de fin opcional. Ajustar fin de mes sin perder el día original solicitado. Ocurrencias son pendientes hasta confirmación; pausar no anula ocurrencias ya confirmadas. Confirmar permite importe real y fecha real. Omisión afecta solo una ocurrencia, no toda la regla. «Mi negocio» es origen de ingresos recibidos personalmente; no ventas, inventario ni ganancias calculadas del negocio.

## Seguridad y recuperación

Permitir registro de usuarios independientes mediante correo/contraseña y Google. Correo requiere verificación antes de leer/escribir datos financieros o usar IA; Google debe aportar email verificado. La pantalla de verificación permite reenviar, actualizar sesión y cerrar sesión. Eliminar la allowlist de un único propietario. Crear perfil inicial idempotente bajo users/{uid} después de autenticar/verificar; el cliente no puede concederse privilegios administrativos. Cuenta Google y correo se vinculan explícitamente; no fusionar por email sin autenticación. Autenticación inicial/restablecimiento requieren red. Reglas verifican UID del token contra UID de ruta, email verificado, claves admitidas, tamaños, tipos y que no se reescriban revisiones. Prohibir listados transversales del cliente; cada repositorio consulta exclusivamente users/{uid}. Pruebas de dos usuarios válidos y anónimo obligatorias. Firebase config pública no es secreto; claves Groq/cuenta de servicio sí lo son y nunca llegan al bundle.

Cada usuario tiene configuración inicial, categorías predeterminadas, monedas, reglas, PIN local por dispositivo, consentimiento IA y dispositivos propios. IDs lógicos pueden coincidir entre usuarios porque siempre están dentro de su namespace. El contexto de sesión autentica el namespace; ningún formulario, parámetro de chat o archivo de respaldo puede elegir el UID de destino. No hay invitaciones, hogares, cuentas compartidas, roles familiares ni acceso del usuario A a datos de B.

PIN de 6 dígitos como bloqueo de privacidad del dispositivo, hash con PBKDF2/salt aleatorio, sin almacenar texto claro. No presentarlo como cifrado de la base ni protección contra alguien con acceso técnico al navegador. Tras 5 errores esperar 30 segundos; registrar contador local. La seguridad de cuenta sigue dependiendo de autenticación Firebase y dispositivo protegido.

Biometría web se evalúa con WebAuthn y verificación de usuario, jamás se promete invocar específicamente Face ID. Si no cumple recuperación y soporte, mostrar solo PIN; es opcional según acuerdo. Restablecer PIN requiere reautenticación online; conserva pendientes y no borra historial. En bloqueo ocultar datos y limpiar DOM financiero, no solo superponer un modal. Bloquear al regresar tras 2 minutos de inactividad; sesiones activas de formularios conservan borrador protegido por bloqueo visual.

Respaldo exportado: JSON versionado con revisiones, configuraciones financieras y manifiesto SHA-256; excluir tokens, PIN y secretos. Ofrecer cifrado de archivo con contraseña usando AES-GCM y PBKDF2; contraseña no guardada. Restauración valida esquema, versión, límites e integridad y muestra conteos; modo inicial solo fusionar por IDs, no sustituir destructivamente. Detectar ID con contenido distinto como conflicto, no sobrescribir. CSV es exportación de consulta, no respaldo completo; neutralizar celdas que puedan iniciar fórmulas.

## Recordatorios y cambio

Registro servidor de ocurrencias sincronizadas con dueAt UTC y zona original; consulta indexada de pendientes, lotes máximos de 10 por ejecución y presupuesto de subsolicitudes. Worker cada 15 minutos; 96 ejecuciones/día. Cuenta de servicio mínima, secretos en Cloudflare; uso de IAM requiere validación explícita del namespace y dispositivos de cada usuario en Worker. Mensaje genérico en pantalla bloqueada por defecto. TTL limita entrega de avisos obsoletos.

El Worker de recordatorios consulta pendientes mediante índice collection group reminders con cursor persistente y equidad entre usuarios; no enumera todas las cuentas ni procesa siempre al primer usuario. El namespace de la ruta es autoridad: reminder.uid debe coincidir con users/{uid}, y solo pueden usarse tokens de devices bajo ese mismo UID. La clave de entrega incluye UID+occurrenceId+deviceId. No enviar a B un aviso de A aunque IDs locales coincidan. La cuenta de servicio usa IAM, por lo que el Worker valida explícitamente estas relaciones y no asume que lo harán las rules.

No garantizar entrega exactamente una vez: reclamación con lease, registro de intentos, reintentos limitados, clave ocurrencia/dispositivo y tag de colapso. Confirmación sincronizada cancela futuros envíos. Cambios offline aún no sincronizados pueden producir aviso desactualizado; abrir la app muestra la verdad local. Registrar diagnósticos sin importes/notas.

Cambio: consultar BCN en servidor, caché con fecha y origen, endpoint limitado; cliente actualiza al abrir si no hay dato del día. Fuente fallida conserva último dato y permite tasa manual positiva; sin valor previo, resumen separado sigue operativo y conversión se deshabilita explicando motivo. Datos con más de un día sin verificar muestran «Última consulta…», aunque la tasa oficial no haya variado. No presentar referencia oficial como tasa comercial garantizada.

## Asistente

Texto, sin voz ni fotos; sesión temporal por defecto. Voseo cercano, calma y humor moderado. No elogiar gastos peligrosos ni regañar; describir consecuencias y opciones. Las notas de movimientos son datos no confiables, nunca instrucciones.

Lista cerrada de herramientas: summary, expenses, commitments, simulatePurchase, draftMovement. Todas de lectura o creación de borrador. Validación Zod; no SQL, rutas arbitrarias, HTTP arbitrario ni ejecución de código. Cálculos locales incluyen pendientes y proporcionan flags complete/asOf/pendingCount. Solo enviar agregados necesarios; nombres de terceros/notas no se envían por defecto. Antes del primer chat explicar proveedor, contenido mínimo y desactivación.

Proxy valida token Firebase, email verificado y UID del solicitante, tamaño <=32 KiB por solicitud y máximo 12 mensajes de contexto; límite inicial 20 turnos de usuario/día y 3 llamadas al modelo por turno, configurable hacia abajo según cuotas reales. Cada usuario tiene contador servidor separado; además, un límite global protege la cuota compartida del proyecto/proveedor. No deducir que 20 turnos por usuario garantiza capacidad ilimitada para todas las cuentas. No aceptar UID en body para escoger datos, cuota o dispositivos; el Worker deriva identidad del token verificado. Contextos y cachés IA nunca cruzan UID y no se cachea una respuesta financiera solo por texto de pregunta. Máximo 3 herramientas por respuesta y 2 rondas; truncamiento explícito y opción de abrir reporte. Cada resultado muestra tarjeta canónica; cifras narradas deben corresponder a IDs del resultado, o usar texto plantilla en vez de mostrar números inconsistentes.

Historial libre no permanece en servidor. Logs técnicos excluyen texto e importes. Error/cuota/offline nunca cambia a proveedor alternativo ni activa pago. Mostrar acceso a acciones locales. «Guardar» solo actúa sobre borrador validado con id/revisión y confirmación concreta del usuario; reintento devuelve el mismo movimiento.

## Diseño compartido y cobertura

Aplicar íntegramente P01–P24/F01–F12 del inventario. Base visual recomendada: fondo #F6F8FB, superficie #FFFFFF, texto #182538, secundario #526277, acento #2457C5, error #B42318, éxito #176447. Verificar contraste real antes de dar por final. Tipografía del sistema, dígitos tabulares, escala 12/14/16/20/24/32 px, espaciado 4/8/12/16/24/32, radios 8/12/16. Una sola biblioteca interna de componentes; iconos Lucide con etiquetas accesibles. Sin modo oscuro inicial ni mascota animada: no fueron requisitos.

Móvil desde 320 CSS px sin desbordamiento horizontal; controles de al menos 44×44, texto a 200%, foco visible, navegación por teclado, errores textuales, movimiento reducido. Sin coreografías al cargar. Formularios largos en pantalla completa, estados guardado local/sincronizado diferentes. Importes no se ocultan con puntos suspensivos. Desktop funcional con navegación lateral desde 1024 px.

## Definición de terminado

Para varios usuarios, verificar A y B como cuentas válidas simultáneas: ambos crean/leen sus propios datos, ninguno accede a los del otro, y cambio de cuenta/logout no filtra caché, chat, borradores ni push. Cuotas de Firebase, Groq y Cloudflare son compartidas por proyecto/cuenta: medir consumo con varios usuarios ficticios, límites por UID y tope global. Agotamiento no activa facturación y se informa sin presentar gratuidad como capacidad ilimitada. Ver también V31–V38 y la matriz multiusuario del plan maestro.

Todas las tareas T01–T24 del plan pasan y cada requisito tiene evidencia. Build reproducible, tests de dominio, reglas y recorridos pasan. G01 validado para funciones externas, Android/iOS físicos probados, recuperación/restauración comprobada. Ningún defecto de pérdida de dinero, aislamiento, duplicación o confirmación pendiente. No declarar terminado si faltan credenciales, hardware o proveedor: reportar módulos listos y bloqueos concretos. Entrega incluye URL PWA solo después de autorización de despliegue, manual breve y procedimientos de recuperación.
