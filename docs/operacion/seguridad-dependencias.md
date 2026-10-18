# Comprobación de dependencias — 2026-10-18

Alcance: árbol de dependencias de producción declarado por npm, sin pruebas activas sobre sistemas de terceros. No es una auditoría completa de la app.

## Hallazgo y corrección

El control previo detectó una alerta alta transitiva: Firebase13.0.0 → @firebase/firestore4.18.0 → @grpc/grpc-js1.9.16. El aviso del mantenedor describe un problema de validación de certificados al usar determinadas configuraciones de servidor getAuthContext; versiones corregidas incluyen1.13.6 y1.14.5. [Aviso oficial](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j).

La existencia de esa dependencia en el árbol no demuestra explotación en esta PWA: el flujo browser usa el transporte web de Firestore y no un servidor gRPC propio. Aun así, se evita mantener la versión conocida afectada para usos Node/pruebas. No se aceptó la sugerencia automática de bajar Firebase a una versión antigua.

Se añadió override únicamente a @grpc/grpc-js bajo @firebase/firestore, fijando1.13.6. Se verificaron metadatos oficiales y compatibilidad de motor; npm install --ignore-scripts --no-audit --no-fund actualizó un paquete. Las ramas de firebase-tools con1.14.6 permanecieron intactas.

## Evidencia

- npm ls @grpc/grpc-js: Firestore usa1.13.6 overridden; firebase-tools conserva1.14.6.
- npm audit --omit=dev --audit-level=high --json: exit0, cero alertas conocidas de producción tras la corrección.
- Contratos/libro:71/71 pruebas PASS tras actualización.
- Datos/repositorio:9/9 PASS; reglas dedicadas7/7 PASS con runtime corregido, según T05.
- Build y pruebas de acceso se vuelven a comprobar al integrar T06.

Los datos de npm audit cambian con nuevos avisos; repetir en actualizaciones y antes de publicación. La ausencia de avisos no acredita aislamiento, seguridad de la lógica, hardware ni disponibilidad de servicios reales.
