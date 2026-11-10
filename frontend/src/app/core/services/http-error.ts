import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Ocurrió un problema. Intentá nuevamente.';
  if (error.status === 0) return 'No se pudo conectar con el servidor. Comprobá que esté iniciado.';
  const message: unknown = error.error?.message;
  return Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message : 'No pudimos completar la acción. Intentá nuevamente.';
}
