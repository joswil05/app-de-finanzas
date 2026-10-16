# Versiones fijadas y entorno reproducible

Resolución: 2026-10-15 (America/Managua), metadatos oficiales de registry.npmjs.org. Todas las dependencias directas de publicación están fijadas sin rangos; package-lock.json fija el árbol transitivo. Los paquetes @fin/* son privados, locales, versión 0.0.0.

- Node LTS instalado y fijado: 24.14.1 (.node-version y engines).
- npm: 11.11.0 (packageManager y engines).
- Java: Temurin OpenJDK 21.0.12.1+1 LTS, x64; necesario para Firestore Emulator.
- SO de esta verificación: Windows x64.
- Una vez actualizado el lockfile usar npm ci. No usar npm update para reconstruir una entrega.

## Selección compatible

TypeScript 7.0.2 era el estable más reciente consultado, pero typescript-eslint 8.71.2 declara TypeScript <6.1.0: se fija 6.0.3. jsdom 30.1.3 requiere Node ^24.15.0 en la rama 24; el entorno instalado es 24.14.1: se fija jsdom 29.1.1 compatible. No se usó --force ni --legacy-peer-deps. React Router 8.4.0 requiere Node >=22.22.0 y React >=19.2.7; el conjunto fijado los satisface. Los tipos de Node se mantienen en la rama 24 y los de Workers tienen fecha 2026-10-15.

Vite requiere Node 20.19+/22.12+ ([guía oficial](https://vite.dev/guide/)). Firebase recomienda Java 21+ para Firestore Emulator ([documentación oficial](https://firebase.google.com/docs/emulator-suite/connect_firestore)). Los motores y peer dependencies se verificaron en los metadatos publicados del registro oficial antes de instalar.

## Dependencias directas

| Paquete | Versión | Fuente oficial |
|---|---|---|
| @cloudflare/workers-types | 5.20261015.1 | [npm metadata](https://registry.npmjs.org/@cloudflare/workers-types) |
| @eslint/js | 10.0.1 | [npm metadata](https://registry.npmjs.org/@eslint/js) |
| @firebase/rules-unit-testing | 6.0.0 | [npm metadata](https://registry.npmjs.org/@firebase/rules-unit-testing) |
| @playwright/test | 1.64.1 | [npm metadata](https://registry.npmjs.org/@playwright/test) |
| @testing-library/dom | 10.4.2 | [npm metadata](https://registry.npmjs.org/@testing-library/dom) |
| @testing-library/jest-dom | 7.0.1 | [npm metadata](https://registry.npmjs.org/@testing-library/jest-dom) |
| @testing-library/react | 16.3.3 | [npm metadata](https://registry.npmjs.org/@testing-library/react) |
| @testing-library/user-event | 14.6.8 | [npm metadata](https://registry.npmjs.org/@testing-library/user-event) |
| @types/node | 24.19.2 | [npm metadata](https://registry.npmjs.org/@types/node) |
| @types/react | 19.3.0 | [npm metadata](https://registry.npmjs.org/@types/react) |
| @types/react-dom | 19.3.0 | [npm metadata](https://registry.npmjs.org/@types/react-dom) |
| @vitejs/plugin-react | 6.1.2 | [npm metadata](https://registry.npmjs.org/@vitejs/plugin-react) |
| @vitest/coverage-v8 | 5.0.5 | [npm metadata](https://registry.npmjs.org/@vitest/coverage-v8) |
| eslint | 10.12.0 | [npm metadata](https://registry.npmjs.org/eslint) |
| eslint-plugin-react-hooks | 7.1.1 | [npm metadata](https://registry.npmjs.org/eslint-plugin-react-hooks) |
| eslint-plugin-react-refresh | 0.5.7 | [npm metadata](https://registry.npmjs.org/eslint-plugin-react-refresh) |
| firebase | 13.0.0 | [npm metadata](https://registry.npmjs.org/firebase) |
| firebase-tools | 15.34.0 | [npm metadata](https://registry.npmjs.org/firebase-tools) |
| globals | 17.13.0 | [npm metadata](https://registry.npmjs.org/globals) |
| jose | 6.2.12 | [npm metadata](https://registry.npmjs.org/jose) |
| jsdom | 29.1.1 | [npm metadata](https://registry.npmjs.org/jsdom) |
| lucide-react | 1.57.0 | [npm metadata](https://registry.npmjs.org/lucide-react) |
| react | 19.3.1 | [npm metadata](https://registry.npmjs.org/react) |
| react-dom | 19.3.1 | [npm metadata](https://registry.npmjs.org/react-dom) |
| react-router | 8.4.0 | [npm metadata](https://registry.npmjs.org/react-router) |
| typescript | 6.0.3 | [npm metadata](https://registry.npmjs.org/typescript) |
| typescript-eslint | 8.71.2 | [npm metadata](https://registry.npmjs.org/typescript-eslint) |
| vite | 8.3.4 | [npm metadata](https://registry.npmjs.org/vite) |
| vite-plugin-pwa | 2.0.0 | [npm metadata](https://registry.npmjs.org/vite-plugin-pwa) |
| vitest | 5.0.5 | [npm metadata](https://registry.npmjs.org/vitest) |
| workbox-core | 7.4.1 | [npm metadata](https://registry.npmjs.org/workbox-core) |
| workbox-precaching | 7.4.1 | [npm metadata](https://registry.npmjs.org/workbox-precaching) |
| workbox-routing | 7.4.1 | [npm metadata](https://registry.npmjs.org/workbox-routing) |
| workbox-window | 7.4.1 | [npm metadata](https://registry.npmjs.org/workbox-window) |
| wrangler | 4.151.0 | [npm metadata](https://registry.npmjs.org/wrangler) |
| zod | 4.6.7 | [npm metadata](https://registry.npmjs.org/zod) |
## Comandos y límites de la base

Los paquetes compartidos usan bibliotecas de tipos ES2023+DOM para TextEncoder, structuredClone y WebCrypto, APIs disponibles en Node24, navegador y Workers. Esto no autoriza acoplar dominio a window/document/almacenamiento del navegador. TypeScript 6 exige rootDir explícito al emitir; los builds de paquetes usan la raíz del monorepositorio y conservan rutas en dist para comprobar también fuentes locales importadas. Los exports privados siguen apuntando a src y los consumidores Vite/Wrangler empaquetan esas fuentes; los paquetes no se publican como distribuciones Node independientes.

Vite lee .env desde la raíz del repositorio (envDir), junto a .env.example. Copiar solo los valores de configuración pública; los secretos de servidor no pertenecen a .env del cliente.

Utilidad de pruebas de persistencia añadida por T05: fake-indexeddb 6.2.5, Node >=18 ([metadatos oficiales](https://registry.npmjs.org/fake-indexeddb)).

npm run dev sirve la app local. npm run typecheck revisa configuraciones/tests y los seis espacios. npm run lint revisa fuentes. npm test incluye solo setup, contratos, dominio, data, workers, ai y UI; excluye rules/e2e. npm run test:rules usa exclusivamente Vitest rules con emuladores Auth/Firestore y proyecto ficticio demo-finanzas. npm run test:e2e usa Playwright con emuladores y build servido, en Chromium/escritorio y perfiles móviles Chromium/WebKit. Los perfiles móviles no certifican hardware real.

npm run build compila los paquetes, crea la app y empaqueta Workers mediante wrangler deploy --dry-run: ese comando no publica. Los Workers bootstrap responden 503 y no implementan integraciones. No hay cron configurado. El plugin PWA está instalado, pero un único service worker Workbox+FCM se integrará en T19/T22; esta base no promete disponibilidad offline.

Firestore rules/índices y suites correspondientes llegan en T05; las suites E2E llegan desde T06. Los comandos separados deben fallar ante ausencia de pruebas o reglas, nunca simular aprobación. Los secretos solo se configuran fuera del repositorio; no hay allowlist de un único propietario.
