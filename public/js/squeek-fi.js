/**
 * SqueekFi - Hamster-Powered Decentralized Finance
 * Dynamic Staking Vault where APY scales in real-time with WHEELY9000 physical RPM!
 */
class SqueekFi {
    constructor() {
        this.baseAPR = 12.0; // 12%
        this.totalTVL = 48520.0;
        this.userStaked = 250.0;
        this.pendingYield = 4.82;
        this.lastTickTime = performance.now();

        this.init();
    }

    init() {
        // Ticking yield loop
        setInterval(() => {
            this._tickYield();
            this._updateUI();
        }, 1000);
    }

    getCurrentAPR() {
        const rpm = (window.squeekSimulator && window.squeekSimulator.rpm) ? window.squeekSimulator.rpm : 160;
        // 0.4% APR per RPM point
        const dynamicAPR = this.baseAPR + (rpm * 0.4);
        return parseFloat(dynamicAPR.toFixed(1));
    }

    getPendingYield() {
        return this.pendingYield;
    }

    _tickYield() {
        const now = performance.now();
        const deltaSec = (now - this.lastTickTime) / 1000;
        this.lastTickTime = now;

        if (this.userStaked > 0) {
            const apr = this.getCurrentAPR() / 100;
            const yieldPerSec = (this.userStaked * apr) / 31536000; // seconds in year
            this.pendingYield += yieldPerSec * deltaSec;
        }
    }

    async stake(amountSQK) {
        if (amountSQK <= 0) throw new Error('Amount must be > 0');
        const tx = await window.squeekWeb3.sendStakeTx(amountSQK);
        this.userStaked += amountSQK;
        this.totalTVL += amountSQK;

        if (window.squeekAudio) {
            window.squeekAudio.playCoinSound();
        }

        this._updateUI();
        return tx;
    }

    async harvest() {
        if (this.pendingYield <= 0.05) {
            throw new Error('No substantial yield available to harvest yet.');
        }
        const harvestAmount = parseFloat(this.pendingYield.toFixed(2));
        const tx = await window.squeekWeb3.sendHarvestYieldTx(harvestAmount);
        this.pendingYield = 0;

        if (window.squeekAudio) {
            window.squeekAudio.playCoinSound();
        }

        this._updateUI();
        return { tx, amount: harvestAmount };
    }

    async withdraw(amountSQK) {
        if (amountSQK > this.userStaked) {
            throw new Error('Cannot withdraw more than staked amount.');
        }
        const tx = await window.squeekWeb3.sendWithdrawTx(amountSQK);
        this.userStaked -= amountSQK;
        this.totalTVL -= amountSQK;

        if (window.squeekAudio) {
            window.squeekAudio.playCoinSound();
        }

        this._updateUI();
        return tx;
    }

    _updateUI() {
        const aprEl = document.getElementById('squeekfi-apr');
        const tvlEl = document.getElementById('squeekfi-tvl');
        const stakedEl = document.getElementById('squeekfi-user-staked');
        const yieldEl = document.getElementById('squeekfi-pending-yield');
        const harvestBtn = document.getElementById('squeekfi-harvest-btn');

        const currentAPR = this.getCurrentAPR();
        if (aprEl) aprEl.textContent = `${currentAPR}%`;
        if (tvlEl) tvlEl.textContent = `${Math.floor(this.totalTVL).toLocaleString()} SQK`;
        if (stakedEl) stakedEl.textContent = `${this.userStaked.toFixed(1)} SQK`;
        if (yieldEl) yieldEl.textContent = `${this.pendingYield.toFixed(4)} SQK`;

        if (harvestBtn) {
            harvestBtn.disabled = this.pendingYield < 0.1;
        }
    }
}

window.squeekFi = new SqueekFi();
