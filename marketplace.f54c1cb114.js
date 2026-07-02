const listingForm = document.querySelector("[data-listing-form]");
const listingGrid = document.querySelector("[data-dynamic-listings]");
const featuredListingsBand = document.querySelector("[data-featured-listings]");
const browseFilters = document.querySelector("[data-browse-filters]");
const homeSearch = document.querySelector("[data-home-search]");
const categoryShortcuts = document.querySelector("[data-category-shortcuts]");
const listingDetail = document.querySelector("[data-listing-detail]");
const topFeatureListing = document.querySelector("[data-top-feature-listing]");
const sellerListings = document.querySelector("[data-seller-listings]");
const dashboardTotalListings = document.querySelector("[data-dashboard-total-listings]");
const dashboardListingBreakdown = document.querySelector("[data-dashboard-listing-breakdown]");
const dashboardTotalFeatured = document.querySelector("[data-dashboard-total-featured]");
const dashboardFeaturedBreakdown = document.querySelector("[data-dashboard-featured-breakdown]");
const dashboardSearch = document.querySelector("[data-dashboard-search]");
const marketplaceStatus = document.querySelector("[data-marketplace-status]");
const marketplaceApproval = document.querySelector("[data-marketplace-approval]");
const priceInput = document.querySelector("[data-price-input]");
const directDealPreview = document.querySelector("[data-payout-preview]");
const priceCategory = document.querySelector("[data-price-category]");
const priceCondition = document.querySelector("[data-price-condition]");
const priceRecommendation = document.querySelector("[data-price-recommendation]");
const imageUploadStatus = document.querySelector("[data-image-upload-status]");
let lastTrackedSearch = "";
let lastTrackedCategory = "";
const FAVOURITE_LISTINGS_KEY = "fairway_favourite_listings";

function listingEventParameters(listing = {}, overrides = {}) {
  return {
    listing_id: listing.id || overrides.listing_id,
    listing_title: listing.title || overrides.listing_title,
    category: listing.category || overrides.category,
    brand: listing.brand || overrides.brand,
    price: listing.price_cents !== undefined ? Number(listing.price_cents || 0) / 100 : overrides.price,
    seller_id: listing.seller_id || overrides.seller_id,
    currency: "ZAR",
    ...overrides,
  };
}

function favouriteListingIds() {
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVOURITE_LISTINGS_KEY) || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch (error) {
    return [];
  }
}

function setFavouriteListingIds(ids) {
  try {
    window.localStorage.setItem(FAVOURITE_LISTINGS_KEY, JSON.stringify([...new Set(ids.map(String))]));
  } catch (error) {
    // Favourites remain optional when browser storage is unavailable.
  }
}

function trackMarketplaceSearch(value) {
  const searchTerm = String(value || "").trim();
  if (!searchTerm || searchTerm === lastTrackedSearch) return;
  lastTrackedSearch = searchTerm;
  window.fairwayTrack?.("search_performed", { search_term: searchTerm });
}

function trackCategoryView(value) {
  const category = String(value || "").trim();
  if (!category || category === "all" || category === lastTrackedCategory) return;
  lastTrackedCategory = category;
  window.fairwayTrack?.("category_viewed", { category });
}

function marketplaceClient() {
  if (!window.fairwaySupabaseReady || !window.fairwaySupabase) {
    setMarketplaceStatus("Supabase is not configured yet.", "error");
    return null;
  }
  return window.fairwaySupabase;
}

function setMarketplaceStatus(message, type = "info") {
  if (!marketplaceStatus) return;
  marketplaceStatus.textContent = message;
  marketplaceStatus.dataset.type = type;
}

function setImageUploadStatus(message, type = "info") {
  if (!imageUploadStatus) return;
  imageUploadStatus.textContent = message;
  imageUploadStatus.dataset.type = type;
}

function formatRand(cents) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function whatsappNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}

function whatsappSellerLink(phone, listingTitle) {
  const number = whatsappNumber(phone);
  if (!number) return "";
  const message = encodeURIComponent(`Hi, I saw your ${listingTitle || "golf listing"} on Fairway Finds. Is it still available?`);
  return `https://wa.me/${number}?text=${message}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImageUrl(value) {
  const url = String(value || "").trim();
  return url.startsWith("https://") ? url : "";
}

function optimizedListingImageUrl(value, width, options = {}) {
  const imageUrl = safeImageUrl(value);
  if (!imageUrl) return "";
  try {
    const url = new URL(imageUrl, window.location.origin);
    if (url.hostname !== "pyisbtqrwzqxlteibdqp.supabase.co") return imageUrl;
    const params = new URLSearchParams({ url: imageUrl, w: String(width), q: "78" });
    if (options.crop) {
      params.set("h", String(Math.round(width * 0.75)));
      params.set("fit", "cover");
      params.set("position", "center");
    }
    return `/.netlify/images?${params.toString()}`;
  } catch (error) {
    return imageUrl;
  }
}

function listingImageSrcset(value, options = {}) {
  return [320, 640, 960, 1280]
    .map((width) => `${optimizedListingImageUrl(value, width, options)} ${width}w`)
    .join(", ");
}

function renderListingImage(url, className, alt = "", options = {}) {
  const imageUrl = safeImageUrl(url);
  if (!imageUrl) return "";
  const loading = options.eager ? "eager" : "lazy";
  const sizes = options.sizes || "(max-width: 720px) 100vw, 33vw";
  return `<img class="${className}" src="${escapeHtml(optimizedListingImageUrl(imageUrl, 800, options))}" srcset="${escapeHtml(listingImageSrcset(imageUrl, options))}" data-fallback-src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" width="800" height="600" loading="${loading}" decoding="async" fetchpriority="${options.highPriority ? "high" : "low"}" sizes="${escapeHtml(sizes)}" onerror="if(this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;this.srcset='';delete this.dataset.fallbackSrc;return;}this.hidden=true;this.closest('.photo-art')?.classList.add('image-load-failed');" />`;
}

function listingPublicUrl(listing) {
  if (window.fairwaySeo?.listingUrl) {
    return window.fairwaySeo.listingUrl(listing).replace("https://fairwayfinds.co.za", "");
  }
  const slug = String(listing?.title || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `/listing/${encodeURIComponent(listing.id)}/${slug || "listing"}`;
}

function renderGolfPlaceholder(label = "Golf club image") {
  return `
    <div class="golf-placeholder" aria-label="${escapeHtml(label)}" role="img">
      <span class="placeholder-sun"></span>
      <span class="placeholder-fairway"></span>
      <span class="placeholder-club club-back"></span>
      <span class="placeholder-club club-front"></span>
      <span class="placeholder-head head-back"></span>
      <span class="placeholder-head head-front"></span>
      <span class="placeholder-ball"></span>
    </div>
  `;
}

function normalizeImageUrls(value) {
  if (Array.isArray(value)) return value.map(safeImageUrl).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(safeImageUrl).filter(Boolean);
    } catch (error) {
      return safeImageUrl(value) ? [safeImageUrl(value)] : [];
    }
  }
  return [];
}

function listingImages(listing) {
  const urls = normalizeImageUrls(listing?.image_urls);
  const mainImage = safeImageUrl(listing?.image_url);
  return mainImage && !urls.includes(mainImage) ? [mainImage, ...urls] : urls;
}

function primaryListingImage(listing) {
  return listingImages(listing)[0] || "";
}

function renderListingGallery(listing) {
  const urls = listingImages(listing);
  if (!urls.length) return renderGolfPlaceholder(`${listing.title || "Listing"} placeholder image`);
  return `
    <div class="listing-gallery">
      ${urls.map((url, index) => `
        <img class="listing-gallery-photo" src="${escapeHtml(optimizedListingImageUrl(url, 1200))}" srcset="${escapeHtml(listingImageSrcset(url))}" data-fallback-src="${escapeHtml(url)}" alt="${escapeHtml(`${listing.title} photo ${index + 1}`)}" width="1200" height="900" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" fetchpriority="${index === 0 ? "high" : "low"}" sizes="(max-width: 900px) 100vw, 50vw" onerror="if(this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;this.srcset='';delete this.dataset.fallbackSrc;return;}this.hidden=true;this.closest('.listing-detail-art')?.classList.add('image-load-failed');" />
      `).join("")}
    </div>
  `;
}

function escapeSearchValue(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", " ");
}

function formatGrade(value) {
  const labels = {
    new: "New",
    like_new: "Like new",
    excellent: "Excellent",
    very_good: "Very good",
    good: "Good",
    fair: "Fair",
    for_parts: "For parts or repair",
  };
  return labels[value] || "Not graded";
}

function recommendedPriceRange(category, condition) {
  const categoryRanges = {
    Clubs: [900, 6500],
    Bags: [700, 3500],
    Tech: [1200, 7000],
    Accessories: [150, 1800],
    Shoes: [450, 2200],
  };
  const conditionFactors = {
    "Like new": [0.9, 1.15],
    Excellent: [0.78, 1],
    "Very good": [0.62, 0.82],
    Good: [0.48, 0.68],
    Used: [0.32, 0.52],
  };
  const base = categoryRanges[category] || [300, 3000];
  const factor = conditionFactors[condition] || [0.5, 0.8];
  return [
    Math.round((base[0] * factor[0]) / 50) * 50,
    Math.round((base[1] * factor[1]) / 50) * 50,
  ];
}

function updatePriceRecommendation() {
  if (!priceRecommendation || !priceCategory || !priceCondition) return;
  const [low, high] = recommendedPriceRange(priceCategory.value, priceCondition.value);
  priceRecommendation.innerHTML = `
    <span>Recommended range</span>
    <strong>R${low.toLocaleString("en-ZA")} - R${high.toLocaleString("en-ZA")}</strong>
    <small>Guidance only. Adjust for brand, age, extras, and proof of condition.</small>
  `;
}

function updateDirectDealPreview() {
  if (!priceInput || !directDealPreview) return;
  const priceRand = Number(priceInput.value || 0);
  const priceCents = Math.max(0, Math.round(priceRand * 100));
  directDealPreview.innerHTML = `
    <span>Standard listing: Free</span>
    <strong>Buyer and seller arrange ${formatRand(priceCents)} directly</strong>
  `;
}

function formatListingReview(status) {
  const labels = {
    pending: "Pending admin review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status] || "Pending admin review";
}

function formatListingStatus(status) {
  const labels = {
    draft: "Draft",
    active: "Active",
    reserved: "Reserved",
    sold: "Sold",
    removed: "Removed",
  };
  return labels[status] || status;
}

function formatFeaturedStatus(listing) {
  if (listing?.is_featured && Number(listing?.featured_fee_cents || 0) >= 9900) return "Sponsored";
  if (listing?.is_featured) return "Featured";
  if (listing?.featured_requested && Number(listing?.featured_fee_cents || 0) >= 9900) return "Sponsored requested";
  if (listing?.featured_requested) return "Featured requested";
  return "";
}

function paymentLinks() {
  return window.fairwayPaymentLinks || {};
}

function promotionPaymentLink(listing) {
  const links = paymentLinks();
  return Number(listing?.featured_fee_cents || 0) >= 9900
    ? links.sponsoredListing
    : links.featuredListing;
}

function promotionPaymentLabel(listing) {
  return Number(listing?.featured_fee_cents || 0) >= 9900
    ? "Pay R99 sponsored"
    : "Pay R49 featured";
}

function shouldShowPromotionPayment(listing) {
  return listing?.listing_review_status === "approved" &&
    listing?.featured_requested &&
    !listing?.is_featured &&
    listing?.featured_payment_status === "pending_payment";
}

function renderPromotionPaymentAction(listing) {
  if (!shouldShowPromotionPayment(listing)) return "";
  const paymentNote = `
    <span class="seller-payment-note">Payment is shown after admin approval. Your placement activates automatically after iKhokha confirms payment.</span>
  `;
  return `
    <button class="seller-payment-action" type="button" data-pay-promotion="${escapeHtml(listing.id)}">
      ${escapeHtml(promotionPaymentLabel(listing))}
    </button>
    ${paymentNote}
  `;
}

async function startIkhokhaPayment({ kind = "listing", listingId } = {}) {
  const supabase = marketplaceClient();
  const { data } = supabase ? await supabase.auth.getSession() : { data: null };
  const token = data?.session?.access_token;
  if (!token) throw new Error("Sign in before paying.");

  const response = await fetch("/.netlify/functions/ikhokha-create-payment", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ kind, listingId }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not start iKhokha payment.");
  if (!result.checkoutUrl) throw new Error("iKhokha did not return a payment page.");
  const checkoutParameters = listingEventParameters(result.listing || {}, {
    listing_id: result.listing?.id || listingId,
    seller_id: result.listing?.seller_id || data.session.user.id,
    payment_type: kind === "advertising" ? "advertising" : "listing_promotion",
    payment_amount: Number(result.amountCents || 0) / 100,
    currency: result.currency || "ZAR",
    transaction_id: result.reference,
    user_type: "buyer_seller",
  });
  try {
    window.localStorage.setItem(`fairway_checkout_${result.reference}`, JSON.stringify(checkoutParameters));
  } catch (error) {
    // Checkout tracking still works when browser storage is unavailable.
  }
  window.fairwayTrackOnce?.("checkout_started", result.reference, checkoutParameters);
  window.location.href = result.checkoutUrl;
}

function applyPaymentLinks() {
  const links = paymentLinks();
  document.querySelectorAll("[data-payment-link]").forEach((link) => {
    const key = link.dataset.paymentLink;
    if (links[key]) {
      link.href = links[key];
      link.target = "_blank";
      link.rel = "noopener";
    } else if (key === "advertising") {
      link.dataset.ikhokhaAdvertising = "";
    }
  });
}

document.addEventListener("click", async (event) => {
  const advertisingButton = event.target.closest("[data-ikhokha-advertising]");
  if (!advertisingButton) return;
  event.preventDefault();
  advertisingButton.setAttribute("aria-disabled", "true");
  const originalText = advertisingButton.textContent;
  advertisingButton.textContent = "Opening iKhokha...";
  try {
    await startIkhokhaPayment({ kind: "advertising" });
  } catch (error) {
    setMarketplaceStatus(error.message, "error");
    advertisingButton.removeAttribute("aria-disabled");
    advertisingButton.textContent = originalText;
  }
});

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sellerDisplayName(seller) {
  return seller?.full_name || "Fairway Finds seller";
}

function sellerDisplayLocation(seller, fallback = "") {
  return seller?.location || [seller?.city, seller?.province].filter(Boolean).join(", ") || fallback;
}

function renderWhatsAppSellerAction(phone, listingTitle, compact = false, listingId = "", listing = {}) {
  const href = whatsappSellerLink(phone, listingTitle);
  if (!href) return "";
  return `
    <a class="whatsapp-seller-action${compact ? " compact" : ""}" href="${escapeHtml(href)}" target="_blank" rel="noopener" aria-label="WhatsApp seller" data-seller-contact="whatsapp" data-listing-id="${escapeHtml(listingId)}" data-listing-title="${escapeHtml(listingTitle || "")}" data-listing-category="${escapeHtml(listing.category || "")}" data-listing-brand="${escapeHtml(listing.brand || "")}" data-listing-price="${Number(listing.price_cents || 0) / 100}" data-seller-id="${escapeHtml(listing.seller_id || "")}">
      <svg class="whatsapp-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M16 3.2A12.5 12.5 0 0 0 5.4 22.4L4 29l6.8-1.8A12.5 12.5 0 1 0 16 3.2Zm0 22.8c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4 1 1.1-3.9-.3-.4A10.1 10.1 0 1 1 16 26Zm5.8-7.6c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6 0-.2-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z" />
      </svg>
      ${compact ? "" : "<span>WhatsApp seller</span>"}
    </a>
  `;
}

async function loadTopFeatureListing() {
  const supabase = marketplaceClient();
  if (!supabase || !topFeatureListing) return;

  const { data, error } = await supabase
    .from("listings")
    .select("id, seller_id, title, condition, price_cents, location, description, image_url, image_urls, featured_fee_cents")
    .eq("status", "active")
    .eq("listing_review_status", "approved")
    .eq("is_featured", true)
    .gte("featured_fee_cents", 9900)
    .order("featured_fee_cents", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data?.length) return;

  const listing = data[0];
  const { data: seller } = await supabase
    .from("profiles")
    .select("full_name, phone, location, city, province")
    .eq("id", listing.seller_id)
    .maybeSingle();

  const imageUrl = primaryListingImage(listing);
  topFeatureListing.innerHTML = `
    <a class="top-feature-card" href="${escapeHtml(listingPublicUrl(listing))}" aria-label="View top featured listing">
      <div class="top-feature-media ${imageUrl ? "has-photo" : "top-feature-fallback"}">
        ${imageUrl ? renderListingImage(imageUrl, "top-feature-photo", listing.title, { eager: true, highPriority: true, sizes: "(max-width: 900px) 100vw, 55vw" }) : ""}
        <span class="featured-badge">Top featured</span>
      </div>
      <div class="top-feature-info">
        <p class="condition">${escapeHtml(listing.condition)}</p>
        <h2>${escapeHtml(listing.title)}</h2>
        <p class="listing-description">${escapeHtml(listing.description)}</p>
        <div class="seller-mini">
          <strong>${escapeHtml(sellerDisplayName(seller))}</strong>
          <span>${escapeHtml(listing.location)}</span>
        </div>
        <div class="price-row"><strong>${formatRand(listing.price_cents)}</strong><span>${escapeHtml(listing.location)}</span></div>
      </div>
    </a>
    ${renderWhatsAppSellerAction(seller?.phone, listing.title, false, listing.id, listing)}
  `;
}

function applyDashboardSearch() {
  if (!dashboardSearch) return;
  const term = dashboardSearch.value.trim().toLowerCase();
  document.querySelectorAll("[data-dashboard-search-text]").forEach((item) => {
    const text = item.dataset.dashboardSearchText || "";
    item.hidden = Boolean(term) && !text.includes(term);
  });
}

function safeFileName(name) {
  return String(name || "listing-image")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isImageFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  const supportedType = /^(image\/(jpeg|png|gif|webp|heic|heif|avif|bmp|tiff))$/i.test(type);
  const supportedExtension = /\.(jpe?g|jfif|png|gif|webp|heic|heif|avif|bmp|tiff?)$/i.test(name);
  return supportedType || ((!type || type === "application/octet-stream") && supportedExtension);
}

function validateListingImageFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => file && file.size);
  if (files.length > 8) throw new Error("Please upload no more than 8 photos per listing.");
  files.forEach((file) => {
    if (!isImageFile(file)) {
      throw new Error(`${file.name || "Selected file"} is not a supported image. Use JPG, PNG, WebP, HEIC, AVIF, BMP, or TIFF.`);
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${file.name || "Selected image"} is larger than 10 MB. Please choose a smaller photo.`);
    }
  });
  return files;
}

function imageContentType(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) return type;
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".jfif")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".avif")) return "image/avif";
  if (name.endsWith(".bmp")) return "image/bmp";
  if (name.endsWith(".tif") || name.endsWith(".tiff")) return "image/tiff";
  return "image/jpeg";
}

function isHeicFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  return type === "image/heic" || type === "image/heif" || /\.(heic|heif)$/i.test(name);
}

let heicConverterPromise;

function loadHeicConverter() {
  if (window.heic2any) return Promise.resolve();
  if (!heicConverterPromise) {
    heicConverterPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load the HEIC photo converter. Please upload JPG or PNG photos, or try again."));
      document.head.appendChild(script);
    });
  }
  return heicConverterPromise;
}

async function prepareImageForUpload(file) {
  let source = file;
  if (isHeicFile(file)) {
    setImageUploadStatus("Converting iPhone photo for web display...", "info");
    await loadHeicConverter();
    const converted = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.88 });
    source = Array.isArray(converted) ? converted[0] : converted;
  }

  setImageUploadStatus("Optimising photo size and quality...", "info");
  let bitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch (error) {
    bitmap = await createImageBitmap(source);
  }
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const webpBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not optimise this photo.")), "image/webp", 0.82);
  });
  const baseName = safeFileName(file.name).replace(/\.[^.]+$/, "") || "listing-photo";
  return new File([webpBlob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
}

function withTimeout(promise, milliseconds, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

async function uploadListingImage(supabase, user, file) {
  if (!file || !file.size) return "";
  if (!isImageFile(file)) {
    throw new Error("Please upload a photo file. JPG, PNG, WebP, HEIC, AVIF, BMP, and TIFF are supported.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Please upload an image smaller than 10 MB.");
  }

  const uploadFile = await withTimeout(
    prepareImageForUpload(file),
    25000,
    "Photo preparation timed out. Please try a smaller JPG, PNG, or WebP image."
  );
  const path = `listings/${user.id}/${Date.now()}-${safeFileName(uploadFile.name)}`;
  setImageUploadStatus("Uploading image. This can take a few seconds...", "info");
  const { error } = await withTimeout(
    supabase.storage
      .from("listing-images")
      .upload(path, uploadFile, {
        cacheControl: "31536000",
        upsert: false,
        contentType: imageContentType(uploadFile),
      }),
    30000,
    "Image upload timed out. Check that the Supabase listing-images storage setup was run, then try a smaller image."
  );

  if (error) throw error;

  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  setImageUploadStatus("Image uploaded.", "success");
  return { url: data.publicUrl, path };
}

async function uploadListingImages(supabase, user, fileList) {
  const files = validateListingImageFiles(fileList);
  if (!files.length) return [];

  const uploads = [];
  try {
    for (const [index, file] of files.entries()) {
      setImageUploadStatus(`Uploading photo ${index + 1} of ${files.length}...`, "info");
      uploads.push(await uploadListingImage(supabase, user, file));
    }
  } catch (error) {
    const uploadedPaths = uploads.map((upload) => upload.path).filter(Boolean);
    if (uploadedPaths.length) {
      await withTimeout(
        supabase.storage.from("listing-images").remove(uploadedPaths),
        10000,
        "Photo cleanup timed out."
      ).catch(() => {});
    }
    throw new Error(`Photo replacement failed. Your existing photos were kept. ${error.message || "Please try again."}`);
  }
  const urls = uploads.map((upload) => upload.url);
  setImageUploadStatus(`${urls.length} photo${urls.length === 1 ? "" : "s"} uploaded.`, "success");
  return urls;
}

async function requireUser({ redirect = true } = {}) {
  const supabase = marketplaceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    if (redirect) window.location.href = "/account";
    return null;
  }
  return data.user;
}

async function getCurrentProfile(options) {
  const supabase = marketplaceClient();
  const user = await requireUser(options);
  if (!supabase || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, account_type, verification_status, admin_notes")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    setMarketplaceStatus(error.message, "error");
    return null;
  }

  return data || {
    id: user.id,
    account_type: "buyer_seller",
    verification_status: "pending",
  };
}

function approvalMessage(profile) {
  const status = profile?.verification_status || "pending";
  const messages = {
    pending: "Pending admin approval. Buying and selling are disabled until Fairway Finds verifies your profile.",
    approved: "Verified and approved.",
    rejected: "Verification rejected. Contact Fairway Finds support.",
    suspended: "Account suspended. Buying and selling are disabled.",
  };
  return messages[status] || messages.pending;
}

function renderMarketplaceApproval(profile) {
  if (!marketplaceApproval) return;
  const status = profile?.verification_status || "pending";
  marketplaceApproval.textContent = approvalMessage(profile);
  marketplaceApproval.dataset.status = status;
}

function profileCanSell(profile) {
  return profile?.verification_status === "approved";
}

function profileCanBuy(profile) {
  return profile?.verification_status === "approved";
}

async function loadListings() {
  const supabase = marketplaceClient();
  if (!supabase || !listingGrid) return;

  const formData = browseFilters ? new FormData(browseFilters) : new FormData();
  const selectedCategory = String(formData.get("category") || "all");
  const selectedCondition = String(formData.get("condition") || "all");
  const search = escapeSearchValue(formData.get("search")).trim();
  window.fairwaySeo?.updateBrowse({ category: selectedCategory, search });
  let query = supabase
    .from("listings")
    .select("id, seller_id, title, category, brand, model, condition, equipment_grade, price_cents, location, description, image_url, image_urls, status, featured_requested, is_featured, featured_payment_status, featured_fee_cents")
    .in("status", ["active", "reserved", "sold"])
    .order("is_featured", { ascending: false })
    .order("featured_fee_cents", { ascending: false })
    .order("created_at", { ascending: false });

  if (selectedCategory !== "all") {
    query = query.eq("category", selectedCategory);
  }

  if (selectedCondition !== "all") {
    query = query.eq("condition", selectedCondition);
  }

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(`title.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`);
  }

  const { data, error } = await query;

  if (error) {
    setMarketplaceStatus(error.message, "error");
    return;
  }

  const featuredListings = data.filter((listing) => listing.is_featured);
  const standardListings = data.filter((listing) => !listing.is_featured);
  if (!data.length) {
    if (featuredListingsBand) featuredListingsBand.innerHTML = "";
    listingGrid.innerHTML = '<p class="empty-state">No listings match that search yet.</p>';
    return;
  }

  const sellerIds = [...new Set(data.map((listing) => listing.seller_id).filter(Boolean))];
  let sellersById = {};
  if (sellerIds.length) {
    const { data: sellers } = await supabase
      .from("profiles")
      .select("id, full_name, phone, location, city, province")
      .in("id", sellerIds);
    sellersById = (sellers || []).reduce((map, seller) => {
      map[seller.id] = seller;
      return map;
    }, {});
  }

  if (featuredListingsBand) {
    featuredListingsBand.innerHTML = featuredListings.length
      ? `
        <div class="featured-band-heading">
          <p class="eyebrow">Featured listings</p>
          <h2>Seller picks kept at the top.</h2>
        </div>
        <div class="featured-listings-row">
          ${featuredListings.map((listing) => renderListingCard(listing, sellersById[listing.seller_id], true)).join("")}
        </div>
      `
      : `
        <div class="featured-band-empty">
          <p class="eyebrow">Featured listings</p>
          <h2>Reserved for paid seller visibility.</h2>
          <a class="header-action" href="/create-listing">Feature a listing</a>
        </div>
      `;
  }

  listingGrid.innerHTML = standardListings.length
    ? standardListings.map((listing) => renderListingCard(listing, sellersById[listing.seller_id])).join("")
    : '<p class="empty-state">No standard listings match that search yet.</p>';
}

function renderListingCard(listing, seller, featured = false) {
  const listingHref = listingPublicUrl(listing);
  const imageUrl = primaryListingImage(listing);
  return `
    <article class="listing-card${featured ? " featured-card" : ""}">
      <a class="item-art item-art-link ${imageUrl ? "photo-art" : "golf-placeholder-art"}" href="${listingHref}" aria-label="View ${escapeHtml(listing.title)}">
        ${listing.is_featured ? `<span class="featured-badge">${Number(listing.featured_fee_cents || 0) >= 9900 ? "Sponsored" : "Featured"}</span>` : ""}
        ${imageUrl ? renderListingImage(imageUrl, "item-photo", listing.title, { crop: true }) : renderGolfPlaceholder(`${listing.title} placeholder image`)}
      </a>
      <div class="listing-body">
        <div>
          <p class="condition">${escapeHtml(listing.condition)}</p>
          <h3>${escapeHtml(listing.title)}</h3>
        </div>
        <p class="listing-description">${escapeHtml(listing.description)}</p>
        <div class="seller-mini">
          <strong>${escapeHtml(sellerDisplayName(seller))}</strong>
          <span>${escapeHtml(listing.location)}</span>
        </div>
        <div class="price-row"><strong>${formatRand(listing.price_cents)}</strong><span>${escapeHtml(listing.location)}</span></div>
        <div class="listing-actions">
          <a class="text-action" href="${listingHref}">View listing</a>
          ${renderWhatsAppSellerAction(seller?.phone, listing.title, true, listing.id, listing)}
        </div>
      </div>
    </article>
  `;
}

async function loadListingDetail() {
  const supabase = marketplaceClient();
  if (!supabase || !listingDetail) return;

  const params = new URLSearchParams(window.location.search);
  const pathMatch = window.location.pathname.match(/^\/listing\/([^/]+)/i);
  const id = params.get("id") || (pathMatch ? decodeURIComponent(pathMatch[1]) : "");
  if (!id) {
    listingDetail.innerHTML = '<p class="empty-state">No listing selected.</p>';
    return;
  }

  const { data, error } = await supabase
    .from("listings")
    .select("id, seller_id, title, category, brand, model, condition, equipment_grade, price_cents, location, description, image_url, image_urls, status, featured_requested, is_featured, featured_payment_status, featured_fee_cents")
    .eq("id", id)
    .single();

  if (error) {
    setMarketplaceStatus(error.message, "error");
    return;
  }

  const { data: seller } = await supabase
    .from("profiles")
    .select("full_name, email, phone, location, city, province")
    .eq("id", data.seller_id)
    .maybeSingle();

  window.currentListing = data;
  window.fairwaySeo?.updateListing(data, seller);
  window.fairwayTrackOnce?.("listing_viewed", data.id, listingEventParameters(data));
  const sellerName = sellerDisplayName(seller);
  const sellerLocation = data.location;
  const contactData = `data-listing-id="${escapeHtml(data.id)}" data-listing-title="${escapeHtml(data.title)}" data-listing-category="${escapeHtml(data.category)}" data-listing-brand="${escapeHtml(data.brand)}" data-listing-price="${Number(data.price_cents || 0) / 100}" data-seller-id="${escapeHtml(data.seller_id)}"`;
  const sellerPhone = seller?.phone ? `<a class="text-action" data-seller-contact="phone" ${contactData} href="tel:${escapeHtml(seller.phone)}">${escapeHtml(seller.phone)}</a>` : "<span>Phone not supplied</span>";
  const sellerEmail = seller?.email ? `<a class="text-action" data-seller-contact="email" ${contactData} href="mailto:${escapeHtml(seller.email)}?subject=${encodeURIComponent(`Fairway Finds enquiry: ${data.title}`)}">${escapeHtml(seller.email)}</a>` : "<span>Email not supplied</span>";
  const isFavourite = favouriteListingIds().includes(String(data.id));
  listingDetail.innerHTML = `
    <div class="listing-detail-art ${primaryListingImage(data) ? "photo-art" : "golf-placeholder-art"}">
      ${renderListingGallery(data)}
    </div>
    <div class="listing-detail-copy">
      <p class="condition">${formatFeaturedStatus(data) ? `${escapeHtml(formatFeaturedStatus(data))} - ` : ""}${escapeHtml(data.condition)}</p>
      <h1>${escapeHtml(data.title)}</h1>
      <p class="listing-description">${escapeHtml(data.description)}</p>
      <dl class="money-table">
        <div><dt>Price</dt><dd>${formatRand(data.price_cents)}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml(data.location)}</dd></div>
        <div><dt>Seller</dt><dd>${escapeHtml(sellerName)}</dd></div>
      </dl>
      <div class="seller-contact-card">
        <h2>Contact seller</h2>
        <p><strong>${escapeHtml(sellerName)}</strong></p>
        <p>${escapeHtml(sellerLocation)}</p>
        <div class="seller-contact-actions">
          ${renderWhatsAppSellerAction(seller?.phone, data.title, false, data.id, data)}
          ${sellerPhone}
          ${sellerEmail}
        </div>
      </div>
      <div class="listing-utility-actions">
        <button type="button" data-favourite-listing="${escapeHtml(data.id)}" aria-pressed="${isFavourite}">${isFavourite ? "Saved listing" : "Save listing"}</button>
        <button type="button" data-share-listing="${escapeHtml(data.id)}">Share listing</button>
      </div>
      <p class="marketplace-warning">Fairway Finds is a marketplace connecting buyers and sellers. Payments and deliveries are arranged directly between parties. Never pay for goods before verifying the seller.</p>
    </div>
  `;
}

if (listingForm) {
  updatePriceRecommendation();
  updateDirectDealPreview();
  priceCategory?.addEventListener("change", updatePriceRecommendation);
  priceCondition?.addEventListener("change", updatePriceRecommendation);
  priceInput?.addEventListener("input", updateDirectDealPreview);

  getCurrentProfile({ redirect: false }).then((profile) => {
    renderMarketplaceApproval(profile);
    if (!profileCanSell(profile)) {
      listingForm.querySelectorAll("input, select, textarea, button").forEach((field) => {
        field.disabled = true;
      });
      setMarketplaceStatus(
        profile?.verification_status === "approved"
          ? "Your profile is approved, but it is not set as a seller profile."
          : approvalMessage(profile),
        "error"
      );
    }
  });

  listingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const supabase = marketplaceClient();
    const user = await requireUser();
    if (!supabase || !user) return;

    const profile = await getCurrentProfile();
    if (!profileCanSell(profile)) {
      setMarketplaceStatus(
        profile?.verification_status === "approved"
          ? "Your profile is approved. You can list gear now."
          : approvalMessage(profile),
        "error"
      );
      return;
    }

    const formData = new FormData(listingForm);
    const priceCents = Math.round(Number(formData.get("price")) * 100);
    const submitButton = listingForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    setMarketplaceStatus("Submitting listing...", "info");

    try {
      const imageUrls = await uploadListingImages(supabase, user, listingForm.image_files?.files);
      const featureLevel = String(formData.get("feature_level") || "none");
      const featureFeeCents = featureLevel === "sponsored" ? 9900 : featureLevel === "featured" ? 4900 : 0;
      const listing = {
        seller_id: user.id,
        title: formData.get("title"),
        category: formData.get("category"),
        brand: formData.get("brand"),
        model: formData.get("model"),
        condition: formData.get("condition"),
        equipment_grade: "good",
        price_cents: priceCents,
        location: formData.get("location"),
        description: formData.get("description"),
        image_url: imageUrls[0] || "",
        image_urls: imageUrls,
        listing_review_status: "pending",
        status: "draft",
        commission_rate: 0,
        featured_requested: featureFeeCents > 0,
        featured_payment_status: featureFeeCents > 0 ? "pending_payment" : "not_requested",
        featured_fee_cents: featureFeeCents,
      };

      const { data: createdListing, error } = await supabase
        .from("listings")
        .insert(listing)
        .select("id,seller_id,title,category,brand,price_cents,featured_requested,featured_fee_cents")
        .single();
      if (error) throw error;

      window.fairwayTrackOnce?.("listing_created", createdListing.id, listingEventParameters(createdListing, {
        user_type: "buyer_seller",
      }));
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setMarketplaceStatus("Listing submitted for admin review. It will go live after approval.", "success");
      setImageUploadStatus("");
      listingForm.reset();
      updateDirectDealPreview();
      updatePriceRecommendation();
      window.location.href = "/dashboard?listing=submitted";
    } catch (error) {
      if (String(error.message || "").toLowerCase().includes("image")) {
        setImageUploadStatus(error.message, "error");
      }
      setMarketplaceStatus(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Publish listing";
    }
  });
}

function applyBrowseUrlParams() {
  if (!browseFilters) return;

  const params = new URLSearchParams(window.location.search);
  const search = params.get("search");
  const categoryPathMatch = window.location.pathname.match(/^\/browse\/category\/([^/]+)/i);
  const pathCategory = categoryPathMatch ? decodeURIComponent(categoryPathMatch[1]).replace(/-/g, " ") : "";
  const category = params.get("category") || pathCategory;
  const condition = params.get("condition");

  if (search && browseFilters.search) browseFilters.search.value = search;
  if (category && browseFilters.category) {
    const matchingOption = Array.from(browseFilters.category.options).find((option) =>
      option.value.toLowerCase() === category.toLowerCase()
    );
    if (matchingOption) browseFilters.category.value = matchingOption.value;
  }
  if (condition && browseFilters.condition) browseFilters.condition.value = condition;

  if (categoryShortcuts && browseFilters.category) {
    categoryShortcuts.querySelectorAll("[data-category]").forEach((button) => {
      button.classList.toggle("active", button.dataset.category === browseFilters.category.value);
    });
  }

  trackMarketplaceSearch(search);
  trackCategoryView(category);
}

applyBrowseUrlParams();

if (browseFilters) {
  browseFilters.addEventListener("submit", (event) => {
    event.preventDefault();
    trackMarketplaceSearch(new FormData(browseFilters).get("search"));
    loadListings();
  });

  browseFilters.addEventListener("change", (event) => {
    if (event.target?.name === "category" && event.target.value !== "all") {
      trackCategoryView(event.target.value);
    }
    if (event.target?.name && event.target.name !== "search") {
      window.fairwayTrack?.("filter_used", {
        filter_name: event.target.name,
        filter_value: event.target.value,
      });
    }
    loadListings();
  });

  browseFilters.search?.addEventListener("input", () => {
    window.clearTimeout(window.fairwayBrowseSearchTimer);
    window.fairwayBrowseSearchTimer = window.setTimeout(() => {
      trackMarketplaceSearch(browseFilters.search.value);
      loadListings();
    }, 600);
  });
}

if (homeSearch && browseFilters) {
  homeSearch.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(homeSearch);
    browseFilters.search.value = formData.get("search") || "";
    browseFilters.category.value = formData.get("category") || "all";
    trackMarketplaceSearch(formData.get("search"));
    trackCategoryView(browseFilters.category.value);
    if (browseFilters.category.value !== "all") {
      window.fairwayTrack?.("filter_used", {
        filter_name: "category",
        filter_value: browseFilters.category.value,
      });
    }
    categoryShortcuts?.querySelectorAll("[data-category]").forEach((button) => {
      button.classList.toggle("active", button.dataset.category === browseFilters.category.value);
    });
    document.querySelector("#marketplace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    loadListings();
  });
}

if (categoryShortcuts && browseFilters) {
  categoryShortcuts.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    event.preventDefault();

    browseFilters.category.value = button.dataset.category;
    window.fairwayTrack?.("filter_used", {
      filter_name: "category",
      filter_value: button.dataset.category,
    });
    if (button.dataset.category !== "all") {
      trackCategoryView(button.dataset.category);
    }
    categoryShortcuts.querySelectorAll("[data-category]").forEach((categoryButton) => {
      categoryButton.classList.toggle("active", categoryButton === button);
    });
    loadListings();
  });
}

document.addEventListener("change", (event) => {
  const promotionOption = event.target.closest('input[name="feature_level"]');
  if (!promotionOption || !["featured", "sponsored"].includes(promotionOption.value)) return;
  const listingId = promotionOption.closest("[data-edit-listing]")?.dataset.editListing || null;
  const row = promotionOption.closest("[data-listing-row]");
  const promotionForm = promotionOption.closest("form");
  const promotionData = promotionForm ? new FormData(promotionForm) : null;
  window.fairwayTrackOnce?.("listing_promoted", `${listingId || "new"}:${promotionOption.value}`, {
    listing_id: listingId || undefined,
    listing_title: row?.dataset.listingTitle || promotionData?.get("title"),
    category: row?.dataset.listingCategory || promotionData?.get("category"),
    brand: row?.dataset.listingBrand || promotionData?.get("brand"),
    price: row?.dataset.listingPrice ? Number(row.dataset.listingPrice) : Number(promotionData?.get("price") || 0) || undefined,
    seller_id: row?.dataset.sellerId,
    promotion_type: promotionOption.value,
    payment_amount: promotionOption.value === "sponsored" ? 99 : 49,
    currency: "ZAR",
  });
});

document.addEventListener("click", (event) => {
  const contactLink = event.target.closest("[data-seller-contact]");
  if (!contactLink) return;
  const listing = window.currentListing || {};
  const cardLink = contactLink.closest(".listing-card")?.querySelector('a[href*="/listing/"]');
  const cardPathMatch = cardLink ? new URL(cardLink.href, window.location.href).pathname.match(/^\/listing\/([^/]+)/i) : null;
  const listingId = contactLink.dataset.listingId || listing.id || (cardPathMatch ? decodeURIComponent(cardPathMatch[1]) : null);
  const parameters = listingEventParameters(listing, {
    listing_id: listingId,
    listing_title: listing.title || contactLink.dataset.listingTitle,
    category: listing.category || contactLink.dataset.listingCategory,
    brand: listing.brand || contactLink.dataset.listingBrand,
    price: listing.price_cents !== undefined ? Number(listing.price_cents || 0) / 100 : Number(contactLink.dataset.listingPrice || 0) || undefined,
    seller_id: listing.seller_id || contactLink.dataset.sellerId,
    contact_method: contactLink.dataset.sellerContact,
  });
  window.fairwayTrack?.("seller_contacted", parameters);
  const methodEvents = {
    phone: "phone_clicked",
    whatsapp: "whatsapp_clicked",
    email: "email_clicked",
  };
  const methodEvent = methodEvents[contactLink.dataset.sellerContact];
  if (methodEvent) window.fairwayTrack?.(methodEvent, parameters);
});

document.addEventListener("click", async (event) => {
  const favouriteButton = event.target.closest("[data-favourite-listing]");
  if (favouriteButton) {
    const listing = window.currentListing || { id: favouriteButton.dataset.favouriteListing };
    const ids = favouriteListingIds();
    const listingId = String(favouriteButton.dataset.favouriteListing);
    const isFavourite = ids.includes(listingId);
    const nextIds = isFavourite ? ids.filter((id) => id !== listingId) : [...ids, listingId];
    setFavouriteListingIds(nextIds);
    favouriteButton.setAttribute("aria-pressed", String(!isFavourite));
    favouriteButton.textContent = isFavourite ? "Save listing" : "Saved listing";
    window.fairwayTrack?.(isFavourite ? "favourite_removed" : "favourite_added", listingEventParameters(listing));
    return;
  }

  const shareButton = event.target.closest("[data-share-listing]");
  if (!shareButton) return;
  const listing = window.currentListing || { id: shareButton.dataset.shareListing };
  const shareData = {
    title: listing.title || "Fairway Finds listing",
    text: listing.title ? `View ${listing.title} on Fairway Finds SA.` : "View this listing on Fairway Finds SA.",
    url: new URL(listingPublicUrl(listing), window.location.origin).href,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      shareButton.textContent = "Link copied";
    }
    window.fairwayTrackOnce?.("share_listing", `${listing.id}:${Date.now()}`, listingEventParameters(listing, {
      share_method: navigator.share ? "native_share" : "clipboard",
    }));
  } catch (error) {
    if (error?.name !== "AbortError") setMarketplaceStatus("Could not share this listing.", "error");
  }
});

if (dashboardSearch) {
  dashboardSearch.addEventListener("input", applyDashboardSearch);
}

async function loadDashboardMetrics() {
  const supabase = marketplaceClient();
  const hasDashboardMetrics = dashboardTotalListings || dashboardTotalFeatured;
  const user = hasDashboardMetrics ? await requireUser() : null;
  if (!supabase || !user || !hasDashboardMetrics) return;

  const profile = await getCurrentProfile();
  renderMarketplaceApproval(profile);

  const listingsResult = await supabase
    .from("listings")
    .select("id,status,listing_review_status,is_featured,featured_requested,featured_fee_cents")
    .eq("seller_id", user.id)
    .neq("status", "removed");

  if (listingsResult.error) {
    setMarketplaceStatus(listingsResult.error.message, "error");
    return;
  }

  const listings = listingsResult.data || [];
  const listingReviewCounts = countBy(listings, "listing_review_status");
  const activeFeatured = listings.filter((listing) => listing.is_featured);
  const pendingFeatured = listings.filter((listing) => listing.featured_requested && !listing.is_featured);
  const sponsored = activeFeatured.filter((listing) => Number(listing.featured_fee_cents || 0) >= 9900);

  if (dashboardTotalListings) dashboardTotalListings.textContent = String(listings.length);
  if (dashboardListingBreakdown) {
    dashboardListingBreakdown.textContent =
      `${listingReviewCounts.approved || 0} approved - ${listingReviewCounts.pending || 0} pending - ${listingReviewCounts.rejected || 0} rejected`;
  }

  if (dashboardTotalFeatured) dashboardTotalFeatured.textContent = String(activeFeatured.length);
  if (dashboardFeaturedBreakdown) {
    dashboardFeaturedBreakdown.textContent =
      `${sponsored.length} sponsored - ${activeFeatured.length - sponsored.length} featured - ${pendingFeatured.length} pending`;
  }
}

async function loadSellerListings() {
  const supabase = marketplaceClient();
  const user = sellerListings ? await requireUser() : null;
  if (!supabase || !user || !sellerListings) return;

  const { data, error } = await supabase
    .from("listings")
    .select("id,seller_id,title,category,brand,model,condition,price_cents,location,description,image_url,image_urls,listing_review_status,status,admin_notes,featured_requested,is_featured,featured_payment_status,featured_fee_cents,created_at")
    .eq("seller_id", user.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  if (error) {
    setMarketplaceStatus(error.message, "error");
    return;
  }

  sellerListings.innerHTML = data.length
    ? data.map((listing) => {
      const searchText = [
        listing.title,
        listing.category,
        listing.brand,
        listing.model,
        listing.condition,
        listing.location,
        listing.description,
        listing.status,
        listing.listing_review_status,
        formatFeaturedStatus(listing),
        formatRand(listing.price_cents),
      ].join(" ").toLowerCase();
      const listingHref = listingPublicUrl(listing);
      const thumbImage = primaryListingImage(listing);

      return `
        <article class="seller-listing-row" data-listing-row="${listing.id}" data-listing-title="${escapeHtml(listing.title)}" data-listing-category="${escapeHtml(listing.category)}" data-listing-brand="${escapeHtml(listing.brand)}" data-listing-price="${Number(listing.price_cents || 0) / 100}" data-seller-id="${escapeHtml(listing.seller_id || "")}" data-dashboard-search-text="${escapeHtml(searchText)}">
          <div class="seller-listing-summary">
            <a class="seller-listing-thumb ${thumbImage ? "photo-art" : "golf-placeholder-art placeholder-thumb"}" href="${listingHref}" aria-label="View ${escapeHtml(listing.title)}">
              ${thumbImage ? renderListingImage(thumbImage, "seller-thumb-photo", listing.title, { crop: true }) : renderGolfPlaceholder(`${listing.title} placeholder image`)}
            </a>
            <div class="seller-listing-main">
              <h3>${escapeHtml(listing.title)}</h3>
              <p>${escapeHtml(listing.category)} - ${escapeHtml(listing.condition)} - ${escapeHtml(listing.location)}</p>
            </div>
            <strong>${formatRand(listing.price_cents)}</strong>
            <span>${escapeHtml(formatListingReview(listing.listing_review_status))} - ${escapeHtml(formatListingStatus(listing.status))}${formatFeaturedStatus(listing) ? ` - ${escapeHtml(formatFeaturedStatus(listing))}` : ""}</span>
            <div class="seller-listing-actions">
              ${renderPromotionPaymentAction(listing)}
              <button type="button" data-toggle-listing-edit="${listing.id}">Edit</button>
              <button type="button" data-delete-listing="${listing.id}">Delete</button>
            </div>
          </div>
          <form class="seller-listing-card seller-listing-edit-panel" data-edit-listing="${listing.id}" hidden>
          <div class="seller-listing-edit-head">
            <div>
              <h3>Edit listing</h3>
              <p>${escapeHtml(listing.title)}</p>
            </div>
            <button type="button" data-close-listing-edit>Close</button>
          </div>
          <div class="seller-listing-grid">
            <label><span>Title</span><input name="title" value="${escapeHtml(listing.title)}" required /></label>
            <label><span>Category</span><select name="category"><option ${listing.category === "Clubs" ? "selected" : ""}>Clubs</option><option ${listing.category === "Bags" ? "selected" : ""}>Bags</option><option ${listing.category === "Tech" ? "selected" : ""}>Tech</option><option ${listing.category === "Accessories" ? "selected" : ""}>Accessories</option><option ${listing.category === "Shoes" ? "selected" : ""}>Shoes</option></select></label>
            <label><span>Brand</span><input name="brand" value="${escapeHtml(listing.brand)}" /></label>
            <label><span>Model</span><input name="model" value="${escapeHtml(listing.model)}" /></label>
            <label><span>Condition</span><select name="condition"><option ${listing.condition === "Like new" ? "selected" : ""}>Like new</option><option ${listing.condition === "Excellent" ? "selected" : ""}>Excellent</option><option ${listing.condition === "Very good" ? "selected" : ""}>Very good</option><option ${listing.condition === "Good" ? "selected" : ""}>Good</option><option ${listing.condition === "Used" ? "selected" : ""}>Used</option></select></label>
            <label><span>Price in rand</span><input name="price" type="number" min="1" step="1" value="${Math.round(Number(listing.price_cents || 0) / 100)}" required /></label>
            <label><span>Location</span><input name="location" value="${escapeHtml(listing.location)}" required /></label>
            <label><span>Replace photos</span><input name="image_files" type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/avif,image/bmp,image/tiff,.jpg,.jpeg,.jfif,.png,.gif,.webp,.heic,.heif,.avif,.bmp,.tif,.tiff" multiple /></label>
          </div>
          <div class="feature-options" aria-label="Listing promotion">
            <label class="feature-option">
              <input name="feature_level" type="radio" value="none" ${!listing.featured_requested && !listing.is_featured ? "checked" : ""} ${listing.is_featured ? "disabled" : ""} />
              <span>
                <strong>No promotion</strong>
                Free listing. Appears in normal Browse order after admin approval.
              </span>
            </label>
            <label class="feature-option">
              <input name="feature_level" type="radio" value="featured" ${Number(listing.featured_fee_cents || 0) > 0 && Number(listing.featured_fee_cents || 0) < 9900 ? "checked" : ""} ${listing.is_featured ? "disabled" : ""} />
              <span>
                <strong>${listing.is_featured && Number(listing.featured_fee_cents || 0) < 9900 ? "Featured listing active" : "Featured listing - R49"}</strong>
                ${listing.is_featured && Number(listing.featured_fee_cents || 0) < 9900 ? "This listing is currently highlighted in Browse." : "Highlight this item above standard listings for 30 days."}
              </span>
            </label>
            <label class="feature-option premium-feature">
              <input name="feature_level" type="radio" value="sponsored" ${Number(listing.featured_fee_cents || 0) >= 9900 ? "checked" : ""} ${listing.is_featured ? "disabled" : ""} />
              <span>
                <strong>${listing.is_featured && Number(listing.featured_fee_cents || 0) >= 9900 ? "Sponsored listing active" : "Sponsored listing - R99"}</strong>
                ${listing.is_featured && Number(listing.featured_fee_cents || 0) >= 9900 ? "This listing is currently receiving premium visibility." : "Premium visibility above featured listings for 30 days."}
              </span>
            </label>
          </div>
          <p class="fine-print">Selecting new photos replaces the current listing gallery. The first selected photo becomes the thumbnail.</p>
          <p class="inline-status" data-edit-image-status role="status" aria-live="polite"></p>
          <label><span>Description</span><textarea name="description" rows="4" required>${escapeHtml(listing.description)}</textarea></label>
          <p class="fine-print">Saving changes sends this listing back to admin review before it appears publicly.</p>
          <div class="seller-edit-actions">
            <button type="submit">Save listing</button>
            <button type="button" data-close-listing-edit>Cancel</button>
          </div>
          </form>
        </article>
      `;
    }).join("")
    : '<p class="empty-state">No listings yet.</p>';
  applyDashboardSearch();
}

if (sellerListings) {
  sellerListings.addEventListener("click", async (event) => {
    const payButton = event.target.closest("[data-pay-promotion]");
    if (payButton) {
      payButton.disabled = true;
      payButton.textContent = "Opening iKhokha...";
      setMarketplaceStatus("Opening iKhokha payment...", "info");
      try {
        await startIkhokhaPayment({ listingId: payButton.dataset.payPromotion });
      } catch (error) {
        setMarketplaceStatus(error.message, "error");
        payButton.disabled = false;
        payButton.textContent = "Pay placement";
      }
      return;
    }

    const closeButton = event.target.closest("[data-close-listing-edit]");
    if (closeButton) {
      const panel = closeButton.closest("[data-edit-listing]");
      const row = panel?.closest("[data-listing-row]");
      const editButton = row?.querySelector("[data-toggle-listing-edit]");
      if (panel) panel.hidden = true;
      if (editButton) editButton.textContent = "Edit";
      return;
    }

    const editButton = event.target.closest("[data-toggle-listing-edit]");
    if (editButton) {
      const row = editButton.closest("[data-listing-row]");
      const panel = row?.querySelector("[data-edit-listing]");
      if (!panel) return;
      sellerListings.querySelectorAll("[data-edit-listing]").forEach((otherPanel) => {
        if (otherPanel !== panel) otherPanel.hidden = true;
      });
      sellerListings.querySelectorAll("[data-toggle-listing-edit]").forEach((otherButton) => {
        if (otherButton !== editButton) otherButton.textContent = "Edit";
      });
      panel.hidden = !panel.hidden;
      editButton.textContent = panel.hidden ? "Edit" : "Close";
      return;
    }

    const deleteButton = event.target.closest("[data-delete-listing]");
    if (!deleteButton) return;

    const confirmed = window.confirm("Delete this listing from your dashboard?");
    if (!confirmed) return;

    const supabase = marketplaceClient();
    const user = await requireUser();
    if (!supabase || !user) return;

    deleteButton.disabled = true;
    deleteButton.textContent = "Deleting...";
    setMarketplaceStatus("Deleting listing...", "info");

    const { error } = await supabase
      .from("listings")
      .update({
        status: "removed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteButton.dataset.deleteListing)
      .eq("seller_id", user.id);

    if (error) {
      setMarketplaceStatus(error.message, "error");
      deleteButton.disabled = false;
      deleteButton.textContent = "Delete";
      return;
    }

    const row = deleteButton.closest("[data-listing-row]");
    window.fairwayTrackOnce?.("listing_deleted", deleteButton.dataset.deleteListing, {
      listing_id: deleteButton.dataset.deleteListing,
      listing_title: row?.dataset.listingTitle,
      category: row?.dataset.listingCategory,
      brand: row?.dataset.listingBrand,
      price: row?.dataset.listingPrice ? Number(row.dataset.listingPrice) : undefined,
      seller_id: user.id,
      currency: "ZAR",
      user_type: "buyer_seller",
    });
    setMarketplaceStatus("Listing deleted.", "success");
    await loadSellerListings();
    await loadDashboardMetrics();
  });

  sellerListings.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-edit-listing]");
    if (!form) return;
    event.preventDefault();

    const supabase = marketplaceClient();
    const user = await requireUser();
    if (!supabase || !user) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving...";
    setMarketplaceStatus("Saving listing changes...", "info");
    const editImageStatus = form.querySelector("[data-edit-image-status]");
    const setEditImageStatus = (message, type = "info") => {
      if (!editImageStatus) return;
      editImageStatus.textContent = message;
      editImageStatus.dataset.type = type;
    };
    const formData = new FormData(form);

    const updates = {
      title: formData.get("title"),
      category: formData.get("category"),
      brand: formData.get("brand"),
      model: formData.get("model"),
      condition: formData.get("condition"),
      price_cents: Math.round(Number(formData.get("price")) * 100),
      location: formData.get("location"),
      description: formData.get("description"),
      listing_review_status: "pending",
      status: "draft",
      updated_at: new Date().toISOString(),
    };

    if (formData.has("feature_level")) {
      const featureLevel = String(formData.get("feature_level") || "none");
      if (featureLevel === "featured" || featureLevel === "sponsored") {
        updates.featured_requested = true;
        updates.featured_fee_cents = featureLevel === "sponsored" ? 9900 : 4900;
        updates.featured_payment_status = "pending_payment";
      } else {
        updates.featured_requested = false;
        updates.featured_fee_cents = 0;
        updates.featured_payment_status = "not_requested";
      }
    }

    try {
      const imageFiles = form.querySelector('input[name="image_files"]')?.files;
      if (imageFiles && imageFiles.length) {
        validateListingImageFiles(imageFiles);
        setEditImageStatus("Preparing replacement photos...", "info");
        const imageUrls = await uploadListingImages(supabase, user, imageFiles);
        updates.image_url = imageUrls[0] || "";
        updates.image_urls = imageUrls;
        setEditImageStatus("Replacement photos uploaded. Saving listing...", "success");
      }

      const { error } = await withTimeout(
        supabase
          .from("listings")
          .update(updates)
          .eq("id", form.dataset.editListing),
        20000,
        "Saving the listing timed out. Your old listing remains unchanged. Please check your connection and try again."
      );

      if (error) throw error;

      window.fairwayTrackOnce?.("listing_updated", `${form.dataset.editListing}:${updates.updated_at}`, {
        listing_id: form.dataset.editListing,
        listing_title: updates.title,
        category: updates.category,
        brand: updates.brand,
        price: Number(updates.price_cents || 0) / 100,
        seller_id: user.id,
        currency: "ZAR",
        user_type: "buyer_seller",
      });
      setMarketplaceStatus("Listing saved.", "success");
      setImageUploadStatus("");
      setEditImageStatus("Listing saved. Changes were sent for admin review.", "success");
      form.hidden = true;
      await withTimeout(
        Promise.all([loadSellerListings(), loadDashboardMetrics()]),
        15000,
        "Listing saved, but the dashboard refresh took too long. Reload the page to see the changes."
      ).catch((refreshError) => setMarketplaceStatus(refreshError.message, "info"));
    } catch (error) {
      const message = error.message || "Could not save this listing. Your existing listing and photos were kept.";
      setEditImageStatus(message, "error");
      setMarketplaceStatus(message, "error");
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = "Save listing";
      }
    }
  });
}

loadListings();
loadTopFeatureListing();
loadListingDetail();
loadDashboardMetrics();
loadSellerListings();
applyPaymentLinks();
