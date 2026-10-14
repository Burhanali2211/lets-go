/**
 * Engine: TimeSyncEngine (Simulating ChaloTimeSyncWorker.java)
 * Prevents device clock spoofing by synchronizing local time against server epoch.
 * Drives real-time countdown tickers and demo time-warp controls.
 */
class TimeSyncEngine {
    constructor() {
        this.serverOffsetMs = 0;
        this.listeners = new Set();
        this.tickerInterval = null;
        this.lastSync = null;
    }

    async init() {
        await this.syncWithServer();
        this.startTicker();
    }

    async syncWithServer() {
        try {
            const startPing = Date.now();
            const res = await fetch('/api/time');
            if (res.ok) {
                const data = await res.json();
                const roundTrip = Date.now() - startPing;
                
                // Offset = (serverTime + latency/2) - localTime
                this.serverOffsetMs = (data.serverTime + Math.floor(roundTrip / 2)) - Date.now();
                this.lastSync = Date.now();
                
                this.emit('sync', {
                    serverTime: this.now(),
                    offsetMs: this.serverOffsetMs,
                    isWarped: data.isWarped
                });
            }
        } catch (e) {
            console.warn('[TimeSyncEngine] Server sync ping failed, using local clock', e);
        }
    }

    startTicker() {
        if (this.tickerInterval) clearInterval(this.tickerInterval);
        this.tickerInterval = setInterval(() => {
            const current = this.now();
            this.emit('tick', current);
        }, 1000);
    }

    /**
     * Returns calibrated server time in milliseconds.
     * Equivalent to BasicInfoContract.c() in Chalo Android code.
     */
    now() {
        return Date.now() + this.serverOffsetMs;
    }

    /**
     * Time-Warp tool for testing 4-hour ticket expiry, 24h reset, 30d pass lapse.
     */
    async warp(advanceMs) {
        try {
            const res = await fetch('/api/time/warp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ advanceMs })
            });
            const data = await res.json();
            this.serverOffsetMs = data.offsetMs;
            this.emit('warp', { serverTime: this.now(), offsetMs: this.serverOffsetMs });
            return data;
        } catch (e) {
            console.error('[TimeSyncEngine] Warp failed', e);
        }
    }

    async resetTime() {
        try {
            const res = await fetch('/api/time/warp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reset: true })
            });
            const data = await res.json();
            this.serverOffsetMs = 0;
            this.emit('warp', { serverTime: this.now(), offsetMs: 0 });
            return data;
        } catch (e) {
            console.error('[TimeSyncEngine] Reset failed', e);
        }
    }

    on(event, callback) {
        this.listeners.add({ event, callback });
        return () => this.off(event, callback);
    }

    off(event, callback) {
        for (const item of this.listeners) {
            if (item.event === event && item.callback === callback) {
                this.listeners.delete(item);
                break;
            }
        }
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
    window.timeSync = new TimeSyncEngine();
}
