import { NextRequest, NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?oauth_error=${encodeURIComponent(error)}`, APP_URL)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?oauth_error=no_code", APP_URL)
    );
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/settings?oauth_error=missing_config", APP_URL)
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "Token exchange failed");
      return NextResponse.redirect(
        new URL(`/settings?oauth_error=${encodeURIComponent(errText)}`, APP_URL)
      );
    }

    const tokens = await tokenRes.json();

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let email = "";
    let name = "";
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      email = userInfo.email || "";
      name = userInfo.name || "";
    }

    const stateData = {
      provider: "gmail" as const,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
      email,
      name,
      connectedAt: Date.now(),
    };

    const redirectUrl = new URL("/settings", APP_URL);
    redirectUrl.searchParams.set("oauth_success", "google");
    redirectUrl.searchParams.set("oauth_state", btoa(JSON.stringify(stateData)));

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/settings?oauth_error=${encodeURIComponent(msg)}`, APP_URL)
    );
  }
}
