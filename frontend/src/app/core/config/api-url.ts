export const API_URL = document.querySelector<HTMLMetaElement>('meta[name="trama-api-url"]')?.content || 'http://localhost:3000';
export const MAX_IMAGE_BYTES = Number(document.querySelector<HTMLMetaElement>('meta[name="trama-max-image-bytes"]')?.content) || 5 * 1024 * 1024;
export const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);
