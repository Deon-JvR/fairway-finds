const crypto = require("crypto");

function ikhokhaConfig() {
  return {
    appId: process.env.IKHOKHA_APP_ID || "",
    secret: process.env.IKHOKHA_SECRET || process.env.IKHOKHA_APP_SECRET || "",
    entityId: process.env.IKHOKHA_ENTITY_ID || "",
    apiUrl: process.env.IKHOKHA_API_URL || "https://api.ikhokha.com/public-api/v1/api/payment",
    siteUrl: (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, ""),
  };
}

function ikhokhaSignature(body, secret) {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

function ikhokhaHeaders(body, config) {
  const headers = {
    "content-type": "application/json",
  };
  if (config.appId) headers["IK-APPID"] = config.appId;
  if (config.secret) headers["IK-SIGN"] = ikhokhaSignature(body, config.secret);
  return headers;
}

function ikhokhaReady(config = ikhokhaConfig()) {
  return Boolean(config.appId && config.secret && config.entityId && config.apiUrl);
}

module.exports = {
  ikhokhaConfig,
  ikhokhaHeaders,
  ikhokhaReady,
  ikhokhaSignature,
};
