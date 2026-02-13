"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- HELPERS ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

type DayAvailability = { date: string; remaining: number; };
type TimeSlot = { time: string; remaining: number; };


export default function BookingCalendar({
  onBooked,
  isRescheduling,
  viewOnly
}: {
  onBooked?: () => void,
  isRescheduling?: boolean,
  viewOnly?: boolean
})
{
  const [type, setType] = useState<"studio" | "location">("studio");
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [showAddonGuide, setShowAddonGuide] = useState(false);

  // Lock to March 2026
  const [currentDate] = useState(new Date(2026, 2, 1));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: 'long', month: "long", day: "numeric",
    });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  useEffect(() => {
    setSelectedDate(null); setSelectedTime(null); setSlots([]);
    fetch(`/api/availability?type=${type}`).then((res) => res.json()).then(setAvailability);
  }, [type]);

  useEffect(() => {
    if (!selectedDate) return;
    fetch(`/api/slots?type=${type}&date=${selectedDate}`).then((res) => res.json()).then(setSlots);
  }, [selectedDate, type]);

  // --- CALENDAR GRID SETUP ---
  const year = 2026;
  const month = 2; // March
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const avail = availability.find(a => a.date === dateStr);
    return { day, dateStr, isValid: !!avail, remaining: avail ? avail.remaining : 0 };
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* LEFT: Calendar */}
      <div className="w-full lg:w-2/3 space-y-6">
        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
          <button onClick={() => { setType("studio"); setSelectedDate(null); }} className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${type === "studio" ? "bg-[#013220] text-white shadow-md" : "text-gray-500 hover:text-[#013220]"}`}>Studio Session</button>
          <button onClick={() => { setType("location"); setSelectedDate(null); }} className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${type === "location" ? "bg-[#013220] text-white shadow-md" : "text-gray-500 hover:text-[#013220]"}`}>Campus Shoot</button>
        </div>

        <div className="flex items-center justify-between px-2">
          <h3 className="text-2xl font-serif font-bold text-[#013220]">March 2026</h3>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] uppercase font-bold text-gray-400 tracking-wider py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map((dayObj) => {
              const isFull = dayObj.isValid && dayObj.remaining <= 0;
              const isSelected = selectedDate === dayObj.dateStr;
              const isDisabled = !dayObj.isValid;
              return (
                <button
                  key={dayObj.dateStr}
                  disabled={isDisabled || isFull}
                  onClick={() => setSelectedDate(dayObj.dateStr)}
                  className={`relative h-14 sm:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? "border-[#013220] bg-[#013220]/5 ring-1 ring-[#013220] z-10" : "border-transparent"} ${!isDisabled && !isSelected && !isFull ? "hover:bg-gray-50 hover:border-gray-200 cursor-pointer" : ""} ${isDisabled ? "opacity-20 cursor-default" : ""} ${isFull ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}`}
                >
                  <span className={`text-sm sm:text-lg font-medium ${isSelected ? "text-[#013220] font-bold" : "text-gray-700"}`}>{dayObj.day}</span>
                  {!isDisabled && !isFull && <div className="mt-1 flex flex-col items-center gap-0.5"><span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-[#013220]" : "bg-[#800000]"}`} /></div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Time Slots */}
      <div className="w-full lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-8 pt-8 lg:pt-0">
        <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">Available Times</h3>
        
        {!selectedDate ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
            <span className="text-2xl mb-2">📅</span>
            <p className="text-sm">Select a date to see times</p>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <p className="text-sm font-medium text-[#800000] mb-4 uppercase tracking-widest">
              {formatDate(selectedDate)}
            </p>
            
            {/* REMOVED: max-h-[400px] and overflow-y-auto */}
            <div className="grid grid-cols-1 gap-3">
              {slots.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No slots available</div>
              ) : (
                slots.map((slot) => {
                  const isFull = slot.remaining <= 0;
                  return (
                    <button
                      key={slot.time}
                      // Only truly disable the button if the slot is FULL. 
                      // Keep it enabled for viewOnly so the UI stays vibrant.
                      disabled={isFull}
                      onClick={() => {
                        if (viewOnly || isFull) return;
                        setSelectedTime(slot.time);
                        setShowModal(true);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${
                        isFull
                          ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed" // Keep FULL looking disabled
                          : viewOnly
                          ? "bg-white border-gray-200 cursor-default" // ViewOnly looks fresh but doesn't change on hover
                          : "bg-white border-gray-200 hover:border-[#013220] hover:shadow-md cursor-pointer"
                      }`}
                    >
                      <span className={`font-bold text-sm ${isFull ? "text-gray-400" : "text-gray-900"}`}>
                        {slot.time}
                      </span>

                      <div className="flex items-center gap-2">
                        
                        
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          isFull
                            ? "bg-gray-200 text-gray-500"
                            : viewOnly
                            ? "bg-[#013220]/5 text-[#013220]" // Keeps the text color vibrant and readable
                            : "bg-[#013220]/10 text-[#013220] group-hover:bg-[#013220] group-hover:text-white transition-colors"
                        }`}>
                          {isFull ? "FULL" : `${slot.remaining} SLOTS`}
                        </span>
                      </div>
                    </button>

                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- BOOKING MODAL --- */}
      {showModal && selectedDate && selectedTime && (
        <div className="fixed inset-0 bg-[#013220]/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <div className="bg-[#800000] h-1.5 w-1/4 mx-auto mt-3 rounded-full sm:hidden" />
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>

            <div className="p-8 sm:p-10">
              <div className="mb-8">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 leading-tight">
                    Finalize Booking
                  </h2>
                  {/* --- DYNAMIC HEADER BADGE --- */}
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                    type === 'studio' 
                      ? 'bg-[#013220]/10 text-[#013220]' 
                      : 'bg-[#800000]/10 text-[#800000]'
                  }`}>
                    {type === 'studio' ? 'Studio Session' : 'Campus Shoot'} 
                  </span>
                </div>
                <p className="text-gray-500 font-medium text-sm">
                  {formatDate(selectedDate)} @ <span className="text-[#013220] font-bold">{selectedTime}</span>
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);

                  const formData = new FormData(e.currentTarget);
                  const mobile = formData.get("mobile") as string;

                  // Final validation check before submit
                  if (mobile.length !== 11 || !mobile.startsWith("09")) {
                    alert("Please enter a valid 11-digit mobile number starting with 09.");
                    setLoading(false);
                    return;
                  }

                  const payload = {
                    type,
                    date: selectedDate,
                    time: selectedTime,
                    name: formData.get("name"),
                    email: userEmail, // Ensure this variable is available in scope
                    mobile: mobile,
                    package: formData.get("package"),
                    addons: formData.get("addons") || "",
                    makeup: formData.get("makeup"),
                    remarks: formData.get("remarks") || "",
                    action: isRescheduling ? 'reschedule' : 'book',
                  };

                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    alert("Please login first.");
                    setLoading(false);
                    return;
                  }

                  const res = await fetch("/api/book", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify(payload),
                  });

                  const data = await res.json();

                  if (data.success) {
                    setShowModal(false);
                    if (onBooked) onBooked();
                  } else {
                    alert(data.message || "Booking failed");
                  }

                  setLoading(false);
                }}
                className="space-y-6"
              >
                {/* --- PERSONAL INFO --- */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                      Full Name
                    </label>
                    <input
                      name="name"
                      required
                      placeholder="DELA CRUZ, JUAN B."
                      // --- AUTO CAPITALIZE ---
                      onInput={(e) => {
                        e.currentTarget.value = e.currentTarget.value.toUpperCase();
                      }}
                      className="w-full mt-1 bg-gray-50 border-gray-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-[#013220] outline-none transition-all placeholder:normal-case"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                      Mobile Number
                    </label>
                    <input
                      name="mobile"
                      required
                      type="tel"
                      maxLength={11}
                      placeholder="09XXXXXXXXX"
                      // --- PHONE VALIDATION ---
                      onInput={(e) => {
                        // Remove non-numeric characters
                        e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                      }}
                      className="w-full mt-1 bg-gray-50 border-gray-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-[#013220] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* --- PACKAGE --- */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                    Selected Package
                  </label>
                  <select
                    name="package"
                    required
                    className="w-full mt-1 bg-gray-50 border-gray-200 rounded-xl p-4 text-base appearance-none focus:ring-2 focus:ring-[#013220] outline-none transition-all"
                  >
                    <option value="">Select Package</option>
                    <option value="Econo Package A">Econo Package A</option>
                    <option value="Basic Frame Package B">Basic Frame Package B</option>
                    <option value="Medium Matted Frame Package C">Medium Matted Frame Package C</option>
                    <option value="Medium Glass to Glass Frame Package D">Medium Glass to Glass Frame Package D</option>
                    <option value="Large Matted Frame Package E">Large Matted Frame Package E</option>
                    <option value="Large Glass to Glass Package F">Large Glass to Glass Package F</option>
                  </select>
                </div>

                {/* --- MAKEUP --- */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                    Makeup Option
                  </label>
                  <select
                    name="makeup"
                    required
                    className="w-full mt-1 bg-gray-50 border-gray-200 rounded-xl p-4 text-base appearance-none focus:ring-2 focus:ring-[#013220] outline-none transition-all"
                  >
                    <option value="">Select Option</option>
                    <option value="Availing hair & makeup services">
                      Availing hair & makeup services
                    </option>
                    <option value="Coming in with makeup done">
                      Coming in with makeup done
                    </option>
                  </select>
                </div>

                {/* --- ADD-ONS --- */}
                {/* --- ADD-ONS --- */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 px-1">
                    Add-ons (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddonGuide(!showAddonGuide)}
                    className="text-[10px] text-[#013220] font-bold underline decoration-dotted hover:text-[#800000] transition-colors"
                  >
                    {showAddonGuide ? "Hide Examples" : "See Examples"}
                  </button>
                </div>

                <input
                  name="addons"
                  placeholder="e.g. Couple, Standard, Makeup: 3 pax"
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-[#013220] outline-none transition-all"
                />

                {/* --- COLLAPSIBLE GUIDE --- */}
                {showAddonGuide && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mb-2">
                      Please use this format:
                    </p>
                    
                    <div className="grid gap-2">
                      <div className="flex gap-2 items-start">
                        <span className="font-bold text-[#013220] min-w-[60px]">Couple</span>
                        <span className="text-gray-600">2 pax (2 with hair/makeup)</span>
                      </div>

                      <div className="flex gap-2 items-start">
                        <span className="font-bold text-[#013220] min-w-[60px]">Standard</span>
                        <span className="text-gray-600">3 pax (1 with hair/makeup)</span>
                      </div>

                      <div className="flex gap-2 items-start">
                        <span className="font-bold text-[#013220] min-w-[60px]">Premium</span>
                        <span className="text-gray-600">6 pax (No extra hair/makeup)</span>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-gray-400 italic mt-2 border-t border-gray-100 pt-2">
                      Note: Simply indicate the total number of people and how many will avail of the extra services.
                    </p>
                  </div>
                )}
              </div>

                {/* --- REMARKS --- */}
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 px-1">
                  Remarks (Optional)
                </label>
                <textarea
                  name="remarks"
                  placeholder="e.g. Will bring pet dog (medium size)"
                  className="w-full bg-gray-50 border-gray-200 rounded-xl p-4 text-base h-20 focus:ring-2 focus:ring-[#013220] outline-none transition-all resize-none"
                />

                {/* --- SUBMIT --- */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#013220] text-white py-4 rounded-xl font-bold hover:bg-[#0a442e] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Confirm My Slot"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}