import { NextResponse, type NextRequest } from "next/server";

const TW_ENDPOINT = "https://dev.api.trustlesswork.com/helper/send-transaction";

export async function POST(request: NextRequest) {
  try {
    const { signedXdr } = await request.json();
    if (!signedXdr) {
      return NextResponse.json({ error: "signedXdr is required" }, { status: 400 });
    }

    console.log(`[TW_PROXY_TX] Broadcasting to TESTNET: ${TW_ENDPOINT}`);

    const response = await fetch(TW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.TRUSTLESS_WORK_API_KEY || "",
      },
      body: JSON.stringify({ signedXdr }),
    });

    const raw = await response.text();
    console.log(`[TW_PROXY_TX] Status: ${response.status}`);
    
    // Attempt to parse as JSON for the response, but log the RAW text for diagnosis
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: "Failed to parse TW response as JSON", raw };
    }

    if (response.status !== 200) {
      console.log("========== RAW TW ERROR ==========");
      console.log(raw);
      console.log("==================================");
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[TW_PROXY_TX_CRITICAL_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
