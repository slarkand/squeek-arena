// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SqueekFiVault
 * @notice Dynamic Hamster Yield Vault - APY dynamically scales with the WHEELY9000 RPM telemetry!
 */
contract SqueekFiVault {
    address public owner;
    
    uint256 public baseAPR = 1200; // 12.00% (basis points)
    uint256 public currentRPM = 180; // Fed from proof-of-work telemetry
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    struct StakePosition {
        uint256 principal;
        uint256 rewardDebt;
        uint256 lastUpdateTime;
    }

    mapping(address => StakePosition) public stakers;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event YieldHarvested(address indexed user, uint256 reward);
    event RPMUpdated(uint256 newRPM, uint256 dynamicAPR);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Calculate current APY based on live Hamster Wheel activity
     * RPM of 0 gives 12% APY. RPM of 300 gives 12% + (300 * 0.4%) = 132% APY!
     */
    function getCurrentAPR() public view returns (uint256) {
        return baseAPR + (currentRPM * 40); // 40 bps per RPM
    }

    /**
     * @notice Oracle feeds live wheel RPM into the vault
     */
    function updateTelemetryRPM(uint256 _rpm) external onlyOwner {
        currentRPM = _rpm;
        emit RPMUpdated(_rpm, getCurrentAPR());
    }

    /**
     * @notice Stake tokens into the hamster vault
     */
    function stake() external payable {
        require(msg.value > 0, "Cannot stake 0");
        _updateRewards(msg.sender);

        stakers[msg.sender].principal += msg.value;
        totalStaked += msg.value;

        emit Staked(msg.sender, msg.value);
    }

    /**
     * @notice Claim accrued yield
     */
    function harvestYield() external {
        _updateRewards(msg.sender);
        uint256 pending = stakers[msg.sender].rewardDebt;
        require(pending > 0, "No rewards available");

        stakers[msg.sender].rewardDebt = 0;
        payable(msg.sender).transfer(pending);

        emit YieldHarvested(msg.sender, pending);
    }

    /**
     * @notice Withdraw staked tokens
     */
    function withdraw(uint256 amount) external {
        require(stakers[msg.sender].principal >= amount, "Insufficient staked balance");
        _updateRewards(msg.sender);

        stakers[msg.sender].principal -= amount;
        totalStaked -= amount;
        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount);
    }

    function pendingReward(address user) public view returns (uint256) {
        StakePosition memory pos = stakers[user];
        if (pos.principal == 0) return pos.rewardDebt;

        uint256 duration = block.timestamp - pos.lastUpdateTime;
        uint256 rate = getCurrentAPR();
        uint256 newReward = (pos.principal * rate * duration) / (10000 * SECONDS_PER_YEAR);
        return pos.rewardDebt + newReward;
    }

    function _updateRewards(address user) internal {
        StakePosition storage pos = stakers[user];
        if (pos.principal > 0) {
            uint256 duration = block.timestamp - pos.lastUpdateTime;
            uint256 rate = getCurrentAPR();
            uint256 earned = (pos.principal * rate * duration) / (10000 * SECONDS_PER_YEAR);
            pos.rewardDebt += earned;
        }
        pos.lastUpdateTime = block.timestamp;
    }
}
