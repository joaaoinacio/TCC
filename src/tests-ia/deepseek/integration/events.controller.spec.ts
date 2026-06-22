// Testes de integração gerados pelo DeepSeek para ueventsController
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../../app.module';
import { CreateEventDto } from '../../../events/dto/create-event.dto';
import { UpdateEventDto } from '../../../events/dto/update-event.dto';
import { Event } from '../../../events/entities/event.entity';
import { EventStatus } from '../../../events/enums/event-status.enum';
import { User } from '../../../users/entities/user.entity';

describe('EventsController (Integration Tests)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let eventRepository: Repository<Event>;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let authToken: string;
  let testUser: User;
  let testEvent: Event;

  const mockUser = {
    name: 'Event Creator',
    email: 'creator@example.com',
    password: 'Creator123!@#',
  };

  const mockCreateEventDto: CreateEventDto = {
    name: 'Tech Conference 2025',
    description: 'Annual technology conference',
    date: '2025-06-15T09:00:00Z',
    location: 'Convention Center',
    capacity: 500,
  };

  const mockUpdateEventDto: UpdateEventDto = {
    name: 'Updated Tech Conference 2025',
    description: 'Updated annual technology conference',
    date: '2025-06-16T10:00:00Z',
    location: 'Updated Convention Center',
    capacity: 600,
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
    eventRepository = moduleFixture.get(getRepositoryToken(Event));
    userRepository = moduleFixture.get(getRepositoryToken(User));
    jwtService = moduleFixture.get(JwtService);

    // Clean database before tests
    await dataSource.query('TRUNCATE TABLE "event" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "user" CASCADE;');
  });

  afterAll(async () => {
    await dataSource.query('TRUNCATE TABLE "event" CASCADE;');
    await dataSource.query('TRUNCATE TABLE "user" CASCADE;');
    await app.close();
  });

  beforeEach(async () => {
    // Clean tables before each test
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

    // Create a test event for authenticated endpoints
    testEvent = await eventRepository.save({
      ...mockCreateEventDto,
      date: new Date(mockCreateEventDto.date),
      availableTickets: mockCreateEventDto.capacity,
      status: EventStatus.ACTIVE,
      createdBy: testUser,
    });
  });

  describe('GET /events', () => {
    it('should successfully return all events and return 200 OK', async () => {
      // Create additional events
      await eventRepository.save({
        name: 'Jazz Festival',
        description: 'Music festival',
        date: new Date('2025-07-20T18:00:00Z'),
        location: 'Central Park',
        capacity: 1000,
        availableTickets: 1000,
        status: EventStatus.ACTIVE,
        createdBy: testUser,
      });

      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('description');
      expect(response.body[0]).toHaveProperty('date');
      expect(response.body[0]).toHaveProperty('location');
      expect(response.body[0]).toHaveProperty('capacity');
      expect(response.body[0]).toHaveProperty('availableTickets');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should return empty array when no events exist', async () => {
      await eventRepository.clear();

      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should return events with correct data types', async () => {
      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(HttpStatus.OK);

      expect(typeof response.body[0].id).toBe('string');
      expect(typeof response.body[0].name).toBe('string');
      expect(typeof response.body[0].capacity).toBe('number');
      expect(typeof response.body[0].availableTickets).toBe('number');
      expect(new Date(response.body[0].date)).toBeInstanceOf(Date);
    });
  });

  describe('GET /events/:id', () => {
    it('should successfully return an event by id and return 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get(`/events/${testEvent.id}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(testEvent.id);
      expect(response.body.name).toBe(testEvent.name);
      expect(response.body.description).toBe(testEvent.description);
      expect(response.body.location).toBe(testEvent.location);
      expect(response.body.capacity).toBe(testEvent.capacity);
      expect(response.body.availableTickets).toBe(testEvent.availableTickets);
      expect(response.body.status).toBe(EventStatus.ACTIVE);
    });

    it('should return 404 Not Found when event does not exist', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      const response = await request(app.getHttpServer())
        .get(`/events/${nonExistentId}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Event not found');
    });

    it('should return 400 Bad Request when id is not a valid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/events/invalid-id-format')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('id must be a UUID');
    });
  });

  describe('POST /events (Authenticated)', () => {
    it('should successfully create a new event and return 201 Created', async () => {
      const newEvent: CreateEventDto = {
        name: 'Summer Music Festival',
        description: 'Outdoor music festival',
        date: '2025-08-10T14:00:00Z',
        location: 'Beach Park',
        capacity: 2000,
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEvent)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newEvent.name);
      expect(response.body.description).toBe(newEvent.description);
      expect(response.body.location).toBe(newEvent.location);
      expect(response.body.capacity).toBe(newEvent.capacity);
      expect(response.body.availableTickets).toBe(newEvent.capacity);
      expect(response.body.status).toBe(EventStatus.ACTIVE);
      expect(response.body.createdBy).toBeDefined();
      expect(response.body.createdBy.id).toBe(testUser.id);
      expect(new Date(response.body.date)).toEqual(new Date(newEvent.date));

      // Verify event was actually saved in database
      const savedEvent = await eventRepository.findOne({
        where: { id: response.body.id },
        relations: { createdBy: true },
      });
      expect(savedEvent).toBeDefined();
      expect(savedEvent?.name).toBe(newEvent.name);
      expect(savedEvent?.createdBy.id).toBe(testUser.id);
    });

    it('should return 401 Unauthorized when no JWT token is provided', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send(mockCreateEventDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 Unauthorized when invalid JWT token is provided', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', 'Bearer invalid-token')
        .send(mockCreateEventDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 Bad Request when date is invalid', async () => {
      const invalidEvent = {
        ...mockCreateEventDto,
        date: 'invalid-date',
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('date must be a valid ISO date');
    });

    it('should return 400 Bad Request when capacity is negative', async () => {
      const invalidEvent = {
        ...mockCreateEventDto,
        capacity: -100,
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'capacity must be a positive number',
      );
    });

    it('should return 400 Bad Request when capacity is not a number', async () => {
      const invalidEvent = {
        ...mockCreateEventDto,
        capacity: 'not-a-number',
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('capacity must be a number');
    });

    it('should return 400 Bad Request when name is missing', async () => {
      const invalidEvent = {
        description: 'Missing name',
        date: '2025-12-31T20:00:00Z',
        location: 'Somewhere',
        capacity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('name should not be empty');
    });

    it('should return 400 Bad Request when date is missing', async () => {
      const invalidEvent = {
        name: 'Missing Date',
        description: 'Event without date',
        location: 'Somewhere',
        capacity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('date should not be empty');
    });

    it('should return 400 Bad Request when location is missing', async () => {
      const invalidEvent = {
        name: 'Missing Location',
        description: 'Event without location',
        date: '2025-12-31T20:00:00Z',
        capacity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('location should not be empty');
    });

    it('should return 400 Bad Request when capacity is zero', async () => {
      const invalidEvent = {
        ...mockCreateEventDto,
        capacity: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'capacity must be a positive number',
      );
    });

    it('should return 400 Bad Request when extra fields are provided', async () => {
      const eventWithExtraField = {
        ...mockCreateEventDto,
        extraField: 'should not be allowed',
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventWithExtraField)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'property extraField should not exist',
      );
    });
  });

  describe('PUT /events/:id (Authenticated)', () => {
    it('should successfully update an event and return 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .put(`/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockUpdateEventDto)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(testEvent.id);
      expect(response.body.name).toBe(mockUpdateEventDto.name);
      expect(response.body.description).toBe(mockUpdateEventDto.description);
      expect(response.body.location).toBe(mockUpdateEventDto.location);
      expect(response.body.capacity).toBe(mockUpdateEventDto.capacity);
      expect(new Date(response.body.date)).toEqual(
        new Date(mockUpdateEventDto.date!),
      );

      // Verify database was updated
      const updatedEvent = await eventRepository.findOne({
        where: { id: testEvent.id },
      });
      expect(updatedEvent?.name).toBe(mockUpdateEventDto.name);
      expect(updatedEvent?.description).toBe(mockUpdateEventDto.description);
    });

    it('should successfully update only name without changing other fields', async () => {
      const updateData: UpdateEventDto = {
        name: 'Only Name Changed',
      };

      const response = await request(app.getHttpServer())
        .put(`/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(testEvent.description);
      expect(response.body.location).toBe(testEvent.location);
      expect(response.body.capacity).toBe(testEvent.capacity);
      expect(response.body.date).toBe(testEvent.date.toISOString());
    });

    it('should successfully update event capacity when no tickets sold', async () => {
      const updateData: UpdateEventDto = {
        capacity: 800,
      };

      const response = await request(app.getHttpServer())
        .put(`/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.capacity).toBe(800);
      expect(response.body.availableTickets).toBe(800);
    });

    it('should return 401 Unauthorized when updating without token', async () => {
      await request(app.getHttpServer())
        .put(`/events/${testEvent.id}`)
        .send(mockUpdateEventDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when updating non-existent event', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      await request(app.getHttpServer())
        .put(`/events/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockUpdateEventDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 Bad Request when updating with invalid UUID', async () => {
      await request(app.getHttpServer())
        .put('/events/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockUpdateEventDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 Bad Request when updating with invalid date format', async () => {
      const updateData: UpdateEventDto = {
        date: 'invalid-date',
      };

      const response = await request(app.getHttpServer())
        .put(`/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('date must be a valid ISO date');
    });

    it('should return 400 Bad Request when updating with negative capacity', async () => {
      const updateData: UpdateEventDto = {
        capacity: -100,
      };

      const response = await request(app.getHttpServer())
        .put(`/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'capacity must be a positive number',
      );
    });
  });

  describe('POST /events/:id/cancel (Authenticated)', () => {
    it('should successfully cancel an active event with no tickets sold and return 200 OK', async () => {
      // Create event with no tickets sold
      const eventToCancel = await eventRepository.save({
        name: 'Event to Cancel',
        description: 'Will be cancelled',
        date: new Date('2025-09-01T10:00:00Z'),
        location: 'Test Location',
        capacity: 100,
        availableTickets: 100,
        status: EventStatus.ACTIVE,
        createdBy: testUser,
      });

      const response = await request(app.getHttpServer())
        .post(`/events/${eventToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(eventToCancel.id);
      expect(response.body.status).toBe(EventStatus.CANCELLED);
      expect(response.body.capacity).toBe(eventToCancel.capacity);
      expect(response.body.availableTickets).toBe(
        eventToCancel.availableTickets,
      );

      // Verify database was updated
      const cancelledEvent = await eventRepository.findOne({
        where: { id: eventToCancel.id },
      });
      expect(cancelledEvent?.status).toBe(EventStatus.CANCELLED);
    });

    it('should return 400 Bad Request when cancelling event that already has tickets sold', async () => {
      // Create event with sold tickets (availableTickets < capacity)
      const eventWithSales = await eventRepository.save({
        name: 'Event with Sales',
        description: 'Has sold tickets',
        date: new Date('2025-10-01T10:00:00Z'),
        location: 'Test Location',
        capacity: 100,
        availableTickets: 75, // 25 tickets sold
        status: EventStatus.ACTIVE,
        createdBy: testUser,
      });

      const response = await request(app.getHttpServer())
        .post(`/events/${eventWithSales.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'Cannot cancel event with 25 ticket(s) already sold',
      );
    });

    it('should return 400 Bad Request when cancelling an already cancelled event', async () => {
      // Create and cancel an event
      const eventToCancel = await eventRepository.save({
        name: 'Already Cancelled Event',
        description: 'Will be cancelled twice',
        date: new Date('2025-11-01T10:00:00Z'),
        location: 'Test Location',
        capacity: 50,
        availableTickets: 50,
        status: EventStatus.CANCELLED,
        createdBy: testUser,
      });

      const response = await request(app.getHttpServer())
        .post(`/events/${eventToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Event is already cancelled');
    });

    it('should return 401 Unauthorized when cancelling without token', async () => {
      await request(app.getHttpServer())
        .post(`/events/${testEvent.id}/cancel`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when cancelling non-existent event', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      await request(app.getHttpServer())
        .post(`/events/${nonExistentId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 Bad Request when cancelling with invalid UUID', async () => {
      await request(app.getHttpServer())
        .post('/events/invalid-uuid/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('E2E Scenarios', () => {
    it('should complete full event lifecycle: create -> read -> update -> cancel', async () => {
      // 1. Create event
      const newEvent: CreateEventDto = {
        name: 'Lifecycle Event',
        description: 'Testing full lifecycle',
        date: '2025-12-25T20:00:00Z',
        location: 'Lifecycle Location',
        capacity: 300,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEvent)
        .expect(HttpStatus.CREATED);

      const eventId = createResponse.body.id;

      // 2. Read event
      const getResponse = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .expect(HttpStatus.OK);

      expect(getResponse.body.name).toBe(newEvent.name);

      // 3. Update event
      const updateData = { name: 'Updated Lifecycle Event' };
      const updateResponse = await request(app.getHttpServer())
        .put(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(updateResponse.body.name).toBe(updateData.name);

      // 4. Cancel event
      const cancelResponse = await request(app.getHttpServer())
        .post(`/events/${eventId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(cancelResponse.body.status).toBe(EventStatus.CANCELLED);
    });

    it('should list events and show cancelled events', async () => {
      // Create active event
      const activeEvent = await eventRepository.save({
        name: 'Active Event',
        description: 'Still active',
        date: new Date('2025-12-31T20:00:00Z'),
        location: 'Active Location',
        capacity: 100,
        availableTickets: 100,
        status: EventStatus.ACTIVE,
        createdBy: testUser,
      });

      // Create cancelled event
      const cancelledEvent = await eventRepository.save({
        name: 'Cancelled Event',
        description: 'Already cancelled',
        date: new Date('2025-12-31T20:00:00Z'),
        location: 'Cancelled Location',
        capacity: 100,
        availableTickets: 100,
        status: EventStatus.CANCELLED,
        createdBy: testUser,
      });

      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(HttpStatus.OK);

      const events = response.body;
      expect(events.some((e: Event) => e.id === activeEvent.id)).toBe(true);
      expect(events.some((e: Event) => e.id === cancelledEvent.id)).toBe(true);

      const cancelledEventFound = events.find(
        (e: Event) => e.id === cancelledEvent.id,
      );
      expect(cancelledEventFound.status).toBe(EventStatus.CANCELLED);
    });

    it('should handle concurrent event creation by different users', async () => {
      // Create second user
      const secondUser = await userRepository.save({
        name: 'Second User',
        email: 'second@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isActive: true,
      });
      const secondUserToken = jwtService.sign({
        sub: secondUser.id,
        email: secondUser.email,
      });

      // Create event with first user
      const event1Response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...mockCreateEventDto, name: 'First User Event' })
        .expect(HttpStatus.CREATED);

      // Create event with second user
      const event2Response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ ...mockCreateEventDto, name: 'Second User Event' })
        .expect(HttpStatus.CREATED);

      expect(event1Response.body.createdBy.id).toBe(testUser.id);
      expect(event2Response.body.createdBy.id).toBe(secondUser.id);
    });
  });

  describe('Public vs Protected Routes', () => {
    it('should allow GET endpoints without authentication', async () => {
      await request(app.getHttpServer()).get('/events').expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get(`/events/${testEvent.id}`)
        .expect(HttpStatus.OK);
    });

    it('should require authentication for POST, PUT, and cancel endpoints', async () => {
      // POST
      await request(app.getHttpServer())
        .post('/events')
        .send(mockCreateEventDto)
        .expect(HttpStatus.UNAUTHORIZED);

      // PUT
      await request(app.getHttpServer())
        .put(`/events/${testEvent.id}`)
        .send(mockUpdateEventDto)
        .expect(HttpStatus.UNAUTHORIZED);

      // Cancel
      await request(app.getHttpServer())
        .post(`/events/${testEvent.id}/cancel`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
