require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException, ConflictException, UnauthorizedException } = require('@nestjs/common');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const bcrypt = require('bcryptjs');
const { AuthService } = require('../dist/auth/auth.service');
const { RegisterDto } = require('../dist/auth/auth.dto');

const valid = {
  nombre: 'Ada', apellido: 'Luna', email: 'ADA@example.test', username: 'Ada',
  password: 'Clave1234', repetirPassword: 'Clave1234', fechaNacimiento: '2001-05-01', bio: 'Me gusta escribir.',
};
const avatarUrl = 'https://images.example.test/avatar.png';

test('registro guarda hash y rol usuario sin exponer la contraseña', async () => {
  let saved;
  const users = {
    exists: async () => null,
    create: async value => { saved = value; return { id: 'usuario-ejemplo', ...value }; },
  };
  const service = new AuthService(users, { save: async () => avatarUrl });
  const response = await service.register(valid, { originalname: 'avatar.png' });
  assert.equal(saved.email, 'ada@example.test');
  assert.equal(saved.username, 'ada');
  assert.equal(saved.role, 'usuario');
  assert.equal(saved.avatarUrl, avatarUrl);
  assert.notEqual(saved.passwordHash, valid.password);
  assert.equal(await bcrypt.compare(valid.password, saved.passwordHash), true);
  assert.equal(response.user.passwordHash, undefined);
  assert.equal(response.user.avatarUrl, avatarUrl);
});

test('registro rechaza correo o usuario duplicado antes de guardar imágenes', async () => {
  let uploads = 0;
  const service = new AuthService({ exists: async () => ({ _id: 'existente' }) }, { save: async () => { uploads++; } });
  await assert.rejects(() => service.register(valid), ConflictException);
  assert.equal(uploads, 0);
});

test('registro rechaza contraseñas distintas', async () => {
  const service = new AuthService({}, {});
  await assert.rejects(() => service.register({ ...valid, repetirPassword: 'OtraClave123' }), BadRequestException);
});

test('login verifica el hash y devuelve los datos públicos', async () => {
  const passwordHash = await bcrypt.hash(valid.password, 4);
  const account = { id: 'usuario-ejemplo', ...valid, email: 'ada@example.test', username: 'ada', role: 'usuario', passwordHash };
  let query;
  const users = { findOne: value => { query = value; return { select: async () => account }; } };
  const service = new AuthService(users, {});
  const response = await service.login({ identifier: ' ADA@EXAMPLE.TEST ', password: valid.password });
  assert.deepEqual(query, { $or: [{ email: 'ada@example.test' }, { username: 'ada@example.test' }] });
  assert.equal(response.user.username, 'ada');
  assert.equal(response.user.passwordHash, undefined);
  await assert.rejects(() => service.login({ identifier: 'ada', password: 'ContraseñaIncorrecta' }), UnauthorizedException);
});

test('validación de registro rechaza correo y contraseña inválidos', async () => {
  const dto = plainToInstance(RegisterDto, { ...valid, email: 'no-es-un-correo', password: 'simple' });
  const errors = await validate(dto);
  assert.ok(errors.some(error => error.property === 'email'));
  assert.ok(errors.some(error => error.property === 'password'));
  assert.equal((await validate(plainToInstance(RegisterDto, valid))).length, 0);
});
