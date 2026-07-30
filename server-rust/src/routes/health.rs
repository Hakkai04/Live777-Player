use axum::Json;
use serde_json::{json, Value};

/// GET /bridge/health
///
/// Simple health check — used by load balancers and the CI pipeline.
pub async fn health_check() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
