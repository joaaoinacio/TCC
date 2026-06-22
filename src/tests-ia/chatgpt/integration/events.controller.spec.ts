// Testes de integração gerados pelo ChatGPT para ueventsController
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app.module';

describe('EventsController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let authToken: string;
  let userId: string;
  let createdEventId: string;

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
    await dataSource.query(`
      TRUNCATE TABLE sales, tickets, events, users
      RESTART IDENTITY CASCADE
    `);

    await createUserAndLogin();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createUserAndLogin() {
    const userPayload = {
      name: 'Admin Teste',
      email: 'admin@test.com',
      password: '123456',
    };

    const userResponse = await request(app.getHttpServer())
      .post('/users')
      .send(userPayload)
      .expect(201);

    userId = userResponse.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userPayload.email,
        password: userPayload.password,
      })
      .expect(201);

    authToken = loginResponse.body.access_token;
  }

  async function createEvent() {
    const payload = {
      title: 'Festival de Música',
      description: 'Evento anual',
      location: 'Chapecó',
      date: '2026-12-20T20:00:00.000Z',
      capacity: 500,
    };

    const response = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    createdEventId = response.body.id;

    return response.body;
  }

  describe('GET /events', () => {
    it('deve listar eventos com sucesso e retornar 200', async () => {
      await createEvent();

      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('deve retornar lista vazia quando não houver eventos', async () => {
      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /events/:id', () => {
    it('deve buscar evento por id com sucesso e retornar 200', async () => {
      await createEvent();

      const response = await request(app.getHttpServer())
        .get(`/events/${createdEventId}`)
        .expect(200);

      expect(response.body.id).toBe(createdEventId);
    });

    it('deve retornar 404 quando evento não existir', async () => {
      await request(app.getHttpServer())
        .get('/events/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /events', () => {
    it('deve criar evento com sucesso e retornar 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Show Nacional',
          description: 'Grande show',
          location: 'Arena',
          date: '2026-11-10T22:00:00.000Z',
          capacity: 1000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Show Nacional');
    });

    it('deve retornar 401 ao criar evento sem token JWT', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send({
          title: 'Evento',
          description: 'Teste',
          location: 'Local',
          date: '2026-12-01',
          capacity: 100,
        })
        .expect(401);
    });

    it('deve retornar 400 para payload inválido', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          description: '',
          location: '',
          date: 'data-invalida',
          capacity: -10,
        })
        .expect(400);
    });

    it('deve retornar 400 quando campos obrigatórios não forem enviados', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('PUT /events/:id', () => {
    beforeEach(async () => {
      await createEvent();
    });

    it('deve atualizar evento com sucesso e retornar 200', async () => {
      const response = await request(app.getHttpServer())
        .put(`/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Evento Atualizado',
          capacity: 700,
        })
        .expect(200);

      expect(response.body.title).toBe('Evento Atualizado');
      expect(response.body.capacity).toBe(700);
    });

    it('deve retornar 404 ao atualizar evento inexistente', async () => {
      await request(app.getHttpServer())
        .put('/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Teste',
        })
        .expect(404);
    });

    it('deve retornar 401 sem token JWT', async () => {
      await request(app.getHttpServer())
        .put(`/events/${createdEventId}`)
        .send({
          title: 'Teste',
        })
        .expect(401);
    });

    it('deve retornar 400 para payload inválido', async () => {
      await request(app.getHttpServer())
        .put(`/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          capacity: -5,
          date: 'data-invalida',
        })
        .expect(400);
    });
  });

  describe('POST /events/:id/cancel', () => {
    beforeEach(async () => {
      await createEvent();
    });

    it('deve cancelar evento com sucesso e retornar 200', async () => {
      const response = await request(app.getHttpServer())
        .post(`/events/${createdEventId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBeDefined();
    });

    it('deve retornar 404 ao cancelar evento inexistente', async () => {
      await request(app.getHttpServer())
        .post('/events/00000000-0000-0000-0000-000000000000/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 401 ao cancelar evento sem token', async () => {
      await request(app.getHttpServer())
        .post(`/events/${createdEventId}/cancel`)
        .expect(401);
    });

    it('deve retornar 400 ao cancelar evento já cancelado', async () => {
      await request(app.getHttpServer())
        .post(`/events/${createdEventId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/events/${createdEventId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});