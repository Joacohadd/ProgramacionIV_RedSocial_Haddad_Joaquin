require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { before, after, test } = require('node:test');
const { Module, ValidationPipe, NotFoundException } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { getModelToken } = require('@nestjs/mongoose');
const { Types } = require('mongoose');
const { AuthController } = require('../dist/auth/auth.controller');
const { AuthService } = require('../dist/auth/auth.service');
const { SessionGuard } = require('../dist/auth/session.guard');
const { PasswordResetService } = require('../dist/auth/password-reset.service');
const { ImageService } = require('../dist/common/image.service');
const { CommentsController } = require('../dist/posts/comments.controller');
const { CommentsService } = require('../dist/posts/comments.service');
const { PostsService } = require('../dist/posts/posts.service');

const user = {
  _id: new Types.ObjectId(), nombre: 'Ada', apellido: 'Luna',
  username: 'ada', role: 'usuario', active: true, tokenVersion: 2,
};
user.id = user._id.toString();
const otherId = new Types.ObjectId().toString();
const postId = new Types.ObjectId();
const comments = Array.from({ length: 3 }, (_, index) => ({
  id: new Types.ObjectId().toString(),
  authorId: user,
  message: `Comentario ${index + 1}`,
  createdAt: new Date(2026, 9, index + 1),
  modificado: false,
}));
const commentQuery = {};
const commentModel = {
  find(filter) {
    commentQuery.filter = filter;
    return {
      sort(value) { commentQuery.sort = value; return this; },
      skip(value) { commentQuery.offset = value; return this; },
      limit(value) { commentQuery.limit = value; return this; },
      populate() { return this; },
      async exec() {
        return [...comments].reverse().slice(commentQuery.offset, commentQuery.offset + commentQuery.limit);
      },
    };
  },
  async create(data) {
    assert.equal(String(data.postId), postId.toString());
    assert.equal(String(data.authorId), user.id);
    return {
      id: new Types.ObjectId().toString(), message: data.message,
      createdAt: new Date(), modificado: false,
      async populate() { this.authorId = user; },
    };
  },
  findOneAndUpdate(filter, update) {
    const comment = comments.find(item => item.id === filter._id &&
      String(filter.postId) === postId.toString() && item.authorId.id === String(filter.authorId));
    return {
      populate() { return this; },
      async exec() {
        return comment ? Object.assign(comment, update.$set) : null;
      },
    };
  },
  async exists(filter) {
    return String(filter.postId) === postId.toString() && comments.some(item => item.id === filter._id);
  },
};

class TestModule {}
Module({
  imports: [JwtModule.register({ secret: randomBytes(32).toString('hex'), signOptions: { expiresIn: '15m' } })],
  controllers: [AuthController, CommentsController],
  providers: [
    AuthService, SessionGuard, CommentsService,
    { provide: PasswordResetService, useValue: {} },
    { provide: ImageService, useValue: {} },
    { provide: getModelToken('User'), useValue: {
      findById: async id => id === user.id ? user : id === otherId
        ? { ...user, _id: new Types.ObjectId(otherId), id: otherId } : null,
    } },
    { provide: getModelToken('Comment'), useValue: commentModel },
    { provide: PostsService, useValue: {
      async requireActive(id) {
        if (id !== postId.toString()) throw new NotFoundException('Publicación no encontrada.');
        return { _id: postId };
      },
    } },
  ],
})(TestModule);

let app, baseUrl, jwt;
before(async () => {
  app = await NestFactory.create(TestModule, { logger: false, abortOnError: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
  jwt = app.get(JwtService);
});
after(async () => app?.close());

function request(path, { method = 'GET', token, body } = {}) {
  return fetch(baseUrl + path, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  });
}

const claims = { sub: user.id, role: user.role, ver: user.tokenVersion };
const commentRoute = `/posts/${postId}/comments`;

test('authorize y refresh requieren un JWT vigente y conservan la identidad al renovar', async () => {
  const token = jwt.sign({ ...claims, iat: Math.floor(Date.now() / 1000) - 600 });
  const authorized = await request('/auth/authorize', { method: 'POST', token });
  assert.equal(authorized.status, 200);
  assert.equal((await authorized.json()).id, user.id);

  const refreshed = await request('/auth/refresh', { method: 'POST', token });
  assert.equal(refreshed.status, 200);
  const session = await refreshed.json();
  const { iat, exp, ...identity } = jwt.verify(session.token);
  assert.deepEqual(identity, claims);
  assert.equal(exp - iat, 900);
  assert.ok(exp > jwt.verify(token).exp);

  const expired = jwt.sign(claims, { expiresIn: -1 });
  const invalidated = jwt.sign({ ...claims, ver: 1 });
  for (const invalid of [undefined, expired, invalidated]) {
    for (const route of ['/auth/authorize', '/auth/refresh']) {
      assert.equal((await request(route, { method: 'POST', token: invalid })).status, 401);
    }
  }
});

test('comentarios: limita la página, conserva el orden y requiere publicación activa y sesión', async () => {
  const token = jwt.sign(claims);
  assert.equal((await request(commentRoute)).status, 401);
  assert.equal((await request(`/posts/${new Types.ObjectId()}/comments`, { token })).status, 404);
  assert.equal((await request(`${commentRoute}?limit=31`, { token })).status, 400);

  const first = await request(`${commentRoute}?offset=0&limit=2`, { token });
  assert.equal(first.status, 200);
  const firstPage = await first.json();
  assert.equal(firstPage.hasMore, true);
  assert.deepEqual(firstPage.items.map(item => item.id), [comments[2].id, comments[1].id]);
  assert.equal(String(commentQuery.filter.postId), postId.toString());
  assert.deepEqual(commentQuery.sort, { createdAt: -1, _id: -1 });

  const second = await request(`${commentRoute}?offset=2&limit=2`, { token });
  const secondPage = await second.json();
  assert.equal(secondPage.hasMore, false);
  assert.deepEqual(secondPage.items.map(item => item.id), [comments[0].id]);
});

test('comentarios: valida el mensaje, asigna el autor y solo el dueño puede editar', async () => {
  const token = jwt.sign(claims);
  const otherToken = jwt.sign({ ...claims, sub: otherId });
  assert.equal((await request(commentRoute, { method: 'POST', token, body: { message: '   ' } })).status, 400);
  assert.equal((await request(commentRoute, { method: 'POST', token, body: { message: 'Hola', authorId: otherId } })).status, 400);

  const created = await request(commentRoute, { method: 'POST', token, body: { message: '  Hola  ' } });
  assert.equal(created.status, 201);
  const comment = await created.json();
  assert.equal(comment.message, 'Hola');
  assert.equal(comment.author.id, user.id);
  assert.equal(comment.modificado, false);

  const path = `${commentRoute}/${comments[0].id}`;
  const denied = await request(path, { method: 'PUT', token: otherToken, body: { message: 'Ajeno' } });
  assert.equal(denied.status, 403);
  const updated = await request(path, { method: 'PUT', token, body: { message: 'Editado' } });
  assert.equal(updated.status, 200);
  const response = await updated.json();
  assert.equal(response.message, 'Editado');
  assert.equal(response.modificado, true);
});
