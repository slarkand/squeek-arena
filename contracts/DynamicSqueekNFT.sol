// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DynamicSqueekNFT
 * @notice Generative Dynamic SVG NFT that evolves based on hamster wheel telemetry & revolutions
 */
contract DynamicSqueekNFT {
    string public name = "Dynamic Squeek Hamsters";
    string public symbol = "DSQK";
    uint256 public nextTokenId = 1;

    enum EvolutionTier {
        SleepyPip,         // Tier 1: Base sleepy hamster
        CardioCadet,       // Tier 2: Sweatband, high-stamina runner
        CyberSqueek,       // Tier 3: Neon visor, LED cyber wheel
        SqueektoshiAscended // Tier 4: Cosmic golden aura, halo, laser eyes
    }

    struct SqueekAttributes {
        string hamsterName;
        EvolutionTier tier;
        uint256 level;
        uint256 totalRevolutionsContributed;
        uint256 treatAuraScore;
        uint256 lastEvolvedBlock;
    }

    mapping(uint256 => SqueekAttributes) public tokenAttributes;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;

    event SqueekMinted(uint256 indexed tokenId, address indexed owner, string name);
    event SqueekEvolved(uint256 indexed tokenId, EvolutionTier newTier, uint256 newLevel);
    event RevolutionsRecorded(uint256 indexed tokenId, uint256 addedRevs, uint256 totalRevs);

    /**
     * @notice Mint a new Genesis Squeek NFT
     */
    function mintSqueek(string calldata hamsterName) external returns (uint256) {
        uint256 tokenId = nextTokenId++;
        ownerOf[tokenId] = msg.sender;
        balanceOf[msg.sender]++;

        tokenAttributes[tokenId] = SqueekAttributes({
            hamsterName: hamsterName,
            tier: EvolutionTier.SleepyPip,
            level: 1,
            totalRevolutionsContributed: 0,
            treatAuraScore: 10,
            lastEvolvedBlock: block.number
        });

        emit SqueekMinted(tokenId, msg.sender, hamsterName);
        return tokenId;
    }

    /**
     * @notice Record hamster revolutions earned during live stream wheel sessions
     */
    function recordWheelActivity(uint256 tokenId, uint256 revs) external {
        require(ownerOf[tokenId] == msg.sender, "Not token owner");
        tokenAttributes[tokenId].totalRevolutionsContributed += revs;
        emit RevolutionsRecorded(tokenId, revs, tokenAttributes[tokenId].totalRevolutionsContributed);
    }

    /**
     * @notice Evolve your Squeek NFT to the next visual tier once revolution milestones are met!
     */
    function evolve(uint256 tokenId) external {
        require(ownerOf[tokenId] == msg.sender, "Not token owner");
        SqueekAttributes storage attrs = tokenAttributes[tokenId];

        if (attrs.tier == EvolutionTier.SleepyPip) {
            require(attrs.totalRevolutionsContributed >= 500, "Needs 500 wheel revolutions");
            attrs.tier = EvolutionTier.CardioCadet;
            attrs.level = 2;
        } else if (attrs.tier == EvolutionTier.CardioCadet) {
            require(attrs.totalRevolutionsContributed >= 2500, "Needs 2,500 wheel revolutions");
            attrs.tier = EvolutionTier.CyberSqueek;
            attrs.level = 3;
        } else if (attrs.tier == EvolutionTier.CyberSqueek) {
            require(attrs.totalRevolutionsContributed >= 10000, "Needs 10,000 wheel revolutions");
            attrs.tier = EvolutionTier.SqueektoshiAscended;
            attrs.level = 4;
        } else {
            revert("Already at maximum transcendence tier!");
        }

        attrs.lastEvolvedBlock = block.number;
        emit SqueekEvolved(tokenId, attrs.tier, attrs.level);
    }

    function getAttributes(uint256 tokenId) external view returns (SqueekAttributes memory) {
        return tokenAttributes[tokenId];
    }
}
