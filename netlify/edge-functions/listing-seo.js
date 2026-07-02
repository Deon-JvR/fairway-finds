const siteUrl = "https://fairwayfinds.co.za";
const fallbackImage = `${siteUrl}/fairway-finds-logo.png`;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>\"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;",
  })[character]);
}

function slugify(value) {
  return String(value || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "listing";
}

function replaceMeta(html, selector, content) {
  const escaped = escapeHtml(content);
  const pattern = selector.startsWith("og:") || selector.startsWith("product:")
    ? new RegExp(`<meta\\s+property=["']${selector}["'][^>]*>`, "i")
    : new RegExp(`<meta\\s+name=["']${selector}["'][^>]*>`, "i");
  const attribute = selector.startsWith("og:") || selector.startsWith("product:") ? "property" : "name";
  const tag = `<meta ${attribute}="${selector}" content="${escaped}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `  ${tag}\n</head>`);
}

export default async (request, context) => {
  const response = await context.next();
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return response;
  const fallbackResponse = response.clone();

  const match = new URL(request.url).pathname.match(/^\/listing\/([^/]+)/i);
  if (!match) return response;

  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const key = Netlify.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !key) return response;

  try {
    const id = decodeURIComponent(match[1]);
    const query = `/rest/v1/listings?id=eq.${encodeURIComponent(id)}&listing_review_status=eq.approved&status=in.(active,reserved,sold)&select=id,title,category,brand,condition,price_cents,location,description,image_url,image_urls,status`;
    const listingResponse = await fetch(`${supabaseUrl}${query}`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    if (!listingResponse.ok) return response;
    const listing = (await listingResponse.json())[0];
    if (!listing) return response;

    const price = Number(listing.price_cents || 0) / 100;
    const canonical = `${siteUrl}/listing/${encodeURIComponent(listing.id)}/${slugify(listing.title)}`;
    const images = Array.isArray(listing.image_urls) && listing.image_urls.length
      ? listing.image_urls
      : [listing.image_url || fallbackImage];
    const title = `${listing.title} for Sale | Fairway Finds SA`;
    const description = `${listing.title} for R${Math.round(price).toLocaleString("en-ZA")} in ${listing.location}. View this approved pre-owned golf listing on Fairway Finds SA.`;
    let html = await response.text();
    html = html.replace(/<title>.*?<\/title>/is, `<title>${escapeHtml(title)}</title>`);
    html = replaceMeta(html, "description", description);
    html = replaceMeta(html, "robots", "index, follow, max-image-preview:large");
    html = replaceMeta(html, "og:type", "product");
    html = replaceMeta(html, "og:title", title);
    html = replaceMeta(html, "og:description", description);
    html = replaceMeta(html, "og:url", canonical);
    html = replaceMeta(html, "og:image", images[0]);
    html = replaceMeta(html, "twitter:title", title);
    html = replaceMeta(html, "twitter:description", description);
    html = replaceMeta(html, "twitter:image", images[0]);
    html = replaceMeta(html, "product:price:amount", String(price));
    html = replaceMeta(html, "product:price:currency", "ZAR");
    html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`);

    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: listing.title,
      description: listing.description,
      image: images,
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
      },
    };
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Browse", item: `${siteUrl}/browse` },
        { "@type": "ListItem", position: 3, name: listing.category || "Golf gear", item: `${siteUrl}/browse?category=${encodeURIComponent(listing.category || "all")}` },
        { "@type": "ListItem", position: 4, name: listing.title, item: canonical },
      ],
    };
    const schema = JSON.stringify(productSchema).replace(/</g, "\\u003c");
    const breadcrumbs = JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c");
    html = html.replace("</head>", `  <script type="application/ld+json" id="fairway-product-schema">${schema}</script>\n  <script type="application/ld+json" id="fairway-breadcrumb-schema">${breadcrumbs}</script>\n</head>`);
    const headers = new Headers(response.headers);
    headers.set("cache-control", "public, max-age=300, s-maxage=900");
    return new Response(html, { status: response.status, headers });
  } catch (error) {
    return fallbackResponse;
  }
};
