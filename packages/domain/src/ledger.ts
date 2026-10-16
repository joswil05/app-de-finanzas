import { AccountSchema, DomainError, MovementSchema, type Account, type Currency, type Id, type Money, type Movement } from '@fin/contracts';
import { checkedMinor } from './money';

type CounterKind = 'income' | 'expense' | 'equity' | 'adjustment' | 'fx';
const systemPattern = /^sys-(income|expense|equity|adjustment|fx)-(NIO|USD)$/u;
export function systemAccountId(kind: CounterKind, currency: Currency): Id { return `sys-${kind}-${currency}`; }
function isSystem(id: Id): boolean { return systemPattern.test(id); }
function invalid(message: string): never { throw new DomainError('INVALID_INPUT', message); }

/** Financial validation beyond the external structural schema. No account registry is required. */
export function validateMovement(value: Movement): Movement {
  const parsed = MovementSchema.safeParse(value);
  if (!parsed.success) invalid('Movimiento inválido.');
  const movement = parsed.data;
  const totals = new Map<Currency, bigint>();
  const usedAccounts = new Set<Id>();
  for (const p of movement.postings) {
    if (p.amount.minor === 0 || usedAccounts.has(p.accountId)) invalid('Apunte cero o cuenta repetida en el movimiento.');
    usedAccounts.add(p.accountId);
    const system = systemPattern.exec(p.accountId);
    if (p.accountId.startsWith('sys-') && (!system || system[2] !== p.amount.currency)) invalid('Contrapartida técnica inválida.');
    totals.set(p.amount.currency, (totals.get(p.amount.currency) ?? 0n) + BigInt(p.amount.minor));
  }
  if ([...totals.values()].some((total) => total !== 0n)) throw new DomainError('UNBALANCED', 'Los apuntes no están balanceados por moneda.');
  const ordinary = movement.postings.filter((p) => !isSystem(p.accountId));
  const technical = movement.postings.filter((p) => isSystem(p.accountId));
  if (['income', 'expense', 'cardPurchase', 'refund', 'interest', 'investmentYield'].includes(movement.kind)) {
    if (movement.flows.length !== 1 || ordinary.length !== 1) invalid('El movimiento debe tener un flujo y una cuenta financiera.');
    const flow = movement.flows[0]!;
    const expectedKind = movement.kind === 'income' || movement.kind === 'investmentYield' ? 'income' : movement.kind === 'interest' ? flow.kind : 'expense';
    if (flow.kind !== expectedKind || flow.amount.minor === 0 || (movement.kind === 'refund' ? flow.amount.minor >= 0 : flow.amount.minor <= 0)) invalid('Tipo o signo del flujo inválido.');
    if (movement.kind === 'refund' && (!movement.linkedId || movement.linkedId === movement.id)) invalid('La devolución debe vincularse con su compra.');
    const financial = ordinary[0]!;
    if (movement.kind === 'expense' && financial.amount.currency !== flow.amount.currency) {
      if (!movement.fx) throw new DomainError('MISSING_RATE', 'El gasto convertido requiere una tasa histórica.');
      if (financial.amount.minor >= 0 || technical.length !== 3 || !technical.some((p) => p.accountId === systemAccountId('fx', financial.amount.currency) && p.amount.minor === -financial.amount.minor) || !technical.some((p) => p.accountId === systemAccountId('fx', flow.amount.currency) && p.amount.minor === -flow.amount.minor) || !technical.some((p) => p.accountId === systemAccountId('expense', flow.amount.currency) && p.amount.minor === flow.amount.minor)) invalid('Los puentes y contrapartida del gasto convertido no corresponden a sus importes.');
    } else {
      const counter = technical[0];
      if (technical.length !== 1 || financial.amount.currency !== flow.amount.currency || counter?.accountId !== systemAccountId(flow.kind, flow.amount.currency) || counter.amount.minor !== (flow.kind === 'expense' ? flow.amount.minor : -flow.amount.minor)) invalid('El flujo no corresponde a los apuntes.');
    }
  } else {
    if (movement.flows.length !== 0) invalid('Este movimiento no genera ingreso ni gasto.');
    if (movement.kind === 'opening' || movement.kind === 'adjustment') {
      if (ordinary.length !== 1 || technical.length !== 1 || technical[0]!.accountId !== systemAccountId(movement.kind === 'opening' ? 'equity' : 'adjustment', ordinary[0]!.amount.currency)) invalid('Contrapartida de apertura o ajuste inválida.');
    } else {
      if (ordinary.length !== 2 || ordinary.filter((p) => p.amount.minor > 0).length !== 1) invalid('El traslado necesita origen y destino distintos.');
      const currencies = new Set(ordinary.map((p) => p.amount.currency));
      if (currencies.size === 1) {
        if (technical.length !== 0) invalid('El traslado de una moneda no necesita puente.');
      } else if (technical.length !== 2 || ordinary.some((p) => !technical.some((t) => t.accountId === systemAccountId('fx', p.amount.currency) && t.amount.minor === -p.amount.minor))) invalid('La conversión necesita ambos puentes de moneda.');
    }
  }
  return movement;
}

export function accountRegistry(accounts: Account[]): Map<Id, Account> {
  const registry = new Map<Id, Account>();
  for (const value of accounts) {
    const parsed = AccountSchema.safeParse(value);
    if (!parsed.success || registry.has(value.id)) invalid('Cuenta inválida o ID repetido.');
    const account = parsed.data;
    const system = systemPattern.exec(account.id);
    if ((account.kind === 'system' && !system) || (account.id.startsWith('sys-') && (!system || account.kind !== 'system' || system[2] !== account.currency))) invalid('Cuenta técnica inválida.');
    registry.set(account.id, account);
  }
  return registry;
}

/** Includes standard counteraccounts, even when the caller omits their definitions. */
export function balance(accounts: Account[], movements: Movement[]): Record<Id, Money> {
  const registry = accountRegistry(accounts);
  const sums = new Map<Id, { currency: Currency; minor: bigint }>();
  for (const account of registry.values()) sums.set(account.id, { currency: account.currency, minor: 0n });
  const ids = new Set<Id>();
  for (const value of movements) {
    const movement = validateMovement(value);
    if (ids.has(movement.id)) invalid('Movimiento repetido.');
    ids.add(movement.id);
    for (const p of movement.postings) {
      const account = registry.get(p.accountId);
      if ((!account && !isSystem(p.accountId)) || (account && account.currency !== p.amount.currency)) invalid('Cuenta inexistente o moneda distinta.');
      const current = sums.get(p.accountId) ?? { currency: p.amount.currency, minor: 0n };
      current.minor += BigInt(p.amount.minor);
      sums.set(p.accountId, current);
    }
    validateAccountKinds(movement, registry);
  }
  // Entries are data properties, so even an allowed ID such as __proto__ is safe.
  return Object.fromEntries([...sums].map(([id, value]) => [id, { currency: value.currency, minor: checkedMinor(value.minor) }]));
}

function validateAccountKinds(movement: Movement, registry: Map<Id, Account>): void {
  const financial = movement.postings.filter((p) => !isSystem(p.accountId));
  const negative = financial.find((p) => p.amount.minor < 0);
  const positive = financial.find((p) => p.amount.minor > 0);
  const kind = (id: Id | undefined) => id ? registry.get(id)?.kind : undefined;
  const liquid = (accountKind: Account['kind'] | undefined) => accountKind === 'cash' || accountKind === 'bank';
  if (movement.kind === 'cardPurchase' && kind(negative?.accountId) !== 'card') invalid('La compra requiere una tarjeta.');
  if (movement.kind === 'cardPayment' && (!liquid(kind(negative?.accountId)) || kind(positive?.accountId) !== 'card')) invalid('El pago requiere liquidez y una tarjeta destino.');
  if (movement.kind === 'income' && !liquid(kind(positive?.accountId))) invalid('El ingreso requiere una cuenta líquida.');
  if (movement.kind === 'expense' && !liquid(kind(negative?.accountId))) invalid('El gasto requiere una cuenta líquida.');
  if (movement.kind === 'interest' && !liquid(kind(financial[0]?.accountId))) invalid('El interés cobrado o pagado requiere una cuenta líquida.');
  if (movement.kind === 'investmentYield' && !liquid(kind(positive?.accountId))) invalid('El rendimiento distribuido requiere una cuenta líquida.');
  if (movement.kind === 'refund' && !liquid(kind(positive?.accountId)) && kind(positive?.accountId) !== 'card') invalid('La devolución requiere una cuenta líquida o tarjeta.');
  if (movement.kind === 'transfer' && financial.some((p) => !liquid(kind(p.accountId)))) invalid('La transferencia requiere cuentas líquidas.');
  if (movement.kind === 'loanPrincipal' && !(financial.some((p) => ['loanPayable', 'loanReceivable'].includes(kind(p.accountId) ?? '')) && financial.some((p) => liquid(kind(p.accountId))))) invalid('El principal requiere préstamo y cuenta líquida.');
  if (movement.kind === 'investmentTransfer' && !(financial.some((p) => kind(p.accountId) === 'investment') && financial.some((p) => liquid(kind(p.accountId))))) invalid('El aporte o retiro requiere inversión y cuenta líquida.');
}
