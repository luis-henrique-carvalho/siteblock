# Arquitetura do SiteBlock

Este documento descreve a arquitetura técnica, os princípios de design, o modelo de segurança e as convenções adotadas no **SiteBlock**.

---

## 1. Visão Geral do Sistema

O SiteBlock é um aplicativo desktop projetado para controle de foco e produtividade, permitindo o bloqueio programado de domínios na web diretamente no nível do sistema operacional e dos navegadores.

O sistema opera com um modelo de **dois processos e separação de privilégios**:
1. **Frontend + Core Tauri (Espaço de Usuário)**: Interface em React 19 / TypeScript e runtime Tauri em Rust, executando sem permissões de root.
2. **Helper Administrativo (`siteblock-admin`) (Espaço Privilegiado)**: Processo auxiliar independente disparado sob demanda via `pkexec` (Polkit) para aplicar configurações em arquivos protegidos do sistema (`/etc/hosts`, `/etc/opt/chrome/policies/...`, `/etc/firefox/policies/...`).

```mermaid
graph TD
    subgraph "Espaço de Usuário (Sem Root)"
        UI["Frontend (React 19 + TypeScript)"]
        IPC["Tauri IPC (Commands & Events)"]
        Presentation["Presentation Layer (commands, tray, state)"]
        AppLayer["Application Layer (Use Cases)"]
        DomainLayer["Domain Layer (Entities, Ports, Rules)"]
        SystemSession["Infrastructure: SystemSession (pkexec manager)"]
    end

    subgraph "Fronteira de Segurança (Polkit / pkexec)"
        PKExec["pkexec /usr/local/lib/siteblock/siteblock-admin session"]
    end

    subgraph "Espaço Privilegiado (Root)"
        AdminBin["siteblock-admin (Daemon / CLI)"]
        AdminProtocol["Infrastructure: admin_protocol"]
        HostsAdapter["Infrastructure: hosts (/etc/hosts)"]
        BrowserPolicyAdapter["Infrastructure: browser_policy (/etc/.../policies)"]
        FocusDB["Infrastructure: focus_stats (/var/lib/siteblock/focus.db)"]
    end

    UI <-->|IPC| IPC
    IPC <--> Presentation
    Presentation --> AppLayer
    AppLayer --> DomainLayer
    AppLayer --> SystemSession
    SystemSession -->|Pipes stdin/stdout| PKExec
    PKExec --> AdminBin
    AdminBin --> AdminProtocol
    AdminProtocol --> HostsAdapter
    AdminProtocol --> BrowserPolicyAdapter
    AdminProtocol --> FocusDB
```

---

## 2. As Camadas da Clean Architecture (`src-tauri`)

O backend Rust está organizado estritamente de acordo com a **Clean Architecture / Ports and Adapters (Arquitetura Hexagonal)**:

```
src-tauri/src/
├── domain/            # 1. Regras de negócio puras e contratos (independente de frameworks)
├── application/       # 2. Casos de uso e orquestrações de fluxo
├── infrastructure/    # 3. Adaptadores concretos de SO, arquivos, banco e processos
├── presentation/      # 4. Adaptadores de interface (Tauri commands, tray, menus)
├── bin/
│   └── admin.rs       # Ponto de entrada do executável privilegiado siteblock-admin
└── lib.rs             # Configuração do builder e plugins Tauri v2
```

### 2.1. Camada de Domínio (`domain/`)
- **Responsabilidade**: Define as entidades centrais, regras de cálculo e contratos (traits/ports).
- **Regra de Ouro**: **Nunca** importa nada de `infrastructure`, `presentation` ou da API do Tauri.
- **Arquivos principais**:
  - `entities.rs`: Entidades ricas com métodos de negócio:
    - `Schedule::applies_now(&self, now: DateTime<Local>) -> bool`: Avalia se uma janela de horário está ativa no momento (incluindo turnos que cruzam a meia-noite).
    - `Profile::is_active(&self, now: DateTime<Local>) -> bool`: Verifica se um perfil está ativo considerando seus horários.
    - `SiteBlockConfig::effective_blocked_domains(&self, now: DateTime<Local>) -> Vec<String>`: Agrega a união de todos os domínios ativos.
    - `SiteBlockConfig::should_block(&self, now: DateTime<Local>) -> bool`: Avalia se o bloqueio geral deve ser acionado.
  - `ports.rs`: Contratos tipados de inversão de dependência:
    - `HelperPort`: Verificação de instalação do helper no sistema.
    - `SessionPort`: Comunicação tipada com a sessão administrativa (`status()`, `set_config()`, `send_focus_statistics()`).
    - `InstallerPort`: Instalação dos arquivos privilegiados e regras de polkit.
  - `errors.rs`: Erros tipados da aplicação com `thiserror`.

### 2.2. Camada de Aplicação (`application/`)
- **Responsabilidade**: Coordena as ações do usuário executando fluxos de use cases.
- **Regra de Ouro**: Não sabe como a UI funciona nem como o sistema operacional aplica as regras; apenas orquestra o domínio e as portas.
- **Casos de Uso**:
  - `ToggleBlockingUseCase`: Alterna o estado de proteção prevenindo cliques concorrentes via `BusyGuard` atômico.
  - `StartSessionUseCase`: Inicia a sessão com o helper administrativo e recupera o estado.
  - `SaveConfigUseCase`: Valida e salva uma nova configuração migrada.
  - `GetStatusUseCase`: Lê o estado atual do sistema sem exigir privilégios de root.
  - `GetFocusStatisticsUseCase`: Consulta dados agregados de foco no SQLite.
  - `InstallServiceUseCase`: Instala os binários privilegiados no sistema.

### 2.3. Camada de Infraestrutura (`infrastructure/`)
- **Responsabilidade**: Implementa as interfaces da camada de domínio, interagindo com o disco, processos externos, rede e banco de dados.
- **Componentes especializados**:
  - `hosts.rs`: Renderização limpa de blocos gerenciados no `/etc/hosts` e gravação atômica (`atomic_write`).
  - `browser_policy.rs`: Sistema declarativo de políticas de navegadores (`BrowserEngine` e `BrowserSpec`).
  - `admin_protocol.rs`: Roteamento e despacho de mensagens JSON consumidas pelo helper privilegiado.
  - `focus_stats.rs`: Persistência de sessões de foco em banco de dados SQLite local (`/var/lib/siteblock/focus.db`).
  - `system_session.rs`: Gerenciador de subprocesso `pkexec` com comunicação IPC bidirecional via pipes `stdin`/`stdout`.
  - `system_helper.rs`: Verificações locais de binários instalados no `/usr/local/lib/siteblock/`.
  - `system_core.rs`: Facade e orquestrador de alto nível entre os adaptadores de infraestrutura.

### 2.4. Camada de Apresentação (`presentation/`)
- **Responsabilidade**: Interface de entrada do Tauri (commands, system tray e menu).
- **Componentes**:
  - `commands.rs`: Handlers invocados pelo frontend React via `invoke("nome_do_comando")`.
  - `tray.rs`: Controlador do ícone da barra de tarefas (Tray Icon) com visualização de estados (Ativo, Desativado, Ocupado, Erro).
  - `state.rs`: `AppState` gerenciado pelo Tauri com injeção de dependências dos use cases e portas.
  - `menu.rs`: Menu nativo da janela desktop e atalhos de teclado.

---

## 3. Arquitetura do Frontend (`src`)

O frontend do SiteBlock é uma Single Page Application construída com **React 19**, **TypeScript** e **Vite**, projetada segundo princípios de arquitetura orientada a componentes, separação estrita de responsabilidades e desacoplamento da camada de runtime do Tauri.

```mermaid
graph TD
    subgraph "Camada de Apresentação (View)"
        Components["Componentes React (Hero, Profiles, Schedules, Domains, UI)"]
        Dialogs["Modais (Preferences, About, SetupBanner)"]
    end

    subgraph "Camada de Orquestração (Hooks)"
        UseSiteBlock["useSiteBlock()"]
        UseFocusStats["useFocusStatistics()"]
        UseLang["useLanguage()"]
    end

    subgraph "Camada de Estado Global (Zustand Stores)"
        SiteBlockStore["useSiteBlockStore (Config, Perfis, Domínios)"]
        UIStore["useUIStore (Busy, Modais, Mensagens)"]
        PreferencesStore["usePreferencesStore (Idioma, Tema)"]
    end

    subgraph "Camada de Serviços & Abstração IPC"
        ISiteBlockApi["<<interface>> ISiteBlockApi"]
        TauriApi["TauriSiteBlockApi (invoke / listen)"]
        StorePlugin["LazyStore (settings.json)"]
    end

    subgraph "Runtime Tauri (Rust)"
        BackendCommands["Tauri Commands & Events"]
    end

    Components --> UseSiteBlock
    Components --> UseLang
    Dialogs --> UIStore
    Dialogs --> PreferencesStore
    UseSiteBlock --> SiteBlockStore
    UseSiteBlock --> UIStore
    UseFocusStats --> ISiteBlockApi
    SiteBlockStore --> ISiteBlockApi
    PreferencesStore --> StorePlugin
    ISiteBlockApi <|.. TauriApi
    TauriApi <-->|IPC Commands & Events| BackendCommands
```

### 3.1. Estrutura de Diretórios do Frontend

```
src/
├── components/          # Componentes visuais organizados por domínio funcional
│   ├── browser/         # Lista de status e toggles de navegadores (Chrome, Firefox, etc.)
│   ├── common/          # Componentes genéricos compartilhados (LoadingScreen, etc.)
│   ├── controls/        # Controles principais (MasterSwitch de ativação/desativação)
│   ├── domains/         # Gerenciamento de domínios (listagem, validação e adição)
│   ├── hero/            # Banner principal com status geral e perfis ativos
│   ├── layout/          # Estrutura de tela (TopBar, Footer)
│   ├── preferences/     # Painel de configurações (idioma, tema) e modal Sobre
│   ├── profiles/        # Abas de perfis, gerenciamento de cores e ícones
│   ├── schedules/       # Agendador semanal e seleção de faixas horárias
│   ├── setup/           # Banners e avisos de instalação do helper privilegiado
│   ├── statistics/      # Painel de métricas de foco com gráficos Recharts
│   └── ui/              # Primitivas acessíveis do Design System (Radix UI + shadcn)
├── hooks/               # Custom hooks de orquestração (useSiteBlock, useFocusStatistics)
├── stores/              # Stores Zustand (useSiteBlockStore, useUIStore, usePreferencesStore)
├── services/            # Abstração de IPC e comunicação com o backend (siteblockApi)
├── i18n/                # Dicionários tipados (pt-BR, en-US) e Provider de tradução
├── types/               # Tipos TypeScript espelhando os DTOs do Rust
└── utils/               # Validadores de domínio, helpers de horários e logger
```

### 3.2. Gerenciamento de Estado (Zustand Stores)

O estado da aplicação é segregado em três stores especializadas para evitar re-renderizações desnecessárias e manter fronteiras claras:

1. **`useSiteBlockStore` (`src/stores/useSiteBlockStore.ts`)**:
   - **Responsabilidade**: Armazena e sincroniza o estado central do aplicativo (`SiteBlockState`), perfis, domínios, agendamentos e lista de navegadores habilitados.
   - **Garantia de Atomicidade**: Operações de mutação (`toggleEnabled`, `addDomain`, `saveSchedules`, `createProfile`, etc.) realizam validações locais antes de persistir e utilizam a função `commit()` para enviar o novo estado ao backend via IPC. Caso o backend rejeite a alteração, o estado é revertido e uma notificação de erro é propagada.
   - **Injeção de Dependência**: A store aceita instâncias customizadas de `ISiteBlockApi`, viabilizando testes unitários e de integração 100% isolados da WebView do Tauri.

2. **`useUIStore` (`src/stores/useUIStore.ts`)**:
   - **Responsabilidade**: Controla estados efêmeros da interface do usuário.
   - **BusyGuard**: O sinalizador `busy` bloqueia interações e botões críticos durante invocações assíncronas do backend, prevenindo cliques duplos e condições de corrida no frontend.
   - **Modais e Mensagens**: Visibilidade de diálogos secundários (`preferencesOpen`, `aboutOpen`) e avisos globais (`integrationRequired`).

3. **`usePreferencesStore` (`src/stores/usePreferencesStore.ts`)**:
   - **Responsabilidade**: Persistência de preferências do usuário no disco local via `@tauri-apps/plugin-store` (`settings.json`).
   - **Internacionalização**: Salva e restaura o idioma ativo (`pt-BR` ou `en-US`), com fallback para o idioma do navegador e suporte a migração de configurações herdadas do `localStorage`.

### 3.3. Camada de Abstração IPC (`ISiteBlockApi`)

Para eliminar o acoplamento direto dos componentes com os módulos globais `@tauri-apps/api`, o frontend adota a interface `ISiteBlockApi`:

```typescript
export interface ISiteBlockApi {
  getStatus(): Promise<SiteBlockState>;
  startPrivilegedSession(): Promise<SiteBlockState>;
  saveConfig(config: SiteBlockConfigDto): Promise<SiteBlockState>;
  installService(): Promise<SiteBlockState>;
  getFocusStatistics?(query: FocusStatisticsQuery): Promise<FocusStatistics>;
  onStateChanged?(callback: (state: SiteBlockState) => void): Promise<() => void> | (() => void);
}
```

- **Implementação em Produção (`TauriSiteBlockApi`)**:
  - Utiliza `invoke<T>` do Tauri para despachar comandos ao backend Rust.
  - Ouve eventos de atualização de estado emitidos pelo backend (`siteblock://state-changed`).
  - Instrumenta cada chamada com telemetria de latência (`performance.now()`) e logs estruturados categorizados (`[State]`, `[Config]`, `[Session]`, `[Service]`).
- **Testabilidade**:
  - Em suítes de teste (Vitest), uma implementação mock de `ISiteBlockApi` é injetada, permitindo simular latência de rede, falhas de permissão e respostas em milissegundos sem qualquer dependência de binários compilados.

### 3.4. Primitivas de Design e Acessibilidade

O design visual é estruturado sobre o **Tailwind CSS v4** e primitivas não-estilizadas do **Radix UI**:
- **Acessibilidade WAI-ARIA**: Modais (`Dialog`), abas (`Tabs`), seletores e menus suspensos contêm gerenciamento automático de foco, suporte a teclas de atalho (ESC, setas direcionais, Tab) e atributos de acessibilidade para leitores de tela.
- **Feedback ao Usuário**: Notificações contextuais via `sonner` com suporte a temas dinâmicos (sucesso, aviso, erro).
- **Visualização de Dados**: O painel de estatísticas de foco integra a biblioteca `recharts` para gráficos temporais responsivos e indicadores de produtividade.

### 3.5. Sistema de Internacionalização (i18n)

A aplicação conta com um sistema de tradução próprio, sem custos de overhead de bibliotecas pesadas:
- Dicionários em formato TypeScript estritamente tipados (`src/i18n/index.tsx`).
- Tipagem estrita de chaves (`TranslationKey`), garantindo em tempo de compilação que nenhuma chave inexistente seja referenciada.
- Suporte a interpolação de variáveis dinâmicas (ex: `t("message.domainCount", { count: 5 })`).
- Hook reativo `useLanguage()` e contexto `LanguageProvider` para troca instantânea de idioma em tempo de execução.

---

## 4. Modelo de Integração com Navegadores (Data-Driven)

O bloqueio por `/etc/hosts` pode ser contornado por DNS seguro (DoH/DoT) embutido nos navegadores modernos. Por isso, o SiteBlock aplica **políticas corporativas nativas** diretamente nos navegadores.

A infraestrutura utiliza o **Padrão Strategy Orientado a Dados**:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BrowserEngine {
    Chromium { managed_policy_path: &'static str },
    Gecko { policy_path: &'static str, ownership_path: &'static str },
}

pub struct BrowserSpec {
    pub name: &'static str,
    pub engine: BrowserEngine,
    pub binaries: &'static [&'static str],
    pub requires_restart: bool,
    pub supports_hot_reload: bool,
}
```

Toda a lógica de checagem, escrita atômica, remoção e hot reload itera dinamicamente sobre a tabela central `BROWSER_SPECS`:
- **Navegadores Chromium** (Chrome, Brave): recebem a chave `URLBlocklist` e são recarregados a quente em segundo plano usando a flag `--refresh-platform-policy`.
- **Navegadores Gecko** (Firefox): recebem a política `policies.WebsiteFilter.Block` protegida por digest SHA-256 e indicam na UI a necessidade de reinício quando modificadas.

---

## 5. Comunicação IPC Privilegiada

A comunicação entre a aplicação de usuário e o `siteblock-admin` ocorre via protocolo **JSON Lines sobre pipes padrão**:

1. A aplicação Tauri instancia `pkexec /usr/local/lib/siteblock/siteblock-admin session`.
2. O Polkit solicita autorização administrativa ao usuário (apenas uma vez ao iniciar a sessão).
3. O canal permanece aberto mantendo um loop em `run_session()` lendo linhas de `stdin` e respondendo em `stdout`:
   - `{"action": "status"}` -> Retorna o estado atual consolidado.
   - `{"action": "capabilities"}` -> Retorna as capacidades do helper instalado.
   - `{"action": "set-config", "config": { ... }}` -> Grava a configuração e aplica as políticas no sistema.
   - `{"action": "get-focus-statistics", "query": { ... }}` -> Consulta o histórico de foco.

---

## 6. Guias de Extensão ("Recipes")

### 6.1. Como Adicionar um Novo Navegador
Para adicionar suporte a um novo navegador (ex: **Microsoft Edge** ou **Vivaldi**):

1. Adicione a especificação em `src-tauri/src/infrastructure/browser_policy.rs` no array `BROWSER_SPECS`:
   ```rust
   BrowserSpec {
       name: "Edge",
       engine: BrowserEngine::Chromium {
           managed_policy_path: "/etc/opt/edge/policies/managed/com.luis.siteblock.json",
       },
       binaries: &["microsoft-edge", "microsoft-edge-stable"],
       requires_restart: false,
       supports_hot_reload: true,
   },
   ```
2. Adicione o identificador na constante de domínio em `src-tauri/src/domain/entities.rs`:
   ```rust
   pub const SUPPORTED_BROWSERS: [&str; 4] = ["Chrome", "Brave", "Firefox", "Edge"];
   ```
3. O frontend já consome a lista dinamicamente e exibirá o novo navegador sem alterações de UI.

### 6.2. Como Adicionar um Novo Caso de Uso no Backend
1. Crie o arquivo em `src-tauri/src/application/use_cases/meu_caso_de_uso.rs`.
2. Defina uma struct com dependências de portas (`Arc<dyn Port>`).
3. Exponha o use case em `src-tauri/src/presentation/state.rs`.
4. Crie um comando anotado com `#[tauri::command]` em `src-tauri/src/presentation/commands.rs`.
5. Registre o comando no `invoke_handler` em `src-tauri/src/lib.rs`.

### 6.3. Como Adicionar um Novo Recurso ou Tela no Frontend
1. **Tipos**: Defina novos tipos ou estenda os DTOs em `src/types/`.
2. **Serviço IPC**: Adicione o método na interface `ISiteBlockApi` e na classe `TauriSiteBlockApi` em `src/services/siteblockApi.ts`.
3. **Estado Global**: Se o recurso envolver estado compartilhado, adicione os campos e ações na store correspondente (`useSiteBlockStore`, `useUIStore` ou `usePreferencesStore`).
4. **Traduções**: Adicione as chaves em português e inglês no dicionário em `src/i18n/index.tsx`.
5. **Componente**: Crie o componente em `src/components/<dominio>/` utilizando os componentes acessíveis de `src/components/ui/` e consuma as ações via custom hooks (`useSiteBlock` ou hooks dedicados).
6. **Testes**: Adicione testes unitários no diretório `__tests__/` correspondente validando renderização, cliques e chamadas à API mockada.

---

## 7. Qualidade de Código, Linting e Testes

O projeto adota padrões rigorosos de compilação, linting, formatação e cobertura de testes para todo o ecossistema (Rust e TypeScript):

| Objetivo | Comando | Descrição |
|---|---|---|
| **Testes do Frontend** | `pnpm run test` | Executa todos os testes unitários e de integração com Vitest. |
| **Testes com Watch** | `pnpm run test:watch` | Executa testes do frontend em modo interativo de desenvolvimento. |
| **Lint Frontend** | `pnpm run lint:frontend` | Valida código TypeScript/React com ESLint (zero warnings). |
| **Formatação Frontend** | `pnpm run format:frontend` | Formata todo o código TypeScript, CSS e JSON com Prettier. |
| **Checar Formatação Frontend** | `pnpm run format:check:frontend` | Verifica se os arquivos do frontend seguem as regras do Prettier. |
| **Build Frontend** | `pnpm run build` | Valida tipos com `tsc` e gera o bundle de produção do Vite. |
| **Lint Rust** | `pnpm run lint:backend` | Executa o `cargo clippy` com warnings tratados como erro (`-D warnings`). |
| **Formatação Rust** | `pnpm run format:backend` | Formata todo o código Rust com `cargo fmt`. |
| **Checar Formatação Rust** | `pnpm run format:check:backend` | Valida formatação do Rust sem modificar arquivos. |
| **Testes Rust** | `pnpm run test:backend` | Executa todos os testes unitários e de integração do Rust. |
| **Lint Completo** | `pnpm run lint` | Executa a validação de lint do frontend e do backend. |
| **Formatação Completa** | `pnpm run format` | Aplica a formatação automática em todo o repositório. |
| **Grafo do Código** | `graphify update .` | Atualiza o grafo de dependências e conhecimento AST do repositório. |

