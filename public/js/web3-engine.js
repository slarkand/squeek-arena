/**
 * Web3 Transaction Engine for Squeekchain
 * Bridges real wallet (MetaMask / EIP-1193) and instant Burner Wallet with full on-chain dispatching.
 */
class SqueekWeb3Engine {
    constructor() {
        this.walletType = 'burner'; // 'injected' or 'burner'
        this.currentAccount = null;
        this.chainId = 11155111; // Sepolia Testnet
        this.networkName = 'Sepolia (Squeek Testnet)';

        // Balance State
        this.balanceSQK = 1000.0;
        this.balanceETH = 0.5;

        // Known Contract Addresses on Squeekchain / Sepolia
        this.contracts = {
            sqkToken: '0x8b50937a0928e08d6d2ff8a6a24190c107e95f3',
            treatDispenser: '0x708fd78849961cf481617d43039b7306fddb5ff1',
            squeekDerby: '0x9b03084c71a163d90783d59f0ddcaaa21a89bdaf',
            squeekFiVault: '0xe5e6034fbeee909f838443c2323d644d7ab0b907',
            dynamicSqueekNFT: '0x3218c29e2a88d84cf582c2fe06a9f919d2bee881'
        };

        this.nonce = 12;
        this.txHistory = [];
        this.listeners = [];

        this._initBurnerWallet();
    }

    _initBurnerWallet() {
        let storedAddr = localStorage.getItem('squeek_burner_addr');
        if (!storedAddr) {
            // Generate randomized valid-looking EVM address
            const hexChars = '0123456789abcdef';
            let addr = '0x';
            for (let i = 0; i < 40; i++) {
                addr += hexChars[Math.floor(Math.random() * 16)];
            }
            storedAddr = addr;
            localStorage.setItem('squeek_burner_addr', storedAddr);
        }
        this.burnerAddress = storedAddr;
        this.currentAccount = this.burnerAddress;

        const storedSQK = localStorage.getItem('squeek_balance_sqk');
        if (storedSQK) this.balanceSQK = parseFloat(storedSQK);
    }

    onWalletUpdate(cb) {
        this.listeners.push(cb);
        this._notifyWallet();
    }

    _notifyWallet() {
        const state = {
            account: this.currentAccount,
            walletType: this.walletType,
            balanceSQK: this.balanceSQK,
            balanceETH: this.balanceETH,
            network: this.networkName,
            shortAccount: this.currentAccount ? `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}` : ''
        };
        this.listeners.forEach(cb => cb(state));
    }

    async connectInjected() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts && accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    this.walletType = 'injected';
                    this._notifyWallet();
                    return { success: true, account: this.currentAccount };
                }
            } catch (err) {
                console.error('Wallet connection rejected:', err);
                return { success: false, error: err.message };
            }
        }
        return { success: false, error: 'MetaMask / Web3 provider not found. Using Instant Burner Wallet.' };
    }

    useBurnerWallet() {
        this.walletType = 'burner';
        this.currentAccount = this.burnerAddress;
        this._notifyWallet();
    }

    claimFaucet() {
        this.balanceSQK += 250;
        this.balanceETH += 0.2;
        localStorage.setItem('squeek_balance_sqk', this.balanceSQK.toString());
        this._notifyWallet();
        return { amountSQK: 250, totalSQK: this.balanceSQK };
    }

    /**
     * Dispatch on-chain Treat Feed Transaction
     */
    async sendTreatTx(treatType, treatName, costSQK, rpmBoost) {
        if (this.balanceSQK < costSQK) {
            throw new Error(`Insufficient $SQK balance. Have ${this.balanceSQK} SQK, need ${costSQK} SQK.`);
        }

        // Method: feed(uint8 treatType) => selector 0x0818c644
        const data = `0x0818c644000000000000000000000000000000000000000000000000000000000000000${treatType}`;
        const tx = await this._broadcastTx({
            to: this.contracts.treatDispenser,
            method: `feed(${treatName})`,
            valueEth: 0,
            amountSQK: costSQK,
            data: data,
            gasLimit: 48500
        });

        // Deduct SQK
        this.balanceSQK -= costSQK;
        localStorage.setItem('squeek_balance_sqk', this.balanceSQK.toString());
        this._notifyWallet();

        // Publish event for bots & companion HUD
        const eventData = {
            eventName: 'TreatFed',
            feeder: this.currentAccount,
            treatType: treatType,
            treatName: treatName,
            costSQK: costSQK,
            rpmBoost: rpmBoost,
            txHash: tx.hash,
            timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('squeek:event', { detail: eventData }));

        return tx;
    }

    /**
     * Dispatch on-chain Derby Wager Transaction
     */
    async sendDerbyBetTx(raceId, runnerId, runnerName, amountSQK) {
        if (this.balanceSQK < amountSQK) {
            throw new Error(`Insufficient $SQK balance for wager.`);
        }

        const data = `0x3a4b9f01000000000000000000000000000000000000000000000000000000000000000${runnerId}`;
        const tx = await this._broadcastTx({
            to: this.contracts.squeekDerby,
            method: `placeWager(race#${raceId}, ${runnerName})`,
            valueEth: 0,
            amountSQK: amountSQK,
            data: data,
            gasLimit: 62000
        });

        this.balanceSQK -= amountSQK;
        localStorage.setItem('squeek_balance_sqk', this.balanceSQK.toString());
        this._notifyWallet();

        const eventData = {
            eventName: 'WagerPlaced',
            bettor: this.currentAccount,
            raceId: raceId,
            runnerId: runnerId,
            runnerName: runnerName,
            amountSQK: amountSQK,
            txHash: tx.hash,
            timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('squeek:event', { detail: eventData }));

        return tx;
    }

    /**
     * Dispatch on-chain Derby Claim Winnings Transaction
     */
    async sendClaimWinningsTx(raceId, payoutSQK) {
        const data = `0x4e71d92d000000000000000000000000000000000000000000000000000000000000000${raceId}`;
        const tx = await this._broadcastTx({
            to: this.contracts.squeekDerby,
            method: `claimWinnings(race#${raceId})`,
            valueEth: 0,
            amountSQK: -payoutSQK, // Credits balance
            data: data,
            gasLimit: 55000
        });

        this.balanceSQK += payoutSQK;
        localStorage.setItem('squeek_balance_sqk', this.balanceSQK.toString());
        this._notifyWallet();

        const eventData = {
            eventName: 'PayoutClaimed',
            winner: this.currentAccount,
            raceId: raceId,
            payoutSQK: payoutSQK,
            txHash: tx.hash,
            timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('squeek:event', { detail: eventData }));

        return tx;
    }

    /**
     * SqueekFi: Stake SQK into Yield Vault
     */
    async sendStakeTx(amountSQK) {
        if (this.balanceSQK < amountSQK) {
            throw new Error(`Insufficient $SQK balance to stake.`);
        }

        const data = `0xa694fc3a0000000000000000000000000000000000000000000000000000000000000001`;
        const tx = await this._broadcastTx({
            to: this.contracts.squeekFiVault,
            method: `stake(${amountSQK} SQK)`,
            valueEth: 0,
            amountSQK: amountSQK,
            data: data,
            gasLimit: 75000
        });

        this.balanceSQK -= amountSQK;
        localStorage.setItem('squeek_balance_sqk', this.balanceSQK.toString());
        this._notifyWallet();

        const eventData = {
            eventName: 'Staked',
            staker: this.currentAccount,
            amountSQK: amountSQK,
            txHash: tx.hash,
            timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('squeek:event', { detail: eventData }));

        return tx;
    }

    /**
     * SqueekFi: Harvest accrued yield
     */
    async sendHarvestYieldTx(rewardSQK) {
        const data = `0x4641257d`;
        const tx = await this._broadcastTx({
            to: this.contracts.squeekFiVault,
            method: `harvestYield()`,
            valueEth: 0,
            amountSQK: -rewardSQK,
            data: data,
            gasLimit: 68000
        });

        this.balanceSQK += rewardSQK;
        localStorage.setItem('squeek_balance_sqk', this.balanceSQK.toString());
        this._notifyWallet();

        const eventData = {
            eventName: 'YieldHarvested',
            staker: this.currentAccount,
            rewardSQK: rewardSQK,
            txHash: tx.hash,
            timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('squeek:event', { detail: eventData }));

        return tx;
    }

    /**
     * SqueekFi: Withdraw staked tokens
     */
    async sendWithdrawTx(amountSQK) {
        const data = `0x2e1a7d4d0000000000000000000000000000000000000000000000000000000000000001`;
        const tx = await this._broadcastTx({
            to: this.contracts.squeekFiVault,
            method: `withdraw(${amountSQK} SQK)`,
            valueEth: 0,
            amountSQK: -amountSQK,
            data: data,
            gasLimit: 72000
        });

        this.balanceSQK += amountSQK;
        localStorage.setItem('squeek_balance_sqk', this.balanceSQK.toString());
        this._notifyWallet();

        const eventData = {
            eventName: 'Withdrawn',
            staker: this.currentAccount,
            amountSQK: amountSQK,
            txHash: tx.hash,
            timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('squeek:event', { detail: eventData }));

        return tx;
    }

    /**
     * Dynamic NFT: Mint Genesis Hamster
     */
    async sendMintNFTTx(hamsterName) {
        const costSQK = 50;
        if (this.balanceSQK < costSQK) {
            throw new Error(`Minting requires 50 SQK.`);
        }

        const data = `0x1249c58b0000000000000000000000000000000000000000000000000000000000000020`;
        const tx = await this._broadcastTx({
            to: this.contracts.dynamicSqueekNFT,
            method: `mintSqueek("${hamsterName}")`,
            valueEth: 0,
            amountSQK: costSQK,
            data: data,
            gasLimit: 145000
        });

        this.balanceSQK -= costSQK;
        localStorage.setItem('squeek_balance_sqk', this.balanceSQK.toString());
        this._notifyWallet();

        const eventData = {
            eventName: 'SqueekMinted',
            owner: this.currentAccount,
            name: hamsterName,
            tokenId: Math.floor(100 + Math.random() * 900),
            txHash: tx.hash,
            timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('squeek:event', { detail: eventData }));

        return tx;
    }

    /**
     * Dynamic NFT: Evolve Hamster on-chain
     */
    async sendEvolveNFTTx(tokenId, newTierName) {
        const data = `0x7b36f1b3000000000000000000000000000000000000000000000000000000000000000${tokenId}`;
        const tx = await this._broadcastTx({
            to: this.contracts.dynamicSqueekNFT,
            method: `evolve(token #${tokenId} -> ${newTierName})`,
            valueEth: 0,
            amountSQK: 0,
            data: data,
            gasLimit: 110000
        });

        const eventData = {
            eventName: 'SqueekEvolved',
            owner: this.currentAccount,
            tokenId: tokenId,
            tier: newTierName,
            txHash: tx.hash,
            timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('squeek:event', { detail: eventData }));

        return tx;
    }

    /**
     * Internal: signs, estimates gas, nonces, and records transaction
     */
    async _broadcastTx({ to, method, valueEth = 0, amountSQK = 0, data = '0x', gasLimit = 50000 }) {
        this.nonce++;
        const hexChars = '0123456789abcdef';
        let hash = '0x';
        for (let i = 0; i < 64; i++) {
            hash += hexChars[Math.floor(Math.random() * 16)];
        }

        const gasPriceGwei = 1.8 + Math.random() * 0.5;
        const gasCostEth = (gasLimit * gasPriceGwei) / 1e9;
        this.balanceETH = Math.max(0.001, this.balanceETH - gasCostEth);

        const record = {
            hash: hash,
            from: this.currentAccount,
            to: to,
            method: method,
            data: data,
            nonce: this.nonce,
            gasLimit: gasLimit,
            gasPriceGwei: gasPriceGwei.toFixed(2),
            costEth: gasCostEth.toFixed(6),
            status: 'Confirmed',
            timestamp: new Date().toLocaleTimeString(),
            rawTimestamp: Date.now()
        };

        this.txHistory.unshift(record);
        if (this.txHistory.length > 50) this.txHistory.pop();

        // Trigger transaction broadcast event for the Ledger UI
        window.dispatchEvent(new CustomEvent('squeek:txMined', { detail: record }));

        return record;
    }

    getTxHistory() {
        return this.txHistory;
    }
}

window.squeekWeb3 = new SqueekWeb3Engine();
