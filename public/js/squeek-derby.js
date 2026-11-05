/**
 * Squeek Derby - Real-Time Hamster Sprint Racing Game
 * Powered by Squeekchain proof-of-work entropy & wheel telemetry.
 */
class SqueekDerby {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        this.raceId = 104;
        this.phase = 'betting'; // 'betting', 'racing', 'settled'
        this.phaseTimeLeft = 25; // seconds
        this.timerInterval = null;

        this.runners = [
            { id: 0, name: 'Pip Squeek', title: 'The Genesis Miner', color: '#f77f00', baseOdds: 2.4, poolSQK: 180, pos: 0, speed: 0, boost: 0 },
            { id: 1, name: 'Cyber Hammy', title: 'Overclocked Cyborg', color: '#00f5d4', baseOdds: 3.2, poolSQK: 120, pos: 0, speed: 0, boost: 0 },
            { id: 2, name: 'Squeektoshi', title: 'Proof-of-Hamster Pioneer', color: '#9d4edd', baseOdds: 2.8, poolSQK: 150, pos: 0, speed: 0, boost: 0 },
            { id: 3, name: 'Whale Nibbler', title: 'DeFi Degenerate', color: '#ff0054', baseOdds: 5.5, poolSQK: 60, pos: 0, speed: 0, boost: 0 }
        ];

        this.userBets = []; // { runnerId, amountSQK, potentialWin }
        this.winner = null;
        this.commentary = '🏁 Bets are open! Select a hamster and lock in your wager.';
        this.particles = [];

        this.init();
    }

    init() {
        if (!this.canvas) return;
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        this._startPhaseTimer();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    _resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 700;
        this.height = 220;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        if (this.ctx) {
            this.ctx.scale(dpr, dpr);
        }
    }

    _startPhaseTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.phaseTimeLeft--;
            if (this.phaseTimeLeft <= 0) {
                if (this.phase === 'betting') {
                    this._startRace();
                } else if (this.phase === 'racing') {
                    this._finishRace();
                } else if (this.phase === 'settled') {
                    this._resetForNextRace();
                }
            }
            this._updateUIState();
        }, 1000);
    }

    _startRace() {
        this.phase = 'racing';
        this.phaseTimeLeft = 14; // 14 seconds sprint
        this.commentary = '🚀 THE GATE OPENS! And they are sprinting down the Squeek Track!';

        if (window.squeekAudio) {
            window.squeekAudio.playNotification();
        }

        // Reset positions
        this.runners.forEach(r => {
            r.pos = 0;
            r.speed = 0.4 + Math.random() * 0.3;
            r.boost = 0;
        });

        window.dispatchEvent(new CustomEvent('squeek:derbyPhase', { detail: { phase: 'racing', raceId: this.raceId } }));
    }

    _finishRace() {
        this.phase = 'settled';
        this.phaseTimeLeft = 10; // 10s cooldown

        // Find leader
        let maxPos = -1;
        let winRunner = this.runners[0];
        this.runners.forEach(r => {
            if (r.pos > maxPos) {
                maxPos = r.pos;
                winRunner = r;
            }
        });

        this.winner = winRunner;
        this.commentary = `🏆 WINNER: #${this.winner.id + 1} ${this.winner.name}! Claim your winnings!`;

        if (window.squeekAudio) {
            window.squeekAudio.playCrowdCheer();
            window.squeekAudio.playCoinSound();
        }

        // Trigger confetti
        this._spawnFinishConfetti();

        // Check if user won
        const myWinningBet = this.userBets.find(b => b.runnerId === this.winner.id);
        if (myWinningBet) {
            this.commentary += ` 💰 You won ${myWinningBet.potentialWin} SQK!`;
        }

        window.dispatchEvent(new CustomEvent('squeek:derbyPhase', {
            detail: {
                phase: 'settled',
                raceId: this.raceId,
                winner: this.winner,
                hasWon: !!myWinningBet,
                winningBet: myWinningBet
            }
        }));
    }

    _resetForNextRace() {
        this.raceId++;
        this.phase = 'betting';
        this.phaseTimeLeft = 25;
        this.userBets = [];
        this.winner = null;
        this.commentary = `🏁 Race #${this.raceId} is open for wagers!`;

        // Slight randomized pool shifts
        this.runners.forEach(r => {
            r.pos = 0;
            r.poolSQK = Math.floor(50 + Math.random() * 150);
        });

        window.dispatchEvent(new CustomEvent('squeek:derbyPhase', { detail: { phase: 'betting', raceId: this.raceId } }));
    }

    placeBet(runnerId, amountSQK) {
        if (this.phase !== 'betting') {
            throw new Error('Bets are closed while the race is underway!');
        }
        const runner = this.runners.find(r => r.id === runnerId);
        if (!runner) throw new Error('Invalid runner');

        const odds = this.calculateOdds(runnerId);
        const potentialWin = Math.floor(amountSQK * odds);

        this.userBets.push({
            runnerId: runnerId,
            runnerName: runner.name,
            amountSQK: amountSQK,
            odds: odds,
            potentialWin: potentialWin
        });

        runner.poolSQK += amountSQK;
        this.commentary = `✅ Wager placed: ${amountSQK} SQK on #${runnerId + 1} ${runner.name} (${odds}x)`;
        this._updateUIState();
    }

    calculateOdds(runnerId) {
        let totalPool = 0;
        this.runners.forEach(r => { totalPool += r.poolSQK; });
        const runner = this.runners[runnerId];
        if (!runner || runner.poolSQK === 0) return 3.0;

        // Parimutuel-inspired odds with minimum 1.5x
        const rawOdds = (totalPool / runner.poolSQK) * 0.92;
        return Math.max(1.5, Math.min(9.9, parseFloat(rawOdds.toFixed(1))));
    }

    _updateUIState() {
        const timerEl = document.getElementById('derby-timer');
        const phaseEl = document.getElementById('derby-phase-badge');
        const commEl = document.getElementById('derby-commentary');

        if (timerEl) timerEl.textContent = `${this.phaseTimeLeft}s`;
        if (phaseEl) {
            phaseEl.textContent = this.phase.toUpperCase();
            phaseEl.className = `phase-badge phase-${this.phase}`;
        }
        if (commEl) commEl.textContent = this.commentary;
    }

    _spawnFinishConfetti() {
        const colors = ['#f77f00', '#00f5d4', '#9d4edd', '#ff0054', '#ffd166'];
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: this.width * 0.88 + (Math.random() * 40 - 20),
                y: this.height * 0.5 + (Math.random() * 80 - 40),
                vx: -2 - Math.random() * 8,
                vy: (Math.random() - 0.5) * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 4 + Math.random() * 4,
                alpha: 1.0
            });
        }
    }

    animate(now) {
        this._render();
        requestAnimationFrame(this.animate);
    }

    _render() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        const laneHeight = h / 4;
        const trackStart = 70;
        const trackEnd = w - 40;
        const trackLength = trackEnd - trackStart;

        // Draw 4 Track Lanes
        for (let i = 0; i < 4; i++) {
            const laneY = i * laneHeight;

            // Lane Background
            ctx.fillStyle = (i % 2 === 0) ? '#111726' : '#0d121f';
            ctx.fillRect(0, laneY, w, laneHeight);

            // Lane divider line
            ctx.strokeStyle = '#1e263d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, laneY + laneHeight);
            ctx.lineTo(w, laneY + laneHeight);
            ctx.stroke();

            // Lane Number / Hamster Avatar Tag
            const runner = this.runners[i];
            ctx.fillStyle = runner.color;
            ctx.font = 'bold 13px "IBM Plex Mono", monospace';
            ctx.fillText(`#${i + 1}`, 14, laneY + laneHeight * 0.55);

            ctx.fillStyle = '#8e9aaf';
            ctx.font = '11px sans-serif';
            ctx.fillText(runner.name, 34, laneY + laneHeight * 0.55);

            // Update physics if racing
            if (this.phase === 'racing') {
                // Entropy influence from wheel speed
                const wheelFactor = (window.squeekSimulator && window.squeekSimulator.rpm > 200) ? 1.4 : 1.0;
                
                // Random speed wobble + sudden burst chance
                if (Math.random() < 0.08) {
                    runner.boost = (Math.random() * 0.6) * wheelFactor;
                } else {
                    runner.boost *= 0.92;
                }

                runner.pos += (runner.speed + runner.boost) * 0.07;
                if (runner.pos > 100) runner.pos = 100;
            } else if (this.phase === 'settled' && this.winner) {
                // Keep winner at front
            }

            // Hamster Runner Sprite on Lane
            const runnerX = trackStart + (trackLength * (runner.pos / 100));
            const runnerY = laneY + laneHeight * 0.52;

            this._drawHamsterRunner(ctx, runnerX, runnerY, runner);
        }

        // Finish Line (Checkered pattern)
        const finishX = trackEnd;
        const checkSize = 6;
        for (let y = 0; y < h; y += checkSize) {
            const isWhite = Math.floor(y / checkSize) % 2 === 0;
            ctx.fillStyle = isWhite ? '#ffffff' : '#111111';
            ctx.fillRect(finishX, y, checkSize, checkSize);
            ctx.fillStyle = isWhite ? '#111111' : '#ffffff';
            ctx.fillRect(finishX + checkSize, y, checkSize, checkSize);
        }

        // Draw Confetti Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.restore();
        }
    }

    _drawHamsterRunner(ctx, x, y, runner) {
        ctx.save();
        ctx.translate(x, y);

        const isMoving = this.phase === 'racing';
        const bounce = isMoving ? Math.sin(performance.now() * 0.03 + runner.id) * 3 : 0;
        const legPhase = isMoving ? Math.sin(performance.now() * 0.04 + runner.id) * 4 : 0;

        // Nitro trail if boosting
        if (runner.boost > 0.3) {
            ctx.strokeStyle = runner.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(-30 - (runner.boost * 20), 0);
            ctx.stroke();
        }

        // Little Hamster Ball / Runner Body
        ctx.fillStyle = runner.color;
        ctx.beginPath();
        ctx.ellipse(0, bounce, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // White underbelly
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(2, bounce + 2, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Paws
        ctx.fillStyle = '#ffb4a2';
        ctx.beginPath();
        ctx.arc(-5 + legPhase, bounce + 8, 2.5, 0, Math.PI * 2);
        ctx.arc(6 - legPhase, bounce + 8, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = runner.color;
        ctx.beginPath();
        ctx.arc(-3, bounce - 8, 3, 0, Math.PI * 2);
        ctx.arc(3, bounce - 8, 3, 0, Math.PI * 2);
        ctx.fill();

        // Eye & Goggles
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(6, bounce - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Winner Crown if settled & winner
        if (this.phase === 'settled' && this.winner && this.winner.id === runner.id) {
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.moveTo(-6, bounce - 10);
            ctx.lineTo(-4, bounce - 17);
            ctx.lineTo(0, bounce - 12);
            ctx.lineTo(4, bounce - 17);
            ctx.lineTo(6, bounce - 10);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

window.SqueekDerby = SqueekDerby;
