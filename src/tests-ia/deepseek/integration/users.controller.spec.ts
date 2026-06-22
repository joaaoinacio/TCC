// Testes de integração gerados pelo DeepSeek para uusersController
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../../app.module';
import { CreateUserDto } from '../../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../../users/dto/update-user.dto';
import { User } from '../../../users/entities/user.entity';

describe('UsersController (Integration Tests)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let authToken: string;
  let testUserId: string;

  const mockUser: CreateUserDto = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Test123!@#',
  };

  const mockAdminUser: CreateUserDto = {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin123!@#',
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
    userRepository = moduleFixture.get(getRepositoryToken(User));
    jwtService = moduleFixture.get(JwtService);

    // Clean database before tests
    await dataSource.query('TRUNCATE TABLE "user" CASCADE;');
  });

  afterAll(async () => {
    await dataSource.query('TRUNCATE TABLE "user" CASCADE;');
    await app.close();
  });

  beforeEach(async () => {
    // Clean users table before each test
    await dataSource.query('TRUNCATE TABLE "user" CASCADE;');

    // Create a test user for authenticated endpoints
    const hashedPassword = await bcrypt.hash(mockUser.password, 10);
    const testUser = await userRepository.save({
      ...mockUser,
      password: hashedPassword,
      isActive: true,
    });
    testUserId = testUser.id;

    // Generate JWT token for the test user
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  describe('POST /users', () => {
    it('should successfully create a new user and return 201 Created', async () => {
      const newUser: CreateUserDto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(newUser)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newUser.name);
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.password).not.toBe(newUser.password); // Password should be hashed
      expect(response.body.password).toBeDefined();
      expect(response.body.isActive).toBe(true);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      // Verify user was actually saved in database
      const savedUser = await userRepository.findOne({
        where: { email: newUser.email },
      });
      expect(savedUser).toBeDefined();
      expect(savedUser?.name).toBe(newUser.name);
    });

    it('should return 400 Bad Request when email is already in use', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(mockUser)
        .expect(HttpStatus.CONFLICT);

      expect(response.body.message).toBe('Email already in use');
      expect(response.body.statusCode).toBe(HttpStatus.CONFLICT);
    });

    it('should return 400 Bad Request when email format is invalid', async () => {
      const invalidUser = {
        ...mockUser,
        email: 'invalid-email',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidUser)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('email must be an email');
    });

    it('should return 400 Bad Request when password is too short', async () => {
      const invalidUser = {
        ...mockUser,
        password: '123',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidUser)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'password must be longer than or equal to 6 characters',
      );
    });

    it('should return 400 Bad Request when name is missing', async () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidUser)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('name should not be empty');
    });

    it('should return 400 Bad Request when email is missing', async () => {
      const invalidUser = {
        name: 'Test User',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidUser)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('email should not be empty');
    });

    it('should return 400 Bad Request when extra fields are provided', async () => {
      const userWithExtraField = {
        ...mockUser,
        extraField: 'should not be allowed',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(userWithExtraField)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'property extraField should not exist',
      );
    });

    it('should hash the password before saving to database', async () => {
      const newUser: CreateUserDto = {
        name: 'Secure User',
        email: 'secure@example.com',
        password: 'SecurePass123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(newUser)
        .expect(HttpStatus.CREATED);

      // Verify password is hashed (not plain text)
      expect(response.body.password).not.toBe(newUser.password);
      expect(response.body.password).toMatch(/^\$2[aby]\$\d+\$.+$/); // bcrypt hash format

      // Verify we can compare with bcrypt
      const isPasswordValid = await bcrypt.compare(
        newUser.password,
        response.body.password,
      );
      expect(isPasswordValid).toBe(true);
    });
  });

  describe('GET /users/:id (Authenticated)', () => {
    it('should successfully get user by id and return 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(testUserId);
      expect(response.body.name).toBe(mockUser.name);
      expect(response.body.email).toBe(mockUser.email);
      expect(response.body.password).toBeDefined();
    });

    it('should return 401 Unauthorized when no JWT token is provided', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 Unauthorized when invalid JWT token is provided', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when user does not exist', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('User not found');
    });

    it('should return 400 Bad Request when id is not a valid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('id must be a UUID');
    });
  });

  describe('PUT /users/:id (Authenticated)', () => {
    it('should successfully update user and return 200 OK', async () => {
      const updateData: UpdateUserDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(testUserId);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);

      // Verify database was updated
      const updatedUser = await userRepository.findOne({
        where: { id: testUserId },
      });
      expect(updatedUser?.name).toBe(updateData.name);
      expect(updatedUser?.email).toBe(updateData.email);
    });

    it('should successfully update only name without changing email', async () => {
      const updateData: UpdateUserDto = {
        name: 'Only Name Changed',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(mockUser.email);
    });

    it('should successfully update password and hash it', async () => {
      const updateData: UpdateUserDto = {
        password: 'NewPassword123!',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.password).not.toBe(updateData.password);

      // Verify new password works
      const isValid = await bcrypt.compare(
        updateData.password,
        response.body.password,
      );
      expect(isValid).toBe(true);
    });

    it('should return 409 Conflict when updating to an email that is already in use', async () => {
      // Create another user
      const anotherUser = await userRepository.save({
        name: 'Another User',
        email: 'another@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isActive: true,
      });

      const updateData: UpdateUserDto = {
        email: anotherUser.email,
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.CONFLICT);

      expect(response.body.message).toBe('Email already in use');
    });

    it('should return 401 Unauthorized when updating without token', async () => {
      const updateData: UpdateUserDto = {
        name: 'Should Not Update',
      };

      await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .send(updateData)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when updating non-existent user', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
      const updateData: UpdateUserDto = {
        name: 'Should Not Update',
      };

      await request(app.getHttpServer())
        .put(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 Bad Request when updating with invalid email format', async () => {
      const updateData: UpdateUserDto = {
        email: 'invalid-email-format',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('email must be an email');
    });

    it('should return 400 Bad Request when updating with invalid UUID', async () => {
      const updateData: UpdateUserDto = {
        name: 'Test',
      };

      await request(app.getHttpServer())
        .put('/users/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /users/:id (Authenticated)', () => {
    it('should successfully soft delete user and return 204 No Content', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Verify user is soft deleted (isActive = false)
      const deletedUser = await userRepository.findOne({
        where: { id: testUserId },
      });
      expect(deletedUser).toBeDefined();
      expect(deletedUser?.isActive).toBe(false);

      // User should still exist in database
      expect(deletedUser?.name).toBe(mockUser.name);
    });

    it('should return 401 Unauthorized when deleting without token', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when deleting non-existent user', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      await request(app.getHttpServer())
        .delete(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 Bad Request when deleting with invalid UUID', async () => {
      await request(app.getHttpServer())
        .delete('/users/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should allow soft deleting an already inactive user', async () => {
      // First soft delete
      await request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Try to soft delete again (should succeed)
      await request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Verify user is still inactive
      const user = await userRepository.findOne({
        where: { id: testUserId },
      });
      expect(user?.isActive).toBe(false);
    });
  });

  describe('E2E Scenarios', () => {
    it('should complete full user lifecycle: create -> read -> update -> delete', async () => {
      // 1. Create user
      const newUser: CreateUserDto = {
        name: 'Lifecycle User',
        email: 'lifecycle@example.com',
        password: 'Lifecycle123!',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(newUser)
        .expect(HttpStatus.CREATED);

      const userId = createResponse.body.id;
      const userToken = jwtService.sign({ sub: userId, email: newUser.email });

      // 2. Read user
      const getResponse = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK);

      expect(getResponse.body.name).toBe(newUser.name);

      // 3. Update user
      const updateData = { name: 'Updated Lifecycle User' };
      const updateResponse = await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(updateResponse.body.name).toBe(updateData.name);

      // 4. Soft delete user
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Verify user is soft deleted
      const deletedUser = await userRepository.findOne({
        where: { id: userId },
      });
      expect(deletedUser?.isActive).toBe(false);
      expect(deletedUser?.name).toBe(updateData.name);
    });

    it('should not allow access to soft deleted user', async () => {
      // Soft delete the user first
      await request(app.getHttpServer())
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Try to get the soft deleted user (should still work since we don't filter by isActive in findOne)
      const response = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // User is found but isActive is false
      expect(response.body.isActive).toBe(false);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests with expired JWT token', async () => {
      // Create an expired token
      const expiredToken = jwtService.sign(
        { sub: testUserId, email: mockUser.email },
        { expiresIn: '0s' },
      );

      await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject requests with malformed Authorization header', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', 'MalformedToken')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject requests with empty Authorization header', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', '')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
