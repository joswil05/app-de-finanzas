# Contratos compartidos y vectores de prueba

Companion normativo de `05-especificacion-consolidada.md`. Las interfaces públicas siguientes se crean en T02; el código de este documento pertenece al plan, no es implementación existente. Añadir campos internos es válido; renombrar interfaces públicas requiere actualizar consumidores y este contrato en el mismo cambio.

Los contratos son revisables mediante la política de autonomía del plan maestro. Un agente puede proponer y, con coordinación de consumidores, implementar una alternativa técnica mejor sustentada sin pedir permiso al usuario si conserva el comportamiento acordado. Registrar el motivo y validar compatibilidad/migración; no mantener contratos incorrectos solo porque figuraban en la primera versión.

## Tipos de datos

```ts
export type Currency = 'NIO' | 'USD';
export type LocalDate = string; // validado YYYY-MM-DD, fecha real
export type Id = string;
export type VerifiedSession = { uid: Id; emailVerified: true };
export type UserProfile = { uid: Id; displayName?: string; setupComplete: boolean };
export type Money = { currency: Currency; minor: number };
export type FxRate = {
  nioPerUsd: string; effectiveDate: LocalDate;
  fetchedAt: string; source: 'BCN' | 'manual';
};
export type Posting = { accountId: Id; amount: Money };
export type Flow = {
  kind: 'income' | 'expense'; amount: Money;
  categoryId: Id; // minor negativo permitido solo en devolución
};
export type Movement = {
  id: Id; date: LocalDate;
  kind: 'income' | 'expense' | 'transfer' | 'opening' | 'adjustment'
    | 'cardPurchase' | 'cardPayment' | 'refund' | 'loanPrincipal'
    | 'interest' | 'investmentTransfer' | 'investmentYield';
  postings: Posting[]; flows: Flow[];
  note?: string; fx?: FxRate;
  linkedId?: Id; occurrenceId?: Id; draftId?: Id;
};
export type Account = {
  id: Id; name: string; kind: 'cash' | 'bank' | 'card'
    | 'loanReceivable' | 'loanPayable' | 'investment' | 'system';
  currency: Currency; archived: boolean;
};
export type AggregateKind = 'account' | 'movement' | 'budget'
  | 'goal' | 'allocation' | 'loan' | 'investment' | 'valuation'
  | 'recurring' | 'occurrenceOverride' | 'card' | 'installmentPlan'
  | 'category' | 'favorite' | 'settings';
export type Revision<T = unknown> = {
  schemaVersion: 1; id: Id; aggregateId: Id; kind: AggregateKind;
  parentIds: Id[]; payload: T | null; // null = anulado; archivar cuentas preserva payload
  deviceId: Id; createdAtClient: string;
  receivedAtServer?: string;
};
export type Head<T> = {
  aggregateId: Id; value: T | null; headIds: Id[];
  state: 'resolved' | 'conflict' | 'missingParents' | 'invalid';
};
export type BudgetRule = {
  id: Id; categoryId: Id; currency: Currency; limitMinor: number;
  startsMonth: string; carryPositive: boolean;
};
export type Goal = { id: Id; name: string; target: Money; dueDate?: LocalDate };
export type Allocation = { id: Id; goalId: Id; accountId: Id; amount: Money };
export type Commitment = {
  id: Id; dueDate: LocalDate; amount: Money;
  paidMinor: number; linkedGoalId?: Id;
  kind: 'cashExpense' | 'cardDue' | 'loanDue';
};
export type Snapshot = {
  accounts: Account[]; movements: Movement[];
  goals: Goal[]; allocations: Allocation[]; commitments: Commitment[];
  budgetRules: BudgetRule[]; rates: FxRate[];
  asOf: string; complete: boolean; pendingCount: number;
  conflictAggregateIds: Id[];
};
export type Available = {
  currency: Currency; liquidMinor: number;
  protectedGoalMinor: number; extraCommitmentMinor: number;
  availableMinor: number; through: LocalDate;
  complete: boolean; reasons: string[];
};
export type Purchase = {
  amount: Money; paymentAccountId: Id; date: LocalDate;
  categoryId?: Id; debitAmount?: Money; fx?: FxRate;
};
export type Simulation = {
  before: Available[]; after: Available[];
  purchase: Purchase; complete: boolean; reasons: string[];
};
export type Recurrence = {
  id: Id; start: LocalDate; end?: LocalDate;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
};
export type Occurrence = { id: Id; ruleId: Id; date: LocalDate; ordinal: number };
export type CardTerms = { closingDay: number; dueDay: number };
export type Cycle = { start: LocalDate; close: LocalDate; due: LocalDate };
export type Installment = { ordinal: number; dueDate: LocalDate; amount: Money };
export type Loan = { id: Id; direction: 'payable' | 'receivable'; principal: Money };
export type InvestmentSummaryInput = {
  initialMinor: number; contributionsMinor: number; withdrawalsMinor: number;
  distributedYieldMinor: number; currentValueMinor: number;
};
export type Draft = {
  id: Id; version: number; movement: Movement;
  missingFields: string[]; confirmed: false;
};
export type AppErrorCode = 'INVALID_INPUT' | 'UNBALANCED' | 'MISSING_RATE'
  | 'CONFLICT' | 'OFFLINE_UNAVAILABLE' | 'PERSISTENCE_UNAVAILABLE'
  | 'UNAUTHORIZED' | 'QUOTA' | 'PROVIDER_UNAVAILABLE' | 'STALE_DRAFT';
export class DomainError extends Error { constructor(public code: AppErrorCode, message: string) { super(message); } }
```

Cada tipo tiene esquema Zod público con nombre `<Tipo>Schema`, excepto genéricos (RevisionSchema con payload unknown + registro de esquema por kind). LocalDate valida calendario, no solo regex. IDs no admiten barras ni rutas. Rechazar claves extras en payloads externos. Esquemas de módulos amplían entidades específicas (Card, Loan metadata, Investment, Category) sin degradarlas a `any`; se documentan en el contrato del módulo al crearlas.

## API de dominio pública

```ts
export function parseMoney(text: string, currency: Currency): Money;
export function convertMoney(value: Money, target: Currency, rate: FxRate): Money;
export function validateMovement(value: Movement): Movement;
export function projectHeads<T>(revisions: Revision<T>[]): Head<T>[];
export function balance(accounts: Account[], movements: Movement[]): Record<Id, Money>;
export function available(snapshot: Snapshot, through: LocalDate): Available[];
export function simulatePurchase(snapshot: Snapshot, purchase: Purchase, through: LocalDate): Simulation;
export function cycleFor(date: LocalDate, terms: CardTerms): Cycle;
export function splitInstallments(total: Money, count: number, firstDue: LocalDate): Installment[];
export function budgetMonth(rule: BudgetRule, month: string, movements: Movement[], previousRemainingMinor: number): {
  limitMinor: number; carryMinor: number; spentMinor: number; remainingMinor: number; complete: boolean;
};
export function expandRecurrence(rule: Recurrence, from: LocalDate, to: LocalDate): Occurrence[];
export function loanOutstanding(loan: Loan, principalRepaidMinor: number): Money;
export function investmentGain(input: InvestmentSummaryInput): number;
export function createDraft(movement: Movement, id: Id): Draft;
export function confirmDraft(draft: Draft, expectedVersion: number): Movement;
```

`budgetMonth` utiliza fx congelado de cada movimiento cuando moneda difiere. `balance` incluye solo movimientos efectivos sin conflictos pendientes; caller usa proyección canónica. `available` devuelve NIO y USD incluso si su saldo es cero y reasons si hay datos incompletos. `simulatePurchase` jamás muta snapshot. `loanOutstanding` rechaza exceso, cantidades negativas y fraccionarias. `confirmDraft` exige missingFields vacío, expectedVersion coincidente y payload válido, y fija movement.id a draft.id para idempotencia.

## Persistencia y transporte

```ts
export type SaveReceipt = { revisionId: Id; state: 'local' | 'synced' };
export type SyncStatus = {
  mode: 'offline' | 'syncing' | 'synced' | 'error';
  pending: number; rejected: number; lastSyncedAt?: string;
  hydrated: boolean; durable: boolean;
};
export interface RevisionRepository {
  append(revision: Revision): Promise<SaveReceipt>;
  subscribe(listener: (revisions: Revision[], status: SyncStatus) => void): () => void;
  retry(revisionId: Id): Promise<void>;
  exportPending(): Promise<Revision[]>;
  close(): Promise<void>;
}
export type Backup = { schemaVersion: 1; exportedAt: string; ownerUid: string; revisions: Revision[] };
export function encodeBackup(backup: Backup, password?: string): Promise<Uint8Array>;
export function decodeBackup(bytes: Uint8Array, password?: string): Promise<Backup>;
export function mergeBackup(current: Revision[], incoming: Revision[]): {
  added: Revision[]; duplicates: Id[]; collisions: Id[];
};
```

El propietario de cada namespace se deriva de la sesión verificada y la ruta. Hay varios usuarios independientes; no se acepta UID arbitrario desde formularios. Firestore:

- `users/{uid}`: perfil propio, alta idempotente tras verificar correo, lectura/escritura solo del mismo UID; validar campos y prohibir roles/privilegios arbitrarios. No hay colección allowedUsers ni un UID constante de acceso.
- `users/{uid}/revisions/{revisionId}`: crear y leer solo UID de ruta con token y correo verificado; sin update/delete del cliente; tamaño de payload acotado y esquema validado por kind.
- `users/{uid}/devices/{deviceId}`: token push, consentimiento, updatedAt; token nunca público.
- `users/{uid}/reminders/{occurrenceId}`: campos cliente de programación validados; campos de entrega controlados por servidor. Separar `reminderDelivery/{id}` si evita permisos ambiguos.
- `users/{uid}/aiUsage/{day}`: solo servidor incrementa; cliente no resetea cuotas.
- `fxRates/{date}`: lectura por usuarios verificados; escritura solo servidor. Es dato público de referencia compartido, no configuración manual de otro usuario.
- `serviceUsage/ai/{day}`: contador global de IA, solo servidor; ningún cliente lee o resetea consumo ajeno.
- `serviceState/reminderScheduler`: cursor/estado global del planificador, solo servidor; no exponer datos de otros usuarios.

Índices: reminders state/dueAt; revisiones por receivedAtServer si se usa consulta incremental. Regla contra claves extras, parentIds máximo 20, idempotency IDs máximo 128 caracteres, notas máximo 2000 caracteres, payload máximo 64 KiB en cliente y límites de campos/listas en rules. Firestore límite de documento no sustituye validación de negocio.

Índice reminders state/dueAt se define con alcance COLLECTION_GROUP para planificación servidor. El cliente consulta solo su subcolección y no puede listar el grupo completo. Orden y cursor incluyen ruta de documento para distinguir ocurrencias con IDs iguales entre usuarios.

```ts
export function assertOwnNamespace(session: VerifiedSession, namespaceUid: Id): void;
export function createRevisionRepository(session: VerifiedSession): RevisionRepository;
```

`assertOwnNamespace` permite cualquier usuario verificado dentro de su propia ruta, rechaza otra ruta. Invocar después de verificar firma/emisor/audiencia/expiración del token. `createRevisionRepository` fija UID durante su vida; no admite append(uid,...) ni cambia de propietario por parámetros. close cancela suscripciones y evita ACK tardío de A sobre estado B. Outbox usa clave compuesta UID/revisionId; borradores, PIN y consentimiento incluyen UID. Usuario nuevo no hereda datos por coincidir IDs lógicos de fixtures.

Backup.ownerUid debe coincidir con sesión destino antes de preview/merge; otra cuenta recibe rechazo explícito sin escrituras. Migrar entre usuarios no pertenece a esta versión. Al probar mergeBackup se usa material de una sola cuenta; el control de identidad reside en el flujo anterior a la función pura.

Worker IA endpoints: POST `/v1/chat` (Firebase Bearer token, flujo SSE), GET `/v1/health` (sin secretos), GET `/v1/fx` (autenticado). CORS solo origen configurado; CORS no reemplaza autenticación. POST limita cuerpo 32 KiB. Errores JSON `{code, message, retryAfterSeconds?}` y status 400/401/403/413/429/502. SSE eventos `text`, `toolCalls`, `done`, `error`; abortar propaga cancelación al proveedor. La ruta fija herramientas e instrucciones, no acepta system prompt del cliente.

```ts
export type ToolCall =
  | { id: Id; name: 'summary'; args: { through: LocalDate } }
  | { id: Id; name: 'expenses'; args: { from: LocalDate; to: LocalDate; categoryId?: Id } }
  | { id: Id; name: 'commitments'; args: { through: LocalDate } }
  | { id: Id; name: 'simulatePurchase'; args: { purchase: Purchase; through: LocalDate } }
  | { id: Id; name: 'draftMovement'; args: { intent: MovementIntent } };
export type MovementIntent = {
  kind: 'income' | 'expense' | 'transfer';
  amount: Money; date: LocalDate; accountId: Id;
  categoryId?: Id; destinationAccountId?: Id;
  receivedAmount?: Money; note?: string;
};
export type ToolResult = { callId: Id; data: unknown; asOf: string; complete: boolean; pendingCount: number };
export function runTool(call: ToolCall, snapshot: Snapshot): ToolResult;
```

Cada data se valida según name y UI renderiza la tarjeta tipada; `unknown` es frontera validada, no permiso para mostrar cualquier objeto. Draft incompleto usa flujo de aclaración separado en adaptador IA antes de invocar draftMovement. La IA no construye apuntes técnicos: interpreta una intención de registro; adaptador de aplicación valida cuenta, moneda y categoría y construye Movement con funciones del dominio. El modelo no ejecuta directamente `append`.

`draftMovement` usa MovementIntent; `createDraft` recibe el Movement ya construido por el adaptador, no por el modelo. Categoría es obligatoria para ingreso/gasto; destino e importe recibido son obligatorios para transferencia entre monedas. Estas condiciones se validan como discriminated union aunque el tipo compacto anterior use campos opcionales. Llamadas incompletas se convierten en aclaraciones; no fabricar cuenta o moneda.

## Contratos complementarios de módulo

```ts
export type Card = {
  id: Id; name: string; accountIds: Id[]; terms: CardTerms;
  limit: { mode: 'shared'; amount: Money }
    | { mode: 'separate'; amounts: Money[] };
};
export type InstallmentPlan = {
  id: Id; movementId: Id; cardId: Id; installments: Installment[];
};
export type LoanDetails = Loan & {
  counterparty: string; accountId: Id; openedAt: LocalDate;
  dueDate?: LocalDate; initialMode: 'existing' | 'new'; archived: boolean;
};
export type Investment = {
  id: Id; name: string; currency: Currency; accountId: Id;
  initialValue: Money; initialDate: LocalDate; archived: boolean;
};
export type Valuation = { id: Id; investmentId: Id; date: LocalDate; value: Money };
export type Category = {
  id: Id; name: string; flowKind: 'income' | 'expense';
  icon?: string; color?: string; archived: boolean;
};
export type Favorite = { id: Id; name: string; template: Partial<MovementIntent> };
export type RecurringRule = Recurrence & {
  template: Partial<MovementIntent>; paused: boolean;
  reminderDaysBefore: number[];
};
export type OccurrenceOverride = {
  id: Id; occurrenceId: Id; action: 'skip' | 'postpone' | 'confirm';
  postponedTo?: LocalDate; movementId?: Id;
};
export type Reminder = {
  id: Id; occurrenceId: Id; uid: Id; dueAt: string;
  state: 'pending' | 'cancelled'; deviceIds: Id[];
};
export type ReminderDelivery = {
  id: Id; reminderId: Id; deviceId: Id;
  state: 'pending' | 'leased' | 'sent' | 'failed' | 'expired';
  attempts: number; leaseUntil?: string; sentAt?: string;
};
export type UserSettings = {
  summaryCurrency: Currency; timezone: string; locale: 'es-NI';
  fxMode: 'automatic' | 'manual'; manualRate?: FxRate;
  hidePushAmounts: boolean; notificationsEnabled: boolean;
  assistantConsent: boolean;
};
```

Contrapartidas técnicas por moneda usan IDs `sys-income-NIO`, `sys-expense-NIO`, `sys-equity-NIO`, `sys-adjustment-NIO`, `sys-fx-NIO` y equivalentes USD. Builders resuelven estos IDs internamente. Category de ingreso incluye `business` con etiqueta Mi negocio. No confundir categoryId del flujo con accountId del apunte.

El repositorio convierte receivedAtServer entre Timestamp Firestore e ISO string; al crear usa serverTimestamp y rules exige request.time. En exportación/idempotencia se excluye este metadato del contenido financiero canónico. La suscripción debe recibir metadatos sin reescribir el documento. parentIds máximo 20, postings máximo 8 y flows máximo 4; las reglas verifican cada posición admitida con condiciones explícitas, porque rules no admite bucles arbitrarios. Constructor valida referencias de cuenta y balance antes de persistir. Las pruebas incluyen payloads sintácticamente correctos pero financieramente inválidos; si rules no puede cubrir una regla relacional, el dominio la valida y la limitación se documenta, sin afirmar validación total de negocio en servidor.

Builders públicos:

```ts
export function buildMovement(intent: MovementIntent, accounts: Account[], id: Id): Movement;
export function projectionToSnapshot(revisions: Revision[], status: SyncStatus): Snapshot;
export function resolveRevision<T>(heads: Revision<T>[], chosen: T | null,
  id: Id, deviceId: Id, nowIso: string): Revision<T>;
```

Valuación patrimonial de una inversión sustituye su saldo contable de costo por la última valoración, nunca suma ambos. Cuenta por cobrar entra en patrimonio, no en liquidez. El saldo inicial de inversión se registra una vez; la fórmula de ganancia usa initialValue aparte de contributions. Datos sin valoración posterior muestran valor inicial etiquetado como tal.

Cuotas de tarjetas y pagos requieren asignaciones derivadas de ledger y plan, no edición de banderas paid desde UI. Todo listado de compromisos usa fecha, importe pendiente y enlace de procedencia estable; eliminar/editar origen recalcula la proyección en lugar de mantener copias huérfanas.

Respaldo cifrado envelope versión1: PBKDF2-SHA256 con 600000 iteraciones, salt16 bytes aleatorio, AES-GCM256 con nonce12 bytes nuevo por exportación, tag128 bits. Cabecera con algoritmo/versión se autentica como additionalData. Contraseña mínimo12 caracteres al cifrar; descifrado valida límites antes de derivar para evitar parámetros maliciosos. Para archivo no cifrado, checksum detecta corrupción, no autenticidad frente a un atacante; no presentarlo como firma.

## Vectores obligatorios

| ID | Entrada/caso | Resultado esperado |
|---|---|---|
| V01 | parseMoney('12,50','NIO') | minor 1250 |
| V02 | '1,234.56', '1e3', '0.001' | INVALID_INPUT |
| V03 | US$100 a 36.6243 | NIO 366243 centavos |
| V04 | Movimiento con +100 y -99 en misma moneda | UNBALANCED |
| V05 | Transferencia NIO 100 banco→efectivo | ambos saldos correctos, ingreso/gasto 0 |
| V06 | Compra tarjeta 100 y pago 40 | gasto 100, deuda 60, no gasto 140 |
| V07 | Cuotas de 100.00 en 3 | 33.34, 33.33, 33.33 |
| V08 | Corte día31 en febrero2028, pago día5 | corte 2028-02-29, vence 2028-03-05 |
| V09 | Presupuesto100, sobrante20, gasto30, acumula | restante90; con sobrante-20 restante70 |
| V10 | Liquidez12000, meta2000, obligación5000 independiente | disponible5000 |
| V11 | Mismo caso, obligación3000 cubierta por meta2000 | disponible9000 (restar 2000+1000) |
| V12 | Simular gasto1500 sobre V10 | disponible3500, snapshot sin cambios |
| V13 | Préstamo1000, abono250, interés30 separado | principal750; gasto interés30 si deuda recibida |
| V14 | Inversión inicial100, aportes50, retiro20, rendimiento5, valor140 | ganancia15 |
| V15 | Recurrente mensual desde 2028-01-31 | ene31,feb29,mar31; IDs estables |
| V16 | Dos ramas distintas con mismo padre | conflicto, ancestro común efectivo |
| V17 | Resolución con ambos padres | una cabeza, valor elegido |
| V18 | Usuario B lee/escribe UID A | denegado por reglas y proxy |
| V19 | Doble click confirmar mismo borrador | un movimiento efectivo |
| V20 | Misma ocurrencia, importes distintos offline | conflicto visible, no sumar ambos |
| V21 | Falta tasa en gasto USD de presupuesto NIO | complete=false; no asumir 1:1 |
| V22 | Modelo pide herramienta no autorizada o modificar saldo | rechazar, sin escritura |
| V23 | Restore mismo archivo dos veces | cero duplicados efectivos |
| V24 | App offline tras descarga completa y cierre | abrir, consultar y registrar durablemente |
| V25 | Servidor rechaza comando tras reconectar | error visible y borrador recuperable |
| V26 | Recordatorio pagado sincronizado antes envío | no enviar |
| V27 | Permiso push denegado o token revocado | centro de avisos operativo, token limpiado si revocado |
| V28 | IA agota cuota | sin cobro/cambio proveedor; registro y simulador disponibles |
| V29 | Tasa inválida del proveedor | conservar última válida y señalar antigüedad |
| V30 | Meta reservada mayor que efectivo tras gasto | déficit visible, no desaparecer reserva |
| V31 | A y B verificados registran gasto con el mismo ID lógico | cada uno ve solo su gasto; ambas operaciones válidas |
| V32 | A pide ruta, cuota, respaldo o dispositivo de B | denegado, sin lectura/escritura ni envío push cruzado |
| V33 | Cerrar A, entrar B en mismo navegador y volver atrás | sin saldos/chat/borradores/PIN de A; B hidrata su propio historial |
| V34 | Cuenta nueva con email sin verificar | pantalla verificación; sin datos financieros ni IA hasta verificar |
| V35 | A agota límite individual de IA, B conserva margen y hay cuota global | A recibe límite, B puede continuar |
| V36 | Se agota cuota global del proveedor con varios usuarios | degradación explícita, sin cobro; funciones locales de ambos operativas |
| V37 | Recordatorios de A y B con occurrenceId idéntico | UID+ruta+deviceId separan entregas; scheduler procesa ambos |
| V38 | A tiene cambios offline al intentar entrar B | resolver/salvar pendientes antes del cambio, nunca enviarlos bajo B |

V11 es caso independiente de V10: obligación total cambia a 3000 y se vincula a la meta. Todos los importes del cuadro legibles como unidades se convierten a centavos en tests. Tests de fecha usan reloj fijo y zona indicada, nunca fecha del equipo.

## Evidencia por tarea

`docs/ejecucion/Txx.md`: objetivo, archivos, requisitos/P/F/V cubiertos, comandos, exit codes, resultado, limitaciones y siguiente dependencia. No pegar secretos. `docs/ejecucion/estado.md`: tarea, estado (NO INICIADA/EN CURSO/HECHA/BLOQUEADA), commit si existe, enlace a evidencia. Solo HECHA con evidencia. Las pruebas sugeridas en el plan son un mínimo, no reemplazan los vectores aplicables.
