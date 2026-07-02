const adminStatus = document.querySelector("[data-admin-status]");
const adminProfiles = document.querySelector("[data-admin-profiles]");
const adminListings = document.querySelector("[data-admin-listings]");
const adminSettings = document.querySelector("[data-admin-settings]");

function setAdminStatus(message, type = "info") {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.dataset.type = type;
}

function adminClient() {
  if (!window.fairwaySupabaseReady || !window.fairwaySupabase) {
    setAdminStatus("Supabase is not configured yet.", "error");
    return null;
  }
  return window.fairwaySupabase;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRand(cents) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Number(cents || 0) / 100);
}

function shortId(value) {
  const text = String(value || "");
  return text ? text.slice(0, 8) : "none";
}

function statusPill(label, isReady) {
  return `<span class="admin-setting-pill" data-ready="${isReady ? "yes" : "no"}">${escapeHtml(label)}: ${isReady ? "Configured" : "Missing"}</span>`;
}

async function adminToken() {
  const supabase = adminClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    window.location.href = "/account";
    return null;
  }
  return token;
}

function directResult(result, fallbackMessage) {
  if (result.error) throw new Error(result.error.message || fallbackMessage);
  return result.data;
}

async function adminDirectRequest(body) {
  const supabase = adminClient();
  if (!supabase) return null;

  if (!body) {
    const [profilesResult, listingsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,phone,address_line_1,suburb,city,province,postal_code,location,account_type,bio,verification_status,admin_notes,terms_accepted,terms_accepted_at,created_at")
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("listings")
        .select("id,seller_id,title,category,brand,model,condition,equipment_grade,price_cents,location,description,image_url,image_urls,listing_review_status,status,featured_requested,is_featured,featured_payment_status,featured_fee_cents,created_at")
        .eq("listing_review_status", "pending")
        .eq("status", "draft")
        .order("created_at", { ascending: false }),
    ]);
    return {
      profiles: directResult(profilesResult, "Could not load pending profiles."),
      listings: directResult(listingsResult, "Could not load pending listings."),
      settings: { backend: "supabase-rls" },
    };
  }

  if (body.type === "profile") {
    const update = {
      verification_status: body.status,
      admin_notes: body.adminNotes || null,
      updated_at: new Date().toISOString(),
    };
    if (body.status === "approved") {
      update.verified_at = new Date().toISOString();
      update.approved_at = new Date().toISOString();
    }
    const result = await supabase.from("profiles").update(update).eq("id", body.id).select();
    return { profile: directResult(result, "Could not update this profile.")?.[0] };
  }

  if (body.type === "listing") {
    const result = await supabase
      .from("listings")
      .update({
        listing_review_status: body.status,
        status: body.status === "approved" ? "active" : "removed",
        admin_notes: body.adminNotes || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select();
    return { listing: directResult(result, "Could not update this listing.")?.[0] };
  }

  if (body.type === "featured") {
    const update = body.status === "active"
      ? {
        featured_requested: true,
        is_featured: true,
        featured_payment_status: "paid",
        featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }
      : {
        is_featured: false,
        featured_payment_status: "cancelled",
        updated_at: new Date().toISOString(),
      };
    const result = await supabase.from("listings").update(update).eq("id", body.id).select();
    return { listing: directResult(result, "Could not update this promotion.")?.[0] };
  }

  throw new Error("Unknown admin action.");
}

async function adminRequest(body) {
  const token = await adminToken();
  if (!token) return null;
  const response = await fetch("/.netlify/functions/admin-api", {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const responseText = await response.text();
  let result;
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    return adminDirectRequest(body);
  }
  if (response.status === 404) return adminDirectRequest(body);
  if (!response.ok) throw new Error(result.error || "Admin request failed.");
  return result;
}

function renderProfiles(profiles) {
  if (!adminProfiles) return;
  adminProfiles.innerHTML = profiles.length
    ? profiles.map((profile) => {
        const address = [
          profile.address_line_1,
          profile.suburb,
          profile.city,
          profile.province,
          profile.postal_code,
        ].filter(Boolean).join(", ") || profile.location || "No address saved yet";
        return `
        <article class="admin-card">
          <h3>${escapeHtml(profile.full_name || "Unnamed profile")}</h3>
          <p><strong>Email:</strong> ${escapeHtml(profile.email || "No email saved yet")}</p>
          <p><strong>Phone:</strong> ${escapeHtml(profile.phone || "No phone")} - <strong>Access:</strong> Buyer and seller</p>
          <p><strong>Address:</strong> ${escapeHtml(address)}</p>
          <p><strong>Terms:</strong> ${profile.terms_accepted ? "Accepted" : "Not accepted"}${profile.terms_accepted_at ? ` - ${escapeHtml(new Date(profile.terms_accepted_at).toLocaleString())}` : ""}</p>
          <textarea data-admin-notes="${profile.id}" rows="2" placeholder="Admin notes"></textarea>
          <div class="admin-actions">
            <button type="button" data-admin-action="profile:approved:${profile.id}">Approve</button>
            <button class="danger" type="button" data-admin-action="profile:rejected:${profile.id}">Reject</button>
            <button class="danger" type="button" data-admin-action="profile:suspended:${profile.id}">Suspend</button>
          </div>
        </article>
      `;
      }).join("")
    : '<p class="empty-state">No pending profiles.</p>';
}

function renderListings(listings) {
  if (!adminListings) return;
  adminListings.innerHTML = listings.length
    ? listings.map((listing) => `
        <article class="admin-card">
          <h3>${escapeHtml(listing.title)}</h3>
          <p>${escapeHtml(listing.category)} - ${escapeHtml(listing.condition)} - ${formatRand(listing.price_cents)}</p>
          ${listing.featured_requested ? `<p><strong>${Number(listing.featured_fee_cents || 0) >= 9900 ? "Sponsored request" : "Featured request"}:</strong> ${listing.is_featured ? "Active" : "Payment/admin confirmation needed"} - ${formatRand(listing.featured_fee_cents || 4900)}</p>` : ""}
          <p>${escapeHtml(listing.description)}</p>
          ${listing.image_url ? `<a class="text-action" href="${escapeHtml(listing.image_url)}" target="_blank" rel="noreferrer">View photos</a>` : ""}
          <textarea data-admin-notes="${listing.id}" rows="2" placeholder="Admin notes"></textarea>
          <div class="admin-actions">
            <button type="button" data-admin-action="listing:approved:${listing.id}">Approve listing</button>
            <button class="danger" type="button" data-admin-action="listing:rejected:${listing.id}">Reject listing</button>
            ${listing.featured_requested && !listing.is_featured ? `<button type="button" data-admin-action="featured:active:${listing.id}">Mark ${Number(listing.featured_fee_cents || 0) >= 9900 ? "sponsored" : "featured"} paid</button>` : ""}
            ${listing.is_featured ? `<button class="danger" type="button" data-admin-action="featured:cancelled:${listing.id}">Stop promotion</button>` : ""}
          </div>
        </article>
      `).join("")
    : '<p class="empty-state">No pending listings.</p>';
}

function renderSettings(settings) {
  if (!adminSettings) return;
  if (settings?.backend === "supabase-rls") {
    adminSettings.innerHTML = `
      <article class="admin-card">
        <h3>Secure marketplace administration</h3>
        <p>Profile and listing approvals are protected by Supabase database permissions for the Fairway Finds admin account.</p>
        <div class="admin-setting-list">
          ${statusPill("Admin approval access", true)}
          ${statusPill("Direct buyer-seller marketplace", true)}
        </div>
      </article>
    `;
    return;
  }
  const supabase = settings?.supabase || {};
  adminSettings.innerHTML = `
    <article class="admin-card">
      <h3>Direct buyer-seller deals</h3>
      <p>Buyer payment and delivery gateways are disabled. Buyers and sellers arrange item payment, collection, and delivery directly. iKhokha is used only for Fairway Finds featured, sponsored, and advertising payments.</p>
      <p><strong>Listing warning:</strong> Fairway Finds is a marketplace connecting buyers and sellers. Payments and deliveries are arranged directly between parties. Never pay for goods before verifying the seller.</p>
    </article>
    <article class="admin-card">
      <h3>Supabase connection</h3>
      <p>The admin page reads and updates profiles and listings through the service-role Netlify function.</p>
      <div class="admin-setting-list">
        ${statusPill("SUPABASE_URL", supabase.urlConfigured)}
        ${statusPill("SUPABASE_ANON_KEY", supabase.anonKeyConfigured)}
        ${statusPill("SUPABASE_SERVICE_ROLE_KEY", supabase.serviceRoleConfigured)}
      </div>
    </article>
    <article class="admin-card">
      <h3>Where to edit settings</h3>
      <p>Update Supabase and admin values in Netlify under Site configuration, Environment variables.</p>
      <p>Secret values are intentionally hidden from this admin page.</p>
    </article>
  `;
}

async function loadAdminQueue() {
  try {
    setAdminStatus("Loading admin queue...");
    const data = await adminRequest();
    if (!data) return;
    renderProfiles(data.profiles || []);
    renderListings(data.listings || []);
    renderSettings(data.settings || {});
    setAdminStatus("Admin queue loaded.", "success");
  } catch (error) {
    setAdminStatus(error.message, "error");
  }
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-admin-action]");
  if (!button) return;
  const [type, status, id] = button.dataset.adminAction.split(":");
  const notes = document.querySelector(`[data-admin-notes="${id}"]`)?.value || "";

  button.disabled = true;
  try {
    await adminRequest({ type, status, id, adminNotes: notes });
    setAdminStatus(`${type === "profile" ? "Profile" : type === "featured" ? "Featured listing" : "Listing"} ${status}.`, "success");
    await loadAdminQueue();
  } catch (error) {
    setAdminStatus(error.message, "error");
    button.disabled = false;
  }
});

loadAdminQueue();
