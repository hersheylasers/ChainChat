import { ethers } from "ethers";

const portfolioAddress = process.env.PORTFOLIO_ADDRESS;

const ABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Deposited",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Withdrawn",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "balances",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "deposit",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
async function main(){
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const contract = new ethers.Contract(portfolioAddress!, ABI, wallet);

const balance = await contract.balances(wallet.address);
console.log(`Balance of address ${wallet.address} is :`, balance);

const depositAmount = ethers.parseEther("0.001");
const depositTx = await contract.deposit({value: depositAmount});
await depositTx.wait();

const updatedBalance = await contract.balances(wallet.address);
console.log("Updated Balance:", updatedBalance);
}
async function Contractprovider(){
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(portfolioAddress!, ABI, wallet);
    return {contract, wallet};
}
async function withdraw(){
    const {contract, wallet} = await Contractprovider();
    const withdrawTx = await contract.withdraw(ethers.parseEther("0.0001"))
    await withdrawTx.wait();
    const updatedBalance = await contract.balances(wallet.address);
    console.log("Updated Balance:", updatedBalance);

}
withdraw().catch(console.error);


