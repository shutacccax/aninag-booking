import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const date = searchParams.get("date");

  if (!type || !date) {
    return Response.json({ error: "Missing params" }, { status: 400 });
  }

  // 1️⃣ Get all slot configs for this date
  const { data: configs } = await supabase
    .from("slot_config")
    .select("time, capacity")
    .eq("type", type)
    .eq("date", date);

  if (!configs) return Response.json([]);

  // 2️⃣ Count bookings per time
  const { data: bookings } = await supabase
    .from("bookings")
    .select("time")
    .eq("type", type)
    .eq("date", date)
    .eq("status", "Confirmed");

  const countMap: Record<string, number> = {};

  bookings?.forEach((b) => {
    countMap[b.time] = (countMap[b.time] || 0) + 1;
  });

  // 3️⃣ Merge capacity + booked
  const result = configs
    .map((slot) => ({
      time: slot.time,
      remaining: slot.capacity - (countMap[slot.time] || 0),
    }))
    .sort((a, b) => {
      return new Date(`1970/01/01 ${a.time}`).getTime() -
            new Date(`1970/01/01 ${b.time}`).getTime();
    });


  return Response.json(result);
}
