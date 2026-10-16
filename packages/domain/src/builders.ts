import { DomainError, MovementIntentSchema, MoneySchema, PositiveMoneySchema, type Account, type FxRate, type Id, type LocalDate, type Money, type Movement, type MovementIntent, type Posting } from '@fin/contracts';
import { accountRegistry, balance, systemAccountId, validateMovement } from './ledger';

export type MovementDetails = { id: Id; date: LocalDate; accountId: Id; amount: Money; note?: string; linkedId?: Id; fx?: FxRate };
export type FlowMovementDetails = MovementDetails & { categoryId: Id };
export type TransferDetails = MovementDetails & { destinationAccountId: Id; receivedAmount?: Money };
export type RefundDetails = FlowMovementDetails & { linkedId: Id };
export type InterestDetails = FlowMovementDetails & { direction: 'income' | 'expense' };
/** FX is required at runtime; its optional input field permits explicit MISSING_RATE. */
export type ConvertedExpenseDetails = FlowMovementDetails & { debitAmount: Money };

function invalid(message: string): never { throw new DomainError('INVALID_INPUT', message); }
function requireAccount(id: Id, amount: Money, accounts: Account[]): Account {
  const account = accountRegistry(accounts).get(id);
  if (!account || account.kind === 'system' || account.archived || account.currency !== amount.currency) invalid('Cuenta inexistente, archivada o moneda incompatible.');
  return account;
}
function post(accountId: Id, amount: Money, sign: 1 | -1): Posting { return { accountId, amount: { currency: amount.currency, minor: amount.minor * sign } }; }
function metadata(details: MovementDetails) {
  return { id: details.id, date: details.date, ...(details.note !== undefined ? { note: details.note } : {}), ...(details.linkedId !== undefined ? { linkedId: details.linkedId } : {}), ...(details.fx !== undefined ? { fx: details.fx } : {}) };
}
function finish(movement: Movement, accounts: Account[]): Movement {
  const result = validateMovement(movement);
  balance(accounts, [result]);
  return result;
}
function requirePositive(amount: Money): void { if (!PositiveMoneySchema.safeParse(amount).success) invalid('El importe debe ser positivo y contener centavos enteros.'); }

export function buildMovement(intent: MovementIntent, accounts: Account[], id: Id): Movement {
  const parsed = MovementIntentSchema.safeParse(intent);
  if (!parsed.success) invalid('Intención incompleta o inválida.');
  const input = parsed.data;
  const details = { ...input, id };
  if (input.kind === 'transfer') return transfer(details as TransferDetails, 'transfer', accounts);
  return flow(details as FlowMovementDetails, input.kind, input.kind, accounts);
}

function flow(details: FlowMovementDetails, kind: Movement['kind'], direction: 'income' | 'expense', accounts: Account[]): Movement {
  requirePositive(details.amount);
  requireAccount(details.accountId, details.amount, accounts);
  const sign = direction === 'income' ? 1 : -1;
  return finish({ ...metadata(details), kind, postings: [post(details.accountId, details.amount, sign), post(systemAccountId(direction, details.amount.currency), details.amount, sign === 1 ? -1 : 1)], flows: [{ kind: direction, amount: { ...details.amount }, categoryId: details.categoryId }] }, accounts);
}

function transfer(details: TransferDetails, kind: 'transfer' | 'cardPayment' | 'loanPrincipal' | 'investmentTransfer', accounts: Account[]): Movement {
  requirePositive(details.amount);
  const source = requireAccount(details.accountId, details.amount, accounts);
  if (source.id === details.destinationAccountId) invalid('Origen y destino deben ser distintos.');
  const destination = accountRegistry(accounts).get(details.destinationAccountId);
  if (!destination) invalid('Falta la cuenta destino.');
  const received = details.receivedAmount ?? (destination.currency === details.amount.currency ? details.amount : undefined);
  if (!received) invalid('Indique el importe real recibido en la moneda destino.');
  requirePositive(received);
  requireAccount(destination.id, received, accounts);
  if (received.currency === details.amount.currency && received.minor !== details.amount.minor) invalid('Una transferencia en la misma moneda debe conservar su importe.');
  const postings = [post(source.id, details.amount, -1), post(destination.id, received, 1)];
  if (source.currency !== destination.currency) postings.push(post(systemAccountId('fx', source.currency), details.amount, 1), post(systemAccountId('fx', destination.currency), received, -1));
  return finish({ ...metadata(details), kind, postings, flows: [] }, accounts);
}

export function buildCardPurchase(details: FlowMovementDetails, accounts: Account[]): Movement { return flow(details, 'cardPurchase', 'expense', accounts); }
export function buildConvertedExpense(details: ConvertedExpenseDetails, accounts: Account[]): Movement {
  requirePositive(details.amount);
  requirePositive(details.debitAmount);
  if (!details.fx) throw new DomainError('MISSING_RATE', 'El gasto convertido requiere una tasa histórica.');
  if (details.amount.currency === details.debitAmount.currency) invalid('El gasto convertido requiere monedas distintas.');
  const account = requireAccount(details.accountId, details.debitAmount, accounts);
  if (account.kind !== 'cash' && account.kind !== 'bank') invalid('El gasto convertido requiere una cuenta líquida.');
  return finish({ ...metadata(details), kind: 'expense', postings: [post(account.id, details.debitAmount, -1), post(systemAccountId('fx', details.debitAmount.currency), details.debitAmount, 1), post(systemAccountId('fx', details.amount.currency), details.amount, -1), post(systemAccountId('expense', details.amount.currency), details.amount, 1)], flows: [{ kind: 'expense', amount: { ...details.amount }, categoryId: details.categoryId }] }, accounts);
}
export function buildCardPayment(details: TransferDetails, accounts: Account[]): Movement { return transfer(details, 'cardPayment', accounts); }
export function buildLoanPrincipal(details: TransferDetails, accounts: Account[]): Movement { return transfer(details, 'loanPrincipal', accounts); }
export function buildInvestmentTransfer(details: TransferDetails, accounts: Account[]): Movement { return transfer(details, 'investmentTransfer', accounts); }
export function buildInterest(details: InterestDetails, accounts: Account[]): Movement {
  if (details.direction !== 'income' && details.direction !== 'expense') invalid('Indique si el interés es ingreso o gasto.');
  return flow(details, 'interest', details.direction, accounts);
}
export function buildInvestmentYield(details: FlowMovementDetails, accounts: Account[]): Movement { return flow(details, 'investmentYield', 'income', accounts); }
export function buildRefund(details: RefundDetails, accounts: Account[]): Movement {
  requirePositive(details.amount);
  requireAccount(details.accountId, details.amount, accounts);
  return finish({ ...metadata(details), kind: 'refund', postings: [post(details.accountId, details.amount, 1), post(systemAccountId('expense', details.amount.currency), details.amount, -1)], flows: [{ kind: 'expense', amount: { currency: details.amount.currency, minor: -details.amount.minor }, categoryId: details.categoryId }] }, accounts);
}
function noFlow(details: MovementDetails, kind: 'opening' | 'adjustment', accounts: Account[]): Movement {
  if (!MoneySchema.safeParse(details.amount).success || details.amount.minor === 0) invalid('El importe debe contener centavos enteros y ser distinto de cero.');
  requireAccount(details.accountId, details.amount, accounts);
  return finish({ ...metadata(details), kind, postings: [post(details.accountId, details.amount, 1), post(systemAccountId(kind === 'opening' ? 'equity' : 'adjustment', details.amount.currency), details.amount, -1)], flows: [] }, accounts);
}
export function buildOpening(details: MovementDetails, accounts: Account[]): Movement { return noFlow(details, 'opening', accounts); }
export function buildAdjustment(details: MovementDetails, accounts: Account[]): Movement { return noFlow(details, 'adjustment', accounts); }
