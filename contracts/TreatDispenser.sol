// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SqueekTreatDispenser
 * @notice Allows stream viewers to send real on-chain treat transactions to boost hamster stamina & RPM
 */
contract TreatDispenser {
    address public owner;
    address public sqkToken;
    
    enum TreatType {
        SunflowerSeed, // 0 - Normal snack (+10 RPM boost)
        CheddarNibble, // 1 - Cheese power (+25 RPM boost)
        EnergyBerry,   // 2 - Vitamin kick (+50 RPM boost)
        GoldenAcorn    // 3 - Maximum Overclock (+100 RPM boost + Golden Sparkles)
    }

    struct TreatInfo {
        string name;
        uint256 costSQK;
        uint256 rpmBoost;
        uint256 durationSeconds;
    }

    mapping(TreatType => TreatInfo) public treatCatalog;
    mapping(address => uint256) public feederAura;
    
    event TreatFed(
        address indexed feeder,
        TreatType indexed treatType,
        uint256 costSQK,
        uint256 rpmBoost,
        uint256 timestamp
    );
    
    event AuraAwarded(address indexed feeder, uint256 totalAura);

    constructor(address _sqkToken) {
        owner = msg.sender;
        sqkToken = _sqkToken;

        treatCatalog[TreatType.SunflowerSeed] = TreatInfo("Sunflower Seed", 10 ether, 10, 30);
        treatCatalog[TreatType.CheddarNibble] = TreatInfo("Cheddar Nibble", 25 ether, 25, 45);
        treatCatalog[TreatType.EnergyBerry]   = TreatInfo("Energy Berry", 50 ether, 50, 60);
        treatCatalog[TreatType.GoldenAcorn]   = TreatInfo("Golden Acorn", 100 ether, 100, 120);
    }

    /**
     * @notice Send a treat transaction to cheer and overclock the live hamster wheel
     */
    function feed(TreatType treatType) external payable {
        TreatInfo memory treat = treatCatalog[treatType];
        require(treat.costSQK > 0, "Invalid treat");

        // Award aura to the feeder (1 Aura per 1 ether spent)
        uint256 auraGained = treat.costSQK / 1 ether;
        feederAura[msg.sender] += auraGained;

        emit TreatFed(
            msg.sender,
            treatType,
            treat.costSQK,
            treat.rpmBoost,
            block.timestamp
        );
        emit AuraAwarded(msg.sender, feederAura[msg.sender]);
    }

    function getFeederAura(address user) external view returns (uint256) {
        return feederAura[user];
    }
}
