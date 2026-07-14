import { NextRequest, NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
const GOOGLE_SCOPES = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export async function GET(req: NextRequest) {
  const isCheck = req.nextUrl.searchParams.get("check") === "1";

  if (!GOOGLE_CLIENT_ID) {
    if (isCheck) {
      return NextResponse.json({ configured: false, error: "GOOGLE_CLIENT_ID missing" }, { status: 503 });
    }
    return NextResponse.redirect(
      new URL("/?error=google_client_id_missing", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  if (isCheck) {
    return NextResponse.json({ configured: true });
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
