/**
 * Engine: StateStore
 * Central reactive state store managing tickets, passes, and transit catalog.
 * Built for 100% standalone Netlify / offline deployment with localStorage persistence,
 * while automatically syncing with backend APIs when available.
 */

const DEFAULT_SRINAGAR_ROUTES = [
    {
        id: 'ROUTE-E01',
        number: 'E-01',
        name: 'Lal Chowk (TRC) ↔ Harwan Garden',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Smart City Electric Bus (AC)',
        baseFare: 0,
        stages: [
            { id: 'ST-01', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-02', name: 'Dalgate Bus Stop', fare: 0 },
            { id: 'ST-03', name: 'Nehru Park Boulevard (Dal Lake)', fare: 0 },
            { id: 'ST-04', name: 'Nishat Garden Ghat', fare: 0 },
            { id: 'ST-05', name: 'Shalimar Mughal Garden', fare: 0 },
            { id: 'ST-06', name: 'Harwan Garden Terminus', fare: 0 }
        ]
    },
    {
        id: 'ROUTE-E02',
        number: 'E-02',
        name: 'Lal Chowk (TRC) ↔ Hazratbal Dargah',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Smart City Electric Bus (AC)',
        baseFare: 0,
        stages: [
            { id: 'ST-10', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-11', name: 'Budshah Bridge / Regal Chowk', fare: 0 },
            { id: 'ST-12', name: 'Khanyar Jamia Masjid Chowk', fare: 0 },
            { id: 'ST-13', name: 'Rainawari Hospital Stop', fare: 0 },
            { id: 'ST-14', name: 'Saida Kadal Lake Crossing', fare: 0 },
            { id: 'ST-15', name: 'Hazratbal Shrine Central Gate', fare: 0 }
        ]
    },
    {
        id: 'ROUTE-E03',
        number: 'E-03',
        name: 'TRC Lal Chowk ↔ Soura (SKIMS Hospital)',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Smart City Electric Bus (AC)',
        baseFare: 0,
        stages: [
            { id: 'ST-20', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-21', name: 'Batamaloo Bus Stand', fare: 0 },
            { id: 'ST-22', name: 'Qamarwari Chowk', fare: 0 },
            { id: 'ST-23', name: 'Eidgah Grounds Stop', fare: 0 },
            { id: 'ST-24', name: 'Ali Jan Road Intersection', fare: 0 },
            { id: 'ST-25', name: 'Soura SKIMS Hospital Terminal', fare: 0 }
        ]
    },
    {
        id: 'ROUTE-E04',
        number: 'E-04',
        name: 'TRC Lal Chowk ↔ Pantha Chowk ↔ Pampore',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Smart City Electric Bus (AC)',
        baseFare: 0,
        stages: [
            { id: 'ST-30', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-31', name: 'Sonwar Army Transit Camp', fare: 0 },
            { id: 'ST-32', name: 'Badami Bagh Cantonment', fare: 0 },
            { id: 'ST-33', name: 'Pantha Chowk Bypass Hub', fare: 0 },
            { id: 'ST-34', name: 'Lasjan Expressway Junction', fare: 0 },
            { id: 'ST-35', name: 'Pampore Saffron Town', fare: 0 }
        ]
    },
    {
        id: 'ROUTE-E05',
        number: 'E-05',
        name: 'TRC Lal Chowk ↔ Srinagar International Airport',
        agency: 'SSCL Srinagar Smart City',
        type: 'BUS_AC_ELECTRIC',
        vehicleType: 'Airport Express Electric Bus',
        baseFare: 0,
        stages: [
            { id: 'ST-40', name: 'TRC Lal Chowk Central Terminal', fare: 0 },
            { id: 'ST-41', name: 'Rajbagh Bridge Crossing', fare: 0 },
            { id: 'ST-42', name: 'Rambagh Elevated Flyover', fare: 0 },
            { id: 'ST-43', name: 'Hyderpora Bypass Chowk', fare: 0 },
            { id: 'ST-44', name: 'Humhama Airforce Gate', fare: 0 },
            { id: 'ST-45', name: 'Srinagar Airport (SXR) Terminal', fare: 0 }
        ]
    }
];

const DEFAULT_PASS_TIERS = [
    {
        tierId: 'PASS-SSCL-DAILY',
        type: 'DAILY',
        name: 'SSCL Srinagar Day Pass',
        description: 'Unlimited rides across all Srinagar Smart City Electric Buses for 24 hours.',
        price: 0,
        durationDays: 1,
        maxRides: 9999,
        maxRidesPerDay: 9999,
        serviceTypes: ['BUS_AC_ELECTRIC']
    },
    {
        tierId: 'PASS-SSCL-WEEKLY',
        type: 'WEEKLY',
        name: 'Srinagar Commuter Weekly Pass',
        description: '30 rides valid across 7 days on all Srinagar e-bus routes.',
        price: 0,
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
        price: 0,
        durationDays: 30,
        maxRides: 100,
        maxRidesPerDay: 8,
        serviceTypes: ['BUS_AC_ELECTRIC']
    }
];

class StateStore {
    constructor() {
        this.routes = DEFAULT_SRINAGAR_ROUTES;
        this.passTiers = DEFAULT_PASS_TIERS;
        this.tickets = [];
        this.passes = [];
        this.selectedTicket = null;
        this.selectedPass = null;
        this.conductorPunches = [];
        this.ws = null;
        this.listeners = new Set();
    }

    async init() {
        // 1. Load routes & passes (try remote or fallback to embedded)
        await Promise.all([
            this.fetchRoutes(),
            this.fetchPassTiers()
        ]);

        // 2. Load entities from localStorage or seed initial data
        this.loadFromLocalStorage();

        // 3. Connect WebSocket if running on a live server (gracefully ignore on Netlify)
        this.initWebSocket();
    }

    loadFromLocalStorage() {
        try {
            const storedTickets = localStorage.getItem('chalo_sscl_tickets');
            const storedPasses = localStorage.getItem('chalo_sscl_passes');

            if (storedTickets) {
                const parsed = JSON.parse(storedTickets);
                this.tickets = parsed.map(t => new MTicket(t));
            }

            if (storedPasses) {
                const parsed = JSON.parse(storedPasses);
                this.passes = parsed.map(p => new SuperPass(p));
            }
        } catch (e) {
            console.warn('[StateStore] localStorage read error', e);
        }

        const now = Date.now();

        // Ensure at least one active, valid ticket is available for immediate testing
        this.tickets = this.tickets.filter(t => !t.isExpired && t.isActive(now));
        if (this.tickets.length === 0) {
            const seedTicket = new MTicket({
                ticketId: 'CRN-SXR-' + Math.floor(10000000 + Math.random() * 90000000),
                routeId: 'ROUTE-E01',
                routeNumber: 'E-01',
                routeName: 'Lal Chowk (TRC) ↔ Harwan Garden',
                origin: 'TRC Lal Chowk Central Terminal',
                destination: 'Harwan Garden Terminus',
                endStopId: 'ST-06',
                passengerCount: 1,
                totalFare: 0,
                isActivated: true,
                activationTimestamp: now - (2 * 60 * 1000),
                activationDuration: 14400000,
                expiryTimestamp: now + 14280000, // ~3h 58m remaining
                isExpired: false,
                status: 'ACTIVE',
                visualHash: '26 WLTDO'
            });
            this.tickets.unshift(seedTicket);
        }

        // Ensure at least one active SuperPass is available
        this.passes = this.passes.filter(p => p.isValid(now));
        if (this.passes.length === 0) {
            const seedPass = new SuperPass({
                passId: 'SP-SXR-' + Math.floor(100000 + Math.random() * 900000),
                tierId: 'PASS-SSCL-WEEKLY',
                passType: 'WEEKLY',
                tierName: 'Srinagar Commuter Weekly Pass',
                price: 0,
                startDate: now - (1 * 24 * 3600 * 1000),
                expiryDate: now + (6 * 24 * 3600 * 1000),
                remainingRides: 28,
                status: 'ACTIVE',
                visualHash: '26 WLTDO'
            });
            this.passes.unshift(seedPass);
        }

        this.selectedTicket = this.tickets[0];
        this.selectedPass = this.passes[0];
        this.saveToLocalStorage();
        this.emit('entities:updated', { tickets: this.tickets, passes: this.passes });
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('chalo_sscl_tickets', JSON.stringify(this.tickets));
            localStorage.setItem('chalo_sscl_passes', JSON.stringify(this.passes));
        } catch (e) {
            console.warn('[StateStore] localStorage write error', e);
        }
    }

    async fetchRoutes() {
        try {
            const res = await fetch('/api/routes');
            if (res.ok) {
                this.routes = await res.json();
            }
        } catch (e) {
            // Standalone Netlify fallback already set to DEFAULT_SRINAGAR_ROUTES
        }
        this.emit('routes:updated', this.routes);
    }

    async fetchPassTiers() {
        try {
            const res = await fetch('/api/passes/catalog');
            if (res.ok) {
                this.passTiers = await res.json();
            }
        } catch (e) {
            // Standalone Netlify fallback already set to DEFAULT_PASS_TIERS
        }
        this.emit('tiers:updated', this.passTiers);
    }

    // ----------------------------------------------------
    // Client-Side Ticket & Pass Operations (Works 100% Offline / Netlify)
    // ----------------------------------------------------
    async bookTicketLocally({ routeId, origin, destination, passengerCount = 1 }) {
        const route = this.routes.find(r => r.id === routeId) || this.routes[0];
        const now = Date.now();
        const ticketId = 'CRN-SXR-' + Math.floor(10000000 + Math.random() * 90000000);

        const newTicket = new MTicket({
            ticketId,
            routeId: route.id,
            routeNumber: route.number,
            routeName: route.name,
            agency: route.agency,
            vehicleType: route.vehicleType,
            origin,
            destination,
            passengerCount,
            totalFare: 0,
            bookingTime: now,
            isActivated: true, // Instantly active for frictionless real-world testing
            activationTimestamp: now,
            activationDuration: 14400000,
            expiryTimestamp: now + 14400000,
            isExpired: false,
            status: 'ACTIVE',
            visualHash: '26 WLTDO'
        });

        this.upsertTicket(newTicket);
        return newTicket;
    }

    async activateTicketLocally(ticketId) {
        const ticket = this.tickets.find(t => t.ticketId === ticketId);
        if (!ticket) throw new Error('Ticket not found');

        const now = Date.now();
        ticket.isActivated = true;
        ticket.activationTimestamp = now;
        ticket.expiryTimestamp = now + ticket.activationDuration;
        ticket.status = 'ACTIVE';

        this.upsertTicket(ticket);
        return ticket;
    }

    async buyPassLocally(tierId) {
        const tier = this.passTiers.find(t => t.tierId === tierId) || this.passTiers[0];
        const now = Date.now();
        const passId = 'SP-SXR-' + Math.floor(100000 + Math.random() * 900000);

        const newPass = new SuperPass({
            passId,
            tierId: tier.tierId,
            passType: tier.type,
            tierName: tier.name,
            description: tier.description,
            price: 0,
            durationDays: tier.durationDays,
            maxRides: tier.maxRides,
            remainingRides: tier.maxRides,
            startDate: now,
            expiryDate: now + (tier.durationDays * 24 * 3600 * 1000),
            status: 'ACTIVE'
        });

        this.upsertPass(newPass);
        return newPass;
    }

    async renewPassLocally(passId) {
        const oldPass = this.passes.find(p => p.passId === passId);
        const tierId = oldPass ? oldPass.tierId : this.passTiers[0].tierId;
        return this.buyPassLocally(tierId);
    }

    async punchTicketLocally(targetId, isPass = false) {
        const now = Date.now();
        if (!isPass) {
            const ticket = this.tickets.find(t => t.ticketId === targetId);
            if (!ticket) throw new Error('Ticket not found');

            const punchRecord = {
                id: 'PUNCH-' + now,
                targetType: 'MTICKET',
                ticketId: ticket.ticketId,
                routeNumber: ticket.routeNumber,
                busNumber: 'JK-01-AB-1044 (Tata EV)',
                conductorId: 'Conductor Altaf Mir (Badge #C-104)',
                etmDeviceId: 'SSCL-ETM-104',
                timestamp: now,
                verificationHash: ticket.visualHash
            };

            ticket.punchDetails = punchRecord;
            ticket.status = 'PUNCHED';
            this.conductorPunches.unshift(punchRecord);
            this.saveToLocalStorage();
            this.emit('ticket:punched', { ticket, punchRecord });
            this.emit('entities:updated', { tickets: this.tickets, passes: this.passes });
            return { success: true, punchRecord, ticket };
        } else {
            const pass = this.passes.find(p => p.passId === targetId);
            if (!pass) throw new Error('Pass not found');

            if (pass.remainingRides < 9000) {
                pass.remainingRides = Math.max(0, pass.remainingRides - 1);
            }
            pass.ridesUsedToday += 1;
            pass.lastRideTimestamp = now;

            const punchRecord = {
                id: 'PUNCH-' + now,
                targetType: 'SUPERPASS',
                passId: pass.passId,
                routeNumber: 'E-01',
                busNumber: 'JK-01-AB-1044 (Tata EV)',
                conductorId: 'Conductor Altaf Mir (Badge #C-104)',
                etmDeviceId: 'SSCL-ETM-104',
                timestamp: now,
                verificationHash: pass.visualHash,
                remainingRides: pass.remainingRides
            };

            this.conductorPunches.unshift(punchRecord);
            this.saveToLocalStorage();
            this.emit('pass:punched', { pass, punchRecord });
            this.emit('entities:updated', { tickets: this.tickets, passes: this.passes });
            return { success: true, punchRecord, pass };
        }
    }

    upsertTicket(ticket) {
        const idx = this.tickets.findIndex(t => t.ticketId === ticket.ticketId);
        if (idx >= 0) {
            this.tickets[idx] = ticket;
        } else {
            this.tickets.unshift(ticket);
        }
        this.selectedTicket = ticket;
        this.saveToLocalStorage();
        this.emit('entities:updated', { tickets: this.tickets, passes: this.passes });
    }

    upsertPass(pass) {
        const idx = this.passes.findIndex(p => p.passId === pass.passId);
        if (idx >= 0) {
            this.passes[idx] = pass;
        } else {
            this.passes.unshift(pass);
        }
        this.selectedPass = pass;
        this.saveToLocalStorage();
        this.emit('entities:updated', { tickets: this.tickets, passes: this.passes });
    }

    initWebSocket() {
        // Only attempt WebSocket if not on file: protocol
        if (typeof window === 'undefined' || window.location.protocol === 'file:') return;
        
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[StateStore] Real-time WebSocket sync connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const { type, payload } = JSON.parse(event.data);
                    if (type === 'TICKET_PUNCHED') {
                        const t = this.tickets.find(x => x.ticketId === payload.ticketId);
                        if (t) {
                            t.punchDetails = payload.punchRecord;
                            t.status = 'PUNCHED';
                            this.emit('ticket:punched', { ticket: t });
                        }
                    }
                } catch (err) {}
            };

            this.ws.onerror = () => {
                // Silently fallback to standalone local operation on Netlify
            };
        } catch (e) {
            // Standalone fallback
        }
    }

    on(event, callback) {
        this.listeners.add({ event, callback });
        return () => this.listeners.delete(callback);
    }

    emit(event, data) {
        for (const item of this.listeners) {
            if (item.event === event) {
                try { item.callback(data); } catch (e) { console.error(e); }
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.stateStore = new StateStore();
}
