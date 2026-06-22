import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EventStatus } from '../enums/event-status.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column()
  location: string;

  @Column()
  capacity: number;

  @Column()
  availableTickets: number;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.ACTIVE })
  status: EventStatus;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
