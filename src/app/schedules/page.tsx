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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setBackPath(session ? "/book" : "/");
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD] selection:bg-[#FCC200] selection:text-[#700000] relative">
      
      {/* --- REUSABLE FIXED RETURN BUTTON --- */}
      <Link 
        href={backPath} 
        className="fixed top-8 left-8 z-50 flex items-center gap-3 text-gray-400 hover:text-[#700000] transition-all group bg-white/80 backdrop-blur-md p-2 rounded-full md:bg-transparent md:p-0"
      >
        <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-[#700000] bg-white shadow-sm transition-colors">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
           </svg>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
          {backPath === "/book" ? "Booking" : "Home"}
        </span>
      </Link>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto pt-32 pb-24 px-6">
        
        {/* Editorial Header */}
        <div className="text-center mb-20 space-y-4">
          <span className="text-[#FCC200] font-bold text-[11px] uppercase tracking-[0.4em] block">
            Aninag 2026
          </span>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-[#700000] italic leading-tight">
            Available Schedules
          </h1>
          <div className="w-24 h-[1px] bg-gray-200 mx-auto mt-6" />
          <p className="text-gray-500 mt-6 max-w-xl mx-auto text-sm leading-relaxed">
            Check real-time availability for March 2026. Please log in with your <span className="text-[#700000] font-bold">UP mail</span> to secure a slot.
          </p>
        </div>

        {/* Calendar Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-8">
            <BookingCalendar viewOnly={true} />
        </div>

      </main>
    </div>
  );
}   