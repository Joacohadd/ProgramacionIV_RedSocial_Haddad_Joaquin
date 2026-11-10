require('dotenv').config();
const { setServers } = require('node:dns');
const mongoose = require('mongoose');

async function main() {
  if (process.env.MONGODB_DNS_SERVERS) {
    setServers(process.env.MONGODB_DNS_SERVERS.split(',').map(server => server.trim()).filter(Boolean));
  }
  const uri = process.env.MONGODB_URI || '';
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error('Falta MONGODB_URI o no tiene formato MongoDB.');
  }
  let parsed;
  try { parsed = new URL(uri); } catch { throw new Error('La URI de Atlas está incompleta.'); }
  const password = decodeURIComponent(parsed.password || '');
  if (!parsed.username || !password || /[<>]/.test(uri) || /db_password|your_password|replace_me/i.test(password)) {
    throw new Error('La URI todavía tiene la contraseña de ejemplo. Reemplazala en backend/.env.');
  }
  try {
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'trama_tp2', serverSelectionTimeoutMS: 12000 });
    await mongoose.connection.db.admin().ping();
    console.log('Conexión a MongoDB Atlas correcta.');
  } catch (error) {
    if (error.code === 18 || error.code === 8000 || /authentication/i.test(error.name)) {
      throw new Error('Atlas rechazó el usuario o la contraseña de base de datos.');
    }
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEOUT', 'ESERVFAIL'].includes(error.code)) {
      throw new Error('Falló la consulta DNS del clúster. Revisá MONGODB_DNS_SERVERS.');
    }
    throw new Error('No se pudo conectar a Atlas. Revisá la lista de IP permitidas, el clúster y la URI.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
