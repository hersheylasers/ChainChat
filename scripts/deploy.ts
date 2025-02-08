const hre = require("hardhat");

async function main() {
    const SWAP_ROUTER_ADDRESS = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4";
    
    const Portfolio = await hre.ethers.getContractFactory("Portfolio");
    
    const portfolio = await Portfolio.deploy(SWAP_ROUTER_ADDRESS);
    
    await portfolio.waitForDeployment();
    
    const portfolioAddress = await portfolio.getAddress();
    
    console.log("Portfolio deployed to:", portfolioAddress);
    console.log("SwapRouter address:", SWAP_ROUTER_ADDRESS);
    
    console.log("Waiting for block confirmations...");
    await portfolio.deploymentTransaction().wait(5);
    
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: portfolioAddress,
                constructorArguments: [SWAP_ROUTER_ADDRESS],
            });
            console.log("Contract verified successfully");
        } catch (error) {
            console.log("Error verifying contract:", error);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });