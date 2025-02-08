
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
          <button onClick={logout} className='lg:inline-flex lg:w-auto w-full px-3 py-2 rounded items-center justify-center dark:hover:bg-navHover hover:bg-primary cursor-pointer hover:text-white'>Logout</button>
          </div>
        </>
      ) : (
        <button onClick={login} className='lg:inline-flex lg:w-auto w-full px-3 py-2 rounded items-center justify-center dark:hover:bg-navHover hover:bg-primary cursor-pointer hover:text-white'>Login with Privy</button>
      )}
    </div>
  );
}
