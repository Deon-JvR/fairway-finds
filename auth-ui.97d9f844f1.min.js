const FAIRWAY_ADMIN_SESSION_KEY = "fairway_admin_session";
const FAIRWAY_FALLBACK_ADMIN_EMAILS = ["admin@fairwayfinds.co.za"];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cacheAdminSession(isAdmin) {
  try {
    if (isAdmin) {
      window.localStorage.setItem(FAIRWAY_ADMIN_SESSION_KEY, "true");
    } else {
      window.localStorage.removeItem(FAIRWAY_ADMIN_SESSION_KEY);
    }
  } catch (error) {
    // Storage may be blocked in private browsing.
  }
}

function removeAuthenticatedNavigation() {
  document.querySelectorAll(
    '.nav [data-auth-generated], .nav a[href="/dashboard"], .nav a[href="/admin"], .nav a[href="/account"], .nav a[href="/profile"]'
  ).forEach((link) => link.remove());
}

function addAuthenticatedNavigation(isAdmin) {
  document.querySelectorAll(".nav").forEach((nav) => {
    const links = [
      ["/dashboard", "Dashboard"],
      ...(isAdmin ? [["/admin", "Admin"]] : []),
      ["/profile", "Account"],
    ];
    links.forEach(([href, label]) => {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      link.dataset.authGenerated = "";
      if (window.location.pathname === href) link.classList.add("active");
      nav.appendChild(link);
    });
  });
}

// Keep public navigation clean before the asynchronous session check completes.
removeAuthenticatedNavigation();

async function updateAuthNavigation() {
  if (!window.fairwaySupabaseReady || !window.fairwaySupabase) return;

  const { data } = await window.fairwaySupabase.auth.getSession();
  const user = data?.session?.user;
  const isSignedIn = Boolean(user);
  const headerActionLinks = Array.from(document.querySelectorAll(".site-header .header-action"));
  const primaryHeaderActions = Array.from(document.querySelectorAll(".site-header .header-actions .header-action"));
  const signInActionLinks = document.querySelectorAll("[data-auth-signin]");
  const adminEmails = [...(window.fairwayAdminEmails || []), ...FAIRWAY_FALLBACK_ADMIN_EMAILS].map(normalizeEmail);
  const isAdmin = adminEmails.includes(normalizeEmail(user?.email));

  cacheAdminSession(isSignedIn && isAdmin);
  removeAuthenticatedNavigation();

  if (isSignedIn) {
    addAuthenticatedNavigation(isAdmin);
    signInActionLinks.forEach((link) => {
      link.hidden = true;
      link.setAttribute("aria-hidden", "true");
    });
    if (primaryHeaderActions.length) {
      primaryHeaderActions.forEach((link, index) => {
        if (index === 0) {
          link.hidden = false;
          link.setAttribute("aria-hidden", "false");
          link.setAttribute("href", "#sign-out");
          link.setAttribute("data-logout-action", "");
          link.textContent = "Sign out";
        } else {
          link.hidden = true;
          link.setAttribute("aria-hidden", "true");
        }
      });
    }
    headerActionLinks.forEach((link) => {
      if (link.matches("[data-logout]")) {
        link.textContent = "Sign out";
        link.setAttribute("data-logout-action", "");
      }
    });
    return;
  }

  signInActionLinks.forEach((link) => {
    link.hidden = false;
    link.setAttribute("aria-hidden", "false");
    link.href = "/account#sign-in";
    link.textContent = "Sign in";
  });

  primaryHeaderActions.forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.hidden = false;
    link.setAttribute("aria-hidden", "false");
    link.removeAttribute("data-logout-action");
    if (!link.hasAttribute("data-auth-signin") && href !== "/create-listing" && !href.startsWith("https://wa.me")) {
      link.href = "/account#create-profile";
      link.textContent = "Create profile";
    }
  });
}

updateAuthNavigation();

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-logout-action]");
  if (!button || !window.fairwaySupabase) return;
  event.preventDefault();
  button.setAttribute("aria-disabled", "true");
  await window.fairwaySupabase.auth.signOut();
  cacheAdminSession(false);
  removeAuthenticatedNavigation();
  window.location.href = "/account#sign-in";
});

if (window.fairwaySupabase) {
  window.fairwaySupabase.auth.onAuthStateChange(() => {
    updateAuthNavigation();
  });
}
