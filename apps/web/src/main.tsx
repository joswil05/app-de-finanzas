import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureFirebase } from './data/firebase';
import { SessionController } from './features/auth/session';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Falta el punto de montaje de la aplicación');
let controller: SessionController | undefined;
let configurationError: string | undefined;
try {
  const configuration = configureFirebase();
  if (configuration.state === 'configured') { controller = new SessionController(configuration.runtime); controller.start(); }
  else configurationError = configuration.reason;
} catch { configurationError = 'No pudimos preparar el acceso local. Revisá la configuración y permití el almacenamiento para este sitio.'; }
createRoot(root).render(<StrictMode><App {...(controller ? { controller } : {})} {...(configurationError ? { configurationError } : {})} /></StrictMode>);
