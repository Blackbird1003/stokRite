import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

async function sendInviteEmail(to: string, name: string, adminName: string, inviteUrl: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Stokrite";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email config missing");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name }],
      subject: "You've been invited to join Stokrite",
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#4f46e5;margin-bottom:8px;">You're invited to Stokrite</h2>
          <p style="color:#475569;margin-bottom:4px;">Hi ${name},</p>
          <p style="color:#475569;margin-bottom:24px;">
            <strong>${adminName}</strong> has added you as a staff member on Stokrite.
            Click the button below to set your password and activate your account.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
            Activate My Account
          </a>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
            This link expires in 7 days. If you did not expect this email, you can safely ignore it.
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:8px;">
            Or copy this link: ${inviteUrl}
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

// GET — list all staff members belonging to this admin
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const staff = await prisma.user.findMany({
    where: { ownerId: session.user.actualUserId },
    select: { id: true, name: true, email: true, createdAt: true, password: true },
    orderBy: { createdAt: "asc" },
  });

  const result = staff.map(({ password, ...s }) => ({
    ...s,
    activated: !!password,
  }));

  return NextResponse.json({ staff: result });
}

// POST — invite a new staff member via email
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, email } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const staff = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: null,
        role: "STAFF",
        ownerId: session.user.actualUserId,
        inviteToken,
        inviteExpiry,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite?token=${inviteToken}`;
    const adminName = session.user.name || "Your manager";

    await sendInviteEmail(email.trim().toLowerCase(), name.trim(), adminName, inviteUrl);

    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    console.error("Invite staff error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}

// DELETE — remove a staff member (must belong to this admin)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { staffId } = await req.json();
    if (!staffId) return NextResponse.json({ error: "staffId is required" }, { status: 400 });

    const staffMember = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staffMember || staffMember.ownerId !== session.user.actualUserId)
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    await prisma.user.delete({ where: { id: staffId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete staff error:", error);
    return NextResponse.json({ error: "Failed to remove staff member" }, { status: 500 });
  }
}
