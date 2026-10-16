import { expect, test } from 'vitest';

test('entorno con fechas de negocio estable', () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date('2026-10-16T01:00:00Z'));
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  expect([value.year, value.month, value.day]).toEqual(['2026', '10', '15']);
});
