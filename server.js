const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// In-Memory Database (Simulating Room SQLite Tables)
// ==========================================

// Calibrated server time offset (simulates ChaloTimeSyncWorker.java & BasicInfoContract.c)
let serverTimeOffsetMs = 0;

function getCalibratedTime() {
    return Date.now() + serverTimeOffsetMs;
}

// ----------------------------------------------------------------------
// Srinagar Smart City Limited (SSCL) Electric Bus Transit Catalog
// Electric Bus Fleet: Tata Ultra 9/9m AC e-Buses (Red & White Livery)
// Official digital ticketing partner: Chalo
// ----------------------------------------------------------------------
const TRANSIT_ROUTES = [
    {
        id: 'ROUTE-E01',
        number: 'E-01',
        name: 'Lal Chowk (TRC) ↔ Harwan Garden',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Smart City Electric Bus (AC)',
        baseFare: 11,
        stages: [
            { id: 'ST-01', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-02', name: 'Dalgate Bus Stop', fare: 11 },
            { id: 'ST-03', name: 'Nehru Park Boulevard (Dal Lake)', fare: 15 },
            { id: 'ST-04', name: 'Nishat Garden Ghat', fare: 20 },
            { id: 'ST-05', name: 'Shalimar Mughal Garden', fare: 25 },
            { id: 'ST-06', name: 'Harwan Garden Terminus', fare: 30 }
        ]
    },
    {
        id: 'ROUTE-E02',
        number: 'E-02',
        name: 'Lal Chowk (TRC) ↔ Hazratbal Dargah',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Smart City Electric Bus (AC)',
        baseFare: 11,
        stages: [
            { id: 'ST-10', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-11', name: 'Budshah Bridge / Regal Chowk', fare: 11 },
            { id: 'ST-12', name: 'Khanyar Jamia Masjid Chowk', fare: 15 },
            { id: 'ST-13', name: 'Rainawari Hospital Stop', fare: 18 },
            { id: 'ST-14', name: 'Saida Kadal Lake Crossing', fare: 22 },
            { id: 'ST-15', name: 'Hazratbal Shrine Central Gate', fare: 25 }
        ]
    },
    {
        id: 'ROUTE-E03',
        number: 'E-03',
        name: 'TRC Lal Chowk ↔ Soura (SKIMS Hospital)',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Smart City Electric Bus (AC)',
        baseFare: 11,
        stages: [
            { id: 'ST-20', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-21', name: 'Batamaloo Bus Stand', fare: 11 },
            { id: 'ST-22', name: 'Qamarwari Chowk', fare: 15 },
            { id: 'ST-23', name: 'Eidgah Grounds Stop', fare: 20 },
            { id: 'ST-24', name: 'Ali Jan Road Intersection', fare: 25 },
            { id: 'ST-25', name: 'Soura SKIMS Hospital Terminal', fare: 30 }
        ]
    },
    {
        id: 'ROUTE-E04',
        number: 'E-04',
        name: 'TRC Lal Chowk ↔ Pantha Chowk ↔ Pampore',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Smart City Electric Bus (AC)',
        baseFare: 11,
        stages: [
            { id: 'ST-30', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-31', name: 'Sonwar Army Transit Camp', fare: 11 },
            { id: 'ST-32', name: 'Badami Bagh Cantonment', fare: 15 },
            { id: 'ST-33', name: 'Pantha Chowk Bypass Hub', fare: 20 },
            { id: 'ST-34', name: 'Lasjan Expressway Junction', fare: 25 },
            { id: 'ST-35', name: 'Pampore Saffron Town', fare: 35 }
        ]
    },
    {
        id: 'ROUTE-E05',
        number: 'E-05',
        name: 'TRC Lal Chowk ↔ Srinagar International Airport',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Airport Express Electric Bus',
        baseFare: 15,
        stages: [
            { id: 'ST-40', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-41', name: 'Rajbagh Bridge Crossing', fare: 15 },
            { id: 'ST-42', name: 'Rambagh Elevated Flyover', fare: 20 },
            { id: 'ST-43', name: 'Hyderpora Bypass Chowk', fare: 25 },
            { id: 'ST-44', name: 'Humhama Airforce Gate', fare: 30 },
            { id: 'ST-45', name: 'Srinagar Airport (SXR) Terminal', fare: 40 }
        ]
    }
];

const PASS_TIERS = [
    {
        tierId: 'PASS-SSCL-DAILY',
        type: 'DAILY',
        name: 'SSCL Srinagar Day Pass',
        description: 'Unlimited rides across all Srinagar Smart City Electric Buses for 24 hours.',
        price: 50,
        durationDays: 1,
        maxRides: 9999,
        maxRidesPerDay: 9999,
        serviceTypes: ['BUS_AC_ELECTRIC']
    },
    {
        tierId: 'PASS-SSCL-WEEKLY',
        type: 'WEEKLY',
        name: 'Srinagar Commuter Weekly Pass',
        description: '30 rides valid across 7 days on all Srinagar e-bus routes. Up to 6 rides/day.',
        price: 250,
        durationDays: 7,
        maxRides: 30,
        maxRidesPerDay: 6,
        serviceTypes: ['BUS_AC_ELECTRIC']
    },
    {
        tierId: 'PASS-SSCL-MONTHLY',
        type: 'MONTHLY',
        name: 'Srinagar Monthly SuperPass',
        description: '100 rides valid across 30 days throughout the Srinagar Smart City transit grid.',
        price: 850,
        durationDays: 30,
        maxRides: 100,
        maxRidesPerDay: 8,
        serviceTypes: ['BUS_AC_ELECTRIC']
    }
];

// Persistent stores (simulating Room SQLite TicketDao & SuperPassDao)
const tickets = new Map();
const passes = new Map();
const punchLogs = [];
const inspectorLogs = [];

// ======================================================================
// REVERSE-ENGINEERED CHALO VALIDATION ENGINE
// Sources:
// 1. DefaultValidationQRGeneratorAndroid.java (lines 115-139, 290-298)
// 2. GetRegularBusBLEValidationPayloadUseCase.java (lines 17-62)
// 3. ValidationPayloadConstants.java (f10845a = PrimitiveDataTypeExtentionsKt.a(1, 1))
// 4. PrimitiveDataTypeExtentionsKt.java (lines 10-17)
// 5. GetProductValidationDataFromDataReceivedOverBleConnectionUseCase.java
// ======================================================================

const PRODUCT_TYPE_BYTES = {
    SINGLE_JOURNEY: 0x41, // 65 decimal ('A') -> ValidationProduct.MobileTicketProduct.SingleJourneyTicketValidation
    SUPER_PASS:     0x11, // 17 decimal -> ValidationProduct.SuperPassProduct.MagicPassValidation / RideBasedPassValidation
    INSTANT_TICKET: 0x21, // 33 decimal ('!') -> ValidationProduct.MobileTicketProduct.InstantTicketValidation
    PREMIUM_RESERVE:0x51, // 81 decimal ('Q') -> ValidationProduct.MobileTicketProduct.PremiumReserveTicketValidation
    QUICK_PAY:      0x31, // 49 decimal ('1') -> ValidationProduct.QuickpayProduct.QuickpayValidation
    ONDC_TICKET:    0x61  // 97 decimal ('a') -> ValidationProduct.MobileTicketProduct.OndcTicketValidation
};

/**
 * EXACT mathematical visual hash from decompiled Chalo class:
 * app.chalo.validation.superpass.GenerateHashCodeForEasyVerificationUseCase.java
 * Formula: String.valueOf((Math.abs(strToHash.hashCode()) % (((int) Math.pow(10.0d, i)) - 1)) + 1);
 */
function generateHashCodeForEasyVerification(digits, strToHash) {
    let hash = 0;
    for (let i = 0; i < strToHash.length; i++) {
        hash = ((hash << 5) - hash) + strToHash.charCodeAt(i);
        hash |= 0;
    }
    const maxVal = Math.pow(10, digits) - 1;
    const code = (Math.abs(hash) % maxVal) + 1;
    return String(code).padStart(digits, '0');
}

/**
 * Generates the backend cryptographic Static Payload string stored in MTicket.qrCode / staticPayload.
 * Packed as Base64 encoded JSON containing CRN, Agency, Route, Fare, and HMAC signature.
 */
function generateStaticPayload(bookingId, agency, routeNumber, totalFare) {
    const payloadObj = {
        crn: bookingId,
        agency: agency,
        route: routeNumber,
        fare: totalFare,
        issuedAt: getCalibratedTime()
    };
    const jsonStr = JSON.stringify(payloadObj);
    const hmac = crypto.createHmac('sha256', 'CHALO_SSCL_SECRET_KEY').update(jsonStr).digest('hex').substring(0, 16);
    const rawStatic = Buffer.concat([Buffer.from(jsonStr, 'utf8'), Buffer.from(':' + hmac, 'utf8')]);
    return rawStatic.toString('base64');
}

/**
 * Builds the EXACT 3-part Binary Token and Outer Envelope as constructed in:
 * DefaultValidationQRGeneratorAndroid.java & GetRegularBusBLEValidationPayloadUseCase.java
 *
 * 1. HEADING (2 bytes):
 *    - Byte 0: 0x01 (ValidationPayloadConstants.f10845a, Protocol Version 1)
 *    - Byte 1: Product Type byte (0x41 for Single Journey mTicket, 0x11 for SuperPass)
 *
 * 2. MIDDLE PART (4 bytes):
 *    - 4-byte Little Endian integer: Math.floor(activationTimestampMs / 1000)
 *    - Byte 2: (sec >> 0) & 0xFF
 *    - Byte 3: (sec >> 8) & 0xFF
 *    - Byte 4: (sec >> 16) & 0xFF
 *    - Byte 5: (sec >> 24) & 0xFF
 *
 * 3. ENDING (N bytes):
 *    - Raw decoded static payload bytes: Base64.decode(staticPayload, 2)
 *
 * 4. OUTER ENVELOPE STRING:
 *    - Base64.encodeToString(heading + middle + ending, 0).trim() + "," + epoch10Digits + ",2"
 */
function buildChaloToken(productTypeByte, activationTimestampMs, staticPayloadBase64, currentServerTimeMs) {
    // 1. Heading (2 bytes)
    const heading = Buffer.from([0x01, productTypeByte]);

    // 2. Middle part (4 bytes, Little Endian integer of epoch seconds)
    const activationSec = Math.floor(activationTimestampMs / 1000);
    const middle = Buffer.alloc(4);
    middle.writeUInt32LE(activationSec >>> 0, 0);

    // 3. Ending (decoded raw bytes from staticPayload)
    const ending = Buffer.from(staticPayloadBase64, 'base64');

    // Concatenate [Heading(2) + Middle(4) + Ending(N)]
    const binaryToken = Buffer.concat([heading, middle, ending]);
    const base64BinaryToken = binaryToken.toString('base64');

    // 4. Outer envelope: Base64(binary) + "," + epoch10Digits + ",2"
    const currentEpochSec = Math.floor(currentServerTimeMs / 1000).toString();
    const epoch10Digits = currentEpochSec.length > 10 
        ? currentEpochSec.substring(0, 10) 
        : currentEpochSec.padEnd(10, '0');

    const envelopeString = `${base64BinaryToken},${epoch10Digits},2`;

    return {
        headingHex: heading.toString('hex').toUpperCase(),
        middleHex: middle.toString('hex').toUpperCase(),
        endingHex: ending.slice(0, 24).toString('hex').toUpperCase() + (ending.length > 24 ? '...' : ''),
        headingBytes: Array.from(heading),
        middleBytes: Array.from(middle),
        endingByteLength: ending.length,
        activationTimestampSec: activationSec,
        binaryTokenHex: binaryToken.toString('hex').toUpperCase(),
        base64BinaryToken,
        epoch10Digits,
        schemaVersion: '2',
        envelopeString
    };
}

/**
 * Dissects and parses a Chalo Token Envelope into its exact constituents:
 * Heading, Middle part, Ending, and Dynamic Window.
 */
function parseChaloToken(tokenEnvelopeString) {
    if (!tokenEnvelopeString || typeof tokenEnvelopeString !== 'string') {
        throw new Error('Invalid token string format');
    }

    const parts = tokenEnvelopeString.trim().split(',');
    if (parts.length < 3) {
        throw new Error('Malformed token envelope: Expected [Base64Binary, Epoch10, SchemaVersion]');
    }

    const [base64Binary, epoch10Digits, schemaVersion] = parts;
    if (schemaVersion !== '2') {
        throw new Error(`Unsupported schema version: ${schemaVersion}. Expected 2 (DYNAMIC_BMRCL)`);
    }

    const binaryBuffer = Buffer.from(base64Binary, 'base64');
    if (binaryBuffer.length < 6) {
        throw new Error('Binary token buffer underflow (< 6 bytes header + timestamp)');
    }

    // Heading: First 2 bytes
    const versionByte = binaryBuffer[0];
    const productTypeByte = binaryBuffer[1];
    const heading = binaryBuffer.slice(0, 2);

    // Middle Part: Next 4 bytes (UInt32 Little Endian)
    const middle = binaryBuffer.slice(2, 6);
    const activationSec = middle.readUInt32LE(0);

    // Ending: Remaining bytes (Static Payload)
    const ending = binaryBuffer.slice(6);
    const endingRawString = ending.toString('utf8');

    let parsedStatic = null;
    let signatureHmac = '';
    const colonIdx = endingRawString.lastIndexOf(':');
    if (colonIdx > 0) {
        try {
            parsedStatic = JSON.parse(endingRawString.substring(0, colonIdx));
            signatureHmac = endingRawString.substring(colonIdx + 1);
        } catch (e) {
            // Raw binary payload fallback
        }
    }

    return {
        heading: {
            hex: heading.toString('hex').toUpperCase(),
            versionByte,
            productTypeByte,
            productTypeName: productTypeByte === 0x41 ? 'Single Journey mTicket (0x41)' : (productTypeByte === 0x11 ? 'SuperPass (0x11)' : `Type 0x${productTypeByte.toString(16)}`)
        },
        middle: {
            hex: middle.toString('hex').toUpperCase(),
            activationSec,
            activationDate: new Date(activationSec * 1000).toISOString()
        },
        ending: {
            hex: ending.slice(0, 24).toString('hex').toUpperCase() + (ending.length > 24 ? '...' : ''),
            byteLength: ending.length,
            parsedStatic,
            signatureHmac
        },
        envelope: {
            base64Binary,
            epoch10Digits,
            schemaVersion,
            envelopeString: tokenEnvelopeString
        }
    };
}

/**
 * Conductor Machine Punch Packet Generator & Receiver:
 * Direct implementation of:
 * app.chalo.validationsdk.blevalidation.data.models.api.PremiumBusPunchDataOverBleApiModel
 * & app.chalo.validationsdk.blevalidation.data.models.app.ProductValidationDataReceivedOverBle.ConductorValidationPunchData
 *
 * Wire payload generated by Conductor ETM:
 * {
 *   c: bookingId (string),
 *   k: etmDeviceId (string),
 *   o: productType code: "1" = singleJourneyTicket, "2" = superPass/magicPass,
 *   p: punchTsInMillis (long),
 *   q: endStopId (string)
 * }
 */
function createConductorValidationPunchWirePacket(bookingId, etmDeviceId, productTypeCode, punchTsInMillis, endStopId) {
    return {
        c: bookingId,
        k: etmDeviceId,
        o: productTypeCode, // "1" for Single Journey, "2" for SuperPass
        p: punchTsInMillis,
        q: endStopId
    };
}

function parseConductorValidationPunchWirePacket(wirePacket) {
    const { c: bookingId, k: etmDeviceId, o: typeCode, p: punchTsInMillis, q: endStopId } = wirePacket;

    // Type translation as in GetProductValidationDataFromDataReceivedOverBleConnectionUseCase.java (method e)
    let productType = 'unknown';
    let productSubType = 'unknown';

    if (typeCode === '1') {
        productType = 'singleJourneyTicket';
        productSubType = 'singleJourneyTicket';
    } else if (typeCode === '2') {
        productType = 'superPass';
        productSubType = 'magicPass';
    } else if (typeCode === '7') {
        productType = 'superPass';
        productSubType = 'rideBasedPass';
    } else if (typeCode === '0') {
        productType = 'quickpay';
        productSubType = 'quickpay';
    }

    return {
        punchTsInMillis: Number(punchTsInMillis),
        etmDeviceId: String(etmDeviceId),
        bookingId: String(bookingId),
        productType,
        productSubType,
        endStopId: String(endStopId)
    };
}

function logArchitectureEvent(category, component, message, details = {}) {
    const entry = {
        id: `EV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: getCalibratedTime(),
        category,
        component,
        message,
        details
    };
    inspectorLogs.unshift(entry);
    if (inspectorLogs.length > 100) inspectorLogs.pop();
    broadcast('ARCHITECTURE_EVENT', entry);
    return entry;
}

// WebSocket broadcast helper
function broadcast(type, payload) {
    const message = JSON.stringify({ type, payload });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// ==========================================
// REST API Routes
// ==========================================

// Calibrated Time (ChaloTimeSyncWorker.java)
app.get('/api/time', (req, res) => {
    res.json({
        serverTime: getCalibratedTime(),
        offsetMs: serverTimeOffsetMs,
        isWarped: serverTimeOffsetMs !== 0
    });
});

// Time-Warp Simulation (for testing 4h expiry, 30d pass lapse)
app.post('/api/time/warp', (req, res) => {
    const { advanceMs, reset } = req.body;
    if (reset) {
        serverTimeOffsetMs = 0;
        logArchitectureEvent('TIME_SYNC', 'ChaloTimeSyncWorker.java', 'Server clock reset to real-world hardware time', { offsetMs: 0 });
    } else if (advanceMs) {
        serverTimeOffsetMs += advanceMs;
        const minutes = Math.round(advanceMs / (60 * 1000));
        const hours = (advanceMs / (3600 * 1000)).toFixed(1);
        logArchitectureEvent('TIME_SYNC', 'ChaloTimeSyncWorker.java', `Clock advanced by +${hours}h (+${minutes} mins)`, {
            newCalibratedTime: new Date(getCalibratedTime()).toISOString(),
            offsetMs: serverTimeOffsetMs
        });
    }

    evaluateAllEntities();

    broadcast('TIME_WARPED', {
        serverTime: getCalibratedTime(),
        offsetMs: serverTimeOffsetMs
    });

    res.json({
        success: true,
        serverTime: getCalibratedTime(),
        offsetMs: serverTimeOffsetMs
    });
});

// Transit catalog
app.get('/api/routes', (req, res) => {
    res.json(TRANSIT_ROUTES);
});

app.get('/api/passes/catalog', (req, res) => {
    res.json(PASS_TIERS);
});

// Helper: Evaluate ticket/pass expiration
function evaluateAllEntities() {
    const now = getCalibratedTime();

    for (const ticket of tickets.values()) {
        if (ticket.isActivated && !ticket.isExpired && ticket.expiryTimestamp <= now) {
            ticket.isExpired = true;
            ticket.status = 'EXPIRED';
            logArchitectureEvent('EXPIRY_ENGINE', 'MTicketUtilsHelper.java', `mTicket ${ticket.ticketId} expired after 4h validity window`, {
                ticketId: ticket.ticketId,
                expiryTimestamp: ticket.expiryTimestamp,
                evaluatedAt: now
            });
            broadcast('TICKET_EXPIRED', { ticketId: ticket.ticketId });
        }
    }

    for (const pass of passes.values()) {
        if (pass.status === 'ACTIVE') {
            if (pass.expiryDate <= now || pass.remainingRides <= 0) {
                pass.status = 'EXPIRED';
                logArchitectureEvent('EXPIRY_ENGINE', 'SuperPassValidationProperties.java', `SuperPass ${pass.passId} expired (time window or quota exhausted)`, {
                    passId: pass.passId,
                    remainingRides: pass.remainingRides,
                    expiryDate: pass.expiryDate
                });
                broadcast('PASS_EXPIRED', { passId: pass.passId });
            }
        }
    }
}

// 1. Book mTicket (Direct ticket creation without auth)
app.post('/api/tickets/book', (req, res) => {
    const { routeId, origin, destination, passengerCount = 1, passengerType = 'ADULT' } = req.body;
    const route = TRANSIT_ROUTES.find(r => r.id === routeId) || TRANSIT_ROUTES[0];

    const now = getCalibratedTime();
    const originStage = route.stages.find(s => s.name === origin) || route.stages[0];
    const destStage = route.stages.find(s => s.name === destination) || route.stages[route.stages.length - 1];
    const farePerPerson = Math.max(route.baseFare, Math.abs(destStage.fare - originStage.fare));
    const totalFare = farePerPerson * passengerCount;

    const ticketId = 'CRN-SXR-' + Math.floor(10000000 + Math.random() * 90000000);
    // Visual verification code from GenerateHashCodeForEasyVerificationUseCase.java
    const visualHash = generateHashCodeForEasyVerification(3, `${ticketId}-${now}`);

    // Generate cryptographic static payload
    const staticPayload = generateStaticPayload(ticketId, route.agency, route.number, totalFare);

    const ticket = {
        ticketId,
        routeId: route.id,
        routeNumber: route.number,
        routeName: route.name,
        agency: route.agency,
        vehicleType: route.vehicleType,
        origin: originStage.name,
        destination: destStage.name,
        endStopId: destStage.id,
        passengerCount,
        passengerType,
        farePerPerson,
        totalFare,
        bookingTime: now,
        isActivated: false,
        activationTimestamp: null,
        activationDuration: 14400000, // 4 hours in ms (MTicketUtilsHelper.java)
        expiryTimestamp: null,
        isExpired: false,
        status: 'UNUSED',
        visualHash,
        staticPayload,
        productTypeByte: PRODUCT_TYPE_BYTES.SINGLE_JOURNEY,
        punchDetails: null,
        titoStatus: 'NOT_USED'
    };

    tickets.set(ticketId, ticket);

    logArchitectureEvent('ROOM_DATABASE', 'TicketDao.java', `Inserted new mTicket ${ticketId} into local Room SQLite table`, {
        ticketId,
        status: 'UNUSED',
        totalFare,
        agency: route.agency
    });

    logArchitectureEvent('CHECKOUT_FLOW', 'CheckoutPostPaymentSuperPassDetailsHelperImpl.java', `Payment completed. Activation gate enabled for ${ticketId}`);

    broadcast('TICKET_BOOKED', ticket);
    res.json(ticket);
});

// 2. Activate mTicket (Post-purchase activation gate)
app.post('/api/tickets/activate', (req, res) => {
    const { ticketId } = req.body;
    const ticket = tickets.get(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (ticket.isActivated) {
        return res.status(400).json({ error: 'Ticket already activated' });
    }

    const now = getCalibratedTime();
    ticket.isActivated = true;
    ticket.activationTimestamp = now;
    ticket.expiryTimestamp = now + ticket.activationDuration;
    ticket.status = 'ACTIVE';

    // Build the exact Chalo token at activation time
    const tokenData = buildChaloToken(
        ticket.productTypeByte,
        ticket.activationTimestamp,
        ticket.staticPayload,
        now
    );
    ticket.currentValidationToken = tokenData.envelopeString;

    logArchitectureEvent('LIFECYCLE', 'MTicketUtilsHelper.java', `mTicket ${ticketId} activated. 4-hour countdown initiated.`, {
        activationTimestamp: now,
        expiryTimestamp: ticket.expiryTimestamp,
        tokenHeadingHex: tokenData.headingHex,
        tokenMiddleHex: tokenData.middleHex
    });

    logArchitectureEvent('BACKGROUND_WORKER', 'TITONotificationWorker.java', `Started foreground notification & live ETA pairing for route ${ticket.routeNumber}`);

    broadcast('TICKET_ACTIVATED', ticket);
    res.json(ticket);
});

// 3. Buy SuperPass Subscription
app.post('/api/passes/buy', (req, res) => {
    const { tierId } = req.body;
    const tier = PASS_TIERS.find(t => t.tierId === tierId) || PASS_TIERS[0];

    const now = getCalibratedTime();
    const passId = 'SP-SXR-' + Math.floor(100000 + Math.random() * 900000);
    const expiryDate = now + (tier.durationDays * 24 * 3600 * 1000);
    const staticPayload = generateStaticPayload(passId, 'SSCL Srinagar Smart City', tier.name, tier.price);

    const pass = {
        passId,
        tierId: tier.tierId,
        passType: tier.type,
        tierName: tier.name,
        description: tier.description,
        price: tier.price,
        serviceTypes: tier.serviceTypes,
        agency: 'SSCL Srinagar Smart City',
        startDate: now,
        expiryDate,
        durationDays: tier.durationDays,
        maxRides: tier.maxRides,
        remainingRides: tier.maxRides,
        ridesUsedToday: 0,
        maxRidesPerDay: tier.maxRidesPerDay,
        lastRideTimestamp: null,
        status: 'ACTIVE',
        staticPayload,
        productTypeByte: PRODUCT_TYPE_BYTES.SUPER_PASS,
        visualHash: generateHashCodeForEasyVerification(3, `${passId}-${now}`)
    };

    passes.set(passId, pass);

    logArchitectureEvent('ROOM_DATABASE', 'SuperPassDao.java', `Inserted SuperPass ${passId} (${tier.type}) into Room DB`, {
        passId,
        tier: tier.type,
        expiryDate
    });

    broadcast('PASS_BOUGHT', pass);
    res.json(pass);
});

// 4. Token Generator API (Returns full breakdown: Heading, Middle, Ending, and Envelope)
app.get('/api/token/generate', (req, res) => {
    const { targetId } = req.query;
    const now = getCalibratedTime();

    if (tickets.has(targetId)) {
        const ticket = tickets.get(targetId);
        const activationTs = ticket.activationTimestamp || now;
        const token = buildChaloToken(ticket.productTypeByte, activationTs, ticket.staticPayload, now);
        return res.json({ success: true, type: 'MTICKET', entityId: ticket.ticketId, ...token });
    }

    if (passes.has(targetId)) {
        const pass = passes.get(targetId);
        const token = buildChaloToken(pass.productTypeByte, pass.startDate, pass.staticPayload, now);
        return res.json({ success: true, type: 'SUPERPASS', entityId: pass.passId, ...token });
    }

    // Default sample token
    const sampleStatic = generateStaticPayload('CRN-SXR-DEMO', 'SSCL Srinagar Smart City', 'E-01', 25);
    const sampleToken = buildChaloToken(PRODUCT_TYPE_BYTES.SINGLE_JOURNEY, now, sampleStatic, now);
    res.json({ success: true, type: 'SAMPLE', entityId: 'CRN-SXR-DEMO', ...sampleToken });
});

// 5. Conductor ETM Punch Validation (Receives or Generates Wire Packet)
app.post('/api/validation/ble-punch', (req, res) => {
    const {
        ticketId,
        passId,
        conductorId = 'Conductor Altaf Mir (Badge #C-104)',
        etmDeviceId = 'SSCL-ETM-104',
        busNumber = 'JK-01-AB-1044 (Tata EV)',
        routeNumber = 'E-01'
    } = req.body;

    const now = getCalibratedTime();

    if (ticketId) {
        const ticket = tickets.get(ticketId);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.isExpired || (ticket.expiryTimestamp && ticket.expiryTimestamp <= now)) {
            return res.status(400).json({ error: 'Cannot punch: Ticket is expired!' });
        }
        if (!ticket.isActivated) {
            return res.status(400).json({ error: 'Cannot punch: Ticket not activated yet!' });
        }

        // Generate the EXACT wire packet emitted by the Conductor machine
        // (PremiumBusPunchDataOverBleApiModel)
        const wirePacket = createConductorValidationPunchWirePacket(
            ticket.ticketId,
            etmDeviceId,
            '1', // "1" = singleJourneyTicket
            now,
            ticket.endStopId || 'ST-06'
        );

        // Convert in passenger app to ProductValidationDataReceivedOverBle.ConductorValidationPunchData
        const punchData = parseConductorValidationPunchWirePacket(wirePacket);

        const punchRecord = {
            id: 'PUNCH-' + Date.now(),
            targetType: 'MTICKET',
            ticketId: ticket.ticketId,
            routeNumber: ticket.routeNumber || routeNumber,
            busNumber,
            conductorId,
            etmDeviceId,
            timestamp: now,
            verificationHash: ticket.visualHash,
            conductorValidationPunchData: punchData,
            wirePacket
        };

        ticket.punchDetails = punchRecord;
        ticket.status = 'PUNCHED';
        punchLogs.unshift(punchRecord);

        const receipt = generateDigitalReceipt(ticket, punchRecord);

        logArchitectureEvent('BLE_ENGINE', 'MTicketProductValidationConfig.java', `Conductor BLE Punch executed on ${ticketId} via ETM #${etmDeviceId}`, {
            conductorId,
            etmDeviceId,
            busNumber,
            punchWirePacket: wirePacket,
            conductorValidationPunchData: punchData
        });

        broadcast('TICKET_PUNCHED', { ticketId: ticket.ticketId, punchRecord, receipt });
        return res.json({ success: true, punchRecord, receipt, wirePacket, punchData });
    }

    if (passId) {
        const pass = passes.get(passId);
        if (!pass) return res.status(404).json({ error: 'Pass not found' });
        if (pass.status === 'EXPIRED' || pass.expiryDate <= now) {
            return res.status(400).json({ error: 'Cannot punch: Pass is expired!' });
        }
        if (pass.remainingRides <= 0) {
            return res.status(400).json({ error: 'Cannot punch: Quota exhausted!' });
        }
        if (pass.ridesUsedToday >= pass.maxRidesPerDay) {
            return res.status(400).json({ error: `Daily limit reached (${pass.maxRidesPerDay} rides/day)!` });
        }

        if (pass.remainingRides < 9000) {
            pass.remainingRides -= 1;
        }
        pass.ridesUsedToday += 1;
        pass.lastRideTimestamp = now;

        const wirePacket = createConductorValidationPunchWirePacket(
            pass.passId,
            etmDeviceId,
            '2', // "2" = superPass / magicPass
            now,
            'ALL_STOPS'
        );

        const punchData = parseConductorValidationPunchWirePacket(wirePacket);

        const punchRecord = {
            id: 'PUNCH-' + Date.now(),
            targetType: 'SUPERPASS',
            passId: pass.passId,
            routeNumber,
            busNumber,
            conductorId,
            etmDeviceId,
            timestamp: now,
            verificationHash: pass.visualHash,
            remainingRides: pass.remainingRides,
            conductorValidationPunchData: punchData,
            wirePacket
        };

        punchLogs.unshift(punchRecord);

        logArchitectureEvent('BLE_ENGINE', 'SuperPassValidationProperties.java', `Conductor punched SuperPass ${passId}. Rides remaining: ${pass.remainingRides}`, {
            conductorId,
            etmDeviceId,
            ridesUsedToday: pass.ridesUsedToday,
            punchWirePacket: wirePacket
        });

        broadcast('PASS_PUNCHED', { passId: pass.passId, pass, punchRecord });
        return res.json({ success: true, punchRecord, pass, wirePacket, punchData });
    }

    res.status(400).json({ error: 'Must specify ticketId or passId' });
});

// 6. QR Code Scanner Validation (Parses 3-part Binary Token & 10-digit window)
app.post('/api/validation/qr-scan', (req, res) => {
    const { qrPayload } = req.body;
    if (!qrPayload) return res.status(400).json({ error: 'Missing qrPayload' });

    try {
        const now = getCalibratedTime();
        let parsedToken;

        // Check if payload is in the exact Chalo token format: Base64(binary) + "," + epoch10 + ",2"
        if (typeof qrPayload === 'string' && qrPayload.includes(',')) {
            parsedToken = parseChaloToken(qrPayload);

            // 15-second dynamic window verification
            const tokenEpochSec = parseInt(parsedToken.envelope.epoch10Digits, 10);
            const currentEpochSec = Math.floor(now / 1000);
            const windowAgeSec = Math.abs(currentEpochSec - tokenEpochSec);

            if (windowAgeSec > 30) {
                return res.json({
                    valid: false,
                    reason: 'Stale Dynamic QR Token (Screenshot or replay detected)',
                    code: 'REPLAY_ATTACK',
                    parsedToken,
                    windowAgeSec
                });
            }

            // Find matching entity
            const crn = parsedToken.ending.parsedStatic?.crn;
            if (crn && tickets.has(crn)) {
                const ticket = tickets.get(crn);
                if (ticket.isExpired || (ticket.expiryTimestamp && ticket.expiryTimestamp <= now)) {
                    return res.json({ valid: false, reason: 'Ticket has EXPIRED', code: 'EXPIRED', parsedToken });
                }
                if (!ticket.isActivated) {
                    return res.json({ valid: false, reason: 'Ticket is UNUSED (Not activated)', code: 'NOT_ACTIVATED', parsedToken });
                }

                logArchitectureEvent('QR_VALIDATION', 'TicketQrSchemaType.java', `Dynamic QR validated successfully for ${ticket.ticketId}`, {
                    schema: 'DYNAMIC_BMRCL',
                    heading: parsedToken.heading,
                    middle: parsedToken.middle,
                    windowAgeSec
                });

                return res.json({
                    valid: true,
                    entityType: 'MTICKET',
                    ticket,
                    parsedToken,
                    message: 'Valid Active Ticket'
                });
            } else if (crn && passes.has(crn)) {
                const pass = passes.get(crn);
                if (pass.status === 'EXPIRED' || pass.expiryDate <= now) {
                    return res.json({ valid: false, reason: 'SuperPass has EXPIRED', code: 'EXPIRED', parsedToken });
                }
                return res.json({
                    valid: true,
                    entityType: 'SUPERPASS',
                    pass,
                    parsedToken,
                    message: 'Valid SuperPass'
                });
            }
        }

        // Fallback for legacy JSON
        if (typeof qrPayload === 'string' && qrPayload.startsWith('{')) {
            const parsed = JSON.parse(qrPayload);
            if (parsed.ticketId && tickets.has(parsed.ticketId)) {
                const ticket = tickets.get(parsed.ticketId);
                return res.json({ valid: true, entityType: 'MTICKET', ticket, message: 'Valid Active Ticket (Legacy JSON)' });
            }
        }

        return res.json({ valid: false, reason: 'Unrecognized or unregistered ticket token', code: 'INVALID_TOKEN' });
    } catch (e) {
        return res.status(400).json({ valid: false, error: 'Malformed Chalo Token: ' + e.message });
    }
});

// Active tickets/passes query
app.get('/api/tickets/active', (req, res) => {
    evaluateAllEntities();
    const activeTickets = Array.from(tickets.values()).filter(t => !t.isExpired);
    const activePasses = Array.from(passes.values()).filter(p => p.status === 'ACTIVE');
    res.json({
        tickets: activeTickets,
        passes: activePasses,
        serverTime: getCalibratedTime()
    });
});

// Booking & Punch History
app.get('/api/tickets/history', (req, res) => {
    evaluateAllEntities();
    res.json({
        tickets: Array.from(tickets.values()),
        passes: Array.from(passes.values()),
        punches: punchLogs,
        inspectorLogs: inspectorLogs.slice(0, 50)
    });
});

// Conductor punches
app.get('/api/conductor/punches', (req, res) => {
    res.json({
        punches: punchLogs,
        totalRevenue: punchLogs.reduce((acc, p) => acc + (p.targetType === 'MTICKET' ? 25 : 15), 0),
        count: punchLogs.length
    });
});

// Architecture event audit logs
app.get('/api/inspector/logs', (req, res) => {
    res.json(inspectorLogs);
});

// Server-side QR generator endpoint
app.get('/api/qr', async (req, res) => {
    const text = req.query.text || 'CHALO_SECURE_TICKET';
    try {
        const dataUrl = await QRCode.toDataURL(text, {
            margin: 1,
            width: 250,
            color: { dark: '#0F172A', light: '#FFFFFF' }
        });
        res.json({ dataUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Digital trip receipt generator for Srinagar Smart City Limited (SSCL)
function generateDigitalReceipt(ticket, punch) {
    return {
        receiptId: 'RCPT-SSCL-' + Math.floor(100000 + Math.random() * 900000),
        ticketId: ticket.ticketId,
        agency: 'Srinagar Smart City Limited (SSCL)',
        transitGrid: 'Kashmir Valley Electric Mobility Fleet',
        routeNumber: ticket.routeNumber,
        origin: ticket.origin,
        destination: ticket.destination,
        passengerCount: ticket.passengerCount,
        baseFare: (ticket.totalFare / 1.05).toFixed(2),
        cgst: (ticket.totalFare * 0.025).toFixed(2),
        sgst: (ticket.totalFare * 0.025).toFixed(2),
        totalFare: ticket.totalFare.toFixed(2),
        paymentMethod: 'Chalo Wallet / UPI Cashless',
        etmDeviceId: punch.etmDeviceId,
        conductorId: punch.conductorId,
        busNumber: punch.busNumber,
        punchTime: new Date(punch.timestamp).toLocaleString(),
        cryptographicProof: Buffer.from(`${ticket.ticketId}:${punch.etmDeviceId}:${punch.timestamp}`).toString('base64')
    };
}

// ==========================================
// Seed Initial Demo Data for Srinagar Smart City (SSCL)
// ==========================================
function seedInitialData() {
    const now = getCalibratedTime();
    const route = TRANSIT_ROUTES[0]; // ROUTE-E01 (Lal Chowk ↔ Harwan)

    const ticketId = 'CRN-SXR-84920193';
    const staticPayload = generateStaticPayload(ticketId, route.agency, route.number, 30);

    const activeTicket = {
        ticketId,
        routeId: route.id,
        routeNumber: route.number,
        routeName: route.name,
        agency: route.agency,
        vehicleType: route.vehicleType,
        origin: 'TRC Lal Chowk Central Terminal',
        destination: 'Harwan Garden Terminus',
        endStopId: 'ST-06',
        passengerCount: 1,
        passengerType: 'ADULT',
        farePerPerson: 30,
        totalFare: 30,
        bookingTime: now - (15 * 60 * 1000), // booked 15m ago
        isActivated: true,
        activationTimestamp: now - (10 * 60 * 1000), // activated 10m ago
        activationDuration: 14400000, // 4 hours
        expiryTimestamp: now - (10 * 60 * 1000) + 14400000,
        isExpired: false,
        status: 'ACTIVE',
        visualHash: generateHashCodeForEasyVerification(3, `${ticketId}-${now}`),
        staticPayload,
        productTypeByte: PRODUCT_TYPE_BYTES.SINGLE_JOURNEY,
        punchDetails: null,
        titoStatus: 'NOT_USED'
    };
    tickets.set(ticketId, activeTicket);

    const passId = 'SP-SXR-602914';
    const passTier = PASS_TIERS[1]; // Weekly Commuter Pass
    const passStatic = generateStaticPayload(passId, 'SSCL Srinagar Smart City', passTier.name, passTier.price);

    const activePass = {
        passId,
        tierId: passTier.tierId,
        passType: passTier.type,
        tierName: passTier.name,
        description: passTier.description,
        price: passTier.price,
        serviceTypes: passTier.serviceTypes,
        agency: 'SSCL Srinagar Smart City',
        startDate: now - (2 * 24 * 3600 * 1000),
        expiryDate: now + (5 * 24 * 3600 * 1000),
        durationDays: 7,
        maxRides: 30,
        remainingRides: 26,
        ridesUsedToday: 2,
        maxRidesPerDay: 6,
        lastRideTimestamp: now - (2 * 3600 * 1000),
        status: 'ACTIVE',
        staticPayload: passStatic,
        productTypeByte: PRODUCT_TYPE_BYTES.SUPER_PASS,
        visualHash: generateHashCodeForEasyVerification(3, `${passId}-${now}`)
    };
    passes.set(passId, activePass);

    logArchitectureEvent('SYSTEM_INIT', 'TicketDao.java', 'Initialized local Room DB with SSCL Srinagar e-Bus active mTicket & SuperPass', {
        activeTicketId: ticketId,
        activePassId: passId,
        agency: 'SSCL Srinagar Smart City'
    });
}

seedInitialData();

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚆 Chalo Ticketing Architecture Engine (SSCL Srinagar)`);
    console.log(`🌐 Running on http://localhost:${PORT}`);
    console.log(`====================================================`);
});
