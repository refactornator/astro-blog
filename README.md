# Liam Lindner

My personal site: a single page with a short bio and links. Built with [Astro](https://astro.build/) and [Tailwind CSS](https://tailwindcss.com/), deployed to [Cloudflare Pages](https://pages.cloudflare.com/) on every merge to `main`.

Live at [refactornator.com](https://refactornator.com).

## Development

Uses [bun](https://bun.sh).

```
bun i
bun dev
```

The dev server runs at [http://localhost:4321/](http://localhost:4321/).

| Command | What it does |
| --- | --- |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Serve the production build locally |
| `bun run check` | Lint and format check with Biome (runs in CI) |
| `bun run format` | Apply Biome formatting |
| `bun run lighthouse` | Build and run Lighthouse CI |
| `bun run harness` | Run the PostHog-driven optimization harness (`harness:dry` for a dry run) |

Copy `.env.example` to `.env` for the PostHog keys used by analytics and the harness.

## Where things live

- `src/pages/index.astro`: the homepage
- `src/pages/404.astro`: the not-found page
- `src/config.js`: site name, meta description, and social links
- `src/layouts/Base.astro`: page shell, background, and analytics
- `src/components/`: nav, footer, and head tags

## Credits

Originally based on the [Astrofolio](https://github.com/vikas5914/Astrofolio) template by Vikas, a port of [Nextfolio](https://github.com/1msirius/Nextfolio) by Sirius, released under the MIT License.
