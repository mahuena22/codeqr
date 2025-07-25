// Global variables
let html5QrcodeScanner = null;
let ticketCounter = 1;
let generatedTickets = [];
let scannedTickets = [];

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    initializeApp();
    setupEventListeners();
    loadStoredData();
    await generateTicketNumber();
    updateDashboard();
});

// Initialize the application
function initializeApp() {
    // Set up tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Generate ticket button
    document.getElementById('generate-btn').addEventListener('click', generateTicket);
    
    // Download button
    document.getElementById('download-btn').addEventListener('click', downloadQR);
    
    // Restart scan button
    document.getElementById('restart-scan').addEventListener('click', startScanner);
    
    // Ticket type change
    document.getElementById('ticket-type').addEventListener('change', generateTicketNumber);
}

// Switch between tabs
function switchTab(targetTab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(targetTab).classList.add('active');
    
    // Handle scanner specific logic
    if (targetTab === 'scanner') {
        setTimeout(() => startScanner(), 100);
    } else {
        stopScanner();
    }
    
    // Update dashboard when switching to it
    if (targetTab === 'dashboard') {
        updateDashboard();
    }
}

// Generate unique ticket number
async function generateTicketNumber() {
    const currentYear = new Date().getFullYear();
    const ticketType = document.getElementById('ticket-type').value;
    
    try {
        // Try to get next available number from database
        const response = await fetch('/api/next-ticket-number', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: ticketType })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                document.getElementById('ticket-number').value = result.ticketNumber;
                return;
            }
        }
    } catch (error) {
        console.log('API not available, using fallback numbering');
    }
    
    // Fallback to local counter
    const ticketNumber = `${ticketType}-${currentYear}-${String(ticketCounter).padStart(3, '0')}`;
    document.getElementById('ticket-number').value = ticketNumber;
}

// Generate ticket with QR code
async function generateTicket() {
    const ticketNumber = document.getElementById('ticket-number').value;
    const ticketType = document.getElementById('ticket-type').value;
    
    try {
        // Call API to generate ticket
        const response = await fetch('/api/generate-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ticketNumber: ticketNumber,
                type: ticketType
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Create ticket data for QR code
            const ticketData = {
                id: ticketNumber,
                type: ticketType,
                generated: result.ticket.generated_at,
                status: 'valid'
            };
            
            // Generate QR code
            const qr = qrcode(0, 'M');
            qr.addData(JSON.stringify(ticketData));
            qr.make();
            
            // Display QR code
            const qrDisplay = document.getElementById('qr-display');
            const qrCodeDiv = document.getElementById('qr-code');
            const ticketInfo = document.getElementById('ticket-info');
            
            qrCodeDiv.innerHTML = qr.createImgTag(4, 10);
            ticketInfo.innerHTML = `
                <strong>Numéro:</strong> ${ticketNumber}<br>
                <strong>Type:</strong> ${ticketType}<br>
                <strong>Généré le:</strong> ${new Date(result.ticket.generated_at).toLocaleString('fr-FR')}
            `;
            
            qrDisplay.style.display = 'block';
            
            // Increment counter and generate new number
            ticketCounter++;
            generateTicketNumber();
            
            // Update dashboard
            updateDashboard();
            
            // Show success message
            showMessage(result.message, 'success');
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        console.error('Error generating ticket:', error);
        // Fallback to localStorage if API fails
        await generateTicketFallback();
    }
}

// Download QR code
function downloadQR() {
    const canvas = document.querySelector('#qr-code img');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `ticket-${document.getElementById('ticket-number').value}.png`;
        link.href = canvas.src;
        link.click();
    }
}

// Start QR scanner
function startScanner() {
    const qrReaderElement = document.getElementById('qr-reader');
    
    if (html5QrcodeScanner) {
        stopScanner();
    }
    
    // Show loading message
    qrReaderElement.innerHTML = '<div class="camera-loading">Activation de la caméra...</div>';
    
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    // Try to get camera access
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            // Use back camera if available, otherwise use first camera
            const cameraId = devices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('rear')
            )?.id || devices[0].id;
            
            return html5QrcodeScanner.start(
                cameraId,
                config,
                onScanSuccess,
                onScanError
            );
        } else {
            throw new Error('Aucune caméra détectée');
        }
    }).catch(err => {
        console.error('Failed to start scanner:', err);
        let errorMessage = 'Erreur: Impossible d\'accéder à la caméra';
        
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
            errorMessage = 'Permission refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.';
        } else if (err.name === 'NotFoundError') {
            errorMessage = 'Aucune caméra trouvée sur cet appareil.';
        } else if (err.name === 'NotSupportedError') {
            errorMessage = 'Scanner QR non supporté par ce navigateur.';
        }
        
        qrReaderElement.innerHTML = `
            <div class="camera-error">
                <h4>⚠️ Problème de caméra</h4>
                <p>${errorMessage}</p>
                <div class="camera-instructions">
                    <h5>Instructions :</h5>
                    <ol>
                        <li>Cliquez sur l'icône de caméra dans la barre d'adresse</li>
                        <li>Sélectionnez "Toujours autoriser"</li>
                        <li>Actualisez la page</li>
                    </ol>
                </div>
            </div>
        `;
        document.getElementById('restart-scan').style.display = 'block';
    });
}

// Stop QR scanner
function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner = null;
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
    document.getElementById('restart-scan').style.display = 'none';
}

// Handle successful QR scan
function onScanSuccess(decodedText, decodedResult) {
    try {
        // Try to parse as JSON (our ticket format)
        const ticketData = JSON.parse(decodedText);
        
        if (ticketData.id && ticketData.type) {
            // Valid ticket format
            processScannedTicket(ticketData);
        } else {
            // Generic QR code
            showScannedContent(decodedText);
        }
    } catch (e) {
        // Not JSON, just show the content
        showScannedContent(decodedText);
    }
    
    // Stop scanner after successful scan
    stopScanner();
}

// Handle scan errors (optional, mostly silent)
function onScanError(errorMessage) {
    // Ignore most scan errors as they're normal during scanning
    if (errorMessage.includes('NotFound')) {
        // This is normal when no QR code is found
        return;
    }
    console.log('Scan error:', errorMessage);
}

// Process scanned ticket
async function processScannedTicket(ticketData) {
    try {
        // Call API to scan ticket
        const response = await fetch('/api/scan-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ticketNumber: ticketData.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showScannedInfo(result.ticket, 'Valide');
            showMessage(result.message, 'success');
        } else {
            showScannedInfo(ticketData, result.error.includes('déjà été scanné') ? 'Déjà scanné' : 'Invalide');
            showMessage(result.error, 'warning');
        }
        
        // Update dashboard
        updateDashboard();
    } catch (error) {
        console.error('Error scanning ticket:', error);
        // Fallback to localStorage if API fails
        processScannedTicketFallback(ticketData);
    }
}

// Show scanned ticket info
function showScannedInfo(ticketData, status) {
    const scanResult = document.getElementById('scan-result');
    const scannedInfo = document.getElementById('scanned-info');
    
    const isValid = status === 'Valide';
    const isScanned = status === 'Déjà scanné';
    
    scannedInfo.innerHTML = `
        <div style="background: ${isValid ? '#d4edda' : isScanned ? '#fff3cd' : '#f8d7da'}; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <strong>Statut:</strong> <span style="color: ${isValid ? '#155724' : isScanned ? '#856404' : '#721c24'}">${status}</span>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
            <strong>ID:</strong> ${ticketData.ticket_number || ticketData.id || 'N/A'}<br>
            <strong>Type:</strong> ${ticketData.type || 'N/A'}<br>
            <strong>Généré:</strong> ${ticketData.generated_at || ticketData.generated ? new Date(ticketData.generated_at || ticketData.generated).toLocaleString('fr-FR') : 'N/A'}<br>
            ${ticketData.scanned_at ? `<strong>Scanné:</strong> ${new Date(ticketData.scanned_at).toLocaleString('fr-FR')}` : ''}
        </div>
    `;
    
    scanResult.style.display = 'block';
    document.getElementById('restart-scan').style.display = 'block';
}

// Show generic scanned content
function showScannedContent(content) {
    alert(`Contenu QR scanné:\n${content}`);
    document.getElementById('restart-scan').style.display = 'block';
}

// Update dashboard statistics
async function updateDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('generated-count').textContent = result.stats.totalGenerated;
            document.getElementById('scanned-count').textContent = result.stats.totalScanned;
            
            const validatedTicketsList = document.getElementById('validated-tickets');
            
            if (result.validatedTickets.length === 0) {
                validatedTicketsList.innerHTML = '<div class="empty-state">Aucun ticket validé</div>';
            } else {
                validatedTicketsList.innerHTML = result.validatedTickets
                    .map(ticket => `
                        <div class="ticket-row">
                            <div>${ticket.id}</div>
                            <div>${ticket.type}</div>
                            <div>${new Date(ticket.scanned_at).toLocaleString('fr-FR', { 
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</div>
                        </div>
                    `).join('');
            }
        }
    } catch (error) {
        console.error('Error updating dashboard:', error);
        // Fallback to localStorage for display
        updateDashboardFallback();
    }
}

// Show message to user
function showMessage(message, type) {
    // Simple alert for now - could be enhanced with toast notifications
    alert(message);
}

// Save data to localStorage
function saveToStorage() {
    localStorage.setItem('ticketsExpress_generated', JSON.stringify(generatedTickets));
    localStorage.setItem('ticketsExpress_scanned', JSON.stringify(scannedTickets));
    localStorage.setItem('ticketsExpress_counter', ticketCounter.toString());
}

// Load data from localStorage
function loadStoredData() {
    const storedGenerated = localStorage.getItem('ticketsExpress_generated');
    const storedScanned = localStorage.getItem('ticketsExpress_scanned');
    const storedCounter = localStorage.getItem('ticketsExpress_counter');
    
    if (storedGenerated) {
        try {
            generatedTickets = JSON.parse(storedGenerated);
        } catch (e) {
            console.error('Error loading generated tickets:', e);
            generatedTickets = [];
        }
    }
    
    if (storedScanned) {
        try {
            scannedTickets = JSON.parse(storedScanned);
        } catch (e) {
            console.error('Error loading scanned tickets:', e);
            scannedTickets = [];
        }
    }
    
    if (storedCounter) {
        ticketCounter = parseInt(storedCounter, 10) || 1;
    }
}

// Handle page visibility change to manage camera
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopScanner();
    }
});

// Handle window beforeunload to stop camera
window.addEventListener('beforeunload', function() {
    stopScanner();
});

// Fallback functions for when API is not available
async function generateTicketFallback() {
    const ticketNumber = document.getElementById('ticket-number').value;
    const ticketType = document.getElementById('ticket-type').value;
    const timestamp = new Date().toISOString();
    
    // Create ticket data
    const ticketData = {
        id: ticketNumber,
        type: ticketType,
        generated: timestamp,
        status: 'valid'
    };
    
    // Generate QR code
    const qr = qrcode(0, 'M');
    qr.addData(JSON.stringify(ticketData));
    qr.make();
    
    // Display QR code
    const qrDisplay = document.getElementById('qr-display');
    const qrCodeDiv = document.getElementById('qr-code');
    const ticketInfo = document.getElementById('ticket-info');
    
    qrCodeDiv.innerHTML = qr.createImgTag(4, 10);
    ticketInfo.innerHTML = `
        <strong>Numéro:</strong> ${ticketNumber}<br>
        <strong>Type:</strong> ${ticketType}<br>
        <strong>Généré le:</strong> ${new Date(timestamp).toLocaleString('fr-FR')}
    `;
    
    qrDisplay.style.display = 'block';
    
    // Store ticket
    generatedTickets.push(ticketData);
    saveToStorage();
    
    // Increment counter and generate new number
    ticketCounter++;
    generateTicketNumber();
    
    // Update dashboard
    updateDashboardFallback();
    
    // Show success message
    showMessage('Ticket généré avec succès (mode hors ligne)', 'success');
}

function processScannedTicketFallback(ticketData) {
    // Check if ticket was already scanned
    const alreadyScanned = scannedTickets.find(t => t.id === ticketData.id);
    
    if (alreadyScanned) {
        showMessage('Ce ticket a déjà été scanné!', 'warning');
        showScannedInfo(ticketData, 'Déjà scanné');
        return;
    }
    
    // Add scan timestamp
    ticketData.scanned = new Date().toISOString();
    scannedTickets.push(ticketData);
    saveToStorage();
    
    showScannedInfo(ticketData, 'Valide');
    updateDashboardFallback();
    showMessage('Ticket validé avec succès (mode hors ligne)', 'success');
}

function updateDashboardFallback() {
    document.getElementById('generated-count').textContent = generatedTickets.length;
    document.getElementById('scanned-count').textContent = scannedTickets.length;
    
    const validatedTicketsList = document.getElementById('validated-tickets');
    
    if (scannedTickets.length === 0) {
        validatedTicketsList.innerHTML = '<div class="empty-state">Aucun ticket validé</div>';
    } else {
        validatedTicketsList.innerHTML = scannedTickets
            .sort((a, b) => new Date(b.scanned) - new Date(a.scanned))
            .map(ticket => `
                <div class="ticket-row">
                    <div>${ticket.id}</div>
                    <div>${ticket.type}</div>
                    <div>${new Date(ticket.scanned).toLocaleString('fr-FR', { 
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</div>
                </div>
            `).join('');
    }
}
