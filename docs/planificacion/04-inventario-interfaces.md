# Inventario de interfaces y alcance de frontend

Fecha: 2026-10-15. Entregable: especificación de contenido y comportamiento, sin maquetas, prototipo ni implementación, según petición del usuario. Esta propuesta organiza las funciones acordadas; las reglas financieras pendientes se resuelven en la especificación de dominio antes de implementar cálculos.

## Conteo y navegación

Este inventario es la base inicial. Por instrucción posterior del usuario, los agentes pueden reorganizar rutas y componentes cuando exista una razón de uso o técnica, conservando contenidos/recorridos y actualizando conteo, cobertura y documentos conforme a la política de autonomía del plan maestro. No requiere consulta por cada ajuste de interfaz equivalente.

24 pantallas base identificadas P01–P24 y 12 formularios reutilizables F01–F12. Las pestañas, estados de carga, diálogos de confirmación y pasos de un formulario no cuentan como pantallas nuevas. Cada registro abre una instancia de su pantalla de detalle, no un diseño diferente. Este conteo incluye acceso y configuración; no son 24 destinos en la barra principal.

Barra inferior: Inicio (P05), Movimientos (P06), Cuentas (P08), Planificar (P11), Asistente (P20). Botón «Registrar» accesible en las cinco secciones; abre F01 sin ocultar controles de navegación. Icono de avisos abre P22; avatar/ajustes abre P23. Planificar enlaza presupuestos, metas, agenda, préstamos e inversiones. Reportes y simulador se abren desde Inicio; también desde enlaces contextuales. Ajustes contiene enlaces a todas las herramientas secundarias para que sean localizables.

En pantallas de detalle, encabezado con nombre y Volver; regresar conserva filtros y posición de la lista de origen. La barra principal puede permanecer visible en detalles, pero se oculta en acceso, bloqueo y formularios para evitar abandonos accidentales. El botón Atrás del navegador respeta estas transiciones.

En escritorio, la misma navegación se presenta lateralmente y las listas/detalles pueden aprovechar dos columnas. No crear un segundo producto ni funciones exclusivas de escritorio.

## Pantallas base

### P01 — Acceso — /acceso

- Contenido: nombre provisional de la app, correo, contraseña con mostrar/ocultar, «Entrar», «Continuar con Google», enlaces «Crear cuenta» y «Olvidé mi contraseña».
- Crear cuenta es una variante del mismo diseño con confirmación de contraseña y mensaje de verificación. Se admiten varios usuarios independientes por correo/contraseña o Google; verificar correo antes de acceso financiero. Cada cuenta nueva configura su propio espacio vacío, sin datos de otra persona.
- Acciones: entrar, iniciar registro permitido, abrir P02. Usuario nuevo pasa a P03; configurado a P04 o P05.
- Estados propios: enviando, credenciales rechazadas, correo pendiente de verificar con reenviar, acceso no autorizado, Google cancelado, sin conexión para autenticación inicial. No mostrar saldos detrás del acceso.
- Después de verificar correo, actualizar sesión y continuar configuración inicial propia. En dispositivo compartido, el cambio de cuenta limpia la vista y datos locales anteriores conforme al flujo de cierre; no reutilizar perfil, PIN, borradores ni contexto del asistente.

### P02 — Recuperación de acceso — /recuperar-acceso

- Correo, envío de enlace y mensaje neutro de resultado; modo de restablecimiento con nueva contraseña y confirmación cuando se abre un enlace válido.
- Enlace vencido/inválido permite solicitar otro. Incluye regreso a P01. Recuperar contraseña de cuenta no equivale a recuperar el PIN local.

### P03 — Configuración inicial — /bienvenida

- Asistente de tres pasos: preferencias (nombre opcional, moneda del resumen, zona horaria), primera cuenta (F02, moneda, saldo inicial y fecha) y protección (PIN mediante F12).
- Explicación breve de C$/US$, funcionamiento offline y sincronización. Permitir omitir la primera cuenta y completarla desde Cuentas; no inventar saldo cero de una cuenta aún no creada.
- Concluir abre Inicio. Las peticiones del sistema para notificaciones aparecen después de una explicación y una acción explícita, no todas al cargar esta pantalla. Presentar instalación PWA contextual, sin bloquear el uso web.

### P04 — Desbloqueo local — /desbloquear

- PIN, acción biométrica solo si realmente está implementada y disponible, estado de bloqueo por intentos y recuperación.
- Ocultar saldos y vistas previas financieras hasta desbloquear. No denominar «cifrado» al simple bloqueo visual.
- Recuperación informa antes de cualquier limpieza de datos locales y contempla movimientos no sincronizados; su mecanismo depende del diseño de seguridad. El frontend no inventa una opción de borrado silencioso.

### P05 — Inicio — /inicio

- Orden: disponible estimado por moneda y enlace «Ver cálculo» (F11), selector de resumen separado/convertido, pagos próximos (máximo tres), presupuestos con menor margen (máximo tres), últimos cinco movimientos.
- Acciones visibles: Registrar, Simular compra (P21), Ver reportes (P19). Accesos a avisos y ajustes en encabezado.
- Mostrar período del disponible, referencia de cambio, última actualización y pendientes de sincronizar. Distinguir dinero líquido de patrimonio; crédito disponible nunca se suma a efectivo.
- Sin cuentas: invitación «Agregá tu primera cuenta». Sin compromisos configurados: avisar que la estimación no los contempla. No llenar la pantalla con gráficos decorativos.

### P06 — Movimientos — /movimientos

- Lista por fecha con descripción, categoría/origen, cuenta, moneda e importe, tipo y estado local/sincronizado. Ingresos, gastos y transferencias diferenciados con texto/icono además de color.
- Búsqueda; filtros de período, cuenta, categoría, moneda y tipo; totales de ingresos/gastos separados por moneda. Las transferencias quedan fuera de dichos totales.
- Registrar abre F01; tocar una fila abre P07. Filtros se conservan al volver. Vacío global y sin coincidencias tienen mensajes y acciones diferentes.

### P07 — Detalle de movimiento — /movimientos/:id

- Tipo, importe original, moneda, fecha, cuenta(s), categoría/origen, nota y estado de sincronización; vínculo a tarjeta, cuota, préstamo o inversión cuando aplique.
- Transferencias entre monedas muestran ambos importes y cambio aplicado. Mostrar si fue confirmación de un recurrente.
- Acciones: editar mediante formulario de origen, duplicar como borrador, registrar devolución cuando aplique, anular con confirmación y explicación de impacto. Proteger operaciones vinculadas; no ofrecer borrar una mitad de una transferencia.
- Conflicto de edición enlaza P24. Registro inexistente ofrece volver a la lista, sin mostrar otro registro.

### P08 — Cuentas — /cuentas

- Grupos: efectivo/bancos y tarjetas. Para cada cuenta: nombre, moneda y saldo. Tarjetas: deuda por moneda y próximo vencimiento, sin mezclar deuda con activos.
- Totales separados; conversión opcional etiquetada. Agregar abre F02; cuentas de efectivo/banco abren P09; tarjetas P10.
- Cuentas archivadas accesibles mediante filtro, sin desaparecer del historial.

### P09 — Detalle de efectivo o banco — /cuentas/:id

- Nombre, moneda, saldo, saldo inicial/fecha, movimientos filtrados y dinero asignado a metas.
- Registrar ingreso/gasto o transferencia con cuenta preseleccionada, editar cuenta, registrar ajuste de saldo y archivar. Ajustar genera operación explicable; no cambia silenciosamente el historial.
- Archivar conserva movimientos y muestra restricciones por operaciones pendientes. Para mantener ambas monedas en un banco, usar cuentas monetarias separadas y etiquetas claras.

### P10 — Detalle de tarjeta — /tarjetas/:id

- Selector C$/US$ cuando existan ambos saldos. Deuda total, saldo del corte, pagos registrados, importe pendiente del corte, fechas de corte y vencimiento, límite y crédito disponible.
- Si el límite es compartido entre monedas, indicarlo con moneda del límite y conversión de referencia; no asumir dos límites independientes.
- Secciones: ciclo actual, cortes anteriores y compras a cuotas con progreso y siguientes cuotas. Pago mínimo/intereses no disponibles se muestran como no registrados, nunca inventados.
- Acciones: registrar compra, pagar mediante F03, crear compra a cuotas mediante F04, editar configuración y abrir movimientos P07.
- Diferenciar deuda total, obligación del corte y crédito disponible. El agente de frontend consume cálculos del dominio; no reproduce fórmulas de tarjeta.

### P11 — Planificar — /planificar

- Resumen de compromisos del mes y próximos vencimientos, lista compacta de presupuestos y metas.
- Enlaces inequívocos: Presupuestos, Metas, Agenda, Préstamos e Inversiones. Cada uno muestra un resumen breve por moneda, sin sumar clases de información incompatibles.
- Acción primaria «Agregar» con opciones de presupuesto, meta o recurrente. Los accesos a préstamos e inversiones llevan a P16/P18.

### P12 — Presupuestos — /presupuestos

- Mes elegido, categorías con límite, gasto, restante y estado de exceso; moneda de cada presupuesto; indicador «Se acumula» o «Se reinicia».
- Crear/editar mediante F05. Seleccionar categoría abre P06 con filtros correspondientes, conservando el regreso.
- Ver importe arrastrado y límites actuales. Exceso muestra importe negativo y etiqueta; no bloquear registro de gastos.

### P13 — Metas — /metas

- Lista con nombre, moneda, objetivo, reservado, faltante, fecha opcional y progreso numérico.
- Agregar mediante F06; seleccionar abre P14. Completadas/archivadas separadas de activas.
- Los totales de metas representan asignaciones virtuales, no dinero adicional al de las cuentas.

### P14 — Detalle de meta — /metas/:id

- Objetivo, progreso, cuentas que respaldan la asignación, historial de asignaciones/liberaciones y fecha opcional.
- Apartar/liberar mediante F06; editar y archivar. Mostrar disponibilidad real de cada cuenta para apartar sin prometer que existe dinero que no está registrado.
- Explicar «Apartar no mueve dinero entre tus cuentas». Cambiar reserva actualiza el disponible, no crea un gasto.

### P15 — Agenda y recurrentes — /agenda

- Lista cronológica, sin calendario cuadriculado obligatorio. Secciones «Próximos», «Pendientes» y «Recurrentes».
- Cada ocurrencia: concepto, ingreso/gasto/pago, fecha, moneda, importe previsto, cuenta si se conoce y estado.
- Crear/editar recurrencia con F07. Confirmar abre F01 o F03 según el tipo, con importe editable. Posponer u omitir una ocurrencia mediante acción explícita; distinguir de pausar toda la recurrencia.
- Un recordatorio no confirma un pago. Ocurrencia ya confirmada no puede registrarse de nuevo por doble pulsación o segundo dispositivo.

### P16 — Préstamos y dinero prestado — /prestamos

- Pestañas «Debo» y «Me deben». Persona/entidad, saldo por moneda, próximo vencimiento y estado.
- Crear mediante F08; detalle P17. No incluir lo que te deben en dinero disponible.

### P17 — Detalle de préstamo — /prestamos/:id

- Dirección (debo/me deben), persona/entidad, principal original, moneda, saldo inicial si es deuda previa, vencimiento, intereses manuales y abonos.
- Acciones: abonar o cobrar mediante F08, registrar interés, editar datos y cerrar cuando corresponda. Cada abono indica cuenta, fecha y distribución registrada de principal/interés.
- Distinguir alta de deuda existente de préstamo nuevo que mueve dinero. No crear ingreso o gasto ficticio al cargar una deuda previa.

### P18 — Inversiones — /inversiones

- Lista de inversiones con moneda, valor actualizado y fecha, aportes y retiros. Seleccionar expande un detalle dentro de esta misma pantalla; no crea una pantalla adicional.
- Detalle expandido: historial, rendimientos cobrados separados de variación de valor y acciones F09 para crear, aportar, retirar, registrar rendimiento o actualizar valoración.
- Valoración antigua señalada. Mostrar desconocido cuando falten datos, no rentabilidad cero. Inversiones no líquidas quedan fuera del disponible.

### P19 — Reportes — /reportes

- Período, comparación con período anterior y modo separado/convertido. Ingresos frente a gastos, desglose por categoría, orígenes de ingreso (incluido Mi negocio) y patrimonio.
- Selector entre flujo, categorías y patrimonio en la misma pantalla. Gráficos acompañados de cifras/listas accesibles; categoría abre P06 filtrada.
- Exportar movimientos filtrados como CSV. Conversión con fecha y método; no sumar NIO y USD sin convertir. Patrimonio distingue valoración de inversiones y saldos líquidos.

### P20 — Asistente — /asistente

- Conversación, campo de texto, enviar/detener respuesta y acciones sugeridas: «Registrar un gasto», «Ver mi disponible», «Simular una compra», «Próximos pagos».
- Respuestas con tarjetas de cifras provenientes del motor financiero, período, moneda, fuente consultable y estado de sincronización. Borradores muestran Confirmar/Editar/Cancelar; confirmar abre o utiliza F01 y conserva los datos exactos aprobados.
- Nombre provisional Asistente; voseo cercano, tranquilo y humor moderado, sin humor ante dificultades financieras.
- Contexto de sesión temporal por defecto con «Nueva conversación»; no inventar historial permanente, voz, avatar animado o memoria personal en esta versión.
- Estados: consultando, generando, cancelado, cuota agotada, error y sin internet. Sin red se ofrecen accesos al registro y simulador locales; no fingir una respuesta de IA. Primer uso explica envío mínimo de datos al proveedor y permite usar la app sin activar el chat.

### P21 — Simulador de compra — /simulador

- Importe, moneda, cuenta de pago, categoría opcional y horizonte explícito hasta fin de mes en la primera versión.
- Comparación antes/después del disponible por moneda, efecto en presupuesto si existe, compromisos y metas protegidas. Si requiere cambio de moneda, indicar supuesto y diferencia frente a fondos realmente disponibles en esa moneda.
- Acciones «Cambiar importe», «Ver cálculo» (F11), «Consultar al asistente» y «Registrar esta compra» (F01 como borrador).
- Simulación inicial al contado. Crédito/cuotas se incorporan solo cuando se especifique su motor, no mediante cifras improvisadas. Ninguna simulación crea un movimiento hasta confirmación.

### P22 — Avisos — /avisos

- Pendientes y leídos: vencimientos, presupuestos, sincronización y recordatorios de registro. Fecha, motivo y enlace al objeto relevante.
- Marcar leído no confirma un pago. Enlace a permisos/configuración en P23. Mensajes obsoletos resueltos cuando el pago se sincronice.
- Mostrar estado de permiso de notificaciones; si está denegado, explicar cómo cambiarlo sin repetir la solicitud en bucle.

### P23 — Ajustes y herramientas — /ajustes

- Secciones expandibles: perfil/acceso, moneda y cambio, categorías/orígenes/favoritos, seguridad, notificaciones, datos/respaldo e información de la app.
- Perfil: nombre, correo, métodos vinculados, recuperación y cerrar sesión; evitar perder pendientes locales al salir.
- Se muestra solo el perfil de la persona autenticada. Cerrar sesión permite después entrar con otra cuenta; no hace falta una pantalla nueva de administración de usuarios. Confirmar tratamiento de pendientes y limpiar sesión anterior antes de habilitar la siguiente.
- Cambio: moneda del resumen, tasa automática/manual, valor, fuente, fecha y restaurar automático. Categorías/orígenes/favoritos mediante F10.
- Seguridad mediante F12; preferencias de avisos, horario y privacidad en pantalla bloqueada; instrucciones de instalación PWA.
- Datos: exportación completa y restauración con revisión mediante F12; CSV para consulta no se presenta como respaldo completo. Acceso P24.
- Información: versión y ayuda. Enlaces secundarios a Reportes, Simulador, Préstamos e Inversiones. No mostrar ajustes de proveedor o claves API como controles cotidianos del usuario.

### P24 — Sincronización y conflictos — /sincronizacion

- Última sincronización, conectividad, cantidad de pendientes y lista de operaciones con errores. Reintentar y revisar conflicto.
- Comparación explícita de versión local y remota: importe, moneda, fecha, cuenta y cambios. Elegir resolución mediante diálogo, sin seleccionar por defecto la última escritura para datos financieros.
- Mensajes diferenciados: offline, enviando, guardado en dispositivo, sincronizado, rechazado por servidor y conflicto. No rotular «Respaldado» solo porque esté sincronizado.

## Formularios reutilizables

Todos conservan borrador si falla el guardado, muestran validación junto al campo y desactivan doble envío. Formularios extensos ocupan el alto del móvil; selectores breves usan panel inferior. En pantalla grande pueden ser paneles laterales. Cerrar con cambios pregunta si descartar. No apilar diálogos.

| ID | Formulario y variantes | Campos y resultado |
|---|---|---|
| F01 | Movimiento rápido: gasto, ingreso, transferencia, devolución, ajuste | Importe y moneda, cuenta, fecha, categoría/origen y nota opcional; transferencia añade destino e importe recibido si cambia moneda; devolución enlaza movimiento. Favoritos prellenan, nunca guardan automáticamente. Fecha inicial hoy; moneda deriva de cuenta, pero permanece visible. |
| F02 | Crear/editar cuenta o tarjeta | Tipo, nombre, moneda, saldo inicial y fecha; tarjeta añade saldos por moneda, corte/vencimiento, límite compartido o separado según dominio. No pedir número completo de tarjeta ni credenciales bancarias. |
| F03 | Pago de tarjeta | Tarjeta, moneda de deuda, cuenta de origen, importe debitado, importe aplicado y fecha; si hay conversión, mostrar tasa derivada. Confirmación resume reducción de deuda, no gasto nuevo. |
| F04 | Compra a cuotas | Tarjeta, concepto/categoría, importe, moneda, fecha de compra, número de cuotas, primera fecha y cargos/interés conocidos. Vista previa usa plan calculado por dominio y señala información faltante; edición respeta cuotas pagadas. |
| F05 | Presupuesto | Categoría, moneda, límite mensual, reinicio/acumulación; revisión del período afectado al editar. |
| F06 | Meta y asignación | Crear: nombre, moneda, objetivo y fecha opcional. Asignar/liberar: cuenta, importe, fecha y saldo disponible. |
| F07 | Recurrente | Tipo, concepto, importe/moneda, cuenta opcional, categoría/origen, frecuencia, primera fecha, fin opcional y avisos. Confirmación de ocurrencia siempre separada. |
| F08 | Préstamo y abono | Crear: debo/me deben, persona/entidad, moneda, principal, nuevo/existente, fecha y vencimiento. Abono: cuenta, principal/interés y fecha. |
| F09 | Inversión y operación | Crear: nombre, moneda y valor inicial fechado. Operación: aporte/retiro/rendimiento/valoración, importe, fecha y cuenta cuando mueve efectivo. |
| F10 | Categorías, orígenes y favoritos | Nombre, tipo, icono/color opcional; favorito con tipo/cuenta/categoría e importe opcional. Archivar elementos usados conserva referencias históricas. |
| F11 | Desglose del disponible | Panel de lectura: liquidez, reservas únicas para compromisos, metas protegidas, período, cambio y suma final; enlaces al origen de cada reserva. No es formulario de edición ni nueva pantalla. |
| F12 | Seguridad y mantenimiento | Flujos separados dentro del mismo contenedor: PIN/cambio/recuperación, exportación y restauración. Restaurar muestra archivo, versión, conteos, conflictos y alcance antes de confirmar; no ejecutar importación destructiva al seleccionar archivo. |

El conteo de 12 refiere a familias reutilizables, no a que todos sus modos tengan los mismos campos. F11 es un panel de lectura incluido en este inventario de superficies auxiliares. Diálogos compartidos: confirmar anulación/archivo, descartar borrador, resolver conflicto y revisar restauración. No cuentan como rutas.

## Criterios comunes derivados de las habilidades de diseño

- Frontend Design: la identidad se centra en cifras claras, doble moneda y explicación del disponible; no construir una landing page ni un tablero genérico lleno de tarjetas.
- Impeccable, modo Operate: una acción principal por superficie, navegación familiar, etiquetas consistentes, datos detallados progresivamente, campos con nombres visibles y vacíos que indiquen qué hacer.
- Emil: guardado local con respuesta inmediata, animaciones breves solo para cambios de estado, ninguna introducción animada al abrir listas repetidamente. Respetar movimiento reducido.
- Usar «C$» y «US$» visibles junto a importes. Alinear cifras con dígitos tabulares. No cortar importes largos; adaptar fila o tamaño dentro de límites legibles.
- Controles táctiles con objetivo mínimo de 44 × 44 CSS px; foco visible y uso por teclado; etiquetas accesibles; errores con texto, no solo color. Texto ampliado al 200% conserva acciones.
- Formularios con entrada decimal adecuada, aceptación definida de coma/punto y presentación consistente; no interpretar una entrada ambigua sin aclaración. La normalización exacta pertenece al contrato de importes.
- Barra inferior y botones respetan áreas seguras de iOS y teclado virtual; el teclado nunca oculta Confirmar ni el último mensaje del chat.
- Listas largas usan carga por bloques o virtualización accesible; no traer todo el historial solo para dibujar Inicio. Indicar cuando un período no está disponible offline.
- Los estados de carga no sustituyen con ceros datos aún desconocidos. Sin conexión no se cubre toda la app con un error: permanecen activas las operaciones locales soportadas.
- Para todas las pantallas con datos: carga inicial, vacío, contenido, error recuperable, sin conexión y permisos insuficientes cuando aplique. Para cada acción: reposo, foco, pulsado, envío, éxito, error y deshabilitado explicable.
- La paleta, fuentes y tokens definitivos no están elegidos; los agentes deben compartir un sistema común y no inventar estilos por módulo. Tailwind sigue siendo una propuesta, no un requisito ya confirmado.

## Entrega y aceptación para agentes

1. Implementar las rutas P01–P24 y familias F01–F12 con las entradas, salidas y estados aquí definidos. No agregar pantallas nuevas sin reflejarlas en este inventario.
2. Reutilizar componentes: importe multimoneda, fila de movimiento, selector de cuenta, selector de fecha/período, progreso de presupuesto/meta, estado de sincronización, confirmación, formulario y tarjeta de resultado del asistente.
3. Usar un único motor de dominio para Inicio, Reportes, Simulador y Asistente. El frontend nunca calcula una versión alternativa del saldo.
4. Verificar recorridos: alta→cuenta→gasto; transferencia entre monedas; compra de tarjeta→pago; recurrente→confirmación; meta→asignación; préstamo→abono; inversión→valoración; simulación→borrador; chat→confirmación; offline→sincronización→conflicto; exportación→revisión de restauración.
5. Verificar en iPhone y Android reales: instalación, formularios con teclado, áreas seguras, lista larga, importes grandes, bloqueo y aviso push. Emulación de navegador no prueba por sí sola compatibilidad real.
6. No incluir aún fotos de recibos, administración de negocio, conexión bancaria, importación bancaria, asistentes de voz, chat social ni pantallas comerciales.

## Dependencias que no puede inventar el frontend

La especificación financiera debe fijar tratamiento de cortes/cuotas, valoración histórica, efecto de reembolsos, acumulación de presupuestos, reservas únicas y conflictos. Seguridad debe fijar PIN/recuperación y política de acceso inicial. Integraciones deben validar proveedor IA, cambio y notificaciones gratuitas. Este inventario fija contenido y navegación, no sustituye esos contratos ni es todavía el plan técnico ejecutable completo.
