// Testes gerados pelo ChatGPT para SalesService
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Event } from '../../../events/entities/event.entity';
import { Ticket } from '../../../tickets/entities/ticket.entity';
import { Sale } from '../../../sales/entities/sale.entity';
import { SaleStatus } from '../../../sales/enums/sale-status.enum';
import { SalesService } from '../../../sales/sales.service';

describe('SalesService', () => {
  let service: SalesService;
  let salesRepository: any;
  let dataSource: any;
  let manager: any;

  beforeEach(() => {
    salesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    manager = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      decrement: jest.fn(),
      increment: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };

    service = new SalesService(salesRepository, dataSource as DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar venda com sucesso e decrementar estoque', async () => {
      const dto = {
        ticketId: 'ticket-1',
        quantity: 2,
      };

      const user = {
        id: 'user-1',
      };

      const ticket = {
        id: 'ticket-1',
        quantity: 10,
        price: 50,
        event: { id: 'event-1' },
      };

      const event = {
        id: 'event-1',
        availableTickets: 20,
      };

      const saleCreated = {
        user,
        ticket,
        quantity: 2,
        total: 100,
        status: SaleStatus.COMPLETED,
      };

      const saleSaved = {
        id: 'sale-1',
        ...saleCreated,
      };

      manager.findOne
        .mockResolvedValueOnce(ticket)
        .mockResolvedValueOnce(event);

      manager.create.mockReturnValue(saleCreated);
      manager.save.mockResolvedValue(saleSaved);

      const result = await service.create(dto as any, user as any);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(manager.decrement).toHaveBeenCalledWith(
        Ticket,
        { id: 'ticket-1' },
        'quantity',
        2,
      );

      expect(manager.decrement).toHaveBeenCalledWith(
        Event,
        { id: 'event-1' },
        'availableTickets',
        2,
      );

      expect(manager.create).toHaveBeenCalledWith(Sale, {
        user,
        ticket,
        quantity: 2,
        total: 100,
        status: SaleStatus.COMPLETED,
      });

      expect(result).toEqual(saleSaved);
    });

    it('deve lançar NotFoundException quando ticket não existir', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create(
          { ticketId: 'inexistente', quantity: 1 } as any,
          { id: 'user-1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.create(
          { ticketId: 'inexistente', quantity: 1 } as any,
          { id: 'user-1' } as any,
        ),
      ).rejects.toThrow('Ticket not found');
    });

    it('deve lançar BadRequestException quando estoque do ticket for insuficiente', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'ticket-1',
        quantity: 1,
        price: 50,
        event: { id: 'event-1' },
      });

      await expect(
        service.create(
          { ticketId: 'ticket-1', quantity: 2 } as any,
          { id: 'user-1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando evento não existir', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'ticket-1',
          quantity: 10,
          price: 50,
          event: { id: 'event-1' },
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.create(
          { ticketId: 'ticket-1', quantity: 2 } as any,
          { id: 'user-1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.create(
          { ticketId: 'ticket-1', quantity: 2 } as any,
          { id: 'user-1' } as any,
        ),
      ).rejects.toThrow('Event not found');
    });

    it('deve lançar BadRequestException quando evento não tiver ingressos disponíveis', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'ticket-1',
          quantity: 10,
          price: 50,
          event: { id: 'event-1' },
        })
        .mockResolvedValueOnce({
          id: 'event-1',
          availableTickets: 1,
        });

      await expect(
        service.create(
          { ticketId: 'ticket-1', quantity: 2 } as any,
          { id: 'user-1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar para quantidade inválida', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'ticket-1',
        quantity: 10,
        price: 50,
        event: { id: 'event-1' },
      });

      manager.findOne.mockResolvedValueOnce({
        id: 'event-1',
        availableTickets: 10,
      });

      await expect(
        service.create(
          { ticketId: 'ticket-1', quantity: 0 } as any,
          { id: 'user-1' } as any,
        ),
      ).rejects.toBeDefined();
    });
  });

  describe('findByUser', () => {
    it('deve listar vendas do usuário ordenadas por data desc', async () => {
      const sales = [{ id: '1' }, { id: '2' }];

      salesRepository.find.mockResolvedValue(sales);

      const result = await service.findByUser('user-1');

      expect(salesRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-1' } },
        order: { createdAt: 'DESC' },
      });

      expect(result).toEqual(sales);
    });
  });

  describe('findOne', () => {
    it('deve retornar venda quando encontrada', async () => {
      const sale = { id: 'sale-1' };

      salesRepository.findOne.mockResolvedValue(sale);

      const result = await service.findOne('sale-1');

      expect(result).toEqual(sale);
    });

    it('deve lançar NotFoundException quando venda não existir', async () => {
      salesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('sale-1')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.findOne('sale-1')).rejects.toThrow('Sale not found');
    });
  });

  describe('cancel', () => {
    it('deve cancelar venda com sucesso e reverter estoque', async () => {
      const sale = {
        id: 'sale-1',
        quantity: 2,
        status: SaleStatus.COMPLETED,
        ticket: {
          id: 'ticket-1',
          event: { id: 'event-1' },
        },
      };

      manager.findOne.mockResolvedValueOnce(sale);
      manager.findOneOrFail
        .mockResolvedValueOnce({ id: 'ticket-1' })
        .mockResolvedValueOnce({ id: 'event-1' });

      manager.save.mockResolvedValue({
        ...sale,
        status: SaleStatus.CANCELLED,
      });

      const result = await service.cancel('sale-1');

      expect(manager.increment).toHaveBeenCalledWith(
        Ticket,
        { id: 'ticket-1' },
        'quantity',
        2,
      );

      expect(manager.increment).toHaveBeenCalledWith(
        Event,
        { id: 'event-1' },
        'availableTickets',
        2,
      );

      expect(result.status).toBe(SaleStatus.CANCELLED);
    });

    it('deve lançar NotFoundException quando venda não existir', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.cancel('sale-1')).rejects.toThrow(NotFoundException);

      await expect(service.cancel('sale-1')).rejects.toThrow('Sale not found');
    });

    it('deve lançar BadRequestException quando venda já estiver cancelada', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'sale-1',
        status: SaleStatus.CANCELLED,
      });

      await expect(service.cancel('sale-1')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.cancel('sale-1')).rejects.toThrow(
        'Sale is already cancelled',
      );
    });

    it('deve falhar para id vazio', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.cancel('')).rejects.toThrow(NotFoundException);
    });
  });
});
