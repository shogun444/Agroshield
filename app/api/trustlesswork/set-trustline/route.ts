import { NextResponse, type NextRequest } from "next/server";

const TW_BASE_URL = "https://dev.api.trustlesswork.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body ?? {};

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const response = await fetch(`${TW_BASE_URL}/helper/set-trustline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.TRUSTLESS_WORK_API_KEY || "",
      },
      body: JSON.stringify({ address }),
    });

    const raw = await response.text();
    console.log(`[TW_TRUSTLINE] Status: ${response.status}`);

    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (!response.ok) {
      console.error("[TW_TRUSTLINE_ERR]", raw);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[TW_TRUSTLINE_CRITICAL]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
