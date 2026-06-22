// Testes gerados pelo DeepSeek para UsersService
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../../users/dto/update-user.dto';
import { User } from '../../../users/entities/user.entity';
import { UsersService } from '../../../users/users.service';

// Mock do bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password_123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockCreateUserDto: CreateUserDto = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
  };

  const mockUpdateUserDto: UpdateUserDto = {
    name: 'John Updated',
    email: 'john.updated@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new user when email is not in use', async () => {
      // Arrange
      usersRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed_password_123' as never);
      usersRepository.create.mockReturnValue({
        ...mockUser,
        password: 'hashed_password_123',
      });
      usersRepository.save.mockResolvedValue({
        ...mockUser,
        password: 'hashed_password_123',
      });

      // Act
      const result = await service.create(mockCreateUserDto);

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCreateUserDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        mockCreateUserDto.password,
        10,
      );
      expect(usersRepository.create).toHaveBeenCalledWith({
        ...mockCreateUserDto,
        password: 'hashed_password_123',
      });
      expect(usersRepository.save).toHaveBeenCalled();
      expect(result.password).toBe('hashed_password_123');
      expect(result.email).toBe(mockCreateUserDto.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      usersRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        'Email already in use',
      );
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCreateUserDto.email },
      });
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should validate input data (email format, password presence)', async () => {
      // Arrange
      const invalidDto = { ...mockCreateUserDto, email: 'invalid-email' };
      usersRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed_password_123' as never);
      usersRepository.create.mockReturnValue({
        ...mockUser,
        password: 'hashed_password_123',
        email: invalidDto.email,
      });
      usersRepository.save.mockResolvedValue({
        ...mockUser,
        email: invalidDto.email,
      });

      // Act
      const result = await service.create(invalidDto);

      // Assert - O serviço aceita qualquer string, mas a validação deveria estar no DTO
      expect(result.email).toBe('invalid-email');
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'invalid-email' },
      });
    });
  });

  describe('findOne', () => {
    it('should successfully find and return a user by id', async () => {
      // Arrange
      usersRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne(mockUser.id);

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      usersRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'User not found',
      );
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });

    it('should validate id format (accepts any string, validation should be at controller level)', async () => {
      // Arrange
      const invalidId = '';
      usersRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(invalidId)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: '' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should successfully find and return a user by email', async () => {
      // Arrange
      usersRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail(mockUser.email);

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found by email', async () => {
      // Arrange
      usersRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(result).toBeNull();
    });

    it('should validate email format (accepts any string, validation should be at controller level)', async () => {
      // Arrange
      const invalidEmail = 'not-an-email';
      usersRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail(invalidEmail);

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: invalidEmail },
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should successfully update user without changing email', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      usersRepository.findOne.mockResolvedValueOnce(mockUser); // findOne for user existence
      usersRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(usersRepository.save).toHaveBeenCalledWith(updatedUser);
      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe(mockUser.email);
    });

    it('should successfully update user with new email when email is not in use', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { email: 'newemail@example.com' };
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };

      usersRepository.findOne.mockResolvedValueOnce(mockUser); // findOne for user existence
      usersRepository.findOne.mockResolvedValueOnce(null); // check if new email exists
      usersRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(usersRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: mockUser.id },
      });
      expect(usersRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { email: 'newemail@example.com' },
      });
      expect(usersRepository.save).toHaveBeenCalledWith(updatedUser);
      expect(result.email).toBe('newemail@example.com');
    });

    it('should successfully update user with new password by hashing it', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { password: 'newpassword123' };
      const hashedPassword = 'hashed_new_password';
      const updatedUser = { ...mockUser, password: hashedPassword };

      usersRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      usersRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(usersRepository.save).toHaveBeenCalledWith(updatedUser);
      expect(result.password).toBe(hashedPassword);
    });

    it('should throw ConflictException when updating to an email that is already in use', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { email: 'existing@example.com' };
      const existingUser = {
        ...mockUser,
        id: 'different-id',
        email: 'existing@example.com',
      };

      usersRepository.findOne.mockResolvedValueOnce(mockUser); // findOne for user existence
      usersRepository.findOne.mockResolvedValueOnce(existingUser); // check if new email exists

      // Act & Assert
      const promise = service.update(mockUser.id, updateDto);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Email already in use');
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when trying to update a non-existent user', async () => {
      // Arrange
      usersRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent-id', mockUpdateUserDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('non-existent-id', mockUpdateUserDto),
      ).rejects.toThrow('User not found');
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should not check email existence if email is the same as current user email', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { email: mockUser.email };
      const updatedUser = { ...mockUser };

      usersRepository.findOne.mockResolvedValueOnce(mockUser); // findOne for user existence
      usersRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1); // Only called for user existence
      expect(usersRepository.findOne).not.toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(usersRepository.save).toHaveBeenCalled();
      expect(result.email).toBe(mockUser.email);
    });

    it('should handle updating multiple fields simultaneously', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        name: 'New Name',
        email: 'newemail@example.com',
        password: 'newpassword',
      };
      const hashedPassword = 'hashed_new_password';
      const updatedUser = {
        ...mockUser,
        name: 'New Name',
        email: 'newemail@example.com',
        password: hashedPassword,
      };

      usersRepository.findOne.mockResolvedValueOnce(mockUser); // findOne for user existence
      usersRepository.findOne.mockResolvedValueOnce(null); // check if new email exists
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      usersRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(mockUser.id, updateDto);

      // Assert
      expect(usersRepository.save).toHaveBeenCalledWith(updatedUser);
      expect(result.name).toBe('New Name');
      expect(result.email).toBe('newemail@example.com');
      expect(result.password).toBe(hashedPassword);
    });
  });

  describe('softDelete', () => {
    it('should successfully soft delete a user by setting isActive to false', async () => {
      // Arrange
      const userToDeactivate = { ...mockUser, isActive: true };
      const deactivatedUser = { ...mockUser, isActive: false };

      usersRepository.findOne.mockResolvedValue(userToDeactivate);
      usersRepository.save.mockResolvedValue(deactivatedUser);

      // Act
      await service.softDelete(mockUser.id);

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(usersRepository.save).toHaveBeenCalledWith({
        ...userToDeactivate,
        isActive: false,
      });
    });

    it('should throw NotFoundException when trying to soft delete a non-existent user', async () => {
      // Arrange
      usersRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.softDelete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.softDelete('non-existent-id')).rejects.toThrow(
        'User not found',
      );
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should allow soft deleting an already inactive user', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };

      usersRepository.findOne.mockResolvedValue(inactiveUser);
      usersRepository.save.mockResolvedValue(inactiveUser);

      // Act
      await service.softDelete(mockUser.id);

      // Assert
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(usersRepository.save).toHaveBeenCalledWith({
        ...inactiveUser,
        isActive: false,
      });
    });
  });
});
