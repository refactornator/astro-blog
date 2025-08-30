import fs from "node:fs"
import mdx from "@astrojs/mdx"
import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import icon from "astro-icon"
import opengraphImages, { presets } from "astro-opengraph-images"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"
import remarkMath from "remark-math"

// https://astro.build/config
export default defineConfig({
  site: "https://astro-blog-9og.pages.dev",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    mdx({
      image: {
        domains: ["unsplash.com"],
      },
      optimize: true,
      shikiConfig: {
        themes: {
          light: "github-light",
          dark: "github-dark",
          langs: [],
        },
      },
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "prepend",
            properties: {
              className: "anchor",
            },
          },
        ],
        rehypeKatex,
      ],
      gfm: true,
    }),
    sitemap(),
    react({
      experimentalReactChildren: true,
    }),
    icon({
      include: {
        "fa6-solid": ["rss", "circle-half-stroke"],
        tabler: ["mail-filled"],
        "fa6-brands": ["github", "instagram", "linkedin-in"],
      },
    }),
    sitemap(),
    opengraphImages({
      render: presets.waveSvg,
      options: {
        fonts: [
          {
            name: "Geist Sans",
            weight: 400,
            style: "normal",
            data: fs.readFileSync(
              "node_modules/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff",
            ),
          },
          {
            name: "Geist Sans",
            weight: 600,
            style: "normal",
            data: fs.readFileSync(
              "node_modules/@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff",
            ),
          },
        ],
      },
    }),
  ],
})
