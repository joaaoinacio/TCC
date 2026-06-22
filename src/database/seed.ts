import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { AppDataSource } from './data-source';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';
import { Sale } from '../sales/entities/sale.entity';
import { SaleStatus } from '../sales/enums/sale-status.enum';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';

config();

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  // ------------------------------------------------------------------
  // Clear existing data (CASCADE handles FK order automatically)
  // ------------------------------------------------------------------
  await AppDataSource.query(
    'TRUNCATE TABLE sales, tickets, events, users CASCADE',
  );
  console.log('Tables cleared');

  const userRepo    = AppDataSource.getRepository(User);
  const eventRepo   = AppDataSource.getRepository(Event);
  const ticketRepo  = AppDataSource.getRepository(Ticket);

  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------
  const password = await bcrypt.hash('123456', 10);

  const [joao, maria] = await userRepo.save([
    userRepo.create({ name: 'João Silva',    email: 'joao@test.com',  password, isActive: true }),
    userRepo.create({ name: 'Maria Santos',  email: 'maria@test.com', password, isActive: true }),
  ]);
  console.log('Users created: joao@test.com | maria@test.com');

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------
  const [rock, jazz] = await eventRepo.save([
    eventRepo.create({
      title:            'Show do Rock 2025',
      description:      'A maior festa de rock do ano com as melhores bandas.',
      date:             new Date('2025-10-15T20:00:00-03:00'),
      location:         'Estádio Olímpico, São Paulo - SP',
      capacity:         250,
      availableTickets: 250,
      status:           EventStatus.ACTIVE,
      createdBy:        joao,
    }),
    eventRepo.create({
      title:            'Festival de Jazz',
      description:      'Uma noite de puro jazz ao vivo com músicos renomados.',
      date:             new Date('2025-11-20T19:00:00-03:00'),
      location:         'Teatro Municipal, Rio de Janeiro - RJ',
      capacity:         180,
      availableTickets: 180,
      status:           EventStatus.ACTIVE,
      createdBy:        maria,
    }),
  ]);
  console.log('Events created: "Show do Rock 2025" | "Festival de Jazz"');

  // ------------------------------------------------------------------
  // Tickets (2 types per event)
  // ------------------------------------------------------------------
  const [vip, pista, premium, geral] = await ticketRepo.save([
    ticketRepo.create({ type: 'VIP',     price: 250.00, quantity: 50,  event: rock }),
    ticketRepo.create({ type: 'Pista',   price: 120.00, quantity: 200, event: rock }),
    ticketRepo.create({ type: 'Premium', price: 180.00, quantity: 30,  event: jazz }),
    ticketRepo.create({ type: 'Geral',   price: 80.00,  quantity: 150, event: jazz }),
  ]);
  console.log('Tickets created: VIP + Pista (Rock) | Premium + Geral (Jazz)');

  // ------------------------------------------------------------------
  // Sales — single transaction to keep stock consistent
  // ------------------------------------------------------------------
  await AppDataSource.transaction(async (manager) => {
    const sales: Partial<Sale>[] = [
      // Maria buys 2x VIP (Rock)
      { user: maria, ticket: vip,     quantity: 2, total: 250.00 * 2, status: SaleStatus.COMPLETED },
      // João buys 3x Geral (Jazz)
      { user: joao,  ticket: geral,   quantity: 3, total: 80.00  * 3, status: SaleStatus.COMPLETED },
      // Maria buys 1x Premium (Jazz)
      { user: maria, ticket: premium, quantity: 1, total: 180.00 * 1, status: SaleStatus.COMPLETED },
      // João buys 1x Pista (Rock)
      { user: joao,  ticket: pista,   quantity: 1, total: 120.00 * 1, status: SaleStatus.COMPLETED },
    ];

    for (const data of sales) {
      const ticket = data.ticket!;
      ticket.quantity -= data.quantity!;
      await manager.save(Ticket, ticket);

      const event = ticket.event;
      event.availableTickets -= data.quantity!;
      await manager.save(Event, event);

      await manager.save(Sale, manager.create(Sale, data));
    }
  });
  console.log('Sales created: 4 sales across both events');

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log('\nSeed completed successfully!');
  console.log('─'.repeat(45));
  console.log('  joao@test.com   → senha: 123456');
  console.log('  maria@test.com  → senha: 123456');
  console.log('─'.repeat(45));
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => AppDataSource.destroy());
