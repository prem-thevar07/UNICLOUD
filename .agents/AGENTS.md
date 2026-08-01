# Unicloud Master Architectural Rules & System Contracts

## 1. Files Page (`/files`) & Router Contracts
When modifying `/open` or `/download` backend routes (`google.storage.routes.js`, `onedrive.routes.js`, `box.routes.js`, `dropbox.routes.js`, `s3.routes.js`) or frontend `FilePreviewModal.jsx`:

- **Images (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`)**:
  - MUST return raw binary byte stream with `Content-Type: image/jpeg` (or matching mime) and `Content-Disposition: inline`.
  - NEVER redirect to HTML iframe embed pages (e.g. Box expiring embed or Google Drive preview URLs) for images.

- **Audio & Video (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.mp4`, `.webm`, `.mov`, `.mkv`)**:
  - MUST return raw binary byte stream with `Content-Type: audio/mpeg` / `video/mp4` and `Content-Disposition: inline`.
  - HTML5 `<audio>` and `<video>` tags require raw byte streams.

- **PDFs (`.pdf`)**:
  - For OneDrive & Office Viewers: Route via `https://view.officeapps.live.com/op/view.aspx?src=...` or authenticated PDF proxy stream with `Content-Disposition: inline`.
  - NEVER return `Content-Disposition: attachment` for `/open` routes as it triggers automatic file downloads instead of in-browser previewing.

- **Code & Text Files (`.js`, `.jsx`, `.ts`, `.tsx`, `.py`, `.json`, `.html`, `.css`, `.cpp`, `.c`, `.java`, `.sql`, `.md`, `.txt`, `.sh`, `.env`, `.log`, `.xml`, `.yaml`, `.yml`, `.ipynb`)**:
  - MUST return direct text stream (`Content-Type: text/plain; charset=utf-8` or `application/json`) with CORS headers (`Access-Control-Allow-Origin: *`).
  - Monaco Editor and Jupyter Notebook parser fetch text inline via `fetch(openUrl, { headers: { Authorization } })`.

- **Microsoft Office Documents (`.docx`, `.doc`, `.xlsx`, `.xls`, `.csv`, `.pptx`, `.ppt`)**:
  - Route to `https://view.officeapps.live.com/op/view.aspx?src=...` (or `embed.aspx`).

## 2. Transfer & Migration Page (`/transfer`) Contracts
- **Zero-Disk Streaming**:
  - Source read streams MUST pipe directly into destination write streams with backpressure control. Zero bytes of local disk are consumed.
- **Provider Chunking Requirements**:
  - OneDrive: 320 KB multiples.
  - Dropbox: 4MB - 8MB chunked append sessions.
  - S3: 5MB minimum multipart upload chunks.
- **Token Refresh Mid-Transfer**:
  - Transfer workers must auto-refresh 401 expired OAuth tokens mid-job and resume without throwing fatal errors.

## 3. Storage Optimization & Cleanup Page (`/optimize`) Contracts
- **Duplicate Indexing**:
  - Match by exact size first, then compare provider hashes (`md5Checksum`, `sha1`, `content_hash`, `etag`), then normalized filenames.
- **Trash Cleaner**:
  - One-click cross-cloud empty trash calling native provider APIs (`drive.files.emptyTrash()`).

## 4. In-App Code Editor & Live Code Runner Engine (`FilePreviewModal.jsx`)
- Uses `@monaco-editor/react` with VS Code dark theme (`vs-dark`).
- **Python**: Executed via Pyodide WebAssembly Python 3.11 engine (`window.loadPyodide()`) capturing `stdout` (`print()`) in real-time.
- **Java, C++, C, C#, Go, Rust, Ruby, PHP, Swift, Kotlin**: Executed via Piston Multi-Language Compiler API (`https://emkc.org/api/v2/piston/execute`).
- **JavaScript & TypeScript**: Evaluated natively capturing `console.log()` and return values.
