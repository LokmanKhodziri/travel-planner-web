"use client";

import { logout } from "@/lib/auth-actions";
import type { ApiUser } from "@/types/api";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar({ session }: { session: ApiUser | null }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <nav className="bg-white shadow-md py-4 border-b border-gray-200">
      <div className="container mx-auto flex justify-between items-center px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="logo" width={50} height={50} />
          <span className="text-2xl font-bold text-gray-800">Travel Planner</span>
        </Link>
        <div className="flex items-center space-x-4">
          {isClient && session ? (
            <>
              <Link href="/trips" className="text-slate-900 hover:text-sky-500">
                My Trips
              </Link>
              <Link href="/globe" className="text-slate-900 hover:text-sky-500">
                Globe
              </Link>
              <button
                className="flex items-center justify-center text-white bg-gray-800 hover:bg-gray-900 p-2 rounded-sm cursor-pointer"
                onClick={() => logout()}
              >
                Sign Out
              </button>
            </>
          ) : isClient ? (
            <Link
              href="/login"
              className="flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-sm cursor-pointer"
            >
              Sign In
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
