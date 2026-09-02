# Graph Report - siteblock  (2026-09-02)

## Corpus Check
- 28 files · ~8,384 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 252 nodes · 359 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `26422bee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- SiteBlock
- package-chromium-extension.py

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `PrivilegedSession` - 13 edges
3. `session_request()` - 12 edges
4. `SiteBlockState` - 11 edges
5. `install_siteblock_service()` - 11 edges
6. `start_privileged_session()` - 10 edges
7. `save_siteblock_config()` - 9 edges
8. `scripts` - 8 edges
9. `adopt_session()` - 8 edges
10. `get_siteblock_status()` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (23 total, 3 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.17
Nodes (32): BrowserIntegration, BufReader, Child, ChildStdin, ChildStdout, Mutex, Option, Result (+24 more)

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
Cohesion: 0.08
Nodes (23): deb, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, security (+15 more)

### Community 5 - "manifest.json"
Cohesion: 0.10
Nodes (20): action, default_title, background, service_worker, type, browser_specific_settings, gecko, description (+12 more)

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

### Community 21 - "SiteBlock"
Cohesion: 0.33
Nodes (5): Comportamento do agendamento, Criar pacote Linux, Executar em desenvolvimento, Navegadores, SiteBlock

### Community 22 - "package-chromium-extension.py"
Cohesion: 0.70
Nodes (4): bytes_field(), call(), main(), varint()

## Knowledge Gaps
- **104 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `manifest_version` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `tauri.conf.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._