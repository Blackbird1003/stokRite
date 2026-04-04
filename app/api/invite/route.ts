import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET — verify an invite token and return basic user info
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { inviteToken: token } });

  if (!user || !user.inviteExpiry || user.inviteExpiry < new Date()) {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
  }

  return NextResponse.json({ name: user.name, email: user.email });
}

// POST — activate the account by setting a password
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });
    if (!password || password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { inviteToken: token } });

    if (!user || !user.inviteExpiry || user.inviteExpiry < new Date()) {
      return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        inviteToken: null,
        inviteExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite activation error:", error);
    return NextResponse.json({ error: "Failed to activate account" }, { status: 500 });
  }
}
