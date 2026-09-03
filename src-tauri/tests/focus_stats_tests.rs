use chrono::{Duration, Local, TimeZone};
use siteblock_lib::domain::entities::{FocusDaily, FocusStatisticsQuery};
use siteblock_lib::infrastructure::focus_stats::{FocusSnapshot, FocusStatsStore};
use std::path::{Path, PathBuf};

struct TempStatsDirectory {
    path: PathBuf,
}

impl TempStatsDirectory {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "siteblock-focus-stats-test-{}-{}",
            std::process::id(),
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        std::fs::create_dir_all(&path).expect("deve criar diretório temporário para estatísticas");
        Self { path }
    }

    fn database_path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempStatsDirectory {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

fn record_active_heartbeats(
    stats: &FocusStatsStore,
    snapshot: &FocusSnapshot,
    first: chrono::DateTime<Local>,
    last: chrono::DateTime<Local>,
) {
    let mut heartbeat = first + Duration::minutes(1);
    while heartbeat <= last {
        stats.record(snapshot.clone(), heartbeat).unwrap();
        heartbeat += Duration::minutes(1);
    }
}

#[test]
fn completed_focus_session_is_returned_in_general_daily_and_domain_statistics() {
    let temp = TempStatsDirectory::new();
    let stats =
        FocusStatsStore::at_directory(temp.database_path()).expect("deve abrir o histórico");
    let start = Local.with_ymd_and_hms(2026, 9, 3, 9, 0, 0).unwrap();
    let end = Local.with_ymd_and_hms(2026, 9, 3, 10, 0, 0).unwrap();

    stats
        .record(
            FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
            start,
        )
        .expect("deve iniciar a sessão");
    record_active_heartbeats(
        &stats,
        &FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
        start,
        end - Duration::minutes(1),
    );
    stats
        .record(FocusSnapshot::inactive(), end)
        .expect("deve encerrar a sessão");

    let result = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-03", "2026-09-03", None),
            end,
        )
        .expect("deve consultar as estatísticas");

    assert_eq!(result.protected_seconds, 3_600);
    assert_eq!(result.completed_sessions, 1);
    assert_eq!(
        result.daily,
        vec![FocusDaily {
            date: "2026-09-03".into(),
            protected_seconds: 3_600,
        }]
    );
    assert_eq!(result.domains.len(), 1);
    assert_eq!(result.domains[0].domain, "youtube.com");
    assert_eq!(result.domains[0].protected_seconds, 3_600);
    assert_eq!(result.domains[0].completed_sessions, 1);
}

#[test]
fn repeated_reconciliation_does_not_duplicate_a_focus_session() {
    let temp = TempStatsDirectory::new();
    let stats =
        FocusStatsStore::at_directory(temp.database_path()).expect("deve abrir o histórico");
    let start = Local.with_ymd_and_hms(2026, 9, 3, 9, 0, 0).unwrap();
    let repeated = Local.with_ymd_and_hms(2026, 9, 3, 9, 15, 0).unwrap();
    let end = Local.with_ymd_and_hms(2026, 9, 3, 10, 0, 0).unwrap();

    stats
        .record(
            FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
            start,
        )
        .unwrap();
    record_active_heartbeats(
        &stats,
        &FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
        start,
        repeated - Duration::minutes(1),
    );
    stats
        .record(
            FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
            repeated,
        )
        .unwrap();
    record_active_heartbeats(
        &stats,
        &FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
        repeated,
        end - Duration::minutes(1),
    );
    stats.record(FocusSnapshot::inactive(), end).unwrap();

    let result = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-03", "2026-09-03", None),
            end,
        )
        .unwrap();
    assert_eq!(result.protected_seconds, 3_600);
    assert_eq!(result.completed_sessions, 1);
}

#[test]
fn overlapping_profiles_are_attributed_without_splitting_the_general_session() {
    let temp = TempStatsDirectory::new();
    let stats =
        FocusStatsStore::at_directory(temp.database_path()).expect("deve abrir o histórico");
    let start = Local.with_ymd_and_hms(2026, 9, 3, 9, 0, 0).unwrap();
    let overlap = Local.with_ymd_and_hms(2026, 9, 3, 9, 30, 0).unwrap();
    let end = Local.with_ymd_and_hms(2026, 9, 3, 10, 0, 0).unwrap();

    stats
        .record(
            FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
            start,
        )
        .unwrap();
    record_active_heartbeats(
        &stats,
        &FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
        start,
        overlap - Duration::minutes(1),
    );
    stats
        .record(
            FocusSnapshot::active(vec![
                ("focus", vec!["youtube.com"]),
                ("study", vec!["twitch.tv"]),
            ]),
            overlap,
        )
        .unwrap();
    record_active_heartbeats(
        &stats,
        &FocusSnapshot::active(vec![
            ("focus", vec!["youtube.com"]),
            ("study", vec!["twitch.tv"]),
        ]),
        overlap,
        end - Duration::minutes(1),
    );
    stats.record(FocusSnapshot::inactive(), end).unwrap();

    let general = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-03", "2026-09-03", None),
            end,
        )
        .unwrap();
    let study = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-03", "2026-09-03", Some("study".into())),
            end,
        )
        .unwrap();

    assert_eq!(general.protected_seconds, 3_600);
    assert_eq!(general.completed_sessions, 1);
    assert_eq!(study.protected_seconds, 1_800);
    assert_eq!(study.completed_sessions, 1);
    assert_eq!(study.domains[0].domain, "twitch.tv");
}

#[test]
fn protection_crossing_midnight_is_split_between_local_days() {
    let temp = TempStatsDirectory::new();
    let stats =
        FocusStatsStore::at_directory(temp.database_path()).expect("deve abrir o histórico");
    let start = Local.with_ymd_and_hms(2026, 9, 3, 23, 30, 0).unwrap();
    let end = Local.with_ymd_and_hms(2026, 9, 4, 0, 30, 0).unwrap();

    stats
        .record(
            FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
            start,
        )
        .unwrap();
    record_active_heartbeats(
        &stats,
        &FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
        start,
        end - Duration::minutes(1),
    );
    stats.record(FocusSnapshot::inactive(), end).unwrap();

    let result = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-03", "2026-09-04", None),
            end,
        )
        .unwrap();
    assert_eq!(result.protected_seconds, 3_600);
    assert_eq!(
        result.daily,
        vec![
            FocusDaily {
                date: "2026-09-03".into(),
                protected_seconds: 1_800
            },
            FocusDaily {
                date: "2026-09-04".into(),
                protected_seconds: 1_800
            },
        ]
    );
}

#[test]
fn open_session_counts_protection_time_but_not_completed_sessions() {
    let temp = TempStatsDirectory::new();
    let stats =
        FocusStatsStore::at_directory(temp.database_path()).expect("deve abrir o histórico");
    let start = Local.with_ymd_and_hms(2026, 9, 3, 9, 0, 0).unwrap();
    let now = Local.with_ymd_and_hms(2026, 9, 3, 10, 0, 0).unwrap();

    stats
        .record(
            FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
            start,
        )
        .unwrap();
    record_active_heartbeats(
        &stats,
        &FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]),
        start,
        now - Duration::minutes(1),
    );

    let result = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-03", "2026-09-03", None),
            now,
        )
        .unwrap();
    assert_eq!(result.protected_seconds, 3_600);
    assert_eq!(result.completed_sessions, 0);
}

#[test]
fn open_session_stops_counting_after_the_reconciler_becomes_stale() {
    let temp = TempStatsDirectory::new();
    let stats =
        FocusStatsStore::at_directory(temp.database_path()).expect("deve abrir o histórico");
    let start = Local.with_ymd_and_hms(2026, 9, 3, 18, 0, 0).unwrap();
    let last_reconciliation = Local.with_ymd_and_hms(2026, 9, 3, 19, 0, 0).unwrap();
    let next_boot = Local.with_ymd_and_hms(2026, 9, 4, 9, 0, 0).unwrap();
    let active_snapshot = FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]);

    stats.record(active_snapshot.clone(), start).unwrap();
    record_active_heartbeats(&stats, &active_snapshot, start, last_reconciliation);

    let result = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-03", "2026-09-04", None),
            next_boot,
        )
        .unwrap();

    assert_eq!(result.protected_seconds, 3_600);
    assert_eq!(result.completed_sessions, 0);
}

#[test]
fn reconciliation_after_a_stale_gap_starts_a_new_open_session() {
    let temp = TempStatsDirectory::new();
    let stats =
        FocusStatsStore::at_directory(temp.database_path()).expect("deve abrir o histórico");
    let start = Local.with_ymd_and_hms(2026, 9, 3, 18, 0, 0).unwrap();
    let last_reconciliation = Local.with_ymd_and_hms(2026, 9, 3, 19, 0, 0).unwrap();
    let next_boot = Local.with_ymd_and_hms(2026, 9, 4, 9, 0, 0).unwrap();
    let after_next_reconciliation = Local.with_ymd_and_hms(2026, 9, 4, 9, 1, 0).unwrap();
    let active_snapshot = FocusSnapshot::active(vec![("focus", vec!["youtube.com"])]);

    stats.record(active_snapshot.clone(), start).unwrap();
    record_active_heartbeats(&stats, &active_snapshot, start, last_reconciliation);
    stats.record(active_snapshot, next_boot).unwrap();

    let result = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-03", "2026-09-04", None),
            after_next_reconciliation,
        )
        .unwrap();

    assert_eq!(result.protected_seconds, 3_660);
    assert_eq!(result.completed_sessions, 0);
}

#[test]
fn invalid_period_is_rejected() {
    let temp = TempStatsDirectory::new();
    let stats =
        FocusStatsStore::at_directory(temp.database_path()).expect("deve abrir o histórico");
    let now = Local.with_ymd_and_hms(2026, 9, 3, 10, 0, 0).unwrap();

    let error = stats
        .query(
            &FocusStatisticsQuery::new("2026-09-04", "2026-09-03", None),
            now,
        )
        .unwrap_err();
    assert!(error.contains("início do período"));
}
