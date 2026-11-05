/**
 * SqueekSentry - Autonomous Event Execution Bot
 * Listens to Squeekchain on-chain & telemetry events and executes smart contract transactions automatically.
 */
class SqueekBot {
    constructor() {
        this.isActive = false;
        this.strategies = {
            autoFeeder: true,     // Feeds hamster when RPM drops below threshold
            yieldCompounder: true, // Restakes SqueekFi rewards on BlockMined
            derbySniper: false     // Snipes value bets in final seconds
        };

        // Parameters
        this.rpmThreshold = 95;
        this.minCompoundReward = 15;
        this.sniperBetAmount = 20;

        // Statistics
        this.totalTxExecuted = 0;
        this.totalGasUsed = 0;
        this.totalSQKDispatched = 0;

        // Rate limiting
        this.lastFeedTime = 0;
        this.lastCompoundTime = 0;

        this.logs = [];
        this.init();
    }

    init() {
        this._bindEvents();
        this.log('🤖 SqueekSentry Bot initialized. Standing by for Squeekchain events...', 'system');
    }

    _bindEvents() {
        // 1. Listen for Proof-of-Work Block Mined
        window.addEventListener('squeek:blockMined', (e) => {
            if (!this.isActive) return;
            const blockNum = e.detail.blockNumber;
            this.log(`⛏️ [Event] Block #${blockNum} mined! Proof-of-Hamster confirmed.`, 'event');

            if (this.strategies.yieldCompounder) {
                this._evaluateCompounder(blockNum);
            }
        });

        // 2. Listen for General Squeekchain Events
        window.addEventListener('squeek:event', (e) => {
            if (!this.isActive) return;
            const d = e.detail;
            this.log(`📡 [On-Chain Event] ${d.eventName} by ${d.feeder || d.bettor || d.staker || '0x...'}`, 'event');
        });

        // 3. Listen for Derby Phase Transitions
        window.addEventListener('squeek:derbyPhase', (e) => {
            if (!this.isActive) return;
            const phase = e.detail.phase;
            if (phase === 'betting' && this.strategies.derbySniper) {
                this.log(`🎯 [Derby] Race #${e.detail.raceId} betting window open. Monitoring odds...`, 'bot');
            }
        });

        // 4. Autonomous Telemetry Loop (Checks RPM every 2 seconds)
        setInterval(() => {
            if (!this.isActive) return;
            this._evaluateAutoFeeder();
            this._evaluateDerbySniper();
        }, 2000);
    }

    start() {
        this.isActive = true;
        this.log('🟢 SqueekSentry ACTIVE. Autonomous transaction signing enabled.', 'success');
        this._updateUI();
    }

    stop() {
        this.isActive = false;
        this.log('🔴 SqueekSentry STOPPED. Entering idle standby mode.', 'warn');
        this._updateUI();
    }

    toggleStrategy(stratName, enabled) {
        if (this.strategies[stratName] !== undefined) {
            this.strategies[stratName] = enabled;
            this.log(`⚙️ Strategy "${stratName}" set to ${enabled ? 'ENABLED' : 'DISABLED'}.`, 'system');
        }
    }

    async _evaluateAutoFeeder() {
        if (!this.strategies.autoFeeder) return;
        if (!window.squeekSimulator || !window.squeekWeb3) return;

        const currentRPM = window.squeekSimulator.rpm;
        const now = Date.now();

        // Check if RPM dropped dangerously low & cooldown passed (15 seconds)
        if (currentRPM < this.rpmThreshold && (now - this.lastFeedTime > 15000)) {
            this.lastFeedTime = now;
            this.log(`⚠️ Wheel RPM dropped to ${Math.round(currentRPM)} (Below ${this.rpmThreshold} RPM limit). Initiating emergency Treat Tx...`, 'warn');

            try {
                // Send Sunflower Seed treat transaction (10 SQK, +15 RPM)
                const tx = await window.squeekWeb3.sendTreatTx(0, 'Sunflower Seed (Bot)', 10, 15);
                window.squeekSimulator.applyTreatBoost('Sunflower Seed (Bot)', 20, 20);

                this.totalTxExecuted++;
                this.totalSQKDispatched += 10;
                this.totalGasUsed += tx.gasLimit;

                this.log(`✅ [Auto-Feeder Tx] Dispatched tx ${tx.hash.slice(0, 12)}... Gas: ${tx.gasLimit}. RPM boosted!`, 'success');
                this._updateUI();
            } catch (err) {
                this.log(`❌ [Auto-Feeder Error] ${err.message}`, 'error');
            }
        }
    }

    async _evaluateCompounder(blockNum) {
        if (!window.squeekFi || !window.squeekWeb3) return;
        const now = Date.now();
        if (now - this.lastCompoundTime < 20000) return;

        const pending = window.squeekFi.getPendingYield();
        if (pending >= this.minCompoundReward) {
            this.lastCompoundTime = now;
            this.log(`🌾 [Compounder] Pending yield is ${pending.toFixed(1)} SQK (>= ${this.minCompoundReward}). Harvesting & Restaking...`, 'bot');

            try {
                const harvestTx = await window.squeekWeb3.sendHarvestYieldTx(pending);
                const stakeTx = await window.squeekWeb3.sendStakeTx(Math.floor(pending));

                this.totalTxExecuted += 2;
                this.totalGasUsed += (harvestTx.gasLimit + stakeTx.gasLimit);

                this.log(`✅ [Compounder Done] Harvested and Restaked ${pending.toFixed(1)} SQK! Tx: ${stakeTx.hash.slice(0, 12)}...`, 'success');
                this._updateUI();
            } catch (err) {
                this.log(`❌ [Compounder Error] ${err.message}`, 'error');
            }
        }
    }

    async _evaluateDerbySniper() {
        if (!this.strategies.derbySniper) return;
        if (!window.squeekDerby || !window.squeekWeb3) return;

        const derby = window.squeekDerby;
        // Snipe only in the last 4 seconds of betting
        if (derby.phase === 'betting' && derby.phaseTimeLeft <= 4 && derby.phaseTimeLeft >= 1) {
            // Check if already placed a bet this race
            if (derby.userBets.length > 0) return;

            // Pick the runner with the best odds
            let bestRunner = derby.runners[0];
            let bestOdds = 0;
            derby.runners.forEach(r => {
                const odds = derby.calculateOdds(r.id);
                if (odds > bestOdds) {
                    bestOdds = odds;
                    bestRunner = r;
                }
            });

            this.log(`🎯 [Derby Sniper] Sniping best value runner: #${bestRunner.id + 1} ${bestRunner.name} at ${bestOdds}x odds...`, 'bot');
            try {
                const tx = await window.squeekWeb3.sendDerbyBetTx(derby.raceId, bestRunner.id, bestRunner.name, this.sniperBetAmount);
                derby.placeBet(bestRunner.id, this.sniperBetAmount);

                this.totalTxExecuted++;
                this.totalSQKDispatched += this.sniperBetAmount;
                this.totalGasUsed += tx.gasLimit;

                this.log(`✅ [Sniper Tx Placed] Locked ${this.sniperBetAmount} SQK on ${bestRunner.name}. Tx: ${tx.hash.slice(0, 12)}...`, 'success');
                this._updateUI();
            } catch (err) {
                this.log(`❌ [Sniper Error] ${err.message}`, 'error');
            }
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = { timestamp, message, type };
        this.logs.unshift(entry);
        if (this.logs.length > 80) this.logs.pop();

        const terminalEl = document.getElementById('bot-terminal-output');
        if (terminalEl) {
            const line = document.createElement('div');
            line.className = `log-line log-${type}`;
            line.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
            terminalEl.appendChild(line);
            terminalEl.scrollTop = terminalEl.scrollHeight;
        }
    }

    _updateUI() {
        const statusEl = document.getElementById('bot-status-text');
        const badgeEl = document.getElementById('bot-status-badge');
        const countEl = document.getElementById('bot-tx-count');
        const gasEl = document.getElementById('bot-gas-count');
        const sqkEl = document.getElementById('bot-sqk-dispatched');

        if (statusEl) statusEl.textContent = this.isActive ? 'RUNNING (AUTONOMOUS)' : 'STOPPED (STANDBY)';
        if (badgeEl) {
            badgeEl.className = `status-dot ${this.isActive ? 'dot-active' : 'dot-idle'}`;
        }
        if (countEl) countEl.textContent = this.totalTxExecuted;
        if (gasEl) gasEl.textContent = `${(this.totalGasUsed / 1000).toFixed(1)}k`;
        if (sqkEl) sqkEl.textContent = `${this.totalSQKDispatched} SQK`;
    }
}

window.squeekBot = new SqueekBot();
