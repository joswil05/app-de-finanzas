import { DomainError, RevisionEnvelopeSchema, financialRevisionContent, type Head, type Id, type Revision } from '@fin/contracts';

const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** Stable JSON content comparison: neither arrival order nor object insertion order is significant. */
function canonical(value: unknown, seen = new Set<object>()): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== 'object' || seen.has(value)) throw new DomainError('INVALID_INPUT', 'Contenido no serializable.');
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) throw new DomainError('INVALID_INPUT', 'Contenido no JSON.');
  seen.add(value);
  const result = Array.isArray(value)
    ? `[${value.map((item: unknown) => canonical(item, seen)).join(',')}]`
    : `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => compare(a, b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item, seen)}`).join(',')}}`;
  seen.delete(value);
  return result;
}

function occurrenceSignature<T>(revision: Revision<T>): string | undefined {
  // Only deterministic confirmations qualify. Ordinary equal edits remain separate evidence.
  if (revision.kind !== 'movement' || revision.parentIds.length !== 0 || !revision.payload || typeof revision.payload !== 'object') return undefined;
  const payload = revision.payload as Record<string, unknown>;
  if (typeof payload.occurrenceId !== 'string' && typeof payload.draftId !== 'string') return undefined;
  const financial = { ...payload };
  delete financial.note;
  for (const field of ['postings', 'flows']) {
    const items = financial[field];
    if (Array.isArray(items)) financial[field] = [...items].sort((a: unknown, b: unknown) => compare(canonical(a), canonical(b)));
  }
  return canonical(financial);
}

/**
 * Pure generic DAG projection. Payload semantics belong to projectionToSnapshot/repositories.
 * Every frontier ID survives, including equivalent deterministic occurrence creations.
 * Invalid or incomplete graphs are excluded conservatively; no clocks pick a financial winner.
 */
export function projectHeads<T>(revisions: Revision<T>[]): Head<T>[] {
  const groups = new Map<Id, Revision<T>[]>();
  const byId = new Map<Id, Revision<T>>();
  const invalid = new Set<Id>();
  for (const revision of revisions) {
    const group = groups.get(revision.aggregateId) ?? [];
    group.push(revision);
    groups.set(revision.aggregateId, group);
    try {
      if (!RevisionEnvelopeSchema.safeParse(revision).success || revision.parentIds.includes(revision.id) || new Set(revision.parentIds).size !== revision.parentIds.length) invalid.add(revision.aggregateId);
      canonical(revision.payload);
      const previous = byId.get(revision.id);
      if (previous && canonical(financialRevisionContent(previous)) !== canonical(financialRevisionContent(revision))) {
        invalid.add(previous.aggregateId);
        invalid.add(revision.aggregateId);
      } else if (!previous) byId.set(revision.id, revision);
    } catch { invalid.add(revision.aggregateId); }
  }
  return [...groups.keys()].sort(compare).map((aggregateId): Head<T> => {
    const events = [...new Map(groups.get(aggregateId)!.map((event) => [event.id, event])).values()].sort((a, b) => compare(a.id, b.id));
    const local = new Map(events.map((event) => [event.id, event]));
    const usedParents = new Set(events.flatMap((event) => Array.isArray(event.parentIds) ? event.parentIds : []));
    const heads = events.filter((event) => !usedParents.has(event.id));
    const headIds = heads.map((event) => event.id);
    const empty = (state: Head<T>['state']): Head<T> => ({ aggregateId, value: null, headIds, state });
    if (new Set(events.map((event) => event.kind)).size !== 1) invalid.add(aggregateId);
    if (invalid.has(aggregateId)) return empty('invalid');
    let missing = false;
    for (const event of events) for (const id of event.parentIds) {
      const parent = byId.get(id);
      if (!parent) missing = true;
      else if (parent.aggregateId !== aggregateId || parent.kind !== event.kind || invalid.has(parent.aggregateId)) invalid.add(aggregateId);
    }
    // Kahn ordering processes known parents first and detects cycles even beside missing parents.
    const remaining = new Map(events.map((event) => [event.id, event.parentIds.filter((id) => local.has(id)).length]));
    const children = new Map<Id, Id[]>();
    for (const event of events) for (const id of event.parentIds) if (local.has(id)) children.set(id, [...(children.get(id) ?? []), event.id]);
    const ready = events.filter((event) => remaining.get(event.id) === 0).map((event) => event.id).sort(compare);
    const ordered: Revision<T>[] = [];
    while (ready.length) {
      const id = ready.shift()!;
      ordered.push(local.get(id)!);
      for (const child of children.get(id) ?? []) {
        remaining.set(child, remaining.get(child)! - 1);
        if (remaining.get(child) === 0) { ready.push(child); ready.sort(compare); }
      }
    }
    if (ordered.length !== events.length || invalid.has(aggregateId)) return empty('invalid');
    if (missing) return empty('missingParents');
    if (heads.length === 1) return { aggregateId, state: 'resolved', headIds, value: structuredClone(heads[0]!.payload) };

    // Equivalent occurrence roots form one logical ancestor without deleting either revision.
    const rootClasses = new Map<string, Id>();
    const representative = new Map<Id, Id>();
    for (const event of ordered) {
      const signature = occurrenceSignature(event);
      if (signature !== undefined) {
        const first = rootClasses.get(signature) ?? event.id;
        rootClasses.set(signature, first);
        representative.set(event.id, first);
      } else representative.set(event.id, event.id);
    }
    const ancestors = new Map<Id, Set<Id>>();
    for (const event of ordered) {
      const set = new Set<Id>([representative.get(event.id)!]);
      for (const parent of event.parentIds) for (const ancestor of ancestors.get(parent)!) set.add(ancestor);
      ancestors.set(event.id, set);
    }
    // An unedited duplicate root is already represented by an edit of its equivalent root.
    // Keep physical headIds for an explicit future resolution, but do not invent a branch.
    const frontier = heads.filter((event) => !heads.some((other) => representative.get(other.id) !== representative.get(event.id) && ancestors.get(other.id)!.has(representative.get(event.id)!)));
    if (new Set(frontier.map((event) => representative.get(event.id))).size === 1) {
      return { aggregateId, state: 'resolved', headIds, value: structuredClone(frontier[0]!.payload) };
    }
    const common = [...ancestors.get(frontier[0]!.id)!].filter((id) => frontier.every((head) => ancestors.get(head.id)!.has(id)));
    const latest = common.filter((id) => !common.some((other) => other !== id && ancestors.get(other)!.has(id)));
    return { aggregateId, state: 'conflict', headIds, value: latest.length === 1 ? structuredClone(local.get(latest[0]!)!.payload) : null };
  });
}

/**
 * Builds a new immutable resolution from the complete current frontier (caller supplies heads).
 * The function cannot discover an unseen branch; a later branch reopens projectHeads conflict.
 */
export function resolveRevision<T>(heads: Revision<T>[], chosen: T | null, id: Id, deviceId: Id, nowIso: string): Revision<T> {
  const first = heads[0];
  if (!first || heads.length > 20 || new Set(heads.map((head) => head.id)).size !== heads.length || heads.some((head) => head.aggregateId !== first.aggregateId || head.kind !== first.kind || head.id === id || !RevisionEnvelopeSchema.safeParse(head).success) || heads.some((head) => head.parentIds.some((parent) => heads.some((other) => other.id === parent)))) {
    throw new DomainError('INVALID_INPUT', 'La resolución requiere todas las cabezas distintas del mismo agregado y un ID nuevo.');
  }
  canonical(chosen);
  const revision: Revision<T> = { schemaVersion: 1, id, aggregateId: first.aggregateId, kind: first.kind, parentIds: heads.map((head) => head.id).sort(compare), payload: structuredClone(chosen), deviceId, createdAtClient: nowIso };
  if (!RevisionEnvelopeSchema.safeParse(revision).success) throw new DomainError('INVALID_INPUT', 'Metadatos de resolución inválidos.');
  return revision;
}
