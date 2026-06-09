"use client";

import { logout } from "@/lib/auth-actions";
import { getToken } from "@/lib/api";
import type { ApiUser } from "@/types/api";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function Navbar({ session }: { session: ApiUser | null }) {
  const [isClient, setIsClient] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionState, setSessionState] = useState<ApiUser | null>(session);

  const checkSession = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setSessionState(null);
        return;
      }
      const user = (await res.json()) as ApiUser;
      setSessionState(user);
    } catch {
      setSessionState(null);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    checkSession();

    const interval = window.setInterval(checkSession, 60_000);
    window.addEventListener("focus", checkSession);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkSession);
    };
  }, [checkSession]);

  async function handleLogout() {
    await logout();
    setSessionState(null);
  }

  return (
    <nav className='bg-white shadow-md py-4 border-b border-gray-200'>
      <div className='container mx-auto px-6 lg:px-8'>
        <div className='flex items-center justify-between gap-4'>
          <Link href='/' className='flex items-center gap-3'>
            <Image src='/logo.png' alt='logo' width={50} height={50} />
            <span className='text-xl font-bold text-gray-800 md:text-2xl'>
              Travel Planner
            </span>
          </Link>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 md:hidden'
              aria-label='Toggle navigation'
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className='text-xl'>☰</span>
            </button>

            <div className='hidden md:flex items-center gap-4'>
              {isClient && sessionState ? (
                <>
                  <Link
                    href='/trips'
                    className='text-slate-900 hover:text-sky-500'
                  >
                    My Trips
                  </Link>
                  <Link
                    href='/globe'
                    className='text-slate-900 hover:text-sky-500'
                  >
                    Globe
                  </Link>
                  {sessionState.role === "ADMIN" && (
                    <Link
                      href='/admin'
                      className='text-slate-900 hover:text-sky-500'
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    className='inline-flex items-center justify-center text-white bg-gray-800 hover:bg-gray-900 px-4 py-2 rounded-lg cursor-pointer'
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </>
              ) : isClient ? (
                <Link
                  href='/login'
                  className='inline-flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg'
                >
                  Sign In
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {isClient && sessionState && menuOpen ? (
          <div className='mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:hidden'>
            <Link
              href='/trips'
              className='text-slate-900 hover:text-sky-500'
              onClick={() => setMenuOpen(false)}
            >
              My Trips
            </Link>
            <Link
              href='/globe'
              className='text-slate-900 hover:text-sky-500'
              onClick={() => setMenuOpen(false)}
            >
              Globe
            </Link>
            {sessionState.role === "ADMIN" && (
              <Link
                href='/admin'
                className='text-slate-900 hover:text-sky-500'
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            <button
              className='w-full rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-900'
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
            >
              Sign Out
            </button>
          </div>
        ) : isClient && !sessionState && menuOpen ? (
          <div className='mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:hidden'>
            <Link
              href='/login'
              className='block rounded-lg bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700'
            >
              Sign In
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
