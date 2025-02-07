"use client"

import React from 'react'
import Login from '@/components/ui/auth/auth'
import MaxWidthWrapper from '@/components/MaxWidthWrapper'
import { motion } from 'framer-motion'
import { Spotlight } from '@/components/ui/spotlight-new'
import Image from 'next/image'

interface Feature {
  logo: string;
  title: string;
  description: string;
  variants?: any;
}

const containerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.3,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeInOut' } },
};

const features: Feature[] = [
  {
    logo: '1',
    title: 'Smart Trade Assistance',
    description: 'AI-driven agents analyze market trends and provide real-time trade recommendations.'
  },
  {
    logo: '2',
    title: 'Risk Management AI',
    description: 'Automated risk assessment helps you minimize losses and protect your assets.'
  },
  {
    logo: '3',
    title: 'Portfolio Optimization',
    description: 'Get AI-backed strategies to balance and grow your investment portfolio.'
  },
  {
    logo: '4',
    title: 'Real-Time Market Insights',
    description: 'Stay ahead with instant updates and AI-generated market predictions.'
  },
  {
    logo: '5',
    title: 'Automated Trade Execution',
    description: 'Let AI handle your trades with precision and efficiency.'
  },
  {
    logo: '6',
    title: 'Custom Strategy Builder',
    description: 'Personalize AI strategies to fit your unique trading style and goals.'
  },
  {
    logo: '7',
    title: 'Sentiment Analysis',
    description: 'AI scans news and social media to gauge market sentiment for informed decisions.'
  },
  {
    logo: '8',
    title: 'Multi-Asset Support',
    description: 'Trade across multiple assets, including crypto, stocks, and forex, all in one platform.'
  }
]

const FeatureCard: React.FC<Feature> = ({ variants, logo, title, description }) => (
  <motion.div variants={variants} className='relative w-64 p-6 my-4 bg-gray-200 shadow-xl rounded-3xl'>
    <div className='absolute flex items-center p-3 rounded-full shadow-xl bg-gradient-to-r from-[#27486c] to-[#061ba1ae] left-4 -top-8'>
      <Image src={`/assets/home/${logo}.svg`} height={50} width={50} quality={100} alt='img' className='p-1' />
    </div>
    <div className='mt-8 text-gray-800'>
      <p className='my-2 text-xl font-semibold'>{title}</p>
      <div className='flex space-x-2 font-medium text-basic'>
        <p>{description}</p>
      </div>
    </div>
  </motion.div>
);

export default function Page() {
  return (
    <div>
      <div className='flex justify-end items-center'>
        {/* Removed as it was not really required */}
        {/* <Login/> */}
      </div>

      <div className="h-[40rem] w-full rounded-md flex md:items-center md:justify-center antialiased bg-grid-white/[0.02] relative overflow-hidden">
        <Spotlight />
        <div className=" p-4 max-w-7xl  mx-auto relative z-10  w-full pt-20 md:pt-0">
          <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text dark:text-transparent dark:bg-gradient-to-b dark:from-neutral-50 dark:to-neutral-400 bg-opacity-50">
            AI-Powered Trading for <br /> Smarter Investments
          </h1>
          <p className="mt-4 font-normal text-base max-w-lg text-center mx-auto">
            Harness AI agents in a financial DApp to optimize your trades, analyze market trends, and maximize returns effortlessly.
          </p>
        </div>
      </div>

      <MaxWidthWrapper>
        <div className='my-12 text-center'>
          <motion.h1
            initial={{ opacity: 0.0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: 'easeInOut' }}
            className='text-4xl font-bold leading-10 sm:text-5xl sm:leading-none md:text-6xl'>Features</motion.h1>
        </div>

        <div className='flex items-center justify-center pb-8 w-full'>
          <motion.div initial='hidden' whileInView='visible' variants={containerVariants} className='grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} variants={cardVariants} />
            ))}
          </motion.div>
        </div>
      </MaxWidthWrapper>
    </div>
  )
}
