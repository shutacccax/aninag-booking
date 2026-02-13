import { createClient } from "@supabase/supabase-js";

// Use the Service Role Key for the Cron job to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 1. Fetch unsynced bookings (up to 50 is safe for a single batch)
    const { data: bookings, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("synced", false)
      .limit(50); 

    if (fetchError) throw fetchError;
    if (!bookings || bookings.length === 0) return Response.json({ message: "Queue empty" });

    // 2. Map to a clean payload
    const payload = bookings.map(b => ({
      id: b.id,
      type: b.type,
      date: b.date,
      time: b.time,
      name: b.name,
      email: b.email,
      mobile: b.mobile,
      packageName: b.package,
      addOns: b.addons,
      makeup: b.makeup,
      remarks: b.remarks,
      status: b.status,
    }));

    // 3. Single Batch POST to Google
    const res = await fetch(process.env.GAS_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBatch: true, data: payload }), 
    });

    const result = await res.json();

    // 4. Update Supabase only if Google confirms success
    if (result.success && result.syncedIds?.length > 0) {
      await supabaseAdmin
        .from("bookings")
        .update({ synced: true })
        .in("id", result.syncedIds);

      return Response.json({ message: `Synced ${result.syncedIds.length} bookings` });
    }

    return Response.json({ error: "Sync failed" }, { status: 500 });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}