(function trackFailedPayment() {
  const reference = new URLSearchParams(window.location.search).get("ref");
  if (!reference) return;

  const storageKey = `fairway_payment_failure_${reference}`;
  try {
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, "1");
  } catch (error) {
    // Analytics should still work when browser storage is unavailable.
  }

  let checkout = {};
  try {
    checkout = JSON.parse(window.localStorage.getItem(`fairway_checkout_${reference}`) || "{}");
  } catch (error) {
    checkout = {};
  }
  window.fairwayTrackOnce?.("payment_failed", reference, {
    ...checkout,
    transaction_id: reference,
    payment_type: reference.startsWith("FF-AD") ? "advertising" : "listing_promotion",
    payment_provider: "ikhokha",
    currency: checkout.currency || "ZAR",
  });
})();
