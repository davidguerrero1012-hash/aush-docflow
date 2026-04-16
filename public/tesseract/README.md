# Self-Hosted Tesseract.js Files

This directory contains self-hosted Tesseract.js WASM, worker, and language data files.
Self-hosting eliminates CDN dependency and supply chain risk for this PII-handling application.

## Files

| File | Source | Purpose |
|------|--------|---------|
| `tesseract-core-simd-lstm.wasm` | `tesseract.js-core` npm package | Tesseract OCR engine (SIMD+LSTM build) |
| `tesseract-core-simd-lstm.wasm.js` | `tesseract.js-core` npm package | JS loader for the WASM module |
| `worker.min.js` | `tesseract.js/dist` npm package | Web Worker script for off-thread OCR |
| `eng.traineddata.gz` | tessdata gh-pages (4.0.0) | English language model (gzipped) |

## How These Were Obtained

1. **WASM + JS loader:** Copied from `node_modules/tesseract.js-core/`
2. **Worker:** Copied from `node_modules/tesseract.js/dist/worker.min.js`
3. **Traineddata:** Downloaded from `https://github.com/naptha/tessdata/raw/gh-pages/4.0.0/eng.traineddata.gz`

## Updating

When upgrading `tesseract.js` or `tesseract.js-core`, re-copy the files:

```bash
cp node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm public/tesseract/
cp node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js public/tesseract/
cp node_modules/tesseract.js/dist/worker.min.js public/tesseract/
```

The `eng.traineddata.gz` file rarely changes and does not need to be re-downloaded on minor version bumps.

## Usage in Code

When initializing Tesseract.js, point to these self-hosted paths:

```typescript
import { createWorker } from 'tesseract.js';

const worker = await createWorker('eng', 1, {
  workerPath: '/tesseract/worker.min.js',
  corePath: '/tesseract/tesseract-core-simd-lstm.wasm.js',
  langPath: '/tesseract',
});
```

## Size

Total: ~16.5 MB (WASM 2.7 MB + JS loader 3.7 MB + worker 109 KB + traineddata 10 MB)
