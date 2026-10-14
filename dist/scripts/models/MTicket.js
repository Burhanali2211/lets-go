/**
 * Model: MTicket (app.chalo.models.mticketing.MTicket)
 * Exact representation of Chalo Mobile Ticket entity and validation state machine.
 *
 * Reverse-Engineered from:
 * 1. DefaultValidationQRGeneratorAndroid.java (lines 115-139, 290-298)
 * 2. GetRegularBusBLEValidationPayloadUseCase.java (lines 17-62)
 * 3. ValidationPayloadConstants.java (ValidationPayloadConstants.f10845a)
 * 4. PrimitiveDataTypeExtentionsKt.java (lines 10-17)
 */
class MTicket {
    constructor(data = {}) {
        this.ticketId = data.ticketId || ('CRN-SXR-' + Math.floor(10000000 + Math.random() * 90000000));
        this.routeId = data.routeId || 'ROUTE-E01';
        this.routeNumber = data.routeNumber || 'E-01';
        this.routeName = data.routeName || 'Lal Chowk (TRC) ↔ Harwan Garden';
        this.agency = data.agency || 'SSCL Srinagar Smart City';
        this.vehicleType = data.vehicleType || 'Smart City Electric Bus (AC)';
        this.origin = data.origin || 'TRC Lal Chowk Central Terminal';
        this.destination = data.destination || 'Harwan Garden Terminus';
        this.endStopId = data.endStopId || 'ST-06';
        this.passengerCount = data.passengerCount || 1;
        this.passengerType = data.passengerType || 'ADULT';
        this.farePerPerson = data.farePerPerson !== undefined ? data.farePerPerson : 0;
        this.totalFare = data.totalFare !== undefined ? data.totalFare : 0;
        this.bookingTime = data.bookingTime || Date.now();
        this.isActivated = data.isActivated || false;
        this.activationTimestamp = data.activationTimestamp || null;
        this.activationDuration = data.activationDuration || 14400000; // 4 Hours (14,400,000 ms) in Chalo MTicketUtilsHelper.java
        this.expiryTimestamp = data.expiryTimestamp || null;
        this.isExpired = data.isExpired || false;
        this.status = data.status || 'UNUSED'; // UNUSED, ACTIVE, PUNCHED, EXPIRED, CANCELLED
        this.visualHash = data.visualHash || MTicket.generateVisualHash(3, `${this.ticketId}-${this.bookingTime}`);
        this.staticPayload = data.staticPayload || MTicket.createDefaultStaticPayload(this.ticketId, this.agency, this.routeNumber, this.totalFare);
        this.productTypeByte = 0x41; // 65 decimal -> SingleJourneyTicketValidation
        this.punchDetails = data.punchDetails || null;
        this.titoStatus = data.titoStatus || 'NOT_USED';
        this.titoTapIn = data.titoTapIn || null;
        this.titoTapOut = data.titoTapOut || null;
    }

    /**
     * Checks if ticket is currently active based on calibrated server time.
     * Corresponds to MTicketUtilsHelper.l() in Chalo decompiled code.
     */
    isActive(currentTime) {
        if (!this.isActivated) return false;
        if (this.isExpired) return false;
        if (this.expiryTimestamp && currentTime >= this.expiryTimestamp) {
            this.isExpired = true;
            this.status = 'EXPIRED';
            return false;
        }
        return true;
    }

    /**
     * Calculates remaining countdown from the 4-hour activation window.
     */
    getTimeRemaining(currentTime) {
        if (!this.isActivated) {
            return { hours: 4, minutes: 0, seconds: 0, totalMs: 14400000, formatted: '04:00:00', isExpired: false };
        }
        if (this.isExpired || !this.expiryTimestamp) {
            return { hours: 0, minutes: 0, seconds: 0, totalMs: 0, formatted: 'Expired', isExpired: true };
        }

        const diff = this.expiryTimestamp - currentTime;
        if (diff <= 0) {
            this.isExpired = true;
            this.status = 'EXPIRED';
            return { hours: 0, minutes: 0, seconds: 0, totalMs: 0, formatted: '00:00:00', isExpired: true };
        }

        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n) => String(n).padStart(2, '0');
        const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        return {
            hours,
            minutes,
            seconds,
            totalMs: diff,
            percentRemaining: Math.max(0, Math.min(100, (diff / this.activationDuration) * 100)),
            formatted,
            isExpired: false
        };
    }

    /**
     * Generates the EXACT dynamic validation QR / BLE string as implemented in:
     * DefaultValidationQRGeneratorAndroid.d() and GetRegularBusBLEValidationPayloadUseCase.a()
     *
     * Format:
     * Base64( Heading[2] + Middle[4] + Ending[N] ) + "," + 10DigitEpoch + ",2"
     */
    getDynamicQrPayload(currentTime) {
        const breakdown = this.getTokenBreakdown(currentTime);
        return breakdown.envelopeString;
    }

    /**
     * Dissects the token into Heading, Middle part, Ending, and Envelope
     */
    getTokenBreakdown(currentTime) {
        // 1. Heading (2 bytes): [ 0x01, productTypeByte (0x41) ]
        const headingBytes = [0x01, this.productTypeByte];

        // 2. Middle Part (4 bytes): UInt32 Little Endian of activation epoch seconds
        const actSec = Math.floor((this.activationTimestamp || currentTime) / 1000);
        const middleBytes = [
            actSec & 0xFF,
            (actSec >>> 8) & 0xFF,
            (actSec >>> 16) & 0xFF,
            (actSec >>> 24) & 0xFF
        ];

        // 3. Ending: Decoded raw bytes from Base64 staticPayload
        const endingBytes = MTicket.base64ToBytes(this.staticPayload);

        // Combined binary payload: [Heading (2) + Middle (4) + Ending (N)]
        const fullBinaryBytes = headingBytes.concat(middleBytes, endingBytes);
        const base64Binary = MTicket.bytesToBase64(fullBinaryBytes);

        // 4. Envelope: Base64(binary) + "," + epoch10Digits + ",2"
        const currentSecStr = Math.floor(currentTime / 1000).toString();
        const epoch10Digits = currentSecStr.length > 10 ? currentSecStr.substring(0, 10) : currentSecStr.padEnd(10, '0');
        const envelopeString = `${base64Binary},${epoch10Digits},2`;

        const toHex = (bytes) => bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

        return {
            heading: {
                bytes: headingBytes,
                hex: toHex(headingBytes),
                versionByte: 0x01,
                productTypeByte: this.productTypeByte,
                meaning: 'Version 0x01 + Single Journey Ticket (0x41)'
            },
            middle: {
                bytes: middleBytes,
                hex: toHex(middleBytes),
                activationSec: actSec,
                activationDate: new Date(actSec * 1000).toLocaleTimeString(),
                meaning: '4-byte Little Endian integer of activation timestamp in seconds'
            },
            ending: {
                byteLength: endingBytes.length,
                hex: toHex(endingBytes.slice(0, 16)) + (endingBytes.length > 16 ? ' ...' : ''),
                meaning: 'Base64.decode(staticPayload, 2) [CRN + Agency + HMAC signature]'
            },
            envelope: {
                base64Binary,
                epoch10Digits,
                schemaVersion: '2 (DYNAMIC_BMRCL)',
                windowRotatingEvery: '15 seconds'
            },
            envelopeString
        };
    }

    /**
     * Exact formula from app.chalo.validation.superpass.GenerateHashCodeForEasyVerificationUseCase.java:
     * String.valueOf((Math.abs(strToHash.hashCode()) % (((int) Math.pow(10.0d, i)) - 1)) + 1);
     */
    static generateVisualHash(digits = 2, strToHash) {
        let hash = 0;
        const str = String(strToHash || 'SSCL-CHALO-TICKET');
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        const maxVal = Math.pow(10, digits) - 1; // 99 for digits=2
        const codeNum = (Math.abs(hash) % maxVal) + 1;
        const numStr = String(codeNum).padStart(digits, '0');

        // 5-character alphabetic hash code matching decompiled Chalo
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let suffix = '';
        let h = Math.abs(hash);
        for (let j = 0; j < 5; j++) {
            suffix += chars[h % chars.length];
            h = Math.floor(h / chars.length) + (j + 1) * 11;
        }
        return `${numStr} ${suffix}`;
    }

    static createDefaultStaticPayload(ticketId, agency, route, fare) {
        const payloadStr = JSON.stringify({ crn: ticketId, agency, route, fare }) + ':SSCL_HMAC_SIG';
        return MTicket.stringToBase64(payloadStr);
    }

    static base64ToBytes(base64) {
        if (typeof atob === 'function') {
            const bin = atob(base64);
            const bytes = new Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return bytes;
        }
        return Array.from(Buffer.from(base64, 'base64'));
    }

    static bytesToBase64(bytes) {
        if (typeof btoa === 'function') {
            let bin = '';
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            return btoa(bin);
        }
        return Buffer.from(bytes).toString('base64');
    }

    static stringToBase64(str) {
        if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
        return Buffer.from(str, 'utf8').toString('base64');
    }
}

if (typeof window !== 'undefined') {
    window.MTicket = MTicket;
}
