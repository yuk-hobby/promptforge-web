"""
PromptForge API — Quality Score Endpoint
POST /api/score — Calculate prompt quality score from state

This is a standalone scoring endpoint that can be called independently
(e.g., for real-time score preview as the user fills in the wizard).
"""

import json
from http.server import BaseHTTPRequestHandler


# ═══════════════════════════════════════════════════════════════════
# SCORING RUBRIC
# ═══════════════════════════════════════════════════════════════════

SCORE_THRESHOLDS = [
    {"min": 0, "max": 30, "label": "Weak", "color": "#ef4444", "emoji": "🔴"},
    {"min": 31, "max": 50, "label": "Fair", "color": "#eab308", "emoji": "🟡"},
    {"min": 51, "max": 70, "label": "Good", "color": "#f59e0b", "emoji": "🟠"},
    {"min": 71, "max": 85, "label": "Strong", "color": "#22c55e", "emoji": "🟢"},
    {"min": 86, "max": 100, "label": "Excellent", "color": "#10b981", "emoji": "⭐"},
]

SCORING_RULES = [
    {
        "id": "description_present",
        "label": "Task description present (>10 chars)",
        "points": 20,
        "category": "Essential",
    },
    {
        "id": "description_detailed",
        "label": "Task description detailed (>150 chars)",
        "points": 10,
        "category": "Essential",
    },
    {
        "id": "persona",
        "label": "Persona/role assigned",
        "points": 15,
        "category": "Role",
    },
    {
        "id": "format",
        "label": "Output format specified",
        "points": 10,
        "category": "Output",
    },
    {
        "id": "length",
        "label": "Response length defined",
        "points": 5,
        "category": "Output",
    },
    {
        "id": "tone",
        "label": "Tone/style specified",
        "points": 5,
        "category": "Output",
    },
    {
        "id": "examples_one",
        "label": "At least 1 example provided",
        "points": 20,
        "category": "Examples",
    },
    {
        "id": "examples_multiple",
        "label": "2+ examples provided",
        "points": 5,
        "category": "Examples",
    },
    {
        "id": "constraints",
        "label": "Constraints/rules defined",
        "points": 10,
        "category": "Constraints",
    },
    {
        "id": "audience",
        "label": "Target audience specified",
        "points": 5,
        "category": "Output",
    },
    {
        "id": "advanced",
        "label": "Advanced option enabled",
        "points": 5,
        "category": "Advanced",
    },
]


def calculate_score(state):
    """
    Calculate a detailed prompt quality score.

    Returns:
        dict with score, label, color, breakdown, and improvement tips.
    """
    score = 0
    tips = []
    breakdown = []

    # --- Description present and >10 chars ---
    desc = state.get("description", "") or ""
    if len(desc.strip()) > 10:
        score += 20
        breakdown.append({"rule": "description_present", "earned": True, "points": 20})
    else:
        breakdown.append({"rule": "description_present", "earned": False, "points": 0})
        tips.append({
            "priority": 1,
            "message": "Add a detailed task description (+20 pts)",
            "impact": "high",
        })

    # --- Description detailed (>150 chars) ---
    if len(desc.strip()) > 150:
        score += 10
        breakdown.append({"rule": "description_detailed", "earned": True, "points": 10})
    else:
        breakdown.append({"rule": "description_detailed", "earned": False, "points": 0})
        if len(desc.strip()) > 10:
            tips.append({
                "priority": 5,
                "message": "Expand your description to 150+ characters for bonus points (+10 pts)",
                "impact": "medium",
            })

    # --- Persona assigned ---
    if state.get("persona"):
        score += 15
        breakdown.append({"rule": "persona", "earned": True, "points": 15})
    else:
        breakdown.append({"rule": "persona", "earned": False, "points": 0})
        tips.append({
            "priority": 2,
            "message": "Assign a persona/role for more expert responses (+15 pts)",
            "impact": "high",
        })

    # --- Output format specified ---
    if state.get("format"):
        score += 10
        breakdown.append({"rule": "format", "earned": True, "points": 10})
    else:
        breakdown.append({"rule": "format", "earned": False, "points": 0})
        tips.append({
            "priority": 4,
            "message": "Specify an output format for predictable results (+10 pts)",
            "impact": "medium",
        })

    # --- Length specified ---
    if state.get("length"):
        score += 5
        breakdown.append({"rule": "length", "earned": True, "points": 5})
    else:
        breakdown.append({"rule": "length", "earned": False, "points": 0})
        tips.append({
            "priority": 7,
            "message": "Define response length to control output size (+5 pts)",
            "impact": "low",
        })

    # --- Tone specified ---
    tones = state.get("tones", [])
    if tones and len(tones) > 0:
        score += 5
        breakdown.append({"rule": "tone", "earned": True, "points": 5})
    else:
        breakdown.append({"rule": "tone", "earned": False, "points": 0})
        tips.append({
            "priority": 8,
            "message": "Set a tone/style to shape the response voice (+5 pts)",
            "impact": "low",
        })

    # --- At least 1 example ---
    examples = state.get("examples", [])
    if len(examples) >= 1:
        score += 20
        breakdown.append({"rule": "examples_one", "earned": True, "points": 20})
    else:
        breakdown.append({"rule": "examples_one", "earned": False, "points": 0})
        tips.append({
            "priority": 3,
            "message": "Add an example input/output pair to dramatically improve results (+20 pts)",
            "impact": "high",
        })

    # --- 2+ examples ---
    if len(examples) >= 2:
        score += 5
        breakdown.append({"rule": "examples_multiple", "earned": True, "points": 5})
    else:
        breakdown.append({"rule": "examples_multiple", "earned": False, "points": 0})
        if len(examples) == 1:
            tips.append({
                "priority": 6,
                "message": "Add a second example for better pattern recognition (+5 pts)",
                "impact": "medium",
            })

    # --- Constraints defined ---
    if state.get("constraints"):
        score += 10
        breakdown.append({"rule": "constraints", "earned": True, "points": 10})
    else:
        breakdown.append({"rule": "constraints", "earned": False, "points": 0})
        tips.append({
            "priority": 5,
            "message": "Define constraints/rules for more predictable output (+10 pts)",
            "impact": "medium",
        })

    # --- Audience specified ---
    if state.get("audience"):
        score += 5
        breakdown.append({"rule": "audience", "earned": True, "points": 5})
    else:
        breakdown.append({"rule": "audience", "earned": False, "points": 0})
        tips.append({
            "priority": 9,
            "message": "Specify target audience for better-tailored responses (+5 pts)",
            "impact": "low",
        })

    # --- Any advanced option enabled ---
    has_advanced = any([
        state.get("chain_of_thought", False),
        state.get("clarifying_questions", False),
        state.get("multiple_variations", False),
        state.get("confidence_rating", False),
    ])
    if has_advanced:
        score += 5
        breakdown.append({"rule": "advanced", "earned": True, "points": 5})
    else:
        breakdown.append({"rule": "advanced", "earned": False, "points": 0})
        tips.append({
            "priority": 10,
            "message": "Enable Chain-of-Thought or another advanced option (+5 pts)",
            "impact": "low",
        })

    # Cap score at 100
    score = min(score, 100)

    # Determine label and color
    label = "Weak"
    color = "#ef4444"
    emoji = "🔴"
    for threshold in SCORE_THRESHOLDS:
        if threshold["min"] <= score <= threshold["max"]:
            label = threshold["label"]
            color = threshold["color"]
            emoji = threshold["emoji"]
            break

    # Sort tips by priority (highest impact first)
    tips.sort(key=lambda t: t["priority"])

    # Calculate max possible score
    max_possible = sum(rule["points"] for rule in SCORING_RULES)
    earned_points = sum(item["points"] for item in breakdown if item["earned"])

    return {
        "score": score,
        "max_score": max_possible,
        "earned_points": earned_points,
        "label": label,
        "color": color,
        "emoji": emoji,
        "breakdown": breakdown,
        "tips": tips[:5],  # Top 5 improvement tips
        "rules": SCORING_RULES,
        "completeness_pct": round((earned_points / max_possible) * 100, 1) if max_possible else 0,
    }


# ═══════════════════════════════════════════════════════════════════
# VERCEL HANDLER
# ═══════════════════════════════════════════════════════════════════

class handler(BaseHTTPRequestHandler):
    """Handle score calculation requests."""

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        """
        GET /api/score
        Returns the scoring rubric and rules (no calculation).
        Useful for displaying scoring criteria in the UI.
        """
        response = {
            "success": True,
            "rubric": SCORING_RULES,
            "thresholds": SCORE_THRESHOLDS,
            "max_possible": sum(rule["points"] for rule in SCORING_RULES),
            "description": "POST a state object to calculate your prompt's quality score.",
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))

    def do_POST(self):
        """
        POST /api/score
        Body (JSON): The prompt state object (same as /api/generate).
        Returns detailed score breakdown.

        Example request body:
        {
            "description": "Write a blog post about...",
            "persona": "Bestselling Author",
            "format": "Free-form paragraphs",
            "length": "Medium",
            "tones": ["Professional", "Conversational"],
            "audience": "General Public",
            "examples": [{"input": "...", "output": "..."}],
            "constraints": "Do not use jargon",
            "chain_of_thought": true,
            "clarifying_questions": false,
            "multiple_variations": false,
            "confidence_rating": false
        }

        Example response:
        {
            "success": true,
            "score": 78,
            "label": "Strong",
            "color": "#22c55e",
            "emoji": "🟢",
            "earned_points": 78,
            "max_score": 110,
            "completeness_pct": 70.9,
            "breakdown": [...],
            "tips": [...],
            "rules": [...]
        }
        """
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            state = json.loads(body)

            # Calculate score
            result = calculate_score(state)
            result["success"] = True

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))

        except json.JSONDecodeError:
            self._send_error(400, "Invalid JSON in request body.")
        except Exception as e:
            self._send_error(500, f"Score calculation error: {str(e)}")

    def _send_error(self, status_code, message):
        """Send a standardized error response."""
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        response = {"success": False, "error": message}
        self.wfile.write(json.dumps(response).encode("utf-8"))