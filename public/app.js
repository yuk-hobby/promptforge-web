/**
 * PromptForge — Frontend Wizard Logic
 */

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════

let appData = null;
let currentStep = 1;
const totalSteps = 6;

const state = {
    task_id: null,
    task_name: null,
    persona: null,
    description: null,
    context: null,
    format: null,
    length: null,
    length_detail: null,
    tones: [],
    language: "English",
    audience: null,
    examples: [],
    constraints: null,
    chain_of_thought: false,
    clarifying_questions: false,
    multiple_variations: false,
    variation_count: 3,
    confidence_rating: false,
};

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const resp = await fetch("/api/templates");
        appData = await resp.json();
        renderStep1();
        renderStep4();
        setupEventListeners();
    } catch (e) {
        console.error("Failed to load app data:", e);
        // Use fallback data
        appData = getFallbackData();
        renderStep1();
        renderStep4();
        setupEventListeners();
    }
});

function getFallbackData() {
    return {
        tasks: [
            {id:"text_gen",icon:"✏️",name:"Text Generation",desc:"Blog posts, articles, essays"},
            {id:"summarize",icon:"📋",name:"Summarization",desc:"Condense long text"},
            {id:"translate",icon:"🌐",name:"Translation",desc:"Convert between languages"},
            {id:"qa",icon:"❓",name:"Question & Answer",desc:"Answer questions"},
            {id:"code_gen",icon:"💻",name:"Code Generation",desc:"Write or debug code"},
            {id:"data_analysis",icon:"📊",name:"Data Analysis",desc:"Interpret data"},
            {id:"brainstorm",icon:"💡",name:"Brainstorming",desc:"Generate ideas"},
            {id:"editing",icon:"✂️",name:"Editing & Rewriting",desc:"Improve text"},
            {id:"classify",icon:"🏷️",name:"Classification",desc:"Categorize content"},
            {id:"conversation",icon:"💬",name:"Conversation/Roleplay",desc:"Simulate dialogues"},
            {id:"custom",icon:"🔧",name:"Custom Task",desc:"Your own task"},
        ],
        templates: {},
        personas: {},
        tones: ["Professional","Casual","Academic","Conversational","Humorous","Formal","Empathetic","Authoritative","Inspirational","Sarcastic","Neutral","Technical","Simple/Plain","Persuasive","Storytelling"],
        formats: ["Free-form paragraphs","Bullet points / List","Numbered steps","Table","JSON","Code block","Markdown","Conversation / Dialogue"],
        audiences: ["General Public","Experts/Specialists","Children (ages 5-12)","Teenagers","Business Executives","Students","Developers","Non-native English Speakers"],
    };
}

function setupEventListeners() {
    // Description character counter
    const descEl = document.getElementById("description");
    if (descEl) {
        descEl.addEventListener("input", () => {
            document.getElementById("desc-count").textContent = `${descEl.value.length} characters`;
        });
    }

    // Variations toggle
    const varCheckbox = document.getElementById("opt-variations");
    if (varCheckbox) {
        varCheckbox.addEventListener("change", () => {
            document.getElementById("variation-count-group").style.display =
                varCheckbox.checked ? "block" : "none";
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════

function renderStep1() {
    // Task Grid
    const grid = document.getElementById("task-grid");
    grid.innerHTML = "";
    appData.tasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "task-card" + (state.task_id === task.id ? " selected" : "");
        card.innerHTML = `
            <span class="task-icon">${task.icon}</span>
            <div class="task-info">
                <h4>${task.name}</h4>
                <p>${task.desc}</p>
            </div>
        `;
        card.addEventListener("click", () => selectTask(task));
        grid.appendChild(card);
    });

    // Template Grid
    const tplGrid = document.getElementById("template-grid");
    tplGrid.innerHTML = "";
    Object.entries(appData.templates).forEach(([key, tpl]) => {
        const chip = document.createElement("span");
        chip.className = "template-chip";
        chip.textContent = `${tpl.name}`;
        chip.title = tpl.desc;
        chip.addEventListener("click", () => applyTemplate(key, tpl));
        tplGrid.appendChild(chip);
    });
}

function renderStep2() {
    const grid = document.getElementById("persona-grid");
    grid.innerHTML = "";
    const personas = (appData.personas && appData.personas[state.task_id]) || ["Domain Expert", "General Assistant"];
    personas.forEach(p => {
        const card = document.createElement("div");
        card.className = "persona-card" + (state.persona === p ? " selected" : "");
        card.textContent = p;
        card.addEventListener("click", () => {
            state.persona = p;
            document.querySelectorAll(".persona-card").forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            document.getElementById("custom-persona-input").value = "";
        });
        grid.appendChild(card);
    });
}

function renderStep4() {
    // Formats
    const formatGrid = document.getElementById("format-grid");
    formatGrid.innerHTML = "";
    appData.formats.forEach(fmt => {
        const label = document.createElement("label");
        label.className = state.format === fmt ? "selected" : "";
        label.innerHTML = `<input type="radio" name="format" value="${fmt}"> ${fmt}`;
        label.addEventListener("click", () => {
            state.format = fmt;
            formatGrid.querySelectorAll("label").forEach(l => l.classList.remove("selected"));
            label.classList.add("selected");
        });
        formatGrid.appendChild(label);
    });

    // Lengths
    const lengths = [
        {name:"Very Short",desc:"1-2 sentences"},
        {name:"Short",desc:"~50-100 words"},
        {name:"Medium",desc:"~200-400 words"},
        {name:"Long",desc:"~500-1000 words"},
        {name:"Very Long",desc:"1000+ words"},
    ];
    const lengthGrid = document.getElementById("length-grid");
    lengthGrid.innerHTML = "";
    lengths.forEach(l => {
        const label = document.createElement("label");
        label.className = state.length === l.name ? "selected" : "";
        label.innerHTML = `<input type="radio" name="length" value="${l.name}"> ${l.name} <small>(${l.desc})</small>`;
        label.addEventListener("click", () => {
            state.length = l.name;
            state.length_detail = l.desc;
            lengthGrid.querySelectorAll("label").forEach(el => el.classList.remove("selected"));
            label.classList.add("selected");
        });
        lengthGrid.appendChild(label);
    });

    // Tones
    const toneGrid = document.getElementById("tone-grid");
    toneGrid.innerHTML = "";
    appData.tones.forEach(tone => {
        const label = document.createElement("label");
        label.className = state.tones.includes(tone) ? "selected" : "";
        label.innerHTML = `<input type="checkbox" value="${tone}"> ${tone}`;
        label.addEventListener("click", (e) => {
            e.preventDefault();
            if (state.tones.includes(tone)) {
                state.tones = state.tones.filter(t => t !== tone);
                label.classList.remove("selected");
            } else if (state.tones.length < 3) {
                state.tones.push(tone);
                label.classList.add("selected");
            }
        });
        toneGrid.appendChild(label);
    });

    // Audiences
    const audienceSelect = document.getElementById("audience");
    audienceSelect.innerHTML = '<option value="">-- Select (optional) --</option>';
    appData.audiences.forEach(aud => {
        const opt = document.createElement("option");
        opt.value = aud;
        opt.textContent = aud;
        if (state.audience === aud) opt.selected = true;
        audienceSelect.appendChild(opt);
    });
}

function renderReview() {
    const panel = document.getElementById("review-panel");
    const items = [
        ["Task", state.task_name || "Not set"],
        ["Persona", state.persona || "None"],
        ["Description", state.description ? (state.description.substring(0, 80) + (state.description.length > 80 ? "..." : "")) : "Not set"],
        ["Context", state.context ? `${state.context.length} characters` : "None"],
        ["Format", state.format || "Not specified"],
        ["Length", state.length ? `${state.length} (${state.length_detail || ""})` : "Not specified"],
        ["Tone", state.tones.length ? state.tones.join(", ") : "Not specified"],
        ["Language", state.language],
        ["Audience", state.audience || "Not specified"],
        ["Examples", `${state.examples.length} provided`],
        ["Constraints", state.constraints ? "Defined" : "None"],
        ["Advanced", getAdvancedSummary()],
    ];

    panel.innerHTML = items.map(([label, value]) => `
        <div class="review-item">
            <span class="review-label">${label}</span>
            <span class="review-value">${value}</span>
        </div>
    `).join("");
}

function getAdvancedSummary() {
    const parts = [];
    if (state.chain_of_thought) parts.push("Chain-of-Thought ✓");
    if (state.clarifying_questions) parts.push("Clarifying ✓");
    if (state.multiple_variations) parts.push(`Variations(${state.variation_count}) ✓`);
    if (state.confidence_rating) parts.push("Confidence ✓");
    return parts.length ? parts.join(", ") : "None";
}

// ═══════════════════════════════════════════════════════════════════
// INTERACTIONS
// ═══════════════════════════════════════════════════════════════════

function selectTask(task) {
    state.task_id = task.id;
    state.task_name = task.name;
    document.querySelectorAll(".task-card").forEach(c => c.classList.remove("selected"));
    event.currentTarget.classList.add("selected");
}

function applyTemplate(key, tpl) {
    state.task_id = tpl.task;
    state.task_name = appData.tasks.find(t => t.id === tpl.task)?.name || tpl.task;
    state.persona = tpl.persona || null;
    state.format = tpl.format || null;
    state.length = tpl.length || null;
    state.length_detail = tpl.length_detail || null;
    state.tones = tpl.tones || [];
    state.audience = tpl.audience || null;

    renderStep1();
    renderStep4();
    nextStep();
}

function skipPersona() {
    state.persona = null;
    document.querySelectorAll(".persona-card").forEach(c => c.classList.remove("selected"));
    document.getElementById("custom-persona-input").value = "";
    nextStep();
}

let exampleCount = 0;

function addExample() {
    exampleCount++;
    const container = document.getElementById("examples-container");
    const div = document.createElement("div");
    div.className = "example-pair";
    div.id = `example-${exampleCount}`;
    div.innerHTML = `
        <h4>Example ${exampleCount} <button class="btn-remove" onclick="removeExample(${exampleCount})">Remove</button></h4>
        <textarea class="example-input" rows="2" placeholder="Example input..."></textarea>
        <textarea class="example-output" rows="2" placeholder="Expected output..."></textarea>
    `;
    container.appendChild(div);

    if (container.children.length >= 3) {
        document.getElementById("add-example-btn").style.display = "none";
    }
}

function removeExample(id) {
    const el = document.getElementById(`example-${id}`);
    if (el) el.remove();
    document.getElementById("add-example-btn").style.display = "inline-block";
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════

function nextStep() {
    if (!validateCurrentStep()) return;
    collectCurrentStepData();

    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
    document.getElementById(`step-${step}`).classList.add("active");

    // Update progress indicators
    document.querySelectorAll(".step-indicator").forEach(ind => {
        const s = parseInt(ind.dataset.step);
        ind.classList.remove("active", "completed");
        if (s === step) ind.classList.add("active");
        else if (s < step) ind.classList.add("completed");
    });

    // Update nav buttons
    document.getElementById("btn-back").disabled = (step === 1);

    if (step === totalSteps) {
        document.getElementById("btn-next").style.display = "none";
        document.getElementById("btn-generate").style.display = "inline-block";
        renderReview();
    } else {
        document.getElementById("btn-next").style.display = "inline-block";
        document.getElementById("btn-generate").style.display = "none";
    }

    // Render step-specific content
    if (step === 2) renderStep2();
    if (step === 4) renderStep4();
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            if (!state.task_id) {
                alert("Please select a task type.");
                return false;
            }
            return true;
        case 3:
            const desc = document.getElementById("description").value.trim();
            if (desc.length < 10) {
                alert("Please enter at least 10 characters for the task description.");
                return false;
            }
            return true;
        default:
            return true;
    }
}

function collectCurrentStepData() {
    switch (currentStep) {
        case 2:
            const customPersona = document.getElementById("custom-persona-input").value.trim();
            if (customPersona) state.persona = customPersona;
            break;
        case 3:
            state.description = document.getElementById("description").value.trim();
            state.context = document.getElementById("context").value.trim() || null;
            break;
        case 4:
            state.language = document.getElementById("language").value.trim() || "English";
            state.audience = document.getElementById("audience").value || null;
            break;
        case 5:
            // Collect examples
            state.examples = [];
            document.querySelectorAll(".example-pair").forEach(pair => {
                const input = pair.querySelector(".example-input").value.trim();
                const output = pair.querySelector(".example-output").value.trim();
                if (input && output) {
                    state.examples.push({ input, output });
                }
            });
            state.constraints = document.getElementById("constraints").value.trim() || null;
            state.chain_of_thought = document.getElementById("opt-cot").checked;
            state.clarifying_questions = document.getElementById("opt-clarify").checked;
            state.multiple_variations = document.getElementById("opt-variations").checked;
            state.confidence_rating = document.getElementById("opt-confidence").checked;
            if (state.multiple_variations) {
                state.variation_count = parseInt(document.getElementById("variation-count").value) || 3;
            }
            break;
    }
}

// ═══════════════════════════════════════════════════════════════════
// GENERATION
// ═══════════════════════════════════════════════════════════════════

async function generatePrompt() {
    collectCurrentStepData();

    const genSection = document.getElementById("generate-section");
    genSection.style.display = "block";
    genSection.innerHTML = '<p style="text-align:center; color: var(--text-dim);">⚡ Generating prompt...</p>';

    try {
        const resp = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state),
        });

        const data = await resp.json();

        if (data.success) {
            displayResult(data);
        } else {
            genSection.innerHTML = `<p style="color: var(--error);">Error: ${data.error}</p>`;
        }
    } catch (e) {
        // Fallback: generate client-side
        const prompt = assemblePromptClientSide();
        displayResult({
            prompt: prompt,
            score: calculateScoreClientSide(),
            score_label: "Good",
            tips: ["Generated client-side (API unavailable)"],
            char_count: prompt.length,
            word_count: prompt.split(/\s+/).length,
        });
    }
}

function displayResult(data) {
    const genSection = document.getElementById("generate-section");

    // Score
    const scoreColor = data.score >= 86 ? "#22c55e" : data.score >= 71 ? "#22c55e" :
                       data.score >= 51 ? "#eab308" : data.score >= 31 ? "#eab308" : "#ef4444";

    let scoreHTML = `
        <div class="score-display">
            <strong>Prompt Strength: ${data.score}/100 — ${data.score_label}</strong>
            <div class="score-bar">
                <div class="score-bar-fill" style="width: ${data.score}%; background: ${scoreColor};"></div>
            </div>
            <small>${data.char_count} characters • ${data.word_count} words</small>
            <div class="score-tips">
                ${data.tips.map(t => `<p>💡 ${t}</p>`).join("")}
            </div>
        </div>
    `;

    // Prompt output
    let promptHTML = `<div class="prompt-output" id="prompt-text">${escapeHtml(data.prompt)}</div>`;

    // Action buttons
    let actionsHTML = `
        <div class="action-buttons">
            <button class="btn-copy" onclick="copyPrompt()">📋 Copy to Clipboard</button>
            <button onclick="downloadPrompt()">💾 Download as .txt</button>
            <button onclick="resetWizard()">🔄 New Prompt</button>
        </div>
    `;

    genSection.innerHTML = scoreHTML + promptHTML + actionsHTML;

    // Save to localStorage history
    saveToHistory(data.prompt);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function copyPrompt() {
    const text = document.getElementById("prompt-text").textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector(".btn-copy");
        btn.textContent = "✓ Copied!";
        setTimeout(() => { btn.textContent = "📋 Copy to Clipboard"; }, 2000);
    }).catch(() => {
        // Fallback
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        alert("Copied to clipboard!");
    });
}

function downloadPrompt() {
    const text = document.getElementById("prompt-text").textContent;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function resetWizard() {
    Object.keys(state).forEach(key => {
        if (Array.isArray(state[key])) state[key] = [];
        else if (typeof state[key] === "boolean") state[key] = false;
        else if (key === "language") state[key] = "English";
        else if (key === "variation_count") state[key] = 3;
        else state[key] = null;
    });
    currentStep = 1;
    showStep(1);
    document.getElementById("generate-section").style.display = "none";
    document.getElementById("description").value = "";
    document.getElementById("context").value = "";
    document.getElementById("constraints").value = "";
    document.getElementById("examples-container").innerHTML = "";
    exampleCount = 0;
}

function saveToHistory(prompt) {
    try {
        let history = JSON.parse(localStorage.getItem("promptforge_history") || "[]");
        history.push({
            timestamp: new Date().toISOString(),
            task: state.task_name,
            preview: (state.description || "").substring(0, 50),
            prompt: prompt,
        });
        if (history.length > 50) history = history.slice(-50);
        localStorage.setItem("promptforge_history", JSON.stringify(history));
    } catch (e) { /* localStorage not available */ }
}

// Client-side fallback assembly
function assemblePromptClientSide() {
    let parts = [];
    if (state.persona) parts.push(`Act as ${state.persona}.`);
    if (state.description) { parts.push(""); parts.push(state.description); }
    if (state.context) { parts.push(""); parts.push("Here is the context:"); parts.push("---"); parts.push(state.context); parts.push("---"); }
    let config = [];
    if (state.format && state.format !== "Free-form paragraphs") config.push(`Format your response as: ${state.format}.`);
    if (state.length) config.push(`Keep your response ${state.length.toLowerCase()} (${state.length_detail || ""}).`);
    if (state.tones.length) config.push(`Use a ${state.tones.join(", ").toLowerCase()} tone.`);
    if (state.audience) config.push(`Write for: ${state.audience}.`);
    if (state.language && state.language.toLowerCase() !== "english") config.push(`Respond in ${state.language}.`);
    if (config.length) { parts.push(""); parts.push(config.join(" ")); }
    if (state.examples.length) { parts.push(""); parts.push("Examples:"); state.examples.forEach((ex,i) => { parts.push(`\nExample ${i+1}:\nInput: ${ex.input}\nOutput: ${ex.output}`); }); }
    if (state.constraints) { parts.push(""); parts.push("Constraints:"); state.constraints.split("\n").forEach(l => { if(l.trim()) parts.push(`- ${l.trim()}`); }); }
    if (state.chain_of_thought) parts.push("\nThink through this step-by-step.");
    if (state.clarifying_questions) parts.push("\nAsk clarifying questions before answering.");
    if (state.multiple_variations) parts.push(`\nProvide ${state.variation_count} variations.`);
    if (state.confidence_rating) parts.push("\nRate your confidence 1-10.");
    return parts.join("\n").trim();
}

function calculateScoreClientSide() {
    let score = 0;
    if ((state.description||"").length > 10) score += 20;
    if ((state.description||"").length > 150) score += 10;
    if (state.persona) score += 15;
    if (state.format) score += 10;
    if (state.length) score += 5;
    if (state.tones.length) score += 5;
    if (state.examples.length >= 1) score += 20;
    if (state.examples.length >= 2) score += 5;
    if (state.constraints) score += 10;
    if (state.audience) score += 5;
    if (state.chain_of_thought || state.clarifying_questions || state.multiple_variations || state.confidence_rating) score += 5;
    return Math.min(score, 100);
}

// Add real-time score preview (call on step changes)
async function updateScorePreview() {
    try {
        const resp = await fetch("/api/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state),
        });
        const data = await resp.json();
        if (data.success) {
            // Update a mini score badge in the header
            const badge = document.getElementById("score-badge");
            if (badge) {
                badge.textContent = `${data.emoji} ${data.score}/100`;
                badge.style.color = data.color;
            }
        }
    } catch (e) {
        // Silent fail — score preview is optional
    }
}