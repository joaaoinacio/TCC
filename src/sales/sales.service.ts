import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { Sale } from './entities/sale.entity';
import { SaleStatus } from './enums/sale-status.enum';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateSaleDto, user: User): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, {
        where: { id: dto.ticketId },
        relations: { event: true },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // Lock rows individually via raw SQL to avoid FOR UPDATE + LEFT JOIN rejection by PostgreSQL
      await manager.query('SELECT id FROM tickets WHERE id = $1 FOR UPDATE', [ticket.id]);
      await manager.query('SELECT id FROM events WHERE id = $1 FOR UPDATE', [ticket.event.id]);

      if (ticket.quantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock: only ${ticket.quantity} ticket(s) available`,
        );
      }

      const event = await manager.findOne(Event, {
        where: { id: ticket.event.id },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }
      if (event.availableTickets < dto.quantity) {
        throw new BadRequestException(
          `Not enough available tickets for this event`,
        );
      }

      await manager.decrement(
        Ticket,
        { id: ticket.id },
        'quantity',
        dto.quantity,
      );
      await manager.decrement(
        Event,
        { id: event.id },
        'availableTickets',
        dto.quantity,
      );

      const total = Number(ticket.price) * dto.quantity;
      const sale = manager.create(Sale, {
        user,
        ticket,
        quantity: dto.quantity,
        total,
        status: SaleStatus.COMPLETED,
      });

      return manager.save(Sale, sale);
    });
  }

  findByUser(userId: string): Promise<Sale[]> {
    return this.salesRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Sale> {
    const sale = await this.salesRepository.findOne({ where: { id } });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  async cancel(id: string): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, {
        where: { id },
        relations: { ticket: { event: true }, user: true },
      });

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }
      if (sale.status === SaleStatus.CANCELLED) {
        throw new BadRequestException('Sale is already cancelled');
      }

      // Lock rows individually via raw SQL to avoid FOR UPDATE + LEFT JOIN rejection by PostgreSQL
      await manager.query('SELECT id FROM tickets WHERE id = $1 FOR UPDATE', [sale.ticket.id]);
      await manager.query('SELECT id FROM events WHERE id = $1 FOR UPDATE', [sale.ticket.event.id]);

      await manager.increment(
        Ticket,
        { id: sale.ticket.id },
        'quantity',
        sale.quantity,
      );
      await manager.increment(
        Event,
        { id: sale.ticket.event.id },
        'availableTickets',
        sale.quantity,
      );

      sale.status = SaleStatus.CANCELLED;
      return manager.save(Sale, sale);
    });
  }
}
