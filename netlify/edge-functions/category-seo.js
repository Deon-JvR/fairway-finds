const siteUrl = "https://fairwayfinds.co.za";

const categories = {
  clubs: "Clubs",
  bags: "Bags",
  tech: "Tech",
  accessories: "Accessories",
  shoes: "Shoes",
};

function escapeHtml(value) {
  return String(value || "").replace(/[&<>\"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;",
  })[character]);
}

function replaceMeta(html, selector, content) {
  const escaped = escapeHtml(content);
  const isProperty = selector.startsWith("og:");
  const pattern = new RegExp(`<meta\\s+${isProperty ? "property" : "name"}=["']${selector}["'][^>]*>`, "i");
  const tag = `<meta ${isProperty ? "property" : "name"}="${selector}" content="${escaped}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `  ${tag}\n</head>`);
}

export default async (request, context) => {
  const response = await context.next();
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return response;

  const match = new URL(request.url).pathname.match(/^\/browse\/category\/([^/]+)\/?$/i);
  const slug = match ? decodeURIComponent(match[1]).toLowerCase() : "";
  const category = categories[slug];
  if (!category) return response;

  const canonical = `${siteUrl}/browse/category/${slug}`;
  const title = `Used ${category} for Sale in South Africa | Fairway Finds SA`;
  const description = `Browse approved pre-owned ${category.toLowerCase()} listed by golfers across South Africa. Contact local sellers directly on Fairway Finds SA.`;
  let html = await response.text();
  html = html.replace(/<title>.*?<\/title>/is, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, "description", description);
  html = replaceMeta(html, "robots", "index, follow, max-image-preview:large");
  html = replaceMeta(html, "og:title", title);
  html = replaceMeta(html, "og:description", description);
  html = replaceMeta(html, "og:url", canonical);
  html = replaceMeta(html, "twitter:title", title);
  html = replaceMeta(html, "twitter:description", description);
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}" />`);

  const breadcrumbs = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Browse", item: `${siteUrl}/browse` },
      { "@type": "ListItem", position: 3, name: category, item: canonical },
    ],
  }).replace(/</g, "\\u003c");
  html = html.replace("</head>", `  <script type="application/ld+json" id="fairway-breadcrumb-schema">${breadcrumbs}</script>\n</head>`);

  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=300, s-maxage=900");
  return new Response(html, { status: response.status, headers });
};
