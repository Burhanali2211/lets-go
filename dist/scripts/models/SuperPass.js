/**
 * Model: SuperPass (app.chalo.superpass.data.models.entities.SuperPass & RideBasedSuperPass)
 * Subscription pass entity managing ride quotas, daily limits, and expiration.
 *
 * Implements exact 3-part Chalo Token generation for SuperPass:
 * ProductType byte: 0x11 (MagicPassValidation / RideBasedPassValidation)
 */
class SuperPass {
    constructor(data = {}) {
        this.passId = data.passId || ('SP-SXR-' + Math.floor(100000 + Math.random() * 900000));
        this.tierId = data.tierId || 'PASS-SSCL-WEEKLY';
        this.passType = data.passType || 'WEEKLY'; // DAILY, WEEKLY, MONTHLY
        this.tierName = data.tierName || 'Srinagar Commuter Weekly Pass';
        this.description = data.description || '30 rides valid across 7 days on all Srinagar e-bus routes.';
        this.price = data.price !== undefined ? data.price : 0;
        this.serviceTypes = data.serviceTypes || ['BUS_AC_ELECTRIC'];
        this.agency = data.agency || 'SSCL Srinagar Smart City';
        this.startDate = data.startDate || Date.now();
        this.durationDays = data.durationDays || 7;
        this.expiryDate = data.expiryDate || (this.startDate + this.durationDays * 24 * 3600 * 1000);
        this.maxRides = data.maxRides !== undefined ? data.maxRides : 30;
        this.remainingRides = data.remainingRides !== undefined ? data.remainingRides : this.maxRides;
        this.ridesUsedToday = data.ridesUsedToday || 0;
        this.maxRidesPerDay = data.maxRidesPerDay || 6;
        this.lastRideTimestamp = data.lastRideTimestamp || null;
        this.status = data.status || 'ACTIVE'; // ACTIVE, EXPIRED, CANCELLED
        this.visualHash = data.visualHash || MTicket.generateVisualHash(2, `${this.passId}-${this.startDate}`);
        this.staticPayload = data.staticPayload || MTicket.createDefaultStaticPayload(this.passId, this.agency, this.tierName, this.price);
        this.productTypeByte = 0x11; // 17 decimal -> SuperPass / MagicPass
        this.renewedFrom = data.renewedFrom || null;
    }

    /**
     * Checks if pass is valid based on expiration date and remaining ride quota.
     * Corresponds to SuperPassValidationProperties.java in Chalo codebase.
     */
    isValid(currentTime) {
        if (this.status === 'EXPIRED') return false;
        if (currentTime >= this.expiryDate) {
            this.status = 'EXPIRED';
            return false;
        }
        if (this.remainingRides <= 0) {
            this.status = 'EXPIRED';
            return false;
        }
        return true;
    }

    /**
     * Validates if a ride can be punched right now (respects daily fraud limit).
     */
    canRideNow(currentTime) {
        if (!this.isValid(currentTime)) {
            return { allowed: false, reason: 'Pass has expired or ride quota exhausted.' };
        }
        if (this.ridesUsedToday >= this.maxRidesPerDay) {
            return { allowed: false, reason: `Daily limit of ${this.maxRidesPerDay} rides reached for today.` };
        }
        return { allowed: true, remainingRides: this.remainingRides, ridesLeftToday: this.maxRidesPerDay - this.ridesUsedToday };
    }

    /**
     * Calculates time window countdown.
     */
    getTimeRemaining(currentTime) {
        const diff = this.expiryDate - currentTime;
        if (diff <= 0) {
            this.status = 'EXPIRED';
            return { days: 0, hours: 0, minutes: 0, formatted: 'Expired', isExpired: true };
        }

        const totalHours = Math.floor(diff / (3600 * 1000));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));

        let formatted = '';
        if (days > 0) {
            formatted = `${days}d ${hours}h left`;
        } else {
            formatted = `${hours}h ${minutes}m left`;
        }

        return {
            days,
            hours,
            minutes,
            totalMs: diff,
            formatted,
            isExpired: false
        };
    }

    /**
     * Generates exact Chalo dynamic QR payload for SuperPass with 15s rotating window.
     */
    getDynamicQrPayload(currentTime) {
        const breakdown = this.getTokenBreakdown(currentTime);
        return breakdown.envelopeString;
    }

    getTokenBreakdown(currentTime) {
        // 1. Heading (2 bytes): [0x01, 0x11]
        const headingBytes = [0x01, this.productTypeByte];

        // 2. Middle Part (4 bytes): UInt32 Little Endian of activation / start epoch seconds
        const actSec = Math.floor(this.startDate / 1000);
        const middleBytes = [
            actSec & 0xFF,
            (actSec >>> 8) & 0xFF,
            (actSec >>> 16) & 0xFF,
            (actSec >>> 24) & 0xFF
        ];

        // 3. Ending: Decoded raw bytes from Base64 staticPayload
        const endingBytes = MTicket.base64ToBytes(this.staticPayload);

        // Combined binary payload
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
                meaning: 'Version 0x01 + SuperPass / MagicPass (0x11)'
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
                meaning: 'Base64.decode(staticPayload, 2) [PassId + Tier + HMAC signature]'
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
}

if (typeof window !== 'undefined') {
    window.SuperPass = SuperPass;
}
