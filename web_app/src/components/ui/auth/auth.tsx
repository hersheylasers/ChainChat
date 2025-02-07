
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export default function Login() {
  const { login, logout, user, ready, authenticated } = usePrivy();

  const router = useRouter(); // For pasing build
  
  if (!ready) return <p>Loading...</p>;
  console.log(user);

  // if (ready && !authenticated) {
  //   router.push('/login');
  // }

  return (
    <div>
      {user ? (
        <>
        <div className='flex justify-end items-center gap-2 '>
          <p>{user.google!.name  ? user.google!.name : user.wallet?.address}!</p>
          <button onClick={logout} className='bg-blue-500 rounded-lg p-2 gap-4'>Logout</button>
          </div>
        </>
      ) : (
        <button onClick={login} className='bg-blue-500 rounded-lg p-2'>Login with Privy</button>
      )}
    </div>
  );
}
