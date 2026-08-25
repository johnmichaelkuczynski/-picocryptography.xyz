---
name: video-js scaffold gotchas
description: Recurring build breakages when the DESIGN subagent builds a new video-js artifact, and their fixes.
---

# video-js scaffold gotchas

After delegating a video-js build to the DESIGN subagent, these breakages recur and must be fixed by the main agent before the build is clean:

- **Scene transition imports**: scenes often `import { clipPolygon|splitVertical|clipCircle|fadeBlur } from '@/lib/video/animations'`. These are NOT named exports — they are keys of the exported `sceneTransitions` object. Fix: `import { sceneTransitions }` and spread `{...sceneTransitions.<key>}`.

- **CSS @import ordering**: a Google Fonts `@import url(...)` placed AFTER `@import "tailwindcss";` triggers postcss "@import must precede all other statements" because Tailwind inlines first. Fix: put the font `@import` on line 1, above the tailwind import.

- **tsconfig missing DOM lib**: the newer video-js scaffold `tsconfig.json` omits `"lib": ["esnext","dom","dom.iterable"]`, so typecheck fails with `Cannot find name 'window'/'document'` and framer-motion Variant type errors. Fix: add that `lib` line (matches the older working sibling artifact).

- **Manual production builds need artifact env**: running a video package build outside its managed workflow requires both `PORT` and `BASE_PATH`; the workflow supplies them automatically.

**Why:** the DESIGN subagent's output is not verified by it, and the scaffold version drifts; these three issues appeared together on a fresh build.

**How to apply:** after the subagent returns, restart the workflow and read logs; expect these and fix before running the scene-selector/audio post-build steps. For a manual build, set the workflow-equivalent `PORT` and `BASE_PATH`. Then run `pnpm --filter @workspace/<slug> run typecheck` to catch the tsconfig one (dev server alone won't surface it).
