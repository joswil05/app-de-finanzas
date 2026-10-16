# Punto de entrada de la planificación

La construcción fue autorizada por el usuario después de confirmar usuarios independientes y ya comenzó. Consultar el registro de ejecución para estado real. Los documentos no autorizan por sí solos desplegar servicios ni usar datos reales.

## Lectura obligatoria para agentes

1. [Plan maestro: 24 tareas](07-plan-maestro-agentes.md).
2. [Especificación consolidada](05-especificacion-consolidada.md).
3. [Contratos y 38 vectores de prueba](06-contratos-y-pruebas.md).
4. [Inventario de 24 pantallas y 12 familias auxiliares](04-inventario-interfaces.md).

La especificación fija reglas técnicas; el inventario fija interfaz; el contrato fija nombres/datos; el plan fija dependencias y evidencia. Un conflicto entre ellos se corrige documentalmente antes de implementar el comportamiento afectado. Los documentos 01–03 son antecedentes de decisiones e investigación y no sustituyen el contrato consolidado.

El usuario autoriza adaptar el plan ante obstáculos. La sección «Autonomía para investigar y adaptar el plan» del plan maestro distingue ajustes técnicos autónomos de decisiones que requieren consulta. Los archivos, contratos y conteo de pantallas son una base revisable con trazabilidad; los requisitos y la calidad siguen siendo obligatorios.

## Alcance

PWA de finanzas personales para varios usuarios independientes, iOS/Android, Firebase, NIO/USD, manual y offline, tarjetas, préstamos, metas, presupuestos, inversiones, registro rápido, disponible/simulador, chat IA con personalidad y recordatorios. Servicios iniciales gratuitos sujetos a validación; cuotas compartidas con límites por usuario y globales. Ejecución con GPT‑6.1 Sol autorizada por el usuario; publicación externa requiere autorización aplicable.

## Cómo retomar

Leer `../ejecucion/estado.md`, elegir primera tarea con dependencias cumplidas y consultar su evidencia. No regenerar el proyecto ni reemplazar archivos existentes por asumir que está vacío. Las casillas no sustituyen pruebas.

## Decisiones iniciales añadidas al consolidar

- CSS Modules y tokens comunes; Tailwind no se había confirmado.
- Compra a cuotas consume gasto/presupuesto completo en fecha de compra; el calendario distribuye exigibilidad.
- Arrastre presupuestario solo de sobrante positivo; no arrastrar déficit automáticamente.
- Disponible hasta fin de mes, excluye ingresos esperados y crédito; reservas únicas.
- PIN es bloqueo de privacidad local, no cifrado de la base; biometría opcional por compatibilidad.
- Revisiones inmutables para evitar sobrescrituras financieras offline.
- Exportación restaurable con fusión, sin reemplazo destructivo inicial.
- Chat temporal y herramientas cerradas, con proveedor Groq candidato validado antes de uso real.

Son valores recomendados explícitos para que los agentes no inventen reglas contradictorias. Pueden revisarse por instrucción del usuario antes o durante construcción actualizando los documentos afectados.

## Inicio de ejecución

Usar `08-instruccion-de-arranque.md` cuando el usuario decida comenzar. Esta entrega no incluye código de aplicación, cuentas creadas, despliegue ni pruebas de servicios en vivo.
