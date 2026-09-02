use siteblock_lib::domain::entities::{Profile, SiteBlockConfig};
use siteblock_lib::infrastructure::system_core::{
    render_hosts_content, BEGIN_MARKER, END_MARKER,
};

#[test]
fn test_render_hosts_preserves_standard_localhost_and_custom_entries() {
    let original = "\
127.0.0.1 localhost
127.0.1.1 my-hostname
# Custom development host
192.168.1.100 router.local
";

    let profile = Profile::new(
        "test-id",
        "Trabalho",
        "briefcase",
        "#3b82f6",
        true,
        vec!["instagram.com".to_string()],
        vec![],
    );
    let config = SiteBlockConfig::new(true, vec![profile]);

    let rendered = render_hosts_content(original, &config, true);

    // Deve preservar o conteúdo original intacto no início
    assert!(rendered.starts_with("127.0.0.1 localhost\n127.0.1.1 my-hostname\n# Custom development host\n192.168.1.100 router.local"));
    // Deve conter os marcadores do SiteBlock
    assert!(rendered.contains(BEGIN_MARKER));
    assert!(rendered.contains(END_MARKER));
    // Deve mapear IPv4 e IPv6
    assert!(rendered.contains("0.0.0.0 instagram.com"));
    assert!(rendered.contains("::1 instagram.com"));
    assert!(rendered.contains("0.0.0.0 www.instagram.com"));
    assert!(rendered.contains("::1 www.instagram.com"));
    assert!(rendered.ends_with('\n'));
}

#[test]
fn test_render_hosts_adds_ipv4_and_ipv6_for_all_blocked_domains() {
    let original = "127.0.0.1 localhost\n";
    let profile = Profile::new(
        "p1",
        "Redes Sociais",
        "globe",
        "#ec4899",
        true,
        vec!["facebook.com".to_string(), "twitter.com".to_string()],
        vec![],
    );
    let config = SiteBlockConfig::new(true, vec![profile]);

    let rendered = render_hosts_content(original, &config, true);

    assert!(rendered.contains("0.0.0.0 facebook.com"));
    assert!(rendered.contains("::1 facebook.com"));
    assert!(rendered.contains("0.0.0.0 www.facebook.com"));
    assert!(rendered.contains("::1 www.facebook.com"));
    assert!(rendered.contains("0.0.0.0 twitter.com"));
    assert!(rendered.contains("::1 twitter.com"));
    assert!(rendered.contains("0.0.0.0 www.twitter.com"));
    assert!(rendered.contains("::1 www.twitter.com"));
}

#[test]
fn test_render_hosts_handles_youtube_special_hosts() {
    let original = "127.0.0.1 localhost\n";
    let profile = Profile::new(
        "p1",
        "Vídeos",
        "video",
        "#ef4444",
        true,
        vec!["youtube.com".to_string()],
        vec![],
    );
    let config = SiteBlockConfig::new(true, vec![profile]);

    let rendered = render_hosts_content(original, &config, true);

    assert!(rendered.contains("0.0.0.0 youtube.com"));
    assert!(rendered.contains("0.0.0.0 m.youtube.com"));
    assert!(rendered.contains("0.0.0.0 music.youtube.com"));
    assert!(rendered.contains("0.0.0.0 youtu.be"));
    assert!(rendered.contains("0.0.0.0 youtube-nocookie.com"));
}

#[test]
fn test_render_hosts_idempotent_when_already_has_siteblock_section() {
    let initial_hosts = "\
127.0.0.1 localhost

# BEGIN SITEBLOCK MANAGED
0.0.0.0 old-domain.com
::1 old-domain.com
# END SITEBLOCK MANAGED
";

    let profile = Profile::new(
        "p1",
        "Novo",
        "star",
        "#10b981",
        true,
        vec!["new-domain.com".to_string()],
        vec![],
    );
    let config = SiteBlockConfig::new(true, vec![profile]);

    let rendered = render_hosts_content(initial_hosts, &config, true);

    // Não deve conter o domínio antigo
    assert!(!rendered.contains("old-domain.com"));
    // Deve conter o novo domínio
    assert!(rendered.contains("new-domain.com"));
    // Deve haver apenas uma ocorrência do marcador
    let begin_count = rendered.matches(BEGIN_MARKER).count();
    let end_count = rendered.matches(END_MARKER).count();
    assert_eq!(begin_count, 1);
    assert_eq!(end_count, 1);
}

#[test]
fn test_render_hosts_disabling_removes_siteblock_section_completely() {
    let initial_hosts = "\
127.0.0.1 localhost
::1 localhost

# BEGIN SITEBLOCK MANAGED
0.0.0.0 blocked.com
::1 blocked.com
# END SITEBLOCK MANAGED
";

    let profile = Profile::new(
        "p1",
        "P",
        "shield",
        "#6366f1",
        true,
        vec!["blocked.com".to_string()],
        vec![],
    );
    let config = SiteBlockConfig::new(false, vec![profile]);

    // enabled = false (bloqueio desativado)
    let rendered = render_hosts_content(initial_hosts, &config, false);

    assert!(!rendered.contains(BEGIN_MARKER));
    assert!(!rendered.contains(END_MARKER));
    assert!(!rendered.contains("blocked.com"));
    assert!(rendered.contains("127.0.0.1 localhost"));
    assert!(rendered.contains("::1 localhost"));
    assert!(rendered.ends_with('\n'));
}

#[test]
fn test_render_hosts_empty_original_file() {
    let profile = Profile::new(
        "p1",
        "P",
        "shield",
        "#6366f1",
        true,
        vec!["site.com".to_string()],
        vec![],
    );
    let config = SiteBlockConfig::new(true, vec![profile]);

    let rendered = render_hosts_content("", &config, true);

    assert!(rendered.contains(BEGIN_MARKER));
    assert!(rendered.contains("0.0.0.0 site.com"));
    assert!(rendered.contains(END_MARKER));

    // Desativando arquivo vazio
    let rendered_empty = render_hosts_content("", &config, false);
    assert_eq!(rendered_empty, "");
}

#[test]
fn test_render_hosts_handles_unclosed_marker_gracefully() {
    // Marcador BEGIN sem marcador END
    let unclosed = "\
127.0.0.1 localhost
# BEGIN SITEBLOCK MANAGED
0.0.0.0 leftover.com
";

    let profile = Profile::new(
        "p1",
        "P",
        "shield",
        "#6366f1",
        true,
        vec!["valid.com".to_string()],
        vec![],
    );
    let config = SiteBlockConfig::new(true, vec![profile]);

    let rendered = render_hosts_content(unclosed, &config, true);

    // O leftover deve ser descartado pois estava dentro do bloco iniciado
    assert!(!rendered.contains("leftover.com"));
    assert!(rendered.contains("127.0.0.1 localhost"));
    assert!(rendered.contains("0.0.0.0 valid.com"));
    assert_eq!(rendered.matches(BEGIN_MARKER).count(), 1);
    assert_eq!(rendered.matches(END_MARKER).count(), 1);
}
