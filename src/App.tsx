import { useState, useEffect, useRef, Suspense } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Box, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Types
enum Rarity {
  COMMON = 0,
  UNCOMMON = 1,
  RARE = 2,
  EPIC = 3,
  LEGENDARY = 4
}

interface PetAttributes {
  tokenId: number
  name: string
  rarity: Rarity
  strength: number
  agility: number
  intelligence: number
  luck: number
  level: number
  maxLevel: number
  experience: number
  wins: number
  losses: number
  totalEarnings: number
  isBoosted: boolean
  boostEndTime: number
}

interface Booster {
  id: number
  name: string
  price: string
  winChanceBoost: number
  xpMultiplier: number
  duration: string
  icon: string
}

// 3D Pet Component
function Pet3D({ rarity, isBoosted, isAnimating }: { rarity: Rarity; isBoosted: boolean; isAnimating: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
    if (meshRef.current && isAnimating) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.3
    }
  })

  const getRarityColor = () => {
    switch (rarity) {
      case Rarity.COMMON: return '#9ca3af'
      case Rarity.UNCOMMON: return '#22c55e'
      case Rarity.RARE: return '#3b82f6'
      case Rarity.EPIC: return '#a855f7'
      case Rarity.LEGENDARY: return '#f59e0b'
      default: return '#00f3ff'
    }
  }

  const color = getRarityColor()
  const scale = rarity === Rarity.LEGENDARY ? 1.2 : rarity === Rarity.EPIC ? 1.1 : 1

  return (
    <group ref={groupRef} scale={scale}>
      {/* Main body */}
      <Sphere ref={meshRef} args={[1, 64, 64]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color={color}
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      
      {/* Booster aura */}
      {isBoosted && (
        <Sphere args={[1.4, 32, 32]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#00ff88" transparent opacity={0.2} />
        </Sphere>
      )}
      
      {/* Eyes */}
      <Sphere args={[0.15, 32, 32]} position={[-0.3, 0.2, 0.8]}>
        <meshStandardMaterial color="white" emissive="#00f3ff" emissiveIntensity={0.5} />
      </Sphere>
      <Sphere args={[0.15, 32, 32]} position={[0.3, 0.2, 0.8]}>
        <meshStandardMaterial color="white" emissive="#00f3ff" emissiveIntensity={0.5} />
      </Sphere>
      <Sphere args={[0.08, 32, 32]} position={[-0.3, 0.2, 0.92]}>
        <meshStandardMaterial color="black" />
      </Sphere>
      <Sphere args={[0.08, 32, 32]} position={[0.3, 0.2, 0.92]}>
        <meshStandardMaterial color="black" />
      </Sphere>
      
      {/* Horns/Antennas */}
      <Box args={[0.1, 0.5, 0.1]} position={[-0.6, 0.8, 0]} rotation={[0, 0, -0.3]}>
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} emissive={color} emissiveIntensity={0.3} />
      </Box>
      <Box args={[0.1, 0.5, 0.1]} position={[0.6, 0.8, 0]} rotation={[0, 0, 0.3]}>
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} emissive={color} emissiveIntensity={0.3} />
      </Box>
      
      {/* Glow effect */}
      <Sphere args={[1.3, 32, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </Sphere>
    </group>
  )
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00f3ff]"></div>
    </div>
  )
}

// Rarity display component
function RarityBadge({ rarity }: { rarity: Rarity }) {
  const rarityNames = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
  const rarityClass = `rarity-${rarityNames[rarity].toLowerCase()}`
  
  return (
    <span className={`px-3 py-1 rounded text-xs font-bold tracking-wider ${rarityClass} border border-current`}>
      {rarityNames[rarity]}
    </span>
  )
}

// Booster Card Component
function BoosterCard({ booster, isActive, onActivate }: { booster: Booster; isActive: boolean; onActivate: () => void }) {
  return (
    <div className={`booster-card ${isActive ? 'booster-active' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{booster.icon}</span>
        <span className="text-[#00f3ff] font-bold">{booster.price} ETH</span>
      </div>
      <h4 className="font-bold mb-2 text-white">{booster.name}</h4>
      <div className="text-xs text-gray-400 space-y-1">
        {booster.winChanceBoost > 0 && (
          <p className="text-[#00ff88]">+{booster.winChanceBoost}% Win Chance</p>
        )}
        {booster.xpMultiplier > 1 && (
          <p className="text-[#ffd700]">{booster.xpMultiplier}x XP Multiplier</p>
        )}
        <p>Duration: {booster.duration}</p>
      </div>
      <button
        onClick={onActivate}
        disabled={isActive}
        className={`mt-4 w-full py-2 rounded font-bold text-sm transition-all ${
          isActive
            ? 'bg-[#00ff88] text-black cursor-default'
            : 'bg-gradient-to-r from-[#ff00ff] to-[#8b5cf6] hover:opacity-90 text-white'
        }`}
      >
        {isActive ? 'ACTIVE' : 'ACTIVATE'}
      </button>
    </div>
  )
}

function App() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'pets' | 'mint' | 'boosters' | 'game'>('pets')
  const [petName, setPetName] = useState('')
  const [pets, setPets] = useState<PetAttributes[]>([])
  const [selectedPet, setSelectedPet] = useState<PetAttributes | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [xpKey, setXpKey] = useState(0) // Force re-render for XP bar

  // Mock boosters
  const boosters: Booster[] = [
    { id: 1, name: 'NEURAL OVERDRIVE', price: '0.005', winChanceBoost: 15, xpMultiplier: 1, duration: '24h', icon: '⚡' },
    { id: 2, name: 'XP AMPLIFIER', price: '0.003', winChanceBoost: 0, xpMultiplier: 3, duration: '12h', icon: '🚀' },
    { id: 3, name: 'LUCK PROTOCOL', price: '0.008', winChanceBoost: 5, xpMultiplier: 2, duration: '6h', icon: '🍀' },
  ]

  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 3000)
  }

  // Mint pet with random attributes
  const mintPet = () => {
    if (!petName) return
    
    // Random rarity (50% Common, 30% Uncommon, 15% Rare, 4% Epic, 1% Legendary)
    const rand = Math.random() * 100
    let rarity: Rarity
    if (rand < 50) rarity = Rarity.COMMON
    else if (rand < 80) rarity = Rarity.UNCOMMON
    else if (rand < 95) rarity = Rarity.RARE
    else if (rand < 99) rarity = Rarity.EPIC
    else rarity = Rarity.LEGENDARY

    // Generate stats based on rarity
    const baseMin = rarity === Rarity.COMMON ? 10 : rarity === Rarity.UNCOMMON ? 25 : rarity === Rarity.RARE ? 40 : rarity === Rarity.EPIC ? 60 : 75
    const baseMax = rarity === Rarity.COMMON ? 40 : rarity === Rarity.UNCOMMON ? 55 : rarity === Rarity.RARE ? 70 : rarity === Rarity.EPIC ? 85 : 100

    const newPet: PetAttributes = {
      tokenId: pets.length + 1,
      name: petName,
      rarity,
      strength: Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin,
      agility: Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin,
      intelligence: Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin,
      luck: Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin,
      level: 1,
      maxLevel: 5,
      experience: 0,
      wins: 0,
      losses: 0,
      totalEarnings: 0,
      isBoosted: false,
      boostEndTime: 0
    }

    setPets([...pets, newPet])
    setSelectedPet(newPet)
    setPetName('')
    setActiveTab('pets')
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 1500)
    showNotification(`✨ ${newPet.name} minted! Rarity: ${Rarity[rarity]}!`)
  }

  // Upgrade max level
  const upgradeLevel = (pet: PetAttributes) => {
    if (pet.maxLevel >= 10) {
      showNotification('Already at maximum level cap!')
      return
    }
    
    const updatedPet = { ...pet, maxLevel: 10 }
    setPets(pets.map(p => p.tokenId === pet.tokenId ? updatedPet : p))
    setSelectedPet(updatedPet)
    showNotification(`🔥 Level cap upgraded to 10!`)
  }

  // Activate booster
  const activateBooster = (boosterId: number) => {
    if (!selectedPet) {
      showNotification('Select a pet first!')
      return
    }
    
    const updatedPet = { 
      ...selectedPet, 
      isBoosted: true, 
      boostEndTime: Date.now() + 86400000 // 24h
    }
    setPets(pets.map(p => p.tokenId === selectedPet.tokenId ? updatedPet : p))
    setSelectedPet(updatedPet)
    showNotification(`⚡ Booster activated for ${selectedPet.name}!`)
  }

  // Gain XP
  const gainXP = (pet: PetAttributes, amount: number) => {
    let newXP = pet.experience + amount
    let newLevel = pet.level
    
    // Level up logic
    while (newXP >= newLevel * 100 && newLevel < pet.maxLevel) {
      newXP -= newLevel * 100
      newLevel++
      showNotification(`🎉 Level Up! ${pet.name} is now Level ${newLevel}!`)
    }
    
    const updatedPet = { ...pet, experience: newXP, level: newLevel }
    setPets(pets.map(p => p.tokenId === pet.tokenId ? updatedPet : p))
    setSelectedPet(updatedPet)
    setXpKey(prev => prev + 1)
  }

  // Calculate win chance
  const calculateWinChance = (pet: PetAttributes, riskLevel: number) => {
    let baseChance = riskLevel === 1 ? 70 : riskLevel === 2 ? 50 : 30
    const avgStats = (pet.strength + pet.agility + pet.intelligence + pet.luck) / 4
    const statsBonus = (avgStats - 50) / 5
    const levelBonus = (pet.level - 1) * 2
    const boosterBonus = pet.isBoosted ? 15 : 0
    
    return Math.max(5, Math.min(95, baseChance + statsBonus + levelBonus + boosterBonus))
  }

  // Mint screen
  if (!isConnected) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center p-4">
        <div className="cyber-card p-8 text-center max-w-lg w-full">
          <h1 className="text-5xl font-bold mb-2 neon-text tracking-wider" data-text="RISKPET">
            RISKPET
          </h1>
          <p className="text-gray-400 mb-6 text-lg">Neon Dynasty Edition</p>
          <div className="h-48 mb-6 rounded-xl overflow-hidden border border-[#00f3ff]/30">
            <Canvas camera={{ position: [0, 0, 3] }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} color="#00f3ff" />
              <Suspense fallback={null}>
                <Pet3D rarity={Rarity.EPIC} isBoosted={false} isAnimating={true} />
                <OrbitControls enableZoom={false} autoRotate />
              </Suspense>
            </Canvas>
          </div>
          <ConnectButton />
        </div>
        
        {notification && (
          <div className="fixed top-4 right-4 cyber-card px-6 py-3 z-50 border-[#00ff88]">
            <span className="text-[#00ff88]">{notification}</span>
          </div>
        )}
      </div>
    )
  }

  // No pets - show mint screen
  if (pets.length === 0) {
    return (
      <div className="min-h-screen cyber-grid p-4">
        <div className="max-w-md mx-auto pt-10">
          <div className="cyber-card p-8 text-center corner-accent">
            <h2 className="text-3xl font-bold mb-2 neon-text-pink">MINT YOUR PET</h2>
            <p className="text-gray-400 mb-6">Each pet has unique stats and rarity</p>
            
            <div className="h-64 mb-6 rounded-xl overflow-hidden border border-[#ff00ff]/30">
              <Canvas camera={{ position: [0, 0, 3] }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#ff00ff" />
                <Suspense fallback={<Loader />}>
                  <Pet3D rarity={Rarity.LEGENDARY} isBoosted={false} isAnimating={true} />
                  <OrbitControls enableZoom={false} autoRotate />
                </Suspense>
              </Canvas>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Common</span><span className="text-gray-500">50%</span>
              </div>
              <div className="flex justify-between text-sm rarity-uncommon">
                <span>Uncommon</span><span>30%</span>
              </div>
              <div className="flex justify-between text-sm rarity-rare">
                <span>Rare</span><span>15%</span>
              </div>
              <div className="flex justify-between text-sm rarity-epic">
                <span>Epic</span><span>4%</span>
              </div>
              <div className="flex justify-between text-sm rarity-legendary">
                <span>Legendary</span><span>1%</span>
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Enter pet name..."
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              maxLength={20}
              className="w-full p-3 rounded-lg bg-black/50 border border-[#00f3ff]/30 text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-[#00f3ff] transition-colors"
            />
            
            <button
              onClick={mintPet}
              disabled={!petName}
              className="btn-cyber-pink w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MINT PET (0.01 ETH)
            </button>
          </div>
        </div>
        
        {notification && (
          <div className="fixed top-4 right-4 cyber-card px-6 py-3 z-50 border-[#00ff88]">
            <span className="text-[#00ff88]">{notification}</span>
          </div>
        )}
      </div>
    )
  }

  // Main app with pets
  return (
    <div className="min-h-screen cyber-grid p-4">
      {notification && (
        <div className="fixed top-4 right-4 cyber-card px-6 py-3 z-50 border-[#00ff88] animate-bounce">
          <span className="text-[#00ff88]">{notification}</span>
        </div>
      )}
      
      <header className="flex justify-between items-center mb-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold neon-text tracking-wider">RISKPET</h1>
          <p className="text-xs text-gray-500">Neon Dynasty</p>
        </div>
        <ConnectButton />
      </header>

      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { id: 'pets', label: 'MY PETS', icon: '🐉' },
            { id: 'mint', label: 'MINT NEW', icon: '✨' },
            { id: 'boosters', label: 'BOOSTERS', icon: '⚡' },
            { id: 'game', label: 'RISK GAME', icon: '🎮' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-[#00f3ff] text-black'
                  : 'bg-black/50 text-[#00f3ff] border border-[#00f3ff]/30 hover:border-[#00f3ff]'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* PETS TAB */}
        {activeTab === 'pets' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pet List */}
            <div className="cyber-card">
              <h3 className="text-lg font-bold mb-4 neon-text">YOUR PETS</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pets.map((pet) => (
                  <button
                    key={pet.tokenId}
                    onClick={() => setSelectedPet(pet)}
                    className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                      selectedPet?.tokenId === pet.tokenId
                        ? 'border-[#00f3ff] bg-[#00f3ff]/10'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center text-2xl">
                      {pet.rarity >= Rarity.EPIC ? '👑' : '🐉'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{pet.name}</span>
                        <RarityBadge rarity={pet.rarity} />
                      </div>
                      <div className="text-xs text-gray-400">
                        Lv.{pet.level}/{pet.maxLevel} • {pet.wins}W/{pet.losses}L
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Pet Details */}
            {selectedPet && (
              <div className="cyber-card">
                <div className="h-48 mb-4 rounded-xl overflow-hidden border border-[#00f3ff]/30">
                  <Canvas camera={{ position: [0, 0, 3] }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} color={
                      selectedPet.rarity === Rarity.LEGENDARY ? '#f59e0b' : 
                      selectedPet.rarity === Rarity.EPIC ? '#a855f7' : '#00f3ff'
                    } />
                    <Suspense fallback={<Loader />}>
                      <Pet3D 
                        rarity={selectedPet.rarity} 
                        isBoosted={selectedPet.isBoosted} 
                        isAnimating={isAnimating} 
                      />
                      <OrbitControls enableZoom={false} />
                    </Suspense>
                  </Canvas>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{selectedPet.name}</h3>
                  <RarityBadge rarity={selectedPet.rarity} />
                </div>

                {/* Level & XP */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#ffd700]">Level {selectedPet.level}/{selectedPet.maxLevel}</span>
                    <span className="text-gray-400">{selectedPet.experience}/{selectedPet.level * 100} XP</span>
                  </div>
                  <div className="xp-bar">
                    <div 
                      className="xp-fill" 
                      style={{ width: `${(selectedPet.experience / (selectedPet.level * 100)) * 100}%` }}
                      key={xpKey}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[ 
                    { label: 'STRENGTH', value: selectedPet.strength, color: '#ef4444' },
                    { label: 'AGILITY', value: selectedPet.agility, color: '#3b82f6' },
                    { label: 'INTELLIGENCE', value: selectedPet.intelligence, color: '#a855f7' },
                    { label: 'LUCK', value: selectedPet.luck, color: '#22c55e' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-black/30 p-2 rounded">
                      <div className="text-xs text-gray-400">{stat.label}</div>
                      <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Upgrade Button */}
                {selectedPet.maxLevel === 5 && (
                  <button
                    onClick={() => upgradeLevel(selectedPet)}
                    className="w-full mb-3 py-2 rounded font-bold text-sm bg-gradient-to-r from-[#ffd700] to-[#ffed4e] text-black hover:opacity-90 transition-opacity"
                  >
                    🔓 UNLOCK MAX LEVEL 10 (0.05 ETH)
                  </button>
                )}

                {/* XP Test Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => gainXP(selectedPet, 50)}
                    className="flex-1 py-2 rounded text-xs font-bold bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/50 hover:bg-[#00f3ff]/30"
                  >
                    +50 XP (TEST)
                  </button>
                  <button
                    onClick={() => gainXP(selectedPet, 200)}
                    className="flex-1 py-2 rounded text-xs font-bold bg-[#ff00ff]/20 text-[#ff00ff] border border-[#ff00ff]/50 hover:bg-[#ff00ff]/30"
                  >
                    +200 XP (TEST)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MINT TAB */}
        {activeTab === 'mint' && (
          <div className="max-w-md mx-auto">
            <div className="cyber-card p-8 text-center corner-accent">
              <h2 className="text-3xl font-bold mb-2 neon-text-pink">MINT NEW PET</h2>
              <p className="text-gray-400 mb-6">Each mint is unique!</p>
              
              <div className="h-48 mb-6 rounded-xl overflow-hidden border border-[#ff00ff]/30">
                <Canvas camera={{ position: [0, 0, 3] }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} color="#ff00ff" />
                  <Suspense fallback={<Loader />}>
                    <Pet3D rarity={Rarity.EPIC} isBoosted={false} isAnimating={true} />
                    <OrbitControls enableZoom={false} autoRotate />
                  </Suspense>
                </Canvas>
              </div>
              
              <input
                type="text"
                placeholder="Pet name..."
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="w-full p-3 rounded-lg bg-black/50 border border-[#00f3ff]/30 text-white mb-4 focus:border-[#00f3ff]"
              />
              
              <button
                onClick={mintPet}
                disabled={!petName}
                className="btn-cyber-pink w-full disabled:opacity-50"
              >
                MINT (0.01 ETH)
              </button>
            </div>
          </div>
        )}

        {/* BOOSTERS TAB */}
        {activeTab === 'boosters' && (
          <div>
            <h3 className="text-xl font-bold mb-4 neon-text">⚡ BOOSTERS</h3>
            <p className="text-gray-400 mb-6">
              Selected Pet: {selectedPet?.name || 'None'} 
              {selectedPet?.isBoosted && (
                <span className="text-[#00ff88] ml-2">⚡ ACTIVE</span>
              )}
            </p>
            
            <div className="grid md:grid-cols-3 gap-4">
              {boosters.map((booster) => (
                <BoosterCard
                  key={booster.id}
                  booster={booster}
                  isActive={selectedPet?.isBoosted || false}
                  onActivate={() => activateBooster(booster.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* GAME TAB */}
        {activeTab === 'game' && (
          <div className="cyber-card">
            <h3 className="text-xl font-bold mb-4 neon-text">🎮 RISK GAME</h3>
            
            {!selectedPet ? (
              <p className="text-gray-400">Select a pet first!</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4 p-4 bg-black/30 rounded-lg">
                    <p className="text-sm text-gray-400">Selected Pet</p>
                    <p className="text-lg font-bold">{selectedPet.name}</p>
                    <RarityBadge rarity={selectedPet.rarity} />
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { level: 1, name: 'SAFE', chance: 70, color: '#22c55e' },
                      { level: 2, name: 'BALANCED', chance: 50, color: '#f59e0b' },
                      { level: 3, name: 'AGGRESSIVE', chance: 30, color: '#ef4444' },
                    ].map((risk) => (
                      <div 
                        key={risk.level}
                        className="p-3 rounded-lg border border-gray-700 flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold" style={{ color: risk.color }}>{risk.name}</span>
                          <p className="text-xs text-gray-400">Base: {risk.chance}% win</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#00f3ff] font-bold">
                            {calculateWinChance(selectedPet, risk.level).toFixed(0)}%
                          </p>
                          <p className="text-xs text-gray-500">Your Chance</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col justify-center">
                  <button className="btn-cyber text-xl py-4 mb-4">
                    CREATE GAME ROOM
                  </button>
                  <p className="text-center text-sm text-gray-400">
                    Win chance includes: base + stats + level + boosters
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
