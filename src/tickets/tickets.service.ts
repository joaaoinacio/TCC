import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from '../events/events.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly eventsService: EventsService,
  ) {}

  async create(dto: CreateTicketDto): Promise<Ticket> {
    const event = await this.eventsService.findOne(dto.eventId);

    const ticket = this.ticketsRepository.create({
      type: dto.type,
      price: dto.price,
      quantity: dto.quantity,
      event,
    });

    return this.ticketsRepository.save(ticket);
  }

  findByEvent(eventId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { event: { id: eventId } },
    });
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);

    if (dto.eventId !== undefined) {
      ticket.event = await this.eventsService.findOne(dto.eventId);
    }

    Object.assign(ticket, {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
    });

    return this.ticketsRepository.save(ticket);
  }

  async updateStock(id: string, quantitySold: number): Promise<Ticket> {
    const ticket = await this.findOne(id);

    if (ticket.quantity < quantitySold) {
      throw new BadRequestException(
        `Insufficient stock: only ${ticket.quantity} ticket(s) available`,
      );
    }

    ticket.quantity -= quantitySold;
    return this.ticketsRepository.save(ticket);
  }
}
