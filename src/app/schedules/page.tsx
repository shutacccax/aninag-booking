"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import BookingCalendar from "@/components/BookingCalendar";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SchedulesPage() {
  const router = useRouter();
  const [backPath, setBackPath] = useState("/");

  useEffect(() => {
    // Matches the logic in your Packages page
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setBackPath("/book");
      } else {
        setBackPath("/");
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD] py-20 px-4 relative selection:bg-[#FCC200] selection:text-[#700000]">
      
      {/* --- REUSABLE RETURN BUTTON --- */}
      <Link 
        href={backPath} 
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-gray-400 hover:text-[#700000] transition-colors group"
      >
        <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-[#700000] bg-white shadow-sm">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
           </svg>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
          {backPath === "/book" ? "Back to Booking" : "Return Home"}
        </span>
      </Link>

      <div className="max-w-7xl mx-auto mt-8 md:mt-0">
        <div className="text-center mb-16">
          <span className="text-[#800000] font-bold text-xs uppercase tracking-[0.3em] mb-4 block">
            Aninag 2026
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#013220]">
            Available Schedules
          </h1>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Check real-time availability for March 2026. Please log in with your UP mail to secure a slot.
          </p>
        </div>

        <BookingCalendar viewOnly={true} />

        {/* --- DYNAMIC CALL TO ACTION --- */}
        {backPath === "/" && (
        <div className="mt-24 relative overflow-hidden group">
            {/* --- THE CONTAINER --- */}
            <div className="relative w-full p-16 md:p-24 bg-[#013220] rounded-[3rem] text-center shadow-2xl border border-white/5 overflow-hidden">
            
            {/* --- AMBIENT GRADIENT & TEXTURE --- */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#FCC200]/10 via-transparent to-transparent opacity-50 pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

            <div className="relative z-10 flex flex-col items-center">
                {/* --- MINIMALIST ICON --- */}
                <div className="mb-10 p-5 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <svg className="w-10 h-10 text-[#FCC200]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                </div>

                <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-12 tracking-tight">
                Login to secure your graduation slot
                </h2>

                {/* --- GOOGLE LOGIN BUTTON --- */}
                <button 
                onClick={() => router.push("/")}
                className="w-full max-w-md flex items-center justify-center gap-4 px-10 py-5 bg-white text-[#013220] rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-gray-50 active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
                >
                {/* Official Google Brand Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Log in with UP Mail
                </button>
            </div>

            {/* --- SUBTLE BRANDING WATERMARK --- */}
            <div className="absolute -bottom-10 -right-10 opacity-[0.03] text-[15rem] select-none pointer-events-none font-serif rotate-12">
                🎓
            </div>
            </div>
        </div>
        )}
      </div>
    </div>
  );
}