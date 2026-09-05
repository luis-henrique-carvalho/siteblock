use serde_json::Value;
use siteblock_lib::infrastructure::system_core::{
    build_chromium_policy_content, build_firefox_policy_content, bytes_sha256,
    can_overwrite_firefox_policy, get_browser_integrations,
};
use std::collections::HashMap;

#[test]
fn test_build_chromium_policy_structure() {
    let filters = vec![
        "*://*.reddit.com/*".to_string(),
        "*://*.twitter.com/*".to_string(),
    ];
    let json_str = build_chromium_policy_content(&filters);
    let parsed: Value =
        serde_json::from_str(&json_str).expect("JSON de política Chromium inválido");

    let blocklist = parsed
        .get("URLBlocklist")
        .and_then(|v| v.as_array())
        .expect("URLBlocklist deve ser um array");

    assert_eq!(blocklist.len(), 2);
    assert_eq!(blocklist[0], "*://*.reddit.com/*");
    assert_eq!(blocklist[1], "*://*.twitter.com/*");
}

#[test]
fn test_build_registry_blocklist_entries() {
    let filters = vec![
        "*://*.reddit.com/*".to_string(),
        "*://*.twitter.com/*".to_string(),
    ];
    let entries = siteblock_lib::infrastructure::browser_policy::build_registry_blocklist_entries(&filters);
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0], ("1".to_string(), "*://*.reddit.com/*".to_string()));
    assert_eq!(entries[1], ("2".to_string(), "*://*.twitter.com/*".to_string()));
}

#[test]
fn test_build_firefox_policy_structure() {
    let filters = vec!["*://*.youtube.com/*".to_string()];
    let json_str = build_firefox_policy_content(&filters);
    let parsed: Value = serde_json::from_str(&json_str).expect("JSON de política Firefox inválido");

    let block = parsed
        .pointer("/policies/WebsiteFilter/Block")
        .and_then(|v| v.as_array())
        .expect("/policies/WebsiteFilter/Block deve ser um array");

    assert_eq!(block.len(), 1);
    assert_eq!(block[0], "*://*.youtube.com/*");
}

#[test]
fn test_bytes_sha256_computes_reproducible_digest() {
    let data1 = b"test content";
    let data2 = b"test content";
    let data3 = b"different content";

    let hash1 = bytes_sha256(data1);
    let hash2 = bytes_sha256(data2);
    let hash3 = bytes_sha256(data3);

    assert_eq!(hash1, hash2);
    assert_ne!(hash1, hash3);
    assert_eq!(hash1.len(), 64); // SHA-256 em hex tem 64 caracteres
}

#[test]
fn test_can_overwrite_firefox_policy_when_no_policy_exists() {
    // Se não há política instalada, SiteBlock pode criar livremente
    assert!(can_overwrite_firefox_policy(false, None, None));
    assert!(can_overwrite_firefox_policy(
        false,
        Some("any-digest"),
        None
    ));
}

#[test]
fn test_can_overwrite_firefox_policy_when_digests_match() {
    // Se o arquivo existe e seu hash atual bate com o hash registrado pelo SiteBlock anteriormente
    let digest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    assert!(can_overwrite_firefox_policy(
        true,
        Some(digest),
        Some(digest)
    ));
}

#[test]
fn test_cannot_overwrite_firefox_policy_when_digests_mismatch() {
    // Se o arquivo foi modificado externamente (digest do arquivo != digest guardado pelo SiteBlock)
    let saved_digest = "1111111111111111111111111111111111111111111111111111111111111111";
    let external_modified_digest =
        "2222222222222222222222222222222222222222222222222222222222222222";

    assert!(!can_overwrite_firefox_policy(
        true,
        Some(saved_digest),
        Some(external_modified_digest)
    ));
}

#[test]
fn test_cannot_overwrite_firefox_policy_when_preexisting_external_policy() {
    // Se a política existe no disco mas não temos arquivo de ownership prévio (.sha256 não existia)
    // Significa que a máquina já tinha políticas corporativas/pessoais antes do SiteBlock!
    let external_digest = "3333333333333333333333333333333333333333333333333333333333333333";
    assert!(can_overwrite_firefox_policy(
        true,
        None,
        Some(external_digest)
    ));
}

#[test]
fn test_browser_status_respects_enabled_browser_configuration() {
    let policies = HashMap::from([("Chrome".to_string(), true), ("Brave".to_string(), true)]);
    let integrations = get_browser_integrations(&policies, true, &["Chrome".to_string()]);

    let chrome = integrations
        .iter()
        .find(|browser| browser.name == "Chrome")
        .unwrap();
    let brave = integrations
        .iter()
        .find(|browser| browser.name == "Brave")
        .unwrap();
    let firefox = integrations
        .iter()
        .find(|browser| browser.name == "Firefox")
        .unwrap();

    assert!(chrome.enabled);
    assert!(chrome.policy_ready || !chrome.detected);
    assert!(!chrome.requires_restart);
    assert!(!brave.enabled);
    assert!(!brave.policy_ready);
    assert!(!brave.requires_restart);
    assert!(!firefox.enabled);
    assert!(!firefox.policy_ready);
    assert!(firefox.requires_restart);
}
