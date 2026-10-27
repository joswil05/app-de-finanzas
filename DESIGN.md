# Sistema visual inicial

## Dirección

Modo Operate, con claridad financiera y uso móvil. Referencias funcionales Wallet/Spendee/YNAB; no copiar su identidad. Diferenciación propia: disponible por moneda explicable y registro rápido, con chat como ayuda complementaria. Aplicar criterios de Frontend Design, Impeccable Operate y Emil Kowalski.

## Tokens iniciales

- Fondo #F6F8FB, superficie #FFFFFF, texto #182538, texto secundario #526277, acción #2457C5, error #B42318 y éxito #176447.
- Tipografía del sistema, cifras tabulares. Escala12/14/16/20/24/32px, espaciado4/8/12/16/24/32, radios8/12/16.
- CSS Modules por componente y variables globales. Lucide para iconos coherentes; texto accesible y visible en navegación principal.

## Composición y comportamiento

Disponible por C$/US$ con desglose, horizonte y estado de sincronización; no una cifra que mezcla monedas. Inicio limita pagos/presupuestos/movimientos visibles y enlaza sus listas. Superficies con encabezado, una acción principal y detalles progresivos. Sin decoración que parezca reporte o dado financiero.

Cinco destinos abajo en móvil; sidebar en escritorio desde1024px. Formularios largos ocupan pantalla móvil; respetar área segura y teclado. Mínimo320px, zoom200%, controles44×44, focus y navegación por teclado. Información de errores y deuda nunca solo por color.

Animaciones breves de estado, sin introducción animada de páginas ni retraso al registrar. Respetar movimiento reducido. Guardado local, envío y confirmación remota tienen etiquetas distintas. Estado desconocido no aparece como saldo0.

## Registro y asistente

Formularios importe/cuenta/categoría primero, detalles opcionales. Un favorito prepara borrador. Chat con tarjetas del motor financiero, no cifras inventadas; guardar siempre muestra campos concretos y confirmación. Tono cercano con voseo, sin bromas ante dificultades de dinero. No mascota animada ni modo oscuro inicial.

## Validación

Contraste debe comprobarse con implementación real. Probar longitud de importes, lista larga, textos ampliados, teclado virtual, offline, vacíos y errores en ambos sistemas. Contenido y acciones normativos en docs/planificacion/04-inventario-interfaces.md. Inventario es revisable según política de autonomía del plan maestro.

## Corrección visual solicitada por el usuario — 2026-10-18

La captura técnica de ajustes fue rechazada como referencia de acabado. Sus pruebas de contraste/navegación siguen siendo evidencia técnica; no constituyen aprobación visual. El estilo final debe sentirse cuidado, equilibrado y propio de una app móvil de finanzas, dentro de esta paleta y tipografía del sistema. No hace falta una nueva identidad de marca ni una maqueta separada.

Tesis espacial: primero reconocer dónde estoy y qué puedo hacer; después ver mi cuenta y grupos de herramientas con peso distinto. El color de acción se reserva para Registrar y la selección vigente. Ajustes no es una lista de enlaces azules de igual importancia.

| Antes | Después | Motivo |
|---|---|---|
| Encabezado de tres filas con acciones compitiendo | Título breve y dos utilidades discretas; Registrar en ubicación móvil consistente y al alcance del pulgar | Recuperar espacio útil y jerarquía |
| Nueve enlaces azules idénticos | Grupos por propósito, etiquetas neutras, iconos coherentes y separadores contenidos | Escaneo y reconocimiento |
| Campo/botón de prueba en captura | Cuenta y controles reales de la app; sin fixtures insertadas para presentar el acabado | Evaluar el producto real |
| Palabras cortadas dentro de la barra inferior | Etiquetas completas, cinco destinos legibles a320px; reflujo por controles completos con texto ampliado | Evitar apariencia rota sin reducir legibilidad |
| Aprobación solo por medidas | Inspección visual móvil/escritorio de composición, ritmo, densidad y estados, además de accesibilidad | Las métricas no sustituyen el criterio visual |

Mantener controles44px, contraste, áreas seguras, foco y protección de formularios. Animaciones solo de respuesta/estado, discretas y cancelables; no coreografía de páginas. Revisar en una tanda móvil/escritorio con contenido real de prueba dentro de la app, corregir en un solo lote y confirmar una vez. El cierre visual T07 queda abierto hasta ese pase.
