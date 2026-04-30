import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isAdminEmail, storeOtp } from "@/lib/firebaseService";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const isAdmin = await isAdminEmail(email);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized email." }, { status: 401 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await storeOtp(email, otp);

    const { error: resendError } = await resend.emails.send({
      from: "SketchSync <onboarding@resend.dev>",
      to: [email],
      subject: "Your SketchSync Admin Login Code",
      text: `Your login code is: ${otp}`,
    });

    if (resendError) {
      console.error("Resend error:", resendError);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
