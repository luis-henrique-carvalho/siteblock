use super::*;
use chrono::TimeZone;

#[test]
fn test_domain_hosts_regular() {
    let hosts = domain_hosts("example.com");
    assert_eq!(hosts, vec!["example.com", "www.example.com"]);
}

#[test]
fn test_domain_hosts_youtube() {
    let hosts = domain_hosts("youtube.com");
    assert!(hosts.contains(&"youtube.com".to_string()));
    assert!(hosts.contains(&"www.youtube.com".to_string()));
    assert!(hosts.contains(&"music.youtube.com".to_string()));
    assert!(hosts.contains(&"youtu.be".to_string()));
}

#[test]
fn test_parse_minute() {
    assert_eq!(parse_minute("00:00"), 0);
    assert_eq!(parse_minute("09:30"), 570);
    assert_eq!(parse_minute("23:59"), 1439);
}

#[test]
fn test_applies_now_same_day() {
    // Segunda-feira (day 0) 10:00
    let dt = Local.with_ymd_and_hms(2026, 8, 31, 10, 0, 0).unwrap(); // 2026-08-31 é Segunda
    let schedule = Schedule::new("test", vec![0], "09:00", "18:00");
    assert!(applies_now(&schedule, dt));

    // Fora do horário (08:00)
    let dt_early = Local.with_ymd_and_hms(2026, 8, 31, 8, 0, 0).unwrap();
    assert!(!applies_now(&schedule, dt_early));

    // Outro dia da semana (Terça-feira, day 1)
    let dt_tue = Local.with_ymd_and_hms(2026, 9, 1, 10, 0, 0).unwrap();
    assert!(!applies_now(&schedule, dt_tue));
}

#[test]
fn test_applies_now_overnight() {
    // Horário das 22:00 até 06:00 na Segunda-feira (day 0)
    let schedule = Schedule::new("overnight", vec![0], "22:00", "06:00");

    // Segunda 23:00 -> ativo
    let dt_mon_night = Local.with_ymd_and_hms(2026, 8, 31, 23, 0, 0).unwrap();
    assert!(applies_now(&schedule, dt_mon_night));

    // Terça 03:00 -> ativo (pertence ao turno iniciado na Segunda)
    let dt_tue_early = Local.with_ymd_and_hms(2026, 9, 1, 3, 0, 0).unwrap();
    assert!(applies_now(&schedule, dt_tue_early));

    // Terça 07:00 -> inativo
    let dt_tue_morning = Local.with_ymd_and_hms(2026, 9, 1, 7, 0, 0).unwrap();
    assert!(!applies_now(&schedule, dt_tue_morning));
}

#[test]
fn test_url_filters() {
    let profile = Profile::new(
        "p1",
        "P1",
        "shield",
        "blue",
        true,
        vec!["instagram.com".to_string()],
        vec![],
    );
    let cfg = SiteBlockConfig::new(true, vec![profile]);
    let filters = blocked_url_filters(&cfg, true);
    assert!(filters.contains(&"*://instagram.com/*".to_string()));
    assert!(filters.contains(&"*://*.instagram.com/*".to_string()));
    assert!(filters.contains(&"*://www.instagram.com/*".to_string()));
}

#[test]
fn test_multiple_active_profiles_union() {
    let now = Local.with_ymd_and_hms(2026, 8, 31, 10, 0, 0).unwrap(); // Segunda 10h
    let p_focus = Profile::new(
        "focus",
        "Foco",
        "target",
        "blue",
        true,
        vec!["youtube.com".to_string()],
        vec![Schedule::new("s1", vec![0], "09:00", "12:00")],
    );
    let p_study = Profile::new(
        "study",
        "Estudo",
        "book",
        "emerald",
        true,
        vec!["twitch.tv".to_string()],
        vec![], // 24/7
    );
    let p_sleep = Profile::new(
        "sleep",
        "Sono",
        "moon",
        "indigo",
        false, // disabled
        vec!["netflix.com".to_string()],
        vec![],
    );

    let cfg = SiteBlockConfig::new(true, vec![p_focus, p_study, p_sleep]);
    let active = get_active_profiles(&cfg, now);
    let ids: Vec<&str> = active.iter().map(|p| p.id.as_str()).collect();
    assert_eq!(ids, vec!["focus", "study"]);

    let blocked = effective_blocked_domains(&cfg, now);
    assert!(blocked.contains(&"youtube.com".to_string()));
    assert!(blocked.contains(&"twitch.tv".to_string()));
    assert!(!blocked.contains(&"netflix.com".to_string()));
}

#[test]
fn test_legacy_config_migration() {
    let mut cfg = SiteBlockConfig::legacy(
        true,
        vec!["reddit.com".to_string()],
        vec![Schedule::new("s_leg", vec![1], "10:00", "12:00")],
    );
    cfg.ensure_migrated();
    assert_eq!(cfg.profiles.len(), 3);
    assert_eq!(cfg.profiles[0].id, "focus");
    assert_eq!(cfg.profiles[0].domains, vec!["reddit.com".to_string()]);
    assert_eq!(cfg.profiles[0].schedules.len(), 1);
    assert_eq!(cfg.profiles[1].id, "study");
    assert_eq!(cfg.profiles[2].id, "sleep");
}
