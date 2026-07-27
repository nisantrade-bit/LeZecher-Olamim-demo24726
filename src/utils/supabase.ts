02:26:58.560 Running build in Washington, D.C., USA (East) – iad1
02:26:58.560 Build machine configuration: 2 cores, 8 GB
02:26:58.687 Cloning github.com/nisantrade-bit/LeZecher-Olamim-demo24726 (Branch: main, Commit: 49acdcd)
02:26:59.010 Cloning completed: 323.000ms
02:26:59.366 Restored build cache from previous deployment (7ZbbybWiTaLTjt7ugUXCM2jjjTQa)
02:26:59.549 Running "vercel build"
02:26:59.577 Vercel CLI 56.5.0
02:27:00.105 Installing dependencies...
02:27:00.142 bun install v1.3.12 (700fc117)
02:27:00.162 Resolving dependencies
02:27:01.272 Resolved, downloaded and extracted [452]
02:27:01.351 Saved lockfile
02:27:01.352 
02:27:01.352 12 packages removed [1224.00ms]
02:27:01.368 Running "bun run build"
02:27:01.371 $ vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
02:27:01.755 vite v5.4.1 building for production...
02:27:01.804 transforming...
02:27:04.071 ✓ 1861 modules transformed.
02:27:04.073 x Build failed in 2.29s
02:27:04.073 error during build:
02:27:04.075 src/App.tsx (25:19): "isMissingTableError" is not exported by "src/utils/supabase.ts", imported by "src/App.tsx".
02:27:04.075 file: /vercel/path0/src/App.tsx:25:19
02:27:04.075 
02:27:04.075 23: import INITIAL_DATABASE from '../database.json';
02:27:04.075 24: 
02:27:04.075 25: import { supabase, isMissingTableError, SUPABASE_SETUP_SQL, safeUpsert, safeEq, safeDelete, safeDeleteAll, safeSelect...
02:27:04.075                        ^
02:27:04.075 26: export { supabase, isMissingTableError, SUPABASE_SETUP_SQL, safeUpsert, safeEq, safeDelete, safeDeleteAll, safeSelect...
02:27:04.075 
02:27:04.075     at getRollupError (file:///vercel/path0/node_modules/rollup/dist/es/shared/parseAst.js:317:41)
02:27:04.075     at error (file:///vercel/path0/node_modules/rollup/dist/es/shared/parseAst.js:313:42)
02:27:04.075     at Module.error (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:17396:16)
02:27:04.076     at Module.traceVariable (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:17829:29)
02:27:04.076     at ModuleScope.findVariable (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:15419:39)
02:27:04.076     at FunctionScope.findVariable (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:5684:38)
02:27:04.076     at FunctionBodyScope.findVariable (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:5684:38)
02:27:04.076     at ReturnValueScope.findVariable (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:5684:38)
02:27:04.076     at FunctionBodyScope.findVariable (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:5684:38)
02:27:04.076     at TrackingScope.findVariable (file:///vercel/path0/node_modules/rollup/dist/es/shared/node-entry.js:5684:38)
02:27:04.098 error: script "build" exited with code 1
02:27:04.104 Error: Command "bun run build" exited with 1
