use tracing_subscriber::fmt;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::EnvFilter;

/// Initialize structured logging.
///
/// Output format:
///   - Development: pretty, human-readable
///   - Production (JSON_LOGS=1): JSON lines for log aggregators
///
/// AI Vibe Coding advantage: every request automatically gets a `trace_id`
/// span. When debugging, filter by trace_id to see the full request lifecycle.
pub fn init_logging() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,live777_bridge=debug,tower_http=info"));

    if std::env::var("JSON_LOGS").is_ok() {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt::layer().json())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(fmt::layer().pretty())
            .init();
    }

    tracing::info!("Logging initialized — JSON_LOGS={}", std::env::var("JSON_LOGS").unwrap_or_default());
}
