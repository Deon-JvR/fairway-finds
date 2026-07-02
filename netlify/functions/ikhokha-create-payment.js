const {
  getUserFromJwt,
  json,
  supabaseFetch,
} = require("./admin-shared");
const {
  ikhokhaConfig,
  ikhokhaHeaders,
  ikhokhaReady,
} = require("./ikhokha-shared");

function siteUrl(config) {
  return config.siteUrl || "https://fairwayfinds.co.za";
}

function paymentDescription(kind, listing) {
  if (kind === "advertising") return "Fairway Finds advertising placement";
  return Number(listing.featured_fee_cents || 0) >= 9900
    ? `Fairway Finds sponsored listing: ${listing.title}`
    : `Fairway Finds featured listing: ${listing.title}`;
}

function paymentAmount(kind, listing) {
  if (kind === "advertising") return Number(process.env.ADVERTISING_PAYMENT_CENTS || 0);
  return Number(listing.featured_fee_cents || 0);
}

function checkoutUrlFromResponse(data) {
  return data?.paymentUrl ||
    data?.payment_url ||
    data?.checkoutUrl ||
    data?.checkout_url ||
    data?.redirectUrl ||
    data?.redirect_url ||
    data?.url ||
    data?.data?.paymentUrl ||
    data?.data?.checkoutUrl ||
    data?.data?.redirectUrl;
}

async function requireUser(event) {
  const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json(401, { error: "Sign in before paying." }) };
  const user = await getUserFromJwt(token);
  if (!user?.id) return { error: json(401, { error: "Sign in before paying." }) };
  return { user };
}

async function loadApprovedListingForPayment(listingId, userId) {
  const listings = await supabaseFetch(
    `/rest/v1/listings?id=eq.${encodeURIComponent(listingId)}&seller_id=eq.${encodeURIComponent(userId)}&select=id,seller_id,title,category,brand,price_cents,listing_review_status,status,featured_requested,is_featured,featured_payment_status,featured_fee_cents`
  );
  const listing = listings?.[0];
  if (!listing) throw new Error("Listing not found for this seller.");
  if (listing.listing_review_status !== "approved" || listing.status !== "active") {
    throw new Error("Admin must approve this listing before payment.");
  }
  if (!listing.featured_requested) throw new Error("This listing has no featured or sponsored request.");
  if (listing.is_featured || listing.featured_payment_status === "paid") {
    throw new Error("This listing placement is already active.");
  }
  if (listing.featured_payment_status !== "pending_payment") {
    throw new Error("This listing is not waiting for payment.");
  }
  return listing;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  try {
    const config = ikhokhaConfig();
    if (!ikhokhaReady(config)) {
      return json(503, {
        error: "iKhokha is not configured yet. Add IKHOKHA_APP_ID, IKHOKHA_SECRET, and IKHOKHA_ENTITY_ID in Netlify.",
      });
    }

    const { user, error } = await requireUser(event);
    if (error) return error;

    const body = JSON.parse(event.body || "{}");
    const kind = body.kind === "advertising" ? "advertising" : "listing";
    const listing = kind === "listing"
      ? await loadApprovedListingForPayment(body.listingId, user.id)
      : null;
    const amountCents = paymentAmount(kind, listing);
    if (!amountCents || amountCents < 100) {
      throw new Error("Payment amount is not configured.");
    }

    const reference = kind === "advertising"
      ? `FF-AD-${user.id}-${Date.now()}`
      : `FF-LISTING-${listing.id}`;
    const rootUrl = siteUrl(config);
    const payload = {
      entityID: config.entityId,
      amount: amountCents,
      currency: "ZAR",
      merchantReference: reference,
      externalEntityID: reference,
      description: paymentDescription(kind, listing),
      successUrl: `${rootUrl}/payment-success?ref=${encodeURIComponent(reference)}`,
      failureUrl: `${rootUrl}/payment-failure?ref=${encodeURIComponent(reference)}`,
      cancelUrl: `${rootUrl}/dashboard`,
      notifyUrl: `${rootUrl}/.netlify/functions/ikhokha-webhook`,
      metadata: {
        kind,
        listingId: listing?.id || null,
        userId: user.id,
      },
    };
    const payloadText = JSON.stringify(payload);

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: ikhokhaHeaders(payloadText, config),
      body: payloadText,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `iKhokha payment failed: ${response.status}`);
    }

    const checkoutUrl = checkoutUrlFromResponse(data);
    if (!checkoutUrl) {
      return json(502, {
        error: "iKhokha did not return a checkout URL. Check the iKhokha API URL and account settings.",
        response: data,
      });
    }

    return json(200, {
      checkoutUrl,
      reference,
      kind,
      amountCents,
      currency: "ZAR",
      listing: listing ? {
        id: listing.id,
        seller_id: listing.seller_id,
        title: listing.title,
        category: listing.category,
        brand: listing.brand,
        price_cents: listing.price_cents,
      } : null,
    });
  } catch (error) {
    return json(400, { error: error.message });
  }
};
