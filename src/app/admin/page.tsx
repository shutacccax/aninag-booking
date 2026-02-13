"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [filteredWhitelist, setFilteredWhitelist] = useState<any[]>([]);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [singleEmail, setSingleEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
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
        fetchWhitelist();
      }
    };
    checkAdmin();
  }, [router]);

  // Sync filtered lists
  useEffect(() => {
    setFilteredBookings(
      bookings.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        b.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, bookings]);

  useEffect(() => {
    setFilteredWhitelist(
      whitelist.filter(w => w.email.toLowerCase().includes(whitelistSearch.toLowerCase()))
    );
  }, [whitelistSearch, whitelist]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "Confirmed") 
      .order("date", { ascending: true })
      .order("time", { ascending: true });
    if (data) setBookings(data);
  };

  const fetchWhitelist = async () => {
    const { data } = await supabase
      .from("whitelisted_users")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setWhitelist(data);
  };

  const handleAuthorization = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
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

    const { error } = await supabase.from("whitelisted_users").insert(emailList.map(email => ({ email })));

    if (error) {
      setMsg(error.code === '23505' ? "warning: Duplicate emails skipped." : `error: ${error.message}`);
    } else {
      setMsg(`success: Authorized ${emailList.length} student(s).`);
      setSingleEmail(""); setBulkEmails("");
      fetchWhitelist(); // Refresh the list
    }
    setTimeout(() => setMsg(""), 6000);
  };

    const confirmDelete = async () => {
    if (!emailToDelete) return;

    const { error } = await supabase
        .from("whitelisted_users")
        .delete()
        .eq("email", emailToDelete);

    if (!error) {
        fetchWhitelist();
        setEmailToDelete(null); // Close the popup
    } else {
        alert("Error removing email: " + error.message);
    }
    };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-[#FCC200]">
        <div className="relative flex flex-col items-center space-y-8 animate-in fade-in duration-700">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-[#013220]/10 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-[#013220] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-[#013220] font-serif font-bold text-2xl tracking-tight">Verifying EB Credentials</h2>
        </div>
      </div>
    );
  }

  const studioBookings = filteredBookings.filter((b) => b.type === "studio");
  const campusBookings = filteredBookings.filter((b) => b.type === "location" || b.type === "campus");

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 selection:bg-[#FCC200] selection:text-[#800000]">
      <div className="max-w-7xl mx-auto space-y-12">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#013220]">Aninag EB Portal</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1 font-bold">Photoshoot Management</p>
          </div>
          <button onClick={() => router.push("/")} className="px-6 py-2 border border-gray-200 rounded-full text-xs font-bold text-gray-400 hover:text-[#800000] bg-white shadow-sm">Exit Dashboard</button>
        </header>

        {/* --- MANAGEMENT CONTROLS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Authorize Form */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">

            <div className="flex items-center justify-between mb-6">
                <div>
                <h2 className="text-sm font-bold text-[#013220] uppercase tracking-wider">Authorize Students</h2>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter mt-1">Grant access to the booking portal</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setAddMode("single")} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${addMode === "single" ? "bg-white text-[#013220] shadow-sm" : "text-gray-400"}`}>Single</button>
                <button onClick={() => setAddMode("bulk")} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${addMode === "bulk" ? "bg-white text-[#013220] shadow-sm" : "text-gray-400"}`}>Bulk</button>
                </div>
            </div>

            <form onSubmit={handleAuthorization} className="space-y-4">
                <div className="relative group">
                {addMode === "single" ? (
                    <input 
                    type="email" 
                    required 
                    placeholder="name@up.edu.ph" 
                    value={singleEmail} 
                    onChange={(e) => setSingleEmail(e.target.value)} 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#013220] outline-none text-sm pr-12 transition-all" 
                    />
                ) : (
                    <textarea 
                    placeholder="Paste multiple emails..." 
                    value={bulkEmails} 
                    onChange={(e) => setBulkEmails(e.target.value)} 
                    className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#013220] outline-none text-sm resize-none pr-12 transition-all" 
                    />
                )}
                
                {/* Dynamic Helper Icon */}
                <div className="absolute right-5 top-4 text-gray-300 group-hover:text-[#FCC200] transition-colors cursor-help group-focus-within:text-[#013220]">
                    <span title={addMode === 'single' ? "Must be a valid UP Mail" : "Separate by commas or spaces"}>ⓘ</span>
                </div>
                </div>

                {/* Quick Guides for EB */}
                <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-dashed border-gray-200">
                    <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Format Guide</h4>
                    <p className="text-[10px] text-gray-500 leading-tight">
                    {addMode === "single" 
                        ? "Ensure there are no spaces before or after the email." 
                        : "You can copy directly from a Google Sheet column."}
                    </p>
                </div>
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-dashed border-gray-200">
                    <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Security Note</h4>
                    <p className="text-[10px] text-gray-500 leading-tight">
                    Duplicate emails are automatically skipped to avoid errors.
                    </p>
                </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                {msg ? (
                    <div className={`px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-widest animate-in fade-in zoom-in duration-300 ${msg.startsWith("success") ? "bg-[#013220] text-[#FCC200]" : "bg-[#800000] text-white"}`}>
                    {msg.split(": ")[1]}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">System Online</p>
                    </div>
                )}
                <button type="submit" className="ml-auto px-10 py-3 bg-[#013220] text-white rounded-xl font-bold text-sm hover:bg-[#0a442e] shadow-lg shadow-[#013220]/20 active:scale-95 transition-all">
                    {addMode === "single" ? "Authorize" : "Execute Bulk Addition"}
                </button>
                </div>
            </form>
            </section>

          {/* 2. Whitelist List & Search */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-[350px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#013220] uppercase tracking-wider">Authorized List</h2>
              <input type="text" placeholder="Search mail..." value={whitelistSearch} onChange={(e) => setWhitelistSearch(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] focus:ring-1 focus:ring-[#FCC200] outline-none w-1/2" />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <table className="w-full text-left">
                <tbody className="divide-y divide-gray-50">
                  {filteredWhitelist.map((w) => (
                    <tr key={w.email} className="group">
                      <td className="py-3 text-[11px] font-medium text-gray-600">{w.email}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => setEmailToDelete(w.email)} className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-[#800000] uppercase tracking-widest hover:underline transition-opacity">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* --- BOOKING TABLES --- */}
        <section className="space-y-6">
          <div className="relative">
             <input type="text" placeholder="Search graduate by name or mail in confirmed bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-[#FCC200] outline-none text-sm" />
             <span className="absolute right-6 top-4 opacity-30">🔍</span>
          </div>
          <div className="space-y-20">
            <BookingTable title="📸 Zone-5 Studio Sessions" data={studioBookings} accent="#013220" />
            <BookingTable title="🏛️ Campus Shoots" data={campusBookings} accent="#800000" />
          </div>
        </section>
      </div>
      {/* --- DELETE CONFIRMATION MODAL --- */}
        {emailToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div 
            className="absolute inset-0 bg-[#013220]/20 backdrop-blur-sm" 
            onClick={() => setEmailToDelete(null)} 
            />
            
            {/* Modal Content */}
            <div className="relative bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[#800000]/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">⚠️</span>
            </div>
            
            <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-gray-900">Confirm Removal</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-[#013220]">{emailToDelete}</span>? 
                They will lose access to the booking portal immediately.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                <button 
                onClick={confirmDelete}
                className="w-full py-4 bg-[#800000] text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-800 transition-all shadow-lg shadow-red-900/20"
                >
                Yes, Remove Access
                </button>
                <button 
                onClick={() => setEmailToDelete(null)}
                className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                Cancel
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
    
  );
}

function BookingTable({ title, data, accent }: { title: string, data: any[], accent: string }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-gray-900">{title}</h2>
        <span className="px-4 py-1 rounded-full bg-white border border-gray-100 text-gray-400 text-[10px] font-bold shadow-sm">{data.length} Confirmed</span>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ backgroundColor: accent }} className="text-white text-[10px] uppercase tracking-widest">
              <tr><th className="p-8">Graduate Info</th><th className="p-8">Details</th><th className="p-8">Contact</th><th className="p-8">Schedule</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-8"><p className="font-bold text-gray-900">{b.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{b.email}</p></td>
                  <td className="p-8"><p className="text-xs font-bold text-gray-700">{b.package}</p><p className="text-[10px] text-[#800000]">{b.makeup || 'NO HAIR/MAKEUP'}</p></td>
                  <td className="p-8"><p className="text-sm font-bold text-gray-800">{b.mobile}</p></td>
                  <td className="p-8"><div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 inline-block text-center"><p className="text-xs font-bold text-[#800000]">{b.date}</p><p className="text-[10px] text-gray-500 font-bold">{b.time}</p></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
    
  );
}