"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FloatingBooking from "@/components/FloatingBooking";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBookingAction = async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const email = session.user.email;

      if (!email?.endsWith("@up.edu.ph")) {
        await supabase.auth.signOut();
        setErrorMessage("Access restricted. Please use your UP email (@up.edu.ph).");
        setLoading(false);
        return;
      }

      router.push("/book");
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/book`,
          queryParams: {
            hd: "up.edu.ph",
          },
        },
      });

      if (error) {
        setErrorMessage("Unable to sign in. Please try again.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden selection:bg-[#FCC200] selection:text-[#700000]">
      
      {/* --- SPIRITUAL GRADIENTS --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#013220]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#800000]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* --- HERO SECTION --- */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        
        <div className="text-center space-y-10 max-w-2xl w-full">
          
          {/* 1. Wordmark */}
          <div className="relative animate-in fade-in zoom-in duration-1000">
            <img 
              src="/website-hero.png" 
              alt="Aninag 2026 Wordmark" 
              className="w-full h-auto object-contain hover:scale-[1.02] transition-transform duration-700 ease-out drop-shadow-sm"
            />
          </div>

          {/* 2. Label */}
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            <h2 className="text-[#700000] font-bold tracking-[0.3em] uppercase text-[10px] md:text-xs">
              Schedule Your Graduation Photoshoot
            </h2>
            <div className="w-8 h-0.5 bg-[#FCC200] mx-auto rounded-full" />
          </div>

          {errorMessage && (
            <div className="max-w-md mx-auto p-4 bg-[#800000]/5 border border-[#800000]/20 rounded-2xl text-[#800000] text-sm font-medium animate-in fade-in duration-300">
              {errorMessage}
            </div>
          )}

          {/* 3. Actions */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pt-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <button
              onClick={handleBookingAction}
              disabled={loading}
              className="px-12 py-4 bg-[#013220] text-white rounded-full font-bold text-sm tracking-wide shadow-xl hover:shadow-[#013220]/20 hover:bg-[#0a442e] transition-all active:scale-95 disabled:opacity-70 min-w-[220px] flex items-center justify-center gap-3"
            >
               {loading ? (
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : (
                 "Book Your Session"
               )}
            </button>

            <Link
              href="/packages"
              className="px-12 py-4 border border-gray-100 text-gray-400 rounded-full font-bold text-sm tracking-wide hover:border-[#700000] hover:text-[#700000] hover:bg-[#700000]/5 transition-all min-w-[220px]"
            >
              View Packages
            </Link>
          </div>
        </div>
        
        {/* Floating Widget placed here */}
        <FloatingBooking />
      </main>


    </div>
  );
}