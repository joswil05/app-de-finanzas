import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { LocalPinLock } from '../../apps/web/src/features/security/local-lock';
const cryptoApi = webcrypto as unknown as Crypto;
describe('local PIN privacy lock', () => {
  it('uses a salted verifier per owner and device and never stores the PIN', async () => {
    const storage = new Map<string, string>();
    const store = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, removeItem: (key: string) => { storage.delete(key); } };
    const alice = new LocalPinLock('alice', 'phone', store, cryptoApi);
    await alice.setPin('123456');
    expect([...storage.values()].join('')).not.toContain('123456');
    expect(await alice.verify('123456')).toEqual({ ok: true, retryAfterMs: 0 });
    expect(new LocalPinLock('bob', 'phone', store, cryptoApi).configured).toBe(false);
    expect(new LocalPinLock('alice', 'tablet', store, cryptoApi).configured).toBe(false);
  });
  it('persists five failed attempts and enforces thirty seconds even after reload', async () => {
    const store = localStorage; store.clear(); let now = 1000;
    const first = new LocalPinLock('alice', 'phone', store, cryptoApi, () => now);
    await first.setPin('123456');
    for (let i = 0; i < 5; i++) await first.verify('000000');
    const reloaded = new LocalPinLock('alice', 'phone', store, cryptoApi, () => now);
    expect(await reloaded.verify('123456')).toEqual({ ok: false, retryAfterMs: 30000 });
    now += 30000;
    expect(await reloaded.verify('123456')).toEqual({ ok: true, retryAfterMs: 0 });
  });
  it('generates a fresh salt and fails closed for damaged persisted metadata', async () => {
    localStorage.clear();
    const lock = new LocalPinLock('alice', 'phone', localStorage, cryptoApi);
    await lock.setPin('123456');
    const first = JSON.parse(localStorage.getItem(lock.key)!) as { salt: string; hash: string };
    await lock.setPin('123456');
    const next = JSON.parse(localStorage.getItem(lock.key)!) as { salt: string; hash: string };
    expect(next.salt).not.toBe(first.salt); expect(next.hash).not.toBe(first.hash);
    localStorage.setItem(lock.key, '{}');
    expect(lock.configured).toBe(true);
    await expect(lock.verify('123456')).rejects.toThrow('dañado');
  });
  it('rejects PINs that do not contain exactly six digits', async () => {
    const lock = new LocalPinLock('alice', 'phone', localStorage, cryptoApi);
    await expect(lock.setPin('12345')).rejects.toThrow('6 dígitos');
    await expect(lock.setPin('12345a')).rejects.toThrow('6 dígitos');
  });
  it('counts overlapping attempts instead of letting async derivation overwrite failures', async () => {
    localStorage.clear(); const lock = new LocalPinLock('alice', 'phone', localStorage, cryptoApi, () => 1000);
    await lock.setPin('123456');
    await Promise.all(Array.from({ length: 5 }, () => lock.verify('000000')));
    expect(await lock.verify('123456')).toEqual({ ok: false, retryAfterMs: 30000 });
  });
});
