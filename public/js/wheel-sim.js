/**
 * WHEELY9000 Telemetry & Physics Simulator
 * Simulates real hamster physical activity, proof-of-work generation, and renders 60fps canvas.
 */
class WheelySimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        // Telemetry State
        this.rpm = 160;
        this.targetRPM = 180;
        this.wheelAngle = 0;
        this.totalRevolutions = 14258;
        this.wheelDiameterMeters = 0.28; // 28cm standard running wheel
        this.wheelCircumference = Math.PI * this.wheelDiameterMeters; // ~0.88m per rev
        this.distanceMeters = this.totalRevolutions * this.wheelCircumference;
        this.blocksMined = 57;
        this.blockDifficulty = 250; // revs per block
        this.revsIntoCurrentBlock = 85;
        this.status = 'Mining'; // 'Mining', 'Cruising', 'Resting', 'OVERCLOCKED'
        this.stamina = 82;
        
        // Boosts & Particle Systems
        this.activeBoosts = [];
        this.particles = [];
        this.confetti = [];
        this.floatingTexts = [];
        this.lastTimestamp = performance.now();
        this.hamsterRunPhase = 0;

        // Telemetry listeners
        this.listeners = [];

        // Autonomous activity cycles (hamsters alternate between sprints and resting)
        this.cycleTimer = 0;
        this.cycleDuration = 12000; // 12 seconds per rhythm shift
        this.isOverclocked = false;

        this.init();
    }

    init() {
        if (!this.canvas) return;
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Periodically poll live feed if reachable
        this._pollLiveFeed();
        setInterval(() => this._pollLiveFeed(), 10000);
    }

    _resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 600;
        this.height = Math.min(420, this.width * 0.7);
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        if (this.ctx) {
            this.ctx.scale(dpr, dpr);
        }
    }

    onTelemetryUpdate(callback) {
        this.listeners.push(callback);
    }

    _emitTelemetry() {
        const speedKmh = (this.rpm * this.wheelCircumference * 60) / 1000;
        const speedMph = speedKmh * 0.621371;
        const powerWatts = (this.rpm * 0.08).toFixed(1);
        const hashrateKhs = (this.rpm * 1.45).toFixed(1);
        const blockProgress = Math.min(100, Math.floor((this.revsIntoCurrentBlock / this.blockDifficulty) * 100));

        const telemetry = {
            rpm: Math.round(this.rpm),
            totalRevolutions: Math.floor(this.totalRevolutions),
            distanceMeters: Math.floor(this.distanceMeters),
            speedKmh: speedKmh.toFixed(1),
            speedMph: speedMph.toFixed(1),
            powerWatts: powerWatts,
            hashrateKhs: hashrateKhs,
            blocksMined: this.blocksMined,
            blockProgress: blockProgress,
            status: this.status,
            stamina: Math.round(this.stamina),
            isOverclocked: this.isOverclocked
        };

        this.listeners.forEach(cb => cb(telemetry));
        if (window.squeekAudio) {
            window.squeekAudio.updateWheelHum(this.rpm);
        }
    }

    async _pollLiveFeed() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const res = await fetch('https://media.squeekchain.com/live/current.json', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                if (data.rpm) {
                    this.targetRPM = data.rpm;
                    if (data.total_revolutions) this.totalRevolutions = data.total_revolutions;
                }
            }
        } catch (e) {
            // Live endpoint not reachable, seamlessly continues with internal physical simulation
        }
    }

    /**
     * User clicked "Cheer / Overclock"
     */
    cheer() {
        this.rpm = Math.min(390, this.rpm + 35);
        this.targetRPM = Math.min(380, this.targetRPM + 25);
        this.stamina = Math.min(100, this.stamina + 8);
        this.isOverclocked = this.rpm > 260;

        if (window.squeekAudio) {
            window.squeekAudio.playSqueek();
        }

        this.addFloatingText('+35 RPM CHEER!', '#ffb703');
        this._spawnSparks(25, '#ffd166');
    }

    /**
     * Applied when an on-chain treat transaction is sent
     */
    applyTreatBoost(name, rpmBoost, durationSeconds = 30) {
        const boost = {
            name,
            rpmBoost,
            expiresAt: performance.now() + (durationSeconds * 1000)
        };
        this.activeBoosts.push(boost);
        this.targetRPM = Math.min(395, this.targetRPM + rpmBoost);
        this.rpm = Math.min(395, this.rpm + (rpmBoost * 0.8));
        this.stamina = 100;
        this.isOverclocked = true;

        if (window.squeekAudio) {
            window.squeekAudio.playTreatMunch();
            setTimeout(() => window.squeekAudio.playSqueek(), 300);
        }

        this.addFloatingText(`YUM! +${rpmBoost} RPM (${name})`, '#06d6a0');
        this._spawnSparks(40, '#06d6a0');
        this._spawnConfetti(25);
    }

    addFloatingText(text, color = '#ffd166') {
        this.floatingTexts.push({
            text,
            color,
            x: this.width * 0.5 + (Math.random() * 80 - 40),
            y: this.height * 0.45,
            vy: -1.2,
            opacity: 1.0,
            life: 60
        });
    }

    _spawnSparks(count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            this.particles.push({
                x: this.width * 0.5,
                y: this.height * 0.5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1.5 + Math.random() * 2.5,
                color: color,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    _spawnConfetti(count) {
        const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#00f5d4'];
        for (let i = 0; i < count; i++) {
            this.confetti.push({
                x: this.width * 0.5 + (Math.random() * 100 - 50),
                y: this.height * 0.4,
                vx: (Math.random() - 0.5) * 6,
                vy: -3 - Math.random() * 5,
                width: 6 + Math.random() * 4,
                height: 4 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 12,
                alpha: 1.0
            });
        }
    }

    updatePhysics(deltaSec) {
        // Handle natural hamster sprint cycles
        this.cycleTimer += deltaSec * 1000;
        if (this.cycleTimer > this.cycleDuration) {
            this.cycleTimer = 0;
            // Hamster mood switches
            const rand = Math.random();
            if (rand < 0.25) {
                // Sprint burst
                this.targetRPM = 240 + Math.random() * 90;
                this.status = 'Mining';
            } else if (rand < 0.70) {
                // Steady running
                this.targetRPM = 140 + Math.random() * 70;
                this.status = 'Cruising';
            } else {
                // Brief pause / snack
                this.targetRPM = 15 + Math.random() * 30;
                this.status = 'Resting';
            }
        }

        // Active treat boosts
        const now = performance.now();
        this.activeBoosts = this.activeBoosts.filter(b => b.expiresAt > now);
        let boostSum = 0;
        this.activeBoosts.forEach(b => { boostSum += b.rpmBoost; });
        if (boostSum > 0) {
            this.targetRPM += boostSum * 0.4;
            this.status = 'OVERCLOCKED';
            this.isOverclocked = true;
        } else {
            this.isOverclocked = this.rpm > 250;
            if (this.status === 'OVERCLOCKED') this.status = 'Mining';
        }

        // Smooth inertia interpolation towards targetRPM
        const lerpFactor = 0.04;
        this.rpm += (this.targetRPM - this.rpm) * lerpFactor;
        if (this.rpm < 0) this.rpm = 0;

        // Revolutions and block progress
        const revsThisFrame = (this.rpm / 60) * deltaSec;
        this.totalRevolutions += revsThisFrame;
        this.distanceMeters += revsThisFrame * this.wheelCircumference;
        this.revsIntoCurrentBlock += revsThisFrame;

        // Wheel rotation angle
        const angularVelocity = (this.rpm * 2 * Math.PI) / 60; // rad/s
        this.wheelAngle += angularVelocity * deltaSec;

        // Block Mined check
        if (this.revsIntoCurrentBlock >= this.blockDifficulty) {
            this.revsIntoCurrentBlock -= this.blockDifficulty;
            this.blocksMined++;
            this.addFloatingText('⛏️ SQUEEK BLOCK MINED!', '#00f5d4');
            this._spawnConfetti(35);
            if (window.squeekAudio) {
                window.squeekAudio.playCoinSound();
            }
            // Trigger block mined event on window
            window.dispatchEvent(new CustomEvent('squeek:blockMined', {
                detail: { blockNumber: this.blocksMined, totalRevs: Math.floor(this.totalRevolutions) }
            }));
        }

        // Hamster running paw animation phase
        this.hamsterRunPhase += angularVelocity * deltaSec * 1.8;
    }

    animate(now) {
        const deltaSec = Math.min(0.1, (now - this.lastTimestamp) / 1000);
        this.lastTimestamp = now;

        this.updatePhysics(deltaSec);
        this._render();
        this._emitTelemetry();

        requestAnimationFrame(this.animate);
    }

    _render() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        const centerX = w * 0.5;
        const centerY = h * 0.52;
        const wheelRadius = Math.min(w * 0.38, h * 0.44);

        // Cyberpunk cage background ambient glow
        const bgGlow = ctx.createRadialGradient(centerX, centerY, wheelRadius * 0.2, centerX, centerY, wheelRadius * 1.4);
        if (this.isOverclocked) {
            bgGlow.addColorStop(0, 'rgba(255, 183, 3, 0.18)');
            bgGlow.addColorStop(1, 'rgba(255, 75, 43, 0.0)');
        } else {
            bgGlow.addColorStop(0, 'rgba(0, 245, 212, 0.12)');
            bgGlow.addColorStop(1, 'rgba(10, 14, 23, 0.0)');
        }
        ctx.fillStyle = bgGlow;
        ctx.fillRect(0, 0, w, h);

        // Outer Rig Mounting Bracket (Metallic A-Frame)
        ctx.save();
        ctx.strokeStyle = '#2b3044';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - wheelRadius * 0.85, centerY + wheelRadius * 1.05);
        ctx.lineTo(centerX, centerY);
        ctx.lineTo(centerX + wheelRadius * 0.85, centerY + wheelRadius * 1.05);
        ctx.stroke();

        // Stand base plate
        ctx.strokeStyle = '#1b1f2e';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(centerX - wheelRadius * 1.0, centerY + wheelRadius * 1.05);
        ctx.lineTo(centerX + wheelRadius * 1.0, centerY + wheelRadius * 1.05);
        ctx.stroke();
        ctx.restore();

        // WHEEL RIM (Rotates with wheelAngle)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.wheelAngle);

        // Wheel outer track rim
        ctx.strokeStyle = this.isOverclocked ? '#ffb703' : '#00f5d4';
        ctx.lineWidth = 6;
        ctx.shadowColor = this.isOverclocked ? 'rgba(255, 183, 3, 0.7)' : 'rgba(0, 245, 212, 0.6)';
        ctx.shadowBlur = this.isOverclocked ? 20 : 12;
        ctx.beginPath();
        ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner runner tread track
        ctx.strokeStyle = '#1f2438';
        ctx.lineWidth = 14;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, wheelRadius - 10, 0, Math.PI * 2);
        ctx.stroke();

        // Cross spokes (12 spokes with neon tick markers)
        const spokeCount = 12;
        for (let i = 0; i < spokeCount; i++) {
            const angle = (i * Math.PI * 2) / spokeCount;
            ctx.strokeStyle = (i % 3 === 0) ? (this.isOverclocked ? '#ff595e' : '#70e000') : '#384260';
            ctx.lineWidth = (i % 3 === 0) ? 3 : 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * (wheelRadius - 10), Math.sin(angle) * (wheelRadius - 10));
            ctx.stroke();

            // Tread grip ridges on outer rim
            const outerX = Math.cos(angle) * wheelRadius;
            const outerY = Math.sin(angle) * wheelRadius;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(outerX, outerY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center hub bearing
        ctx.fillStyle = '#0f1422';
        ctx.strokeStyle = this.isOverclocked ? '#ffca3a' : '#00f5d4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // THE RUNNING HAMSTER (Stationary at bottom curve, legs running!)
        this._renderHamster(ctx, centerX, centerY, wheelRadius);

        // Render Particles (Sparks, Confetti, Floating Text)
        this._renderParticles(ctx);
    }

    _renderHamster(ctx, centerX, centerY, wheelRadius) {
        ctx.save();
        // Hamster rests near the bottom-right curve of the wheel (around 70 degrees)
        const hamsterAngle = Math.PI * 0.44;
        const hamsterDist = wheelRadius - 28;
        const hX = centerX + Math.cos(hamsterAngle) * hamsterDist;
        const hY = centerY + Math.sin(hamsterAngle) * hamsterDist;

        ctx.translate(hX, hY);
        // Tilt body slightly upwards to run against rotation
        const runTilt = -0.15 + (Math.sin(this.hamsterRunPhase * 2) * 0.05);
        ctx.rotate(runTilt);

        const isRunning = this.rpm > 30;
        const legSwing = isRunning ? Math.sin(this.hamsterRunPhase) * 12 : 0;
        const breath = Math.sin(performance.now() * 0.005) * 2;

        // Overclocked Aura around Hamster
        if (this.isOverclocked) {
            ctx.save();
            ctx.shadowColor = '#ffb703';
            ctx.shadowBlur = 25;
            ctx.fillStyle = 'rgba(255, 183, 3, 0.25)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 36, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Paws (Back paws)
        ctx.fillStyle = '#ffb4a2';
        ctx.beginPath();
        ctx.ellipse(-16 + legSwing, 14, 5, 4, 0.2, 0, Math.PI * 2);
        ctx.ellipse(14 - legSwing, 14, 5, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Hamster Chubby Body (Golden Brown / Fur gradient)
        const furGrad = ctx.createRadialGradient(-4, -2, 4, 0, 0, 28);
        furGrad.addColorStop(0, '#f9c74f');
        furGrad.addColorStop(0.7, '#d48b38');
        furGrad.addColorStop(1, '#9d5c19');
        ctx.fillStyle = furGrad;
        ctx.beginPath();
        ctx.ellipse(0, 2 + breath * 0.5, 26, 18 + breath, 0, 0, Math.PI * 2);
        ctx.fill();

        // White Belly
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath();
        ctx.ellipse(4, 6, 14, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Front Paws
        ctx.fillStyle = '#ffb4a2';
        ctx.beginPath();
        ctx.ellipse(-10 - legSwing, 15, 4.5, 4, -0.1, 0, Math.PI * 2);
        ctx.ellipse(18 + legSwing, 15, 4.5, 4, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Tiny cute tail
        ctx.fillStyle = '#ffb4a2';
        ctx.beginPath();
        ctx.arc(-26, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Head
        const headX = 18;
        const headY = -8;
        ctx.fillStyle = '#d48b38';
        ctx.beginPath();
        ctx.arc(headX, headY, 14, 0, Math.PI * 2);
        ctx.fill();

        // Chubby Cheeks
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(headX + 6, headY + 5, 7, 0, Math.PI * 2);
        ctx.fill();

        // Cute Ears
        ctx.fillStyle = '#d48b38';
        ctx.beginPath();
        ctx.arc(headX - 6, headY - 12, 6, 0, Math.PI * 2);
        ctx.arc(headX + 6, headY - 12, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffb4a2';
        ctx.beginPath();
        ctx.arc(headX - 6, headY - 12, 3.5, 0, Math.PI * 2);
        ctx.arc(headX + 6, headY - 12, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (Blinks or Sleepy)
        if (this.status === 'Resting' && this.rpm < 40) {
            // Closed eyes (curved line)
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(headX + 8, headY - 1, 4, 0.2, Math.PI - 0.2);
            ctx.stroke();

            // "Zzz" sleeping indicator
            ctx.fillStyle = '#00f5d4';
            ctx.font = 'bold 13px "IBM Plex Mono", monospace';
            ctx.fillText('z', headX + 16, headY - 16);
            ctx.font = 'bold 16px "IBM Plex Mono", monospace';
            ctx.fillText('Z', headX + 22, headY - 26);
        } else {
            // Shiny determined running eyes
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.arc(headX + 8, headY - 1, 4, 0, Math.PI * 2);
            ctx.fill();

            // Eye shine
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(headX + 7, headY - 2.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pink nose & mouth
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(headX + 15, headY + 3, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Whiskers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(headX + 12, headY + 4);
        ctx.lineTo(headX + 25, headY + 1);
        ctx.moveTo(headX + 12, headY + 6);
        ctx.lineTo(headX + 24, headY + 8);
        ctx.stroke();

        // Sweat drops if working hard (>200 RPM)
        if (this.rpm > 200 && isRunning) {
            ctx.fillStyle = '#3a86ff';
            ctx.beginPath();
            ctx.arc(headX - 10, headY - 18 + (Math.sin(performance.now() * 0.02) * 4), 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Golden Headband / Crown if Overclocked
        if (this.isOverclocked) {
            ctx.fillStyle = '#ff0054';
            ctx.fillRect(headX - 8, headY - 7, 24, 4);
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(headX + 4, headY - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _renderParticles(ctx) {
        // Render and update spark particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Render confetti
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.18; // gravity
            c.rotation += c.rotSpeed;
            c.alpha -= 0.015;

            if (c.alpha <= 0 || c.y > this.height) {
                this.confetti.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = c.alpha;
            ctx.translate(c.x, c.y);
            ctx.rotate((c.rotation * Math.PI) / 180);
            ctx.fillStyle = c.color;
            ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
            ctx.restore();
        }

        // Render floating text
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life--;
            ft.opacity = Math.max(0, ft.life / 60);

            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ft.opacity;
            ctx.font = 'bold 15px "Barlow Condensed", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 6;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }
}

window.WheelySimulator = WheelySimulator;
