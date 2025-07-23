import { pgTable, serial, varchar, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for ticket types
export const ticketTypeEnum = pgEnum('ticket_type', ['VIP', 'Standard', 'Premium', 'Basic']);

// Enum for ticket status
export const ticketStatusEnum = pgEnum('ticket_status', ['valid', 'scanned', 'expired']);

// Tickets table
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  ticketNumber: varchar('ticket_number', { length: 50 }).notNull().unique(),
  type: ticketTypeEnum('type').notNull(),
  status: ticketStatusEnum('status').notNull().default('valid'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  scannedAt: timestamp('scanned_at'),
  qrData: text('qr_data').notNull(),
});

// Scanned tickets log table
export const scannedTickets = pgTable('scanned_tickets', {
  id: serial('id').primaryKey(),
  ticketId: serial('ticket_id').references(() => tickets.id),
  scannedAt: timestamp('scanned_at').notNull().defaultNow(),
  scanLocation: varchar('scan_location', { length: 100 }),
});

// Relations
export const ticketsRelations = relations(tickets, ({ many }) => ({
  scans: many(scannedTickets),
}));

export const scannedTicketsRelations = relations(scannedTickets, ({ one }) => ({
  ticket: one(tickets, {
    fields: [scannedTickets.ticketId],
    references: [tickets.id],
  }),
}));

// Types
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;
export type ScannedTicket = typeof scannedTickets.$inferSelect;
export type InsertScannedTicket = typeof scannedTickets.$inferInsert;