const {
  getUserFromJwt,
  json,
  requireEnv,
  supabaseFetch,
} = require("./admin-shared");

function adminEmails() {
  return requireEnv("ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(event) {
  const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json(401, { error: "Sign in as admin." }) };

  const user = await getUserFromJwt(token);
  const email = user?.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) {
    return { error: json(403, { error: "This account is not a Fairway Finds admin." }) };
  }
  return { user };
}

async function listAdminQueue() {
  const settings = {
    directDealsEnabled: true,
    supabase: {
      urlConfigured: Boolean(process.env.SUPABASE_URL),
      anonKeyConfigured: Boolean(process.env.SUPABASE_ANON_KEY),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  };

  const [profiles, listings] = await Promise.all([
    supabaseFetch(
      "/rest/v1/profiles?verification_status=eq.pending&select=id,email,full_name,phone,address_line_1,suburb,city,province,postal_code,location,account_type,bio,verification_status,admin_notes,terms_accepted,terms_accepted_at,created_at&order=created_at.desc"
    ),
    supabaseFetch(
      "/rest/v1/listings?listing_review_status=eq.pending&status=eq.draft&select=id,seller_id,title,category,brand,model,condition,equipment_grade,price_cents,location,description,image_url,image_urls,listing_review_status,status,featured_requested,is_featured,featured_payment_status,featured_fee_cents,created_at&order=created_at.desc"
    ),
  ]);
  return { profiles, listings, orders: [], settings };
}

async function updateProfile({ id, status, adminNotes }) {
  if (!["approved", "rejected", "suspended"].includes(status)) {
    return json(400, { error: "Invalid profile status." });
  }
  const body = {
    verification_status: status,
    admin_notes: adminNotes || null,
    updated_at: new Date().toISOString(),
  };
  if (status === "approved") {
    body.verified_at = new Date().toISOString();
    body.approved_at = new Date().toISOString();
  }
  const profile = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return json(200, { profile: profile[0] });
}

async function updateListing({ id, status, adminNotes }) {
  if (!["approved", "rejected"].includes(status)) {
    return json(400, { error: "Invalid listing status." });
  }
  const listing = await supabaseFetch(`/rest/v1/listings?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      listing_review_status: status,
      status: status === "approved" ? "active" : "removed",
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  return json(200, { listing: listing[0] });
}

async function updateFeaturedListing({ id, status }) {
  if (!["active", "cancelled"].includes(status)) {
    return json(400, { error: "Invalid featured listing status." });
  }
  let requestedFeeCents = 4900;
  if (status === "active") {
    const existing = await supabaseFetch(
      `/rest/v1/listings?id=eq.${encodeURIComponent(id)}&select=featured_fee_cents`
    );
    requestedFeeCents = Number(existing?.[0]?.featured_fee_cents || 4900);
    if (!Number.isFinite(requestedFeeCents) || requestedFeeCents < 4900) requestedFeeCents = 4900;
  }
  const body = status === "active"
    ? {
      featured_requested: true,
      is_featured: true,
      featured_payment_status: "paid",
      featured_fee_cents: requestedFeeCents,
      featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }
    : {
      is_featured: false,
      featured_payment_status: "cancelled",
      updated_at: new Date().toISOString(),
    };

  const listing = await supabaseFetch(`/rest/v1/listings?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return json(200, { listing: listing[0] });
}

exports.handler = async (event) => {
  try {
    const admin = await requireAdmin(event);
    if (admin.error) return admin.error;

    if (event.httpMethod === "GET") return json(200, await listAdminQueue());
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

    const body = JSON.parse(event.body || "{}");
    if (body.type === "profile") return updateProfile(body);
    if (body.type === "listing") return updateListing(body);
    if (body.type === "featured") return updateFeaturedListing(body);
    return json(400, { error: "Unknown admin action." });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
