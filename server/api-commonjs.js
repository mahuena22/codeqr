// CommonJS version of the API for Node.js server
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Simple database connection for CommonJS
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class TicketAPI {
  
  // Generate a new ticket
  static async generateTicket(ticketNumber, type) {
    try {
      // Check if ticket number already exists
      let finalTicketNumber = ticketNumber;
      let counter = 1;
      
      while (true) {
        const existingTicket = await pool.query(
          'SELECT id FROM tickets WHERE ticket_number = $1',
          [finalTicketNumber]
        );
        
        if (existingTicket.rows.length === 0) {
          break; // Number is available
        }
        
        // Generate next number
        counter++;
        const currentYear = new Date().getFullYear();
        finalTicketNumber = `${type}-${currentYear}-${String(counter).padStart(3, '0')}`;
      }

      const qrData = JSON.stringify({
        id: finalTicketNumber,
        type: type,
        generated: new Date().toISOString(),
        status: 'valid'
      });

      const result = await pool.query(
        'INSERT INTO tickets (ticket_number, type, status, qr_data) VALUES ($1, $2, $3, $4) RETURNING *',
        [finalTicketNumber, type, 'valid', qrData]
      );

      return {
        success: true,
        ticket: result.rows[0],
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
  static async scanTicket(ticketNumber) {
    try {
      // Get the ticket
      const ticketResult = await pool.query(
        'SELECT * FROM tickets WHERE ticket_number = $1',
        [ticketNumber]
      );
      
      if (ticketResult.rows.length === 0) {
        return {
          success: false,
          error: 'Ticket non trouvé'
        };
      }

      const ticket = ticketResult.rows[0];

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
      const updateResult = await pool.query(
        'UPDATE tickets SET status = $1, scanned_at = NOW() WHERE ticket_number = $2 RETURNING *',
        ['scanned', ticketNumber]
      );
      
      // Log the scan
      await pool.query(
        'INSERT INTO scanned_tickets (ticket_id, scan_location) VALUES ($1, $2)',
        [ticket.id, 'Mobile App']
      );

      return {
        success: true,
        ticket: updateResult.rows[0],
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
      // Get basic stats
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_generated,
          COUNT(*) FILTER (WHERE status = 'scanned') as total_scanned
        FROM tickets
      `);
      
      const stats = {
        totalGenerated: parseInt(statsResult.rows[0].total_generated),
        totalScanned: parseInt(statsResult.rows[0].total_scanned),
        remaining: parseInt(statsResult.rows[0].total_generated) - parseInt(statsResult.rows[0].total_scanned)
      };
      
      // Get validated tickets with details
      const validatedResult = await pool.query(`
        SELECT t.ticket_number as id, t.type, s.scanned_at 
        FROM tickets t 
        JOIN scanned_tickets s ON t.id = s.ticket_id 
        ORDER BY s.scanned_at DESC
      `);

      return {
        success: true,
        stats,
        validatedTickets: validatedResult.rows
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des statistiques'
      };
    }
  }

  // Get next available ticket number
  static async getNextTicketNumber(type) {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get the highest number for this type and year
      const result = await pool.query(`
        SELECT ticket_number 
        FROM tickets 
        WHERE ticket_number LIKE $1 
        ORDER BY ticket_number DESC 
        LIMIT 1
      `, [`${type}-${currentYear}-%`]);
      
      let nextNumber = 1;
      
      if (result.rows.length > 0) {
        const lastTicket = result.rows[0].ticket_number;
        const numberPart = lastTicket.split('-')[2];
        nextNumber = parseInt(numberPart) + 1;
      }
      
      const ticketNumber = `${type}-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
      
      return {
        success: true,
        ticketNumber
      };
    } catch (error) {
      console.error('Error getting next ticket number:', error);
      return {
        success: false,
        error: 'Erreur lors de la génération du numéro'
      };
    }
  }
}

module.exports = { TicketAPI };