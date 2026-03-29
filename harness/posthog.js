// harness/posthog.js — PostHog REST API client for fetching surface-specific metrics.
// Uses the Query API (separate host from browser SDK).

const POSTHOG_API_HOST =
  process.env.POSTHOG_API_HOST ?? "https://us.posthog.com";
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

if (!POSTHOG_PERSONAL_API_KEY || !POSTHOG_PROJECT_ID) {
  throw new Error(
    "Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID in .env"
  );
}

export async function getMetrics(windowHours = 48) {
  const since = new Date(
    Date.now() - windowHours * 60 * 60 * 1000
  ).toISOString();

  const [
    pageViews,
    homeBioSocialClicks,
    footerSocialClicks,
    projectsNavClicks,
  ] = await Promise.all([
    queryCount("page_view", since, { pathname: "/" }),
    queryCount("social_link", since, { surface: "home_bio" }),
    queryCount("social_link", since, { surface: "footer" }),
    queryCount("nav_link", since, { label: "projects" }),
  ]);

  const safe = (n, d) => (d > 0 ? n / d : null);

  return {
    page_views: pageViews,
    home_bio_social_clicks: homeBioSocialClicks,
    home_bio_social_ctr: safe(homeBioSocialClicks, pageViews),
    footer_social_clicks: footerSocialClicks,
    footer_social_ctr: safe(footerSocialClicks, pageViews),
    projects_nav_clicks: projectsNavClicks,
    projects_nav_ctr: safe(projectsNavClicks, pageViews),
    window_hours: windowHours,
    measured_at: new Date().toISOString(),
  };
}

async function queryCount(eventName, since, properties = {}) {
  const url = new URL(
    `/api/projects/${POSTHOG_PROJECT_ID}/events/`,
    POSTHOG_API_HOST
  );
  url.searchParams.set("event", eventName);
  url.searchParams.set("after", since);
  url.searchParams.set("limit", "2000");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}` },
  });

  if (!res.ok) {
    console.warn(`[posthog] ${eventName} query failed: ${res.status}`);
    return 0;
  }

  const data = await res.json();
  const results = data.results ?? [];

  if (Object.keys(properties).length === 0) return results.length;

  return results.filter((event) =>
    Object.entries(properties).every(
      ([k, v]) => event.properties?.[k] === v
    )
  ).length;
}
