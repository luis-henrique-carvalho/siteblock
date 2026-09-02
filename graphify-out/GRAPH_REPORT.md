# Graph Report - siteblock  (2026-09-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 240 nodes · 342 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- lib.rs
- siteblock-admin
- devDependencies
- compilerOptions
- tauri.conf.json
- manifest.json
- scripts
- default.json
- compilerOptions
- App.tsx
- background.js
- siteblock-browser-bridge
- .prettierrc.json
- install-linux.sh
- siteblock-browser-bridge-chromium
- siteblock-browser-bridge-firefox

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `PrivilegedSession` - 13 edges
3. `session_request()` - 12 edges
4. `SiteBlockState` - 11 edges
5. `install_siteblock_service()` - 10 edges
6. `start_privileged_session()` - 10 edges
7. `save_siteblock_config()` - 9 edges
8. `adopt_session()` - 8 edges
9. `get_siteblock_status()` - 8 edges
10. `scripts` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (21 total, 3 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.18
Nodes (31): BrowserIntegration, BufReader, Child, ChildStdin, ChildStdout, Mutex, Option, Result (+23 more)

### Community 1 - "siteblock-admin"
Cohesion: 0.16
Nodes (31): datetime, active(), applies_now(), apply(), atomic_write(), blocked_hosts(), blocked_url_filters(), browser_integrations() (+23 more)

### Community 2 - "devDependencies"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint (+21 more)

### Community 3 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+14 more)

### Community 4 - "tauri.conf.json"
Cohesion: 0.09
Nodes (22): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, security, windows (+14 more)

### Community 5 - "manifest.json"
Cohesion: 0.09
Nodes (21): action, default_title, background, service_worker, type, browser_specific_settings, gecko, description (+13 more)

### Community 6 - "scripts"
Cohesion: 0.09
Nodes (21): dependencies, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-opener, name, private, scripts (+13 more)

### Community 7 - "default.json"
Cohesion: 0.22
Nodes (8): core:default, main, opener:default, description, identifier, permissions, $schema, windows

### Community 8 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 9 - "App.tsx"
Cohesion: 0.32
Nodes (6): App(), BrowserIntegration, formatSystemError(), Schedule, SiteBlockState, weekdays

### Community 10 - "background.js"
Cohesion: 0.73
Nodes (5): applyRules(), blockedPage(), browserApi(), connect(), domainForUrl()

### Community 11 - "siteblock-browser-bridge"
Cohesion: 0.60
Nodes (5): main(), read_message(), record_client(), send(), state()

### Community 12 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

## Knowledge Gaps
- **101 isolated node(s):** `BrowserIntegration`, `Schedule`, `SiteBlockState`, `printWidth`, `semi` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `BrowserIntegration`, `Schedule`, `SiteBlockState` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `tauri.conf.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._