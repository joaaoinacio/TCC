// Testes de integração gerados pelo DeepSeek para usalesController
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../../app.module';
import { Event } from '../../../events/entities/event.entity';
import { CreateSaleDto } from '../../../sales/dto/create-sale.dto';
import { Sale } from '../../../sales/entities/sale.entity';
import { SaleStatus } from '../../../sales/enums/sale-status.enum';
import { Ticket } from '../../../tickets/entities/ticket.entity';
import { User } from '../../../users/entities/user.entity';

describe('SalesController (Integration Tests)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let saleRepository: Repository<Sale>;
  let userRepository: Repository<User>;
  let eventRepository: Repository<Event>;
  let ticketRepository: Repository<Ticket>;
  let jwtService: JwtService;
  let authToken: string;
  let testUser: User;
  let testEvent: Event;
  let testTicket: Ticket;
  let testSale: Sale;

  const mockUser = {
    name: 'Buyer User',
    email: 'buyer@example.com',
    password: 'Buyer123!@#',
  };

  const mockEvent = {
    name: 'Concert for Sale Test',
    description: 'Test event for sales',
    date: new Date('2025-12-31T20:00:00Z'),
    location: 'Test Arena',
    capacity: 1000,
    availableTickets: 1000,
    status: 'active',
  };

  const mockTicket = {
    name: 'VIP Ticket',
    price: 150.0,
    quantity: 100,
  };

  const mockCreateSaleDto: CreateSaleDto = {
    ticketId: '',
    quantity: 2,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get(DataSource);
    saleRepository = moduleFixture.get(getRepositoryToken(Sale));
    userRepository = moduleFixture.get(getRepositoryToken(User));
    eventRepository = moduleFixture.get(getRepositoryToken(Event));
    ticketRepository = moduleFixture.get(getRepositoryToken(Ticket));
    jwtService = moduleFixture.get(JwtService);

    // Clean database before tests
    await dataSource.query('TRUNCATE TABLE "sale" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "ticket" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "event" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "user" CASCADE;');
  });

  afterAll(async () => {
    await dataSource.query('TRUNCATE TABLE "sale" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "ticket" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "event" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "user" CASCADE;');
    await app.close();
  });

  beforeEach(async () => {
    // Clean tables before each test
    await dataSource.query('TRUNCATE TABLE "sale" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "ticket" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "event" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "user" CASCADE;');

    // Create a test user
    const hashedPassword = await bcrypt.hash(mockUser.password, 10);
    testUser = await userRepository.save({
      ...mockUser,
      password: hashedPassword,
      isActive: true,
    });

    // Generate JWT token for the test user
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });

    // Create a test event
    testEvent = await eventRepository.save({
      ...mockEvent,
      createdBy: testUser,
    });

    // Create a test ticket
    testTicket = await ticketRepository.save({
      ...mockTicket,
      event: testEvent,
    });

    mockCreateSaleDto.ticketId = testTicket.id;

    // Create a test sale for some endpoints
    const total = testTicket.price * 2;
    testSale = await saleRepository.save({
      user: testUser,
      ticket: testTicket,
      quantity: 2,
      total: total,
      status: SaleStatus.COMPLETED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('POST /sales (Authenticated)', () => {
    it('should successfully create a new sale and return 201 Created', async () => {
      const newSaleDto: CreateSaleDto = {
        ticketId: testTicket.id,
        quantity: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSaleDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.quantity).toBe(newSaleDto.quantity);
      expect(response.body.total).toBe(testTicket.price * newSaleDto.quantity);
      expect(response.body.status).toBe(SaleStatus.COMPLETED);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.ticket).toBeDefined();
      expect(response.body.ticket.id).toBe(testTicket.id);

      // Verify database updates
      const updatedTicket = await ticketRepository.findOne({
        where: { id: testTicket.id },
      });
      expect(updatedTicket?.quantity).toBe(
        testTicket.quantity - newSaleDto.quantity,
      );

      const updatedEvent = await eventRepository.findOne({
        where: { id: testEvent.id },
      });
      expect(updatedEvent?.availableTickets).toBe(
        testEvent.availableTickets - newSaleDto.quantity,
      );

      // Verify sale was saved
      const savedSale = await saleRepository.findOne({
        where: { id: response.body.id },
        relations: { user: true, ticket: true },
      });
      expect(savedSale).toBeDefined();
      expect(savedSale?.quantity).toBe(newSaleDto.quantity);
    });

    it('should return 401 Unauthorized when no JWT token is provided', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .send(mockCreateSaleDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 Unauthorized when invalid JWT token is provided', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', 'Bearer invalid-token')
        .send(mockCreateSaleDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when ticket does not exist', async () => {
      const invalidDto: CreateSaleDto = {
        ticketId: '123e4567-e89b-12d3-a456-426614174999',
        quantity: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Ticket not found');
    });

    it('should return 400 Bad Request when ticket has insufficient quantity', async () => {
      const insufficientDto: CreateSaleDto = {
        ticketId: testTicket.id,
        quantity: testTicket.quantity + 10,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(insufficientDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('Insufficient stock');
    });

    it('should return 400 Bad Request when event has insufficient available tickets', async () => {
      // Reduce event available tickets
      await eventRepository.update(testEvent.id, { availableTickets: 1 });

      const insufficientDto: CreateSaleDto = {
        ticketId: testTicket.id,
        quantity: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(insufficientDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('Not enough available tickets');
    });

    it('should return 400 Bad Request when quantity is less than or equal to zero', async () => {
      const invalidDto: CreateSaleDto = {
        ticketId: testTicket.id,
        quantity: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'quantity must be a positive number',
      );
    });

    it('should return 400 Bad Request when quantity is not a number', async () => {
      const invalidDto = {
        ticketId: testTicket.id,
        quantity: 'not-a-number',
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('quantity must be a number');
    });

    it('should return 400 Bad Request when ticketId is missing', async () => {
      const invalidDto = {
        quantity: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('ticketId should not be empty');
    });

    it('should return 400 Bad Request when ticketId is not a valid UUID', async () => {
      const invalidDto: CreateSaleDto = {
        ticketId: 'invalid-uuid',
        quantity: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('ticketId must be a UUID');
    });

    it('should return 400 Bad Request when extra fields are provided', async () => {
      const saleWithExtraField = {
        ...mockCreateSaleDto,
        extraField: 'should not be allowed',
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(saleWithExtraField)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'property extraField should not exist',
      );
    });

    it('should correctly calculate total based on ticket price and quantity', async () => {
      const quantities = [1, 2, 5, 10];

      for (const quantity of quantities) {
        const saleDto: CreateSaleDto = {
          ticketId: testTicket.id,
          quantity: quantity,
        };

        const response = await request(app.getHttpServer())
          .post('/sales')
          .set('Authorization', `Bearer ${authToken}`)
          .send(saleDto)
          .expect(HttpStatus.CREATED);

        expect(response.body.total).toBe(testTicket.price * quantity);
      }
    });
  });

  describe('GET /sales/user/:userId (Authenticated)', () => {
    it('should successfully return all sales for a user and return 200 OK', async () => {
      // Create additional sales for the user
      const anotherTicket = await ticketRepository.save({
        name: 'Standard Ticket',
        price: 100.0,
        quantity: 50,
        event: testEvent,
      });

      await saleRepository.save({
        user: testUser,
        ticket: anotherTicket,
        quantity: 1,
        total: 100.0,
        status: SaleStatus.COMPLETED,
      });

      const response = await request(app.getHttpServer())
        .get(`/sales/user/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('quantity');
      expect(response.body[0]).toHaveProperty('total');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('user');
      expect(response.body[0]).toHaveProperty('ticket');

      // Check sorting by createdAt DESC
      const dates = response.body.map((sale) => new Date(sale.createdAt));
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i] >= dates[i + 1]).toBe(true);
      }
    });

    it('should return empty array when user has no sales', async () => {
      // Create a new user with no sales
      const newUser = await userRepository.save({
        name: 'No Sales User',
        email: 'nosales@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .get(`/sales/user/${newUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should return 401 Unauthorized when no JWT token is provided', async () => {
      await request(app.getHttpServer())
        .get(`/sales/user/${testUser.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 Bad Request when userId is not a valid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales/user/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('userId must be a UUID');
    });
  });

  describe('GET /sales/:id (Authenticated)', () => {
    it('should successfully return a sale by id and return 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales/${testSale.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(testSale.id);
      expect(response.body.quantity).toBe(testSale.quantity);
      expect(response.body.total).toBe(testSale.total);
      expect(response.body.status).toBe(testSale.status);
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.ticket.id).toBe(testTicket.id);
    });

    it('should return 401 Unauthorized when no JWT token is provided', async () => {
      await request(app.getHttpServer())
        .get(`/sales/${testSale.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when sale does not exist', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      const response = await request(app.getHttpServer())
        .get(`/sales/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Sale not found');
    });

    it('should return 400 Bad Request when id is not a valid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('id must be a UUID');
    });
  });

  describe('POST /sales/:id/cancel (Authenticated)', () => {
    it('should successfully cancel a sale and return 200 OK', async () => {
      // Create a sale to cancel
      const initialTicketQuantity = testTicket.quantity;
      const initialEventTickets = testEvent.availableTickets;
      const saleToCancel = await saleRepository.save({
        user: testUser,
        ticket: testTicket,
        quantity: 2,
        total: testTicket.price * 2,
        status: SaleStatus.COMPLETED,
      });

      // Update ticket and event quantities to reflect the sale
      await ticketRepository.update(testTicket.id, {
        quantity: initialTicketQuantity - 2,
      });
      await eventRepository.update(testEvent.id, {
        availableTickets: initialEventTickets - 2,
      });

      const response = await request(app.getHttpServer())
        .post(`/sales/${saleToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(saleToCancel.id);
      expect(response.body.status).toBe(SaleStatus.CANCELLED);
      expect(response.body.quantity).toBe(saleToCancel.quantity);
      expect(response.body.total).toBe(saleToCancel.total);

      // Verify ticket quantity was restored
      const updatedTicket = await ticketRepository.findOne({
        where: { id: testTicket.id },
      });
      expect(updatedTicket?.quantity).toBe(initialTicketQuantity);

      // Verify event available tickets were restored
      const updatedEvent = await eventRepository.findOne({
        where: { id: testEvent.id },
      });
      expect(updatedEvent?.availableTickets).toBe(initialEventTickets);
    });

    it('should return 400 Bad Request when cancelling an already cancelled sale', async () => {
      const cancelledSale = await saleRepository.save({
        user: testUser,
        ticket: testTicket,
        quantity: 1,
        total: testTicket.price,
        status: SaleStatus.CANCELLED,
      });

      const response = await request(app.getHttpServer())
        .post(`/sales/${cancelledSale.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Sale is already cancelled');
    });

    it('should return 401 Unauthorized when cancelling without token', async () => {
      await request(app.getHttpServer())
        .post(`/sales/${testSale.id}/cancel`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when cancelling non-existent sale', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      const response = await request(app.getHttpServer())
        .post(`/sales/${nonExistentId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Sale not found');
    });

    it('should return 400 Bad Request when cancelling with invalid UUID', async () => {
      await request(app.getHttpServer())
        .post('/sales/invalid-uuid/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should restore ticket and event quantities correctly when cancelling', async () => {
      // Create a sale with specific quantity
      const saleQuantity = 3;
      const beforeTicketQuantity = testTicket.quantity;
      const beforeEventTickets = testEvent.availableTickets;

      const saleToCancel = await saleRepository.save({
        user: testUser,
        ticket: testTicket,
        quantity: saleQuantity,
        total: testTicket.price * saleQuantity,
        status: SaleStatus.COMPLETED,
      });

      // Update stocks to reflect sale
      await ticketRepository.update(testTicket.id, {
        quantity: beforeTicketQuantity - saleQuantity,
      });
      await eventRepository.update(testEvent.id, {
        availableTickets: beforeEventTickets - saleQuantity,
      });

      await request(app.getHttpServer())
        .post(`/sales/${saleToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      const updatedTicket = await ticketRepository.findOne({
        where: { id: testTicket.id },
      });
      const updatedEvent = await eventRepository.findOne({
        where: { id: testEvent.id },
      });

      expect(updatedTicket?.quantity).toBe(beforeTicketQuantity);
      expect(updatedEvent?.availableTickets).toBe(beforeEventTickets);
    });
  });

  describe('E2E Scenarios', () => {
    it('should complete full sales lifecycle: create -> read -> cancel', async () => {
      // 1. Create a new ticket and event for this test
      const freshEvent = await eventRepository.save({
        name: 'Fresh Event for Lifecycle',
        description: 'Testing full lifecycle',
        date: new Date('2025-12-31T20:00:00Z'),
        location: 'Test Location',
        capacity: 500,
        availableTickets: 500,
        status: 'active',
        createdBy: testUser,
      });

      const freshTicket = await ticketRepository.save({
        name: 'Lifecycle Ticket',
        price: 200.0,
        quantity: 50,
        event: freshEvent,
      });

      const createDto: CreateSaleDto = {
        ticketId: freshTicket.id,
        quantity: 2,
      };

      // 2. Create sale
      const createResponse = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(HttpStatus.CREATED);

      const saleId = createResponse.body.id;

      // 3. Get sale by ID
      const getResponse = await request(app.getHttpServer())
        .get(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(getResponse.body.id).toBe(saleId);
      expect(getResponse.body.quantity).toBe(createDto.quantity);
      expect(getResponse.body.status).toBe(SaleStatus.COMPLETED);

      // 4. Get sales by user
      const userSalesResponse = await request(app.getHttpServer())
        .get(`/sales/user/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(
        userSalesResponse.body.some((sale: Sale) => sale.id === saleId),
      ).toBe(true);

      // 5. Cancel sale
      const cancelResponse = await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(cancelResponse.body.status).toBe(SaleStatus.CANCELLED);
    });

    it('should prevent double purchase when stock is insufficient', async () => {
      // Create a ticket with limited quantity
      const limitedTicket = await ticketRepository.save({
        name: 'Limited Ticket',
        price: 50.0,
        quantity: 1, // Only 1 available
        event: testEvent,
      });

      const saleDto: CreateSaleDto = {
        ticketId: limitedTicket.id,
        quantity: 1,
      };

      // First purchase should succeed
      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(saleDto)
        .expect(HttpStatus.CREATED);

      // Second purchase should fail
      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(saleDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('Insufficient stock');
    });

    it('should handle multiple sales for different tickets', async () => {
      const anotherTicket = await ticketRepository.save({
        name: 'Another Ticket',
        price: 75.0,
        quantity: 20,
        event: testEvent,
      });

      const sale1Dto: CreateSaleDto = {
        ticketId: testTicket.id,
        quantity: 2,
      };

      const sale2Dto: CreateSaleDto = {
        ticketId: anotherTicket.id,
        quantity: 3,
      };

      const [sale1, sale2] = await Promise.all([
        request(app.getHttpServer())
          .post('/sales')
          .set('Authorization', `Bearer ${authToken}`)
          .send(sale1Dto),
        request(app.getHttpServer())
          .post('/sales')
          .set('Authorization', `Bearer ${authToken}`)
          .send(sale2Dto),
      ]);

      expect(sale1.status).toBe(HttpStatus.CREATED);
      expect(sale2.status).toBe(HttpStatus.CREATED);

      // Verify user sales
      const userSales = await request(app.getHttpServer())
        .get(`/sales/user/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(userSales.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests with expired JWT token', async () => {
      const expiredToken = jwtService.sign(
        { sub: testUser.id, email: testUser.email },
        { expiresIn: '0s' },
      );

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(mockCreateSaleDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject requests with malformed Authorization header', async () => {
      await request(app.getHttpServer())
        .get(`/sales/user/${testUser.id}`)
        .set('Authorization', 'MalformedToken')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject requests with empty Authorization header', async () => {
      await request(app.getHttpServer())
        .get(`/sales/user/${testUser.id}`)
        .set('Authorization', '')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'post', url: '/sales', body: mockCreateSaleDto },
        { method: 'get', url: `/sales/user/${testUser.id}` },
        { method: 'get', url: `/sales/${testSale.id}` },
        { method: 'post', url: `/sales/${testSale.id}/cancel` },
      ];

      for (const endpoint of endpoints) {
        const requestBuilder = request(app.getHttpServer())[endpoint.method](
          endpoint.url,
        );
        if (endpoint.body) {
          requestBuilder.send(endpoint.body);
        }
        await requestBuilder.expect(HttpStatus.UNAUTHORIZED);
      }
    });
  });

  describe('Business Rules Validation', () => {
    it('should prevent selling more tickets than available', async () => {
      const maxQuantity = testTicket.quantity;
      const excessiveDto: CreateSaleDto = {
        ticketId: testTicket.id,
        quantity: maxQuantity + 1,
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(excessiveDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('Insufficient stock');
    });

    it('should prevent selling more tickets than event capacity', async () => {
      const eventWithSmallCapacity = await eventRepository.save({
        name: 'Small Event',
        description: 'Limited capacity',
        date: new Date('2025-12-31T20:00:00Z'),
        location: 'Small Venue',
        capacity: 10,
        availableTickets: 10,
        status: 'active',
        createdBy: testUser,
      });

      const ticketForSmallEvent = await ticketRepository.save({
        name: 'Small Event Ticket',
        price: 100.0,
        quantity: 20, // More than event capacity
        event: eventWithSmallCapacity,
      });

      const excessiveDto: CreateSaleDto = {
        ticketId: ticketForSmallEvent.id,
        quantity: 15, // More than event capacity
      };

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(excessiveDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('Not enough available tickets');
    });

    it('should maintain data consistency with concurrent sales (sequential test)', async () => {
      const initialTicketQuantity = testTicket.quantity;
      const saleQuantity = 2;
      const numberOfSales = 3;
      const expectedRemaining =
        initialTicketQuantity - saleQuantity * numberOfSales;

      // Perform multiple sales sequentially
      for (let i = 0; i < numberOfSales; i++) {
        const saleDto: CreateSaleDto = {
          ticketId: testTicket.id,
          quantity: saleQuantity,
        };

        await request(app.getHttpServer())
          .post('/sales')
          .set('Authorization', `Bearer ${authToken}`)
          .send(saleDto)
          .expect(HttpStatus.CREATED);
      }

      const finalTicket = await ticketRepository.findOne({
        where: { id: testTicket.id },
      });
      expect(finalTicket?.quantity).toBe(expectedRemaining);
    });
  });
});
