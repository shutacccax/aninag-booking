import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function logError(context: string, error: any) {
  console.error(`[${new Date().toISOString()}] ❌ ${context}:`, error?.message || error);
}

export async function POST(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // ---------- AUTH ----------
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, message: "Missing authorization" }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      logError("Auth", userError);
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // ---------- VALIDATION ----------
    if (!user.email?.endsWith("@up.edu.ph")) {
      return NextResponse.json({ success: false, message: "Strictly for UP students only." }, { status: 403 });
    }

    const body = await req.json();
    const { type, date, time, mobile, action } = body;

    if (!mobile || mobile.length !== 11 || !mobile.startsWith("09")) {
      return NextResponse.json({ success: false, message: "Invalid mobile number." }, { status: 400 });
    }

    // ---------- RESCHEDULE LOGIC ----------
    if (action === "reschedule") {
      const { data: existing } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "Confirmed")
        .single();

      if (existing) {
        // We set synced: false so the Cron job knows to update this in Google Sheets
        await supabaseAdmin
          .from("bookings")
          .update({ status: "Cancelled", synced: false })
          .eq("id", existing.id);
      }
    } else {
      const { count } = await supabaseAdmin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "Confirmed");

      if ((count || 0) > 0) {
        return NextResponse.json({ success: false, message: "You already have an active booking." });
      }
    }

    // ---------- CAPACITY CHECK ----------
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

    // ---------- INSERT ----------
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert([
        {
          user_id: user.id,
          type,
          date,
          time,
          name: body.name,
          email: user.email,
          mobile: body.mobile,
          package: body.package,
          addons: body.addons || "",
          makeup: body.makeup,
          remarks: body.remarks || "",
          synced: false, // This tells the Cron job "Sync me!"
        },
      ])
      .select()
      .single();

    if (insertError || !inserted) {
      logError("Insert", insertError);
      return NextResponse.json({ success: false, message: "Database Error" });
    }

    // ---------- EMAIL (INSTANT) ----------
    try {
      const logoUrl = "https://book-aninag2026.vercel.app/logo.png"; 
      await transporter.sendMail({
        from: `"Aninag 2026" <${process.env.GMAIL_USER}>`,
        to: inserted.email,
        subject: action === "reschedule" ? "Update: Your Aninag 2026 Schedule 🎓" : "Confirmed: Your Aninag 2026 Schedule 🎓",
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-top: 8px solid #013220;">
              <div style="padding: 30px; text-align: center; background-color: #013220;">
                <img src="${logoUrl}" alt="Aninag 2026" style="width: 120px; height: auto; margin-bottom: 10px;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px; letter-spacing: 1px;">ANINAG 2026</h1>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin-top: 0;">Hi ${inserted.name},</h2>
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  ${action === "reschedule" ? "Your graduation photoshoot schedule has been **successfully updated**." : "Get your toga ready! Your graduation photoshoot booking is now **confirmed**."}
                </p>
                <div style="background-color: #f4f7f4; border-left: 4px solid #d4af37; padding: 20px; margin: 30px 0; border-radius: 4px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #777; font-size: 13px; text-transform: uppercase;">Location</td><td style="padding: 8px 0; color: #013220; font-weight: bold; text-align: right;">${inserted.type === 'studio' ? '📸 Zone 5 Studio' : '🏛️ Campus'}</td></tr>
                    <tr><td style="padding: 8px 0; color: #777; font-size: 13px; text-transform: uppercase;">Date & Time</td><td style="padding: 8px 0; color: #013220; font-weight: bold; text-align: right;">${inserted.date} | ${inserted.time}</td></tr>
                    <tr><td style="padding: 8px 0; color: #777; font-size: 13px; text-transform: uppercase;">Main Package</td><td style="padding: 8px 0; color: #013220; font-weight: bold; text-align: right;">${inserted.package}</td></tr>
                    <tr><td style="padding: 8px 0; color: #777; font-size: 13px; text-transform: uppercase;">HMUA Service</td><td style="padding: 8px 0; color: #013220; font-weight: bold; text-align: right;">${inserted.makeup ? 'Included ✅' : 'Not Requested'}</td></tr>
                    ${inserted.addons ? `<tr><td style="padding: 8px 0; color: #777; font-size: 13px; text-transform: uppercase;">Add-ons</td><td style="padding: 8px 0; color: #013220; font-weight: bold; text-align: right;">${inserted.addons}</td></tr>` : ''}
                  </table>
                </div>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                  <p style="margin: 0; color: #888; font-size: 12px;">Official Yearbook Publication of the UP Manila College of Arts and Sciences</p>
                  <p style="margin: 5px 0 0; color: #888; font-size: 12px; font-weight: bold;">CAS BATCH 2026</p>
                </div>
              </div>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email failed but booking saved:", emailError);
    }

    // SYNC REMOVED: The Cron Job will handle the Google Sheets update independently.
    return NextResponse.json({ success: true });

  } catch (err: any) {
    logError("Unhandled", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}