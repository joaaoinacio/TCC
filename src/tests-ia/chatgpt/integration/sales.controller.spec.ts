// Testes de integração gerados pelo ChatGPT para usalesController
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app.module';

describe('SalesController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let authToken: string;
  let userId: string;
  let eventId: string;
  let ticketId: string;
  let saleId: string;

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

    await bootstrapUser();
    await bootstrapEvent();
    await bootstrapTicket();
  });

  afterAll(async () => {
    await app.close();
  });

  async function bootstrapUser() {
    const payload = {
      name: 'João Teste',
      email: 'joao@test.com',
      password: '123456',
    };

    const createUser = await request(app.getHttpServer())
      .post('/users')
      .send(payload)
      .expect(201);

    userId = createUser.body.id;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: payload.email,
        password: payload.password,
      })
      .expect(201);

    authToken = login.body.access_token;
  }

  async function bootstrapEvent() {
    const response = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Festival Teste',
        description: 'Evento oficial',
        location: 'Chapecó',
        date: '2026-12-20T20:00:00.000Z',
        capacity: 100,
      })
      .expect(201);

    eventId = response.body.id;
  }

  async function bootstrapTicket() {
    /**
     * Ajuste a rota abaixo caso seu TicketController use endpoint diferente.
     * Exemplo esperado: POST /tickets
     */
    const response = await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        eventId,
        type: 'VIP',
        price: 100,
        quantity: 50,
      })
      .expect(201);

    ticketId = response.body.id;
  }

  async function createSale() {
    const response = await request(app.getHttpServer())
      .post('/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ticketId,
        quantity: 2,
      })
      .expect(201);

    saleId = response.body.id;

    return response.body;
  }

  describe('POST /sales', () => {
    it('deve criar venda com sucesso e retornar 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticketId,
          quantity: 2,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.quantity).toBe(2);
    });

    it('deve retornar 401 ao criar venda sem token JWT', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .send({
          ticketId,
          quantity: 1,
        })
        .expect(401);
    });

    it('deve retornar 404 quando ticket não existir', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticketId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        })
        .expect(404);
    });

    it('deve retornar 400 quando estoque for insuficiente', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticketId,
          quantity: 9999,
        })
        .expect(400);
    });

    it('deve retornar 400 para payload inválido', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticketId: '',
          quantity: 0,
        })
        .expect(400);
    });
  });

  describe('GET /sales/user/:userId', () => {
    beforeEach(async () => {
      await createSale();
    });

    it('deve listar vendas do usuário com sucesso e retornar 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales/user/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('deve retornar lista vazia para usuário sem vendas', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales/user/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('deve retornar 401 sem token JWT', async () => {
      await request(app.getHttpServer())
        .get(`/sales/user/${userId}`)
        .expect(401);
    });
  });

  describe('GET /sales/:id', () => {
    beforeEach(async () => {
      await createSale();
    });

    it('deve buscar venda por id com sucesso e retornar 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(saleId);
    });

    it('deve retornar 404 quando venda não existir', async () => {
      await request(app.getHttpServer())
        .get('/sales/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 401 sem token JWT', async () => {
      await request(app.getHttpServer()).get(`/sales/${saleId}`).expect(401);
    });
  });

  describe('POST /sales/:id/cancel', () => {
    beforeEach(async () => {
      await createSale();
    });

    it('deve cancelar venda com sucesso e retornar 200', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBeDefined();
    });

    it('deve retornar 400 quando venda já estiver cancelada', async () => {
      await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('deve retornar 404 quando venda não existir', async () => {
      await request(app.getHttpServer())
        .post('/sales/00000000-0000-0000-0000-000000000000/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 401 sem token JWT', async () => {
      await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .expect(401);
    });
  });
});
