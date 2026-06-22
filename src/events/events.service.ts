import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventStatus } from './enums/event-status.enum';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  async create(dto: CreateEventDto, user: User): Promise<Event> {
    const event = this.eventsRepository.create({
      ...dto,
      date: new Date(dto.date),
      availableTickets: dto.capacity,
      createdBy: user,
    });
    return this.eventsRepository.save(event);
  }

  findAll(): Promise<Event[]> {
    return this.eventsRepository.find();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled event');
    }

    if (dto.capacity !== undefined) {
      const soldTickets = event.capacity - event.availableTickets;
      if (dto.capacity < soldTickets) {
        throw new BadRequestException(
          `Capacity cannot be less than the number of tickets already sold (${soldTickets})`,
        );
      }
      event.availableTickets = dto.capacity - soldTickets;
    }

    Object.assign(event, {
      ...dto,
      date: dto.date ? new Date(dto.date) : event.date,
    });

    return this.eventsRepository.save(event);
  }

  async cancel(id: string): Promise<Event> {
    const event = await this.findOne(id);

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Event is already cancelled');
    }

    const soldTickets = event.capacity - event.availableTickets;
    if (soldTickets > 0) {
      throw new BadRequestException(
        `Cannot cancel event with ${soldTickets} ticket(s) already sold`,
      );
    }

    event.status = EventStatus.CANCELLED;
    return this.eventsRepository.save(event);
  }
}
