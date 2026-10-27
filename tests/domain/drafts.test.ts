import { describe, expect, it } from 'vitest';
import { DomainError, DraftSchema, type Draft, type Movement, type Revision } from '@fin/contracts';
import { projectHeads } from '@fin/domain';
import { createDraft, confirmDraft } from '../../packages/domain/src/drafts';

const expense: Movement = {
  id: 'temporary', date: '2026-10-18', kind: 'expense',
  postings: [{ accountId: 'cash', amount: { currency: 'NIO', minor: -25000 } }, { accountId: 'sys-expense-NIO', amount: { currency: 'NIO', minor: 25000 } }],
  flows: [{ kind: 'expense', amount: { currency: 'NIO', minor: 25000 }, categoryId: 'food' }], note: 'Almuerzo',
};
function code(run: () => unknown, expected: DomainError['code']) {
  expect(run).toThrow(expect.objectContaining({ code: expected }));
}

describe('draft confirmation V19', () => {
  it('creates an unconfirmed validated independent draft with version 1', () => {
    const source = structuredClone(expense);
    const draft = createDraft(source, 'draft?#ñ');
    expect(DraftSchema.safeParse(draft).success).toBe(true);
    expect(draft).toEqual({ id: 'draft?#ñ', version: 1, movement: expense, missingFields: [], confirmed: false });
    source.postings[0]!.amount.minor = -1;
    expect(draft.movement.postings[0]!.amount.minor).toBe(-25000);
  });
  it('confirms with stable movement and draft IDs without changing the draft', () => {
    const draft = createDraft(expense, 'draft-one'); const before = structuredClone(draft);
    const first = confirmDraft(draft, 1); const second = confirmDraft(draft, 1);
    expect(first).toEqual({ ...expense, id: 'draft-one', draftId: 'draft-one' });
    expect(second).toEqual(first); expect(second).not.toBe(first); expect(draft).toEqual(before);
    first.postings[0]!.amount.minor = -1;
    expect(second.postings[0]!.amount.minor).toBe(-25000);
    expect(draft.movement.postings[0]!.amount.minor).toBe(-25000);
  });
  it('two confirmation revisions project as one effective movement', () => {
    const draft = createDraft(expense, 'stable');
    const revision = (id: string): Revision<Movement> => ({ schemaVersion: 1, id, aggregateId: 'stable', kind: 'movement', parentIds: [], payload: confirmDraft(draft, 1), deviceId: 'phone', createdAtClient: '2026-10-18T12:00:00Z' });
    expect(projectHeads([revision('first'), revision('retry')])).toMatchObject([{ state: 'resolved', value: { id: 'stable', draftId: 'stable' }, headIds: ['first', 'retry'] }]);
  });
  it('rejects stale displayed versions including a changed draft version', () => {
    const draft = createDraft(expense, 'draft');
    code(() => confirmDraft({ ...draft, version: 2 }, 1), 'STALE_DRAFT');
    code(() => confirmDraft(draft, 2), 'STALE_DRAFT');
  });
  it('rejects incomplete drafts rather than fabricating missing values', () => {
    const draft = createDraft(expense, 'draft');
    code(() => confirmDraft({ ...draft, missingFields: ['categoryId'] }, 1), 'INVALID_INPUT');
  });
  it.each(['', 'x'.repeat(129)])('rejects invalid draft ID %s', (id) => code(() => createDraft(expense, id), 'INVALID_INPUT'));
  it('rejects canonical ledger imbalance both on creation and confirmation', () => {
    const unbalanced = { ...expense, postings: [expense.postings[0]!, { accountId: 'sys-expense-NIO', amount: { currency: 'NIO' as const, minor: 24999 } }] };
    code(() => createDraft(unbalanced, 'draft'), 'UNBALANCED');
    code(() => confirmDraft({ ...createDraft(expense, 'draft'), movement: unbalanced }, 1), 'UNBALANCED');
  });
  it('revalidates financial semantics even when the structural schema permits the payload', () => {
    code(() => createDraft({ ...expense, flows: [] }, 'draft'), 'INVALID_INPUT');
    code(() => confirmDraft({ ...createDraft(expense, 'draft'), movement: { ...expense, flows: [] } }, 1), 'INVALID_INPUT');
  });
  it('validates after assigning the final identity to prevent a refund from linking itself', () => {
    const refund: Movement = { ...expense, kind: 'refund', linkedId: 'purchase', postings: expense.postings.map((posting) => ({ ...posting, amount: { ...posting.amount, minor: -posting.amount.minor } })), flows: [{ kind: 'expense', categoryId: 'food', amount: { currency: 'NIO', minor: -25000 } }] };
    code(() => confirmDraft(createDraft(refund, 'purchase'), 1), 'INVALID_INPUT');
  });
  it('a new draft replaces a source draft identity only at explicit confirmation', () => {
    const draft = createDraft({ ...expense, draftId: 'older' }, 'new');
    expect(draft.movement.draftId).toBe('older');
    expect(confirmDraft(draft, 1).draftId).toBe('new');
  });
  it.each([0, -1, 1.5, NaN, Infinity])('rejects malformed expected version %s', (version) => code(() => confirmDraft(createDraft(expense, 'draft'), version), 'INVALID_INPUT'));
  it('rejects forged confirmed, invalid schema and extra fields', () => {
    const draft = createDraft(expense, 'draft');
    for (const forged of [{ ...draft, confirmed: true }, { ...draft, version: 0 }, { ...draft, movement: { ...expense, amount: 10 } }, { ...draft, extra: true }]) {
      code(() => confirmDraft(forged as Draft, 1), 'INVALID_INPUT');
    }
  });
});
