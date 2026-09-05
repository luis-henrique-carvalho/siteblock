use siteblock_lib::infrastructure::admin_protocol::handle_admin_session_line_with;
use siteblock_lib::domain::entities::{SiteBlockConfig, SiteBlockState};
use std::io::{BufRead, Cursor, Write};

pub fn simulate_session_loop<R: BufRead, W: Write>(
    reader: R,
    mut writer: W,
) -> std::io::Result<()> {
    for line in reader.lines() {
        let line = line?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let resp = handle_admin_session_line_with(
            trimmed,
            || SiteBlockConfig::new(true, vec![]),
            |_| SiteBlockState::default(),
        );
        writeln!(writer, "{}", resp)?;
        writer.flush()?;
    }
    Ok(())
}

#[test]
fn test_session_loop_over_generic_stream() {
    let input = "{\"action\":\"status\"}\n{\"action\":\"capabilities\"}\n";
    let reader = Cursor::new(input.as_bytes());
    let mut writer = Vec::new();

    simulate_session_loop(reader, &mut writer).expect("Session loop deve processar stream");

    let output = String::from_utf8(writer).expect("Output deve ser UTF-8 válido");
    let lines: Vec<&str> = output.lines().collect();
    assert_eq!(lines.len(), 2);

    let status_resp: serde_json::Value = serde_json::from_str(lines[0]).unwrap();
    assert!(status_resp.get("active").is_some());

    let caps_resp: serde_json::Value = serde_json::from_str(lines[1]).unwrap();
    assert_eq!(caps_resp.get("session").and_then(|v| v.as_bool()), Some(true));
}
