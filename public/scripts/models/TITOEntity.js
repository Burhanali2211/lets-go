/**
 * Model: TITOEntity (app.chalo.tito.data.model.entity.TITOValidationEntity)
 * Implements Tap-In / Tap-Out validation lifecycle for automated metro and bus gates.
 */
class TITOEntity {
    constructor(data = {}) {
        this.ticketId = data.ticketId;
        this.status = data.status || 'NOT_USED'; // NOT_USED, TAPPED_IN, TAPPED_OUT, USED
        this.tapInStation = data.tapInStation || null;
        this.tapInTime = data.tapInTime || null;
        this.tapOutStation = data.tapOutStation || null;
        this.tapOutTime = data.tapOutTime || null;
        this.calculatedFare = data.calculatedFare || 0;
    }

    tapIn(stationName, timestamp) {
        if (this.status !== 'NOT_USED') {
            throw new Error(`Cannot tap in: Current state is ${this.status}`);
        }
        this.status = 'TAPPED_IN';
        this.tapInStation = stationName;
        this.tapInTime = timestamp;
        return this;
    }

    tapOut(stationName, timestamp, fare = 0) {
        if (this.status !== 'TAPPED_IN') {
            throw new Error(`Cannot tap out: Ticket has not been tapped in!`);
        }
        this.status = 'TAPPED_OUT';
        this.tapOutStation = stationName;
        this.tapOutTime = timestamp;
        this.calculatedFare = fare;
        return this;
    }

    isComplete() {
        return this.status === 'TAPPED_OUT' || this.status === 'USED';
    }
}

if (typeof window !== 'undefined') {
    window.TITOEntity = TITOEntity;
}
