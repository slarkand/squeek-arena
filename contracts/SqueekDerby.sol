// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SqueekDerby
 * @notice Real-time Hamster Sprint Betting Engine powered by Squeekchain proof-of-work entropy
 */
contract SqueekDerby {
    address public admin;
    uint256 public currentRaceId;
    
    struct Runner {
        string name;
        uint256 totalBetAmount;
        uint256 oddsBasisPoints; // e.g., 250 = 2.5x
    }
    
    enum RaceStatus {
        Open,       // Accepting wagers
        Racing,     // Hamsters currently running on track
        Settled,    // Winner declared and payouts open
        Cancelled
    }
    
    struct Race {
        uint256 id;
        uint256 startTime;
        uint256 durationSeconds;
        RaceStatus status;
        uint8 winningRunner;
        uint256 totalPrizePool;
        mapping(uint8 => uint256) runnerPools;
        mapping(address => mapping(uint8 => uint256)) bets;
        mapping(address => bool) claimed;
    }

    mapping(uint256 => Race) internal races;
    
    event WagerPlaced(
        uint256 indexed raceId,
        address indexed bettor,
        uint8 indexed runnerId,
        uint256 amount
    );
    
    event RaceStarted(uint256 indexed raceId, uint256 duration);
    event RaceSettled(uint256 indexed raceId, uint8 winner, uint256 totalPool);
    event PayoutClaimed(uint256 indexed raceId, address indexed bettor, uint256 payout);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        currentRaceId = 1;
    }

    /**
     * @notice Place an on-chain wager on a specific hamster runner
     */
    function placeWager(uint256 raceId, uint8 runnerId) external payable {
        require(runnerId < 4, "Invalid runner index (0-3)");
        require(msg.value > 0, "Bet amount must be > 0");
        
        Race storage race = races[raceId];
        require(race.status == RaceStatus.Open, "Wagers closed for this race");
        
        race.bets[msg.sender][runnerId] += msg.value;
        race.runnerPools[runnerId] += msg.value;
        race.totalPrizePool += msg.value;

        emit WagerPlaced(raceId, msg.sender, runnerId, msg.value);
    }

    /**
     * @notice Admin / Oracle settles the race based on wheel RPM telemetry & entropy
     */
    function settleRace(uint256 raceId, uint8 winner) external onlyAdmin {
        Race storage race = races[raceId];
        require(race.status == RaceStatus.Racing || race.status == RaceStatus.Open, "Cannot settle");
        require(winner < 4, "Invalid winner");

        race.winningRunner = winner;
        race.status = RaceStatus.Settled;

        emit RaceSettled(raceId, winner, race.totalPrizePool);
    }

    /**
     * @notice Winners claim their share of the prize pool
     */
    function claimWinnings(uint256 raceId) external {
        Race storage race = races[raceId];
        require(race.status == RaceStatus.Settled, "Race not settled");
        require(!race.claimed[msg.sender], "Already claimed");

        uint8 winner = race.winningRunner;
        uint256 userBet = race.bets[msg.sender][winner];
        require(userBet > 0, "No winning wager found");

        uint256 winningPool = race.runnerPools[winner];
        uint256 payout = (userBet * race.totalPrizePool) / winningPool;

        race.claimed[msg.sender] = true;
        payable(msg.sender).transfer(payout);

        emit PayoutClaimed(raceId, msg.sender, payout);
    }
}
