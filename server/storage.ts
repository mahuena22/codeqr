import { tickets, scannedTickets, type Ticket, type InsertTicket, type ScannedTicket, type InsertScannedTicket } from "../shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Ticket operations
  getTickets(): Promise<Ticket[]>;
  getTicketByNumber(ticketNumber: string): Promise<Ticket | undefined>;
  createTicket(insertTicket: InsertTicket): Promise<Ticket>;
  updateTicketStatus(ticketNumber: string, status: 'valid' | 'scanned' | 'expired'): Promise<Ticket | undefined>;
  
  // Scanned tickets operations  
  getScannedTickets(): Promise<ScannedTicket[]>;
  createScannedTicket(insertScannedTicket: InsertScannedTicket): Promise<ScannedTicket>;
  
  // Statistics
  getTicketStats(): Promise<{
    totalGenerated: number;
    totalScanned: number;
    remaining: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets).orderBy(desc(tickets.generatedAt));
  }

  async getTicketByNumber(ticketNumber: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.ticketNumber, ticketNumber));
    return ticket || undefined;
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db
      .insert(tickets)
      .values(insertTicket)
      .returning();
    return ticket;
  }

  async updateTicketStatus(ticketNumber: string, status: 'valid' | 'scanned' | 'expired'): Promise<Ticket | undefined> {
    const [ticket] = await db
      .update(tickets)
      .set({ 
        status,
        scannedAt: status === 'scanned' ? new Date() : undefined
      })
      .where(eq(tickets.ticketNumber, ticketNumber))
      .returning();
    return ticket || undefined;
  }

  async getScannedTickets(): Promise<ScannedTicket[]> {
    return await db.select().from(scannedTickets).orderBy(desc(scannedTickets.scannedAt));
  }

  async createScannedTicket(insertScannedTicket: InsertScannedTicket): Promise<ScannedTicket> {
    const [scannedTicket] = await db
      .insert(scannedTickets)
      .values(insertScannedTicket)
      .returning();
    return scannedTicket;
  }

  async getTicketStats(): Promise<{
    totalGenerated: number;
    totalScanned: number;
    remaining: number;
  }> {
    const allTickets = await this.getTickets();
    const scannedTicketsCount = allTickets.filter(t => t.status === 'scanned').length;
    
    return {
      totalGenerated: allTickets.length,
      totalScanned: scannedTicketsCount,
      remaining: allTickets.length - scannedTicketsCount
    };
  }
}

export const storage = new DatabaseStorage();