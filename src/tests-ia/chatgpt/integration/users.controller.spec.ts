// Testes de integração gerados pelo ChatGPT para uusersController
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app.module';

describe('UsersController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let createdUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query(`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAndLoginUser() {
    const payload = {
      name: 'João Teste',
      email: 'joao@test.com',
      password: '123456',
    };

    const createResponse = await request(app.getHttpServer())
      .post('/users')
      .send(payload)
      .expect(201);

    createdUserId = createResponse.body.id;

    /**
     * Ajuste a rota abaixo conforme seu AuthController real.
     * Exemplo comum: POST /auth/login
     */
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: payload.email,
        password: payload.password,
      })
      .expect(201);

    authToken = loginResponse.body.access_token;
  }

  describe('POST /users', () => {
    it('deve criar usuário com sucesso e retornar 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Maria Silva',
          email: 'maria@test.com',
          password: '123456',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('maria@test.com');
    });

    it('deve retornar 409 quando email já estiver em uso', async () => {
      const payload = {
        name: 'Usuário',
        email: 'duplicado@test.com',
        password: '123456',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(payload)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(payload)
        .expect(409);

      expect(response.body.message).toContain('Email already in use');
    });

    it('deve retornar 400 para payload inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: '',
          email: 'email-invalido',
          password: '123',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('deve retornar 400 quando campos obrigatórios não forem enviados', async () => {
      await request(app.getHttpServer()).post('/users').send({}).expect(400);
    });
  });

  describe('GET /users/:id', () => {
    beforeEach(async () => {
      await createAndLoginUser();
    });

    it('deve buscar usuário com sucesso e retornar 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdUserId);
    });

    it('deve retornar 404 quando usuário não existir', async () => {
      await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 401 sem token JWT', async () => {
      await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .expect(401);
    });
  });

  describe('PUT /users/:id', () => {
    beforeEach(async () => {
      await createAndLoginUser();
    });

    it('deve atualizar usuário com sucesso e retornar 200', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'João Atualizado',
        })
        .expect(200);

      expect(response.body.name).toBe('João Atualizado');
    });

    it('deve retornar 404 ao atualizar usuário inexistente', async () => {
      await request(app.getHttpServer())
        .put('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Teste',
        })
        .expect(404);
    });

    it('deve retornar 409 ao atualizar email para um já existente', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Outro',
          email: 'outro@test.com',
          password: '123456',
        })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'outro@test.com',
        })
        .expect(409);
    });

    it('deve retornar 400 para payload inválido', async () => {
      await request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'email-invalido',
        })
        .expect(400);
    });

    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .send({
          name: 'Teste',
        })
        .expect(401);
    });
  });

  describe('DELETE /users/:id', () => {
    beforeEach(async () => {
      await createAndLoginUser();
    });

    it('deve desativar usuário com sucesso e retornar 204', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('deve retornar 404 ao deletar usuário inexistente', async () => {
      await request(app.getHttpServer())
        .delete('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 401 sem token JWT', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .expect(401);
    });
  });
});
