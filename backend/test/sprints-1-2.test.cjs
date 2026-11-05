const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } = require('@nestjs/common');
const { PostsService } = require('../dist/posts/posts.service');
const { AuthService } = require('../dist/auth/auth.service');
const { SessionGuard } = require('../dist/auth/session.guard');
const { UsersService } = require('../dist/users/users.service');
const { PasswordResetService } = require('../dist/auth/password-reset.service');
const { createHash } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { Writable } = require('node:stream');
const { v2: cloudinary } = require('cloudinary');
const { ImageService } = require('../dist/common/image.service');

const actor = { id: '507f1f77bcf86cd799439011', _id: '507f1f77bcf86cd799439011', role: 'usuario', active: true };
const author = { id: actor.id, nombre: 'Ada', apellido: 'Luna', username: 'ada', avatarUrl: null };
const post = { id: '507f1f77bcf86cd799439012', authorId: author, title: 'Una idea', description: 'Algo para contar',
  imageUrl: null, createdAt: new Date(), likes: [actor._id], likesCount: 1 };

test('registro: guarda rol usuario y no expone el hash', async () => {
  let saved;
  const users = { exists: async () => null, create: async value => {
    saved = value;
    return { id: actor.id, ...value, active: true };
  } };
  const service = new AuthService(users, { signAsync: async () => 'signed-token' }, { save: async () => undefined });
  const response = await service.register({ nombre: 'Ada', apellido: 'Luna', email: 'ADA@example.com', username: 'Ada',
    password: 'Clave1234', repetirPassword: 'Clave1234', fechaNacimiento: '2001-05-01', bio: 'Me gusta escribir.' });
  assert.equal(saved.role, 'usuario');
  assert.equal(saved.email, 'ada@example.com');
  assert.notEqual(saved.passwordHash, 'Clave1234');
  assert.equal(response.user.passwordHash, undefined);
  assert.equal(response.token, 'signed-token');
});

test('registro duplicado: responde conflicto', async () => {
  const service = new AuthService({ exists: async () => ({ _id: actor.id }) }, {}, { save: async () => undefined });
  await assert.rejects(() => service.register({ email: 'ada@example.com', username: 'ada', password: 'Clave1234', repetirPassword: 'Clave1234' }), ConflictException);
});

test('login con credenciales inválidas: responde 401', async () => {
  const users = { findOne: () => ({ select: async () => null }) };
  const service = new AuthService(users, {}, {});
  await assert.rejects(() => service.login({ identifier: 'nadie', password: 'Clave1234' }), UnauthorizedException);
});

test('editar perfil: actualiza solo datos propios y conserva el rol', async () => {
  let duplicateFilter, saves = 0;
  const user = { ...actor, nombre: 'Ada', apellido: 'Luna', email: 'ada@example.com', username: 'ada',
    fechaNacimiento: '2001-05-01', bio: 'Antes', passwordHash: 'hash-existente',
    save: async () => { saves++; } };
  const users = { exists: async filter => { duplicateFilter = filter; return null; } };
  const images = { save: async () => 'http://localhost:3000/uploads/nueva.jpg' };
  const result = await new UsersService(users, images).updateProfile(user, {
    nombre: 'Ada nueva', email: 'NUEVA@example.com', username: 'Nuevo.Usuario', bio: 'Biografía actualizada',
    role: 'administrador', passwordHash: 'hash-modificado',
  }, { originalname: 'nueva.jpg' });
  assert.equal(saves, 1);
  assert.equal(user.email, 'nueva@example.com');
  assert.equal(user.username, 'nuevo.usuario');
  assert.equal(user.role, 'usuario');
  assert.equal(user.passwordHash, 'hash-existente');
  assert.equal(result.avatarUrl, 'http://localhost:3000/uploads/nueva.jpg');
  assert.equal(result.passwordHash, undefined);
  assert.equal(String(duplicateFilter._id.$ne), actor.id);
});

test('editar perfil: rechaza correo duplicado antes de guardar la foto', async () => {
  let savedImage = false;
  const user = { ...actor, email: 'ada@example.com' };
  const service = new UsersService({ exists: async () => ({ _id: 'otra-cuenta' }) },
    { save: async () => { savedImage = true; } });
  await assert.rejects(() => service.updateProfile(user, { email: 'ocupado@example.com' }, { originalname: 'foto.jpg' }), ConflictException);
  assert.equal(savedImage, false);
});

test('editar perfil: rechaza fecha futura y petición vacía', async () => {
  const service = new UsersService({ exists: async () => null }, { save: async () => undefined });
  await assert.rejects(() => service.updateProfile(actor, {}), BadRequestException);
  await assert.rejects(() => service.updateProfile(actor, { fechaNacimiento: '2999-01-01' }), BadRequestException);
});

test('feed: orden por likes, paginación y filtro por autor llegan a Mongo', async () => {
  const calls = {};
  const query = { sort: value => { calls.sort = value; return query; }, skip: value => { calls.offset = value; return query; },
    limit: value => { calls.limit = value; return query; }, populate: () => query, exec: async () => [post] };
  const posts = { find: filter => { calls.filter = filter; return query; }, countDocuments: async () => 8 };
  const result = await new PostsService(posts, {}).list({ sort: 'likes', offset: 2, limit: 3, userId: actor.id }, actor);
  assert.equal(calls.sort.likesCount, -1);
  assert.equal(calls.offset, 2);
  assert.equal(calls.limit, 3);
  assert.equal(String(calls.filter.authorId), actor.id);
  assert.equal(calls.filter.deletedAt, null);
  assert.equal(result.total, 8);
  assert.equal(result.items[0].likedByMe, true);
});

test('like: la actualización exige que el usuario no haya dado like', async () => {
  let filter, update;
  const posts = { findOneAndUpdate: (f, u) => { filter = f; update = u; return { populate: () => ({ exec: async () => post }) }; } };
  const result = await new PostsService(posts, {}).like(post.id, actor);
  assert.equal(filter.likes.$ne, actor._id);
  assert.equal(update.$inc.likesCount, 1);
  assert.equal(result.likesCount, 1);
});

test('like duplicado: responde conflicto', async () => {
  const posts = { findOneAndUpdate: () => ({ populate: () => ({ exec: async () => null }) }), findOne: async () => post };
  await assert.rejects(() => new PostsService(posts, {}).like(post.id, actor), ConflictException);
});

test('baja lógica: otro usuario no puede eliminar y el autor sí', async () => {
  let saves = 0;
  const savedPost = { authorId: actor._id, deletedAt: null, save: async () => { saves++; } };
  const posts = { findOne: async () => savedPost };
  const service = new PostsService(posts, {});
  await assert.rejects(() => service.remove(post.id, { id: '507f1f77bcf86cd799439099', role: 'usuario' }), ForbiddenException);
  assert.equal(saves, 0);
  assert.deepEqual(await service.remove(post.id, actor), { deleted: true });
  assert.ok(savedPost.deletedAt instanceof Date);
  assert.equal(saves, 1);
});

test('guard: rechaza acceso sin token y toma el actor validado del servidor', async () => {
  const guard = new SessionGuard({ verifyAsync: async () => ({ sub: actor.id }) }, { findById: async () => actor });
  const request = { headers: {} };
  const context = { switchToHttp: () => ({ getRequest: () => request }) };
  await assert.rejects(() => guard.canActivate(context), UnauthorizedException);
  request.headers.authorization = 'Bearer token-firmado';
  assert.equal(await guard.canActivate(context), true);
  assert.equal(request.actor, actor);
});

test('guard: rechaza token vencido y cuenta deshabilitada', async () => {
  const request = { headers: { authorization: 'Bearer token' } };
  const context = { switchToHttp: () => ({ getRequest: () => request }) };
  const expired = new SessionGuard({ verifyAsync: async () => { throw new Error('jwt expired'); } }, { findById: async () => actor });
  const disabled = new SessionGuard({ verifyAsync: async () => ({ sub: actor.id }) }, { findById: async () => ({ ...actor, active: false }) });
  await assert.rejects(() => expired.canActivate(context), UnauthorizedException);
  await assert.rejects(() => disabled.canActivate(context), UnauthorizedException);
});

test('recuperación: respuesta genérica para cuenta inexistente', async () => {
  let sent = false;
  const users = { findOneAndUpdate: () => ({ exec: async () => null }) };
  const mailer = { assertReady: () => {}, deliveryMode: () => 'local', send: async () => { sent = true; } };
  const result = await new PasswordResetService(users, mailer).request({ identifier: 'no-existe@example.com' });
  assert.match(result.message, /Si existe una cuenta/);
  assert.equal(sent, false);
});

test('recuperación: guarda solo el hash del enlace, con caducidad y límite de solicitudes', async () => {
  let filter, update, rawToken;
  const user = { _id: actor.id, email: 'ada@example.com' };
  const users = { findOneAndUpdate: (f, u) => { filter = f; update = u; return { exec: async () => user }; } };
  const mailer = { assertReady: () => {}, deliveryMode: () => 'local', send: async (email, token) => {
    assert.equal(email, user.email); rawToken = token;
  } };
  const before = Date.now();
  const result = await new PasswordResetService(users, mailer).request({ identifier: 'ADA' });
  assert.match(result.message, /Si existe una cuenta/);
  assert.equal(filter.$or[1].username, 'ada');
  assert.ok(filter.$and[0].$or[1].passwordResetRequestedAt.$lte instanceof Date);
  assert.match(rawToken, /^[a-f0-9]{64}$/);
  assert.notEqual(update.$set.passwordResetTokenHash, rawToken);
  assert.equal(update.$set.passwordResetTokenHash, createHash('sha256').update(rawToken).digest('hex'));
  assert.ok(update.$set.passwordResetExpiresAt.getTime() >= before + 29 * 60_000);
});

test('recuperación: enlace válido cambia el hash una sola vez e invalida sesiones previas', async () => {
  const token = 'a'.repeat(64);
  let changed = false, update;
  const users = {
    findOne: () => ({ exec: async () => changed ? null : { _id: actor.id } }),
    findOneAndUpdate: (_filter, value) => { update = value; changed = true; return { exec: async () => ({ _id: actor.id }) }; },
  };
  const service = new PasswordResetService(users, {});
  assert.match((await service.reset({ token, password: 'NuevaClave123', repetirPassword: 'NuevaClave123' })).message, /actualizada/);
  assert.ok(await bcrypt.compare('NuevaClave123', update.$set.passwordHash));
  assert.equal(update.$unset.passwordResetTokenHash, '');
  assert.equal(update.$inc.tokenVersion, 1);
  await assert.rejects(() => service.reset({ token, password: 'NuevaClave123', repetirPassword: 'NuevaClave123' }), BadRequestException);
});

test('recuperación: rechaza contraseñas diferentes y sesiones con versión anterior', async () => {
  const service = new PasswordResetService({}, {});
  await assert.rejects(() => service.reset({ token: 'a'.repeat(64), password: 'NuevaClave123', repetirPassword: 'OtraClave123' }), BadRequestException);
  const guard = new SessionGuard({ verifyAsync: async () => ({ sub: actor.id, ver: 0 }) },
    { findById: async () => ({ ...actor, tokenVersion: 1 }) });
  const context = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer token-viejo' } }) }) };
  await assert.rejects(() => guard.canActivate(context), UnauthorizedException);
});

test('imágenes: sube a Cloudinary y devuelve la URL HTTPS sin usar el nombre del archivo', async () => {
  const names = ['IMAGE_STORAGE', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const original = cloudinary.uploader.upload_stream;
  let options, uploaded;
  try {
    Object.assign(process.env, { IMAGE_STORAGE: 'cloudinary', CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: 'test', CLOUDINARY_API_SECRET: 'test' });
    cloudinary.uploader.upload_stream = (settings, callback) => {
      options = settings;
      return new Writable({ write(chunk, _encoding, done) { uploaded = Buffer.from(chunk); done(); },
        final(done) { callback(null, { secure_url: 'https://res.cloudinary.com/demo/image/upload/trama/example.png' }); done(); } });
    };
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    const url = await new ImageService().save({ mimetype: 'image/png', buffer: bytes, size: bytes.length, originalname: 'nombre-personal.png' });
    assert.equal(url, 'https://res.cloudinary.com/demo/image/upload/trama/example.png');
    assert.deepEqual(uploaded, bytes);
    assert.match(options.public_id, /^trama\/[a-f0-9-]+$/);
    assert.equal(options.overwrite, false);
  } finally {
    cloudinary.uploader.upload_stream = original;
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
  }
});

test('imágenes: rechaza archivos que no coinciden con el formato declarado', async () => {
  const bytes = Buffer.from('no es una imagen');
  await assert.rejects(() => new ImageService().save({ mimetype: 'image/png', buffer: bytes, size: bytes.length }), BadRequestException);
});
