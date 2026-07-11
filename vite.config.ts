import { join, resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy, ViteStaticCopyOptions } from 'vite-plugin-static-copy';
import tailwindcss from '@tailwindcss/vite';
import oxlintPlugin from 'vite-plugin-oxlint';
import cleanPlugin from 'vite-plugin-clean';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  root: join(__dirname, 'src'),
  // Absolute asset URLs so portal deep links on portal.zenleader.xyz resolve /assets/*.
  base: '/',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: false,
    sourcemap: !isProduction,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 6000,
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        login: resolve(__dirname, 'src/login.html'),
      },
      output: {
        // [name] keeps meeting (`main`) and portal (`login`) entry bundles separate.
        entryFileNames: 'assets/js/[name]-module.[hash].js',
        chunkFileNames: 'assets/chunks/[name].[hash].js',
        assetFileNames: ({ names }) => assetFileNames(names),
        // Rolldown advancedChunks: React must outrank excalidraw so the portal
        // entry does not import React from the ~5MB excalidraw chunk.
        advancedChunks: {
          groups: [
            {
              name: 'react',
              test: /node_modules[/\\](?:react-dom|react|scheduler)(?:[/\\]|$)/,
              priority: 50,
            },
            {
              name: 'excalidraw',
              test: /node_modules[/\\]@excalidraw[/\\]|[/\\]\.pnpm[/\\]@excalidraw/,
              priority: 40,
            },
            {
              name: 'mermaid',
              test: /node_modules[/\\]mermaid(?:[/\\]|$)|[/\\]\.pnpm[/\\]mermaid@/,
              priority: 40,
            },
            {
              name: 'react-libs',
              test: /node_modules[/\\](?:react-dnd|dnd-core|react-cool-virtual|react-virtual|react-hotkeys-hook|react-draggable|react-player|@headlessui|i18next)(?:[/\\]|$)/,
              priority: 30,
            },
            {
              name: 'pnm',
              test: /node_modules[/\\](?:plugnmeet-protocol|@bufbuild|axios|@nats-io|@reduxjs|redux)(?:[/\\]|$)/,
              priority: 30,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 10,
            },
          ],
        },
      },
      watch: {
        exclude: 'node_modules/**',
      },
    },
  },
  worker: {
    format: 'iife',
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/worker/[name].[hash].js',
      },
    },
  },
  plugins: [
    {
      // Dev: serve portal SPA shell for learner routes (prod: portal.zenleader.xyz).
      name: 'zenleader-portal-spa-dev',
      configureServer(server) {
        const portalPaths = ['/login', '/my-courses', '/events', '/join'];
        server.middlewares.use((req, _res, next) => {
          if (!req.url) {
            next();
            return;
          }
          const pathOnly = req.url.split('?')[0];
          const hit = portalPaths.some(
            (p) => pathOnly === p || pathOnly.startsWith(`${p}/`),
          );
          if (hit) {
            req.url = req.url.replace(pathOnly, '/login.html');
          }
          next();
        });
      },
    },
    react(),
    tailwindcss(),
    viteStaticCopy(getStaticFilesToCopy()),
    oxlintPlugin(),
    cleanPlugin({
      targetFiles: [
        'dist/assets/js',
        'dist/assets/css',
        'dist/assets/chunks',
        'dist/assets/worker',
      ],
    }),
  ],
  define: {
    IS_PRODUCTION: isProduction,
    PNM_VERSION: JSON.stringify(process.env.npm_package_version),
    BUILD_TIME: Math.floor(Date.now() / 1000),
    'process.env': {
      IS_PREACT: false,
    },
  },
});

function assetFileNames(names: string[]) {
  const name = names[0];
  if (/\.(woff2?|ttf|eot)$/.test(name)) {
    return 'assets/fonts/[name][extname]';
  }
  if (name.endsWith('.css')) {
    if (name.startsWith('index.')) {
      return 'assets/css/main.[hash][extname]';
    }
    return 'assets/css/[name].[hash][extname]';
  }
  if (name.endsWith('.ico')) {
    return 'assets/imgs/[name][extname]';
  }
  return 'assets/js/[name][extname]';
}

function getStaticFilesToCopy(): ViteStaticCopyOptions {
  return {
    targets: [
      {
        src: [
          'assets/audio',
          'assets/backgrounds',
          'assets/imgs',
          'assets/locales',
          'assets/lti',
          'assets/config_sample.js',
          !isProduction ? 'assets/config.js' : '',
        ].filter(Boolean),
        dest: 'assets/',
        rename: { stripBase: 1 },
      },
      // login.html is a Vite MPA entry (bundled), not a static copy.
    ],
  };
}
