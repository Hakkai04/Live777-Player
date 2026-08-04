use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use chrono::Utc;
use uuid::Uuid;

use crate::error::AppError;
use crate::state::AppState;
use crate::types::{RtspRequest, RtspResponse, StreamListResponse, StreamMapping};

/// POST /bridge/rtsp — Register an RTSP source, return a WHEP playback URL.
///
/// Validates:
///   - URL is present
///   - URL starts with rtsp:// or rtsps://
///
/// AI Vibe Coding advantage: Serde deserialization fails at the type boundary
/// if the JSON body is malformed. No manual nil/null checks needed.
pub async fn create_rtsp_bridge(
    State(state): State<AppState>,
    Json(req): Json<RtspRequest>,
) -> Result<(StatusCode, Json<RtspResponse>), AppError> {
    // Validate URL
    if req.url.is_empty() {
        return Err(AppError::MissingUrl);
    }
    if !req.url.starts_with("rtsp://") && !req.url.starts_with("rtsps://") {
        return Err(AppError::InvalidUrlScheme);
    }

    let stream_id = Uuid::new_v4().to_string();
    let whep_url = format!("{}/whep/{}", state.live777_url, stream_id);

    let mapping = StreamMapping {
        stream_id: stream_id.clone(),
        rtsp_url: req.url.clone(),
        whep_url: whep_url.clone(),
        created_at: Utc::now(),
    };

    // Store the mapping
    {
        let mut streams = state.streams.write().await;
        streams.insert(stream_id.clone(), mapping);
    }

    tracing::info!(
        stream_id = %stream_id,
        rtsp_url = %req.url,
        whep_url = %whep_url,
        "RTSP bridge registered"
    );

    // Fire-and-forget: notify Live777 about this RTSP source
    let live777_url = state.live777_url.clone();
    let rtsp_url = req.url.clone();
    let sid = stream_id.clone();
    tokio::spawn(async move {
        notify_live777(&live777_url, &rtsp_url, &sid).await;
    });

    let response = RtspResponse {
        whep_url,
        stream_id,
    };

    Ok((StatusCode::OK, Json(response)))
}

/// GET /bridge/rtsp — List all active stream mappings.
pub async fn list_streams(
    State(state): State<AppState>,
) -> Json<StreamListResponse> {
    let streams = state.streams.read().await;
    let list: Vec<StreamMapping> = streams.values().cloned().collect();

    tracing::debug!(count = list.len(), "Listing active streams");

    Json(StreamListResponse { streams: list })
}

/// DELETE /bridge/rtsp/:stream_id — Remove a stream mapping.
pub async fn delete_stream(
    State(state): State<AppState>,
    Path(stream_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let removed = {
        let mut streams = state.streams.write().await;
        streams.remove(&stream_id)
    };

    match removed {
        Some(_) => {
            tracing::info!(stream_id = %stream_id, "RTSP bridge removed");
            Ok(Json(serde_json::json!({
                "status": "deleted",
                "streamId": stream_id
            })))
        }
        None => Err(AppError::StreamNotFound(stream_id)),
    }
}

/// Attempt to notify the Live777 engine about the new RTSP source.
///
/// This is a best-effort operation — if Live777 doesn't have a pull API,
/// we log a message about using FFmpeg/GStreamer as a relay instead.
async fn notify_live777(live777_url: &str, rtsp_url: &str, stream_id: &str) {
    use std::sync::LazyLock;

    static CLIENT: LazyLock<reqwest::Client> = LazyLock::new(reqwest::Client::new);

    tracing::info!(
        rtsp_url = %rtsp_url,
        stream_id = %stream_id,
        "To complete bridge, use: ffmpeg -i {rtsp_url} -c copy -f rtsp {live777_url}/publish/{stream_id}"
    );

    // Try Live777's pull API if available
    let payload = serde_json::json!({
        "source": rtsp_url,
        "streamId": stream_id
    });

    match CLIENT
        .post(format!("{}/stream/pull", live777_url))
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => {
            let body = resp.text().await.unwrap_or_default();
            tracing::info!(
                status = %resp.status(),
                body = %body,
                "Live777 pull API response"
            );
        }
        Err(e) => {
            tracing::warn!(
                error = %e,
                "Live777 pull API not available — use FFmpeg relay"
            );
        }
    }
}
