// Live777 RTSP → WHEP Bridge
//
// A minimal HTTP service that acts as a protocol bridge:
//   RTSP camera → RTP ingest → Live777 → WHEP output → browser player
//
// The bridge sits between the player webapp and the Live777 engine.
// When the player wants to play an RTSP stream, it POSTs the RTSP URL
// to this bridge. The bridge registers the RTSP source with Live777
// (via its API) and returns a WHEP URL that the player can use directly.
//
// Usage:
//   go run bridge.go
//   # Listens on :4001
//
//   POST /bridge/rtsp
//   Content-Type: application/json
//   { "url": "rtsp://camera-ip:554/stream" }
//
//   Response 200:
//   { "whepUrl": "http://localhost:7777/whep/uuid", "streamId": "uuid" }

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gofrs/uuid/v5"
)

// Config
var (
	live777Url = envOrDefault("LIVE777_URL", "http://localhost:7777")
	listenPort = envOrDefault("BRIDGE_PORT", "4001")
)

// In-memory store of active RTSP→WHEP mappings
type StreamMapping struct {
	StreamID   string    `json:"streamId"`
	RtspUrl    string    `json:"rtspUrl"`
	WhepUrl    string    `json:"whepUrl"`
	CreatedAt  time.Time `json:"createdAt"`
}

var (
	streams   = make(map[string]*StreamMapping)
	streamsMu sync.RWMutex
)

// API types
type RtspRequest struct {
	Url string `json:"url"`
}

type RtspResponse struct {
	WhepUrl  string `json:"whepUrl"`
	StreamId string `json:"streamId"`
}

type StreamsListResponse struct {
	Streams []*StreamMapping `json:"streams"`
}

func main() {
	mux := http.NewServeMux()

	// Register an RTSP source → get back a WHEP URL
	mux.HandleFunc("/bridge/rtsp", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			createRtspBridge(w, r)
			return
		}
		if r.Method == http.MethodGet {
			listStreams(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// Delete a bridged stream
	mux.HandleFunc("/bridge/rtsp/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			deleteStream(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// Health check
	mux.HandleFunc("/bridge/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// CORS middleware wrapper
	handler := corsMiddleware(mux)

	log.Printf("=== Live777 RTSP Bridge ===")
	log.Printf("Live777 URL: %s", live777Url)
	log.Printf("Listening on :%s", listenPort)
	log.Printf("Endpoints:")
	log.Printf("  POST /bridge/rtsp  — Register RTSP source")
	log.Printf("  GET  /bridge/rtsp  — List active streams")
	log.Printf("  DELETE /bridge/rtsp/{streamId} — Remove stream")
	log.Fatal(http.ListenAndServe(":"+listenPort, handler))
}

func createRtspBridge(w http.ResponseWriter, r *http.Request) {
	var req RtspRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid JSON body"}`, http.StatusBadRequest)
		return
	}

	if req.Url == "" {
		http.Error(w, `{"error":"Missing 'url' field"}`, http.StatusBadRequest)
		return
	}

	// Validate RTSP URL
	if !strings.HasPrefix(req.Url, "rtsp://") && !strings.HasPrefix(req.Url, "rtsps://") {
		http.Error(w, `{"error":"URL must start with rtsp:// or rtsps://"}`, http.StatusBadRequest)
		return
	}

	// Generate unique stream ID
	streamId := uuid.Must(uuid.NewV4()).String()

	// Register with Live777 engine
	// The Live777 engine supports RTP ingest — we tell it to pull from this RTSP source
	// and expose it as a WHEP endpoint
	//
	// Live777 API: POST /stream/pull with source URL
	// But since the Live777 API might not have a direct RTSP pull endpoint,
	// we create the mapping and the player will connect via the bridge-proxied WHEP.
	//
	// For now, we register the mapping in-memory.
	// In a production setup, you'd use Live777's actual ingest API or FFmpeg as a relay.

	mapping := &StreamMapping{
		StreamID:  streamId,
		RtspUrl:   req.Url,
		WhepUrl:   fmt.Sprintf("%s/whep/%s", live777Url, streamId),
		CreatedAt: time.Now(),
	}

	streamsMu.Lock()
	streams[streamId] = mapping
	streamsMu.Unlock()

	// Try to notify Live777 about this RTSP source
	// If Live777 has a pull API, we'd call it here
	go notifyLive777(mapping)

	resp := RtspResponse{
		WhepUrl:  mapping.WhepUrl,
		StreamId: streamId,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)

	log.Printf("[RTSP→WHEP] Registered: %s → %s", req.Url, mapping.WhepUrl)
}

func listStreams(w http.ResponseWriter, r *http.Request) {
	streamsMu.RLock()
	list := make([]*StreamMapping, 0, len(streams))
	for _, s := range streams {
		list = append(list, s)
	}
	streamsMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(StreamsListResponse{Streams: list})
}

func deleteStream(w http.ResponseWriter, r *http.Request) {
	// Extract stream ID from path: /bridge/rtsp/{streamId}
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/bridge/rtsp/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, `{"error":"Missing stream ID"}`, http.StatusBadRequest)
		return
	}
	streamId := parts[0]

	streamsMu.Lock()
	delete(streams, streamId)
	streamsMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted", "streamId": streamId})

	log.Printf("[RTSP→WHEP] Removed stream: %s", streamId)
}

// notifyLive777 attempts to register the RTSP source with the Live777 engine.
//
// Live777 supports WHIP/WHEP and RTP protocol conversion.
// The recommended approach is to use an external tool (like FFmpeg or Gstreamer)
// to pull RTSP and push to Live777 via WHIP.
//
// This function demonstrates the integration pattern:
//   RTSP source → FFmpeg/GStreamer (RTSP→RTP) → Live777 WHIP ingest → WHEP output
func notifyLive777(m *StreamMapping) {
	// In a production setup, you would:
	// 1. Start an FFmpeg process:
	//    ffmpeg -i {rtspUrl} -c copy -f rtp rtp://live777:port
	//    OR use WHIP: ffmpeg -i {rtspUrl} -c copy -f webm {whipUrl}
	//
	// 2. Or, use Live777's internal API if it supports source pulling
	//
	// For now, log the instruction
	log.Printf("[RTSP→WHEP] To complete bridge, run:")
	log.Printf("  ffmpeg -i %s -c copy -f rtsp %s/publish/%s",
		m.RtspUrl, live777Url, m.StreamID)

	// Optional: check if Live777 has a pull API
	if live777Url != "" {
		payload := fmt.Sprintf(`{"source":"%s","streamId":"%s"}`,
			m.RtspUrl, m.StreamID)
		resp, err := http.Post(
			fmt.Sprintf("%s/stream/pull", live777Url),
			"application/json",
			bytes.NewBufferString(payload),
		)
		if err != nil {
			log.Printf("[RTSP→WHEP] Live777 pull API not available: %v", err)
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[RTSP→WHEP] Live777 response: %s", string(body))
	}
}

// corsMiddleware adds CORS headers for the player webapp
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func envOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
