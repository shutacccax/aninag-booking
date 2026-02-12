import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ booking: null });
  }

  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ booking: null }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. First, try to get the active confirmed booking
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "Confirmed")
    .maybeSingle(); // Use maybeSingle to avoid errors if no row is found

  // 2. If no confirmed booking, we still need the initial_booking_at 
  // to show the timer on the calendar view.
  if (!booking) {
    const { data: oldestRecord } = await supabaseAdmin
      .from("bookings")
      .select("initial_booking_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ 
      booking: null, 
      initial_booking_at: oldestRecord?.initial_booking_at || null 
    });
  }

  return NextResponse.json({ booking });
}