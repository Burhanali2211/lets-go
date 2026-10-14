/**
 * Component: ConductorETM
 * Simulates a transit Electronic Ticketing Machine (ETM) handheld hardware device:
 * 1. Proximity BLE Punch Radar & Ingestion (MTicketProductValidationConfig.java)
 * 2. Exact 3-Part Token Anatomy Inspector (Heading, Middle, Ending, Envelope)
 * 3. Machine Punch Wire Packet Generator (PremiumBusPunchDataOverBleApiModel)
 * 4. Visual Security Code cross-checker (GenerateHashCodeForEasyVerificationUseCase.java)
 */
class ConductorETM {
    constructor() {
        this.mode = 'radar'; // 'radar', 'qr', 'manual', 'shift'
        this.nearbyDevices = [];
        this.conductorId = 'Conductor Altaf Mir (Badge #C-104)';
        this.etmId = 'SSCL-ETM-104';
        this.busNumber = 'JK-01-AB-1044 (Tata EV)';
        this.routeNumber = 'E-01 (TRC ↔ Harwan)';
        this.lastValidationResult = null;
    }

    init() {
        this.bindEvents();
        this.render();

        // Listen for BLE scans from the validation engine
        window.validationEngine.onBleScan((devices) => {
            this.nearbyDevices = devices;
            if (this.mode === 'radar') {
                this.renderRadarView();
            }
        });

        // Listen for store updates
        window.stateStore.on('entities:updated', () => {
            if (this.mode === 'radar') this.renderRadarView();
            if (this.mode === 'shift') this.renderShiftView();
        });
    }

    bindEvents() {
        document.querySelectorAll('.etm-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    switchMode(mode) {
        this.mode = mode;
        document.querySelectorAll('.etm-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        if (mode === 'radar') this.renderRadarView();
        else if (mode === 'qr') this.renderQrView();
        else if (mode === 'manual') this.renderManualView();
        else if (mode === 'shift') this.renderShiftView();
    }

    render() {
        this.switchMode(this.mode);
    }

    // ==========================================
    // 1. BLE Proximity Radar View
    // ==========================================
    renderRadarView() {
        const display = document.getElementById('etm-screen-content');
        if (!display) return;

        display.innerHTML = `
            <div class="etm-radar-wrapper">
                <div class="etm-screen-header">
                    <span class="status-indicator live">● BLE RADAR ACTIVE</span>
                    <span class="etm-bus-badge">${this.busNumber.split(' ')[0]}</span>
                </div>

                <div class="etm-radar-scan-zone">
                    <div class="radar-sweep-animation"></div>
                    <div class="radar-center-point">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#38BDF8" stroke-width="2"><path d="M4.93 4.93a10 10 0 0 1 14.14 0"/><path d="M7.76 7.76a6 6 0 0 1 8.48 0"/><circle cx="12" cy="18" r="2" fill="#38BDF8"/></svg>
                    </div>
                </div>

                <div class="etm-detected-list">
                    <h4>Nearby Passenger Devices (${this.nearbyDevices.length})</h4>
                    
                    ${this.nearbyDevices.length === 0 ? `
                        <div class="etm-empty-radar">
                            <p>No active BLE passenger beacons detected in bus range.</p>
                            <small>Activate a ticket in the Passenger App to broadcast beacon.</small>
                        </div>
                    ` : `
                        <div class="detected-cards">
                            ${this.nearbyDevices.map(dev => `
                                <div class="detected-device-card ${dev.status === 'PUNCHED' ? 'already-punched' : ''}">
                                    <div class="device-card-header">
                                        <strong>${dev.id}</strong>
                                        <span class="rssi-badge">${dev.rssi} dBm (Near)</span>
                                    </div>
                                    <div class="device-meta">
                                        <span>Route: <strong>${dev.routeNumber}</strong></span>
                                        <span>Code: <strong>${dev.visualHash}</strong></span>
                                        <span>Status: <em class="status-${dev.status.toLowerCase()}">${dev.status}</em></span>
                                    </div>
                                    
                                    <div class="device-action" style="display: flex; gap: 6px;">
                                        ${dev.status === 'PUNCHED' ? `
                                            <button class="btn btn-sm btn-success btn-block" disabled>
                                                Already Punched
                                            </button>
                                        ` : `
                                            <button class="btn btn-sm btn-warning btn-block etm-punch-btn" onclick="conductorETM.punchDevice('${dev.id}', ${dev.type === 'SUPERPASS'})">
                                                Punch Ticket (ETM #${this.etmId})
                                            </button>
                                        `}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    async punchDevice(targetId, isPass) {
        try {
            const result = await window.validationEngine.executeBlePunch(targetId, isPass);
            this.showPunchConfirmation(result);
        } catch (err) {
            alert('Punch Error: ' + err.message);
        }
    }

    showPunchConfirmation(result) {
        const display = document.getElementById('etm-screen-content');
        if (!display) return;

        const punch = result.punchRecord;
        const wire = result.wirePacket || punch.wirePacket;
        const punchData = result.punchData || punch.conductorValidationPunchData;

        display.innerHTML = `
            <div class="etm-punch-success-view">
                <div class="etm-punch-check">OK</div>
                <h3 style="margin-bottom: 2px;">PUNCH CONFIRMED</h3>
                <span style="font-size: 0.72rem; color: #10B981; font-weight: 700; letter-spacing: 0.5px;">PROCESSED BY ${this.etmId}</span>

                <!-- 1. Transit Details -->
                <div class="etm-receipt-snippet" style="margin-top: 10px;">
                    <div class="etm-row"><span>Target:</span><strong>${punch.ticketId || punch.passId}</strong></div>
                    <div class="etm-row"><span>Route:</span><span>${punch.routeNumber}</span></div>
                    <div class="etm-row"><span>Conductor:</span><span>${punch.conductorId}</span></div>
                    <div class="etm-row"><span>Bus Fleet:</span><span>${punch.busNumber}</span></div>
                    <div class="etm-row"><span>Punch Time:</span><span>${new Date(punch.timestamp).toLocaleTimeString()}</span></div>
                </div>

                <!-- 2. Machine Wire Payload (PremiumBusPunchDataOverBleApiModel) -->
                <div style="background: #0B1120; border: 1px solid #1E293B; border-radius: 6px; padding: 10px; margin-top: 10px; text-align: left;">
                    <div style="font-size: 0.68rem; color: #94A3B8; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">
                        Machine BLE Wire Packet (<span style="color:#FFC700;">PremiumBusPunchDataOverBleApiModel</span>)
                    </div>
                    <pre style="font-size: 0.68rem; color: #38BDF8; margin: 0; font-family: monospace; white-space: pre-wrap;">${JSON.stringify(wire, null, 2)}</pre>
                </div>

                <!-- 3. Decompiled App Translation (ConductorValidationPunchData) -->
                ${punchData ? `
                    <div style="background: #0F172A; border: 1px solid #1E293B; border-radius: 6px; padding: 10px; margin-top: 8px; text-align: left;">
                        <div style="font-size: 0.68rem; color: #10B981; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">
                            App Parsed Model (<span style="color:#A7F3D0;">ConductorValidationPunchData</span>)
                        </div>
                        <div style="font-size: 0.66rem; color: #CBD5E1; font-family: monospace; line-height: 1.4;">
                            <div>• bookingId: <strong>"${punchData.bookingId}"</strong></div>
                            <div>• productType: <strong>"${punchData.productType}"</strong></div>
                            <div>• productSubType: <strong>"${punchData.productSubType}"</strong></div>
                            <div>• punchTsInMillis: <strong>${punchData.punchTsInMillis}</strong></div>
                            <div>• etmDeviceId: <strong>"${punchData.etmDeviceId}"</strong></div>
                            <div>• endStopId: <strong>"${punchData.endStopId}"</strong></div>
                        </div>
                    </div>
                ` : ''}

                <button class="btn btn-primary btn-block" style="margin-top: 14px;" onclick="conductorETM.switchMode('radar')">
                    Back to Radar
                </button>
            </div>
        `;
    }

    // ==========================================
    // 2. Dynamic QR Scanner View & Token Anatomy Breakdown
    // ==========================================
    renderQrView() {
        const display = document.getElementById('etm-screen-content');
        if (!display) return;

        display.innerHTML = `
            <div class="etm-qr-scanner-wrapper">
                <div class="etm-screen-header">
                    <span class="status-indicator live">● QR SCANNER READY</span>
                    <span>15s Window Crypto Check</span>
                </div>

                <div class="etm-scanner-reticle">
                    <div class="reticle-frame">
                        <div class="laser-sweep"></div>
                        <span class="scan-hint">Place Passenger QR in View</span>
                    </div>
                </div>

                <div class="etm-scanner-controls">
                    <button class="btn btn-warning btn-block" onclick="conductorETM.simulateScanActivePassenger()">
                        Quick Scan Active Passenger
                    </button>
                    
                    <div class="manual-qr-payload-box" style="margin-top: 10px;">
                        <textarea class="form-control" id="etm-qr-input" placeholder="Or paste raw Chalo token envelope here..." rows="2"></textarea>
                        <button class="btn btn-sm btn-secondary btn-block" style="margin-top: 6px;" onclick="conductorETM.verifyManualQr()">
                            Inspect & Verify Chalo Token
                        </button>
                    </div>
                </div>

                <div id="etm-qr-result-box"></div>
            </div>
        `;
    }

    simulateScanActivePassenger() {
        const ticket = window.stateStore.selectedTicket;
        if (!ticket) {
            alert('No ticket available in passenger viewport.');
            return;
        }

        const serverTime = window.timeSync.now();
        const payload = ticket.getDynamicQrPayload(serverTime);
        this.processQrVerification(payload);
    }

    verifyManualQr() {
        const input = document.getElementById('etm-qr-input');
        if (!input || !input.value.trim()) return;
        this.processQrVerification(input.value.trim());
    }

    async processQrVerification(payloadString) {
        const resultBox = document.getElementById('etm-qr-result-box');
        if (resultBox) {
            resultBox.innerHTML = `<div class="loading-spinner">Verifying signature & dissecting token...</div>`;
        }

        try {
            const data = await window.validationEngine.verifyQrPayload(payloadString);
            
            if (resultBox) {
                if (data.valid) {
                    const token = data.parsedToken;
                    resultBox.innerHTML = `
                        <div class="etm-validation-alert alert-success">
                            <span class="alert-icon">[OK]</span>
                            <div class="alert-body">
                                <strong>VALID PASSENGER TICKET (SSCL)</strong>
                                <div>Ticket: ${data.ticket?.ticketId || data.pass?.passId}</div>
                                <div>Route: ${data.ticket?.routeNumber || 'Transit Pass'} (${data.ticket?.origin || 'TRC'} ↔ ${data.ticket?.destination || 'Terminus'})</div>
                            </div>
                        </div>

                        ${token ? `
                            <!-- Exact Token Anatomy Breakdown -->
                            <div style="background: #0B1120; border: 1px solid #1E293B; border-radius: 8px; padding: 10px; margin-top: 10px; text-align: left;">
                                <div style="font-size: 0.72rem; color: #FFC700; font-weight: 800; text-transform: uppercase; margin-bottom: 6px;">
                                    Token Anatomy Breakdown (Decompiled Model)
                                </div>

                                <!-- 1. HEADING -->
                                <div style="background: #0F172A; border-left: 3px solid #38BDF8; padding: 6px 8px; margin-bottom: 6px; border-radius: 3px;">
                                    <div style="font-size: 0.65rem; color: #94A3B8; font-weight: 700;">1. HEADING (2 Bytes)</div>
                                    <div style="font-family: monospace; font-size: 0.7rem; color: #38BDF8; font-weight: 700;">Hex: [ ${token.heading.hex} ]</div>
                                    <div style="font-size: 0.65rem; color: #CBD5E1;">Byte 0: 0x01 (Version 1) • Byte 1: 0x${token.heading.productTypeByte.toString(16).toUpperCase()} (${token.heading.productTypeName})</div>
                                </div>

                                <!-- 2. MIDDLE PART -->
                                <div style="background: #0F172A; border-left: 3px solid #F59E0B; padding: 6px 8px; margin-bottom: 6px; border-radius: 3px;">
                                    <div style="font-size: 0.65rem; color: #94A3B8; font-weight: 700;">2. MIDDLE PART (4 Bytes)</div>
                                    <div style="font-family: monospace; font-size: 0.7rem; color: #F59E0B; font-weight: 700;">Hex: [ ${token.middle.hex} ]</div>
                                    <div style="font-size: 0.65rem; color: #CBD5E1;">4-byte Little Endian UInt32 = ${token.middle.activationSec}s (${token.middle.activationDate})</div>
                                </div>

                                <!-- 3. ENDING -->
                                <div style="background: #0F172A; border-left: 3px solid #10B981; padding: 6px 8px; margin-bottom: 6px; border-radius: 3px;">
                                    <div style="font-size: 0.65rem; color: #94A3B8; font-weight: 700;">3. ENDING (${token.ending.byteLength} Bytes)</div>
                                    <div style="font-family: monospace; font-size: 0.68rem; color: #10B981;">Hex: [ ${token.ending.hex} ]</div>
                                    <div style="font-size: 0.65rem; color: #CBD5E1;">Decoded Static Payload (CRN: ${token.ending.parsedStatic?.crn || 'N/A'}, Agency: ${token.ending.parsedStatic?.agency || 'SSCL'})</div>
                                </div>

                                <!-- 4. DYNAMIC ENVELOPE -->
                                <div style="background: #0F172A; border-left: 3px solid #818CF8; padding: 6px 8px; border-radius: 3px;">
                                    <div style="font-size: 0.65rem; color: #94A3B8; font-weight: 700;">4. ENVELOPE (Base64 + Window + Schema)</div>
                                    <div style="font-size: 0.65rem; color: #CBD5E1;">10-Digit Epoch: <strong style="color: #818CF8;">${token.envelope.epoch10Digits}</strong> • Schema: <strong>,${token.envelope.schemaVersion}</strong></div>
                                </div>
                            </div>
                        ` : ''}

                        <div style="margin-top: 10px;">
                            <button class="btn btn-warning btn-block" onclick="conductorETM.punchDevice('${data.ticket?.ticketId || data.pass?.passId}', ${data.entityType === 'SUPERPASS'})">
                                Punch Validated Ticket Now
                            </button>
                        </div>
                    `;
                } else {
                    resultBox.innerHTML = `
                        <div class="etm-validation-alert alert-danger">
                            <span class="alert-icon">[X]</span>
                            <div class="alert-body">
                                <strong>INVALID / REJECTED: ${data.code || 'FAILED'}</strong>
                                <div>${data.reason || 'Verification failed'}</div>
                            </div>
                        </div>
                    `;
                }
            }
        } catch (e) {
            if (resultBox) {
                resultBox.innerHTML = `
                    <div class="etm-validation-alert alert-danger">
                        <strong>Error:</strong> ${e.message}
                    </div>
                `;
            }
        }
    }

    // ==========================================
    // 3. Visual Verification Code View
    // ==========================================
    renderManualView() {
        const display = document.getElementById('etm-screen-content');
        if (!display) return;

        const activeTicket = window.stateStore.selectedTicket;
        const visualCode = activeTicket ? activeTicket.visualHash : '---';

        display.innerHTML = `
            <div class="etm-manual-wrapper">
                <div class="etm-screen-header">
                    <span class="status-indicator">● VISUAL HASH CHECK</span>
                    <span>GenerateHashCodeForEasyVerificationUseCase</span>
                </div>

                <div class="manual-check-card">
                    <p>Srinagar e-bus conductors perform rapid visual inspection by comparing the passenger's dynamic pulsating color hash with their route ledger.</p>
                    
                    <div class="visual-compare-box">
                        <span class="compare-label">CURRENT EXPECTED HASH</span>
                        <div class="visual-hash-large">${visualCode}</div>
                        <span class="compare-sub">Must match passenger's top security ribbon</span>
                    </div>

                    <div class="form-group" style="margin-top: 14px;">
                        <label class="form-label">Type Passenger 3-Digit Code</label>
                        <input type="text" class="form-control text-center text-uppercase" id="etm-hash-input" maxlength="3" placeholder="e.g. A84" style="font-size: 1.4rem; letter-spacing: 4px; font-weight: 700;">
                        <button class="btn btn-primary btn-block" style="margin-top: 8px;" onclick="conductorETM.verifyHashInput()">
                            Confirm Visual Match
                        </button>
                    </div>

                    <div id="etm-hash-feedback"></div>
                </div>
            </div>
        `;
    }

    verifyHashInput() {
        const input = document.getElementById('etm-hash-input');
        const feedback = document.getElementById('etm-hash-feedback');
        if (!input || !feedback) return;

        const val = input.value.trim().toUpperCase();
        const activeTicket = window.stateStore.selectedTicket;

        if (activeTicket && activeTicket.visualHash.toUpperCase() === val) {
            window.validationEngine.playAudioAlert(true);
            feedback.innerHTML = `
                <div class="etm-validation-alert alert-success" style="margin-top: 10px;">
                    Visual Code Confirmed! Genuine Active Ticket.
                </div>
            `;
        } else {
            window.validationEngine.playAudioAlert(false);
            feedback.innerHTML = `
                <div class="etm-validation-alert alert-danger" style="margin-top: 10px;">
                    Code Mismatch! Suspected Screenshot or Fraud.
                </div>
            `;
        }
    }

    // ==========================================
    // 4. Shift Summary & Punch History
    // ==========================================
    renderShiftView() {
        const display = document.getElementById('etm-screen-content');
        if (!display) return;

        const punches = window.stateStore.conductorPunches;
        const totalPunched = punches.length;
        const estimatedRevenue = totalPunched * 30;

        display.innerHTML = `
            <div class="etm-shift-wrapper">
                <div class="etm-screen-header">
                    <span class="status-indicator">● ETM SHIFT SUMMARY</span>
                    <span>Device: ${this.etmId}</span>
                </div>

                <div class="shift-stats-grid">
                    <div class="shift-stat-box">
                        <span class="stat-label">TOTAL PUNCHES</span>
                        <strong class="stat-val">${totalPunched}</strong>
                    </div>
                    <div class="shift-stat-box">
                        <span class="stat-label">BUS FLEET</span>
                        <strong class="stat-val">${this.busNumber.split(' ')[0]}</strong>
                    </div>
                    <div class="shift-stat-box">
                        <span class="stat-label">COLLECTED</span>
                        <strong class="stat-val">₹${estimatedRevenue}</strong>
                    </div>
                </div>

                <h4 style="margin-top: 16px; margin-bottom: 8px; font-size: 0.9rem;">Punch Audit Log</h4>
                <div class="etm-punch-log-list">
                    ${punches.length === 0 ? `
                        <div class="etm-empty-radar">No punches recorded during this shift.</div>
                    ` : `
                        ${punches.map(p => `
                            <div class="etm-log-row">
                                <div>
                                    <strong>${p.ticketId || p.passId}</strong>
                                    <small>${p.routeNumber} • Hash: ${p.verificationHash}</small>
                                </div>
                                <div class="log-row-right">
                                    <span>${new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    <span class="badge badge-success">PUNCHED</span>
                                </div>
                            </div>
                        `).join('')}
                    `}
                </div>
            </div>
        `;
    }
}

if (typeof window !== 'undefined') {
    window.conductorETM = new ConductorETM();
}
