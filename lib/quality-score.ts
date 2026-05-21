export interface QualityResult {
    score: number;
    label: string;
    tips: string[];
  }
  
  export function calculateQualityScore(
    promptText: string,
    hasContext: boolean,
    hasFollowUps: boolean
  ): QualityResult {
    let score = 0;
    const tips: string[] = [];
    const pl = promptText.toLowerCase();
    const plen = promptText.length;
  
    // Length and detail (max 25)
    if (plen > 500) score += 25;
    else if (plen > 200) score += 15;
    else if (plen > 100) score += 10;
    else score += 5;
  
    // Role/persona (15)
    if (["act as", "you are", "as a", "role of"].some((p) => pl.includes(p))) {
      score += 15;
    } else {
      tips.push("Adding a role/persona often improves output quality");
    }
  
    // Output format (15)
    if (["format", "structure", "output", "provide as", "respond"].some((p) => pl.includes(p))) {
      score += 15;
    } else {
      tips.push("Specifying output format ensures consistent results");
    }
  
    // Constraints (10)
    if (["do not", "avoid", "must", "don't", "constraint", "rule"].some((p) => pl.includes(p))) {
      score += 10;
    } else {
      tips.push("Adding constraints reduces unwanted content");
    }
  
    // Structure (10)
    if (["1.", "2.", "•", "- "].some((c) => promptText.includes(c)) || promptText.split("\n").length > 5) {
      score += 10;
    }
  
    // Context provided (10)
    if (hasContext) score += 10;
  
    // Follow-ups enriched (10)
    if (hasFollowUps) {
      score += 10;
    } else {
      tips.push("Providing more context via follow-ups improves specificity");
    }
  
    // Audience/tone (5)
    if (["audience", "tone", "style", "reader", "level"].some((p) => pl.includes(p))) {
      score += 5;
    }
  
    score = Math.min(score, 100);
  
    let label: string;
    if (score >= 86) label = "Excellent";
    else if (score >= 71) label = "Strong";
    else if (score >= 51) label = "Good";
    else if (score >= 31) label = "Fair";
    else label = "Weak";
  
    return { score, label, tips: tips.slice(0, 2) };
  }