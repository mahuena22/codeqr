# Tickets Express - Mobile Ticket Generation and Scanning System

## Overview

Tickets Express is a mobile-first web application for generating and scanning event tickets using QR codes. The application provides a simple interface for creating tickets with different types (VIP, Standard, Premium, Basic), scanning QR codes for validation, and monitoring ticket usage through a dashboard.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Font preference: Montserrat (imported via Google Fonts)
- Color scheme: Dark blue night (#1a237e primary, #0d47a1 secondary)
- Camera permissions: Must provide clear instructions for scanner functionality

## System Architecture

### Frontend Architecture
- **Technology**: Vanilla HTML, CSS, and JavaScript (no frameworks)
- **Design Pattern**: Single Page Application (SPA) with tab-based navigation
- **Mobile-First**: Responsive design optimized for mobile devices (max-width: 430px)
- **Styling**: CSS Grid and Flexbox with gradient backgrounds and modern UI elements
- **Typography**: Montserrat font family via Google Fonts
- **Color Scheme**: Dark blue night theme (#1a237e, #0d47a1)

### Backend Architecture
- **Server**: Node.js HTTP server with REST API endpoints
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **API Endpoints**:
  - `POST /api/generate-ticket`: Creates new tickets in database
  - `POST /api/scan-ticket`: Validates and marks tickets as scanned
  - `GET /api/dashboard`: Returns ticket statistics and scan history

### Database Storage
- **Technology**: PostgreSQL database with Drizzle ORM
- **Tables**: 
  - `tickets`: Stores generated tickets with QR data
  - `scanned_tickets`: Logs all ticket scans for audit trail
- **API Layer**: Node.js server with REST endpoints
- **Data Persistence**: All ticket data persists in database across sessions
- **Backup Storage**: Browser localStorage for offline fallback

### Client-Side Fallback
- **Local Storage**: Browser localStorage for offline persistence
- **Data Structure**: Arrays for storing generated and scanned tickets
- **Session Management**: Counter-based ticket numbering with persistence

## Key Components

### 1. Ticket Generation System
- **Auto-numbering**: Sequential ticket number generation starting from 1
- **Ticket Types**: Four predefined categories (VIP, Standard, Premium, Basic)
- **QR Code Generation**: Client-side QR code creation using qrcode-generator library
- **Download Functionality**: Users can download generated QR codes

### 2. QR Code Scanner
- **Library**: html5-qrcode for camera-based scanning
- **Camera Access**: Enhanced permission handling with user instructions
- **Error Handling**: Comprehensive error messages for camera access issues
- **Camera Selection**: Automatically selects back camera when available
- **Validation**: Checks against previously generated tickets
- **Status Tracking**: Marks tickets as scanned to prevent duplicate usage

### 3. Dashboard
- **Statistics**: Shows total generated tickets, scanned tickets, and remaining tickets
- **Real-time Updates**: Automatically refreshes when tickets are generated or scanned

### 4. Navigation System
- **Tab Interface**: Three main sections (Generate, Scanner, Dashboard)
- **State Management**: Active tab tracking with visual indicators

## Data Flow

1. **Ticket Generation**:
   - User selects ticket type
   - System auto-generates unique ticket number
   - API call creates ticket in PostgreSQL database
   - QR code created with ticket data
   - Ticket stored with metadata (type, timestamp, status)
   - Dashboard updated with live database data

2. **Ticket Scanning**:
   - Camera activated for QR code scanning
   - Scanned data validated against database tickets
   - API call marks ticket as scanned if valid
   - Scan event logged in scanned_tickets table
   - Results displayed to user with database status
   - Dashboard updated with real-time statistics

3. **Data Persistence**:
   - Primary storage in PostgreSQL database
   - Real-time statistics from database queries
   - Fallback localStorage for offline functionality
   - Audit trail maintained for all scan events

## External Dependencies

### JavaScript Libraries
- **html5-qrcode@2.3.8**: QR code scanning functionality from camera
- **qrcode-generator@1.4.4**: Client-side QR code generation

### CDN Dependencies
- Libraries loaded via CDN (unpkg.com and jsdelivr.net)
- No build process or package management required

### Backend Dependencies
- **@neondatabase/serverless**: PostgreSQL connection pooling
- **drizzle-orm**: Type-safe database queries and schema management
- **ws**: WebSocket support for database connections

## Deployment Strategy

### Static Hosting
- **Architecture**: Client-side only application
- **Requirements**: Any static web server (Apache, Nginx, GitHub Pages, Netlify, Vercel)
- **Files**: Three main files (index.html, style.css, script.js)
- **No Backend**: All functionality runs in the browser

### Browser Compatibility
- **Modern Browsers**: Requires support for getUserMedia API for camera access
- **Mobile Focus**: Optimized for mobile browsers
- **Offline Capability**: Works offline after initial load (except for CDN dependencies)

## Technical Considerations

### Security
- **Client-Side Only**: No server-side validation of tickets
- **Local Storage**: Data stored locally on device
- **QR Code Content**: Contains ticket number and type in plain text

### Limitations
- **Device Dependency**: Tickets and scans are device-specific
- **No Centralized Database**: No synchronization across devices
- **Manual Validation**: Relies on operator to verify scanned results

### Scalability
- **Single Device**: Designed for individual use or small events
- **Storage Limits**: Limited by browser localStorage capacity
- **Performance**: All operations are client-side and fast