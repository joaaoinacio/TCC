import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';

config();

export const TestDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_TEST_PORT ?? '5433', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_TEST_NAME ?? 'tcc_db_test',
  entities: [User, Event, Ticket, Sale],
  synchronize: true,
  logging: false,
});
