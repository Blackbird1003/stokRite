import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

async function sendResetEmail(to: string, name: string, resetUrl: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Stokrite";

  if (!apiKey || !senderEmail) throw new Error("Brevo email config missing");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name }],
      subject: "Reset your Stokrite password",
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#4f46e5;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#475569;margin-bottom:4px;">Hi ${name},</p>
          <p style="color:#475569;margin-bottom:24px;">
            We received a request to reset your Stokrite password. Click the button below to choose a new one.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
            This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:8px;">
            Or copy this link: ${resetUrl}
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error: ${res.status} — ${err}`);
  }
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({ success: true });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://stok-rite.vercel.app";
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    await sendResetEmail(user.email, user.name, resetUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }
}
