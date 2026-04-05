// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RiskPetNFT is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    
    // Rarity tiers
    enum Rarity { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY }
    
    struct PetAttributes {
        uint256 tokenId;
        string name;
        Rarity rarity;
        uint8 strength;      // 1-100 affects win chance
        uint8 agility;       // 1-100 affects speed/reaction
        uint8 intelligence;  // 1-100 affects risk calculation
        uint8 luck;          // 1-100 random bonus
        uint8 level;         // 1-5 (upgradable to 10)
        uint8 maxLevel;      // starts at 5, upgradeable to 10
        uint256 experience;
        uint256 wins;
        uint256 losses;
        uint256 totalEarnings;
        uint256 lastFed;
        uint256 lastPlayed;
        bool isBoosted;
        uint256 boostEndTime;
    }
    
    struct Booster {
        string name;
        uint256 price;
        uint8 winChanceBoost;    // +X% to win chance
        uint8 xpMultiplier;      // XP gain multiplier
        uint256 duration;        // in seconds
    }
    
    // Mint prices by rarity chance
    uint256 public mintPrice = 0.01 ether;
    uint256 public upgradePrice = 0.05 ether;  // Double max level 5->10
    
    mapping(uint256 => PetAttributes) public pets;
    mapping(address => uint256[]) public ownerPets;
    mapping(address => mapping(uint256 => bool)) public activeBoosters;
    
    // Booster types
    mapping(uint8 => Booster) public boosters;
    uint8 public constant BOOSTER_WIN = 1;
    uint8 public constant BOOSTER_XP = 2;
    uint8 public constant BOOSTER_LUCK = 3;
    
    uint256 public nextTokenId = 1;
    uint256 public platformFeePercent = 5;
    
    // Events
    event PetMinted(uint256 indexed tokenId, address indexed owner, Rarity rarity, string name);
    event PetUpgraded(uint256 indexed tokenId, uint8 newMaxLevel);
    event BoosterActivated(uint256 indexed tokenId, uint8 boosterType, uint256 endTime);
    event PetLeveledUp(uint256 indexed tokenId, uint8 newLevel);
    
    constructor() ERC721("RiskPet", "RPET") Ownable(msg.sender) {
        // Initialize boosters
        boosters[BOOSTER_WIN] = Booster("Win Boost", 0.005 ether, 15, 1, 24 hours);
        boosters[BOOSTER_XP] = Booster("XP Multiplier", 0.003 ether, 0, 3, 12 hours);
        boosters[BOOSTER_LUCK] = Booster("Luck Surge", 0.008 ether, 5, 2, 6 hours);
    }
    
    function mintPet(string memory _name) external payable nonReentrant {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(bytes(_name).length > 0 && bytes(_name).length <= 20, "Invalid name length");
        
        uint256 tokenId = nextTokenId++;
        
        // Random rarity based on chances
        Rarity rarity = _determineRarity();
        
        // Generate random attributes based on rarity
        (uint8 str, uint8 agi, uint8 intel, uint8 luck) = _generateAttributes(rarity);
        
        pets[tokenId] = PetAttributes({
            tokenId: tokenId,
            name: _name,
            rarity: rarity,
            strength: str,
            agility: agi,
            intelligence: intel,
            luck: luck,
            level: 1,
            maxLevel: 5,
            experience: 0,
            wins: 0,
            losses: 0,
            totalEarnings: 0,
            lastFed: block.timestamp,
            lastPlayed: block.timestamp,
            isBoosted: false,
            boostEndTime: 0
        });
        
        ownerPets[msg.sender].push(tokenId);
        _safeMint(msg.sender, tokenId);
        
        emit PetMinted(tokenId, msg.sender, rarity, _name);
    }
    
    function _determineRarity() internal view returns (Rarity) {
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            nextTokenId
        ))) % 100;
        
        // 50% Common, 30% Uncommon, 15% Rare, 4% Epic, 1% Legendary
        if (random < 50) return Rarity.COMMON;
        if (random < 80) return Rarity.UNCOMMON;
        if (random < 95) return Rarity.RARE;
        if (random < 99) return Rarity.EPIC;
        return Rarity.LEGENDARY;
    }
    
    function _generateAttributes(Rarity _rarity) internal view returns (uint8, uint8, uint8, uint8) {
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        )));
        
        uint8 baseMin;
        uint8 baseMax;
        
        if (_rarity == Rarity.COMMON) { baseMin = 10; baseMax = 40; }
        else if (_rarity == Rarity.UNCOMMON) { baseMin = 25; baseMax = 55; }
        else if (_rarity == Rarity.RARE) { baseMin = 40; baseMax = 70; }
        else if (_rarity == Rarity.EPIC) { baseMin = 60; baseMax = 85; }
        else { baseMin = 75; baseMax = 100; }
        
        uint8 str = uint8((seed % (baseMax - baseMin + 1)) + baseMin);
        uint8 agi = uint8(((seed >> 8) % (baseMax - baseMin + 1)) + baseMin);
        uint8 intel = uint8(((seed >> 16) % (baseMax - baseMin + 1)) + baseMin);
        uint8 luck = uint8(((seed >> 24) % (baseMax - baseMin + 1)) + baseMin);
        
        return (str, agi, intel, luck);
    }
    
    function upgradeMaxLevel(uint256 _tokenId) external payable {
        require(ownerOf(_tokenId) == msg.sender, "Not owner");
        require(msg.value >= upgradePrice, "Insufficient payment");
        require(pets[_tokenId].maxLevel == 5, "Already upgraded");
        
        pets[_tokenId].maxLevel = 10;
        emit PetUpgraded(_tokenId, 10);
    }
    
    function activateBooster(uint256 _tokenId, uint8 _boosterType) external payable {
        require(ownerOf(_tokenId) == msg.sender, "Not owner");
        require(_boosterType >= 1 && _boosterType <= 3, "Invalid booster");
        require(!pets[_tokenId].isBoosted || block.timestamp > pets[_tokenId].boostEndTime, "Booster active");
        
        Booster memory booster = boosters[_boosterType];
        require(msg.value >= booster.price, "Insufficient payment");
        
        pets[_tokenId].isBoosted = true;
        pets[_tokenId].boostEndTime = block.timestamp + booster.duration;
        activeBoosters[msg.sender][_boosterType] = true;
        
        emit BoosterActivated(_tokenId, _boosterType, pets[_tokenId].boostEndTime);
    }
    
    function gainExperience(uint256 _tokenId, uint256 _xp) external {
        // Only callable by game contract
        PetAttributes storage pet = pets[_tokenId];
        
        uint256 multiplier = pet.isBoosted && block.timestamp < pet.boostEndTime && 
                              boosters[BOOSTER_XP].xpMultiplier > 1 ? 
                              boosters[BOOSTER_XP].xpMultiplier : 1;
        
        pet.experience += _xp * multiplier;
        
        // Level up logic
        uint256 xpNeeded = pet.level * 100;
        while (pet.experience >= xpNeeded && pet.level < pet.maxLevel) {
            pet.experience -= xpNeeded;
            pet.level++;
            xpNeeded = pet.level * 100;
            emit PetLeveledUp(_tokenId, pet.level);
        }
    }
    
    function calculateWinChance(uint256 _tokenId, uint8 _riskLevel) external view returns (uint8) {
        PetAttributes memory pet = pets[_tokenId];
        
        // Base chance by risk
        uint8 baseChance;
        if (_riskLevel == 1) baseChance = 70;      // Safe
        else if (_riskLevel == 2) baseChance = 50;   // Balanced
        else baseChance = 30;                         // Aggressive
        
        // Pet stats bonus (avg of all stats)
        uint8 avgStats = (pet.strength + pet.agility + pet.intelligence + pet.luck) / 4;
        int8 statsBonus = (int8(avgStats) - 50) / 5;
        
        // Level bonus (+2% per level)
        uint8 levelBonus = (pet.level - 1) * 2;
        
        // Booster bonus
        uint8 boosterBonus = 0;
        if (pet.isBoosted && block.timestamp < pet.boostEndTime) {
            boosterBonus = boosters[BOOSTER_WIN].winChanceBoost;
        }
        
        int16 totalChance = int16(baseChance) + statsBonus + int16(levelBonus) + int16(boosterBonus);
        
        if (totalChance > 95) return 95;
        if (totalChance < 5) return 5;
        return uint8(totalChance);
    }
    
    function getPetDetails(uint256 _tokenId) external view returns (PetAttributes memory) {
        return pets[_tokenId];
    }
    
    function getOwnerPets(address _owner) external view returns (uint256[] memory) {
        return ownerPets[_owner];
    }
    
    // Required overrides
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
