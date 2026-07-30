mod error;
mod logging;
mod routes;
mod state;
mod types;

use axum::middleware;
use axum::routing::{delete, get, post};
use axum::Router;
use state::AppState;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer};
use tracing::Level;

#[tokio::main]
async fn main() {
    // Initialize structured logging (tracing)
    logging::init_logging();

    // Configuration from environment
    let live777_url = std::env::var("LIVE777_URL")
        .unwrap_or_else(|_| "http://localhost:7777".to_string());

    let listen_port: u16 = std::env::var("BRIDGE_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(4002); // Different port from Go bridge (4001) during migration

    // Shared application state
    let state = AppState::new(live777_url.clone());

    // CORS — permissive for browser player access
    // AI Vibe Coding advantage: tower-http's CorsLayer is type-checked at
    // compile time, unlike the hand-rolled string-based CORS in Go.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Request tracing middleware — adds trace_id span to every request
    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
        .on_response(DefaultOnResponse::new().level(Level::INFO));

    // Router — all routes are exhaustively checked by axum at compile time
    let app = Router::new()
        // Health check
        .route("/bridge/health", get(routes::health::health_check))
        // RTSP bridge CRUD
        .route("/bridge/rtsp", post(routes::rtsp::create_rtsp_bridge))
        .route("/bridge/rtsp", get(routes::rtsp::list_streams))
        .route("/bridge/rtsp/{stream_id}", delete(routes::rtsp::delete_stream))
        // Middleware
        .layer(cors)
        .layer(trace_layer)
        .layer(middleware::from_fn(correlation_middleware))
        .with_state(state);

    let addr: SocketAddr = ([0, 0, 0, 0], listen_port).into();
    tracing::info!(
        live777_url = %live777_url,
        listen_addr = %addr,
        "Live777 RTSP Bridge starting (Rust/axum)"
    );

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Correlation ID middleware — extracts or generates a correlation ID for
/// each request, making it traceable across the full stack.
///
/// Frontend can pass `X-Correlation-ID` header. If absent, one is generated.
/// The correlation ID is injected into the tracing span so all log lines
/// from this request are tagged.
async fn correlation_middleware(
    req: axum::http::request::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> axum::response::Response {
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(1);

    let cid = req
        .headers()
        .get("x-correlation-id")
        .and_then(|v| v.to_str().ok())
        .map(String::from)
        .unwrap_or_else(|| format!("req-{}", COUNTER.fetch_add(1, Ordering::Relaxed)));

    let span = tracing::info_span!("request", correlation_id = %cid);
    let _guard = span.enter();

    tracing::debug!(
        method = %req.method(),
        uri = %req.uri(),
        "Request received"
    );

    next.run(req).await
}
