import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// --- 1. SETUP & HELPERS ---

// Helper for error logging
function logError(context: string, error: any) {
  console.error(`[${new Date().toISOString()}] ❌ ${context}:`, error.message || error);
}

// Helper to sync to Google Sheets (GAS)
async function syncWithRetry(payload: any, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      if (!process.env.GAS_URL) throw new Error("Missing GAS_URL");
      
      const res = await fetch(process.env.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) return true;
    } catch (err) {
      // Silent fail on retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function POST(req: Request) {
  // Initialize the ADMIN client (Service Role)
  // We use this for EVERYTHING to bypass RLS and ensure the server is the authority.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // --- 2. AUTHENTICATION CHECK ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
        return NextResponse.json({ success: false, message: "Missing authorization" }, { status: 401 });
    }
    
    // Check the user using the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      logError("Auth", userError || "No user found");
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // --- 3. VALIDATION (The "Must Fix") ---
    
    // A. UP Email Validation (Security)
    // We check the logged-in user's email, not just what they typed in the form.
    if (!user.email?.endsWith("@up.edu.ph")) {
        console.warn(`[Security] Blocked non-UP email: ${user.email}`);
        return NextResponse.json({ 
            success: false, 
            message: "Strictly for UP students only. Please login with your UP email." 
        }, { status: 403 });
    }

    // Parse the body now
    const body = await req.json();
    const { type, date, time, mobile, action } = body; // 'action' is for reschedule logic

    // B. Mobile Number Validation
    if (!mobile || mobile.length !== 11 || !mobile.startsWith("09")) {
        return NextResponse.json({ 
            success: false, 
            message: "Invalid mobile number. Must be 11 digits starting with 09." 
        }, { status: 400 });
    }

    // --- 4. ATOMIC RESCHEDULE LOGIC ---
    // If this is a reschedule, we perform the "Swap" logic here.
    if (action === 'reschedule') {
        // Double check they actually have a booking to reschedule
        const { data: existing } = await supabaseAdmin
            .from("bookings")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "Confirmed")
            .single();
            
        if (existing) {
             // Mark old one as cancelled immediately before creating the new one
             // (Or ideally inside a transaction, but this is safer than client-side)
             await supabaseAdmin
                .from("bookings")
                .update({ status: 'Cancelled', synced: false })
                .eq("id", existing.id);
        }
    } else {
        // If NOT rescheduling, standard check: prevent double booking
        const { count: existingCount } = await supabaseAdmin
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "Confirmed");

        if ((existingCount || 0) > 0) {
            return NextResponse.json({ success: false, message: "You already have an active booking." });
        }
    }

    // --- 5. CAPACITY CHECK ---
    const { data: config } = await supabaseAdmin
      .from("slot_config")
      .select("capacity")
      .eq("type", type)
      .eq("date", date)
      .eq("time", time)
      .single();

    if (!config) {
      return NextResponse.json({ success: false, message: "This slot is not available." });
    }

    const { count: currentFill } = await supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("type", type)
      .eq("date", date)
      .eq("time", time)
      .eq("status", "Confirmed");

    if ((currentFill || 0) >= config.capacity) {
      return NextResponse.json({ success: false, message: "Slot is fully booked." });
    }

    // --- 6. INSERT NEW BOOKING ---
    // Note: 'initial_booking_at' is handled automatically by your SQL Trigger!
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert([
        {
          user_id: user.id,
          type,
          date,
          time,
          name: body.name,
          email: user.email, // Force use of the Verified Auth Email
          mobile: body.mobile,
          package: body.package,    
          addons: body.addons || "",
          makeup: body.makeup,
          remarks: body.remarks || "",
          synced: false,
        },
      ])
      .select()
      .single();

    if (insertError || !inserted) {
      logError("Insert", insertError);
      return NextResponse.json({ success: false, message: "Database Error: Could not save booking." });
    }

    // --- 7. BACKGROUND SYNC (Fire and Forget) ---
    // We don't await this so the UI is snappy
    (async () => {
        // A. Retry syncing this current booking
        const success = await syncWithRetry({
            id: inserted.id,
            type: inserted.type,
            date: inserted.date,
            time: inserted.time,
            name: inserted.name,
            email: inserted.email,
            mobile: inserted.mobile,
            packageName: inserted.package,
            addOns: inserted.addons,
            makeup: inserted.makeup,
            remarks: inserted.remarks,
        }, 3);

        if (success) {
            await supabaseAdmin.from("bookings").update({ synced: true }).eq("id", inserted.id);
        }

        // B. Clean up any other unsynced items (Self-Healing)
        const { data: pending } = await supabaseAdmin.from("bookings").select("*").eq("synced", false).neq("id", inserted.id).limit(5);
        if (pending) {
            for (const p of pending) {
              const payload = {
                id: p.id,
                type: p.type,
                date: p.date,
                time: p.time,
                name: p.name,
                email: p.email,
                mobile: p.mobile,
                packageName: p.package,   // 🔥 FIX
                addOns: p.addons,         // 🔥 FIX
                makeup: p.makeup,
                remarks: p.remarks,
                status: p.status,
              };

              syncWithRetry(payload).then(ok => {
                if (ok) {
                  supabaseAdmin
                    .from("bookings")
                    .update({ synced: true })
                    .eq("id", p.id);
                }
              });
            }

        }
    })();

    return NextResponse.json({ success: true });

  } catch (err: any) {
    logError("Unhandled", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}