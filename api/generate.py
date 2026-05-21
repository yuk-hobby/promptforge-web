"""
PromptForge API — Prompt Generation Endpoint
POST /api/generate
"""

import json
from http.server import BaseHTTPRequestHandler


# ═══════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════

TEMPLATES = {
    "blog": {
        "name": "Blog Post",
        "desc": "Write engaging blog content",
        "task": "text_gen",
        "persona": "Bestselling Author",
        "format": "Free-form paragraphs",
        "length": "Medium",
        "length_detail": "~200-400 words",
        "tones": ["Conversational"],
        "audience": "General Public",
    },
    "debug": {
        "name": "Debug Code",
        "desc": "Find and fix code issues",
        "task": "code_gen",
        "persona": "Senior Software Engineer",
        "format": "Code block",
        "length": "Medium",
        "length_detail": "~200-400 words",
        "tones": ["Technical"],
        "audience": "Developers",
    },
    "summarize": {
        "name": "Summarize Text",
        "desc": "Condense content into key points",
        "task": "summarize",
        "persona": "Executive Assistant",
        "format": "Bullet points / List",
        "length": "Short",
        "length_detail": "~50-100 words",
        "tones": ["Professional"],
        "audience": "Business Executives",
    },
    "email": {
        "name": "Write Email",
        "desc": "Compose professional emails",
        "task": "text_gen",
        "persona": "Copywriter",
        "format": "Free-form paragraphs",
        "length": "Short",
        "length_detail": "~50-100 words",
        "tones": ["Professional", "Conversational"],
        "audience": "General Public",
    },
    "study": {
        "name": "Study Notes",
        "desc": "Create study materials from content",
        "task": "summarize",
        "persona": "Research Analyst",
        "format": "Bullet points / List",
        "length": "Medium",
        "length_detail": "~200-400 words",
        "tones": ["Simple/Plain"],
        "audience": "Students",
    },
    "product": {
        "name": "Product Description",
        "desc": "Write compelling product copy",
        "task": "text_gen",
        "persona": "Copywriter",
        "format": "Free-form paragraphs",
        "length": "Short",
        "length_detail": "~50-100 words",
        "tones": ["Persuasive"],
        "audience": "General Public",
    },
    "explain": {
        "name": "Explain Concept",
        "desc": "Break down complex topics simply",
        "task": "qa",
        "persona": "Teacher",
        "format": "Numbered steps",
        "length": "Medium",
        "length_detail": "~200-400 words",
        "tones": ["Simple/Plain"],
        "audience": "General Public",
    },
    "review": {
        "name": "Review & Edit",
        "desc": "Improve existing text quality",
        "task": "editing",
        "persona": "Professional Editor",
        "format": "Free-form paragraphs",
        "length": "Medium",
        "length_detail": "~200-400 words",
        "tones": ["Professional"],
        "audience": "General Public",
    },
}

DOMAIN_MAP = {
    "text_gen": "writing and content creation",
    "summarize": "summarization and synthesis",
    "translate": "translation and linguistics",
    "qa": "answering questions with accuracy",
    "code_gen": "software development and programming",
    "data_analysis": "data analysis and interpretation",
    "brainstorm": "creative ideation and brainstorming",
    "editing": "editing and improving written content",
    "classify": "content classification and categorization",
    "conversation": "conversational dialogue",
}

SCORE_THRESHOLDS = [
    (0, 30, "Weak"),
    (31, 50, "Fair"),
    (51, 70, "Good"),
    (71, 85, "Strong"),
    (86, 100, "Excellent"),
]


# ═══════════════════════════════════════════════════════════════════
# PROMPT ASSEMBLY
# ═══════════════════════════════════════════════════════════════════

def assemble_prompt(state):
    """Assemble the final prompt from the state dictionary."""
    parts = []

    # Persona
    if state.get("persona"):
        parts.append(f"Act as {state['persona']}.")
    elif state.get("task_id") and state["task_id"] != "custom":
        domain = DOMAIN_MAP.get(state["task_id"])
        if domain:
            parts.append(f"You are an expert in {domain}.")

    # Main instruction
    if state.get("description"):
        parts.append("")
        parts.append(state["description"])

    # Context
    if state.get("context"):
        parts.append("")
        parts.append("Here is the context/information to work with:")
        parts.append("")
        parts.append("---")
        parts.append(state["context"])
        parts.append("---")

    # Output configuration
    config_parts = []
    if state.get("format") and state["format"] != "Free-form paragraphs":
        config_parts.append(f"Format your response as: {state['format']}.")
    if state.get("length"):
        if state["length"] == "Specific":
            config_parts.append(f"Keep your response to approximately {state.get('length_detail', '')}.")
        elif state.get("length_detail"):
            config_parts.append(f"Keep your response {state['length'].lower()} ({state['length_detail']}).")
    if state.get("tones"):
        tone_str = ", ".join(state["tones"]).lower()
        config_parts.append(f"Use a {tone_str} tone.")
    if state.get("audience"):
        config_parts.append(f"Write for an audience of: {state['audience']}.")
    if state.get("language") and state["language"].lower() != "english":
        config_parts.append(f"Respond in {state['language']}.")

    if config_parts:
        parts.append("")
        parts.append(" ".join(config_parts))

    # Examples
    examples = state.get("examples", [])
    if examples:
        parts.append("")
        parts.append("Here are examples of what I expect:")
        for i, ex in enumerate(examples, 1):
            parts.append("")
            parts.append(f"Example {i}:")
            parts.append(f"Input: {ex.get('input', '')}")
            parts.append(f"Output: {ex.get('output', '')}")

    # Constraints
    if state.get("constraints"):
        parts.append("")
        parts.append("Important rules and constraints:")
        for line in state["constraints"].split("\n"):
            line = line.strip()
            if line:
                if not line.startswith("-"):
                    line = f"- {line}"
                parts.append(line)

    # Advanced options
    advanced_parts = []
    if state.get("chain_of_thought"):
        advanced_parts.append("Think through this step-by-step before providing your final answer.")
    if state.get("clarifying_questions"):
        advanced_parts.append("Before answering, ask me any clarifying questions you need to provide the best possible response.")
    if state.get("multiple_variations"):
        n = state.get("variation_count", 3)
        advanced_parts.append(f"Provide {n} distinct variations/options for me to choose from.")
    if state.get("confidence_rating"):
        advanced_parts.append("After your response, rate your confidence on a scale of 1-10 and briefly explain your rating.")

    if advanced_parts:
        parts.append("")
        for ap in advanced_parts:
            parts.append(ap)

    return "\n".join(parts).strip()


def calculate_score(state):
    """Calculate prompt quality score."""
    score = 0
    tips = []

    desc = state.get("description", "")
    if len(desc) > 10:
        score += 20
        if len(desc) > 150:
            score += 10
    else:
        tips.append("Add a more detailed task description (+20 pts)")

    if state.get("persona"):
        score += 15
    else:
        tips.append("Assign a persona/role for more expert responses (+15 pts)")

    if state.get("format"):
        score += 10
    else:
        tips.append("Specify an output format for predictable results (+10 pts)")

    if state.get("length"):
        score += 5
    else:
        tips.append("Define response length to control output (+5 pts)")

    if state.get("tones"):
        score += 5
    else:
        tips.append("Set a tone/style to shape the voice (+5 pts)")

    examples = state.get("examples", [])
    if len(examples) >= 1:
        score += 20
        if len(examples) >= 2:
            score += 5
    else:
        tips.append("Add example input/output pairs to improve results (+20 pts)")

    if state.get("constraints"):
        score += 10
    else:
        tips.append("Define constraints for predictable formatting (+10 pts)")

    if state.get("audience"):
        score += 5
    else:
        tips.append("Specify target audience for tailored responses (+5 pts)")

    if any([state.get("chain_of_thought"), state.get("clarifying_questions"),
            state.get("multiple_variations"), state.get("confidence_rating")]):
        score += 5
    else:
        tips.append("Enable Chain-of-Thought for deeper responses (+5 pts)")

    score = min(score, 100)

    label = "Weak"
    for low, high, lbl in SCORE_THRESHOLDS:
        if low <= score <= high:
            label = lbl
            break

    return score, label, tips[:3]


# ═══════════════════════════════════════════════════════════════════
# VERCEL HANDLER
# ═══════════════════════════════════════════════════════════════════

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            state = json.loads(body)

            # Assemble prompt
            prompt = assemble_prompt(state)
            score, label, tips = calculate_score(state)

            response = {
                "success": True,
                "prompt": prompt,
                "score": score,
                "score_label": label,
                "tips": tips,
                "char_count": len(prompt),
                "word_count": len(prompt.split()),
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))

        except Exception as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            error_resp = {"success": False, "error": str(e)}
            self.wfile.write(json.dumps(error_resp).encode("utf-8"))