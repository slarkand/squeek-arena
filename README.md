# 🐹 SQUEEK ARENA & STREAM COMPANION

> **Interactive Proof-of-Hamster Gaming, Stream Overlay HUD, Dynamic NFT Evolver & Autonomous SqueekFi Bot for Squeekchain.**

Built strictly to answer the Squeekchain builder mandate:
**"Ship something people use, not something that just reads the chain."**

---

## 🎯 How this Project Satisfies Every "Build This" Requirement

| Hackathon Requirement | What We Built | How it Works |
| :--- | :--- | :--- |
| **Games powered by Squeekchain** | **Squeek Derby (Sprint Racing)** | 4 hamsters (#1 Pip Squeek, #2 Cyber Hammy, #3 Squeektoshi, #4 Whale Nibbler) race in real-time. Runner sprint speeds, nitro surges, and race results are dynamically powered by live **WHEELY9000 RPM entropy**. Includes parimutuel odds calculations and on-chain payouts. |
| **Stream companions & overlays for hamster cam** | **SqueekCam HUD & OBS Overlay** | An interactive stream companion with real-time physics simulation of the hamster rig, plus a dedicated transparent OBS Browser Source (`/overlay.html`) displaying live RPM gauges, MPH speedometers, and chat treat feeds. |
| **Tools that SEND transactions, not just read them** | **Web3 Transaction Engine** | Dispatches real state-modifying smart contract calls: `feedTreat()` to overclock the wheel, `placeWager()` on derby racers, `claimWinnings()`, `stake()` and `harvestYield()` on SqueekFi, and `evolve()` on Dynamic NFTs. |
| **Bots that act on Squeekchain events** | **SqueekSentry Autonomous Bot** | Listens to on-chain events (`BlockMined`, `TreatFed`, `RPMSpike`) and automatically executes transactions: Emergency Auto-Feeder (prevents block stall if RPM dips below 95), Yield Compounder, and Derby Sniper. |
| **Apps for Squeek NFT holders** | **Dynamic SqueekMorph Studio** | Customizer and on-chain evolution portal for Squeek NFT holders with live milestone tracking and dynamic SVG rendering. |
| **SqueekFi** | **RPM-Pegged Yield Vault** | Decentralized staking vault where APY is dynamically coupled to physical rodent power: `APR = 12% + (Live RPM * 0.40)`. Physical hamster work directly dictates staking yield! |
| **Dynamic NFTs that evolve with the hamster** | **4-Tier SVG Dynamic NFT** | Generative on-chain vector avatars that visually transform through 4 stages (Sleepy Pip ➡️ Cardio Cadet ➡️ Cyber Squeek ➡️ Squeektoshi Ascended) as cumulative wheel revolutions increase. |

---

## 🚀 Quick Start (Zero Dependencies Required!)

### Option A: Direct Browser Launch
Simply double-click or open `public/index.html` in Chrome, Brave, Edge, or Firefox. Everything (including Web Audio synthesis and Canvas rendering) runs completely client-side!

### Option B: Node.js Local Server
```bash
# In the squeek-arena folder:
node server.js
```
Then visit:
- **Main App**: `http://localhost:3000`
- **OBS Browser Source Overlay**: `http://localhost:3000/overlay.html`
- **Telemetry API**: `http://localhost:3000/api/telemetry`

---

## 📺 OBS Studio / Streamlabs Setup

1. In OBS Studio, add a new **Browser Source**.
2. Set URL to: `http://localhost:3000/overlay.html` (or the file path to `public/overlay.html`).
3. Set Width: `400`, Height: `220`.
4. Ensure **Shutdown source when not visible** is unchecked.
5. The overlay renders with an alpha-channel transparent background ready to place over the live Hamster Cam video feed!

---

## 📜 Smart Contracts Deployed in `contracts/`

1. **`TreatDispenser.sol`**:
   - `feed(TreatType treatType)`: Sends $SQK to feed snacks (Sunflower Seed, Cheddar, Energy Berry, Golden Acorn), boosting wheel RPM and earning Feeder Aura.
2. **`SqueekDerby.sol`**:
   - `placeWager(uint256 raceId, uint8 runnerId)`: Stakes SQK on a runner.
   - `settleRace(uint256 raceId, uint8 winner)`: Settles race based on wheel entropy.
   - `claimWinnings(uint256 raceId)`: Distributes pool rewards to winning bettors.
3. **`SqueekFiVault.sol`**:
   - `stake()`: Deposits SQK into the dynamic yield pool.
   - `getCurrentAPR()`: Computes dynamic yield based on real-time RPM telemetry.
   - `harvestYield()`: Claims accrued yield.
4. **`DynamicSqueekNFT.sol`**:
   - `mintSqueek(string name)`: Mints a Genesis Hamster avatar.
   - `evolve(uint256 tokenId)`: Mutates NFT tier and attributes on-chain once revolution thresholds (500, 2,500, 10,000 revs) are met.

---

## 🔊 100% Web Audio API Sound Design
No external `.mp3` or `.wav` files to lose or fail loading. All sound effects (hamster chirps/squeaks, bearing rumble, coin clinks, crowd cheers, notification chimes) are synthesized dynamically in real time using native oscillators, noise buffers, and biquad filters.
