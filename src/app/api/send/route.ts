import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { host, port, user, pass, from, to, subject, text, html } = await req.json();

    if (!host || !port || !to || !subject) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: host, port, to, subject" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: user ? { user, pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    });

    await transporter.sendMail({
      from: from || user || "no-reply@sherwinmail.io",
      to,
      subject,
      text,
      html: html || text,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
