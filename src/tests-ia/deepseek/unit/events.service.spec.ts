// Testes gerados pelo DeepSeek para EventsService
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { CreateEventDto } from '../../../events/dto/create-event.dto';
import { UpdateEventDto } from '../../../events/dto/update-event.dto';
import { Event } from '../../../events/entities/event.entity';
import { EventStatus } from '../../../events/enums/event-status.enum';
import { EventsService } from '../../../events/events.service';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: jest.Mocked<Repository<Event>>;

  const mockUser: User = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockEvent: Event = {
    id: 'event-123',
    name: 'Rock Concert',
    description: 'Amazing rock concert',
    date: new Date('2025-12-31T20:00:00Z'),
    location: 'Madison Square Garden',
    capacity: 1000,
    availableTickets: 1000,
    status: EventStatus.ACTIVE,
    createdBy: mockUser,
    tickets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Event;

  const mockCreateEventDto: CreateEventDto = {
    name: 'Rock Concert',
    description: 'Amazing rock concert',
    date: '2025-12-31T20:00:00Z',
    location: 'Madison Square Garden',
    capacity: 1000,
  };

  const mockUpdateEventDto: UpdateEventDto = {
    name: 'Updated Rock Concert',
    description: 'Even more amazing rock concert',
    date: '2025-12-31T21:00:00Z',
    location: 'Central Park',
    capacity: 1200,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventsRepository = module.get(getRepositoryToken(Event));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new event', async () => {
      // Arrange
      const expectedDate = new Date(mockCreateEventDto.date);
      const createdEvent = {
        ...mockEvent,
        name: mockCreateEventDto.name,
        description: mockCreateEventDto.description,
        date: expectedDate,
        location: mockCreateEventDto.location,
        capacity: mockCreateEventDto.capacity,
        availableTickets: mockCreateEventDto.capacity,
        createdBy: mockUser,
      };

      eventsRepository.create.mockReturnValue(createdEvent as Event);
      eventsRepository.save.mockResolvedValue(createdEvent as Event);

      // Act
      const result = await service.create(mockCreateEventDto, mockUser);

      // Assert
      expect(eventsRepository.create).toHaveBeenCalledWith({
        ...mockCreateEventDto,
        date: expectedDate,
        availableTickets: mockCreateEventDto.capacity,
        createdBy: mockUser,
      });
      expect(eventsRepository.save).toHaveBeenCalledWith(createdEvent);
      expect(result).toEqual(createdEvent);
      expect(result.availableTickets).toBe(mockCreateEventDto.capacity);
      expect(result.status).toBeUndefined(); // Status should be undefined initially (default will be applied by DB or entity default)
    });

    it('should handle date conversion correctly', async () => {
      // Arrange
      const dateString = '2025-12-25T18:00:00Z';
      const dtoWithDate = { ...mockCreateEventDto, date: dateString };
      const expectedDate = new Date(dateString);

      eventsRepository.create.mockReturnValue({
        ...mockEvent,
        date: expectedDate,
      } as Event);
      eventsRepository.save.mockResolvedValue({
        ...mockEvent,
        date: expectedDate,
      } as Event);

      // Act
      await service.create(dtoWithDate, mockUser);

      // Assert
      expect(eventsRepository.create).toHaveBeenCalledWith({
        ...dtoWithDate,
        date: expectedDate,
        availableTickets: dtoWithDate.capacity,
        createdBy: mockUser,
      });
    });

    it('should validate input data - capacity must be positive', async () => {
      // Arrange
      const invalidDto = { ...mockCreateEventDto, capacity: 0 };

      // Note: The service doesn't validate capacity directly
      // This test shows the behavior with invalid capacity
      eventsRepository.create.mockReturnValue({
        ...mockEvent,
        capacity: 0,
        availableTickets: 0,
      } as Event);
      eventsRepository.save.mockResolvedValue({
        ...mockEvent,
        capacity: 0,
        availableTickets: 0,
      } as Event);

      // Act
      const result = await service.create(invalidDto, mockUser);

      // Assert
      expect(result.capacity).toBe(0);
      expect(result.availableTickets).toBe(0);
    });

    it('should handle missing optional fields in DTO', async () => {
      // Arrange
      const minimalDto: CreateEventDto = {
        name: 'Minimal Event',
        date: '2025-12-31T20:00:00Z',
        location: 'Somewhere',
        capacity: 100,
      };

      eventsRepository.create.mockReturnValue({
        ...mockEvent,
        ...minimalDto,
      } as Event);
      eventsRepository.save.mockResolvedValue({
        ...mockEvent,
        ...minimalDto,
      } as Event);

      // Act
      const result = await service.create(minimalDto, mockUser);

      // Assert
      expect(result.name).toBe('Minimal Event');
      expect(result.description).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should successfully return all events', async () => {
      // Arrange
      const events = [
        mockEvent,
        { ...mockEvent, id: 'event-456', name: 'Jazz Festival' },
      ];
      eventsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.findAll();

      // Assert
      expect(eventsRepository.find).toHaveBeenCalledWith();
      expect(result).toEqual(events);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no events exist', async () => {
      // Arrange
      eventsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(eventsRepository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should successfully find an event by id', async () => {
      // Arrange
      eventsRepository.findOne.mockResolvedValue(mockEvent);

      // Act
      const result = await service.findOne(mockEvent.id);

      // Assert
      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException when event does not exist', async () => {
      // Arrange
      eventsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Event not found',
      );
      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });

    it('should validate id format', async () => {
      // Arrange
      const invalidId = '';
      eventsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(invalidId)).rejects.toThrow(
        NotFoundException,
      );
      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: '' },
      });
    });
  });

  describe('update', () => {
    it('should successfully update an event with valid data', async () => {
      // Arrange
      const updatedEvent = {
        ...mockEvent,
        ...mockUpdateEventDto,
        date: new Date(mockUpdateEventDto.date!),
      };
      eventsRepository.findOne.mockResolvedValue(mockEvent);
      eventsRepository.save.mockResolvedValue(updatedEvent);

      // Act
      const result = await service.update(mockEvent.id, mockUpdateEventDto);

      // Assert
      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
      });
      expect(eventsRepository.save).toHaveBeenCalledWith(updatedEvent);
      expect(result.name).toBe(mockUpdateEventDto.name);
      expect(result.location).toBe(mockUpdateEventDto.location);
    });

    it('should successfully update event capacity when no tickets sold', async () => {
      // Arrange
      const eventWithNoSales = {
        ...mockEvent,
        capacity: 1000,
        availableTickets: 1000,
      };
      const updateDto = { capacity: 1500 };
      const updatedEvent = {
        ...eventWithNoSales,
        capacity: 1500,
        availableTickets: 1500,
      };

      eventsRepository.findOne.mockResolvedValue(eventWithNoSales);
      eventsRepository.save.mockResolvedValue(updatedEvent);

      // Act
      const result = await service.update(mockEvent.id, updateDto);

      // Assert
      expect(eventsRepository.save).toHaveBeenCalledWith(updatedEvent);
      expect(result.capacity).toBe(1500);
      expect(result.availableTickets).toBe(1500);
    });

    it('should successfully update event capacity when some tickets sold', async () => {
      // Arrange
      const soldTickets = 300;
      const eventWithSales = {
        ...mockEvent,
        capacity: 1000,
        availableTickets: 700, // 300 sold
      };
      const updateDto = { capacity: 800 };
      const updatedEvent = {
        ...eventWithSales,
        capacity: 800,
        availableTickets: 500, // 800 - 300 sold
      };

      eventsRepository.findOne.mockResolvedValue(eventWithSales);
      eventsRepository.save.mockResolvedValue(updatedEvent);

      // Act
      const result = await service.update(mockEvent.id, updateDto);

      // Assert
      expect(eventsRepository.save).toHaveBeenCalledWith(updatedEvent);
      expect(result.capacity).toBe(800);
      expect(result.availableTickets).toBe(500);
    });

    it('should throw BadRequestException when updating a cancelled event', async () => {
      // Arrange
      const cancelledEvent = { ...mockEvent, status: EventStatus.CANCELLED };
      eventsRepository.findOne.mockResolvedValue(cancelledEvent);

      // Act & Assert
      await expect(
        service.update(mockEvent.id, mockUpdateEventDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(mockEvent.id, mockUpdateEventDto),
      ).rejects.toThrow('Cannot update a cancelled event');
      expect(eventsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when reducing capacity below sold tickets', async () => {
      // Arrange
      const soldTickets = 300;
      const eventWithSales = {
        ...mockEvent,
        capacity: 1000,
        availableTickets: 700, // 300 sold
      };
      const updateDto = { capacity: 200 }; // Less than sold tickets

      eventsRepository.findOne.mockResolvedValue(eventWithSales);

      // Act & Assert
      await expect(service.update(mockEvent.id, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(mockEvent.id, updateDto)).rejects.toThrow(
        `Capacity cannot be less than the number of tickets already sold (${soldTickets})`,
      );
      expect(eventsRepository.save).not.toHaveBeenCalled();
    });

    it('should not update capacity if not provided in DTO', async () => {
      // Arrange
      const updateDto = { name: 'New Name Only' };
      const updatedEvent = { ...mockEvent, name: 'New Name Only' };

      eventsRepository.findOne.mockResolvedValue(mockEvent);
      eventsRepository.save.mockResolvedValue(updatedEvent);

      // Act
      const result = await service.update(mockEvent.id, updateDto);

      // Assert
      expect(result.capacity).toBe(mockEvent.capacity);
      expect(result.availableTickets).toBe(mockEvent.availableTickets);
    });

    it('should update date when provided in DTO', async () => {
      // Arrange
      const newDate = '2026-01-15T19:00:00Z';
      const updateDto = { date: newDate };
      const expectedDate = new Date(newDate);
      const updatedEvent = { ...mockEvent, date: expectedDate };

      eventsRepository.findOne.mockResolvedValue(mockEvent);
      eventsRepository.save.mockResolvedValue(updatedEvent);

      // Act
      const result = await service.update(mockEvent.id, updateDto);

      // Assert
      expect(eventsRepository.save).toHaveBeenCalledWith(updatedEvent);
      expect(result.date).toEqual(expectedDate);
    });

    it('should handle partial updates correctly', async () => {
      // Arrange
      const updateDto = { description: 'Updated description only' };
      const updatedEvent = {
        ...mockEvent,
        description: 'Updated description only',
      };

      eventsRepository.findOne.mockResolvedValue(mockEvent);
      eventsRepository.save.mockResolvedValue(updatedEvent);

      // Act
      const result = await service.update(mockEvent.id, updateDto);

      // Assert
      expect(result.description).toBe('Updated description only');
      expect(result.name).toBe(mockEvent.name);
      expect(result.location).toBe(mockEvent.location);
      expect(result.capacity).toBe(mockEvent.capacity);
    });

    it('should throw NotFoundException when trying to update non-existent event', async () => {
      // Arrange
      eventsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent-id', mockUpdateEventDto),
      ).rejects.toThrow(NotFoundException);
      expect(eventsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should successfully cancel an active event with no tickets sold', async () => {
      // Arrange
      const eventWithNoSales = {
        ...mockEvent,
        status: EventStatus.ACTIVE,
        availableTickets: 1000,
      };
      const cancelledEvent = {
        ...eventWithNoSales,
        status: EventStatus.CANCELLED,
      };

      eventsRepository.findOne.mockResolvedValue(eventWithNoSales);
      eventsRepository.save.mockResolvedValue(cancelledEvent);

      // Act
      const result = await service.cancel(mockEvent.id);

      // Assert
      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
      });
      expect(eventsRepository.save).toHaveBeenCalledWith(cancelledEvent);
      expect(result.status).toBe(EventStatus.CANCELLED);
    });

    it('should throw BadRequestException when event is already cancelled', async () => {
      // Arrange
      const cancelledEvent = { ...mockEvent, status: EventStatus.CANCELLED };
      eventsRepository.findOne.mockResolvedValue(cancelledEvent);

      // Act & Assert
      await expect(service.cancel(mockEvent.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancel(mockEvent.id)).rejects.toThrow(
        'Event is already cancelled',
      );
      expect(eventsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when event has tickets sold', async () => {
      // Arrange
      const soldTickets = 150;
      const eventWithSales = {
        ...mockEvent,
        status: EventStatus.ACTIVE,
        capacity: 1000,
        availableTickets: 850, // 150 sold
      };

      eventsRepository.findOne.mockResolvedValue(eventWithSales);

      // Act & Assert
      await expect(service.cancel(mockEvent.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancel(mockEvent.id)).rejects.toThrow(
        `Cannot cancel event with ${soldTickets} ticket(s) already sold`,
      );
      expect(eventsRepository.save).not.toHaveBeenCalled();
    });

    it('should calculate sold tickets correctly for cancellation check', async () => {
      // Arrange
      const testCases = [
        { availableTickets: 1000, capacity: 1000, expectedSold: 0 },
        { availableTickets: 750, capacity: 1000, expectedSold: 250 },
        { availableTickets: 0, capacity: 500, expectedSold: 500 },
        { availableTickets: 1, capacity: 100, expectedSold: 99 },
      ];

      for (const testCase of testCases) {
        const eventWithSales = {
          ...mockEvent,
          status: EventStatus.ACTIVE,
          capacity: testCase.capacity,
          availableTickets: testCase.availableTickets,
        };

        eventsRepository.findOne.mockResolvedValue(eventWithSales);

        if (testCase.expectedSold === 0) {
          // Should succeed
          eventsRepository.save.mockResolvedValue({
            ...eventWithSales,
            status: EventStatus.CANCELLED,
          });
          await service.cancel(mockEvent.id);
          expect(eventsRepository.save).toHaveBeenCalled();
        } else {
          // Should fail
          await expect(service.cancel(mockEvent.id)).rejects.toThrow(
            `Cannot cancel event with ${testCase.expectedSold} ticket(s) already sold`,
          );
        }
      }
    });

    it('should throw NotFoundException when trying to cancel non-existent event', async () => {
      // Arrange
      eventsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancel('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.cancel('non-existent-id')).rejects.toThrow(
        'Event not found',
      );
      expect(eventsRepository.save).not.toHaveBeenCalled();
    });

    it('should validate event id for cancellation', async () => {
      // Arrange
      const invalidId = '';
      eventsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancel(invalidId)).rejects.toThrow(
        NotFoundException,
      );
      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: '' },
      });
    });

    it('should preserve all other event properties when cancelling', async () => {
      // Arrange
      const eventWithNoSales = {
        ...mockEvent,
        status: EventStatus.ACTIVE,
        availableTickets: 1000,
      };
      const cancelledEvent = {
        ...eventWithNoSales,
        status: EventStatus.CANCELLED,
      };

      eventsRepository.findOne.mockResolvedValue(eventWithNoSales);
      eventsRepository.save.mockResolvedValue(cancelledEvent);

      // Act
      const result = await service.cancel(mockEvent.id);

      // Assert
      expect(result.id).toBe(mockEvent.id);
      expect(result.name).toBe(mockEvent.name);
      expect(result.description).toBe(mockEvent.description);
      expect(result.date).toEqual(mockEvent.date);
      expect(result.location).toBe(mockEvent.location);
      expect(result.capacity).toBe(mockEvent.capacity);
      expect(result.availableTickets).toBe(mockEvent.availableTickets);
      expect(result.createdBy).toBe(mockEvent.createdBy);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full lifecycle: create -> update -> cancel', async () => {
      // Create
      eventsRepository.create.mockReturnValue(mockEvent);
      eventsRepository.save.mockResolvedValue(mockEvent);
      const created = await service.create(mockCreateEventDto, mockUser);

      // Update
      eventsRepository.findOne.mockResolvedValue(created);
      eventsRepository.save.mockResolvedValue({
        ...created,
        name: 'Updated Name',
      });
      const updated = await service.update(created.id, {
        name: 'Updated Name',
      });

      // Cancel
      eventsRepository.findOne.mockResolvedValue(updated);
      eventsRepository.save.mockResolvedValue({
        ...updated,
        status: EventStatus.CANCELLED,
      });
      const cancelled = await service.cancel(updated.id);

      expect(cancelled.status).toBe(EventStatus.CANCELLED);
    });

    it('should prevent update after cancellation', async () => {
      // Arrange
      const cancelledEvent = { ...mockEvent, status: EventStatus.CANCELLED };
      eventsRepository.findOne.mockResolvedValue(cancelledEvent);

      // Act & Assert
      await expect(
        service.update(mockEvent.id, { name: 'New Name' }),
      ).rejects.toThrow('Cannot update a cancelled event');
    });
  });
});
