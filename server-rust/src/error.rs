use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;

/// Unified error type for the bridge API.
///
/// Each variant maps to an HTTP status code via `IntoResponse`.
/// AI Vibe Coding advantage: `match` on this enum is checked for exhaustiveness.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Missing 'url' field")]
    MissingUrl,

    #[error("URL must start with rtsp:// or rtsps://")]
    InvalidUrlScheme,

    #[error("Stream not found: {0}")]
    StreamNotFound(String),

    #[error("Live777 engine unreachable: {0}")]
    Live777Unreachable(#[from] reqwest::Error),

    #[error("Internal error: {0}")]
    #[allow(dead_code)] // reserved for future error paths
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::MissingUrl => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::InvalidUrlScheme => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::StreamNotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Live777Unreachable(_) => (StatusCode::BAD_GATEWAY, self.to_string()),
            AppError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        let body = serde_json::json!({ "error": message });
        (status, Json(body)).into_response()
    }
}
