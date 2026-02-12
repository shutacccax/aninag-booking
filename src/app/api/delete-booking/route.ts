import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return Response.json({ success: false, message: "Missing authorization" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser(token);

  if (!user) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // --- CHANGE STARTS HERE ---
  // 1. Fetch the VERY FIRST booking record ever created by this user
  // This ensures the 24-hour timer doesn't reset when they reschedule.
  const { data: firstBooking, error: fetchError } = await supabase
    .from("bookings")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true }) // Earliest first
    .limit(1)
    .single();

  if (fetchError || !firstBooking) {
    return Response.json({ success: false, message: "Initial booking records not found" }, { status: 404 });
  }

  // 2. Check if 24 hours have passed since that FIRST booking
  const firstCreatedAt = new Date(firstBooking.created_at).getTime();
  const now = new Date().getTime();
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

  if (now - firstCreatedAt > twentyFourHoursInMs) {
    return Response.json({ 
      success: false, 
      message: "Reschedule window expired. (24 hours since your first booking has passed)" 
    }, { status: 403 });
  }
  // --- CHANGE ENDS HERE ---

  // 3. Proceed with cancellation for the CURRENT active booking
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
      synced: false,
    })
    .eq("user_id", user.id)
    .eq("status", "Confirmed");

  if (updateError) {
    return Response.json({ success: false, message: "Update failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}