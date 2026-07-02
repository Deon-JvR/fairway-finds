(function initializeFairwaySeo() {
  const siteUrl = "https://fairwayfinds.co.za";
  const siteName = "Fairway Finds SA";
  const defaultImage = `${siteUrl}/fairway-finds-logo.png`;

  function slugify(value) {
    return String(value || "listing")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "listing";
  }

  function setMeta(selector, attribute, value) {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement("meta");
      const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
      if (match) element.setAttribute(match[1], match[2]);
      document.head.appendChild(element);
    }
    element.setAttribute(attribute, value);
  }

  function setCanonical(url) {
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }

  function setJsonLd(id, data) {
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  function applyMetadata({ title, description, canonical, image = defaultImage, type = "website" }) {
    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setCanonical(canonical);
    setMeta('meta[property="og:type"]', "content", type);
    setMeta('meta[property="og:site_name"]', "content", siteName);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", image);
  }

  function breadcrumb(items) {
    setJsonLd("fairway-breadcrumb-schema", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    });
  }

  const cleanPath = window.location.pathname.replace(/\.html$/i, "");
  if (cleanPath === "" || cleanPath === "/index") {
    setJsonLd("fairway-organization-schema", {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      url: `${siteUrl}/`,
      logo: { "@type": "ImageObject", url: defaultImage, width: 720, height: 360 },
      description: "A South African marketplace connecting buyers and sellers of pre-owned golf equipment.",
      email: "admin@fairwayfinds.co.za",
      telephone: "+27 83 451 1633",
      areaServed: { "@type": "Country", name: "South Africa" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "admin@fairwayfinds.co.za",
        telephone: "+27 83 451 1633",
        availableLanguage: "English",
      },
    });
    setJsonLd("fairway-website-schema", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: siteName,
      url: `${siteUrl}/`,
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/browse?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    });
  }

  const breadcrumbNames = {
    "/browse": "Browse golf gear",
    "/create-listing": "Sell golf gear",
    "/how-it-works": "How it works",
    "/trust": "Safety tips",
    "/pricing": "Pricing",
    "/privacy": "Privacy policy",
    "/contact": "Contact",
    "/used-callaway-clubs-south-africa": "Used Callaway clubs",
    "/used-taylormade-clubs-south-africa": "Used TaylorMade clubs",
    "/golf-clubs-for-beginners": "Golf clubs for beginners",
    "/golf-drivers-for-sale": "Golf drivers for sale",
    "/golf-sets-south-africa": "Golf sets South Africa",
  };
  if (breadcrumbNames[cleanPath]) {
    breadcrumb([
      { name: "Home", url: `${siteUrl}/` },
      { name: breadcrumbNames[cleanPath], url: `${siteUrl}${cleanPath}` },
    ]);
  }

  const faqPages = {
    "/how-it-works": [
      ["How do I buy golf gear on Fairway Finds?", "Browse approved listings and contact the seller directly by WhatsApp, phone, or email."],
      ["How do I sell golf gear?", "Create an approved profile, submit a free listing, and wait for admin review before it appears publicly."],
      ["Does Fairway Finds handle delivery?", "No. Buyers and sellers arrange payment, collection, and delivery directly with each other."],
    ],
    "/trust": [
      ["How can I trade safely?", "Verify the seller and inspect the golf gear before paying. Never pay for goods you have not verified."],
      ["Does Fairway Finds hold buyer payments?", "No. Fairway Finds connects buyers and sellers; marketplace payments and deliveries are arranged directly."],
    ],
    "/pricing": [
      ["Is it free to list golf gear?", "Yes. Standard listings are free."],
      ["How much is a featured listing?", "Featured listings cost R49 and sponsored listings cost R99 for 30 days."],
      ["When does a paid promotion start?", "A promotion activates after admin approval and successful payment confirmation."],
    ],
  };
  const faq = faqPages[cleanPath];
  if (faq) {
    setJsonLd("fairway-faq-schema", {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    });
  }

  function listingUrl(listing) {
    return `${siteUrl}/listing/${encodeURIComponent(listing.id)}/${slugify(listing.title)}`;
  }

  function updateListing(listing, seller) {
    const canonical = listingUrl(listing);
    const price = Number(listing.price_cents || 0) / 100;
    const image = Array.isArray(listing.image_urls) && listing.image_urls[0]
      ? listing.image_urls[0]
      : listing.image_url || defaultImage;
    const description = `${listing.title} for ${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(price)} in ${listing.location}. View this approved pre-owned golf listing on Fairway Finds SA.`;
    applyMetadata({
      title: `${listing.title} for Sale | Fairway Finds SA`,
      description,
      canonical,
      image,
      type: "product",
    });
    setMeta('meta[name="robots"]', "content", "index, follow, max-image-preview:large");
    setMeta('meta[property="product:price:amount"]', "content", String(price));
    setMeta('meta[property="product:price:currency"]', "content", "ZAR");
    setJsonLd("fairway-product-schema", {
      "@context": "https://schema.org",
      "@type": "Product",
      name: listing.title,
      description: listing.description,
      image: Array.isArray(listing.image_urls) && listing.image_urls.length ? listing.image_urls : [image],
      sku: listing.id,
      category: listing.category,
      brand: listing.brand ? { "@type": "Brand", name: listing.brand } : undefined,
      itemCondition: "https://schema.org/UsedCondition",
      offers: {
        "@type": "Offer",
        url: canonical,
        priceCurrency: "ZAR",
        price,
        availability: listing.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        seller: { "@type": "Person", name: seller?.full_name || "Fairway Finds seller" },
      },
    });
    breadcrumb([
      { name: "Home", url: `${siteUrl}/` },
      { name: "Browse", url: `${siteUrl}/browse` },
      { name: listing.category || "Golf gear", url: `${siteUrl}/browse?category=${encodeURIComponent(listing.category || "all")}` },
      { name: listing.title, url: canonical },
    ]);
    if (window.location.search.includes("id=")) window.history.replaceState({}, "", canonical.replace(siteUrl, ""));
  }

  function updateBrowse({ category = "all", search = "" } = {}) {
    const categoryName = String(category || "all");
    const searchTerm = String(search || "").trim();
    if (categoryName !== "all") {
      const categorySlug = slugify(categoryName);
      const canonical = `${siteUrl}/browse/category/${categorySlug}`;
      applyMetadata({
        title: `Used ${categoryName} for Sale in South Africa | Fairway Finds SA`,
        description: `Browse approved pre-owned ${categoryName.toLowerCase()} listed by golfers across South Africa. Contact local sellers directly on Fairway Finds SA.`,
        canonical,
      });
      setMeta('meta[name="robots"]', "content", "index, follow, max-image-preview:large");
      breadcrumb([
        { name: "Home", url: `${siteUrl}/` },
        { name: "Browse", url: `${siteUrl}/browse` },
        { name: categoryName, url: canonical },
      ]);
      if (window.location.pathname.startsWith("/browse")) {
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
        window.history.replaceState({}, "", `/browse/category/${categorySlug}${query}`);
      }
    } else if (searchTerm) {
      applyMetadata({
        title: `Search Results for ${searchTerm} | Fairway Finds SA`,
        description: `Search Fairway Finds SA for approved pre-owned golf gear matching ${searchTerm}.`,
        canonical: `${siteUrl}/browse`,
      });
      setMeta('meta[name="robots"]', "content", "noindex, follow");
      if (window.location.pathname.startsWith("/browse")) {
        window.history.replaceState({}, "", `/browse?search=${encodeURIComponent(searchTerm)}`);
      }
    } else if (window.location.pathname.startsWith("/browse")) {
      window.history.replaceState({}, "", "/browse");
    }
  }

  window.fairwaySeo = { applyMetadata, breadcrumb, listingUrl, slugify, updateBrowse, updateListing };
})();
