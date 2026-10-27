import { DomainError, DraftSchema, IdSchema, type Draft, type Id, type Movement } from '@fin/contracts';
import { validateMovement } from './ledger';

/** Accepts a complete movement built by the application; no persistence or inferred fields. */
export function createDraft(movement: Movement, id: Id): Draft {
  if (!IdSchema.safeParse(id).success) throw new DomainError('INVALID_INPUT', 'Identidad de borrador inválida.');
  return { id, version: 1, movement: validateMovement(movement), missingFields: [], confirmed: false };
}

/** Pure retry-safe confirmation. The caller owns the stable revision ID and explicit append. */
export function confirmDraft(draft: Draft, expectedVersion: number): Movement {
  const parsed = DraftSchema.safeParse(draft);
  if (!parsed.success || !Number.isSafeInteger(expectedVersion) || expectedVersion <= 0) throw new DomainError('INVALID_INPUT', 'Borrador o versión inválidos.');
  if (parsed.data.version !== expectedVersion) throw new DomainError('STALE_DRAFT', 'El borrador cambió. Revisá su versión actual antes de confirmar.');
  if (parsed.data.missingFields.length > 0) throw new DomainError('INVALID_INPUT', 'Completá los campos pendientes antes de confirmar.');
  return validateMovement({ ...parsed.data.movement, id: parsed.data.id, draftId: parsed.data.id });
}
