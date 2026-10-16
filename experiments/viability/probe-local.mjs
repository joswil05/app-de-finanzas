import assert from 'node:assert/strict';
import { generateKeyPair, jwtVerify, SignJWT } from 'jose';

// Synthetic, ephemeral signing key. Never a Firebase credential or production token.
const instant = new Date('2026-10-16T01:00:00Z');
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit'
}).formatToParts(instant);
const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
assert.equal(`${date.year}-${date.month}-${date.day}`, '2026-10-15');
const { privateKey, publicKey } = await generateKeyPair('RS256');
const token = await new SignJWT({ synthetic: true })
  .setProtectedHeader({ alg: 'RS256' }).setSubject('fictional-user')
  .setIssuer('urn:finanzas:local-probe').setAudience('urn:finanzas:local-only')
  .setIssuedAt().setExpirationTime('2m').sign(privateKey);
const { payload } = await jwtVerify(token, publicKey, {
  algorithms: ['RS256'], issuer: 'urn:finanzas:local-probe', audience: 'urn:finanzas:local-only'
});
assert.equal(payload.sub, 'fictional-user');
await assert.rejects(jwtVerify(token, publicKey, { audience: 'urn:wrong-audience' }));
console.log(JSON.stringify({
  status: 'PASS', scope: 'local-only', node: process.version,
  checks: ['Managua calendar date', 'ephemeral RS256 sign/verify', 'wrong audience rejected'],
  externalServicesValidated: false, secretsLogged: false
}, null, 2));
