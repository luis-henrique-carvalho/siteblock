//! Local persistence and aggregation for focus-protection statistics.

use crate::domain::entities::{
    FocusDaily, FocusDomainStatistic, FocusStatistics, FocusStatisticsQuery, Profile,
};
use chrono::{DateTime, Days, Local, LocalResult, NaiveDate, TimeZone};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::path::{Path, PathBuf};

const DATABASE_FILE_NAME: &str = "focus-stats.db";
const MAX_RECONCILIATION_GAP_SECONDS: i64 = 120;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct FocusProfileSnapshot {
    profile_id: String,
    domains: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct FocusSnapshot {
    profiles: Vec<FocusProfileSnapshot>,
}

impl FocusSnapshot {
    pub fn active(profiles: Vec<(&str, Vec<&str>)>) -> Self {
        let profiles = profiles
            .into_iter()
            .map(|(profile_id, domains)| FocusProfileSnapshot {
                profile_id: profile_id.to_string(),
                domains: domains.into_iter().map(str::to_string).collect(),
            })
            .collect();
        Self { profiles }.normalized()
    }

    pub fn inactive() -> Self {
        Self::default()
    }

    pub fn from_profiles(profiles: &[&Profile]) -> Self {
        Self {
            profiles: profiles
                .iter()
                .map(|profile| FocusProfileSnapshot {
                    profile_id: profile.id.clone(),
                    domains: profile.domains.clone(),
                })
                .collect(),
        }
        .normalized()
    }

    pub fn is_active(&self) -> bool {
        !self.profiles.is_empty()
    }

    fn normalized(mut self) -> Self {
        for profile in &mut self.profiles {
            profile.domains.sort();
            profile.domains.dedup();
        }
        self.profiles
            .sort_by(|left, right| left.profile_id.cmp(&right.profile_id));
        self.profiles
            .dedup_by(|left, right| left.profile_id == right.profile_id);
        self
    }
}

pub struct FocusStatsStore {
    database_path: PathBuf,
}

impl FocusStatsStore {
    pub fn at_directory(directory: &Path) -> Result<Self, String> {
        std::fs::create_dir_all(directory).map_err(|error| error.to_string())?;
        let store = Self {
            database_path: directory.join(DATABASE_FILE_NAME),
        };
        store.initialize()?;
        Ok(store)
    }

    pub fn record(&self, snapshot: FocusSnapshot, at: DateTime<Local>) -> Result<(), String> {
        let snapshot = snapshot.normalized();
        let snapshot_json = serde_json::to_string(&snapshot).map_err(|error| error.to_string())?;
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|error| error.to_string())?;

        let open_segment: Option<(i64, i64, String, i64)> = transaction
            .query_row(
                "SELECT segments.id, segments.session_id, segments.snapshot_json,
                        COALESCE(segments.last_seen_at, segments.started_at)
                 FROM segments
                 WHERE segments.ended_at IS NULL
                 ORDER BY segments.id DESC
                 LIMIT 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .optional()
            .map_err(|error| error.to_string())?;

        match (open_segment, snapshot.is_active()) {
            (None, false) => {}
            (None, true) => {
                start_session(&transaction, &snapshot_json, at.timestamp())?;
            }
            (Some((segment_id, session_id, _, last_seen_at)), false) => {
                let ended_at = segment_end_at(last_seen_at, at.timestamp());
                close_segment(&transaction, segment_id, ended_at)?;
                if ended_at == at.timestamp() {
                    transaction
                        .execute(
                            "UPDATE sessions SET ended_at = ?1 WHERE id = ?2",
                            params![ended_at, session_id],
                        )
                        .map_err(|error| error.to_string())?;
                }
            }
            (Some((segment_id, session_id, current_snapshot, last_seen_at)), true)
                if current_snapshot != snapshot_json =>
            {
                let ended_at = segment_end_at(last_seen_at, at.timestamp());
                close_segment(&transaction, segment_id, ended_at)?;
                if ended_at == at.timestamp() {
                    transaction
                        .execute(
                            "INSERT INTO segments (session_id, started_at, snapshot_json, last_seen_at) VALUES (?1, ?2, ?3, ?4)",
                            params![session_id, at.timestamp(), snapshot_json, at.timestamp()],
                        )
                        .map_err(|error| error.to_string())?;
                } else {
                    start_session(&transaction, &snapshot_json, at.timestamp())?;
                }
            }
            (Some((segment_id, _, _, last_seen_at)), true) => {
                if reconciliation_is_stale(last_seen_at, at.timestamp()) {
                    close_segment(&transaction, segment_id, last_seen_at)?;
                    start_session(&transaction, &snapshot_json, at.timestamp())?;
                } else if at.timestamp() > last_seen_at {
                    transaction
                        .execute(
                            "UPDATE segments SET last_seen_at = ?1 WHERE id = ?2",
                            params![at.timestamp(), segment_id],
                        )
                        .map_err(|error| error.to_string())?;
                }
            }
        }

        transaction.commit().map_err(|error| error.to_string())
    }

    pub fn query(
        &self,
        query: &FocusStatisticsQuery,
        now: DateTime<Local>,
    ) -> Result<FocusStatistics, String> {
        let range_start = parse_day_start(&query.from)?;
        let range_end = parse_day_start(&query.to)?
            .checked_add_days(Days::new(1))
            .ok_or_else(|| "intervalo de datas inválido".to_string())?;
        if range_end <= range_start {
            return Err("o início do período deve ser anterior ao fim".into());
        }

        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT segments.session_id, segments.started_at, segments.ended_at,
                        segments.snapshot_json, sessions.ended_at,
                        COALESCE(segments.last_seen_at, segments.started_at)
                 FROM segments
                 JOIN sessions ON sessions.id = segments.session_id
                 WHERE segments.started_at < ?1
                   AND COALESCE(segments.ended_at, ?2) > ?3
                 ORDER BY segments.started_at ASC",
            )
            .map_err(|error| error.to_string())?;
        let rows = statement
            .query_map(
                params![
                    range_end.timestamp(),
                    now.timestamp(),
                    range_start.timestamp()
                ],
                |row| {
                    Ok(StoredSegment {
                        session_id: row.get(0)?,
                        started_at: row.get(1)?,
                        ended_at: row.get(2)?,
                        snapshot_json: row.get(3)?,
                        session_ended_at: row.get(4)?,
                        last_seen_at: row.get(5)?,
                    })
                },
            )
            .map_err(|error| error.to_string())?;

        let mut daily = BTreeMap::new();
        let mut domain_totals: HashMap<String, DomainAccumulator> = HashMap::new();
        let mut protected_seconds = 0_i64;
        let mut completed_sessions = BTreeSet::new();

        for row in rows {
            let row = row.map_err(|error| error.to_string())?;
            let snapshot: FocusSnapshot =
                serde_json::from_str(&row.snapshot_json).map_err(|error| error.to_string())?;
            let matching_profiles: Vec<&FocusProfileSnapshot> = snapshot
                .profiles
                .iter()
                .filter(|profile| {
                    query
                        .profile_id
                        .as_ref()
                        .is_none_or(|profile_id| profile.profile_id == *profile_id)
                })
                .collect();
            if matching_profiles.is_empty() {
                continue;
            }

            let segment_start = local_from_timestamp(row.started_at)?;
            let segment_end = local_from_timestamp(
                row.ended_at
                    .unwrap_or_else(|| open_segment_end(row.last_seen_at, now.timestamp())),
            )?;
            let start = segment_start.max(range_start);
            let end = segment_end.min(range_end).min(now);
            if end <= start {
                continue;
            }

            let seconds = end.signed_duration_since(start).num_seconds();
            protected_seconds += seconds;
            add_daily_seconds(&mut daily, start, end)?;

            let is_completed_in_range = row.session_ended_at.is_some_and(|ended_at| {
                ended_at >= range_start.timestamp() && ended_at < range_end.timestamp()
            });
            if is_completed_in_range {
                completed_sessions.insert(row.session_id);
            }

            let domains: HashSet<&str> = matching_profiles
                .iter()
                .flat_map(|profile| profile.domains.iter().map(String::as_str))
                .collect();
            for domain in domains {
                let entry = domain_totals.entry(domain.to_string()).or_default();
                entry.protected_seconds += seconds;
                if is_completed_in_range {
                    entry.completed_sessions.insert(row.session_id);
                }
            }
        }

        let mut domains: Vec<FocusDomainStatistic> = domain_totals
            .into_iter()
            .map(|(domain, total)| FocusDomainStatistic {
                domain,
                protected_seconds: total.protected_seconds,
                completed_sessions: total.completed_sessions.len() as u64,
            })
            .collect();
        domains.sort_by(|left, right| {
            right
                .protected_seconds
                .cmp(&left.protected_seconds)
                .then_with(|| right.completed_sessions.cmp(&left.completed_sessions))
                .then_with(|| left.domain.cmp(&right.domain))
        });

        Ok(FocusStatistics {
            protected_seconds,
            completed_sessions: completed_sessions.len() as u64,
            daily: daily
                .into_iter()
                .map(|(date, protected_seconds)| FocusDaily {
                    date,
                    protected_seconds,
                })
                .collect(),
            domains,
        })
    }

    fn initialize(&self) -> Result<(), String> {
        let connection = self.connection()?;
        connection
            .execute_batch(
                "PRAGMA foreign_keys = ON;
                 CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY,
                    started_at INTEGER NOT NULL,
                    ended_at INTEGER
                 );
                 CREATE TABLE IF NOT EXISTS segments (
                    id INTEGER PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES sessions(id),
                    started_at INTEGER NOT NULL,
                    ended_at INTEGER,
                    snapshot_json TEXT NOT NULL,
                    last_seen_at INTEGER NOT NULL
                 );
                 CREATE INDEX IF NOT EXISTS idx_segments_interval
                    ON segments (started_at, ended_at);",
            )
            .map_err(|error| error.to_string())?;

        let has_last_seen_at: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('segments') WHERE name = 'last_seen_at'",
                [],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if has_last_seen_at == 0 {
            connection
                .execute("ALTER TABLE segments ADD COLUMN last_seen_at INTEGER", [])
                .map_err(|error| error.to_string())?;
        }
        connection
            .execute(
                "UPDATE segments
                 SET last_seen_at = COALESCE(ended_at, started_at)
                 WHERE last_seen_at IS NULL",
                [],
            )
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    fn connection(&self) -> Result<Connection, String> {
        Connection::open(&self.database_path).map_err(|error| error.to_string())
    }
}

struct StoredSegment {
    session_id: i64,
    started_at: i64,
    ended_at: Option<i64>,
    snapshot_json: String,
    session_ended_at: Option<i64>,
    last_seen_at: i64,
}

#[derive(Default)]
struct DomainAccumulator {
    protected_seconds: i64,
    completed_sessions: BTreeSet<i64>,
}

fn start_session(
    transaction: &rusqlite::Transaction<'_>,
    snapshot_json: &str,
    started_at: i64,
) -> Result<(), String> {
    transaction
        .execute(
            "INSERT INTO sessions (started_at) VALUES (?1)",
            [started_at],
        )
        .map_err(|error| error.to_string())?;
    let session_id = transaction.last_insert_rowid();
    transaction
        .execute(
            "INSERT INTO segments (session_id, started_at, snapshot_json, last_seen_at) VALUES (?1, ?2, ?3, ?4)",
            params![session_id, started_at, snapshot_json, started_at],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn close_segment(
    transaction: &rusqlite::Transaction<'_>,
    segment_id: i64,
    ended_at: i64,
) -> Result<(), String> {
    transaction
        .execute(
            "UPDATE segments SET ended_at = ?1 WHERE id = ?2",
            params![ended_at, segment_id],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn reconciliation_is_stale(last_seen_at: i64, now: i64) -> bool {
    now.saturating_sub(last_seen_at) > MAX_RECONCILIATION_GAP_SECONDS
}

fn segment_end_at(last_seen_at: i64, now: i64) -> i64 {
    if reconciliation_is_stale(last_seen_at, now) {
        last_seen_at
    } else {
        now
    }
}

fn open_segment_end(last_seen_at: i64, now: i64) -> i64 {
    segment_end_at(last_seen_at, now)
}

fn parse_day_start(value: &str) -> Result<DateTime<Local>, String> {
    let date = NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| "datas devem usar o formato AAAA-MM-DD".to_string())?;
    let midnight = date
        .and_hms_opt(0, 0, 0)
        .ok_or_else(|| "data inválida".to_string())?;
    match Local.from_local_datetime(&midnight) {
        LocalResult::Single(value) | LocalResult::Ambiguous(value, _) => Ok(value),
        LocalResult::None => Err("data indisponível no fuso local".into()),
    }
}

fn local_from_timestamp(timestamp: i64) -> Result<DateTime<Local>, String> {
    Local
        .timestamp_opt(timestamp, 0)
        .single()
        .ok_or_else(|| "timestamp de estatística inválido".into())
}

fn add_daily_seconds(
    daily: &mut BTreeMap<String, i64>,
    start: DateTime<Local>,
    end: DateTime<Local>,
) -> Result<(), String> {
    let mut cursor = start;
    while cursor < end {
        let next_day = cursor
            .date_naive()
            .checked_add_days(Days::new(1))
            .ok_or_else(|| "data fora do intervalo suportado".to_string())?;
        let next_midnight = parse_day_start(&next_day.format("%Y-%m-%d").to_string())?;
        let slice_end = end.min(next_midnight);
        let seconds = slice_end.signed_duration_since(cursor).num_seconds();
        *daily
            .entry(cursor.format("%Y-%m-%d").to_string())
            .or_default() += seconds;
        cursor = slice_end;
    }
    Ok(())
}
