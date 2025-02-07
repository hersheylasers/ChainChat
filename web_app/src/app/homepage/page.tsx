"use client";

import Link from "next/link";

export default function Homepage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">Welcome to My Website</h1>
      <Link href="/portfolio">
        <button className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg">
          Go to Portfolio
        </button>
      </Link>
    </div>
  );
}