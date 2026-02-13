import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (!type) {
    return Response.json({ error: "Missing type" }, { status: 400 });
  }

  // 1️⃣ Get all configured slots for this type
  const { data: slots, error: slotError } = await supabase
    .from("slot_config")
    .select("date, time, capacity")
    .eq("type", type);

  if (slotError) {
    return Response.json({ error: slotError.message }, { status: 500 });
  }

  // 2️⃣ Get confirmed bookings
  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("date, time")
    .eq("type", type)
    .eq("status", "Confirmed");

  if (bookingError) {
    return Response.json({ error: bookingError.message }, { status: 500 });
  }

  const countMap: Record<string, number> = {};

  bookings?.forEach((row) => {
    const key = `${row.date}_${row.time}`;
    countMap[key] = (countMap[key] || 0) + 1;
  });

  // 3️⃣ Group by date
  const dateMap: Record<string, number> = {};

  slots?.forEach((slot) => {
    const key = `${slot.date}_${slot.time}`;
    const booked = countMap[key] || 0;
    const remaining = slot.capacity - booked;

    dateMap[slot.date] = (dateMap[slot.date] || 0) + remaining;
  });

  const result = Object.keys(dateMap).map((date) => ({
    date,
    remaining: dateMap[date],
  }));

  return Response.json(result);
}
