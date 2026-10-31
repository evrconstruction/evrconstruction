# Posts Manager — Supported Upload Formats

**Date:** 2026-10-31
**Repo:** `/home/wicked/Projects/evrconstruction` — base commit `56f4701`, branch `main`
**Requested by the owner:** HEIC photos from an iPhone are uploaded and never appear. Make the
supported formats explicit in the UI. The owner converts images before uploading; converting on
the server was **explicitly rejected** for this change.

**Status:** DONE — committed `b2885c6`, pushed to `main`, deployed and verified live.

**Deploy evidence (measured, not assumed):** the push created the `App Hosting - Rollout
(evrconstruction-5f7bd/us-east4/evrconstruction)` check run on `b2885c6`, which reached
`completed/success`, together with the `build` check run (`completed/success`). Live after the
rollout: `/` 200 · `/projects` 200 · `/admin/posts` 200 · `/api/admin/posts` **401** (auth boundary
intact).

⚠️ The rollout could **not** be confirmed through the App Hosting REST API this session — both the
`firebase` CLI and `gcloud` credentials are expired (`requested reauth, cannot prompt in
non-interactive execution`). The commit check run is the evidence used instead. Nothing depends on
those credentials; deploys are git push.

---

## 1. Why a HEIC upload produced nothing

HEIC was blocked at three independent points. Each one alone was enough to make the image vanish.

| Gate | File | Before |
|---|---|---|
| Picker filter | `src/lib/posts.ts` → `POST_IMAGE_MIME_TYPES`, used as `accept` | Listed only `jpeg/png/webp/avif`, so HEIC was greyed out in the file dialog |
| Browser decode | `handleFileSelect` in `posts/page.tsx` | Chrome/Firefox on Linux cannot decode HEIC → `img.onerror` → silently kept the **raw** `data:image/heic;base64,…` |
| Server allow-list | `src/app/api/admin/posts/route.ts` | `image/heic` was not accepted → `400 Unsupported image format` |

The failure mode was the worst kind: selecting a HEIC produced **no visible error**. The preview
rendered as a broken image (the fallback stored a data URL the browser could not display), and the
only feedback came at publish time, as a generic 400.

**Measured, not assumed:** the prebuilt `sharp`/libvips binaries — already on disk at 0.35.5 via
Next — support JPEG, PNG, Ultra HDR, WebP, AVIF, TIFF, GIF and SVG. **HEIC/HEIF is not among them**
(source: sharp installation docs, checked 2026-10-31). Server-side HEIC decoding therefore needs an
extra libheif dependency, which is why it was not done here.

---

## 2. What changed

One shared source for the format list, so the label, the picker and the API error cannot drift.

### `src/lib/posts.ts`
- `MIME_TYPE_LABELS` maps each accepted MIME type to its display name.
- `POST_IMAGE_FORMAT_LABEL` → `"JPG, PNG, WebP, AVIF"`, derived from `POST_IMAGE_MIME_TYPES`.
- `POST_IMAGE_ACCEPT` → the MIME types plus `.jpg` / `.jpeg` for older pickers that only match
  extensions. Documented in-code that `accept` is advisory, not a filter.

### `src/app/(admin)/admin/posts/page.tsx`
- `handleFileSelect` now rejects any file whose `file.type` is not in the allow-list, naming the
  supported formats and stating that iPhone HEIC must be converted. Previously such a file fell
  through `img.onerror` and previewed as a broken image, then failed at publish.
- The input value is cleared on every selection, so choosing the same file twice still fires
  `onChange`.
- `publishError` is cleared when a valid file is selected, so a stale error no longer sits above a
  working preview.
- Picker hint replaced `PNG, JPG, WebP or AVIF up to 10MB` with
  `Supported: JPG, PNG, WebP, AVIF · up to 10MB`, plus a rose line:
  `iPhone HEIC photos are not supported — convert to JPG first.`

### `src/app/api/admin/posts/route.ts`
- The 400 now states the offending type and the accepted set:
  `Unsupported image format (image/heic). Use JPG, PNG, WebP, AVIF.`

---

## 3. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on the three edited files | exit 0 |
| `npm test` (vitest) | 13 files, 143 tests, all pass |
| `git diff --stat` | 3 files, +60 / −4 — no collateral edits |

**Not verified:** the picker rendering itself. The owner must open the upload modal and confirm the
hint reads correctly — no browser pass was performed in this session.

---

## 4. Deliberately left alone

- **Server-side HEIC conversion.** Rejected by the owner. Would require `sharp` as a declared
  dependency plus a libheif decoder (`heic-decode` / `libheif-js`), ~9 MB unpacked WASM, and a
  CPU-heavy synchronous decode per upload.
- **`data:` URL fallthrough (still open).** In `route.ts`, if `src` starts with `data:image` but the
  base64 regex fails to match, `storagePath` stays `""` and the **entire data URL is written into the
  Firestore post document** as `src`. It should be a 400. Not touched here — separate defect, needs
  its own approval.
- **`aspect-16/9` on line 379** of `posts/page.tsx` — pre-existing lint hint suggesting
  `aspect-video`. Unrelated to this change.

---

## 5. If HEIC support is wanted later

Two routes, both costed but **not implemented or benchmarked**:

1. **Server-side** — `sharp` + `heic-decode` in a helper shared by the upload and
   `suggest-caption` routes; normalise to WebP at max 1920px. Gives a web-optimised output as a
   side effect. Decode time for a 12 MP photo is roughly 1–3 s (estimated, **not measured**).
2. **Client-side** — `heic2any` (WASM, ~1 MB, lazy-loaded) converts in the browser before the
   existing canvas compression runs. No server dependency; slow on older machines.
