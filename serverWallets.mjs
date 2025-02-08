import { PrivyClient } from '@privy-io/server-auth';
import dotenv from 'dotenv';

dotenv.config();

const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET,
    {
        walletApi: {
            authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY // Add your authorization key here
        }

    }
);


 const {id, address, chainType} = await privy.walletApi.create({chainType: 'ethereum'});
// const id = 'huuwyoknfb1tdxgrx118c0uk'
// @ts-ignore
// const {data} = await privy.walletApi.rpc({
//     walletId: id,
//     method: 'personal_sign',
//     caip: 'eip155:11155111',
//     params: {
//       message: 'Hello server wallets!'
//     }
//   })
//   const {signature} = data;

//   console.log(signature);
//  console.log(id, address, chainType);

        const {data} = await privy.walletApi.rpc({

    walletId: id,
    method: 'eth_sendTransaction',
    caip2: 'eip155:11155111',
    params: {
      transaction: {

        from : '0x55Cd3c2E8Cf613Eea6Df6D24d6388D6F96b34Ae4',
        to: '0xfEfE12bf26A2802ABEe59393B19b0704Fb274844',
        value: 200000000000,
        chainId: 11155111,
      },
    },
  });

  const {hash} = data;
  console.log(hash);