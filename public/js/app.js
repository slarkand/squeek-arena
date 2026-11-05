/**
 * Main Application Orchestrator for Squeek Arena & Stream Companion
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Simulator
    window.squeekSimulator = new WheelySimulator('hamster-canvas');
    window.squeekDerby = new SqueekDerby('derby-track-canvas');
    window.dynamicNFT = new DynamicSqueekNFT();

    // 2. Setup Telemetry Hooks
    window.squeekSimulator.onTelemetryUpdate(telemetry => {
        updateTelemetryDisplay(telemetry);
    });

    // 3. Setup Web3 Wallet Hook
    window.squeekWeb3.onWalletUpdate(walletState => {
        updateWalletDisplay(walletState);
    });

    // 4. Setup Tab Navigation
    setupTabs();

    // 5. Setup Treat Feeding Buttons
    setupTreatButtons();

    // 6. Setup Derby Betting Controls
    setupDerbyControls();

    // 7. Setup SqueekFi Vault Controls
    setupSqueekFiControls();

    // 8. Setup SqueekBot Controls
    setupBotControls();

    // 9. Setup NFT Controls
    setupNFTControls();

    // 10. Setup Audio & OBS Controls
    setupAudioAndOBS();

    // 11. Listen for new mined transactions to update Ledger table
    setupTxLedgerListener();
});

function updateTelemetryDisplay(t) {
    const rpmVal = document.getElementById('telemetry-rpm');
    const rpmNeedle = document.getElementById('rpm-gauge-needle');
    const speedVal = document.getElementById('telemetry-speed');
    const powerVal = document.getElementById('telemetry-power');
    const hashrateVal = document.getElementById('telemetry-hashrate');
    const blocksVal = document.getElementById('telemetry-blocks');
    const distanceVal = document.getElementById('telemetry-distance');
    const statusVal = document.getElementById('telemetry-status');
    const progressBar = document.getElementById('block-progress-fill');
    const progressText = document.getElementById('block-progress-text');
    const staminaFill = document.getElementById('stamina-bar-fill');

    if (rpmVal) rpmVal.textContent = t.rpm;
    if (speedVal) speedVal.textContent = `${t.speedMph} mph (${t.speedKmh} km/h)`;
    if (powerVal) powerVal.textContent = `${t.powerWatts} W`;
    if (hashrateVal) hashrateVal.textContent = `${t.hashrateKhs} KH/s`;
    if (blocksVal) blocksVal.textContent = t.blocksMined;
    if (distanceVal) distanceVal.textContent = `${t.distanceMeters.toLocaleString()} m`;
    if (statusVal) {
        statusVal.textContent = t.status;
        statusVal.className = `status-pill status-${t.status.toLowerCase()}`;
    }

    if (rpmNeedle) {
        // -90deg to +90deg mapped from 0 to 400 RPM
        const angle = -90 + (Math.min(400, t.rpm) / 400) * 180;
        rpmNeedle.style.transform = `rotate(${angle}deg)`;
    }

    if (progressBar) progressBar.style.width = `${t.blockProgress}%`;
    if (progressText) progressText.textContent = `${t.blockProgress}% to Block #${t.blocksMined + 1}`;
    if (staminaFill) staminaFill.style.width = `${t.stamina}%`;
}

function updateWalletDisplay(w) {
    const addrEl = document.getElementById('wallet-address-display');
    const sqkBalEl = document.getElementById('wallet-sqk-balance');
    const ethBalEl = document.getElementById('wallet-eth-balance');
    const badgeEl = document.getElementById('wallet-type-badge');

    if (addrEl) addrEl.textContent = w.shortAccount || 'Not Connected';
    if (sqkBalEl) sqkBalEl.textContent = `${w.balanceSQK.toFixed(1)} SQK`;
    if (ethBalEl) ethBalEl.textContent = `${w.balanceETH.toFixed(4)} ETH`;
    if (badgeEl) {
        badgeEl.textContent = w.walletType === 'burner' ? 'Instant Burner' : 'MetaMask';
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-content-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

function setupTreatButtons() {
    const treats = [
        { id: 'btn-feed-seed', type: 0, name: 'Sunflower Seed', cost: 10, boost: 15 },
        { id: 'btn-feed-cheese', type: 1, name: 'Cheddar Nibble', cost: 25, boost: 35 },
        { id: 'btn-feed-berry', type: 2, name: 'Energy Berry', cost: 50, boost: 60 },
        { id: 'btn-feed-acorn', type: 3, name: 'Golden Acorn', cost: 100, boost: 100 }
    ];

    treats.forEach(t => {
        const btn = document.getElementById(t.id);
        if (btn) {
            btn.addEventListener('click', async () => {
                try {
                    btn.disabled = true;
                    btn.textContent = 'Dispensing...';

                    const tx = await window.squeekWeb3.sendTreatTx(t.type, t.name, t.cost, t.boost);
                    window.squeekSimulator.applyTreatBoost(t.name, t.boost, 30);
                    showToast(`✨ Fed ${t.name}! +${t.boost} RPM Boost. Tx: ${tx.hash.slice(0, 10)}...`, 'success');
                } catch (err) {
                    showToast(`Feed error: ${err.message}`, 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = `Feed (${t.cost} SQK)`;
                }
            });
        }
    });

    // Cheer Clicker
    const cheerBtn = document.getElementById('btn-cheer-clicker');
    if (cheerBtn) {
        cheerBtn.addEventListener('click', () => {
            window.squeekSimulator.cheer();
        });
    }
}

function setupDerbyControls() {
    let selectedRunnerId = 0;
    const runnerCards = document.querySelectorAll('.runner-select-card');

    runnerCards.forEach(card => {
        card.addEventListener('click', () => {
            runnerCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedRunnerId = parseInt(card.getAttribute('data-runner-id'), 10);
        });
    });

    const placeBetBtn = document.getElementById('btn-place-derby-bet');
    const betInput = document.getElementById('derby-bet-amount');

    if (placeBetBtn && betInput) {
        placeBetBtn.addEventListener('click', async () => {
            const amount = parseFloat(betInput.value);
            if (isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid bet amount.', 'warn');
                return;
            }

            try {
                placeBetBtn.disabled = true;
                const runner = window.squeekDerby.runners[selectedRunnerId];
                const tx = await window.squeekWeb3.sendDerbyBetTx(window.squeekDerby.raceId, selectedRunnerId, runner.name, amount);
                window.squeekDerby.placeBet(selectedRunnerId, amount);

                showToast(`🎟️ Wager placed! ${amount} SQK on #${selectedRunnerId + 1} ${runner.name}. Tx: ${tx.hash.slice(0, 10)}...`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                placeBetBtn.disabled = false;
            }
        });
    }

    // Claim winnings button
    const claimBtn = document.getElementById('btn-claim-derby-win');
    if (claimBtn) {
        claimBtn.addEventListener('click', async () => {
            try {
                claimBtn.disabled = true;
                const raceId = window.squeekDerby.raceId;
                const winningBet = window.squeekDerby.userBets.find(b => b.runnerId === window.squeekDerby.winner.id);
                if (!winningBet) return;

                const tx = await window.squeekWeb3.sendClaimWinningsTx(raceId, winningBet.potentialWin);
                showToast(`💰 Winnings claimed! +${winningBet.potentialWin} SQK! Tx: ${tx.hash.slice(0, 10)}...`, 'success');
                claimBtn.style.display = 'none';
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                claimBtn.disabled = false;
            }
        });
    }

    // Listen for settled phase to display claim button if winner
    window.addEventListener('squeek:derbyPhase', (e) => {
        if (e.detail.phase === 'settled' && e.detail.hasWon) {
            if (claimBtn) {
                claimBtn.style.display = 'inline-block';
                claimBtn.textContent = `Claim ${e.detail.winningBet.potentialWin} SQK Winnings (Send Tx)`;
            }
        } else if (e.detail.phase === 'betting') {
            if (claimBtn) claimBtn.style.display = 'none';
        }
    });
}

function setupSqueekFiControls() {
    const stakeBtn = document.getElementById('btn-stake-sqk');
    const stakeInput = document.getElementById('stake-amount-input');
    const harvestBtn = document.getElementById('squeekfi-harvest-btn');
    const withdrawBtn = document.getElementById('btn-withdraw-sqk');

    if (stakeBtn && stakeInput) {
        stakeBtn.addEventListener('click', async () => {
            const amount = parseFloat(stakeInput.value);
            if (isNaN(amount) || amount <= 0) {
                showToast('Enter valid amount to stake.', 'warn');
                return;
            }
            try {
                stakeBtn.disabled = true;
                const tx = await window.squeekFi.stake(amount);
                showToast(`🌾 Successfully staked ${amount} SQK! Tx: ${tx.hash.slice(0, 10)}...`, 'success');
                stakeInput.value = '';
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                stakeBtn.disabled = false;
            }
        });
    }

    if (harvestBtn) {
        harvestBtn.addEventListener('click', async () => {
            try {
                harvestBtn.disabled = true;
                const res = await window.squeekFi.harvest();
                showToast(`🍯 Harvested ${res.amount} SQK yield! Tx: ${res.tx.hash.slice(0, 10)}...`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                harvestBtn.disabled = false;
            }
        });
    }

    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', async () => {
            const amount = parseFloat(prompt('Enter SQK amount to unstake:', '50'));
            if (isNaN(amount) || amount <= 0) return;
            try {
                withdrawBtn.disabled = true;
                const tx = await window.squeekFi.withdraw(amount);
                showToast(`💸 Unstaked ${amount} SQK! Tx: ${tx.hash.slice(0, 10)}...`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                withdrawBtn.disabled = false;
            }
        });
    }
}

function setupBotControls() {
    const toggleBtn = document.getElementById('btn-toggle-bot');
    const autoFeederCheck = document.getElementById('check-bot-autofeed');
    const compounderCheck = document.getElementById('check-bot-compound');
    const sniperCheck = document.getElementById('check-bot-sniper');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.squeekBot.isActive) {
                window.squeekBot.stop();
                toggleBtn.textContent = 'START SQUEEKSENTRY BOT';
                toggleBtn.className = 'btn btn-primary pulse-btn';
            } else {
                window.squeekBot.start();
                toggleBtn.textContent = 'STOP SQUEEKSENTRY BOT';
                toggleBtn.className = 'btn btn-danger';
            }
        });
    }

    if (autoFeederCheck) {
        autoFeederCheck.addEventListener('change', (e) => {
            window.squeekBot.toggleStrategy('autoFeeder', e.target.checked);
        });
    }
    if (compounderCheck) {
        compounderCheck.addEventListener('change', (e) => {
            window.squeekBot.toggleStrategy('yieldCompounder', e.target.checked);
        });
    }
    if (sniperCheck) {
        sniperCheck.addEventListener('change', (e) => {
            window.squeekBot.toggleStrategy('derbySniper', e.target.checked);
        });
    }
}

function setupNFTControls() {
    const evolveBtn = document.getElementById('nft-evolve-btn');
    const mintBtn = document.getElementById('btn-mint-nft');
    const exportJSONBtn = document.getElementById('btn-export-nft-json');

    if (evolveBtn) {
        evolveBtn.addEventListener('click', async () => {
            try {
                evolveBtn.disabled = true;
                const res = await window.dynamicNFT.triggerEvolution();
                showToast(`🎉 Hamster EVOLVED to ${res.newTier}! Tx: ${res.tx.hash.slice(0, 10)}...`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    if (mintBtn) {
        mintBtn.addEventListener('click', async () => {
            const name = prompt('Name your new Genesis Hamster:', 'Cyber Squeeker');
            if (!name) return;
            try {
                mintBtn.disabled = true;
                const tx = await window.dynamicNFT.mintNew(name);
                showToast(`🐹 Minted new Genesis Hamster "${name}"! Tx: ${tx.hash.slice(0, 10)}...`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                mintBtn.disabled = false;
            }
        });
    }

    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', () => {
            const json = window.dynamicNFT.getMetadataJSON();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${window.dynamicNFT.currentNFT.name}-metadata.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Saved on-chain metadata JSON file!', 'info');
        });
    }
}

function setupAudioAndOBS() {
    const muteBtn = document.getElementById('btn-toggle-audio');
    const obsBtn = document.getElementById('btn-open-obs-overlay');
    const faucetBtn = document.getElementById('btn-claim-faucet');
    const connectInjectedBtn = document.getElementById('btn-connect-wallet');

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            const isMuted = !window.squeekAudio.isMuted;
            window.squeekAudio.setMuted(isMuted);
            muteBtn.textContent = isMuted ? '🔇 Unmute SFX' : '🔊 Audio SFX';
        });
    }

    if (obsBtn) {
        obsBtn.addEventListener('click', () => {
            window.open('overlay.html', 'SqueekOBSOverlay', 'width=800,height=480,menubar=no,toolbar=no,location=no');
        });
    }

    if (faucetBtn) {
        faucetBtn.addEventListener('click', () => {
            const res = window.squeekWeb3.claimFaucet();
            showToast(`🚰 Claimed +${res.amountSQK} SQK from Testnet Faucet!`, 'success');
            if (window.squeekAudio) window.squeekAudio.playCoinSound();
        });
    }

    if (connectInjectedBtn) {
        connectInjectedBtn.addEventListener('click', async () => {
            const res = await window.squeekWeb3.connectInjected();
            if (res.success) {
                showToast(`Connected MetaMask: ${res.account.slice(0, 6)}...`, 'success');
            } else {
                showToast(res.error, 'info');
            }
        });
    }
}

function setupTxLedgerListener() {
    const tbody = document.getElementById('tx-ledger-tbody');

    window.addEventListener('squeek:txMined', (e) => {
        const tx = e.detail;
        if (!tbody) return;

        const tr = document.createElement('tr');
        tr.className = 'tx-row new-tx-highlight';
        tr.innerHTML = `
            <td><a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank" class="tx-hash-link">${tx.hash.slice(0, 10)}...${tx.hash.slice(-6)}</a></td>
            <td><span class="tx-method-badge">${tx.method}</span></td>
            <td>${tx.from.slice(0, 6)}...</td>
            <td>${tx.gasLimit.toLocaleString()}</td>
            <td><span class="badge badge-success">${tx.status}</span></td>
            <td class="text-muted">${tx.timestamp}</td>
        `;

        tbody.insertBefore(tr, tbody.firstChild);

        setTimeout(() => {
            tr.classList.remove('new-tx-highlight');
        }, 2000);
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
