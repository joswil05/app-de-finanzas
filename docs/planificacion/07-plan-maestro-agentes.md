# App de finanzas personales — Plan maestro de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` o `executing-plans` para ejecutar este plan tarea por tarea. Usar las habilidades instaladas con esos nombres; no asumir rutas de otra máquina. Cada paso usa casillas de seguimiento.

**Goal:** Construir una PWA personal NIO/USD con registro rápido, finanzas completas, sincronización offline, simulador, recordatorios y asistente contextual.

**Architecture:** Monorepositorio con dominio financiero puro compartido, revisiones inmutables en Firestore y proyecciones locales. PWA React y Workers separados para IA y recordatorios; los servicios externos se validan antes de considerarlos operativos.

**Tech Stack:** React, TypeScript, Vite, CSS Modules, React Router, Firebase Auth/Firestore/Hosting, Workbox, Zod, Cloudflare Workers, FCM, Groq candidato, Vitest, Testing Library y Playwright.

**Spec:** `docs/planificacion/05-especificacion-consolidada.md`.
**Interfaces:** `docs/planificacion/04-inventario-interfaces.md`.
**Contracts:** `docs/planificacion/06-contratos-y-pruebas.md`.
**Execution model:** GPT‑6.1 Sol (`gpt-6.1-sol`), por elección del usuario.

## Global Constraints

- Construcción local autorizada; publicación externa y facturación requieren autorización aplicable.
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

## Cómo empezar y mantener continuidad

1. Leer especificación, contratos e inventario completos antes de implementar una tarea. Los documentos 01–03 aportan contexto; no reemplazan los contratos actuales.
2. Inspeccionar archivos reales, instrucciones AGENTS.md si existen y estado Git. La planificación encontró solo documentos, sin aplicación ni repositorio Git confirmado. No suponer que sigue vacío ni sobrescribir trabajo posterior.
3. Si no hay Git, inicializar repositorio local durante la construcción autorizada; no crear remoto ni publicar por inferencia. Si hay cambios ajenos, conservarlos.
4. Crear `docs/ejecucion/estado.md` con T01–T24 y `docs/ejecucion/Txx.md` para cada evidencia. Retomar desde la primera tarea elegible, sin repetir trabajo verificado.
5. Leer versiones fijadas por T01. Paquetes compartidos se llaman `@fin/contracts`, `@fin/domain` y `@fin/testkit`; resolverlos con npm workspaces y exports. Las librerías y contratos pueden adaptarse conforme a la política de autonomía siguiente; coordinar sus cambios entre consumidores y mantener lockfile y documentación vigentes.
6. Los fragmentos de implementación son anclas de comportamiento; completar módulos con tipos, imports y validaciones prescritos. Los tests mostrados son casos concretos mínimos: añadir vectores aplicables y recorridos del inventario. No entregar funciones vacías ni mocks en producción para hacerlos pasar.
7. Ejecutar primero el test nuevo y comprobar fallo pertinente (módulo ausente o comportamiento aún no implementado). Si pasa desde el principio, comprobar que sí prueba la necesidad. Implementar, ejecutar y registrar resultados reales.
8. Cada tarea termina con revisión de requisitos y después calidad/seguridad. Corregir hallazgos y repetir solo lo afectado. Commit local por tarea cuando exista Git; nunca incluir secretos ni outputs voluminosos.
9. Un fallo externo no se arregla fingiendo éxito. Emuladores permiten avanzar módulos independientes; el estado de integración permanece bloqueado hasta prueba real.
10. El usuario autorizó iniciar construcción después de confirmar usuarios independientes. Ejecutar tareas locales; las acciones externas siguen los límites de autorización indicados.

## Autonomía para investigar y adaptar el plan

Por instrucción expresa del usuario, este plan es una guía ejecutable que puede evolucionar con evidencia. Los agentes deben perseguir el resultado acordado, no reproducir literalmente una solución que haya demostrado ser incorrecta o inviable. Esta política prevalece sobre formulaciones rígidas de los documentos 04–08 acerca de archivos, firmas, herramientas, tareas y ejemplos. No cambia el alcance funcional ni autoriza iniciar construcción antes de la indicación del usuario.

**Pueden resolver sin consultar al usuario:**

- Consultar documentación oficial actual, investigar errores, comparar alternativas y realizar pruebas acotadas con datos ficticios.
- Corregir errores del plan, fragmentos de ejemplo, nombres, comandos o tests cuando contradigan los requisitos; conservar o reforzar la comprobación del comportamiento esperado.
- Actualizar versiones compatibles y sustituir librerías auxiliares, adaptadores, componentes o herramientas de prueba por alternativas equivalentes sin costo adicional ni menor protección de datos.
- Reorganizar archivos, dividir o combinar tareas, introducir tareas de investigación y cambiar el orden cuando lo permitan las dependencias reales. Conservar una matriz de cobertura y trazabilidad con las tareas originales.
- Revisar contratos internos y detalles de persistencia/sincronización cuando una prueba demuestre que el diseño propuesto falla, siempre que preserven datos, resultado financiero, trabajo offline, compatibilidad e idempotencia. Preparar y probar migración si ya hay datos; no aplicar migraciones destructivas a datos reales por inferencia.
- Ajustar disposición, componentes y número de rutas/paneles si mejora el uso y conserva todos los contenidos y recorridos acordados. Actualizar el inventario; 24 pantallas es la base inicial, no una obligación de mantener rutas redundantes.
- Consultar al coordinador/revisor u otros agentes participantes dentro del trabajo autorizado. Una decisión técnica interna no necesita convertirse automáticamente en una pregunta al usuario. No enviar mensajes a chats externos ni terceros sin autorización.

**Requieren decisión del usuario si no existe autorización previa:** eliminar o posponer funciones acordadas; cambiar reglas financieras con efecto visible (por ejemplo, cuándo consume presupuesto una compra a cuotas); sustituir PWA o Firebase como base; introducir costos/facturación; reducir privacidad, seguridad, respaldo o compatibilidad; enviar datos reales a un proveedor nuevo; publicar o realizar acciones destructivas sobre datos reales. Presentar recomendación y alternativas concretas, y continuar trabajo independiente mientras llega la respuesta.

**Procedimiento ante un obstáculo:**

1. Reproducir el fallo y distinguir error de implementación, supuesto incorrecto y limitación externa.
2. Consultar fuentes y comparar al menos una alternativa razonable. Preferir el cambio más pequeño que resuelva la causa sin degradar el producto.
3. Si está dentro de la autonomía anterior, decidir y continuar sin esperar permiso. Si cruza un límite, plantear una pregunta breve con evidencia, impacto y recomendación.
4. Registrar la decisión en `docs/ejecucion/decisiones.md`: ID, fecha, tarea, problema/evidencia, opciones, elección, impacto en datos/costos/privacidad, documentos modificados, pruebas y reversión. No hace falta registrar cada ajuste cosmético o refactor menor.
5. Actualizar contratos, inventario, dependencias y tests afectados en el mismo cambio. El coordinador informa a los agentes consumidores antes de integrar; si solo trabaja un agente, asume esa función.
6. Ejecutar pruebas nuevas y regresión pertinente. No eliminar una prueba de integridad, sustituir una integración real por un mock definitivo ni rebajar aceptación para ocultar el fallo.

Si documentación y comportamiento observado discrepan, conservar evidencia y resolver el contrato. Si tras dos intentos equivalentes no hay progreso, cambiar de hipótesis o hacer una investigación acotada; no repetir indefinidamente el mismo intento. Mantener al usuario informado de cambios materiales sin consultarle cada detalle técnico.

## Coordinación para GPT‑6.1 Sol

El coordinador conserva la visión global; cada implementador recibe una tarea, sus dependencias ya terminadas, archivos permitidos, contratos, vectores y criterios de salida. Si se usan agentes, mantener GPT‑6.1 Sol; no cambiar de modelo. Con las herramientas actuales, un override de modelo usa fork_turns="none" y una instrucción autosuficiente con rutas; no depender de que el agente herede todo el chat.

Máximo recomendado: coordinador + dos implementadores en módulos disjuntos + revisor. No es obligatorio usar paralelismo; ejecución secuencial cumple el plan. No asignar al implementador su propia aprobación final. El revisor puede revisar varias tareas cortas, pero debe identificar evidencias por tarea.

Archivos de propiedad del coordinador: package.json, lockfile, contratos, router, tokens, Firebase rules/índices, service worker y configuración de despliegue. Cambios compartidos se integran secuencialmente. Implementadores proponen cambios al coordinador; no dos agentes editando el lockfile/router a la vez.

Orden seguro:
- Base: T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08.
- T09 y T10 pueden ejecutarse en paralelo tras T08; T11 espera ambas.
- T12 y T13 pueden ejecutarse en paralelo tras T11.
- T14 espera T12 y T09. T15 espera T10–T14.
- T16 y T17 pueden ejecutarse en paralelo tras T15 si los componentes compartidos ya están integrados.
- T18 después de T15; T19 espera T14/T18; T20 espera T16/T18.
- T21 espera T20; T22 espera T17/T19/T21; T23 y T24 secuenciales.

G01 se inicia en T01 con prototipos ficticios independientes, y se repite de forma focalizada al integrar T05/T18/T19/T20/T22. Si faltan cuentas, registrar el bloqueo y continuar dominio/interfaz; no exigir credenciales antes de poder hacer trabajo local.

## Estructura de archivos

```text
apps/web/src/
  app/                 router y shell
  data/                Firebase, repositorio, outbox, hooks de proyección
  ui/                  componentes comunes y tokens
  features/            auth, security, onboarding, home, accounts, movements,
                       cards, planning, budgets, goals, agenda, loans,
                       investments, reports, simulator, assistant,
                       notifications, settings, sync, backup, fx, pwa
  sw.ts                único service worker Workbox + FCM
packages/
  contracts/src/       tipos, schemas y protocolo
  domain/src/          cálculos puros, revisiones y constructores
  testkit/src/         datos ficticios deterministas
workers/
  ai/src/              auth, cuotas, chat y adaptador BCN
  reminders/src/       cron, leases y FCM
tests/
  contracts/ domain/ data/ rules/ workers/ ai/ e2e/
  fixtures.ts          propietario emulado y seedScenario
docs/
  planificacion/       especificaciones y este plan
  ejecucion/           estado y evidencias por tarea
  operacion/           versiones, viabilidad, manual y recuperación
```

## Reglas del arnés de pruebas

T01 crea también los package.json y tsconfig.json mínimos de todos los workspaces declarados, aunque sus implementaciones lleguen después. Cada workspace expone scripts typecheck/build válidos y nombres @fin/* coherentes. No dejar scripts que reporten éxito sin ejecutar comprobación real. Tests de integración y Playwright no se incluyen en el glob de Vitest unitario.

Vitest solo incluye tests unitarios/contratos/workers/data; los de rules corren mediante su comando con emuladores y los e2e mediante Playwright. Evitar que `npm test` ejecute archivos Playwright o dependa de credenciales reales. Tiempo y aleatoriedad inyectables. Playwright usa emuladores Auth/Firestore y build de PWA para pruebas offline. `tests/fixtures.ts` se implementa en T06 y exporta test, expect y seedScenario. Selectores por nombre accesible; testid solo para contenedores/estados sin etiqueta visual única.

Baseline de fixtures: cuenta cash-nio «Efectivo», categoría food «Alimentación», cuenta bank-usd «Banco USD» y origen business «Mi negocio». Cifras en centavos como contrato. Formato monetario visible se centraliza en MoneyText; no modificar importe esperado para ocultar fallo de cálculo. Tests e2e pueden comprobar valor numérico/moneda mediante atributo accesible si locale introduce espacios no separables.

## Tareas

### Requisitos transversales de usuarios independientes

El usuario confirmó múltiples usuarios independientes. Esta actualización reemplaza cualquier referencia anterior a una allowlist de un único propietario. No hay finanzas compartidas. Mantener las 24 tareas, ampliando cobertura:

| Tarea | Ampliación obligatoria |
|---|---|
| T02 | VerifiedSession/UserProfile y fixtures A/B, con IDs lógicos repetidos válidos en namespaces distintos. |
| T05 | Rules permiten a A y B leer/escribir sus propios datos y rechazan accesos cruzados; caché/outbox/hidratación se aíslan por UID. |
| T06 | Registro Google/correo, verificación, onboarding por usuario y cierre/cambio de cuenta seguro. |
| T17 | Restauración valida Backup.ownerUid contra sesión; rechaza archivo de otro usuario sin escribir. |
| T19 | Scheduler indexado entre usuarios, cursor equitativo y entrega solo a devices del mismo namespace. |
| T20 | Verificación de cualquier UID válido, cuota individual y global, sin constante de propietario. |
| T21 | Chat, consentimiento y borradores aislados; cancelar respuestas al salir/cambiar usuario. |
| T22 | Limpiar caché entre identidades y coordinar pestañas; no mostrar datos offline de la sesión previa. |
| T23 | V31–V38 obligatorios con dos sesiones válidas simultáneas y un mismo navegador cambiando de identidad. |
| T24 | Documentar cuotas compartidas, registro y comportamiento al alcanzar límites gratuitos. |

Los ejemplos de fixtures con `owner-test` identifican un usuario de prueba A, no una restricción de producción. Añadir `user-b` con acceso propio positivo: denegar todo a B no satisface aislamiento multiusuario. Antes de implementar T19/T20 leer los detalles actualizados de especificación y contratos.

### T01 — Base reproducible y validación temprana de servicios

**Dependencias:** Ninguna.
**Archivos a crear o modificar:** `package.json`, `package-lock.json`, `.node-version`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `apps/web/package.json`, `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `firebase.json`, `.firebaserc.example`, `workers/ai/wrangler.toml`, `workers/reminders/wrangler.toml`, `docs/operacion/versiones.md`, `docs/operacion/viabilidad.md`.
**Interfaces consumidas/producidas:** Produce workspaces y comandos npm ci, dev, typecheck, lint, test, test:rules, test:e2e, build y check. Consume requisitos globales y G01 de especificación.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
// tests/setup.test.ts
import { test, expect } from 'vitest';
test('entorno con fechas de negocio estable', () => {
  const value = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date('2026-10-16T01:00:00Z'));
  expect(value).toContain('2026');
  expect(value).toContain('15');
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Resolver y fijar versiones estables compatibles desde documentación oficial, sin usar rangos abiertos en entregable. Crear workspaces, TypeScript strict/noUncheckedIndexedAccess, ESLint, Vitest, Playwright y emuladores. No construir pantallas funcionales todavía. Preparar .env.example solo con nombres y valores ficticios; secretos del servidor mediante wrangler secret. Ejecutar G01 con datos ficticios: acceso Firebase, persistencia iOS/Android, push, Groq herramientas/ZDR, Worker CPU y BCN. Guardar scripts de prueba aislados bajo experiments/viability, resultado y requisitos de cuentas. Si falta acceso externo marcar NO EJECUTADO y continuar módulos locales; la puerta G01 permanece abierta.

Ancla técnica de implementación:
```ts
// package.json: scripts raíz (crear scripts homologados en cada workspace)
{
  "scripts": {
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "eslint .",
    "test": "vitest run",
    "test:rules": "firebase emulators:exec --only auth,firestore \"vitest run tests/rules\"",
    "test:e2e": "playwright test",
    "build": "npm run build --workspaces --if-present",
    "check": "npm run typecheck && npm run lint && npm run test && npm run build"
  }
}
```

- [ ] **4. Verificar.** npm ci; npm run typecheck; npm run test -- tests/setup.test.ts; npm run build. El test de entorno solo verifica arnés; no prueba G01.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T01.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Instalación reproducible y build vacío reales. G01 con evidencia honesta de PASS/FAIL/NO EJECUTADO. No marcar integraciones listas por tener SDK instalado.

### T02 — Contratos, esquemas y datos ficticios compartidos

**Dependencias:** T01.
**Archivos a crear o modificar:** `packages/contracts/src/index.ts`, `packages/contracts/src/money.ts`, `packages/contracts/src/revision.ts`, `packages/contracts/src/entities.ts`, `packages/contracts/src/assistant.ts`, `packages/testkit/src/index.ts`, `packages/testkit/src/fixtures.ts`, `tests/contracts/schema.test.ts`.
**Interfaces consumidas/producidas:** Produce todos los tipos/esquemas de 06-contratos-y-pruebas.md. Produce fixtureSnapshot(name: 'empty'|'baseline'|'card'|'loan'|'investment'|'conflict'): Snapshot y fixtureRevisions(name: mismo union): Revision[].

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import { expect, test } from 'vitest';
import { MoneySchema } from '@fin/contracts';
test('rechaza cantidades que no representan centavos exactos', () => {
  expect(MoneySchema.safeParse({currency:'NIO',minor:1.5}).success).toBe(false);
  expect(MoneySchema.safeParse({currency:'EUR',minor:100}).success).toBe(false);
  expect(MoneySchema.parse({currency:'USD',minor:100}).minor).toBe(100);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Crear contratos públicos y esquemas estrictos; cadenas LocalDate con calendario real, IDs sin rutas, Money entero seguro y moneda cerrada. Crear discriminated union de payload por kind. Definir datos deterministas con reloj 2026-10-15 y UID owner-test. baseline: efectivo NIO 1200000 centavos, banco USD 10000, meta NIO 200000 y obligación NIO 500000 independiente; categorías comida/otros y origen Mi negocio. fixtures card/loan/investment amplían baseline con V06/V13/V14; conflict usa V16. Archivos JSON nunca contienen datos reales.

Ancla técnica de implementación:
```ts
export const MoneySchema = z.object({
  currency: z.enum(['NIO', 'USD']),
  minor: z.number().int().safe().min(-9_000_000_000_000).max(9_000_000_000_000)
}).strict();
// Aplicar la misma validación de frontera a cada payload antes de persistirlo.
```

- [ ] **4. Verificar.** npm run test -- tests/contracts/schema.test.ts; npm run typecheck. Añadir casos LocalDate imposible, padres inválidos, unknown fields y límites de notas.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T02.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Ningún consumidor usa any ni inventa un segundo Money. Fixtures exportadas y balanceadas; snapshots incompletos declarados.

### T03 — Dinero, conversión y libro financiero

**Dependencias:** T02.
**Archivos a crear o modificar:** `packages/domain/src/money.ts`, `packages/domain/src/ledger.ts`, `packages/domain/src/builders.ts`, `packages/domain/src/index.ts`, `tests/domain/ledger.test.ts`.
**Interfaces consumidas/producidas:** Produce parseMoney, convertMoney, validateMovement y balance con firmas del contrato; constructores de ingreso/gasto/transferencia/pago definidos y exportados con entradas tipadas.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import { expect, test } from 'vitest';
import { convertMoney, parseMoney } from '@fin/domain';
test('conserva centavos y convierte USD a NIO', () => {
  expect(parseMoney('12,50','NIO')).toEqual({currency:'NIO',minor:1250});
  expect(() => parseMoney('1,234.56','NIO')).toThrow();
  expect(convertMoney({currency:'USD',minor:10000},'NIO',{
    nioPerUsd:'36.6243',effectiveDate:'2026-10-15',
    fetchedAt:'2026-10-15T12:00:00Z',source:'BCN'
  }).minor).toBe(366243);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Implementar V01–V06, entradas decimales sin miles, conversión entera y redondeo. Validar suma de apuntes por moneda exactamente cero. Comprobar cuenta/moneda y contrapartidas, signo y flow por tipo; apertura/transferencia no generan flujo. Construir movimientos en funciones puras. Rechazar moneda de cuenta distinta salvo movimiento explícito de conversión con puente. No usar float para acumular dinero.

Ancla técnica de implementación:
```ts
const totals = new Map<Currency, number>();
for (const p of movement.postings) {
  totals.set(p.amount.currency, (totals.get(p.amount.currency) ?? 0) + p.amount.minor);
}
if ([...totals.values()].some(total => total !== 0)) {
  throw new DomainError('UNBALANCED', 'Los apuntes no están balanceados.');
}
// Validar además semántica por kind; balance por sí solo no valida el negocio.
```

- [ ] **4. Verificar.** npm run test -- tests/domain/ledger.test.ts; npm run typecheck. Casos negativos, saldo a favor, retorno de NIO→USD, límites y V04/V05/V06.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T03.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Transferencias y pagos no duplican gasto, suma por moneda cero, sin diferencias entre cálculo cliente y pruebas.

### T04 — Revisiones inmutables y resolución de conflictos

**Dependencias:** T02, T03.
**Archivos a crear o modificar:** `packages/domain/src/revisions.ts`, `packages/domain/src/projection.ts`, `tests/domain/revisions.test.ts`.
**Interfaces consumidas/producidas:** Produce projectHeads<T> y projectionToSnapshot(revisions: Revision[], status: SyncStatus): Snapshot. Consume tipos/schemas y ledger.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import { expect, test } from 'vitest';
import { projectHeads } from '@fin/domain';
import type { Revision } from '@fin/contracts';
test('dos ediciones offline conservan ancestro hasta resolución', () => {
  const r = (id:string,parentIds:string[],amount:number):Revision<{amount:number}> =>
    ({schemaVersion:1,id,aggregateId:'m1',kind:'movement',parentIds,
      payload:{amount},deviceId:'d',createdAtClient:'2026-10-15T12:00:00Z'});
  const events = [r('a',[],100),r('b',['a'],200),r('c',['a'],300)];
  expect(projectHeads(events)[0]).toMatchObject({state:'conflict',value:{amount:100}});
  expect(projectHeads([...events,r('d',['b','c'],250)])[0])
    .toMatchObject({state:'resolved',value:{amount:250}});
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Construir DAG por agregado, validar padres, ordenar topológicamente y proyectar solo estado resoluble. Bifurcaciones mantienen ancestro común; sin ancestro excluyen objeto y marcan incomplete. Resolución debe referenciar todas las cabezas, nueva rama posterior reabre conflicto. Canonicalizar solo campos financieros para deduplicar dos creaciones de una ocurrencia idéntica; conservar evidencias de ambas revisiones. No usar timestamp como desempate financiero.

Ancla técnica de implementación:
```ts
// Una resolución es un evento nuevo, jamás update de las ramas.
const resolution: Revision = {
  schemaVersion: 1, id: crypto.randomUUID(), aggregateId,
  kind, parentIds: [...headIds].sort(), payload: chosenPayload,
  deviceId, createdAtClient: nowIso
};
```

- [ ] **4. Verificar.** npm run test -- tests/domain/revisions.test.ts. V16/V17/V20 y permutaciones del orden de llegada, padre ausente, ciclo, parent de otro agregado.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T04.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Cambiar orden de llegada no cambia totales. Ninguna bifurcación financiera se pierde silenciosamente.

### T05 — Repositorio Firestore, bandeja local y reglas

**Dependencias:** T04; Firebase emulator de T01.
**Archivos a crear o modificar:** `apps/web/src/data/firebase.ts`, `apps/web/src/data/firestore-repository.ts`, `apps/web/src/data/outbox.ts`, `apps/web/src/data/use-snapshot.ts`, `firestore.rules`, `firestore.indexes.json`, `tests/rules/isolation.test.ts`, `tests/data/repository.test.ts`.
**Interfaces consumidas/producidas:** Implementa RevisionRepository. useSnapshot(): {snapshot: Snapshot; status: SyncStatus}. Provee IndexedDB outbox para comandos hasta ACK; no duplica proyección del libro.

Coordinación de ejecución: la integración React `use-snapshot.ts` se entrega en T08 sobre el repositorio y proyector aprobados; el repositorio T05 mantiene la fuente única de revisiones/estado. El hook debe desmontarse y descartar su estado al bloquear/cerrar/cambiar UID, pasar el reloj explícito al proyector y conservar razones de incompletitud. Esta transferencia no elimina el entregable.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import { test } from 'vitest';
import { assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
test('otro usuario no lee revisiones del propietario', async () => {
  const env = await initializeTestEnvironment({projectId:'demo-finanzas'});
  try {
    const db = env.authenticatedContext('intruder').firestore();
    await assertFails(getDoc(doc(db,'users/owner-test/revisions/r1')));
  } finally { await env.cleanup(); }
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Habilitar persistentLocalCache y pestañas, descarga inicial completa por UID con indicador hydrated. Conservar comandos antes de enqueue en outbox separada por UID; resolver append al guardado local durable, no esperar ACK remoto estando offline. La confirmación remota limpia outbox; rechazo conserva comando y error. Suscripción maneja metadata hasPendingWrites y fromCache. Reglas por UID autenticado y correo verificado, sin allowlist única, create-only revisiones y validación de payloads. Probar schema real en rules, no confiar únicamente en Zod. Cambio de usuario coordina pestañas, cierra repositorios y limpia caché/proyecciones antes de mostrar otra cuenta; aplicar V31–V38.

Ancla técnica de implementación:
```ts
// Esquema conceptual de rules; completar las validaciones por kind.
function isOwner(uid) {
  return request.auth != null && request.auth.uid == uid
    && request.auth.token.email_verified == true;
}
// Revisiones: allow read/create solo bajo isOwner + schema válido;
// allow update, delete: if false;
```

- [ ] **4. Verificar.** npm run test:rules; npm run test -- tests/data/repository.test.ts. Ejecutar emuladores con rules cargadas de firebase.json. V18/V24/V25; crear/read autorizado, update/delete denegado y payload malicioso denegado.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T05.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Guardar offline dura tras reinicio, rechazo recuperable, caches separados al cambiar UID. No declarar rules seguras solo con un test de denegación.

### T06 — Acceso, configuración inicial y bloqueo

**Dependencias:** T05.
**Archivos a crear o modificar:** `apps/web/src/features/auth/AccessPage.tsx`, `apps/web/src/features/auth/RecoveryPage.tsx`, `apps/web/src/features/onboarding/OnboardingPage.tsx`, `apps/web/src/features/security/LockPage.tsx`, `apps/web/src/features/security/local-lock.ts`, `apps/web/src/features/auth/session.ts`, `tests/e2e/auth.spec.ts`, `tests/fixtures.ts`.
**Interfaces consumidas/producidas:** Cubre P01–P04 y parte F12. Produce test/expect de Playwright con propietario en tests/fixtures.ts y seedScenario(page, name): Promise<void>, implementado con emulador antes de navegar, nunca endpoint de producción.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import { test, expect } from '@playwright/test';
test('acceso ofrece ambos métodos sin mostrar datos financieros', async ({page}) => {
  await page.goto('/acceso');
  await expect(page.getByRole('button',{name:'Continuar con Google'})).toBeVisible();
  await expect(page.getByLabel('Correo')).toBeVisible();
  await expect(page.getByText('Disponible estimado',{exact:true})).toHaveCount(0);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Implementar registro/autenticación Google/correo para usuarios independientes, verificación y recuperación, perfil/onboarding idempotente por UID sin privilegios arbitrarios. Correo sin verificar no accede a finanzas ni IA. Configuración crea primera cuenta propia o permite omitir. PIN hash/salt por UID/dispositivo, timeout y reauth para recuperar; especificar que es privacidad local, no cifrado de Firestore. Bloqueo desmonta DOM financiero. Enlazar cuentas autenticando ambos métodos. Fixture de tests crea A y B válidos con Admin SDK solo en emulador, inicia sesión real de SDK y siembra revisiones dentro de cada namespace. Probar cambio de identidad, pendientes y pestañas.

Ancla técnica de implementación:
```ts
// Guard de rutas: el orden evita fugas de datos antes del desbloqueo.
if (!session.ready) return <LoadingAccess />;
if (!session.user) return <Navigate to="/acceso" replace />;
if (!session.emailVerified) return <VerifyEmail />;
if (lock.locked) return <LockPage />;
return <Outlet />;
```

- [ ] **4. Verificar.** npm run test:e2e -- tests/e2e/auth.spec.ts. Añadir PIN erróneo/espera, recuperación sin borrar outbox, Google cancelado, token vencido, enlaces expirados y onboarding reanudable.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T06.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** P01–P04 usables por usuarios independientes; sin verificación no hay acceso financiero; A y B ven solo datos propios. No aparecen saldos durante bloqueo ni cambio de cuenta. Biometría opcional solo tras G01.

### T07 — Sistema visual, navegación y componentes compartidos

**Dependencias:** T06.
**Archivos a crear o modificar:** `apps/web/src/app/router.tsx`, `apps/web/src/app/AppShell.tsx`, `apps/web/src/ui/tokens.css`, `apps/web/src/ui/MoneyText.tsx`, `apps/web/src/ui/TransactionRow.tsx`, `apps/web/src/ui/FormShell.tsx`, `apps/web/src/ui/StatusBadge.tsx`, `apps/web/src/ui/EmptyState.tsx`, `apps/web/src/ui/ConfirmDialog.tsx`, `apps/web/src/ui/ProgressValue.tsx`, `apps/web/src/ui/ResultCard.tsx`, `tests/e2e/navigation.spec.ts`.
**Interfaces consumidas/producidas:** Cubre navegación cinco destinos y estados reutilizables de P01–P24. Props públicas derivadas de contratos: MoneyText({value: Money}), StatusBadge({status: SyncStatus}), ProgressValue({current:number,target:number,label:string}).

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import { test, expect, seedScenario } from '../fixtures';
test('navegación principal conserva cinco destinos', async ({page}) => {
  await seedScenario(page,'empty');
  await page.goto('/inicio');
  const nav = page.getByRole('navigation',{name:'Principal'});
  for (const name of ['Inicio','Movimientos','Cuentas','Planificar','Asistente'])
    await expect(nav.getByRole('link',{name,exact:true})).toBeVisible();
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Aplicar tokens de especificación, CSS Modules, tipografía sistema y Lucide. Crear registro de 24 rutas, encabezado volver, bottom nav y sidebar desde1024. Construir componentes con labels, focus y tamaño táctil. FormShell full screen móvil, panel desktop, cierre con borrador, manejo de teclado/áreas seguras. Pantallas pendientes no se muestran como listas vacías de datos reales; usar solo rutas de desarrollo marcadas hasta implementar.

Ancla técnica de implementación:
```ts
export const primaryNavigation = [
  ['/inicio','Inicio'], ['/movimientos','Movimientos'], ['/cuentas','Cuentas'],
  ['/planificar','Planificar'], ['/asistente','Asistente']
] as const;
// Cada enlace usa aria-current="page" y conserva un nombre visible.
```

- [ ] **4. Verificar.** npm run test:e2e -- tests/e2e/navigation.spec.ts; npm run typecheck. Viewports320/390/1024, zoom200%, teclado, focus, reduce motion.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T07.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Un solo sistema de componentes; sin overflow horizontal, controles superpuestos ni cinco estilos diferentes.

### T08 — Cuentas y registro rápido de movimientos

**Dependencias:** T03–T07.
**Archivos a crear o modificar:** `apps/web/src/features/accounts/AccountsPage.tsx`, `apps/web/src/features/accounts/AccountPage.tsx`, `apps/web/src/features/accounts/AccountForm.tsx`, `apps/web/src/features/movements/MovementsPage.tsx`, `apps/web/src/features/movements/MovementPage.tsx`, `apps/web/src/features/movements/MovementForm.tsx`, `packages/domain/src/drafts.ts`, `tests/e2e/movements.spec.ts`.
**Interfaces consumidas/producidas:** P06–P09, F01/F02 (cash/bank), createDraft y confirmDraft. Entradas Money/Movement; persistir mediante RevisionRepository.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import { test, expect, seedScenario } from '../fixtures';
test('gasto rápido aparece una vez en historial', async ({page}) => {
  await seedScenario(page,'baseline');
  await page.goto('/movimientos');
  await page.getByRole('button',{name:'Registrar',exact:true}).click();
  await page.getByLabel('Importe',{exact:true}).fill('250');
  await page.getByLabel('Cuenta',{exact:true}).selectOption('cash-nio');
  await page.getByLabel('Categoría',{exact:true}).selectOption('food');
  await page.getByRole('button',{name:'Guardar gasto',exact:true}).click();
  await expect(page.getByTestId('movement-list').getByText('C$250.00',{exact:true})).toHaveCount(1);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Crear cuentas/initial balance, gasto/ingreso/transferencia/reembolso/ajuste y favoritos básicos. Todas las acciones construyen apuntes con dominio. Registro rápido prioriza importe, cuenta, categoría y fecha; nota opcional. Búsqueda/filtros conservan posición. Detalle permite editar con nueva revisión, duplicar borrador y anular explícitamente. Cambios moneda transferencia capturan ambos importes. No borrar cuentas históricas; archivar.

Ancla técnica de implementación:
```ts
const movement = confirmDraft(draft, displayedVersion);
await repository.append({
  schemaVersion:1, id: revisionId, aggregateId:movement.id, kind:'movement',
  parentIds:[], payload:movement, deviceId, createdAtClient:nowIso
});
// revisionId estable para reintentos y movement.id estable por borrador.
```

- [ ] **4. Verificar.** npm run test:e2e -- tests/e2e/movements.spec.ts. Adaptar aserción de formato al formateador es-NI establecido (documentar uno); V05/V19/V25 y transferencia ambas monedas.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T08.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Registro sin IA, estados durable/synced separados, doble click no duplica. F01 no mezcla ingresos negocio con ventas.

### T09 — Tarjetas, ciclos y compras a cuotas

**Dependencias:** T08.
**Archivos a crear o modificar:** `packages/domain/src/cards.ts`, `apps/web/src/features/cards/CardPage.tsx`, `apps/web/src/features/cards/CardPaymentForm.tsx`, `apps/web/src/features/cards/InstallmentForm.tsx`, `tests/domain/cards.test.ts`, `tests/e2e/cards.spec.ts`.
**Interfaces consumidas/producidas:** P10, F02 tarjeta, F03/F04. Produce cycleFor y splitInstallments; proyecciones de corte y asignación de pagos documentadas en packages/domain/src/cards.ts.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {splitInstallments,cycleFor} from '@fin/domain';
test('cuotas preservan importe y corte respeta año bisiesto',()=>{
  expect(splitInstallments({currency:'NIO',minor:10000},3,'2028-01-31')
    .map(x=>x.amount.minor)).toEqual([3334,3333,3333]);
  expect(cycleFor('2028-02-20',{closingDay:31,dueDay:5}))
    .toMatchObject({close:'2028-02-29',due:'2028-03-05'});
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Aplicar límites compartidos/separados, dos monedas, cortes y vencimientos de especificación. Compras a cuotas reconocen gasto/deuda una vez, cuotas solo exigibilidad. Pagos asignan vencimiento antiguo primero y permiten saldo a favor. Reembolso en fecha actual con vínculo; no alterar cuotas pagadas. Explicar presupuesto total al confirmar compra financiada. Campos desconocidos de pago mínimo/interés no muestran cero inventado.

Ancla técnica de implementación:
```ts
const base = Math.floor(total.minor / count);
const residue = total.minor % count;
const amounts = Array.from({length:count},(_,i) => base + (i < residue ? 1 : 0));
// Fechas mensuales ajustan al último día conservando día original.
```

- [ ] **4. Verificar.** npm run test -- tests/domain/cards.test.ts; npm run test:e2e -- tests/e2e/cards.spec.ts. V06–V08, pago parcial, sobrepago, reembolso y tarjeta USD desde cuenta NIO.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T09.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Deuda, gasto y exigibilidad son conceptos separados y explicables; ningún pago vuelve a generar gasto.

### T10 — Presupuestos mensuales

**Dependencias:** T08.
**Archivos a crear o modificar:** `packages/domain/src/budgets.ts`, `apps/web/src/features/budgets/BudgetsPage.tsx`, `apps/web/src/features/budgets/BudgetForm.tsx`, `tests/domain/budgets.test.ts`, `tests/e2e/budgets.spec.ts`.
**Interfaces consumidas/producidas:** P12/F05, budgetMonth del contrato. Consume flows y FX congelado, no saldos bancarios.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {budgetMonth} from '@fin/domain';
test('no arrastra sobreconsumo como deuda del presupuesto',()=>{
  const rule={id:'b',categoryId:'food',currency:'NIO' as const,limitMinor:10000,
    startsMonth:'2026-10',carryPositive:true};
  expect(budgetMonth(rule,'2026-10',[],2000).remainingMinor).toBe(12000);
  expect(budgetMonth(rule,'2026-10',[],-2000).remainingMinor).toBe(10000);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Reglas versionadas por mes y categoría, moneda propia, arrastre de sobrante positivo y reinicio. Devoluciones reducen gasto en fecha real, compra a cuotas consume total. Categoría abre movimientos filtrados. Tasa faltante marca incomplete; no mezclar monedas sin tasa. Cambiar límite no reescribe meses anteriores.

Ancla técnica de implementación:
```ts
const carryMinor = rule.carryPositive ? Math.max(0, previousRemainingMinor) : 0;
const remainingMinor = rule.limitMinor + carryMinor - spentMinor;
// remainingMinor puede ser negativo y no impide registrar un gasto.
```

- [ ] **4. Verificar.** npm run test -- tests/domain/budgets.test.ts; npm run test:e2e -- tests/e2e/budgets.spec.ts. V09/V21, gastos multimoneda, arrastre varios meses, devolución.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T10.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Arrastre consistente y presupuesto no funciona como segunda reserva de efectivo.

### T11 — Metas, disponible estimado e Inicio

**Dependencias:** T09, T10.
**Archivos a crear o modificar:** `packages/domain/src/available.ts`, `packages/domain/src/goals.ts`, `apps/web/src/features/goals/GoalsPage.tsx`, `apps/web/src/features/goals/GoalPage.tsx`, `apps/web/src/features/goals/GoalForm.tsx`, `apps/web/src/features/home/HomePage.tsx`, `apps/web/src/features/planning/PlanningPage.tsx`, `apps/web/src/features/home/AvailableBreakdown.tsx`, `tests/domain/available.test.ts`, `tests/e2e/home.spec.ts`.
**Interfaces consumidas/producidas:** P05/P11/P13/P14, F06/F11. Produce available(snapshot,through) y validación de asignaciones por cuenta.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {available} from '@fin/domain';
import {fixtureSnapshot} from '@fin/testkit';
test('disponible descuenta compromisos y metas sin contar USD como NIO',()=>{
 const s=fixtureSnapshot('baseline');
 expect(available(s,'2026-10-31').find(x=>x.currency==='NIO')?.availableMinor).toBe(500000);
 expect(available(s,'2026-10-31').find(x=>x.currency==='USD')?.availableMinor).toBe(10000);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Calcular liquidez con cash/bank y reservas únicas por compromiso/meta. Planificar ordena accesos a módulos. Metas virtuales no generan gasto; gasto posterior puede generar déficit. Mostrar desglose de disponible, horizonte, source y flags; ingresos esperados/crédito/inversiones excluidos. Inicio respeta límites tres pagos/tres presupuestos/cinco movimientos del inventario.

Ancla técnica de implementación:
```ts
const protectedMinor = allocations.reduce((sum,a)=>sum+a.amount.minor,0);
// Asignar cobertura de una meta a compromisos por fecha/id estable,
// consumiendo capacidad una sola vez; no cubrir dos obligaciones con los mismos fondos.
const availableMinor = liquidMinor - protectedMinor - extraCommitmentMinor;
```

- [ ] **4. Verificar.** npm run test -- tests/domain/available.test.ts; npm run test:e2e -- tests/e2e/home.spec.ts. V10/V11/V30; dos compromisos vinculados a misma meta, déficit y conflicto incompleto.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T11.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** F11 justifica cada centavo; no doble descuento, saldo desconocido no aparece como disponible cero.

### T12 — Préstamos y abonos

**Dependencias:** T08, T11.
**Archivos a crear o modificar:** `packages/domain/src/loans.ts`, `apps/web/src/features/loans/LoansPage.tsx`, `apps/web/src/features/loans/LoanPage.tsx`, `apps/web/src/features/loans/LoanForm.tsx`, `tests/domain/loans.test.ts`, `tests/e2e/loans.spec.ts`.
**Interfaces consumidas/producidas:** P16/P17/F08; loanOutstanding y movimientos principal/interés.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {loanOutstanding} from '@fin/domain';
test('principal se separa de intereses y no admite exceso',()=>{
 const loan={id:'l',direction:'payable' as const,principal:{currency:'NIO' as const,minor:100000}};
 expect(loanOutstanding(loan,25000).minor).toBe(75000);
 expect(()=>loanOutstanding(loan,100001)).toThrow();
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Implementar debo/me deben, alta existente/nuevo, principal/interés separados, cuenta y fecha de abono. Principal no genera ingreso/gasto, intereses sí. Rechazar sobreabono principal. Vencimientos alimentan compromisos sin duplicar recurrentes vinculados. Archivar conserva historial.

Ancla técnica de implementación:
```ts
if (principalRepaidMinor < 0 || principalRepaidMinor > loan.principal.minor)
 throw new DomainError('INVALID_INPUT','El abono supera el principal pendiente.');
return {currency:loan.principal.currency,minor:loan.principal.minor-principalRepaidMinor};
```

- [ ] **4. Verificar.** npm run test -- tests/domain/loans.test.ts; npm run test:e2e -- tests/e2e/loans.spec.ts. V13, deuda previa sin ingreso ficticio, cobro USD y anulación de abono.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T12.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Préstamos por cobrar no inflan disponible; interés y principal aparecen correctamente en reportes.

### T13 — Inversiones simples

**Dependencias:** T08, T11.
**Archivos a crear o modificar:** `packages/domain/src/investments.ts`, `apps/web/src/features/investments/InvestmentsPage.tsx`, `apps/web/src/features/investments/InvestmentForm.tsx`, `tests/domain/investments.test.ts`, `tests/e2e/investments.spec.ts`.
**Interfaces consumidas/producidas:** P18/F09; investmentGain con contrato fijo, valoración fechada y proyección patrimonial.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {investmentGain} from '@fin/domain';
test('ganancia incorpora aportes y distribuciones una sola vez',()=>{
 expect(investmentGain({initialMinor:10000,contributionsMinor:5000,
  withdrawalsMinor:2000,distributedYieldMinor:500,currentValueMinor:14000})).toBe(1500);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Lista con detalle expandido, aportes, retiros, rendimiento distribuido y valoración manual. No modelar acciones/precios de mercado ni rentabilidad anualizada. Valuaciones no crean efectivo. Explicar retirado como capital/rendimiento sin duplicarlo; valor inicial permite cargar inversiones existentes. Mostrar antigüedad de valoración.

Ancla técnica de implementación:
```ts
return input.currentValueMinor + input.withdrawalsMinor
 + input.distributedYieldMinor - input.contributionsMinor - input.initialMinor;
```

- [ ] **4. Verificar.** npm run test -- tests/domain/investments.test.ts; npm run test:e2e -- tests/e2e/investments.spec.ts. V14, sin valoración, pérdida, aporte/cobro en ambos sentidos.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T13.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Valoración y dinero recibido se distinguen, patrimonio no se suma a disponible líquido.

### T14 — Agenda, recurrencias y confirmación única

**Dependencias:** T09, T12.
**Archivos a crear o modificar:** `packages/domain/src/recurring.ts`, `apps/web/src/features/agenda/AgendaPage.tsx`, `apps/web/src/features/agenda/RecurringForm.tsx`, `tests/domain/recurring.test.ts`, `tests/e2e/agenda.spec.ts`.
**Interfaces consumidas/producidas:** P15/F07; expandRecurrence. Genera ocurrencias/compromisos con IDs deterministas para T19.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {expandRecurrence} from '@fin/domain';
test('fin de febrero no desplaza marzo al día 29',()=>{
 const r={id:'rent',start:'2028-01-31',frequency:'monthly' as const};
 const values=expandRecurrence(r,'2028-01-01','2028-03-31');
 expect(values.map(x=>x.date)).toEqual(['2028-01-31','2028-02-29','2028-03-31']);
 expect(expandRecurrence(r,'2028-01-01','2028-03-31')).toEqual(values);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Frecuencias diaria/semanal/mensual/anual, límites de intervalo y ajuste fin de mes. Omitir/posponer una ocurrencia no modifica otras; pausar regla no anula confirmadas. Confirmar abre F01/F03 y usa occurrenceId para deduplicar. No descontar saldo al vencer la fecha sin confirmación. No materializar recurrencias infinitas: generar horizonte hasta 90 días y extender al navegar.

Ancla técnica de implementación:
```ts
// El día ancla es start.day, no la fecha ajustada de la última ocurrencia.
const occurrenceId = `${rule.id}:${scheduledDate}:${ordinal}`;
// Normalizar como ID permitido (sin barras), estable en todos los dispositivos.
```

- [ ] **4. Verificar.** npm run test -- tests/domain/recurring.test.ts; npm run test:e2e -- tests/e2e/agenda.spec.ts. V15/V19/V20, leap day anual, omitir, pausar y confirmar importe modificado.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T14.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** No cargos automáticos ni duplicados de ocurrencia; agenda y compromisos comparten identidad.

### T15 — Reportes, categorías, favoritos y ajustes

**Dependencias:** T10–T14.
**Archivos a crear o modificar:** `packages/domain/src/reports.ts`, `apps/web/src/features/reports/ReportsPage.tsx`, `apps/web/src/features/settings/SettingsPage.tsx`, `apps/web/src/features/settings/CategoryForm.tsx`, `apps/web/src/features/settings/FavoriteForm.tsx`, `apps/web/src/features/reports/csv.ts`, `tests/e2e/reports.spec.ts`, `tests/domain/csv.test.ts`.
**Interfaces consumidas/producidas:** P19/P23, F10. Reportes consumen Snapshot/flows. Exporta buildCsv(rows: string[][]): string.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {buildCsv} from '../../apps/web/src/features/reports/csv';
test('notas no ejecutan fórmulas al abrir exportación',()=>{
 const csv=buildCsv([['nota','moneda'],['=HYPERLINK("x")','NIO']]);
 expect(csv).toContain("'=HYPERLINK");
 expect(csv).toContain('NIO');
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Implementar períodos, comparación, categorías, origen Mi negocio y patrimonio. Gráficos simples SVG con tabla equivalente accesible; no necesitar biblioteca grande. Ajustes perfil, cambios de moneda, aviso, enlaces herramientas. Categorías usadas se archivan, no rompen historia. Favoritos preparan F01, nunca guardan. CSV escapa comillas, saltos y fórmulas; separar columnas importe/moneda.

Ancla técnica de implementación:
```ts
function safeCell(value:string):string {
 const escaped = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
 return '"' + escaped.replaceAll('"','""') + '"';
}
// Para números financieros exportar valor numérico controlado, no notas sin sanear.
```

- [ ] **4. Verificar.** npm run test -- tests/domain/csv.test.ts; npm run test:e2e -- tests/e2e/reports.spec.ts. Transferencias excluidas, reembolsos, meses vacíos, USD sin tasa y fuente Mi negocio.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T15.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Totales coinciden con ledger, CSV seguro y usable, todos los enlaces secundarios accesibles.

### T16 — Simulador y explicación del disponible

**Dependencias:** T11, T15.
**Archivos a crear o modificar:** `packages/domain/src/simulation.ts`, `apps/web/src/features/simulator/SimulatorPage.tsx`, `tests/domain/simulation.test.ts`, `tests/e2e/simulator.spec.ts`.
**Interfaces consumidas/producidas:** P21, simulatePurchase y reutiliza F11/F01. No persistencia hasta confirmación.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {simulatePurchase} from '@fin/domain';
import {fixtureSnapshot} from '@fin/testkit';
test('simular no modifica dinero real',()=>{
 const s=fixtureSnapshot('baseline'),before=structuredClone(s);
 const r=simulatePurchase(s,{amount:{currency:'NIO',minor:150000},
  paymentAccountId:'cash-nio',date:'2026-10-15'},'2026-10-31');
 expect(r.after.find(x=>x.currency==='NIO')?.availableMinor).toBe(350000);
 expect(s).toEqual(before);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Capturar importe/moneda/cuenta/categoría, fecha y fin de mes; mostrar antes/después y faltantes. Rechazar crédito en primera simulación con explicación, no fingir soporte. Otra moneda pide débito/tasa de escenario. Registrar esta compra solo prepara borrador. Enlace a chat transmite intención, no historial completo.

Ancla técnica de implementación:
```ts
const hypothetical = structuredClone(snapshot);
// Agregar movimiento hipotético construido por ledger y calcular available();
// Nunca llamar repository.append desde simulatePurchase.
```

- [ ] **4. Verificar.** npm run test -- tests/domain/simulation.test.ts; npm run test:e2e -- tests/e2e/simulator.spec.ts. V12 y cuenta insuficiente, moneda distinta, reserva solapada.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T16.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Resultados explicables, negativos visibles, compra hipotética nunca aparece en historial.

### T17 — Respaldo, restauración y centro de sincronización

**Dependencias:** T05, T15.
**Archivos a crear o modificar:** `apps/web/src/features/sync/SyncPage.tsx`, `apps/web/src/features/sync/ConflictResolver.tsx`, `apps/web/src/features/backup/backup.ts`, `apps/web/src/features/backup/BackupForm.tsx`, `tests/data/backup.test.ts`, `tests/e2e/sync.spec.ts`.
**Interfaces consumidas/producidas:** P24/F12, encodeBackup, decodeBackup, mergeBackup del contrato. Consume heads y outbox.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {encodeBackup,decodeBackup,mergeBackup} from '../../apps/web/src/features/backup/backup';
test('respaldo cifrado no abre con otra contraseña',async()=>{
 const b={schemaVersion:1 as const,exportedAt:'2026-10-15T12:00:00Z',ownerUid:'owner-test',revisions:[]};
 const bytes=await encodeBackup(b,'frase larga de prueba');
 expect(await decodeBackup(bytes,'frase larga de prueba')).toEqual(b);
 await expect(decodeBackup(bytes,'incorrecta')).rejects.toThrow();
 expect(mergeBackup([],[])).toEqual({added:[],duplicates:[],collisions:[]});
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Exportar JSON con manifiesto/integridad y cifrado opcional AES-GCM/PBKDF2 con parámetros versionados, salt/nonce aleatorios; no PIN/token. Restaurar solo fusión idempotente, preview de conteos y colisiones; no escritura al elegir archivo. Resolver conflictos mostrando campos y parents; reintentos preservan ID. Archivo hasta 20 MiB inicialmente, rechazar más con mensaje; importación por lotes validada antes de aplicar.

Ancla técnica de implementación:
```ts
// Merge por ID y contenido canónico; comparar sin receivedAtServer.
if (!currentById.has(incoming.id)) added.push(incoming);
else if (sameCanonical(currentById.get(incoming.id),incoming)) duplicates.push(incoming.id);
else collisions.push(incoming.id);
```

- [ ] **4. Verificar.** npm run test -- tests/data/backup.test.ts; npm run test:e2e -- tests/e2e/sync.spec.ts. V16/V17/V23/V25, archivo alterado, versión futura, otro UID y conflicto de IDs.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T17.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Recuperación probada antes de datos reales, sin falsas promesas de respaldo por solo sincronizar.

### T18 — Tipo de cambio automático con respaldo manual

**Dependencias:** T03, T15, G01 fuente validada para integración real.
**Archivos a crear o modificar:** `workers/ai/src/fx.ts`, `workers/ai/src/bcn-adapter.ts`, `apps/web/src/features/fx/use-fx.ts`, `apps/web/src/features/fx/FxSettings.tsx`, `tests/workers/fx.test.ts`.
**Interfaces consumidas/producidas:** GET /v1/fx devuelve FxRate validado; última tasa queda en settings/referencia. export parseBcnResponse(input: unknown, fetchedAt: string): FxRate con formato real documentado en fixture.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {parseBcnResponse} from '../../workers/ai/src/bcn-adapter';
test('respuesta vacía no se convierte en tasa válida',()=>{
 expect(()=>parseBcnResponse(null,'2026-10-15T12:00:00Z')).toThrow();
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Consultar canal BCN validado, parsear estrictamente y registrar origen/fecha. Caché servidor con vencimiento diario; auth/límites y timeout5s. Si falla, responder error sin convertir a tasa1 ni borrar última válida. Modo manual conserva origen manual y permite volver a automático. No usar cambio nuevo para reescribir movimientos históricos.

Ancla técnica de implementación:
```ts
const candidate = FxRateSchema.parse(parsed);
if (!/^[0-9]+(\.[0-9]{1,8})?$/.test(candidate.nioPerUsd)
 || Number(candidate.nioPerUsd) <= 0) throw new Error('Tasa inválida');
// Guardar solo después de validación completa; mantener anterior ante error.
```

- [ ] **4. Verificar.** npm run test -- tests/workers/fx.test.ts. Añadir fixture real pública sanitizada con tasa/fecha esperadas, timeout, HTML de error, tasa negativa y V29.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T18.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Automatización demostrada o requisito marcado bloqueado con causa; resumen separado funciona aun sin fuente.

### T19 — Notificaciones y centro de avisos

**Dependencias:** T14, T18; G01 push y CPU para integración real.
**Archivos a crear o modificar:** `workers/reminders/src/index.ts`, `workers/reminders/src/delivery.ts`, `workers/reminders/src/fcm.ts`, `apps/web/src/features/notifications/NotificationsPage.tsx`, `apps/web/src/features/notifications/push.ts`, `apps/web/src/sw.ts`, `tests/workers/reminders.test.ts`, `tests/e2e/notifications.spec.ts`.
**Interfaces consumidas/producidas:** P22, dispositivos y recordatorios del contrato. export shouldSend(input:{paid:boolean;permission:boolean;dueAt:number;now:number;delivered:boolean}):boolean.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {shouldSend} from '../../workers/reminders/src/delivery';
test('un pago sincronizado impide nuevo aviso',()=>{
 expect(shouldSend({paid:true,permission:true,dueAt:1,now:2,delivered:false})).toBe(false);
 expect(shouldSend({paid:false,permission:true,dueAt:1,now:2,delivered:false})).toBe(true);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Cron15min, consulta indexada lote10, lease servidor, OAuth FCM, expiración y reintentos con backoff, token revocado se limpia. Cuenta servicio no se embebe. Programar avisos desde ocurrencias confirmadas como pendientes en servidor; pago sincronizado cancela. Consolidar Workbox+FCM en único service worker sin sobrescribir handlers. Solicitar permiso tras gesto y explicación; avisos internos disponibles sin push.

Ancla técnica de implementación:
```ts
export const shouldSend = (x:{paid:boolean;permission:boolean;dueAt:number;now:number;delivered:boolean}) =>
 !x.paid && x.permission && !x.delivered && x.dueAt <= x.now;
// Además lease y revalidación antes del envío; el predicado solo no evita carreras.
```

- [ ] **4. Verificar.** npm run test -- tests/workers/reminders.test.ts; npm run test:e2e -- tests/e2e/notifications.spec.ts. V26/V27, lease vencido, error FCM, retraso red, dos dispositivos, cero secretos en logs. Ensayo físico obligatorio.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T19.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Avisos con app cerrada demostrados en ambos sistemas; entrega no se anuncia exactamente una vez ni a hora garantizada.

### T20 — Proxy IA autenticado y herramientas controladas

**Dependencias:** T16, T18; G01 Groq/CPU para integración real.
**Archivos a crear o modificar:** `workers/ai/src/index.ts`, `workers/ai/src/auth.ts`, `workers/ai/src/chat.ts`, `workers/ai/src/groq.ts`, `workers/ai/src/quota.ts`, `packages/domain/src/assistant-tools.ts`, `packages/contracts/src/chat.ts`, `tests/workers/ai.test.ts`, `tests/domain/assistant-tools.test.ts`.
**Interfaces consumidas/producidas:** POST /v1/chat SSE y runTool según contratos. Export assertOwnNamespace(session:VerifiedSession, namespaceUid:string):void. API key solo Worker. UID y límites derivan de sesión verificada, no de body ni de un propietario fijo.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {assertOwnNamespace} from '../../workers/ai/src/auth';
test('dos usuarios válidos acceden solo a su namespace',()=>{
 expect(()=>assertOwnNamespace({uid:'user-a',emailVerified:true},'user-b')).toThrow('UNAUTHORIZED');
 expect(()=>assertOwnNamespace({uid:'user-a',emailVerified:true},'user-a')).not.toThrow();
 expect(()=>assertOwnNamespace({uid:'user-b',emailVerified:true},'user-b')).not.toThrow();
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Verificar firma JWT Firebase, iss/aud/exp y UID; caché JWKS con rotación. Cuerpo32KiB, cuotas servidor por día/turno, roles impuestos y herramientas cerradas. Groq ZDR, modelo fijado en configuración tras evaluación. No reenviar notas completas, nombres de terceros ni system prompt del cliente. Cliente ejecuta herramientas validadas sobre snapshot; servidor no otorga privilegios por datos del cliente. Limitar rondas3 llamadas,2 rondas; cancelación/timeouts. No guardar prompts.

Ancla técnica de implementación:
```ts
export function assertOwnNamespace(session:VerifiedSession,namespaceUid:string):void {
 if (!session.uid || !session.emailVerified || session.uid !== namespaceUid) throw new Error('UNAUTHORIZED');
}
// Llamar solo después de validar criptográficamente el token, nunca sobre payload decodificado sin verificación.
```

- [ ] **4. Verificar.** npm run test -- tests/workers/ai.test.ts tests/domain/assistant-tools.test.ts. Firma inválida, token expirado/aud distinta, prompt injection en nota, tool arbitraria, V18/V22/V28 y cuerpo excesivo.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T20.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** No acceso directo del modelo a Firestore ni secrets en navegador; cuota efectiva incluso con llamadas concurrentes.

### T21 — Chat con personalidad y confirmación de movimientos

**Dependencias:** T20, T08.
**Archivos a crear o modificar:** `apps/web/src/features/assistant/AssistantPage.tsx`, `apps/web/src/features/assistant/chat-client.ts`, `apps/web/src/features/assistant/ToolCard.tsx`, `apps/web/src/features/assistant/DraftCard.tsx`, `workers/ai/src/personality.ts`, `tests/e2e/assistant.spec.ts`, `tests/ai/evaluation.test.ts`.
**Interfaces consumidas/producidas:** P20, consume SSE/ToolCall/ToolResult, reutiliza F01/F11/P21. No duplicar lógica de movimientos.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect,seedScenario} from '../fixtures';
test('sin conexión el chat ofrece registro local',async({page,context})=>{
 await seedScenario(page,'baseline');
 await page.goto('/asistente');
 await context.setOffline(true);
 await expect(page.getByText('El asistente necesita internet',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Registrar sin asistente'})).toBeEnabled();
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Interfaz texto con acciones sugeridas, enviar/detener, streaming y tarjetas canónicas. Personalidad voseo calma humor moderado; sin humor en deuda/atraso. Onboarding de privacidad antes de primer envío. Herramientas sobre snapshot incluyen pendientes/asOf. IA sugiere borrador, pide campos faltantes, confirmación muestra todos los campos y versión; nunca guarda sola. Sin red/cuota ofrece acciones locales. Nueva conversación limpia contexto; historial temporal no se persiste por defecto.

Ancla técnica de implementación:
```ts
const personality = [
 'Usá voseo, frases claras y tono tranquilo.',
 'Nunca inventés importes ni afirmés que guardaste una operación sin confirmación de la app.',
 'Usá humor muy ocasional; evitá bromas ante deudas o dificultades.',
 'Si faltan moneda, cuenta o fecha necesarias, pedí aclaración.'
].join('\n');
```

- [ ] **4. Verificar.** npm run test:e2e -- tests/e2e/assistant.spec.ts; npm run test -- tests/ai/evaluation.test.ts. Mock SSE determinista para UI; evaluación real aparte con datos ficticios:20 preguntas, monedas ambiguas, resumen, simulación, cuota y borrador.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T21.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Cifras tarjetas coinciden con motor, texto contradictorio usa fallback seguro; ninguna escritura por tool sin confirmación.

### T22 — PWA, disponibilidad offline y recuperación de fallos

**Dependencias:** T17, T19, T21.
**Archivos a crear o modificar:** `apps/web/public/manifest.webmanifest`, `apps/web/public/icons/icon-192.png`, `apps/web/public/icons/icon-512.png`, `apps/web/public/icons/maskable-512.png`, `apps/web/src/sw.ts`, `apps/web/src/features/pwa/UpdatePrompt.tsx`, `tests/e2e/offline.spec.ts`.
**Interfaces consumidas/producidas:** Integra persistencia local+shell caché+FCM; UI status durable/hydrated del contrato.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect,seedScenario} from '../fixtures';
test('sesión preparada abre cuentas sin conexión',async({page,context})=>{
 await seedScenario(page,'baseline');
 await page.goto('/cuentas');
 await expect(page.getByTestId('offline-ready')).toHaveText('Disponible sin conexión');
 await context.setOffline(true);
 await page.reload();
 await expect(page.getByRole('heading',{name:'Cuentas',exact:true})).toBeVisible();
 await expect(page.getByText('Sin conexión',{exact:true}).first()).toBeVisible();
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Manifest/icons reales, scope/start_url, precache build, fallback navegación autenticada sin cachear API. Actualización no interrumpe borrador ni outbox. Distinguir nueva instalación offline de sesión preparada. Manejar IndexedDB quota, private mode y almacenamiento eliminado con explicación de recuperación. Error de permiso persistente no simula éxito. Mantener un único sw ya creado en T19.

Ancla técnica de implementación:
```ts
// Estrategia: precache solo artefactos versionados del build.
// No añadir /v1/chat, respuestas OAuth ni datos de cuenta a runtime cache.
// Antes de activar actualización: formDirty === false && pendingWrites === 0.
```

- [ ] **4. Verificar.** npm run build; npm run test:e2e -- tests/e2e/offline.spec.ts contra build servido, no solo dev. V24/V25 y cerrar/reabrir navegador, update con borrador, pérdida storage, dos pestañas y reconexión.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T22.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Prueba física iOS/Android registrada; no prometer cache completa antes de hidratación ni persistencia si navegador la rechazó.

### T23 — Integración, revisión de seguridad y aceptación de frontend

**Dependencias:** T01–T22.
**Archivos a crear o modificar:** `tests/e2e/complete-journeys.spec.ts`, `tests/e2e/accessibility.spec.ts`, `tests/domain/invariants.test.ts`, `docs/ejecucion/cobertura.md`, `docs/ejecucion/aceptacion.md`.
**Interfaces consumidas/producidas:** Consume todos los contratos; no introducir funcionalidades nuevas.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from 'vitest';
import {fixtureSnapshot} from '@fin/testkit';
import {validateMovement} from '@fin/domain';
test('fixtures financieros mantienen balance por moneda',()=>{
 for (const name of ['baseline','card','loan','investment'] as const) {
  const s=fixtureSnapshot(name);
  for (const m of s.movements) expect(()=>validateMovement(m)).not.toThrow();
 }
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Cruzar P01–P24/F01–F12 y V01–V30 contra pruebas/evidencias. Revisión independiente de dominio+rules+proxy, después UI accesibilidad. Probar escenarios completos con dos sesiones/dispositivos y datos ficticios. Buscar secretos en bundle y logs, comprobar sin facturación. Revisar contraste, zoom200%, keyboard, safe area, cifras grandes, vacíos y errores. Corregir defectos en lote y repetir solo afectados más regresión crítica.

Ancla técnica de implementación:
```ts
// Invariantes de dominio para todos los fixtures:
for (const movement of snapshot.movements) validateMovement(movement);
// Verificar además que simular/clasificar/reportar no cambia snapshot,
// y que proyectar revisiones en distintos órdenes produce el mismo resultado.
```

- [ ] **4. Verificar.** npm run check; npm run test:rules; npm run test:e2e. Adjuntar resultados hardware reales y G01. Las snapshots visuales no reemplazan assertions funcionales.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T23.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Cero defectos de pérdida/duplicación/aislamiento. Cobertura de las24 pantallas y12 auxiliares; limitaciones reales visibles. Si G01 sigue abierto, no pasa aceptación completa.

### T24 — Entrega, publicación autorizada y manual operativo

**Dependencias:** T23 aprobado con evidencia.
**Archivos a crear o modificar:** `README.md`, `docs/operacion/despliegue.md`, `docs/operacion/recuperacion.md`, `docs/operacion/manual-usuario.md`, `docs/operacion/costos-y-limites.md`, `docs/ejecucion/entrega.md`.
**Interfaces consumidas/producidas:** Entrega build, configuración y procedimientos reproducibles. No crear tiendas ni cuentas comerciales.

- [ ] **1. Preparar contrato y prueba.** Leer reglas aplicables de especificación e inventario, confirmar dependencias y añadir el caso mínimo siguiente al archivo de test indicado, junto con los vectores exigidos.
```ts
import {test,expect} from '@playwright/test';
test('sitio entregado ofrece acceso sin exponer datos',async({page})=>{
 await page.goto('/acceso');
 await expect(page.getByRole('button',{name:'Continuar con Google'})).toBeVisible();
 await expect(page.getByText('Disponible estimado',{exact:true})).toHaveCount(0);
});
```

- [ ] **2. Verificar el fallo inicial.** Ejecutar el test de esta tarea antes de implementar. Confirmar que falla por la capacidad ausente, no por un entorno roto. Para tareas de infraestructura, demostrar la ausencia del comando/artefacto antes de crearlo y luego verificarlo.

- [ ] **3. Implementar el comportamiento completo.** Preparar staging/build final, reglas/índices, configuración origins/secrets, registro/verificación multiusuario y pasos de deploy. Revisar Firebase Spark y Workers/Groq gratuitos, ZDR, límites por UID y límite global. Preparar rollback de hosting y workers compatible con schema; nunca revertir ledger eliminando datos. Entregar instrucciones instalación iOS/Android, exportación/cifrado, restore, PIN y cuota IA. Desplegar únicamente cuando el usuario haya autorizado publicación; si no, dejar paquete listo y pedir esa autorización concreta al final. No subir cuentas/secretos al repo.

Ancla técnica de implementación:
```ts
// Orden documentado de entrega:
// 1) reglas e índices y aislamiento multiusuario verificados en entorno objetivo;
// 2) Workers con secretos configurados fuera del repositorio;
// 3) build PWA con endpoints del entorno;
// 4) smoke tests con cuenta propietaria;
// 5) registrar versión, URL y rollback.
// No ejecutar comandos de deploy antes de autorización aplicable.
```

- [ ] **4. Verificar.** npm ci; npm run check; npm run test:rules; npm run test:e2e sobre entorno de aceptación. Tras deploy autorizado, smoke reducido y verificar versión/headers/HTTPS.
- [ ] **5. Revisar y registrar.** Revisar contratos, errores y cobertura P/F/V; corregir defectos; completar `docs/ejecucion/T24.md` con comandos y resultados. Actualizar estado solo con evidencia y crear commit local focalizado si Git está disponible.

**Criterio de salida:** Entrega reproducible, URL solo si efectivamente desplegada, manuales y estado de cuotas. Sin afirmar que está publicada o completa con pasos pendientes.

## Matriz de cobertura del frontend

| Pantallas / auxiliares | Tarea propietaria |
|---|---|
| P01–P04, F12 bloqueo | T06 |
| Navegación y componentes transversales | T07 |
| P06–P09, F01, F02 efectivo/banco | T08 |
| P10, F02 tarjeta, F03, F04 | T09 |
| P12, F05 | T10 |
| P05, P11, P13, P14, F06, F11 | T11 |
| P16, P17, F08 | T12 |
| P18, F09 | T13 |
| P15, F07 | T14 |
| P19, P23, F10 | T15 |
| P21 | T16 |
| P24, F12 respaldo/restauración | T17 |
| P23 tipo de cambio | T18 |
| P22, P23 permisos/avisos | T19 |
| P20 | T21 |
| P23 instalación/actualizaciones y estados offline | T22 |
| Todos los estados y recorridos | T23 |

## Condiciones de parada y escalamiento

- Contradicción que afecte dinero: si es un defecto técnico frente a una regla ya definida, corregirlo autónomamente con pruebas. Si exige elegir una nueva regla financiera o cambiar el resultado esperado, consultar al usuario y continuar módulos independientes.
- Falta de credenciales/hardware: informar qué prueba no se ejecutó; preparar todo lo verificable localmente.
- Necesidad de pago, envío a otro proveedor, publicación o borrado de datos reales: preparar resultado revisable y solicitar decisión solo para esa acción si no está autorizada.
- No usar presupuesto de tokens restante como motivo para declarar una tarea completa. Guardar estado retomable y reportar lo pendiente.
- No pasar a T24 con pérdida de datos, duplicados, reglas abiertas o cifras inconsistentes.

## Entrega esperada

Código, lockfile, contratos vigentes, reglas/índices, configuración sin secretos, pruebas y evidencias, manual de uso y recuperación. Una aplicación con pantallas estáticas pero sin comportamiento real no satisface el plan. Una aplicación funcional en emuladores con pruebas de dispositivos/proveedores pendientes tampoco se declara validada para uso real.

## Instrucción inicial para el ejecutor

Leer este plan y los documentos 04, 05 y 06. Si el usuario autoriza empezar, comenzar T01 con GPT‑6.1 Sol y mantener estado por tarea. Seguir trabajando por dependencias, sin solicitar confirmación para cada cambio reversible ya autorizado. Investigar y adaptar conforme a la política de autonomía; documentar cambios materiales y mantener cobertura. Consultar decisiones de alcance, reglas financieras, costos, privacidad y acciones externas que requieran autorización. No reducir funciones ni calidad para terminar antes.

