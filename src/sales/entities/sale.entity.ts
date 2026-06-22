import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { User } from '../../users/entities/user.entity';
import { SaleStatus } from '../enums/sale-status.enum';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Ticket, { nullable: false, eager: true })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @CreateDateColumn()
  createdAt: Date;
}
