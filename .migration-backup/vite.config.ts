import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { siteLinks } from './src/data/site-links';
import { VitePWA } from 'vite-plugin-pwa';

function buildSitemapXml(baseUrl: string, paths: string[]) {
  const lastmod = new Date().toISOString();
  const urlset = paths
    .map((p) => {
      const loc = `${baseUrl}${p}`;
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        "    <changefreq>weekly</changefreq>",
        "    <priority>0.7</priority>",
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    urlset,
    "</urlset>",
    "",
  ].join("\n");
}

function sitemapPlugin(): Plugin {
  return {
    name: "3v-sitemap",
    apply: "build" as const,
    generateBundle(this: any) {
      // Public pages only (exclude /admin, /auth)
      const baseUrl = "https://voie-verite-vie.org";
      // Build sitemap paths from central `siteLinks` to keep navigation + sitemap in sync
      const paths = Array.from(new Set(siteLinks.flatMap((c) => c.items.map((i) => i.href))));

      const xml = buildSitemapXml(baseUrl, paths);
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: xml });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: true,
    middlewareMode: false,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    sitemapPlugin(),
    mode === 'production' && VitePWA({
      registerType: 'prompt',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.ico', 'robots.txt'],
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Voie Vérité Vie',
        short_name: 'Voie Vérité Vie',
        description: 'Sanctuaire spirituel et phare d\'espérance pour la jeunesse',
        theme_color: '#5AB4DB',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
