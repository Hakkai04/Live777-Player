use crate::types::StreamMapping;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Shared application state.
///
/// Uses `Arc<RwLock<HashMap>>` for concurrent access — `RwLock` allows
/// multiple concurrent readers (GET /bridge/rtsp) while writers (POST/DELETE)
/// take an exclusive lock.
///
/// AI Vibe Coding advantage: Rust's type system prevents data races at
/// compile time. The Go version's `sync.RWMutex` + `map` requires developer
/// discipline — forgetting a lock is a runtime bug.
#[derive(Clone)]
pub struct AppState {
    pub streams: Arc<RwLock<HashMap<String, StreamMapping>>>,
    pub live777_url: String,
}

impl AppState {
    pub fn new(live777_url: String) -> Self {
        Self {
            streams: Arc::new(RwLock::new(HashMap::new())),
            live777_url,
        }
    }
}
