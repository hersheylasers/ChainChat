const hre = require("hardhat");

async function main(){
    const PortfolioManager = await hre.ethers.getContractFactory("PortfolioManager");
    const portfolio = await PortfolioManager.deploy();

    await portfolio.waitForDeployment();
    console.log("PortfolioManager deployed to:", await portfolio.getAddress());
}
main().catch((error)=>{
    console.error(error);
    process.exitCode = 1;
})