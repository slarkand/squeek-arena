/**
 * Dynamic Squeek NFT Engine & Evolver Studio
 * Generates dynamic SVG vector avatars that evolve visually with hamster revolutions.
 */
class DynamicSqueekNFT {
    constructor() {
        this.currentNFT = {
            tokenId: 1337,
            name: 'Pip Squeek #1337',
            tierIndex: 1, // 0: Sleepy Pip, 1: Cardio Cadet, 2: Cyber Squeek, 3: Squeektoshi Ascended
            level: 2,
            revolutions: 1850,
            treatScore: 45
        };

        this.tiers = [
            {
                name: 'Sleepy Pip',
                title: 'Base Miner',
                reqRevs: 0,
                nextReqRevs: 500,
                color: '#e0a96d',
                badgeClass: 'tier-1',
                desc: 'A gentle, nocturnal hamster just beginning their proof-of-work journey.'
            },
            {
                name: 'Cardio Cadet',
                title: 'High-Stamina Runner',
                reqRevs: 500,
                nextReqRevs: 2500,
                color: '#f77f00',
                badgeClass: 'tier-2',
                desc: 'Equipped with a sweatband and blazing paw speed. Generates consistent block shares.'
            },
            {
                name: 'Cyber Squeek',
                title: 'Overclocked Cyborg',
                reqRevs: 2500,
                nextReqRevs: 10000,
                color: '#00f5d4',
                badgeClass: 'tier-3',
                desc: 'Neural-linked to the WHEELY9000 with a HUD visor and fiber-optic wheel telemetry.'
            },
            {
                name: 'Squeektoshi Ascended',
                title: 'Cosmic Proof-of-Hamster Deity',
                reqRevs: 10000,
                nextReqRevs: 10000,
                color: '#ffd166',
                badgeClass: 'tier-4',
                desc: 'Transcendent golden aura with laser eyes and celestial orbiting sunflower seeds.'
            }
        ];

        this.init();
    }

    init() {
        this.renderSVG();
        this._updateUI();

        // Increment NFT revolutions as wheel spins
        window.addEventListener('squeek:blockMined', () => {
            this.currentNFT.revolutions += 250;
            this.renderSVG();
            this._updateUI();
        });
    }

    /**
     * Check if ready to evolve
     */
    canEvolve() {
        const nextTier = this.tiers[this.currentNFT.tierIndex + 1];
        if (!nextTier) return false;
        return this.currentNFT.revolutions >= nextTier.reqRevs;
    }

    /**
     * Perform evolution
     */
    async triggerEvolution() {
        if (!this.canEvolve()) {
            throw new Error('Revolution requirement not yet satisfied!');
        }
        const nextTier = this.tiers[this.currentNFT.tierIndex + 1];
        
        // Dispatch real Web3 transaction
        const tx = await window.squeekWeb3.sendEvolveNFTTx(this.currentNFT.tokenId, nextTier.name);

        this.currentNFT.tierIndex++;
        this.currentNFT.level++;

        if (window.squeekAudio) {
            window.squeekAudio.playNotification();
            window.squeekAudio.playCrowdCheer();
        }

        this.renderSVG();
        this._updateUI();

        return { tx, newTier: nextTier.name };
    }

    /**
     * Mint a new Hamster NFT
     */
    async mintNew(name) {
        const tx = await window.squeekWeb3.sendMintNFTTx(name);
        this.currentNFT = {
            tokenId: Math.floor(100 + Math.random() * 900),
            name: `${name} #${Math.floor(100 + Math.random() * 900)}`,
            tierIndex: 0,
            level: 1,
            revolutions: 120,
            treatScore: 10
        };

        if (window.squeekAudio) {
            window.squeekAudio.playCoinSound();
        }

        this.renderSVG();
        this._updateUI();
        return tx;
    }

    getMetadataJSON() {
        const tier = this.tiers[this.currentNFT.tierIndex];
        return JSON.stringify({
            name: this.currentNFT.name,
            description: `${tier.desc} Powered by Squeekchain proof-of-work.`,
            image: "data:image/svg+xml;utf8," + encodeURIComponent(this.getSVGString()),
            attributes: [
                { trait_type: "Evolution Tier", value: tier.name },
                { trait_type: "Level", value: this.currentNFT.level },
                { trait_type: "Total Revolutions", value: this.currentNFT.revolutions },
                { trait_type: "Proof-of-Hamster Affinity", value: "Overclocked" },
                { trait_type: "Feeder Aura Score", value: this.currentNFT.treatScore }
            ]
        }, null, 2);
    }

    getSVGString() {
        const tierIdx = this.currentNFT.tierIndex;
        const tier = this.tiers[tierIdx];

        // Dynamic Elements per Tier
        let headgearSVG = '';
        let eyeSVG = '';
        let auraSVG = '';
        let wheelGlowColor = '#00f5d4';

        if (tierIdx === 0) {
            // Tier 1: Sleepy Pip
            eyeSVG = `
                <path d="M 180 155 Q 192 165 204 155" stroke="#1f2937" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                <text x="215" y="130" font-family="monospace" font-size="20" fill="#00f5d4" font-weight="bold">z</text>
                <text x="230" y="110" font-family="monospace" font-size="26" fill="#00f5d4" font-weight="bold">Z</text>
            `;
            wheelGlowColor = '#8a5a36';
        } else if (tierIdx === 1) {
            // Tier 2: Cardio Cadet
            headgearSVG = `
                <!-- Retro Sweatband -->
                <rect x="150" y="125" width="75" height="14" rx="5" fill="#ff0054" />
                <rect x="150" y="129" width="75" height="4" fill="#ffd166" />
            `;
            eyeSVG = `
                <circle cx="190" cy="155" r="9" fill="#111827" />
                <circle cx="187" cy="152" r="3" fill="#ffffff" />
            `;
            wheelGlowColor = '#f77f00';
        } else if (tierIdx === 2) {
            // Tier 3: Cyber Squeek
            headgearSVG = `
                <!-- Cyber Visor -->
                <polygon points="160,140 225,140 215,162 165,162" fill="rgba(0, 245, 212, 0.85)" stroke="#00f5d4" stroke-width="2"/>
                <line x1="168" y1="151" x2="218" y2="151" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="4,2"/>
                <!-- Cyber Antenna -->
                <line x1="165" y1="130" x2="155" y2="105" stroke="#00f5d4" stroke-width="3" />
                <circle cx="155" cy="105" r="5" fill="#ff0054" />
            `;
            wheelGlowColor = '#00f5d4';
            auraSVG = `
                <circle cx="200" cy="200" r="160" fill="none" stroke="#00f5d4" stroke-width="2" stroke-dasharray="12,8" opacity="0.6"/>
            `;
        } else if (tierIdx === 3) {
            // Tier 4: Squeektoshi Ascended
            headgearSVG = `
                <!-- Golden Crown & Halo -->
                <ellipse cx="190" cy="100" rx="35" ry="10" fill="none" stroke="#ffd166" stroke-width="5" opacity="0.9"/>
                <polygon points="165,120 175,98 190,115 205,98 215,120" fill="#ffd166" stroke="#ffb703" stroke-width="2"/>
                <circle cx="190" cy="95" r="4" fill="#ff0054" />
            `;
            eyeSVG = `
                <!-- Laser Eyes -->
                <circle cx="190" cy="155" r="10" fill="#ff0054" />
                <line x1="190" y1="155" x2="350" y2="145" stroke="#ff0054" stroke-width="5" opacity="0.8" />
                <line x1="190" y1="155" x2="350" y2="145" stroke="#ffffff" stroke-width="2" />
            `;
            wheelGlowColor = '#ffd166';
            auraSVG = `
                <!-- Cosmic God Rays -->
                <circle cx="200" cy="200" r="170" fill="none" stroke="#ffd166" stroke-width="4" stroke-dasharray="20,10" opacity="0.8"/>
                <circle cx="200" cy="200" r="185" fill="none" stroke="#ff0054" stroke-width="2" stroke-dasharray="8,6" opacity="0.5"/>
            `;
        }

        return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
            <defs>
                <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#161c2e" />
                    <stop offset="100%" stop-color="#090c14" />
                </radialGradient>
                <radialGradient id="hamsterFur" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stop-color="${tier.color}" />
                    <stop offset="80%" stop-color="#8a4f14" />
                    <stop offset="100%" stop-color="#542e08" />
                </radialGradient>
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <!-- Card Background -->
            <rect width="400" height="400" rx="20" fill="url(#bgGrad)" stroke="${wheelGlowColor}" stroke-width="3" filter="url(#neonGlow)"/>

            ${auraSVG}

            <!-- Wheel Frame in Background -->
            <circle cx="200" cy="210" r="140" fill="none" stroke="${wheelGlowColor}" stroke-width="7" opacity="0.4"/>
            <circle cx="200" cy="210" r="125" fill="none" stroke="#252d47" stroke-width="12" />

            <!-- Wheel Spokes -->
            <g stroke="#374151" stroke-width="2" opacity="0.5">
                <line x1="200" y1="85" x2="200" y2="335" />
                <line x1="75" y1="210" x2="325" y2="210" />
                <line x1="110" y1="120" x2="290" y2="300" />
                <line x1="110" y1="300" x2="290" y2="120" />
            </g>

            <!-- Hamster Character Group -->
            <g transform="translate(15, 20)">
                <!-- Back Paws -->
                <ellipse cx="140" cy="255" rx="16" ry="10" fill="#ffb4a2" />
                <ellipse cx="230" cy="255" rx="16" ry="10" fill="#ffb4a2" />

                <!-- Hamster Body -->
                <ellipse cx="185" cy="215" rx="65" ry="50" fill="url(#hamsterFur)" />

                <!-- White Underbelly -->
                <ellipse cx="195" cy="225" rx="38" ry="28" fill="#fff3b0" />

                <!-- Cute Tail -->
                <circle cx="118" cy="225" r="10" fill="#ffb4a2" />

                <!-- Ears -->
                <circle cx="155" cy="135" r="16" fill="${tier.color}" />
                <circle cx="155" cy="135" r="9" fill="#ffb4a2" />
                <circle cx="215" cy="135" r="16" fill="${tier.color}" />
                <circle cx="215" cy="135" r="9" fill="#ffb4a2" />

                <!-- Head -->
                <circle cx="185" cy="165" r="42" fill="url(#hamsterFur)" />

                <!-- Chubby Cheeks -->
                <circle cx="160" cy="180" r="18" fill="#ffd166" opacity="0.6"/>
                <circle cx="210" cy="180" r="18" fill="#ffd166" opacity="0.6"/>

                <!-- Front Paws -->
                <ellipse cx="160" cy="245" rx="12" ry="10" fill="#ffb4a2" />
                <ellipse cx="210" cy="245" rx="12" ry="10" fill="#ffb4a2" />

                <!-- Eyes / Headgear -->
                ${eyeSVG}
                ${headgearSVG}

                <!-- Cute Nose & Mouth -->
                <polygon points="182,175 188,175 185,180" fill="#ff6b6b" />
                <path d="M 181 180 Q 185 185 189 180" stroke="#ff6b6b" stroke-width="2" fill="none" />
            </g>

            <!-- Bottom Tier Badge -->
            <rect x="30" y="340" width="340" height="38" rx="10" fill="rgba(10, 14, 23, 0.9)" stroke="${wheelGlowColor}" stroke-width="1.5"/>
            <text x="200" y="364" font-family="'Barlow Condensed', sans-serif" font-weight="bold" font-size="18" fill="${tier.color}" text-anchor="middle" letter-spacing="1">
                TIER ${tierIdx + 1}: ${tier.name.toUpperCase()} (LVL ${this.currentNFT.level})
            </text>
        </svg>
        `;
    }

    renderSVG() {
        const container = document.getElementById('nft-svg-container');
        if (container) {
            container.innerHTML = this.getSVGString();
        }
    }

    _updateUI() {
        const tier = this.tiers[this.currentNFT.tierIndex];
        const nextTier = this.tiers[this.currentNFT.tierIndex + 1];

        const nameEl = document.getElementById('nft-card-name');
        const tierEl = document.getElementById('nft-card-tier');
        const revsEl = document.getElementById('nft-card-revs');
        const progressEl = document.getElementById('nft-card-progress');
        const evolveBtn = document.getElementById('nft-evolve-btn');
        const reqTextEl = document.getElementById('nft-req-text');

        if (nameEl) nameEl.textContent = this.currentNFT.name;
        if (tierEl) {
            tierEl.textContent = `Tier ${this.currentNFT.tierIndex + 1}: ${tier.name}`;
            tierEl.className = `tier-badge ${tier.badgeClass}`;
        }
        if (revsEl) revsEl.textContent = `${this.currentNFT.revolutions.toLocaleString()} Revs`;

        if (nextTier) {
            const needed = nextTier.reqRevs;
            const pct = Math.min(100, Math.floor((this.currentNFT.revolutions / needed) * 100));
            if (progressEl) progressEl.style.width = `${pct}%`;
            if (reqTextEl) reqTextEl.textContent = `${this.currentNFT.revolutions.toLocaleString()} / ${needed.toLocaleString()} Revs for ${nextTier.name} (${pct}%)`;

            if (evolveBtn) {
                if (this.canEvolve()) {
                    evolveBtn.disabled = false;
                    evolveBtn.className = 'btn btn-primary pulse-btn';
                    evolveBtn.textContent = `⚡ EVOLVE TO ${nextTier.name.toUpperCase()} (SEND TX)`;
                } else {
                    evolveBtn.disabled = true;
                    evolveBtn.className = 'btn btn-disabled';
                    evolveBtn.textContent = `🔒 LOCKED (${needed - this.currentNFT.revolutions} more revs needed)`;
                }
            }
        } else {
            if (progressEl) progressEl.style.width = '100%';
            if (reqTextEl) reqTextEl.textContent = '🌟 Maximum Transcendence Tier Reached!';
            if (evolveBtn) {
                evolveBtn.disabled = true;
                evolveBtn.className = 'btn btn-disabled';
                evolveBtn.textContent = 'MAX TIER REACHED';
            }
        }
    }
}

window.DynamicSqueekNFT = DynamicSqueekNFT;
