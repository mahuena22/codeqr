import { storage } from './storage';

export class TicketAPI {
  
  // Generate a new ticket
  static async generateTicket(ticketNumber: string, type: 'VIP' | 'Standard' | 'Premium' | 'Basic') {
    try {
      const qrData = JSON.stringify({
        id: ticketNumber,
        type: type,
        generated: new Date().toISOString(),
        status: 'valid'
      });

      const ticket = await storage.createTicket({
        ticketNumber,
        type,
        status: 'valid',
        qrData
      });

      return {
        success: true,
        ticket,
        message: 'Ticket généré avec succès'
      };
    } catch (error) {
      console.error('Error generating ticket:', error);
      return {
        success: false,
        error: 'Erreur lors de la génération du ticket'
      };
    }
  }

  // Scan and validate a ticket
  static async scanTicket(ticketNumber: string) {
    try {
      const ticket = await storage.getTicketByNumber(ticketNumber);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket non trouvé'
        };
      }

      if (ticket.status === 'scanned') {
        return {
          success: false,
          error: 'Ce ticket a déjà été scanné',
          ticket
        };
      }

      if (ticket.status === 'expired') {
        return {
          success: false,
          error: 'Ce ticket a expiré',
          ticket
        };
      }

      // Update ticket status to scanned
      const updatedTicket = await storage.updateTicketStatus(ticketNumber, 'scanned');
      
      // Log the scan
      await storage.createScannedTicket({
        ticketId: ticket.id,
        scanLocation: 'Mobile App'
      });

      return {
        success: true,
        ticket: updatedTicket,
        message: 'Ticket validé avec succès'
      };
    } catch (error) {
      console.error('Error scanning ticket:', error);
      return {
        success: false,
        error: 'Erreur lors de la validation du ticket'
      };
    }
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      const stats = await storage.getTicketStats();
      const scannedTickets = await storage.getScannedTickets();
      
      // Get validated tickets with details
      const validatedTickets = await Promise.all(
        scannedTickets.map(async (scan) => {
          const ticket = await storage.getTicketByNumber(
            (await storage.getTickets()).find(t => t.id === scan.ticketId)?.ticketNumber || ''
          );
          return {
            id: ticket?.ticketNumber || '',
            type: ticket?.type || '',
            scannedAt: scan.scannedAt
          };
        })
      );

      return {
        success: true,
        stats,
        validatedTickets: validatedTickets.filter(t => t.id)
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des statistiques'
      };
    }
  }
}