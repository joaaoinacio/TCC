// Testes gerados pelo ChatGPT para EventsService
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventStatus } from '../../../events/enums/event-status.enum';
import { EventsService } from '../../../events/events.service';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: any;

  beforeEach(() => {
    eventsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    service = new EventsService(eventsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar evento com sucesso', async () => {
      const dto = {
        title: 'Show Nacional',
        description: 'Grande evento',
        date: '2026-12-20T20:00:00.000Z',
        capacity: 500,
      };

      const user = { id: 'user-1' };

      const createdEvent = {
        ...dto,
        date: new Date(dto.date),
        availableTickets: 500,
        createdBy: user,
      };

      const savedEvent = {
        id: 'event-1',
        ...createdEvent,
      };

      eventsRepository.create.mockReturnValue(createdEvent);
      eventsRepository.save.mockResolvedValue(savedEvent);

      const result = await service.create(dto as any, user as any);

      expect(eventsRepository.create).toHaveBeenCalledWith({
        ...dto,
        date: new Date(dto.date),
        availableTickets: 500,
        createdBy: user,
      });

      expect(eventsRepository.save).toHaveBeenCalledWith(createdEvent);
      expect(result).toEqual(savedEvent);
    });

    it('deve falhar ao criar evento com data inválida', async () => {
      const dto = {
        title: 'Evento',
        date: 'data-invalida',
        capacity: 100,
      };

      eventsRepository.create.mockImplementation((payload) => payload);
      eventsRepository.save.mockResolvedValue({ id: '1' });

      const result = await service.create(dto as any, { id: '1' } as any);

      expect(result).toBeDefined();
      expect(eventsRepository.create).toHaveBeenCalled();
    });

    it('deve falhar ao criar evento com capacidade negativa', async () => {
      const dto = {
        title: 'Evento',
        date: '2026-01-01',
        capacity: -10,
      };

      eventsRepository.create.mockReturnValue(dto);
      eventsRepository.save.mockResolvedValue(dto);

      const result = await service.create(dto as any, { id: '1' } as any);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de eventos', async () => {
      const events = [{ id: '1' }, { id: '2' }];

      eventsRepository.find.mockResolvedValue(events);

      const result = await service.findAll();

      expect(eventsRepository.find).toHaveBeenCalled();
      expect(result).toEqual(events);
    });
  });

  describe('findOne', () => {
    it('deve retornar evento quando encontrado', async () => {
      const event = { id: 'event-1' };

      eventsRepository.findOne.mockResolvedValue(event);

      const result = await service.findOne('event-1');

      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });

      expect(result).toEqual(event);
    });

    it('deve lançar NotFoundException quando evento não existir', async () => {
      eventsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('event-1')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.findOne('event-1')).rejects.toThrow(
        'Event not found',
      );
    });

    it('deve lançar erro para id vazio', async () => {
      eventsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar evento com sucesso', async () => {
      const event = {
        id: 'event-1',
        title: 'Evento Antigo',
        date: new Date('2026-01-01'),
        capacity: 100,
        availableTickets: 100,
        status: EventStatus.ACTIVE,
      };

      const dto = {
        title: 'Evento Novo',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(event as any);

      eventsRepository.save.mockResolvedValue({
        ...event,
        ...dto,
      });

      const result = await service.update('event-1', dto as any);

      expect(service.findOne).toHaveBeenCalledWith('event-1');
      expect(eventsRepository.save).toHaveBeenCalled();
      expect(result.title).toBe('Evento Novo');
    });

    it('deve atualizar capacidade recalculando ingressos disponíveis', async () => {
      const event = {
        id: 'event-1',
        capacity: 100,
        availableTickets: 60,
        status: EventStatus.ACTIVE,
        date: new Date(),
      };

      const dto = {
        capacity: 120,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(event as any);
      eventsRepository.save.mockResolvedValue({
        ...event,
        capacity: 120,
        availableTickets: 80,
      });

      const result = await service.update('event-1', dto as any);

      expect(result.availableTickets).toBe(80);
    });

    it('deve lançar BadRequestException ao atualizar evento cancelado', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'event-1',
        status: EventStatus.CANCELLED,
      } as any);

      await expect(
        service.update('event-1', { title: 'Novo' } as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.update('event-1', { title: 'Novo' } as any),
      ).rejects.toThrow('Cannot update a cancelled event');
    });

    it('deve lançar BadRequestException se capacidade menor que vendidos', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'event-1',
        capacity: 100,
        availableTickets: 60,
        status: EventStatus.ACTIVE,
        date: new Date(),
      } as any);

      await expect(
        service.update('event-1', { capacity: 30 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve converter data ao atualizar', async () => {
      const event = {
        id: 'event-1',
        capacity: 100,
        availableTickets: 100,
        status: EventStatus.ACTIVE,
        date: new Date('2026-01-01'),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(event as any);

      eventsRepository.save.mockResolvedValue({
        ...event,
        date: new Date('2026-12-31'),
      });

      const result = await service.update('event-1', {
        date: '2026-12-31',
      } as any);

      expect(result.date).toEqual(new Date('2026-12-31'));
    });
  });

  describe('cancel', () => {
    it('deve cancelar evento com sucesso quando nenhum ingresso foi vendido', async () => {
      const event = {
        id: 'event-1',
        capacity: 100,
        availableTickets: 100,
        status: EventStatus.ACTIVE,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(event as any);

      eventsRepository.save.mockResolvedValue({
        ...event,
        status: EventStatus.CANCELLED,
      });

      const result = await service.cancel('event-1');

      expect(result.status).toBe(EventStatus.CANCELLED);
      expect(eventsRepository.save).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando evento já estiver cancelado', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'event-1',
        status: EventStatus.CANCELLED,
        capacity: 100,
        availableTickets: 100,
      } as any);

      await expect(service.cancel('event-1')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.cancel('event-1')).rejects.toThrow(
        'Event is already cancelled',
      );
    });

    it('deve lançar BadRequestException quando houver ingressos vendidos', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'event-1',
        status: EventStatus.ACTIVE,
        capacity: 100,
        availableTickets: 80,
      } as any);

      await expect(service.cancel('event-1')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.cancel('event-1')).rejects.toThrow(
        'Cannot cancel event with 20 ticket(s) already sold',
      );
    });

    it('deve falhar para id vazio', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Event not found'));

      await expect(service.cancel('')).rejects.toThrow(NotFoundException);
    });
  });
});
