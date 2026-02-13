"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [singleEmail, setSingleEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/");

      const { data } = await supabase
        .from("admin_users")
        .select("email")
        .eq("email", user.email)
        .single();

      if (!data) {
        router.push("/");
      } else {
        setIsAdmin(true);
        fetchData();
      }
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = bookings.filter(b => 
      b.name.toLowerCase().includes(lowerCaseQuery) || 
      b.email.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredBookings(filtered);
  }, [searchQuery, bookings]);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "Confirmed") 
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) console.error("Fetch Error:", error.message);
    else setBookings(data || []);
  };

const handleAuthorization = async (e: React.FormEvent) => {
  e.preventDefault();
  setMsg(""); // Clear previous messages
  
  let emailList: string[] = [];
  if (addMode === "single") {
    const email = singleEmail.toLowerCase().trim();
    if (email.endsWith("@up.edu.ph")) emailList = [email];
  } else {
    emailList = bulkEmails.split(/[\s,]+/).map(e => e.toLowerCase().trim()).filter(e => e.endsWith("@up.edu.ph"));
  }

  if (emailList.length === 0) {
    setMsg("error: Please enter valid @up.edu.ph emails.");
    return;
  }

  const { error } = await supabase
    .from("whitelisted_users")
    .insert(emailList.map(email => ({ email })));

  if (error) {
    // Check if the error is a duplicate (code 23505)
    if (error.code === '23505') {
      setMsg("warning: One or more emails are already authorized.");
    } else {
      setMsg(`error: ${error.message}`);
    }
  } else {
    setMsg(`success: Successfully authorized ${emailList.length} student(s).`);
    setSingleEmail("");
    setBulkEmails("");
  }
  
  // Keep the message visible for 6 seconds for better visibility
  setTimeout(() => setMsg(""), 6000);
};

  if (!isAdmin) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-[#FCC200]">
      {/* 1. Subtle Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#013220]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#800000]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center space-y-8 animate-in fade-in duration-700">
        {/* 2. Custom Brand Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-[#013220]/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-[#013220] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <div className="absolute inset-2 border-2 border-[#800000]/20 rounded-full animate-pulse" />
        </div>

        {/* 3. Typography */}
        <div className="text-center space-y-2">
          <h2 className="text-[#013220] font-serif font-bold text-2xl tracking-tight">
            Verifying EB Credentials
          </h2>
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-[#FCC200]" />
            <p className="text-gray-400 text-[9px] uppercase font-bold tracking-[0.4em]">
              Aninag 2026 Portal
            </p>
            <span className="h-px w-8 bg-[#FCC200]" />
          </div>
        </div>
      </div>
    </div>
  );
}

  const studioBookings = filteredBookings.filter((b) => b.type === "studio");
  const campusBookings = filteredBookings.filter((b) => b.type === "location" || b.type === "campus");

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 selection:bg-[#FCC200] selection:text-[#800000]">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#013220]">Aninag EB Portal</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-bold">Photoshoot Management</p>
          </div>
          <button onClick={() => router.push("/")} className="px-6 py-2 border border-gray-200 rounded-full text-xs font-bold text-gray-400 hover:text-[#800000] hover:border-[#800000] transition-all bg-white shadow-sm">
            Exit Dashboard
          </button>
        </header>

        {/* --- WHITELIST & SEARCH SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Whitelist Manager */}
          <section className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-[#013220] uppercase tracking-wider">Authorize Students</h2>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setAddMode("single")}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${addMode === "single" ? "bg-white text-[#013220] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Single
                </button>
                <button 
                  onClick={() => setAddMode("bulk")}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${addMode === "bulk" ? "bg-white text-[#013220] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Bulk
                </button>
              </div>
            </div>

            <form onSubmit={handleAuthorization} className="space-y-4">
              {addMode === "single" ? (
                <input 
                  type="email"
                  required
                  placeholder="name@up.edu.ph"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#013220] outline-none text-sm"
                />
              ) : (
                <textarea 
                  placeholder="Paste multiple emails (e.g. name1@up.edu.ph, name2@up.edu.ph)..."
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  className="w-full h-24 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#013220] outline-none text-sm resize-none"
                />
              )}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {msg ? (
                <div className={`px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-widest animate-in fade-in zoom-in duration-300 ${
                    msg.startsWith("success") ? "bg-[#013220] text-[#FCC200] border border-[#FCC200]/20" : 
                    msg.startsWith("warning") ? "bg-[#FCC200] text-[#800000]" :
                    "bg-[#800000] text-white"
                }`}>
                    {msg.split(": ")[1]}
                </div>
                ) : (
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                    Requirement: Must be @up.edu.ph
                </p>
                )}
                
                <button type="submit" className="px-10 py-3 bg-[#013220] text-white rounded-xl font-bold text-sm hover:bg-[#0a442e] transition-all shadow-lg shadow-[#013220]/20 active:scale-95">
                {addMode === "single" ? "Authorize Student" : "Authorize Bulk List"}
                </button>
            </div>
            </form>

            
          </section>

          {/* Quick Search */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-center">
            <h2 className="text-sm font-bold text-[#013220] uppercase tracking-wider mb-6 text-center">Graduate Search</h2>
            <div className="relative">
              <input 
                type="text"
                placeholder="Search name or mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FCC200] outline-none text-sm pl-12"
              />
              <span className="absolute left-5 top-4.5 text-lg">🔍</span>
            </div>
            <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">{filteredBookings.length} confirmed entries</p>
          </section>
        </div>

        {/* --- TABLES --- */}
        <div className="space-y-20">
          <BookingTable title="📸 Zone-5 Studio Sessions" data={studioBookings} accent="#013220" />
          <BookingTable title="🏛️ Campus Shoots" data={campusBookings} accent="#800000" />
        </div>
      </div>
    </div>
  );
}

function BookingTable({ title, data, accent }: { title: string, data: any[], accent: string }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-gray-900">{title}</h2>
        <div className="h-px flex-1 mx-6 bg-gray-100" />
        <span className="px-4 py-1 rounded-full bg-white border border-gray-100 text-gray-400 text-[10px] font-bold shadow-sm">{data.length} Confirmed</span>
      </div>
      
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead style={{ backgroundColor: accent }} className="text-white text-[10px] uppercase tracking-widest">
              <tr>
                <th className="p-8">Graduate Info</th>
                <th className="p-8">Package & Makeup</th>
                <th className="p-8">Contact & Notes</th>
                <th className="p-8">Schedule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-gray-300 italic font-serif">No confirmed photoshoot data available.</td></tr>
              ) : (
                data.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="p-8">
                      <p className="font-bold text-gray-900 group-hover:text-[#013220] leading-tight text-base">{b.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{b.email}</p>
                    </td>
                    <td className="p-8">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{b.package}</p>
                      <p className="text-[10px] text-[#800000] font-medium mt-1 uppercase tracking-widest">{b.makeup || 'NO HAIR/MAKEUP'}</p>
                    </td>
                    <td className="p-8">
                      <p className="text-sm font-bold text-gray-800">{b.mobile}</p>
                      {b.remarks && <p className="text-[10px] text-gray-400 mt-2 bg-gray-100 p-2 rounded-lg italic">"{b.remarks}"</p>}
                    </td>
                    <td className="p-8">
                      <div className="bg-gray-50 p-3 rounded-2xl inline-block border border-gray-100">
                        <p className="text-xs font-bold text-[#800000] uppercase tracking-widest">{b.date}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">{b.time}</p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}