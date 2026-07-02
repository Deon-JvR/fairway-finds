const {
  json,
  supabaseFetch,
} = require("./admin-shared");
const {
  ikhokhaConfig,
  ikhokhaSignature,
} = require("./ikhokha-shared");

function isPaidStatus(value) {
  return ["paid", "success", "successful", "complete", "completed", "approved"].includes(
    String(value || "").toLowerCase()
  );
}

function listingIdFromPayload(payload) {
  return payload?.metadata?.listingId ||
    payload?.listingId ||
    String(payload?.merchantReference || payload?.externalEntityID || "")
      .replace(/^FF-LISTING-/i, "");
}

function signatureMatches(event, rawBody, config) {
  if (!config.secret) return true;
  const provided = event.headers["ik-sign"] || event.headers["IK-SIGN"] || event.headers["x-ikhokha-signature"];
  if (!provided) return true;
  return provided === ikhokhaSignature(rawBody, config.secret);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  try {
    const rawBody = event.body || "{}";
    const config = ikhokhaConfig();
    if (!signatureMatches(event, rawBody, config)) {
      return json(401, { error: "Invalid iKhokha signature." });
    }

    const payload = JSON.parse(rawBody);
    const status = payload.status || payload.paymentStatus || payload.transactionStatus || payload.result;
    if (!isPaidStatus(status)) return json(200, { received: true, paid: false });

    const listingId = listingIdFromPayload(payload);
    if (!listingId || listingId.startsWith("FF-AD")) {
      return json(200, { received: true, paid: true });
    }

    const updates = {
      featured_payment_status: "paid",
      is_featured: true,
      featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabaseFetch(`/rest/v1/listings?id=eq.${encodeURIComponent(listingId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(updates),
    });

    return json(200, { received: true, paid: true, listingId });
  } catch (error) {
    return json(400, { error: error.message });
  }
};
