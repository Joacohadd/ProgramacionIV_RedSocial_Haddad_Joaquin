// Vercel limita el tamaño total de cada petición a 4,5 MB; dejamos margen para el formulario.
export const MAX_IMAGE_MB = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' ? 4 : 5;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
