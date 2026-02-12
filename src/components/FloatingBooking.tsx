"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function FloatingBooking() {
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkBooking = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch("/api/my-booking", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        
        if (mounted && data.booking && data.booking.status === "Confirmed") {
          setBooking(data.booking);
          setIsVisible(true);
        }
      } catch (err) {
        console.error("Failed to load floating status", err);
      }
    };

    checkBooking();

    return () => { mounted = false; };
  }, []);

  if (!isVisible || !booking) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[90%] sm:max-w-md animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div 
        onClick={() => router.push("/book")}
        className="bg-[#013220] text-white py-3 px-5 rounded-3xl shadow-2xl shadow-[#013220]/40 flex items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/10 backdrop-blur-md group"
      >
        <div className="flex items-center gap-4">
          {/* --- ICON CIRCLE --- */}
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition-colors shrink-0">
            {booking.type === 'studio' ? '📸' : '🎓'}
          </div>
          
          <div className="flex flex-col">
            {/* --- LABEL ROW --- */}
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 font-bold">
                Upcoming Session
              </p>
              
              {/* --- TYPE BADGE --- */}
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                booking.type === 'studio' 
                  ? 'bg-white/10 border-white/20 text-white' 
                  : 'bg-[#FCC200]/10 border-[#FCC200]/20 text-[#FCC200]'
              }`}>
                {booking.type === 'studio' ? 'Studio' : 'Campus'}
              </span>
            </div>

            {/* --- DATE TIME ROW --- */}
            <p className="font-serif font-bold text-xl leading-none tracking-wide text-white">
              {new Date(booking.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} <span className="text-white/40 font-sans text-lg font-light">@</span> {booking.time}
            </p>
          </div>
        </div>
        
        {/* --- ARROW CIRCLE --- */}
        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#013220] transition-all shrink-0 ml-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}