// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RiskPetGame {
    
    struct Pet {
        uint256 id;
        address owner;
        string name;
        uint8 health; // 0-100
        uint8 happiness; // 0-100
        uint8 hunger; // 0-100 (100 = full)
        uint256 lastFed;
        uint256 lastPlayed;
        uint256 lastSlept;
        uint256 wins;
        uint256 losses;
        uint256 totalEarnings;
    }
    
    struct GameRoom {
        uint256 roomId;
        address player1;
        address player2;
        uint256 betAmount;
        uint8 player1Risk; // 1=Safe, 2=Balanced, 3=Aggressive
        uint8 player2Risk;
        bool isActive;
        address winner;
    }
    
    mapping(uint256 => Pet) public pets;
    mapping(address => uint256) public ownerToPet;
    mapping(uint256 => GameRoom) public rooms;
    
    uint256 public nextPetId = 1;
    uint256 public nextRoomId = 1;
    uint256 public platformFeePercent = 5; // 5%
    
    address public owner;
    
    event PetCreated(uint256 indexed petId, address indexed owner, string name);
    event PetFed(uint256 indexed petId, uint8 newHealth);
    event PetPlayed(uint256 indexed petId, uint8 newHappiness);
    event PetSlept(uint256 indexed petId, uint8 newEnergy);
    event GameRoomCreated(uint256 indexed roomId, address indexed player1, uint256 betAmount);
    event PlayerJoined(uint256 indexed roomId, address indexed player2);
    event GameFinished(uint256 indexed roomId, address indexed winner, uint256 prize);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function createPet(string memory _name) external {
        require(ownerToPet[msg.sender] == 0, "Already has pet");
        
        uint256 petId = nextPetId++;
        pets[petId] = Pet({
            id: petId,
            owner: msg.sender,
            name: _name,
            health: 100,
            happiness: 100,
            hunger: 100,
            lastFed: block.timestamp,
            lastPlayed: block.timestamp,
            lastSlept: block.timestamp,
            wins: 0,
            losses: 0,
            totalEarnings: 0
        });
        
        ownerToPet[msg.sender] = petId;
        emit PetCreated(petId, msg.sender, _name);
    }
    
    function getPetStats(uint256 _petId) public view returns (
        uint8 currentHealth,
        uint8 currentHappiness,
        uint8 currentHunger
    ) {
        Pet storage pet = pets[_petId];
        
        uint256 timeSinceFed = block.timestamp - pet.lastFed;
        uint256 timeSincePlayed = block.timestamp - pet.lastPlayed;
        uint256 timeSinceSlept = block.timestamp - pet.lastSlept;
        
        // Hunger decreases 10 points every 6 hours
        uint8 hungerDecay = uint8((timeSinceFed / 6 hours) * 10);
        currentHunger = hungerDecay >= pet.hunger ? 0 : pet.hunger - hungerDecay;
        
        // Happiness decreases 10 points every 8 hours
        uint8 happyDecay = uint8((timeSincePlayed / 8 hours) * 10);
        currentHappiness = happyDecay >= pet.happiness ? 0 : pet.happiness - happyDecay;
        
        // Health based on hunger and happiness
        uint8 avgWellbeing = (currentHunger + currentHappiness) / 2;
        currentHealth = avgWellbeing;
        
        return (currentHealth, currentHappiness, currentHunger);
    }
    
    function feedPet() external {
        uint256 petId = ownerToPet[msg.sender];
        require(petId != 0, "No pet");
        
        Pet storage pet = pets[petId];
        pet.hunger = 100;
        pet.lastFed = block.timestamp;
        
        emit PetFed(petId, 100);
    }
    
    function playWithPet() external {
        uint256 petId = ownerToPet[msg.sender];
        require(petId != 0, "No pet");
        
        Pet storage pet = pets[petId];
        pet.happiness = 100;
        pet.lastPlayed = block.timestamp;
        
        emit PetPlayed(petId, 100);
    }
    
    function sleepPet() external {
        uint256 petId = ownerToPet[msg.sender];
        require(petId != 0, "No pet");
        
        Pet storage pet = pets[petId];
        pet.lastSlept = block.timestamp;
        
        emit PetSlept(petId, 100);
    }
    
    function getWinChance(uint8 _riskLevel, uint8 _petHealth) public pure returns (uint8) {
        // Base chances: Safe=70%, Balanced=50%, Aggressive=30%
        uint8 baseChance;
        if (_riskLevel == 1) baseChance = 70;
        else if (_riskLevel == 2) baseChance = 50;
        else baseChance = 30;
        
        // Pet health bonus/penalty (+-20%)
        int8 healthBonus = (int8(_petHealth) - 50) / 5;
        int16 finalChance = int16(baseChance) + healthBonus;
        
        if (finalChance > 95) return 95;
        if (finalChance < 5) return 5;
        return uint8(finalChance);
    }
    
    function createGameRoom(uint8 _riskLevel) external payable {
        uint256 petId = ownerToPet[msg.sender];
        require(petId != 0, "Need pet to play");
        require(msg.value > 0, "Bet required");
        require(_riskLevel >= 1 && _riskLevel <= 3, "Invalid risk");
        
        (uint8 health,,) = getPetStats(petId);
        require(health > 20, "Pet too weak");
        
        uint256 roomId = nextRoomId++;
        rooms[roomId] = GameRoom({
            roomId: roomId,
            player1: msg.sender,
            player2: address(0),
            betAmount: msg.value,
            player1Risk: _riskLevel,
            player2Risk: 0,
            isActive: true,
            winner: address(0)
        });
        
        emit GameRoomCreated(roomId, msg.sender, msg.value);
    }
    
    function joinGame(uint256 _roomId, uint8 _riskLevel) external payable {
        GameRoom storage room = rooms[_roomId];
        require(room.isActive, "Room not active");
        require(room.player2 == address(0), "Room full");
        require(msg.sender != room.player1, "Can't join own room");
        require(msg.value == room.betAmount, "Wrong bet amount");
        require(_riskLevel >= 1 && _riskLevel <= 3, "Invalid risk");
        
        uint256 petId = ownerToPet[msg.sender];
        require(petId != 0, "Need pet to play");
        
        (uint8 health,,) = getPetStats(petId);
        require(health > 20, "Pet too weak");
        
        room.player2 = msg.sender;
        room.player2Risk = _riskLevel;
        
        emit PlayerJoined(_roomId, msg.sender);
        
        // Resolve game immediately
        _resolveGame(_roomId);
    }
    
    function _resolveGame(uint256 _roomId) internal {
        GameRoom storage room = rooms[_roomId];
        
        uint256 pet1Id = ownerToPet[room.player1];
        uint256 pet2Id = ownerToPet[room.player2];
        
        (uint8 health1,,) = getPetStats(pet1Id);
        (uint8 health2,,) = getPetStats(pet2Id);
        
        uint8 winChance1 = getWinChance(room.player1Risk, health1);
        uint8 winChance2 = getWinChance(room.player2Risk, health2);
        
        // Pseudo-random winner selection weighted by win chances
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            room.player1,
            room.player2
        )));
        
        uint256 totalWeight = winChance1 + winChance2;
        address winner = (random % totalWeight) < winChance1 ? room.player1 : room.player2;
        
        uint256 totalPot = room.betAmount * 2;
        uint256 platformFee = (totalPot * platformFeePercent) / 100;
        uint256 prize = totalPot - platformFee;
        
        room.winner = winner;
        room.isActive = false;
        
        // Update pet stats
        if (winner == room.player1) {
            pets[pet1Id].wins++;
            pets[pet1Id].totalEarnings += prize;
            pets[pet2Id].losses++;
            // Loser pet loses health
            pets[pet2Id].health = pets[pet2Id].health > 20 ? pets[pet2Id].health - 20 : 0;
        } else {
            pets[pet2Id].wins++;
            pets[pet2Id].totalEarnings += prize;
            pets[pet1Id].losses++;
            pets[pet1Id].health = pets[pet1Id].health > 20 ? pets[pet1Id].health - 20 : 0;
        }
        
        payable(winner).transfer(prize);
        
        emit GameFinished(_roomId, winner, prize);
    }
    
    function getActiveRooms() external view returns (uint256[] memory) {
        uint256[] memory active = new uint256[](nextRoomId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextRoomId; i++) {
            if (rooms[i].isActive && rooms[i].player2 == address(0)) {
                active[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = active[i];
        }
        
        return result;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
