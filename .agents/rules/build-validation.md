## Validação Contínua de Build e Testes

Sempre que qualquer alteração de código for realizada (Rust ou TypeScript/React):

1. **Verificação de Compilação Rust:**
   - Execute `cargo check` ou `cargo test` no diretório `src-tauri` para garantir que todos os binários (`siteblock`, `siteblock-admin`, `siteblock-browser-bridge`) e a biblioteca (`siteblock_lib`) estejam compilando sem erros ou warnings bloqueantes.
2. **Verificação de Compilação do Frontend:**
   - Execute `pnpm run build` na raiz do projeto para validar que TypeScript (`tsc`) e Vite geram o bundle sem falhas de tipo.
3. **Integridade do `pnpm run tauri dev`:**
   - O `Cargo.toml` deve sempre manter `default-run = "siteblock"` para evitar que `cargo run` falhe devido a múltiplos binários.
