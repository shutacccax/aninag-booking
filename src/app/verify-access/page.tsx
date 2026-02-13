"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function VerifyAccess() {
  const router = useRouter();

  useEffect(() => {
    const checkWhitelist = async () => {
      // 1. Get the user from the newly created session
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        router.push("/");
        return;
      }

      // 2. Query the whitelist table you created in SQL
      const { data: isWhitelisted, error } = await supabase
        .from("whitelisted_users")
        .select("email")
        .eq("email", user.email)
        .single();

      if (isWhitelisted && !error) {
        // ✅ ON THE LIST: Proceed to booking
        router.push("/book");
      } else {
        // ❌ NOT ON THE LIST: Sign out and send home with error param
        await supabase.auth.signOut();
        router.push("/?error=not_whitelisted");
      }
    };

    checkWhitelist();
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center space-y-6">
        {/* Aninag Green Spinner */}
        <div className="w-12 h-12 border-4 border-[#013220]/10 border-t-[#013220] rounded-full animate-spin" />
        
        <div className="text-center space-y-2">
          <p className="text-[#013220] font-serif font-bold text-xl animate-pulse">
            Verifying Access
          </p>
          <p className="text-gray-400 text-[10px] uppercase tracking-[0.3em]">
            Aninag 2026 Yearbook
          </p>
        </div>
      </div>
    </div>
  );
}