const fs = require('node:fs');
const path = require('node:path');

const value = process.env.TRAMA_API_URL?.trim();
const isVercel = process.argv.includes('--require-public-url') || process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

if (!value) {
  if (isVercel) {
    console.error('Configurá TRAMA_API_URL en Vercel con la dirección HTTPS pública del backend.');
    process.exit(1);
  }
  console.log('TRAMA_API_URL no configurada: se conserva la dirección local del backend.');
  process.exit(0);
}

let url;
try {
  url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
      (isVercel && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('URL no válida');
  }
} catch {
  console.error('TRAMA_API_URL debe ser una URL pública HTTPS, sin credenciales ni parámetros.');
  process.exit(1);
}

const indexPath = path.join(__dirname, '..', 'dist', 'trama', 'browser', 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
const tag = /(<meta\s+name="trama-api-url"\s+content=")[^"]*("\s*\/?>)/;
if (!tag.test(index)) {
  console.error('No se encontró la configuración de la API en el frontend compilado.');
  process.exit(1);
}
const safeUrl = url.toString().replace(/\/$/, '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
index = index.replace(tag, (_match, start, end) => `${start}${safeUrl}${end}`);
if (isVercel) {
  const imageLimit = /(<meta\s+name="trama-max-image-bytes"\s+content=")[^"]*("\s*\/?>)/;
  if (!imageLimit.test(index)) {
    console.error('No se encontró el límite de imágenes en el frontend compilado.');
    process.exit(1);
  }
  index = index.replace(imageLimit, (_match, start, end) => `${start}4194304${end}`);
}
fs.writeFileSync(indexPath, index);
console.log('Dirección pública del backend configurada para esta compilación.');
