type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type PinRecord = { version: 1; salt: string; hash: string; iterations: number; failures: number; until: number };
export const AUTO_LOCK_MS = 120_000;
export const PIN_ITERATIONS = 310_000;
const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
const bytes = (value: string) => new Uint8Array(value.match(/../gu)!.map((part) => parseInt(part, 16)));

/** Visual privacy only. This verifier does not encrypt Firestore or local financial records. */
export class LocalPinLock {
  private static readonly queues = new Map<string, Promise<void>>();
  readonly key: string;
  constructor(uid: string, deviceId: string, private readonly storage: StorageLike = localStorage, private readonly cryptoApi: Crypto = crypto, private readonly now: () => number = Date.now) {
    this.key = `finanzas-pin-v1:${encodeURIComponent(uid)}:${encodeURIComponent(deviceId)}`;
  }
  get configured(): boolean { return this.storage.getItem(this.key) !== null; }
  private read(): PinRecord {
    const value: unknown = JSON.parse(this.storage.getItem(this.key) ?? 'null');
    if (!value || typeof value !== 'object') throw new Error('El PIN local no está disponible. Recuperalo con tu cuenta.');
    const record = value as PinRecord;
    if (record.version !== 1 || !/^[a-f0-9]{32}$/u.test(record.salt) || !/^[a-f0-9]{64}$/u.test(record.hash) || record.iterations !== PIN_ITERATIONS || !Number.isInteger(record.failures) || record.failures < 0 || record.failures > 5 || !Number.isFinite(record.until) || record.until < 0) throw new Error('El PIN local está dañado. Recuperalo con tu cuenta.');
    return record;
  }
  get retryAfterMs(): number { return this.configured ? Math.max(0, this.read().until - this.now()) : 0; }
  private async derive(pin: string, salt: Uint8Array): Promise<string> {
    const key = await this.cryptoApi.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const buffer = await this.cryptoApi.subtle.deriveBits({ name: 'PBKDF2', salt: salt as Uint8Array<ArrayBuffer>, iterations: PIN_ITERATIONS, hash: 'SHA-256' }, key, 256);
    return hex(new Uint8Array(buffer));
  }
  async setPin(pin: string): Promise<void> {
    if (!/^[0-9]{6}$/u.test(pin)) throw new Error('Usá un PIN de 6 dígitos.');
    const salt = this.cryptoApi.getRandomValues(new Uint8Array(16));
    const record: PinRecord = { version: 1, salt: hex(salt), hash: await this.derive(pin, salt), iterations: PIN_ITERATIONS, failures: 0, until: 0 };
    this.storage.setItem(this.key, JSON.stringify(record));
  }
  async verify(pin: string): Promise<{ ok: boolean; retryAfterMs: number }> {
    const previous = LocalPinLock.queues.get(this.key) ?? Promise.resolve();
    const work = previous.then(() => typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(this.key, () => this.verifyOnce(pin)) : this.verifyOnce(pin));
    const tail = work.then(() => {}, () => {});
    LocalPinLock.queues.set(this.key, tail);
    void tail.then(() => { if (LocalPinLock.queues.get(this.key) === tail) LocalPinLock.queues.delete(this.key); });
    return work;
  }
  private async verifyOnce(pin: string): Promise<{ ok: boolean; retryAfterMs: number }> {
    const record = this.read();
    if (record.until > this.now()) return { ok: false, retryAfterMs: record.until - this.now() };
    if (record.until !== 0) { record.failures = 0; record.until = 0; }
    const actual = /^[0-9]{6}$/u.test(pin) ? await this.derive(pin, bytes(record.salt)) : '';
    let difference = actual.length ^ record.hash.length;
    for (let index = 0; index < record.hash.length; index++) difference |= (actual.charCodeAt(index) || 0) ^ record.hash.charCodeAt(index);
    const ok = difference === 0;
    record.failures = ok ? 0 : record.failures + 1;
    record.until = record.failures >= 5 ? this.now() + 30_000 : 0;
    this.storage.setItem(this.key, JSON.stringify(record));
    return { ok, retryAfterMs: Math.max(0, record.until - this.now()) };
  }
}

export function deviceIdentity(storage: StorageLike = localStorage): string {
  const key = 'finanzas-device-v1';
  let deviceId = storage.getItem(key);
  if (!deviceId) { deviceId = crypto.randomUUID(); storage.setItem(key, deviceId); }
  return deviceId;
}
