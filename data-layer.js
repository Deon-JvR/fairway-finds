(function initializeFairwayDataLayer() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ga4_measurement_id: "G-2H6X3MBKHN" });
  const sentEvents = new Set();

  function listingItem(parameters = {}, overrides = {}) {
    return Object.fromEntries(Object.entries({
      item_id: parameters.listing_id,
      item_name: parameters.listing_title,
      item_category: parameters.category,
      item_brand: parameters.brand,
      price: parameters.price,
      quantity: 1,
      ...overrides,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  }

  function pushEvent(eventName, parameters = {}) {
    const cleanParameters = Object.fromEntries(
      Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== "")
    );
    window.dataLayer.push({
      event: eventName,
      event_id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...cleanParameters,
    });
  }

  function pushGa4Alias(sourceEvent, parameters) {
    const currency = parameters.currency || "ZAR";
    const aliases = {
      listing_viewed: () => ["view_item", {
        currency,
        value: parameters.price,
        items: [listingItem(parameters)],
      }],
      listing_promoted: () => ["add_to_cart", {
        currency,
        value: parameters.payment_amount,
        items: [listingItem(parameters, {
          item_name: parameters.listing_title || `${parameters.promotion_type || "Featured"} listing promotion`,
          item_category: "Listing promotion",
          item_variant: parameters.promotion_type,
          price: parameters.payment_amount,
        })],
      }],
      checkout_started: () => ["begin_checkout", {
        currency,
        value: parameters.payment_amount,
        transaction_id: parameters.transaction_id,
        items: [listingItem(parameters, {
          item_name: parameters.listing_title || parameters.payment_type,
          item_category: "Listing promotion",
          price: parameters.payment_amount,
        })],
      }],
      payment_success: () => ["purchase", {
        transaction_id: parameters.transaction_id,
        currency,
        value: parameters.payment_amount,
        items: [listingItem(parameters, {
          item_name: parameters.listing_title || parameters.payment_type,
          item_category: "Listing promotion",
          price: parameters.payment_amount,
        })],
      }],
      seller_contacted: () => ["generate_lead", parameters],
      whatsapp_clicked: () => ["click_whatsapp", parameters],
      phone_clicked: () => ["click_call", parameters],
      email_clicked: () => ["click_email", parameters],
      user_registered: () => ["form_submit", { ...parameters, form_name: "registration" }],
      user_login: () => ["form_submit", { ...parameters, form_name: "login" }],
      listing_created: () => ["form_submit", { ...parameters, form_name: "create_listing" }],
      listing_updated: () => ["form_submit", { ...parameters, form_name: "update_listing" }],
    };
    const alias = aliases[sourceEvent]?.();
    if (alias) pushEvent(alias[0], alias[1]);
  }

  window.fairwayTrack = function fairwayTrack(eventName, parameters = {}, options = {}) {
    if (!eventName) return false;
    const dedupeKey = options.dedupeKey ? `${eventName}:${options.dedupeKey}` : "";
    if (dedupeKey && sentEvents.has(dedupeKey)) return false;
    if (dedupeKey) sentEvents.add(dedupeKey);
    const cleanParameters = Object.fromEntries(
      Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== "")
    );
    pushEvent(eventName, cleanParameters);
    pushGa4Alias(eventName, cleanParameters);
    return true;
  };

  window.fairwayTrackOnce = function fairwayTrackOnce(eventName, dedupeKey, parameters = {}) {
    return window.fairwayTrack(eventName, parameters, { dedupeKey });
  };

  const categoryPages = {
    "/used-callaway-clubs-south-africa": { category: "Clubs", brand: "Callaway" },
    "/used-taylormade-clubs-south-africa": { category: "Clubs", brand: "TaylorMade" },
    "/golf-clubs-for-beginners": { category: "Beginner golf clubs" },
    "/golf-drivers-for-sale": { category: "Drivers" },
    "/golf-sets-south-africa": { category: "Golf sets" },
  };
  window.addEventListener("DOMContentLoaded", () => {
    window.fairwayTrackOnce("page_view", window.location.href, {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      user_type: "visitor",
    });
    const pagePath = window.location.pathname.toLowerCase().replace(/\.html$/i, "");
    const categoryPage = categoryPages[pagePath];
    if (categoryPage) {
      window.fairwayTrackOnce("category_viewed", pagePath, { ...categoryPage, page_type: "seo_landing_page" });
    }
  });
})();
