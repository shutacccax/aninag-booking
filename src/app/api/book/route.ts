import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";


async function syncWithRetry(payload: any, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(process.env.GAS_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) return true;
    } catch (err) {}

    await new Promise((r) => setTimeout(r, 500));
  }

  return false;
}

async function syncPendingBookings() {
  const { data: pending } = await supabase
    .from("bookings")
    .select("*")
    .eq("synced", false);

  if (!pending || pending.length === 0) return;

  for (const booking of pending) {
    const success = await syncWithRetry(booking, 3);

    if (success) {
      await supabase
        .from("bookings")
        .update({ synced: true })
        .eq("id", booking.id);
    }
  }
}

export async function POST(req: Request) {
    const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        headers: {
          Authorization: req.headers.get("authorization") ?? "",
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser();

  if (!user || userError) {
    return Response.json({ success: false, message: "Invalid user" });
  }

  if (!user.email?.endsWith("@up.edu.ph")) {
  return Response.json({
    success: false,
    message: "Only UP email accounts are allowed.",
  });
}

  try {
    const body = await req.json();
    const { type, date, time } = body;

    // Sync old unsynced in background (don’t block user)
    syncPendingBookings();


    const { count: existingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "Confirmed");


    if ((existingCount || 0) > 0) {
      return Response.json({
        success: false,
        message: "You have already booked a schedule.",
      });
    }



    // Capacity check
    const { data: config } = await supabase
      .from("slot_config")
      .select("capacity")
      .eq("type", type)
      .eq("date", date)
      .eq("time", time)
      .single();

    if (!config) {
      return Response.json({ success: false, message: "Slot not configured" });
    }

    const { count } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("type", type)
      .eq("date", date)
      .eq("time", time)
      .eq("status", "Confirmed");

    if ((count || 0) >= config.capacity) {
      return Response.json({ success: false, message: "Slot full" });
    }

    // Insert booking
    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert([
        {
          user_id: user.id,
          type,
          date,
          time,
          name: body.name,
          email: body.email,
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


    if (error || !inserted) {
      console.error(error);
      return Response.json({ success: false, message: error?.message });
    }

    // Background sync new booking (don’t await)
    syncWithRetry({
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
    }, 3)
    .then(async (success) => {
      if (success) {
        await supabase
          .from("bookings")
          .update({ synced: true })
          .eq("id", inserted.id);
      }
    });

    // 🚀 RETURN IMMEDIATELY
    return Response.json({ success: true });

  } catch (err) {
    return Response.json({ success: false });
  }
}
