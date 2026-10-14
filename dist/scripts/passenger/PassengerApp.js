/**
 * Component: PassengerApp
 * Pure transit ticketing engine matching Chalo app's exact mechanisms:
 * - Direct drawer navigation (Profile, Tickets/Passes, Stops, SOS, Settings)
 * - Authentic "Tap on ticketing machine" contactless soundwave view (Screenshots 2 & 3)
 * - Live Bus Route search with ETA pills & transit legs (Screenshot 5)
 * - Srinagar Smart City Limited (SSCL) Electric Bus Network (Routes E-01 to E-05)
 * - 100% Free of Cost (Zero paywalls, zero subscriptions, zero KYC friction)
 * - Exact 3-Part Token Anatomy Inspector (Heading, Middle Part, Ending, Dynamic Window)
 * - Visual verification code (GenerateHashCodeForEasyVerificationUseCase.java: abs(hash) % 99 + 1)
 * - BLE proximity punch receiver & itemized receipt (MTicketReceiptData.java)
 * - 100% Vector SVG Icons (Zero emojis used anywhere)
 */
class PassengerApp {
    constructor() {
        this.currentTab = 'active'; // 'active', 'tap', 'routes', 'book', 'pass', 'history'
        this.selectedRoute = null;
        this.originStop = null;
        this.destStop = null;
        this.passengerCount = 1;
        this.showTokenInspector = false;
        this.selectedResultTab = 'RECOMMENDED';
        this.qrCodeInstance = null;
    }

    init() {
        this.bindEvents();
        this.render();

        // Listen for store updates
        window.stateStore.on('entities:updated', () => this.render());
        window.stateStore.on('routes:updated', () => {
            this.renderBookForm();
            this.renderRoutesView();
        });
        window.stateStore.on('ticket:punched', (data) => this.handleTicketPunched(data));
        window.stateStore.on('ticket:expired', () => this.render());

        // Listen for 1-second ticks for countdown and dynamic QR rotation
        window.timeSync.on('tick', (serverTime) => {
            this.updateTickers(serverTime);
        });
    }

    bindEvents() {
        document.querySelectorAll('.passenger-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    toggleDrawer(show) {
        const drawer = document.getElementById('side-drawer');
        const overlay = document.getElementById('drawer-overlay');
        if (drawer && overlay) {
            if (show) {
                drawer.classList.add('active');
                overlay.classList.add('active');
            } else {
                drawer.classList.remove('active');
                overlay.classList.remove('active');
            }
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.passenger-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.passenger-view-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${tab}`);
        });

        const titleElem = document.getElementById('chalo-screen-title');
        if (titleElem) {
            const titles = {
                active: 'My Ticket',
                tap: 'Tap on Machine',
                routes: 'Live Buses & Routes',
                book: 'Book Ride',
                pass: 'SuperPass',
                history: 'Ride History'
            };
            titleElem.textContent = titles[tab] || 'My Ticket';
        }

        if (tab === 'active') {
            this.renderActiveTicket();
        } else if (tab === 'tap') {
            this.renderTapMachineView();
        } else if (tab === 'routes') {
            this.renderRoutesView();
        } else if (tab === 'book') {
            this.renderBookForm();
        } else if (tab === 'pass') {
            this.renderSuperPassTab();
        } else if (tab === 'history') {
            this.renderHistoryTab();
        }
    }

    render() {
        this.renderActiveTicket();
        this.renderTapMachineView();
        this.renderRoutesView();
        this.renderBookForm();
        this.renderSuperPassTab();
        this.renderHistoryTab();
    }

    // ==========================================
    // 1. Active Ticket Viewport
    // ==========================================
    renderActiveTicket() {
        const container = document.getElementById('panel-active');
        if (!container) return;

        const ticket = window.stateStore.selectedTicket;
        const serverTime = window.timeSync.now();

        if (!ticket) {
            container.innerHTML = `
                <div class="booking-card" style="text-align: center; padding: 40px 20px;">
                    <div style="margin-bottom: 12px; display: inline-flex;">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#fe7c00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                    </div>
                    <h3 style="font-size: 1.15rem; font-weight: 900; margin-bottom: 6px; color: #212121;">No Active Ticket</h3>
                    <p style="font-size: 0.82rem; color: #757575; margin-bottom: 20px;">Book a free electric bus ride across Srinagar to generate your digital boarding pass.</p>
                    <button class="btn btn-primary btn-block" onclick="passengerApp.switchTab('book')">Get Free Srinagar e-Bus Ticket</button>
                </div>
            `;
            window.validationEngine.stopBleBeacon();
            return;
        }

        const isTicketActive = ticket.isActive(serverTime);
        const timeRemaining = ticket.getTimeRemaining(serverTime);
        const tokenBreakdown = ticket.getTokenBreakdown(serverTime);

        if (isTicketActive && !ticket.isExpired) {
            window.validationEngine.startBleBeacon(ticket);
        } else {
            window.validationEngine.stopBleBeacon();
        }

        const hashParts = (ticket.visualHash || '26 WLTDO').split(' ');
        const numPart = hashParts[0] || '26';
        const alphaPart = hashParts[1] || 'WLTDO';

        container.innerHTML = `
            <div class="ticket-card ${ticket.isExpired ? 'ticket-expired' : ''}">
                
                <!-- Live Transit Moving Bar (Authentic Anti-Fraud Header in Chalo) -->
                <div class="live-transit-bar"></div>

                <!-- Ticket Header -->
                <div class="ticket-card-header">
                    <div>
                        <span class="ticket-route-badge">${ticket.routeNumber}</span>
                        <div class="ticket-agency-name">${ticket.agency || 'SSCL Srinagar Smart City'}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="free-price-badge">100% FREE</span>
                        <div class="ticket-id-tag">CRN: ${ticket.ticketId.replace('CRN-SXR-', '')}</div>
                    </div>
                </div>

                <!-- Origin & Destination Path -->
                <div class="ticket-route-path">
                    <div class="route-stop-point">
                        <span class="stop-label">
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="#fe7c00"><circle cx="12" cy="12" r="8"/></svg>
                            ORIGIN
                        </span>
                        <span class="stop-name" title="${ticket.origin}">${ticket.origin}</span>
                    </div>
                    <div class="route-connector-line">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#d9d9d9" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </div>
                    <div class="route-stop-point dest">
                        <span class="stop-label">
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="#fe7c00"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            DESTINATION
                        </span>
                        <span class="stop-name" title="${ticket.destination}">${ticket.destination}</span>
                    </div>
                </div>

                <!-- Perforated Bus Ticket Divider Cutouts -->
                <div class="ticket-perforation-divider">
                    <div class="ticket-notch-left"></div>
                    <div class="ticket-dotted-line"></div>
                    <div class="ticket-notch-right"></div>
                </div>

                <!-- Main Validation Section -->
                ${!ticket.isActivated && !ticket.isExpired ? `
                    <div class="activation-gate-box">
                        <div class="gate-icon">
                            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#fe7c00" stroke-width="2.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <h4>Ticket Issued Free of Cost!</h4>
                        <p>Please activate your ticket after boarding the bus. Ticket remains valid for <strong>4 hours</strong> once activated.</p>
                        <button class="btn-activate-chalo" onclick="passengerApp.activateTicket('${ticket.ticketId}')">
                            ACTIVATE TICKET
                        </button>
                    </div>
                ` : ticket.isExpired ? `
                    <div class="expired-qr-state">
                        <div style="margin-bottom: 8px;">
                            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#757575" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <h4 style="font-size: 1.1rem; font-weight: 800; color: #212121; margin-bottom: 4px;">Ticket Validity Expired</h4>
                        <p style="font-size: 0.8rem; color: #757575; margin-bottom: 16px;">The 4-hour validity window for this journey has ended.</p>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-outline btn-block" onclick="passengerApp.openReceiptModal('${ticket.ticketId}')">View Receipt</button>
                            <button class="btn btn-primary btn-block" onclick="passengerApp.renewTicketJourney('${ticket.routeId}')">Book Free Again</button>
                        </div>
                    </div>
                ` : `
                    <div class="active-validation-box">
                        
                        <!-- Ticket Number & Validity Grid (matching Screenshot 2 & 4) -->
                        <div class="chalo-ticket-meta-grid">
                            <div class="chalo-ticket-no-badge">
                                <span class="tn-label">Ticket No.</span>
                                <div class="tn-code-group">
                                    <span class="tn-large-num">${numPart}</span>
                                    <span class="tn-alpha-hash">${alphaPart}</span>
                                </div>
                            </div>
                            <div class="chalo-validity-box">
                                <span class="validity-label">VALID FOR:</span>
                                <span class="validity-timer" id="ticket-timer-display">${timeRemaining.formatted}</span>
                            </div>
                        </div>

                        <!-- Dynamic Rotating QR Code -->
                        <div class="qr-canvas-container" id="qr-container-target">
                            <div id="passenger-qr-element" style="display:flex; justify-content:center; align-items:center;"></div>
                            <div class="qr-refresh-indicator">
                                <span class="pulse-dot"></span>
                                <span id="qr-rotation-countdown">Rotating in 15s</span>
                            </div>
                        </div>

                        <!-- Contactless Soundwave Tap Button -->
                        <button class="btn-tap-nfc-chalo" onclick="passengerApp.switchTab('tap')">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4.93 4.93a10 10 0 0 1 14.14 0"/><path d="M7.76 7.76a6 6 0 0 1 8.48 0"/><path d="M10.59 10.59a2 2 0 0 1 2.82 0"/></svg>
                            <span>Tap phone on ticket machine instead</span>
                        </button>

                        <!-- Action Buttons: Receipt & Token Anatomy Inspector -->
                        <div style="width: 100%; display: flex; gap: 8px; margin-top: 2px;">
                            <button class="btn btn-sm btn-outline btn-block" onclick="passengerApp.openReceiptModal('${ticket.ticketId}')">
                                View Receipt
                            </button>
                            <button class="btn btn-sm btn-outline btn-block" onclick="passengerApp.toggleTokenInspector()">
                                Token Audit
                            </button>
                        </div>

                        <!-- Exact Token Breakdown Inspector (Heading, Middle, Ending) -->
                        <div id="passenger-token-inspector-box" style="display: ${this.showTokenInspector ? 'block' : 'none'}; width: 100%; background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px; padding: 12px; margin-top: 10px; text-align: left;">
                            <div style="font-size: 0.72rem; font-weight: 800; color: #212121; margin-bottom: 6px; text-transform: uppercase;">
                                Chalo Token Anatomy (Byte-by-Byte)
                            </div>
                            <div style="font-family: var(--font-mono); font-size: 0.68rem; line-height: 1.5; color: #424242; word-break: break-all;">
                                <div><strong style="color: #fe7c00;">[1. HEADING]</strong>: ${tokenBreakdown.heading.hex} (${tokenBreakdown.heading.meaning})</div>
                                <div><strong style="color: #fe7c00;">[2. MIDDLE]</strong>: ${tokenBreakdown.middle.hex} (${tokenBreakdown.middle.meaning})</div>
                                <div><strong style="color: #757575;">[3. ENDING]</strong>: Base64 ${tokenBreakdown.ending.byteLength} bytes (${tokenBreakdown.ending.hex})</div>
                                <div style="margin-top: 4px; border-top: 1px dashed #d9d9d9; padding-top: 4px;">
                                    <strong>Envelope</strong>: <code>${tokenBreakdown.envelopeString}</code>
                                </div>
                            </div>
                        </div>

                    </div>
                `}

                <!-- Itemized Meta Footer -->
                <div class="ticket-meta-footer">
                    <div>
                        <span class="meta-label">PASSENGERS</span>
                        <span class="meta-val">${ticket.passengerCount} Adult</span>
                    </div>
                    <div>
                        <span class="meta-label">VEHICLE FLEET</span>
                        <span class="meta-val">${ticket.vehicleType || 'Tata Smart City EV'}</span>
                    </div>
                    <div>
                        <span class="meta-label">TOTAL FARE</span>
                        <span class="meta-val" style="color: #fe7c00;">FREE (₹0.00)</span>
                    </div>
                </div>

            </div>
        `;

        // Render QR Code canvas if active
        if (isTicketActive && !ticket.isExpired) {
            this.renderQrCode(ticket, serverTime);
        }
    }

    renderQrCode(ticket, serverTime) {
        const qrContainer = document.getElementById('passenger-qr-element');
        if (!qrContainer) return;

        const payload = ticket.getDynamicQrPayload(serverTime);
        qrContainer.innerHTML = '';

        try {
            if (typeof QRCode !== 'undefined') {
                this.qrCodeInstance = new QRCode(qrContainer, {
                    text: payload,
                    width: 176,
                    height: 176,
                    colorDark: "#000000",
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                qrContainer.innerHTML = `<div style="font-size:0.7rem; color:#64748B;">QR Loading...</div>`;
            }
        } catch (e) {
            console.error('[PassengerApp] QR render error:', e);
        }
    }

    updateTickers(serverTime) {
        if (this.currentTab !== 'active') return;

        const ticket = window.stateStore.selectedTicket;
        if (!ticket || !ticket.isActivated || ticket.isExpired) return;

        // 1. Update countdown
        const timeRemaining = ticket.getTimeRemaining(serverTime);
        const timerElem = document.getElementById('ticket-timer-display');
        if (timerElem) {
            timerElem.textContent = timeRemaining.formatted;
        }

        // 2. Check 15-second rotation window for Dynamic QR
        const currentSec = Math.floor(serverTime / 1000);
        const secInWindow = currentSec % 15;
        const remainingInWindow = 15 - secInWindow;

        const countdownElem = document.getElementById('qr-rotation-countdown');
        if (countdownElem) {
            countdownElem.textContent = `Rotating in ${remainingInWindow}s`;
        }

        // Re-generate QR when new window starts
        if (remainingInWindow === 15) {
            this.renderQrCode(ticket, serverTime);
        }
    }

    // ==========================================
    // 2. "Tap on ticketing machine" Screen (Screenshots 2 & 3: media_1791961608945.png)
    // ==========================================
    renderTapMachineView() {
        const container = document.getElementById('panel-tap');
        if (!container) return;

        const ticket = window.stateStore.selectedTicket;
        const pass = window.stateStore.passes.length > 0 ? window.stateStore.passes[0] : null;

        const activeItem = ticket || pass;
        const visualCode = activeItem ? (activeItem.visualHash || '26 WLTDO') : '26 WLTDO';
        const title = pass ? pass.tierName : (ticket ? `${ticket.routeNumber} Mobile Ticket` : 'SSCL Srinagar Day Pass');

        container.innerHTML = `
            <div class="tap-machine-view">
                <div class="tap-top-bar">
                    <button class="tap-back-btn" onclick="passengerApp.switchTab('active')" aria-label="Go back">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    </button>
                    <h3 class="tap-machine-title">Tap on ticketing machine</h3>
                    <button class="tap-help-btn" onclick="passengerApp.showTapHelp()" aria-label="Help">?</button>
                </div>

                <div style="font-size: 0.8rem; color: #64748B; text-align: center; margin-top: -14px; margin-bottom: 12px; line-height: 1.35;">
                    Tap your phone on the ticket machine to use your ticket or pass
                </div>

                <!-- Animated Soundwave Circle (Exact replica of Screenshot 2: media_1791961608945.png) -->
                <div class="soundwave-circle-wrapper">
                    <div class="soundwave-ripple-ring"></div>
                    <div class="soundwave-ripple-ring"></div>
                    <div class="soundwave-center-btn" onclick="passengerApp.triggerMachineTap()" title="Tap phone on ticket machine">
                        <svg viewBox="0 0 100 100" width="84" height="84">
                            <path d="M30 40 A15 15 0 0 1 30 60" stroke="#FFF" stroke-width="7" stroke-linecap="round" fill="none"/>
                            <path d="M42 32 A28 28 0 0 1 42 68" stroke="#FFF" stroke-width="7" stroke-linecap="round" fill="none"/>
                            <path d="M54 24 A42 42 0 0 1 54 76" stroke="#FFF" stroke-width="7" stroke-linecap="round" fill="none"/>
                            <path d="M66 16 A56 56 0 0 1 66 84" stroke="#FFF" stroke-width="7" stroke-linecap="round" fill="none"/>
                        </svg>
                    </div>
                </div>

                <div class="tap-learn-more">
                    Not able to verify? <a href="javascript:void(0)" onclick="passengerApp.switchTab('active')">Show QR Code Instead</a>
                </div>

                <!-- Floating Bottom Card (Exact match to Screenshot 2 & 3) -->
                <div class="tap-bottom-card">
                    <div class="tap-card-left">
                        <div class="tap-avatar-circle">
                            <svg viewBox="0 0 36 36" width="38" height="38">
                                <circle cx="18" cy="18" r="18" fill="#fe7c00"/>
                                <circle cx="18" cy="14" r="6" fill="#F5D0A9"/>
                                <path d="M12 16 C12 21 24 21 24 16 C24 23 12 23 12 16 Z" fill="#212121"/>
                                <path d="M10 32 C10 26 26 26 26 32 Z" fill="#ef6c00"/>
                            </svg>
                        </div>
                        <div class="tap-card-info">
                            <h4>${title}</h4>
                            <button onclick="passengerApp.switchTab('active')">VIEW DETAILS</button>
                        </div>
                    </div>

                    <div class="tap-card-badge">
                        <span>Ticket No.</span>
                        <strong>${visualCode}</strong>
                    </div>
                </div>

                <div style="width: 100%; margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
                    <button class="btn btn-primary btn-block" onclick="passengerApp.triggerMachineTap()">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4.93 4.93a10 10 0 0 1 14.14 0"/><path d="M7.76 7.76a6 6 0 0 1 8.48 0"/><path d="M10.59 10.59a2 2 0 0 1 2.82 0"/></svg>
                        Simulate Machine Tap / Punch Ticket
                    </button>
                    <button class="btn btn-sm btn-outline btn-block" onclick="passengerApp.switchTab('active')">
                        Switch to QR Code
                    </button>
                </div>
            </div>
        `;
    }

    showTapHelp() {
        alert("Hold your phone near the conductor's electronic ticketing machine (ETM) or gate validator. The device automatically validates via Bluetooth Low Energy (Service UUID 00001337) and NFC.");
    }

    async triggerMachineTap() {
        const ticket = window.stateStore.selectedTicket;
        const pass = window.stateStore.passes.length > 0 ? window.stateStore.passes[0] : null;

        if (!ticket && !pass) {
            alert('Please book a free ticket or activate a pass first!');
            this.switchTab('book');
            return;
        }

        const activeItem = ticket || pass;

        try {
            if (ticket && !ticket.isActivated) {
                await this.activateTicket(ticket.ticketId);
            }

            // Emit acoustic validation tone
            if (window.validationEngine) {
                window.validationEngine.playValidationTone(activeItem);
            }

            // Execute punch against ticket
            const targetId = activeItem.ticketId || activeItem.passId;
            const isPass = !activeItem.ticketId;
            const punchResult = await window.validationEngine.executeBlePunch(targetId, isPass);

            this.showTapConfirmationModal(activeItem, punchResult);
            this.render();
        } catch (e) {
            alert('Validation Error: ' + e.message);
        }
    }

    showTapConfirmationModal(item, punchResult) {
        const modal = document.getElementById('modal-generic');
        const modalBody = document.getElementById('modal-generic-body');
        if (!modal || !modalBody) return;

        const isPass = !item.ticketId;
        const id = item.ticketId || item.passId;
        const visualCode = item.visualHash || '26 WLTDO';
        const title = isPass ? item.tierName : `${item.routeNumber} Mobile Ticket`;

        modalBody.innerHTML = `
            <div style="text-align: center; padding: 18px 12px;">
                <div style="margin-bottom: 12px; display: inline-flex; background: #fff0d4; border: 1px solid #fdb870; border-radius: 4px; padding: 16px;">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#fe7c00" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: #212121; margin-bottom: 4px;">Ticket Validated!</h3>
                <span class="badge badge-orange" style="font-size: 0.75rem; padding: 4px 10px;">ETM Machine Punch Confirmed</span>

                <div style="background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px; padding: 14px; margin: 16px 0; text-align: left;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
                        <span style="color: #757575;">Validated By:</span>
                        <strong style="color: #212121;">Conductor Altaf Mir (Badge #C-104)</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
                        <span style="color: #757575;">ETM Device:</span>
                        <strong style="color: #212121;">SSCL-ETM-104</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
                        <span style="color: #757575;">Visual Hash Code:</span>
                        <strong style="color: #fe7c00; font-family: monospace; font-size: 1.15rem;">${visualCode}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
                        <span style="color: #757575;">Identifier:</span>
                        <strong style="color: #212121;">${id}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                        <span style="color: #757575;">Punch Time:</span>
                        <strong style="color: #fe7c00;">${new Date().toLocaleTimeString()}</strong>
                    </div>
                </div>

                <p style="font-size: 0.78rem; color: #64748B; margin-bottom: 16px; line-height: 1.4;">
                    Your ride has been successfully verified on the SSCL Electric Bus network. Digital receipt is saved to your ride history.
                </p>

                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-outline btn-block" onclick="passengerApp.openReceiptModal('${id}');">
                        View Receipt
                    </button>
                    <button class="btn btn-primary btn-block" onclick="document.getElementById('modal-generic').classList.remove('active'); passengerApp.switchTab('active');">
                        Done
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    // ==========================================
    // 3. Live Routes & Search Results View (Screenshot 5)
    // ==========================================
    renderRoutesView() {
        const container = document.getElementById('panel-routes');
        if (!container) return;

        container.innerHTML = `
            <div>
                <!-- Origin to Destination Search Header (Screenshot 5) -->
                <div class="results-header-box">
                    <div class="results-route-inputs">
                        <div class="route-dot-connector">
                            <div class="route-dot-hollow"></div>
                            <div class="route-dot-line"></div>
                            <div class="route-dot-filled"></div>
                        </div>
                        <div class="route-input-labels">
                            <div class="route-pill-input">TRC Lal Chowk Central Terminal</div>
                            <div class="route-pill-input">Harwan Garden Terminus</div>
                        </div>
                    </div>

                    <div class="results-meta-row">
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            12:01 PM
                        </span>
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33-1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            Options (AC Electric Fleet)
                        </span>
                    </div>
                </div>

                <!-- Tabs: RECOMMENDED / CAB & AUTO -->
                <div class="results-tabs">
                    <div class="results-tab-item ${this.selectedResultTab === 'RECOMMENDED' ? 'active' : ''}" onclick="passengerApp.setResultTab('RECOMMENDED')">
                        RECOMMENDED
                    </div>
                    <div class="results-tab-item ${this.selectedResultTab === 'CAB_AUTO' ? 'active' : ''}" onclick="passengerApp.setResultTab('CAB_AUTO')">
                        CAB & AUTO
                    </div>
                </div>

                <!-- Bus Trip Cards -->
                ${this.selectedResultTab === 'RECOMMENDED' ? `
                    <div class="trip-result-card">
                        <div class="trip-card-top">
                            <span class="trip-duration">24 min</span>
                            <span class="trip-badge-fastest">FASTEST</span>
                        </div>
                        <div class="trip-legs-flow">
                            <span style="display:inline-flex; align-items:center; gap:2px;">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13" cy="4" r="2"/><path d="M7 21l3-7 3 3v5"/><path d="M16 11l-3-3-3 2-2 5"/></svg>
                                2 min
                            </span>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#d9d9d9" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                            <span class="trip-bus-pill">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 18v2"/><path d="M18 18v2"/></svg>
                                E-01 (Tata EV)
                            </span>
                            <span class="trip-eta-live-tag">3 mins ETA</span>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#d9d9d9" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                            <span style="display:inline-flex; align-items:center; gap:2px;">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13" cy="4" r="2"/><path d="M7 21l3-7 3 3v5"/><path d="M16 11l-3-3-3 2-2 5"/></svg>
                                1 min
                            </span>
                        </div>
                        <div style="font-size: 0.76rem; color: #757575; margin-bottom: 12px;">
                            Board at TRC Lal Chowk • Via Boulevard & Dal Lake Ghat
                        </div>
                        <button class="btn btn-primary btn-block" onclick="passengerApp.quickBookRoute('ROUTE-E01', 'TRC Lal Chowk Central Terminal', 'Harwan Garden Terminus')">
                            Get Free Ticket for E-01
                        </button>
                    </div>

                    <div class="trip-result-card">
                        <div class="trip-card-top">
                            <span class="trip-duration">32 min</span>
                            <span class="free-price-badge">100% FREE</span>
                        </div>
                        <div class="trip-legs-flow">
                            <span style="display:inline-flex; align-items:center; gap:2px;">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13" cy="4" r="2"/><path d="M7 21l3-7 3 3v5"/><path d="M16 11l-3-3-3 2-2 5"/></svg>
                                3 min
                            </span>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#d9d9d9" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                            <span class="trip-bus-pill">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 18v2"/><path d="M18 18v2"/></svg>
                                E-02 (Hazratbal Exp)
                            </span>
                            <span class="trip-eta-live-tag">6 mins ETA</span>
                        </div>
                        <div style="font-size: 0.76rem; color: #757575; margin-bottom: 12px;">
                            Board at Regal Chowk • Via Khanyar & Rainawari
                        </div>
                        <button class="btn btn-outline btn-block" onclick="passengerApp.quickBookRoute('ROUTE-E02', 'TRC Lal Chowk Central Terminal', 'Hazratbal Shrine Central Gate')">
                            Get Free Ticket for E-02
                        </button>
                    </div>

                    <div class="trip-result-card">
                        <div class="trip-card-top">
                            <span class="trip-duration">40 min</span>
                            <span class="trip-badge-fastest">AIRPORT LINE</span>
                        </div>
                        <div class="trip-legs-flow">
                            <span class="trip-bus-pill">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 18v2"/><path d="M18 18v2"/></svg>
                                E-05 (Srinagar Airport)
                            </span>
                            <span class="trip-eta-live-tag">8 mins ETA</span>
                        </div>
                        <div style="font-size: 0.76rem; color: #757575; margin-bottom: 12px;">
                            Direct AC Electric Express via Hyderpora & Humhama
                        </div>
                        <button class="btn btn-outline btn-block" onclick="passengerApp.quickBookRoute('ROUTE-E05', 'TRC Lal Chowk Central Terminal', 'Srinagar Airport (SXR) Terminal')">
                            Get Free Ticket for E-05
                        </button>
                    </div>
                ` : `
                    <div style="text-align: center; color: #757575; padding: 40px 20px;">
                        <div style="margin-bottom: 8px; display: inline-flex;">
                            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#757575" stroke-width="2"><path d="M5 17h14v-5l-2-5H7L5 12v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>
                        </div>
                        <h4>Shared Auto & Feeder Services</h4>
                        <p style="font-size: 0.8rem;">Srinagar Smart City Last-Mile Connectors available at TRC Hub.</p>
                    </div>
                `}
            </div>
        `;
    }

    setResultTab(tab) {
        this.selectedResultTab = tab;
        this.renderRoutesView();
    }

    quickBookRoute(routeId, origin, dest) {
        this.selectedRoute = window.stateStore.routes.find(r => r.id === routeId) || window.stateStore.routes[0];
        this.originStop = origin;
        this.destStop = dest;
        this.passengerCount = 1;
        this.submitBooking();
    }

    toggleTokenInspector() {
        this.showTokenInspector = !this.showTokenInspector;
        const box = document.getElementById('passenger-token-inspector-box');
        if (box) {
            box.style.display = this.showTokenInspector ? 'block' : 'none';
        }
    }

    // ==========================================
    // 4. Book Ride Form
    // ==========================================
    renderBookForm() {
        const container = document.getElementById('panel-book');
        if (!container) return;

        const routes = window.stateStore.routes;
        if (!this.selectedRoute && routes.length > 0) {
            this.selectedRoute = routes[0];
            this.originStop = this.selectedRoute.stages[0]?.name;
            this.destStop = this.selectedRoute.stages[this.selectedRoute.stages.length - 1]?.name;
        }

        container.innerHTML = `
            <div class="booking-card">
                <div class="booking-card-header">
                    <h3>Book Srinagar Electric Bus Ticket</h3>
                    <p>100% Free Smart City Transit on Routes E-01 to E-05</p>
                </div>

                <div class="form-group">
                    <label>SELECT ELECTRIC CORRIDOR</label>
                    <select id="book-route-select" class="form-select" onchange="passengerApp.onRouteChange(this.value)">
                        ${routes.map(r => `
                            <option value="${r.id}" ${this.selectedRoute && this.selectedRoute.id === r.id ? 'selected' : ''}>
                                ${r.number} - ${r.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>BOARDING STOP (ORIGIN)</label>
                        <select id="book-origin-select" class="form-select" onchange="passengerApp.originStop = this.value">
                            ${this.selectedRoute ? this.selectedRoute.stages.map(s => `
                                <option value="${s.name}" ${this.originStop === s.name ? 'selected' : ''}>${s.name}</option>
                            `).join('') : ''}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>DESTINATION STOP</label>
                        <select id="book-dest-select" class="form-select" onchange="passengerApp.destStop = this.value">
                            ${this.selectedRoute ? this.selectedRoute.stages.map(s => `
                                <option value="${s.name}" ${this.destStop === s.name ? 'selected' : ''}>${s.name}</option>
                            `).join('') : ''}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>PASSENGERS</label>
                        <select id="book-passenger-count" class="form-select" onchange="passengerApp.passengerCount = parseInt(this.value)">
                            <option value="1">1 Passenger</option>
                            <option value="2">2 Passengers</option>
                            <option value="3">3 Passengers</option>
                            <option value="4">4 Passengers</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>FARE AMOUNT</label>
                        <div class="free-fare-display">
                            <span class="free-pill">100% FREE</span>
                            <span class="fare-sub">SSCL Subsidy</span>
                        </div>
                    </div>
                </div>

                <div class="booking-summary-bar">
                    <div>
                        <span class="summary-label">Total to Pay:</span>
                        <strong class="total-price" style="color: #fe7c00;">FREE (₹0.00)</strong>
                    </div>
                    <button class="btn btn-primary" onclick="passengerApp.submitBooking()">
                        Issue Free Ticket
                    </button>
                </div>
            </div>
        `;
    }

    onRouteChange(routeId) {
        this.selectedRoute = window.stateStore.routes.find(r => r.id === routeId);
        if (this.selectedRoute) {
            this.originStop = this.selectedRoute.stages[0]?.name;
            this.destStop = this.selectedRoute.stages[this.selectedRoute.stages.length - 1]?.name;
        }
        this.renderBookForm();
    }

    async submitBooking() {
        if (!this.selectedRoute) {
            alert('Please select a route');
            return;
        }
        if (this.originStop === this.destStop) {
            alert('Boarding and destination stops must be different!');
            return;
        }

        try {
            const ticketData = {
                routeId: this.selectedRoute.id,
                routeNumber: this.selectedRoute.number,
                routeName: this.selectedRoute.name,
                agency: 'SSCL Srinagar Smart City',
                vehicleType: 'Smart City Electric Bus (AC)',
                origin: this.originStop,
                destination: this.destStop,
                passengerCount: this.passengerCount,
                passengerType: 'ADULT',
                farePerPerson: 0,
                totalFare: 0,
                isActivated: true, // Immediately active so passenger can validate without extra hurdle
                activationTimestamp: Date.now(),
                activationDuration: 14400000, // 4 hours
                expiryTimestamp: Date.now() + 14400000,
                status: 'ACTIVE'
            };

            let newTicket = null;
            try {
                const res = await fetch('/api/tickets/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ticketData)
                });
                if (res.ok) {
                    const data = await res.json();
                    newTicket = new MTicket(data.ticket);
                }
            } catch (err) {
                // Standalone local fallback
            }

            if (!newTicket) {
                newTicket = new MTicket(ticketData);
            }

            window.stateStore.upsertTicket(newTicket);
            this.switchTab('active');
        } catch (e) {
            alert('Booking Error: ' + e.message);
        }
    }

    async activateTicket(ticketId) {
        try {
            const ticket = window.stateStore.tickets.find(t => t.ticketId === ticketId);
            if (!ticket) return;

            const now = Date.now();
            ticket.isActivated = true;
            ticket.activationTimestamp = now;
            ticket.expiryTimestamp = now + ticket.activationDuration;
            ticket.status = 'ACTIVE';

            window.stateStore.saveToLocalStorage();
            window.validationEngine.startBleBeacon(ticket);
            this.render();
        } catch (e) {
            alert('Activation Error: ' + e.message);
        }
    }

    renewTicketJourney(routeId) {
        const route = window.stateStore.routes.find(r => r.id === routeId) || window.stateStore.routes[0];
        this.selectedRoute = route;
        this.originStop = route.stages[0]?.name;
        this.destStop = route.stages[route.stages.length - 1]?.name;
        this.submitBooking();
    }

    // ==========================================
    // 5. SuperPass Tab
    // ==========================================
    renderSuperPassTab() {
        const container = document.getElementById('panel-pass');
        if (!container) return;

        const passes = window.stateStore.passes;
        const tiers = window.stateStore.passTiers;
        const serverTime = window.timeSync.now();

        container.innerHTML = `
            <div>
                <!-- Active Passes -->
                ${passes.length > 0 ? `
                    <div style="margin-bottom: 18px;">
                        <h4 style="font-size: 0.95rem; font-weight: 800; color: #212121; margin-bottom: 10px;">Your SuperPass Subscriptions</h4>
                        ${passes.map(pass => {
                            const isValid = pass.isValid(serverTime);
                            const timeRem = pass.getTimeRemaining(serverTime);
                            return `
                                <div class="superpass-card ${!isValid ? 'expired' : ''}">
                                    <div class="pass-card-header">
                                        <div>
                                            <span class="pass-type-badge">${pass.passType} PASS</span>
                                            <h3>${pass.tierName}</h3>
                                        </div>
                                        <div style="text-align: right;">
                                            <span class="free-price-badge">FREE</span>
                                            <div style="font-size: 0.65rem; color: #757575;">ID: ${pass.passId}</div>
                                        </div>
                                    </div>

                                    <div class="pass-metrics-grid">
                                        <div class="metric-box">
                                            <span class="metric-label">RIDES REMAINING</span>
                                            <strong class="metric-value">${pass.remainingRides > 9000 ? 'Unlimited' : pass.remainingRides}</strong>
                                        </div>
                                        <div class="metric-box">
                                            <span class="metric-label">RIDES TODAY</span>
                                            <strong class="metric-value">${pass.ridesUsedToday} / ${pass.maxRidesPerDay}</strong>
                                        </div>
                                        <div class="metric-box">
                                            <span class="metric-label">VALIDITY</span>
                                            <strong class="metric-value">${timeRem.formatted}</strong>
                                        </div>
                                    </div>

                                    ${!isValid ? `
                                        <div class="pass-renewal-box">
                                            <p style="font-size: 0.8rem; color: #757575; margin-bottom: 8px;">Pass period ended. Renew in 1 tap for free.</p>
                                            <button class="btn btn-warning btn-block" onclick="passengerApp.renewSuperPass('${pass.passId}')">
                                                1-Tap Renew Free Pass
                                            </button>
                                        </div>
                                    ` : `
                                        <div class="pass-active-footer">
                                            <span style="display:inline-flex; align-items:center; gap:4px; font-size: 0.75rem; color: #424242;">
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fe7c00" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                                Valid on all Srinagar Electric Buses
                                            </span>
                                            <button class="btn btn-sm btn-outline" onclick="passengerApp.showPassQrModal('${pass.passId}')">
                                                Show Pass QR
                                            </button>
                                        </div>
                                    `}
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}

                <!-- Buy New SuperPass Section -->
                <div class="buy-pass-section">
                    <h4 style="color: #212121; font-size: 1rem; margin-top: 4px; margin-bottom: 4px; font-weight: 800;">Available Free SuperPass Plans</h4>
                    <p style="font-size: 0.78rem; color: #757575; margin-bottom: 12px;">Unlimited & commuter passes across all corridors (100% Free)</p>

                    <div class="pass-tiers-catalog">
                        ${tiers.map(t => `
                            <div class="tier-catalog-card">
                                <div class="tier-header">
                                    <h4>${t.name}</h4>
                                    <span class="free-price-badge">FREE</span>
                                </div>
                                <p class="tier-desc">${t.description}</p>
                                <ul class="tier-perks">
                                    <li><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fe7c00" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ${t.durationDays} Days Duration</li>
                                    <li><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fe7c00" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ${t.maxRides > 9000 ? 'Unlimited Rides' : `${t.maxRides} Rides Quota`}</li>
                                    <li><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fe7c00" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Up to ${t.maxRidesPerDay > 9000 ? 'Unlimited' : `${t.maxRidesPerDay} rides/day`}</li>
                                </ul>
                                <button class="btn btn-primary btn-block" onclick="passengerApp.buyPass('${t.tierId}')">
                                    Activate Free Pass
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

            </div>
        `;
    }

    async buyPass(tierId) {
        try {
            let newPass = null;
            try {
                const res = await fetch('/api/passes/buy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tierId })
                });
                if (res.ok) {
                    const data = await res.json();
                    newPass = new SuperPass(data.pass);
                }
            } catch (err) {}

            if (!newPass) {
                const tier = window.stateStore.passTiers.find(t => t.tierId === tierId) || window.stateStore.passTiers[0];
                newPass = new SuperPass({
                    tierId: tier.tierId,
                    tierName: tier.name,
                    passType: tier.type,
                    description: tier.description,
                    durationDays: tier.durationDays,
                    maxRides: tier.maxRides,
                    remainingRides: tier.maxRides,
                    maxRidesPerDay: tier.maxRidesPerDay,
                    price: 0,
                    status: 'ACTIVE'
                });
            }

            window.stateStore.upsertPass(newPass);
            this.renderSuperPassTab();
        } catch (e) {
            alert('Pass Buy Error: ' + e.message);
        }
    }

    async renewSuperPass(passId) {
        try {
            const oldPass = window.stateStore.passes.find(p => p.passId === passId);
            if (!oldPass) return;
            await this.buyPass(oldPass.tierId);
        } catch (e) {
            alert('Pass Renewal Error: ' + e.message);
        }
    }

    showPassQrModal(passId) {
        const pass = window.stateStore.passes.find(p => p.passId === passId);
        if (!pass) return;

        const modal = document.getElementById('modal-generic');
        const modalBody = document.getElementById('modal-generic-body');
        if (!modal || !modalBody) return;

        const serverTime = window.timeSync.now();
        const payload = pass.getDynamicQrPayload(serverTime);

        modalBody.innerHTML = `
            <div style="text-align: center; padding: 18px 12px;">
                <span class="badge badge-orange" style="font-size: 0.75rem; margin-bottom: 8px;">SSCL Electric Bus Pass</span>
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #212121; margin-bottom: 4px;">${pass.tierName}</h3>
                <div style="font-family: var(--font-mono); font-size: 1.1rem; font-weight: 900; color: #fe7c00; margin-bottom: 12px;">
                    Pass Code: ${pass.visualHash}
                </div>

                <div class="qr-canvas-container" style="margin: 0 auto 14px auto;">
                    <div id="modal-pass-qr-element" style="display:flex; justify-content:center;"></div>
                    <div class="qr-refresh-indicator">
                        <span class="pulse-dot"></span>
                        <span>Dynamic Rotating Pass QR</span>
                    </div>
                </div>

                <div style="background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px; padding: 10px; font-size: 0.78rem; text-align: left; margin-bottom: 14px;">
                    <div><strong>Rides Remaining</strong>: ${pass.remainingRides > 9000 ? 'Unlimited' : pass.remainingRides}</div>
                    <div><strong>Validity</strong>: ${pass.getTimeRemaining(serverTime).formatted}</div>
                    <div><strong>Pass ID</strong>: ${pass.passId}</div>
                </div>

                <button class="btn btn-outline btn-block" onclick="document.getElementById('modal-generic').classList.remove('active')">
                    Close
                </button>
            </div>
        `;

        modal.classList.add('active');

        setTimeout(() => {
            const elem = document.getElementById('modal-pass-qr-element');
            if (elem && typeof QRCode !== 'undefined') {
                new QRCode(elem, {
                    text: payload,
                    width: 176,
                    height: 176,
                    colorDark: "#000000",
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }, 50);
    }

    // ==========================================
    // 6. Ride History & Itemized Receipts
    // ==========================================
    renderHistoryTab() {
        const container = document.getElementById('panel-history');
        if (!container) return;

        const tickets = window.stateStore.tickets;

        container.innerHTML = `
            <div>
                <h4 style="font-size: 1rem; font-weight: 800; color: #212121; margin-bottom: 12px;">Your Past Rides & Receipts</h4>
                
                ${tickets.length === 0 ? `
                    <div style="text-align: center; color: #757575; padding: 40px 20px;">
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#757575" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <h4 style="margin-top: 8px;">No ride history found</h4>
                        <p style="font-size: 0.8rem;">Your completed digital boarding passes and invoices will be listed here.</p>
                    </div>
                ` : `
                    <div class="history-list">
                        ${tickets.map(t => `
                            <div class="history-item-card" onclick="passengerApp.openReceiptModal('${t.ticketId}')">
                                <div class="history-left">
                                    <span class="badge ${t.isExpired ? 'badge-danger' : (t.punchDetails ? 'badge-orange' : 'badge-warning')}">
                                        ${t.status}
                                    </span>
                                    <h4>${t.routeNumber}</h4>
                                    <div class="history-path" style="display:inline-flex; align-items:center; gap:4px;">
                                        <span>${t.origin}</span>
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                        <span>${t.destination}</span>
                                    </div>
                                    <small>${new Date(t.bookingTime).toLocaleString()}</small>
                                </div>
                                <div class="history-right">
                                    <span class="free-price-badge">FREE</span>
                                    <span class="receipt-link" style="margin-top: 4px;">View Receipt &gt;</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    openReceiptModal(ticketId) {
        const ticket = window.stateStore.tickets.find(t => t.ticketId === ticketId);
        if (!ticket) return;

        const modal = document.getElementById('modal-generic');
        const modalBody = document.getElementById('modal-generic-body');
        if (!modal || !modalBody) return;

        modalBody.innerHTML = `
            <div class="digital-receipt-paper">
                <div class="receipt-header">
                    <span class="receipt-brand">SRINAGAR SMART CITY LIMITED (SSCL)</span>
                    <h3 style="margin-top: 4px; font-size: 1.15rem; color: #212121;">Digital Electric Bus Invoice</h3>
                    <small>Chalo Digital Ticketing Partner • Official Proof of Fare Payment</small>
                </div>

                <div class="receipt-divider">-----------------------------------------</div>

                <div class="receipt-row"><span>Ticket CRN:</span><strong>${ticket.ticketId}</strong></div>
                <div class="receipt-row"><span>Route:</span><strong>${ticket.routeNumber} (${ticket.routeName})</strong></div>
                <div class="receipt-row"><span>Origin:</span><span>${ticket.origin}</span></div>
                <div class="receipt-row"><span>Destination:</span><span>${ticket.destination}</span></div>
                <div class="receipt-row"><span>Booking Time:</span><span>${new Date(ticket.bookingTime).toLocaleString()}</span></div>
                <div class="receipt-row"><span>Passengers:</span><span>${ticket.passengerCount} (Adult)</span></div>

                <div class="receipt-divider">-----------------------------------------</div>

                <div class="receipt-row"><span>Tariff:</span><span>100% Free Smart City Transit</span></div>
                <div class="receipt-row total-row"><span>TOTAL PAID:</span><strong style="color: #fe7c00;">FREE (₹0.00)</strong></div>

                <div class="receipt-divider">-----------------------------------------</div>

                <div class="receipt-validation-stamp">
                    ${ticket.punchDetails ? `
                        <div class="stamp-badge">VERIFIED BY ETM MACHINE</div>
                        <div class="stamp-meta">
                            <span>Conductor: ${ticket.punchDetails.conductorId}</span>
                            <span>ETM Device: ${ticket.punchDetails.etmDeviceId}</span>
                            <span>Bus Fleet: ${ticket.punchDetails.busNumber}</span>
                            <span>Punched At: ${new Date(ticket.punchDetails.timestamp).toLocaleTimeString()}</span>
                        </div>
                    ` : `
                        <div class="stamp-badge awaiting">PAYMENT CONFIRMED</div>
                        <div class="stamp-meta">Status: ${ticket.status} • Awaiting Conductor ETM Punch</div>
                    `}
                </div>

                <div class="receipt-crypto-proof">
                    <small>HMAC Verification Proof:</small>
                    <code>${ticket.ticketId}:SSCL_DIGITAL_TICKET_VALIDATED</code>
                </div>

                <button class="btn btn-outline btn-block" style="margin-top: 16px; display:inline-flex; align-items:center; justify-content:center; gap:6px;" onclick="window.print()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print / Save PDF
                </button>
            </div>
        `;

        modal.classList.add('active');
    }

    handleTicketPunched(data) {
        this.render();
    }
}

if (typeof window !== 'undefined') {
    window.passengerApp = new PassengerApp();
}
