"""
PromptForge API — History Endpoint
GET /api/history — Retrieve prompt history
POST /api/history — Save a new history entry

Note: On serverless (Vercel), persistent file storage is not available.
This endpoint uses a lightweight approach with response headers to guide
the frontend to use localStorage instead. It provides a server-side
fallback using /tmp (ephemeral, lost between cold starts).
"""

import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from pathlib import Path

# Ephemeral storage path (survives within a single warm instance only)
HISTORY_FILE = Path("/tmp/promptforge_history.json")
MAX_HISTORY = 50


def load_history():
    """Load history from ephemeral file storage."""
    try:
        if HISTORY_FILE.exists():
            data = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return []


def save_history(history):
    """Save history to ephemeral file storage."""
    try:
        # Enforce max limit (FIFO)
        if len(history) > MAX_HISTORY:
            history = history[-MAX_HISTORY:]
        HISTORY_FILE.write_text(
            json.dumps(history, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        return True
    except Exception:
        return False


class handler(BaseHTTPRequestHandler):
    """Handle history GET and POST requests."""

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        """
        GET /api/history
        Query params:
            ?limit=N  — Return last N entries (default: 10, max: 50)
            ?full=1   — Include full prompt text (default: excluded for brevity)

        Returns JSON array of history entries.
        """
        try:
            # Parse query parameters
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            limit = min(int(params.get("limit", ["10"])[0]), MAX_HISTORY)
            include_full = params.get("full", ["0"])[0] == "1"

            history = load_history()

            # Get last N entries (most recent first)
            entries = history[-limit:]
            entries.reverse()

            # Optionally strip full prompt for lighter response
            if not include_full:
                entries = [
                    {
                        "id": i,
                        "timestamp": entry.get("timestamp", ""),
                        "task_type": entry.get("task_type", "Unknown"),
                        "description_preview": entry.get("description_preview", ""),
                        "prompt_length": len(entry.get("full_prompt", "")),
                        "score": entry.get("score", None),
                    }
                    for i, entry in enumerate(entries)
                ]

            response = {
                "success": True,
                "count": len(entries),
                "total": len(history),
                "entries": entries,
                "storage_note": "Server history is ephemeral on serverless. Use localStorage for persistence.",
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))

        except Exception as e:
            self._send_error(500, str(e))

    def do_POST(self):
        """
        POST /api/history
        Body (JSON):
        {
            "timestamp": "ISO string",
            "task_type": "Text Generation",
            "description_preview": "First 50 chars...",
            "full_prompt": "The complete generated prompt...",
            "score": 78
        }

        Saves entry to server-side ephemeral history.
        Returns confirmation with entry ID.
        """
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            entry = json.loads(body)

            # Validate required fields
            if not entry.get("full_prompt"):
                self._send_error(400, "Missing required field: full_prompt")
                return

            # Ensure timestamp
            if not entry.get("timestamp"):
                entry["timestamp"] = datetime.now().isoformat()

            # Ensure description preview
            if not entry.get("description_preview"):
                entry["description_preview"] = entry.get("full_prompt", "")[:50]

            # Load existing history and append
            history = load_history()
            history.append(entry)

            # Save
            if save_history(history):
                response = {
                    "success": True,
                    "message": "History entry saved.",
                    "entry_id": len(history) - 1,
                    "total_entries": len(history),
                }
                self.send_response(201)
            else:
                response = {
                    "success": False,
                    "message": "Failed to save. Ephemeral storage may be unavailable.",
                }
                self.send_response(500)

            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))

        except json.JSONDecodeError:
            self._send_error(400, "Invalid JSON in request body.")
        except Exception as e:
            self._send_error(500, str(e))

    def do_DELETE(self):
        """
        DELETE /api/history
        Clears all server-side history.
        """
        try:
            if HISTORY_FILE.exists():
                HISTORY_FILE.unlink()

            response = {
                "success": True,
                "message": "History cleared.",
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))

        except Exception as e:
            self._send_error(500, str(e))

    def _send_error(self, status_code, message):
        """Send an error response."""
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        response = {"success": False, "error": message}
        self.wfile.write(json.dumps(response).encode("utf-8"))