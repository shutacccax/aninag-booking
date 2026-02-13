"use client";

import { useEffect, useState, useRef } from "react"; // 1. Import useRef
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import BookingCalendar from "@/components/BookingCalendar";
import Header from "@/components/Header";

export default function BookPage() {
  const router = useRouter();
  
  // State
  const [booking, setBooking] = useState<any>(null);
  const [initialTime, setInitialTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [isReschedulingMode, setIsReschedulingMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 2. NEW: Create a Ref to track rescheduling status reliably
  // This value persists even if Supabase triggers a re-render
  const isReschedulingRef = useRef(false);

  const fetchBooking = async (session: any) => {
    // 3. BLOCKER: If we are in rescheduling mode, STOP immediately.
    // This prevents the "Tab Switch" from overwriting your empty state with the old booking.
    if (isReschedulingRef.current) return; 

    try {
      const res = await fetch("/api/my-booking", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      
      setBooking(data.booking || null);
      setInitialTime(data.booking?.initial_booking_at || data.initial_booking_at || null);
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        setCheckingAuth(false);
        await fetchBooking(session);
      } else if (!session && !checkingAuth) {
        router.replace("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && mounted) {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: final } }) => {
            if (!final && mounted) router.replace("/");
          });
        }, 500);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, checkingAuth]);

  const getRescheduleStatus = () => {
    const startTime = initialTime;
    if (!startTime) return { allowed: true, hoursLeft: 24 };

    const originalCreatedDate = new Date(startTime).getTime();
    const now = new Date().getTime();
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    
    const timeLeft = twentyFourHoursInMs - (now - originalCreatedDate);
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
    
    return {
      allowed: timeLeft > 0,
      hoursLeft: hoursLeft
    };
  };

  const status = getRescheduleStatus();

  // 4. ACTION: Start Rescheduling
  const handleReschedule = () => {
    setShowConfirm(false);
    
    // Update BOTH State (for UI) and Ref (for Logic blocker)
    setIsReschedulingMode(true);
    isReschedulingRef.current = true; 
    
    setBooking(null);
  };

  // 5. ACTION: Booking Completed
  // We call this when the Calendar component successfully creates the new slot
  const handleBookingSuccess = () => {
    setIsReschedulingMode(false);
    isReschedulingRef.current = false; // <--- Unblock the fetcher

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchBooking(session);
    });
  };

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-2 border-[#800000] border-t-transparent rounded-full" />
          <p className="text-[#013220] text-xs font-bold tracking-widest uppercase animate-pulse">
            {checkingAuth ? "Verifying Access..." : "Loading Schedule..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <Header />

      {/* --- CONFIRMATION MODAL --- */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6 border border-gray-100">
            <div className="text-4xl">🗓️</div>
            <div>
              <h3 className="text-xl font-serif font-bold text-[#013220]">Reschedule Session?</h3>
              <p className="text-gray-500 text-sm mt-2">
                Your current slot will be held until you confirm a new one.
                <br/>
                <span className="text-xs text-gray-400 italic">
                  (You have <strong>{status.hoursLeft} hours</strong> remaining in your window)
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleReschedule}
                className="w-full py-3 bg-[#800000] text-white rounded-xl font-bold hover:bg-[#600000] transition-colors uppercase text-xs tracking-widest"
              >
                Find New Slot
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase text-xs tracking-widest"
              >
                Keep Current Slot
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 space-y-20">

        {/* ===================== */}
        {/* ===== TICKET ========= */}
        {/* ===================== */}

        {booking && (
          <div className="max-w-xl mx-auto animate-in fade-in zoom-in duration-500">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border border-gray-100">

              {/* Decorative Cut Marks */}
              <div className="absolute top-1/2 left-0 w-6 h-6 bg-[#FDFDFD] rounded-full -translate-x-1/2 -translate-y-1/2 border border-gray-100" />
              <div className="absolute top-1/2 right-0 w-6 h-6 bg-[#FDFDFD] rounded-full translate-x-1/2 -translate-y-1/2 border border-gray-100" />
              <div className="absolute top-1/2 left-4 right-4 h-px border-t-2 border-dashed border-gray-200" />

              {/* Top */}
              <div className="bg-[#013220] p-10 text-center text-white relative z-10 pb-16">
                <div className="inline-flex p-3 bg-white/10 rounded-full mb-4">
                  <span className="text-3xl">🎓</span>
                </div>
                <h2 className="text-3xl font-serif font-bold tracking-wide">
                  You're Scheduled
                </h2>
                <p className="text-white/60 text-sm mt-2 uppercase tracking-widest">
                  Aninag 2026 Yearbook
                </p>
              </div>

              {/* Bottom */}
              <div className="p-10 pt-16 bg-white relative z-10">
                <div className="grid grid-cols-2 gap-y-8 gap-x-4 text-center">

                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Date</p>
                    <p className="text-xl font-serif font-bold text-[#013220]">
                      {new Date(booking.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Time</p>
                    <p className="text-xl font-serif font-bold text-[#013220]">
                      {booking.time}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status</p>
                    <span className="inline-block mt-2 px-4 py-1 bg-[#800000]/10 text-[#800000] rounded-full text-xs font-bold uppercase">
                      {booking.status}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Package</p>
                    <p className="text-sm font-semibold text-gray-800 leading-snug mt-1">
                      {booking.package || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-gray-100 text-center space-y-4">

                  <button
                    onClick={() => router.push("/")}
                    className="w-full py-4 bg-[#013220] text-white rounded-xl font-bold hover:bg-[#02422b] transition-all text-sm uppercase tracking-widest shadow-lg shadow-[#013220]/20"
                  >
                    Finish & Back to Home
                  </button>

                  {status.allowed && (
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="w-full py-3 border-2 border-gray-100 text-gray-400 rounded-xl font-bold hover:border-[#800000] hover:text-[#800000] transition-all text-xs uppercase tracking-widest"
                    >
                      Reschedule Appointment
                    </button>
                  )}

                  {/* 🔥 NEW BUTTON — ALWAYS VISIBLE */}
                  <button
                    onClick={() => {
                      document.getElementById("calendar-section")?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                    className="w-full py-3 border border-gray-200 text-[#013220] rounded-xl font-bold hover:bg-[#013220]/5 transition-all text-xs uppercase tracking-widest"
                  >
                    View Available Schedules
                  </button>

                  {!status.allowed && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                        Rescheduling Locked
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">
                        24-hour modification window has ended.
                      </p>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>
        )}

        {/* ===================== */}
        {/* ===== CALENDAR ====== */}
        {/* ===================== */}

        <div
          id="calendar-section"
          className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >

          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#013220]">
              {booking
                ? (isReschedulingMode ? "Reschedule Your Slot" : "Available Schedules")
                : "Select Your Schedule"}
            </h1>

            <p className="text-gray-500 max-w-xl mx-auto text-base md:text-lg">
              {booking
                ? status.allowed
                  ? "You may reschedule within 24 hours. Otherwise, slots are view-only."
                  : "Viewing mode only. Rescheduling period has ended."
                : "Choose a date from the calendar, then pick an available time slot."}
            </p>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
            <BookingCalendar
              isRescheduling={isReschedulingMode}
              viewOnly={booking && !isReschedulingMode}
              onBooked={handleBookingSuccess}
            />
          </div>

        </div>
      </div>

    </div>
  );
}