"""
PromptForge API — Templates Endpoint
GET /api/templates
"""

import json
from http.server import BaseHTTPRequestHandler

TASK_CATEGORIES = [
    {"id": "text_gen", "icon": "✏️", "name": "Text Generation", "desc": "Blog posts, articles, essays, creative writing"},
    {"id": "summarize", "icon": "📋", "name": "Summarization", "desc": "Condense long text into key points"},
    {"id": "translate", "icon": "🌐", "name": "Translation", "desc": "Convert text between languages"},
    {"id": "qa", "icon": "❓", "name": "Question & Answer", "desc": "Answer questions based on context"},
    {"id": "code_gen", "icon": "💻", "name": "Code Generation", "desc": "Write, debug, or explain code"},
    {"id": "data_analysis", "icon": "📊", "name": "Data Analysis", "desc": "Interpret data, create reports"},
    {"id": "brainstorm", "icon": "💡", "name": "Brainstorming", "desc": "Generate ideas, explore concepts"},
    {"id": "editing", "icon": "✂️", "name": "Editing & Rewriting", "desc": "Improve existing text"},
    {"id": "classify", "icon": "🏷️", "name": "Classification", "desc": "Categorize or label content"},
    {"id": "conversation", "icon": "💬", "name": "Conversation/Roleplay", "desc": "Simulate dialogues or personas"},
    {"id": "custom", "icon": "🔧", "name": "Custom Task", "desc": "Describe your own task"},
]

TEMPLATES = {
    "blog": {"name": "Blog Post", "desc": "Write engaging blog content", "task": "text_gen", "persona": "Bestselling Author", "format": "Free-form paragraphs", "length": "Medium", "length_detail": "~200-400 words", "tones": ["Conversational"], "audience": "General Public"},
    "debug": {"name": "Debug Code", "desc": "Find and fix code issues", "task": "code_gen", "persona": "Senior Software Engineer", "format": "Code block", "length": "Medium", "length_detail": "~200-400 words", "tones": ["Technical"], "audience": "Developers"},
    "summarize": {"name": "Summarize Text", "desc": "Condense content into key points", "task": "summarize", "persona": "Executive Assistant", "format": "Bullet points / List", "length": "Short", "length_detail": "~50-100 words", "tones": ["Professional"], "audience": "Business Executives"},
    "email": {"name": "Write Email", "desc": "Compose professional emails", "task": "text_gen", "persona": "Copywriter", "format": "Free-form paragraphs", "length": "Short", "length_detail": "~50-100 words", "tones": ["Professional", "Conversational"], "audience": "General Public"},
    "study": {"name": "Study Notes", "desc": "Create study materials", "task": "summarize", "persona": "Research Analyst", "format": "Bullet points / List", "length": "Medium", "length_detail": "~200-400 words", "tones": ["Simple/Plain"], "audience": "Students"},
    "product": {"name": "Product Description", "desc": "Write compelling copy", "task": "text_gen", "persona": "Copywriter", "format": "Free-form paragraphs", "length": "Short", "length_detail": "~50-100 words", "tones": ["Persuasive"], "audience": "General Public"},
    "explain": {"name": "Explain Concept", "desc": "Break down complex topics", "task": "qa", "persona": "Teacher", "format": "Numbered steps", "length": "Medium", "length_detail": "~200-400 words", "tones": ["Simple/Plain"], "audience": "General Public"},
    "review": {"name": "Review & Edit", "desc": "Improve text quality", "task": "editing", "persona": "Professional Editor", "format": "Free-form paragraphs", "length": "Medium", "length_detail": "~200-400 words", "tones": ["Professional"], "audience": "General Public"},
}

PERSONAS = {
    "text_gen": ["Bestselling Author", "Journalist", "Copywriter", "Technical Writer", "Content Strategist"],
    "summarize": ["Executive Assistant", "Research Analyst", "Journalist", "Academic Reviewer"],
    "translate": ["Professional Translator", "Bilingual Editor", "Localization Specialist", "Cultural Consultant"],
    "qa": ["Subject Matter Expert", "Research Librarian", "Teacher", "Technical Support Specialist"],
    "code_gen": ["Senior Software Engineer", "Code Reviewer", "DevOps Specialist", "Junior Developer Mentor", "Security Auditor"],
    "data_analysis": ["Data Scientist", "Business Analyst", "Research Statistician", "Financial Analyst"],
    "brainstorm": ["Innovation Consultant", "Creative Director", "Design Thinker", "Strategy Advisor"],
    "editing": ["Professional Editor", "Proofreader", "Writing Coach", "Style Consultant"],
    "classify": ["Data Labeling Specialist", "Content Moderator", "Taxonomy Expert", "Information Architect"],
    "conversation": ["Fictional Character", "Historical Figure", "Customer Service Agent", "Interview Coach"],
    "custom": ["Domain Expert", "General Assistant", "Specialized Consultant", "Research Partner"],
}

TONES = [
    "Professional", "Casual", "Academic", "Conversational", "Humorous",
    "Formal", "Empathetic", "Authoritative", "Inspirational", "Sarcastic",
    "Neutral", "Technical", "Simple/Plain", "Persuasive", "Storytelling",
]

FORMATS = [
    "Free-form paragraphs", "Bullet points / List", "Numbered steps",
    "Table", "JSON", "Code block", "Markdown", "Conversation / Dialogue",
]

AUDIENCES = [
    "General Public", "Experts/Specialists", "Children (ages 5-12)",
    "Teenagers", "Business Executives", "Students", "Developers",
    "Non-native English Speakers",
]


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        response = {
            "tasks": TASK_CATEGORIES,
            "templates": TEMPLATES,
            "personas": PERSONAS,
            "tones": TONES,
            "formats": FORMATS,
            "audiences": AUDIENCES,
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(response).encode("utf-8"))