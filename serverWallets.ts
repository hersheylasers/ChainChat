import 'dotenv/config';
import { PrivyClient } from '@privy-io/server-auth';


// console.log('APP_ID:', process.env.PRIVY_APP_ID);
// console.log('APP_SECRET length:', process.env.PRIVY_APP_SECRET?.length);

const privy = new PrivyClient(
    process.env.PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!,
    {
        walletApi: {
            authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY!
        }
    }
);

// console.log(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

// async function createWallet() {
//     const {id, address, chainType} = await privy.walletApi.create({chainType: 'ethereum'});
//     return {id, address, chainType};
// }

// async function makeRpcCall() {
//     // @ts-ignore
//     const {data} = await privy.walletApi.rpc({
//         walletId : 'huuwyoknfb1tdxgrx118c0uk',
//         method:'personal_sign',
//         params:{
//             message:'Hello server Wallets',
//         }
//     });
//     return data;
// }

async function makeTransactions(){

    const wallet = await privy.walletApi.getWallet({ id: 'huuwyoknfb1tdxgrx118c0uk' });
    console.log('Wallet:', wallet);

    // @ts-ignore
    const {data} = await privy.walletApi.rpc({
        walletId: 'huuwyoknfb1tdxgrx118c0uk',
        chainId: 11155111,  // Sepolia chainId
        method: 'eth_sendTransaction',
        params: [{
            from: wallet.address,
            to: '0xfEfE12bf26A2802ABEe59393B19b0704Fb274844',
            value: '0x1c6bf52634000',
            gas: '0x5208',
            gasPrice: '0x59682F00'
        }]
    });
    return data;
}


// async function createNewWallet() {
//     try {
//         const wallet = await privy.walletApi.create({
//             chainType: 'ethereum'
//         });
//         console.log('Created new wallet:', wallet);
//         return wallet;
//     } catch (error) {
//         console.error('Error creating wallet:', error);
//         throw error;
//     }
// }

// createNewWallet()
//     .then(console.log)
//     .catch(console.error);

// async function verifyWallet() {
//     const wallet = await privy.walletApi.getWallet({ id: 'huuwyoknfb1tdxgrx118c0uk' });
//     console.log('Wallet:', wallet);
// }

makeTransactions().then(console.log).catch(console.error);