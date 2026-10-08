// Lists every static page; skips 404 and dynamic [param] routes
const pages = import.meta.glob("./**/*.astro")

const paths = Object.keys(pages)
  .map((file) => file.replace(/^\./, "").replace(/(index)?\.astro$/, ""))
  .filter((path) => path !== "/404" && !path.includes("["))
  .sort()

export const GET = ({ site }) => {
  const urls = paths.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join("\n")

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    { headers: { "Content-Type": "application/xml" } },
  )
}
