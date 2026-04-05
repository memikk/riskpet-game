const hre = require("hardhat");

async function main() {
  console.log("Deploying RiskPetGame contract to Base Sepolia...");
  
  const RiskPetGame = await hre.ethers.getContractFactory("RiskPetGame");
  const riskPetGame = await RiskPetGame.deploy();
  
  await riskPetGame.waitForDeployment();
  
  const address = await riskPetGame.getAddress();
  console.log(`RiskPetGame deployed to: ${address}`);
  console.log(`View on BaseScan: https://sepolia.basescan.org/address/${address}`);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await riskPetGame.deploymentTransaction().wait(5);
  
  // Verify contract
  if (process.env.BASESCAN_API_KEY) {
    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("Contract verified!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
