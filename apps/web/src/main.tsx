import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Bootstrap T01. Functional routes and accessible shell are implemented in T06/T07.
const root = document.getElementById('root');
if (!root) throw new Error('Falta el punto de montaje de la aplicación');
createRoot(root).render(<StrictMode><main><h1>Finanzas personales</h1><p>Estamos preparando tu espacio.</p></main></StrictMode>);
