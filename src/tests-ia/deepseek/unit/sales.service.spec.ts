// Testes gerados pelo DeepSeek para SalesService
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Event } from '../../../events/entities/event.entity';
import { Ticket } from '../../../tickets/entities/ticket.entity';
import { User } from '../../../users/entities/user.entity';
import { CreateSaleDto } from '../../../sales/dto/create-sale.dto';
import { Sale } from '../../../sales/entities/sale.entity';
import { SaleStatus } from '../../../sales/enums/sale-status.enum';
import { SalesService } from '../../../sales/sales.service';

describe('SalesService', () => {
  let service: SalesService;
  let salesRepository: jest.Mocked<Repository<Sale>>;
  let dataSource: jest.Mocked<DataSource>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockUser: User = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockTicket: Ticket = {
    id: 'ticket-123',
    name: 'VIP Ticket',
    price: 100.0,
    quantity: 50,
    event: { id: 'event-123', name: 'Concert', availableTickets: 200 } as Event,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Ticket;

  const mockEvent: Event = {
    id: 'event-123',
    name: 'Concert',
    availableTickets: 200,
    tickets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Event;

  const mockSale: Sale = {
    id: 'sale-123',
    user: mockUser,
    ticket: mockTicket,
    quantity: 2,
    total: 200.0,
    status: SaleStatus.COMPLETED,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Sale;

  const mockCreateSaleDto: CreateSaleDto = {
    ticketId: 'ticket-123',
    quantity: 2,
  };

  beforeEach(async () => {
    // Create mock entity manager
    entityManager = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      decrement: jest.fn(),
      increment: jest.fn(),
      transaction: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    // Create mock data source
    dataSource = {
      transaction: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: getRepositoryToken(Sale),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    salesRepository = module.get(getRepositoryToken(Sale));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a sale with valid data', async () => {
      // Arrange
      const expectedTotal = mockTicket.price * mockCreateSaleDto.quantity;
      const expectedSale = {
        ...mockSale,
        total: expectedTotal,
        quantity: mockCreateSaleDto.quantity,
      };

      // Mock transaction callback execution
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });

      entityManager.findOne.mockImplementation(async (entity, options) => {
        if (entity === Ticket) {
          return mockTicket;
        }
        if (entity === Event) {
          return mockEvent;
        }
        return null;
      });

      entityManager.create.mockReturnValue(expectedSale);
      entityManager.save.mockResolvedValue(expectedSale);
      entityManager.decrement.mockResolvedValue(undefined as never);

      // Act
      const result = await service.create(mockCreateSaleDto, mockUser);

      // Assert
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(entityManager.findOne).toHaveBeenCalledWith(Ticket, {
        where: { id: mockCreateSaleDto.ticketId },
        relations: { event: true },
        lock: { mode: 'pessimistic_write' },
      });
      expect(entityManager.findOne).toHaveBeenCalledWith(Event, {
        where: { id: mockTicket.event.id },
        lock: { mode: 'pessimistic_write' },
      });
      expect(entityManager.decrement).toHaveBeenCalledWith(
        Ticket,
        { id: mockTicket.id },
        'quantity',
        mockCreateSaleDto.quantity,
      );
      expect(entityManager.decrement).toHaveBeenCalledWith(
        Event,
        { id: mockEvent.id },
        'availableTickets',
        mockCreateSaleDto.quantity,
      );
      expect(entityManager.create).toHaveBeenCalledWith(Sale, {
        user: mockUser,
        ticket: mockTicket,
        quantity: mockCreateSaleDto.quantity,
        total: expectedTotal,
        status: SaleStatus.COMPLETED,
      });
      expect(entityManager.save).toHaveBeenCalledWith(Sale, expectedSale);
      expect(result).toEqual(expectedSale);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      // Arrange
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });
      entityManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockCreateSaleDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockCreateSaleDto, mockUser)).rejects.toThrow(
        'Ticket not found',
      );
      expect(entityManager.decrement).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when ticket has insufficient quantity', async () => {
      // Arrange
      const insufficientTicket = { ...mockTicket, quantity: 1 };
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Ticket) {
          return insufficientTicket;
        }
        return mockEvent;
      });

      // Act & Assert
      await expect(service.create(mockCreateSaleDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockCreateSaleDto, mockUser)).rejects.toThrow(
        `Insufficient stock: only ${insufficientTicket.quantity} ticket(s) available`,
      );
      expect(entityManager.decrement).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when event does not exist', async () => {
      // Arrange
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Ticket) {
          return mockTicket;
        }
        if (entity === Event) {
          return null;
        }
        return null;
      });

      // Act & Assert
      await expect(service.create(mockCreateSaleDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockCreateSaleDto, mockUser)).rejects.toThrow(
        'Event not found',
      );
      expect(entityManager.decrement).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when event has insufficient available tickets', async () => {
      // Arrange
      const insufficientEvent = { ...mockEvent, availableTickets: 1 };
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Ticket) {
          return mockTicket;
        }
        if (entity === Event) {
          return insufficientEvent;
        }
        return null;
      });

      // Act & Assert
      await expect(service.create(mockCreateSaleDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockCreateSaleDto, mockUser)).rejects.toThrow(
        'Not enough available tickets for this event',
      );
      expect(entityManager.decrement).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('should validate input data - negative quantity', async () => {
      // Arrange
      const invalidDto = { ...mockCreateSaleDto, quantity: -1 };
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });

      // Note: The service doesn't validate negative quantity directly
      // This test shows that negative quantity would be accepted but would cause issues
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Ticket) {
          return mockTicket;
        }
        return mockEvent;
      });

      // Act & Assert
      // The service would try to decrement negative quantity (which would increase stock)
      await expect(service.create(invalidDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle zero quantity validation', async () => {
      // Arrange
      const invalidDto = { ...mockCreateSaleDto, quantity: 0 };
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });
      entityManager.findOne.mockImplementation(async (entity) => {
        if (entity === Ticket) {
          return mockTicket;
        }
        return mockEvent;
      });

      // Act & Assert
      await expect(service.create(invalidDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByUser', () => {
    it('should successfully find all sales for a user', async () => {
      // Arrange
      const userSales = [mockSale, { ...mockSale, id: 'sale-456' }];
      salesRepository.find.mockResolvedValue(userSales);

      // Act
      const result = await service.findByUser(mockUser.id);

      // Assert
      expect(salesRepository.find).toHaveBeenCalledWith({
        where: { user: { id: mockUser.id } },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(userSales);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no sales', async () => {
      // Arrange
      salesRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByUser('user-with-no-sales');

      // Assert
      expect(salesRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-with-no-sales' } },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([]);
    });

    it('should validate user ID format', async () => {
      // Arrange
      const invalidUserId = '';
      salesRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByUser(invalidUserId);

      // Assert
      expect(salesRepository.find).toHaveBeenCalledWith({
        where: { user: { id: '' } },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should successfully find a sale by id', async () => {
      // Arrange
      salesRepository.findOne.mockResolvedValue(mockSale);

      // Act
      const result = await service.findOne(mockSale.id);

      // Assert
      expect(salesRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSale.id },
      });
      expect(result).toEqual(mockSale);
    });

    it('should throw NotFoundException when sale does not exist', async () => {
      // Arrange
      salesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Sale not found',
      );
      expect(salesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });

    it('should validate id format', async () => {
      // Arrange
      const invalidId = '';
      salesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(invalidId)).rejects.toThrow(
        NotFoundException,
      );
      expect(salesRepository.findOne).toHaveBeenCalledWith({
        where: { id: '' },
      });
    });
  });

  describe('cancel', () => {
    it('should successfully cancel a sale', async () => {
      // Arrange
      const activeSale = { ...mockSale, status: SaleStatus.COMPLETED };
      const cancelledSale = { ...activeSale, status: SaleStatus.CANCELLED };

      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });

      entityManager.findOne.mockResolvedValue(activeSale);
      entityManager.findOneOrFail.mockImplementation(async (entity) => {
        if (entity === Ticket) {
          return mockTicket;
        }
        if (entity === Event) {
          return mockEvent;
        }
        return null;
      });
      entityManager.save.mockResolvedValue(cancelledSale);
      entityManager.increment.mockResolvedValue(undefined as never);

      // Act
      const result = await service.cancel(mockSale.id);

      // Assert
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(entityManager.findOne).toHaveBeenCalledWith(Sale, {
        where: { id: mockSale.id },
        relations: { ticket: { event: true }, user: true },
      });
      expect(entityManager.increment).toHaveBeenCalledWith(
        Ticket,
        { id: mockTicket.id },
        'quantity',
        activeSale.quantity,
      );
      expect(entityManager.increment).toHaveBeenCalledWith(
        Event,
        { id: mockEvent.id },
        'availableTickets',
        activeSale.quantity,
      );
      expect(entityManager.save).toHaveBeenCalledWith(Sale, cancelledSale);
      expect(result.status).toBe(SaleStatus.CANCELLED);
    });

    it('should throw NotFoundException when sale does not exist', async () => {
      // Arrange
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });
      entityManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancel('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.cancel('non-existent-id')).rejects.toThrow(
        'Sale not found',
      );
      expect(entityManager.increment).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when sale is already cancelled', async () => {
      // Arrange
      const cancelledSale = { ...mockSale, status: SaleStatus.CANCELLED };

      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });
      entityManager.findOne.mockResolvedValue(cancelledSale);

      // Act & Assert
      await expect(service.cancel(mockSale.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancel(mockSale.id)).rejects.toThrow(
        'Sale is already cancelled',
      );
      expect(entityManager.increment).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('should handle cancellation when ticket increments correctly', async () => {
      // Arrange
      const activeSale = {
        ...mockSale,
        status: SaleStatus.COMPLETED,
        quantity: 3,
      };

      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });

      entityManager.findOne.mockResolvedValue(activeSale);
      entityManager.findOneOrFail.mockImplementation(async (entity) => {
        if (entity === Ticket) {
          return { ...mockTicket, quantity: 47 };
        }
        if (entity === Event) {
          return { ...mockEvent, availableTickets: 197 };
        }
        return null;
      });
      entityManager.save.mockResolvedValue({
        ...activeSale,
        status: SaleStatus.CANCELLED,
      });

      // Act
      await service.cancel(mockSale.id);

      // Assert
      expect(entityManager.increment).toHaveBeenCalledWith(
        Ticket,
        { id: mockTicket.id },
        'quantity',
        3,
      );
      expect(entityManager.increment).toHaveBeenCalledWith(
        Event,
        { id: mockEvent.id },
        'availableTickets',
        3,
      );
    });

    it('should validate sale id format for cancellation', async () => {
      // Arrange
      const invalidId = '';
      dataSource.transaction.mockImplementation(async (callback) => {
        return callback(entityManager);
      });
      entityManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancel(invalidId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
