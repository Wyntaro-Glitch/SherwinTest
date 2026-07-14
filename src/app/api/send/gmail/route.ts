import { NextRequest, NextResponse } from "next/server";

interface GmailSendRequest {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

function buildRawMessage(from: string, to: string, subject: string, text: string): string {
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    text,
  ].join("\r\n");

  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, from, to, subject, text } = (await req.json()) as GmailSendRequest;

    if (!accessToken || !to || !subject) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: accessToken, to, subject" },
        { status: 400 }
      );
    }

    const rawMessage = buildRawMessage(from, to, subject, text);

    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: rawMessage }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      if (res.status === 401) {
        return NextResponse.json(
          { ok: false, error: "OAuth token expired. Please reconnect your Gmail account." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { ok: false, error: `Gmail API error ${res.status}: ${errBody}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
