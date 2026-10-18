export function authError(cause: unknown): string {
  if (cause instanceof Error && cause.name === 'ZodError') return 'Revisá los datos: completá los campos y usá importes y fechas válidos.';
  if (cause instanceof Error && cause.message.startsWith('SESSION_CLEANUP_REQUIRED')) return 'Este dispositivo conserva datos de otra sesión. Volvé a esa cuenta y cerrala antes de cambiar.';
  if (cause instanceof Error && cause.message.startsWith('OFFLINE_UNAVAILABLE')) return 'Necesitás conexión para abrir esta cuenta por primera vez y descargar sus datos.';
  if (cause instanceof Error && cause.message.startsWith('PERSISTENCE_UNAVAILABLE')) return 'El navegador no pudo guardar datos locales. Permití el almacenamiento de este sitio e intentá de nuevo.';
  const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Revisá tu correo y contraseña e intentá de nuevo.',
    'auth/wrong-password': 'Revisá tu correo y contraseña e intentá de nuevo.',
    'auth/email-already-in-use': 'Este correo ya tiene cuenta. Entrá o recuperá tu contraseña.',
    'auth/weak-password': 'Usá una contraseña más segura, de al menos 8 caracteres.',
    'auth/popup-closed-by-user': 'Cancelaste el acceso con Google. Podés volver a intentarlo.',
    'auth/cancelled-popup-request': 'Se canceló el acceso con Google. Podés volver a intentarlo.',
    'auth/popup-blocked': 'Tu navegador bloqueó la ventana de Google. Permitila e intentá otra vez.',
    'auth/account-exists-with-different-credential': 'Entrá con tu método habitual. Después podés vincular Google desde tu cuenta.',
    'auth/network-request-failed': 'No pudimos conectar. Revisá tu conexión e intentá otra vez.',
    'auth/too-many-requests': 'Hubo demasiados intentos. Esperá un momento e intentá de nuevo.',
    'auth/expired-action-code': 'Este enlace venció. Solicitá uno nuevo.',
    'auth/invalid-action-code': 'Este enlace no es válido o ya se usó. Solicitá uno nuevo.',
    'auth/user-token-expired': 'Tu sesión venció. Volvé a entrar con tu cuenta.',
    'auth/requires-recent-login': 'Confirmá tu identidad de nuevo para continuar.',
    'permission-denied': 'No se pudo verificar tu acceso. Actualizá la sesión o volvé a entrar.',
    'unavailable': 'No pudimos conectar. Tus cambios todavía no se confirmaron; intentá de nuevo.',
  };
  return messages[code] ?? (cause instanceof Error && !code ? cause.message : 'No pudimos completar la acción. Intentá de nuevo.');
}
