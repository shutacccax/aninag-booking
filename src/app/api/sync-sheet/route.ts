import { createClient } from "@supabase/supabase-js";

// Use the Service Role Key for the Cron job to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncWithRetry(payload: any, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(process.env.GAS_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) return true; // Check for your GAS success flag
    } catch (err) {
      console.error(`Retry ${i} failed`);
    }
    if (i < retries) await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function POST(req: Request) {
  // 1. SECURITY: Verify the Secret from GitHub Action
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 2. FETCH: Get unsynced bookings (Limit to 20 to avoid timeouts)
    const { data: bookings, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("synced", false)
      .limit(20);

    if (fetchError) throw fetchError;
    if (!bookings || bookings.length === 0) {
      return Response.json({ message: "No unsynced bookings" });
    }

    const successfulIds: string[] = [];

    // 3. SYNC: Process in parallel for speed
    await Promise.all(
      bookings.map(async (booking) => {
        const payload = {
          id: booking.id,
          type: booking.type,
          date: booking.date,
          time: booking.time,
          name: booking.name,
          email: booking.email,
          mobile: booking.mobile,
          packageName: booking.package,
          addOns: booking.addons,
          makeup: booking.makeup,
          remarks: booking.remarks,
          status: booking.status,
        };

        const success = await syncWithRetry(payload);
        if (success) {
          successfulIds.push(booking.id);
        }
      })
    );

    // 4. BATCH UPDATE: Update all successful IDs at once
    if (successfulIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({ synced: true })
        .in("id", successfulIds);

      if (updateError) throw updateError;
    }

    return Response.json({
      message: `Successfully synced ${successfulIds.length} out of ${bookings.length} bookings.`,
    });

  } catch (error: any) {
    console.error("Sync Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}