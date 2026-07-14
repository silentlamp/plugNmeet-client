# plugNmeet-client (ZenLeader fork)

Frontend UI for [plugNmeet-server](https://github.com/silentlamp/plugNmeet-server) — customized fork for **ZenLeader Meet** + learner portal.

Upstream: [mynaparrot/plugNmeet-client](https://github.com/mynaparrot/plugNmeet-client).

## ZenLeader branch & CI/CD (important)

This repo is the **silentlamp** fork. Day-to-day ZenLeader work and production deploy do **not** use GitHub `main`.

| Item                    | Value                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| Working / deploy branch | **`zenleader/dev`**                                                                              |
| Remote                  | `origin` → `https://github.com/silentlamp/plugNmeet-client.git`                                  |
| CI workflow             | [`.github/workflows/deploy-zenleader-client.yml`](.github/workflows/deploy-zenleader-client.yml) |
| Trigger                 | `push` to **`zenleader/dev`** (or `workflow_dispatch`)                                           |
| Deploys                 | Meet UI → `/opt/plugNmeet/client/dist` **and** portal → `/var/www/portal.zenleader.xyz`          |

**Agent / contributor rules**

1. Checkout and push feature work against **`zenleader/dev`**, not `main`.
2. Open PRs with base **`zenleader/dev`**. Merging only to `main` will **not** run ZenLeader deploy.
3. `main` may track upstream-style history; treat it as non-production for ZenLeader.
4. Ops source of truth: [`zen-leader-deploy/AGENTS.md`](https://github.com/MiraiMagicLab/zen-leader-deploy/blob/main/AGENTS.md).

```bash
git fetch origin
git checkout zenleader/dev
git pull origin zenleader/dev
```

## Local development

1. Clone the **fork** and use `zenleader/dev`.
2. Copy config:

```
cp src/assets/config_sample.js src/assets/config.js
```

3. Start the client; ZenLeader portal is at http://localhost:3000/login

```
pnpm install
pnpm start
# production build
pnpm run build
```

Portal OAuth client IDs come from repo-root `.env` / `.env.production` (`VITE_PORTAL_GOOGLE_CLIENT_ID`, `VITE_PORTAL_APPLE_CLIENT_ID`).

### Translation

Upstream translations use [crowdin](https://crowdin.com/project/plugnmeet-client). ZenLeader ships `en` + `vi-VN` (and other locale files) in-tree.
