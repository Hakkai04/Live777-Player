use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Request body for POST /bridge/rtsp
#[derive(Debug, Deserialize)]
pub struct RtspRequest {
    pub url: String,
}

/// Response body for POST /bridge/rtsp
#[derive(Debug, Serialize)]
pub struct RtspResponse {
    #[serde(rename = "whepUrl")]
    pub whep_url: String,
    #[serde(rename = "streamId")]
    pub stream_id: String,
}

/// An active RTSP→WHEP stream mapping
#[derive(Debug, Clone, Serialize)]
pub struct StreamMapping {
    #[serde(rename = "streamId")]
    pub stream_id: String,
    #[serde(rename = "rtspUrl")]
    pub rtsp_url: String,
    #[serde(rename = "whepUrl")]
    pub whep_url: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

/// Response body for GET /bridge/rtsp
#[derive(Debug, Serialize)]
pub struct StreamListResponse {
    pub streams: Vec<StreamMapping>,
}
