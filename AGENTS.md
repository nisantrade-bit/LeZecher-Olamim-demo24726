# Project Instructions - "לזכר עולמים"

## Core Architecture & Guidelines

1. **State in URL & Dual Persistence (Universal Link Sharing)**
   - All shared links for memorial pages must contain the self-contained encoded payload directly inside the URL (`data` query parameter using UTF-8/Base64 encoding).
   - Any memorial card created or updated must also sync to the cloud database server API (`/api/deceased`) as well as local storage.
   - When a link with a payload is opened on any device or browser, the system decodes the payload, immediately renders the memorial page, and syncs the record into the master list and server database.
   - This guarantees that every link shared via WhatsApp, Email, or Social Media opens flawlessly on any device without encountering a "Card Not Found" error.

2. **Styling & Theme**
   - Maintain a rich, luxurious dark theme layout (`#070b12` background, gold/amber accents `#c8a96e`, clean typography).
   - Rely strictly on Tailwind CSS utility classes and inline styles. Do NOT use external CSS files or custom CSS imports.

3. **Functionality**
   - Provide complete, non-truncated, high-quality TypeScript code.
   - Support Hebrew calendar calculations, Shabbat candle lighting times, memorial study texts (Mishnah, Psalms, Torah portions), WhatsApp sharing, and multi-language support (Hebrew, English, Russian).
