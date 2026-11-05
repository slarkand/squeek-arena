/**
 * Squeek Audio Engine - 100% Web Audio API Synthesized Sounds
 * No external mp3/wav files required, zero broken asset links.
 */
class SqueekAudio {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.volume = 0.5;
        this.wheelHumOsc = null;
        this.wheelHumGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;

        // Initialize continuous wheel hum oscillator
        this._initWheelHum();
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain && this.ctx && !this.isMuted) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    _initWheelHum() {
        if (!this.ctx) return;
        try {
            this.wheelHumOsc = this.ctx.createOscillator();
            this.wheelHumGain = this.ctx.createGain();

            this.wheelHumOsc.type = 'triangle';
            this.wheelHumOsc.frequency.setValueAtTime(30, this.ctx.currentTime);
            this.wheelHumGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

            // Lowpass filter for smooth bearing rumble
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(180, this.ctx.currentTime);

            this.wheelHumOsc.connect(filter);
            filter.connect(this.wheelHumGain);
            this.wheelHumGain.connect(this.masterGain);
            this.wheelHumOsc.start();
        } catch (e) {
            console.warn('Wheel hum init ignored:', e);
        }
    }

    /**
     * Update continuous bearing hum pitch according to live wheel RPM
     */
    updateWheelHum(rpm) {
        if (!this.wheelHumOsc || !this.wheelHumGain || !this.ctx || this.isMuted) return;
        const normalizedRPM = Math.max(0, Math.min(400, rpm));
        const targetFreq = 25 + (normalizedRPM * 0.45);
        const targetGain = normalizedRPM > 10 ? Math.min(0.12, (normalizedRPM / 400) * 0.12) : 0.0001;

        const now = this.ctx.currentTime;
        this.wheelHumOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
        this.wheelHumGain.gain.setTargetAtTime(targetGain, now, 0.1);
    }

    /**
     * Play high-pitched cute hamster squeak
     */
    playSqueek() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Chirp: rapid upward frequency sweep then decay
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(2600, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.18);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.24);
    }

    /**
     * Play treat crunching / munching sound
     */
    playTreatMunch() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        for (let i = 0; i < 3; i++) {
            const start = this.ctx.currentTime + (i * 0.07);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(350 + (Math.random() * 150), start);
            osc.frequency.exponentialRampToValueAtTime(120, start + 0.05);

            gain.gain.setValueAtTime(0.12, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(start);
            osc.stop(start + 0.06);
        }
    }

    /**
     * Play win / coin clink sound
     */
    playCoinSound() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        [987.77, 1318.51].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + (idx * 0.08);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(start);
            osc.stop(start + 0.36);
        });
    }

    /**
     * Crowd cheer on sprint finish
     */
    playCrowdCheer() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 1.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        // White noise modulated to sound like clapping and cheer
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.3;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.Q.setValueAtTime(2.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        whiteNoise.start(now);
        whiteNoise.stop(now + 1.25);
    }

    /**
     * Notification chime
     */
    playNotification() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + (idx * 0.06);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.15, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(start);
            osc.stop(start + 0.26);
        });
    }
}

window.squeekAudio = new SqueekAudio();
