const siteUrl = "https://fairwayfinds.co.za";

const staticPages = [
  ["/", "daily", "1.0"],
  ["/browse", "daily", "0.9"],
  ["/browse/category/clubs", "daily", "0.8"],
  ["/browse/category/bags", "daily", "0.7"],
  ["/browse/category/tech", "daily", "0.7"],
  ["/browse/category/accessories", "daily", "0.7"],
  ["/browse/category/shoes", "daily", "0.7"],
  ["/create-listing", "monthly", "0.7"],
  ["/how-it-works", "monthly", "0.7"],
  ["/trust", "monthly", "0.7"],
  ["/pricing", "monthly", "0.7"],
  ["/privacy", "yearly", "0.3"],
  ["/contact", "yearly", "0.4"],
  ["/used-callaway-clubs-south-africa", "weekly", "0.8"],
  ["/used-taylormade-clubs-south-africa", "weekly", "0.8"],
  ["/golf-clubs-for-beginners", "weekly", "0.8"],
  ["/golf-drivers-for-sale", "weekly", "0.8"],
  ["/golf-sets-south-africa", "weekly", "0.8"],
];

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;",
  })[character]);
}

function slugify(value) {
  return String(value || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "listing";
}

async function approvedListings() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) return [];
  const query = "/rest/v1/listings?listing_review_status=eq.approved&status=in.(active,reserved,sold)&select=id,title,updated_at&order=updated_at.desc";
  const response = await fetch(`${supabaseUrl}${query}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Listing sitemap query failed: ${response.status}`);
  return response.json();
}

exports.handler = async () => {
  try {
    let listings = [];
    try {
      listings = await approvedListings();
    } catch (error) {
      listings = [];
    }
    const urls = staticPages.map(([path, changefreq, priority]) =>
      `<url><loc>${siteUrl}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
    );
    listings.forEach((listing) => {
      const path = `/listing/${encodeURIComponent(listing.id)}/${slugify(listing.title)}`;
      const lastmod = listing.updated_at ? `<lastmod>${escapeXml(new Date(listing.updated_at).toISOString())}</lastmod>` : "";
      urls.push(`<url><loc>${escapeXml(siteUrl + path)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`);
    });
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=900, s-maxage=3600",
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
    };
  } catch (error) {
    return { statusCode: 500, headers: { "content-type": "text/plain" }, body: "Could not generate sitemap." };
  }
};
