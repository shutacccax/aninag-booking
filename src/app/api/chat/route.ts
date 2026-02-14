import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// 1. Initialize the client securely
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function POST(req: Request) {
  console.log("--- ANINAG ASSISTANT INVOCATION ---");

  try {
    if (!ai) {
      console.error("Missing GEMINI_API_KEY");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "No message provided." }, { status: 400 });
    }

    const lower = message.toLowerCase();

// STATIC SHORT-CIRCUIT RESPONSES (NO AI CALL)

if (lower.includes("pet") || lower.includes("aso") || lower.includes("dog")) {
  return NextResponse.json({
    text: "Small pets are allowed only for in-studio shoots 🐶 For in-campus shoots, pets are not allowed due to university protocols."
  });
}

if (lower.includes("what time") || lower.includes("anong oras") || lower.includes("time ng shoot")) {
  return NextResponse.json({
    text: "In-campus shoots are 8:00 AM – 3:00 PM 🏫 Studio shoots are 9:00 AM – 4:00 PM 📸"
  });
}

if (lower.includes("when") || lower.includes("kailan")) {
  return NextResponse.json({
    text: "In-campus shoots: March 16–19 🏫 Studio shoots: March 12–14 and March 20–21 📸"
  });
}

if (lower.includes("reschedule")) {
  return NextResponse.json({
    text: "You can reschedule within 24 hours after your first confirmed booking ⏳ After 24 hours, bookings are considered final."
  });
}

if (
  lower === "faq" ||
  lower === "faqs" ||
  lower.includes("overview") ||
  lower.includes("ano mga rules") ||
  lower.includes("what are the rules")
) {
  return NextResponse.json({
    text: `Here are the main topics I can help you with 😊

📅 Shoot Dates  
🕒 Shoot Hours  
📍 Locations  
💳 Payments  
💄 Hair & Make-up  
🐶 Pet Policy  
🔁 Rescheduling  
👕 Attire  

Just ask about any of these and I’ll explain! 🎓✨`
  });
}


// Small delay to prevent burst rate limits
await new Promise(resolve => setTimeout(resolve, 300));

    // 2. The v1.41+ SDK requires systemInstruction inside the 'config' object
    // This resolves the TS2353 'known properties' error
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [{ role: "user", parts: [{ text: message }] }],
config: {
systemInstruction: `
You are the official Aninag 2026 Graduation Photoshoot Assistant 🎓

Your tone:
- Friendly and conversational
- Light and approachable
- Can reply in Filipino if the user speaks in Filipino
- Can reply in Taglish if the user speaks in Taglish
- Can reply in English if the user speaks in English
- Use light, appropriate emojis (not too many)
- Keep answers short and clear

STRICT RULES:
- Accept Filipino questions
- Answer ONLY using the verified information below.
- Do NOT invent policies.
- Do NOT assume details not written below.
- If the question is not covered, respond exactly with:
  "Sorry! I can only answer official Aninag 2026 graduation photoshoot concerns for now 😊"
- If asked for a general overview, provide a short bullet list summary only. Do not repeat the full policy text.
- Shorten answers as much as possible


────────────────────────────
📅 SHOOT DATES
- In-Campus Shoots: March 16–19
- Studio Shoots (Zone 5, QC): March 12–14 and March 21

🕒 SHOOT HOURS
- In-Campus: 8:00 AM – 3:00 PM
- Studio (Zone 5): 9:00 AM – 4:00 PM

📍 LOCATIONS
- In-studio: Zone 5 Studio (Quezon City)
- In-campus: UP Manila

📌 SLOT INFORMATION
- 50 slots per day.
- Equally distributed among timeslots.
- NO block scheduling.

🔁 RESCHEDULING
- Allowed ONLY within 24 hours after first confirmed booking.
- After 24 hours, booking is final unless officially accommodated.

👕 ATTIRE
- Women: White or nude tube top.
- Men: Plain white v-neck or round neck.
- Filipiniana or Barong allowed.

💳 PAYMENT
- Full payment OR
- 50% downpayment + balance before shoot date.

💄 HAIR & MAKE-UP
- Included in all Graduation Shoot Packages.
- Optional HMU only for Barkada if no grad package was availed.
- Own make-up artist allowed, but cannot use studio make-up room.

🐶 PET POLICY
- Small pets allowed IN-STUDIO only.
- NO pets for in-campus shoots.

⏰ MISSED SLOT
- Late but present? You’ll be accommodated after others finish.
- Arrive 30 minutes before your slot.

📆 MISSED DATE
- Will be rescheduled to available exclusive dates.
- If none work, assistance will be given for Zone 5 Studio.

🎓 ELIGIBILITY
- Open to other colleges for Graduation Shoot Services and Sablay.
`
}
    });

const replyText = response.text;
const safeText = replyText?.toLowerCase() || "";

if (
  safeText.includes("april") ||
  safeText.includes("refund") ||
  safeText.includes("discount")
) {
  return NextResponse.json({
    text: "Sorry! I can only answer official Aninag 2026 graduation photoshoot concerns for now 😊"
  });
}


// 4️⃣ Return final response
return NextResponse.json({ text: replyText });


} catch (error: any) {

  console.error("---- FULL GEMINI ERROR OBJECT ----");
  console.error(error);
  console.error("Status:", error?.status);
  console.error("Code:", error?.code);
  console.error("Message:", error?.message);
  console.error("Details:", error?.details);
  console.error("----------------------------------");

  // Only treat as real 429 if status is EXACTLY 429
  if (error?.status === 429) {
    console.warn("Rate limit reached for Aninag Assistant.");
    return NextResponse.json(
      { text: "I'm experiencing a high volume of student inquiries. Please wait a few seconds and try again! 🎓" },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { error: "Assistant unavailable.", details: error?.message },
    { status: 500 }
  );
}

}