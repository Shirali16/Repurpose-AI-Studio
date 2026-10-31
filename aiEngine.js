// AI Engine with Resilient Dual Mode: Live Gemini API + Built-in Intelligent Fallback Engine
import { brandStore } from './brandMemory.js';

export class AiEngine {
  constructor() {
    this.brandStore = brandStore;
    // Heuristic feedback weights for hook scoring (updated by performance loops)
    this.retentionWeights = {
      contrarianHook: 1.15,
      first3SecUrgency: 1.20,
      visualContrast: 1.10,
      actionableBlueprint: 1.05
    };
  }

  // --- Core Method: Generate Platform Copy with Brand Memory & Taboo Guardrails ---
  async generatePlatformCopy(clip, platform, personaId) {
    const brand = this.brandStore.getActiveBrand();
    const persona = this.brandStore.getActivePersona(personaId);
    const apiConfig = this.brandStore.apiConfig;

    // Check if live Gemini API is enabled and configured
    if (apiConfig.useLiveGemini && apiConfig.apiKey && apiConfig.apiKey.trim()) {
      try {
        const result = await this.callGeminiAPI(clip, platform, persona, brand, apiConfig.apiKey);
        if (result && result.hook && result.body) {
          // Taboo sanitize the live response to ensure brand compliance
          result.sanitizedHook = this.brandStore.sanitizeText(result.hook);
          result.sanitizedBody = this.brandStore.sanitizeText(result.body);
          result.engineSource = "Gemini Live API (Sanitized by Brand Guardrails)";
          return result;
        }
      } catch (err) {
        console.warn("Live Gemini API call failed, falling back to Built-in Intelligent Engine:", err);
      }
    }

    // High-fidelity fallback / offline engine
    return this.generateOfflineCopy(clip, platform, persona, brand);
  }

  // --- Gemini REST API Call ---
  async callGeminiAPI(clip, platform, persona, brand, apiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

    const prompt = `
You are the Chief Content Officer and Brand Director for "${brand.name}".
Brand Tagline: "${brand.tagline}"

VISUAL & BRAND GUIDELINES:
- Voice Persona: ${persona.name} (${persona.platform})
- Tone Description: ${persona.toneDescription}
- Emoji Policy: ${persona.emojiPolicy}
- Formatting Rules: ${persona.formattingRules}
- Core Directive: ${persona.systemPromptModifier}

STRICT TABOO ANTI-PATTERNS (DO NOT USE UNDER ANY CIRCUMSTANCE):
Banned Words: ${brand.antiPatterns.bannedWords.join(", ")}
Banned Hook Patterns: ${brand.antiPatterns.bannedHookPatterns.join(" | ")}

CLIP INFORMATION:
Title: "${clip.title}"
Duration: ${clip.duration}
Retention Thesis: ${clip.retentionThesis}
Transcript excerpt:
"${clip.transcriptWords.map(w => w.word).join(" ")}"

TASK:
Write an optimized post for ${platform.toUpperCase()} using the "${persona.name}" persona.
Adhere strictly to all brand voice rules and NEVER use any of the banned words or anti-pattern hooks.

Respond with ONLY valid JSON with no markdown wrapping:
{
  "hook": "string (the punchy opening line)",
  "body": "string (the main body content)",
  "cta": "string (call to action)",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}
`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error("Empty candidate from Gemini");

    const parsed = JSON.parse(candidate);
    parsed.characterCount = (parsed.hook.length + parsed.body.length + parsed.cta.length);
    return parsed;
  }

  // --- Built-in Heuristic Intelligent Engine (Zero Network / Zero Crash) ---
  generateOfflineCopy(clip, platform, persona, brand) {
    const fullTranscript = clip.transcriptWords.map(w => w.word).join(" ");
    let hook = "";
    let body = "";
    let cta = "";
    let hashtags = [];

    // Base topic extraction
    const isAiStartup = fullTranscript.toLowerCase().includes("startup") || fullTranscript.toLowerCase().includes("wrapper");
    const isContextMemory = fullTranscript.toLowerCase().includes("context") || fullTranscript.toLowerCase().includes("ram");
    const isVisual = fullTranscript.toLowerCase().includes("visual") || fullTranscript.toLowerCase().includes("frame");

    if (platform === "tiktok" || platform === "reels" || platform === "shorts") {
      if (persona.id === "persona-b2b") {
        hook = `The #1 architectural reason 90% of automated systems break at scale:`;
        body = `If your content workflow relies on stateless prompts, you have zero compounding value.\n\nHere is how to wire an autonomous Brand Memory layer in under 60 seconds.`;
        cta = `Save this breakdown for your next sprint.`;
      } else {
        hook = isAiStartup 
          ? `Stop building prompt wrappers! Here is what actually survives in 2026 🛑` 
          : isContextMemory 
          ? `Why 2 Million Token Context Windows are a trap! 🧠` 
          : `The 3-second frame rule that fixes 0-view clips ⚡`;
        body = `Most creators think they need more views. What you actually need is retention architecture.\n\nWhen you cut clips, preserve the high-tension thesis: "${clip.title}".`;
        cta = `Hit follow to level up your retention game.`;
      }
      hashtags = ["#CreatorTips", "#ShortFormVideo", "#TechStrategy", "#ViralHooks"];
    } 
    else if (platform === "linkedin") {
      hook = `Most content repurposing tools treat your brand like an afterthought. Here is the operational fix:`;
      body = `We analyzed why generic AI clips fail on executive feeds:\n\n1. Lack of persistent memory: Every generation forgets past edits.\n2. Zero negative constraints: Over-indexed on clichés and empty hype.\n3. Flat cadence: Ignoring platform-specific reading velocity.\n\nBy anchoring generation to "${brand.name}'s" active memory profile, we enforce voice consistency across every vertical crop.`;
      cta = `How does your team ensure AI output adheres to your brand guidelines?`;
      hashtags = ["#BrandStrategy", "#ContentOperations", "#AIArchitecture", "#EnterpriseOps"];
    } 
    else if (platform === "twitter") {
      hook = isAiStartup 
        ? `99% of AI wrappers are commoditized by default. Here is the only defensible layer:` 
        : `Context windows are temporary RAM. Brand memory is permanent storage.`;
      body = `If your repurposing workflow does not learn from creator rejections, you are perpetually stuck in prompt iterations.\n\n3 principles we enforce:\n• Real-time taboo word filtration\n• Multi-persona tone adaptation\n• Dynamic 9:16 kinetic subtitle rendering`;
      cta = `RT if you believe stateful memory is the future 🧵`;
      hashtags = ["#BuildInPublic", "#AIStrategy", "#MediaOps"];
    } 
    else { // Newsletter / Substack
      hook = `Weekly Teardown: Autonomous Content Repurposing with Stateful Brand Memory`;
      body = `In today's edition, we deconstruct clip "${clip.title}". We explore why human editorial feedback should be treated as high-signal gradient updates rather than operational bottlenecks.\n\nKey takeaway: When you codify taboos and visual identities into persistent memory, you eliminate 80% of repetitive editorial friction.`;
      cta = `Read the full technical case study on our archive.`;
      hashtags = ["#EditorialInsights", "#ContentTech"];
    }

    // Apply strict brand taboo sanitize pass
    const sanitizedHook = this.brandStore.sanitizeText(hook);
    const sanitizedBody = this.brandStore.sanitizeText(body);
    const sanitizedCta = this.brandStore.sanitizeText(cta);

    return {
      hook: sanitizedHook,
      body: sanitizedBody,
      cta: sanitizedCta,
      hashtags,
      characterCount: sanitizedHook.length + sanitizedBody.length + sanitizedCta.length,
      engineSource: "Built-in Resilient Intelligent Engine (100% Offline Ready)"
    };
  }

  // --- Dynamic Hook Scoring & Ingestion Analysis ---
  analyzeIngestedTranscript(transcriptText, videoTitle) {
    // Generate intelligent viral moments based on text sentiment and urgency markers
    const sentences = transcriptText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    const moments = [];

    // Detect high-energy sentences
    sentences.forEach((sentence, idx) => {
      let score = 75;
      let hookType = "Informational";
      let retentionThesis = "Standard explanatory segment with steady pacing.";

      const lower = sentence.toLowerCase();
      if (lower.includes("truth") || lower.includes("nobody") || lower.includes("brutal") || lower.includes("mistake")) {
        score = Math.floor(88 * this.retentionWeights.contrarianHook);
        hookType = "Contrarian Tension";
        retentionThesis = "High immediate curiosity due to contradiction or industry critique.";
      } else if (lower.includes("secret") || lower.includes("rule") || lower.includes("framework")) {
        score = Math.floor(85 * this.retentionWeights.actionableBlueprint);
        hookType = "Actionable Blueprint";
        retentionThesis = "Promises clear utility; high bookmark rate predicted.";
      } else if (lower.includes("stop") || lower.includes("why") || lower.includes("never")) {
        score = Math.floor(86 * this.retentionWeights.first3SecUrgency);
        hookType = "Pattern Interrupt";
        retentionThesis = "Strong front-loaded hook halts feed scrolling within 1.5 seconds.";
      }

      // Bound score between 70 and 98
      score = Math.min(98, Math.max(70, score));

      if (score >= 82 && moments.length < 3) {
        const startSec = idx * 15;
        const endSec = startSec + 30;
        moments.push({
          id: `clip-auto-${Date.now()}-${idx}`,
          title: sentence.slice(0, 45) + "...",
          startTime: startSec,
          endTime: endSec,
          duration: `${endSec - startSec}s`,
          viralityScore: score,
          viralityLabel: score > 90 ? "Viral Outlier" : "High Engagement",
          hookType,
          retentionThesis,
          tags: ["Auto-Detected", "Hook-Optimized"],
          reviewStatus: "draft",
          reviewerNotes: "Automatically generated by AI Hook Engine. Ready for editorial review.",
          transcriptWords: sentence.split(/\s+/).map((word, wIdx) => ({
            word,
            start: startSec + (wIdx * 0.4),
            end: startSec + ((wIdx + 1) * 0.4)
          })),
          storyboard: [
            { time: "00:00", description: `Dynamic zoom on opening punchline: "${sentence.slice(0, 30)}..."` },
            { time: "00:15", description: "Kinetic subtitle highlight with primary brand accent" }
          ]
        });
      }
    });

    return moments;
  }

  // --- Performance Feedback Loop: Recalibrate Scoring based on past analytics ---
  ingestPerformanceMetrics(clipId, metrics) {
    // metrics: { views: number, retentionRate: number, ctr: number, shares: number }
    const brand = this.brandStore.getActiveBrand();

    // If retention rate was exceptionally high (>70%), boost contrarian and urgency weights
    if (metrics.retentionRate > 70) {
      this.retentionWeights.contrarianHook = Math.min(1.35, this.retentionWeights.contrarianHook + 0.05);
      this.retentionWeights.first3SecUrgency = Math.min(1.40, this.retentionWeights.first3SecUrgency + 0.05);
    }

    // Add note to brand learned rules
    const feedbackRecord = {
      id: `feedback-${Date.now()}`,
      timestamp: "Just now",
      originalText: `Clip "${clipId}" Analytics: ${metrics.views.toLocaleString()} views, ${metrics.retentionRate}% retention`,
      editedText: `Performance Feedback Loop: Hook weights calibrated +5% for high-tension hooks`,
      derivedRule: `System learned: Audiences favored contrarian pattern interrupts with ${metrics.ctr}% CTR. Auto-upweighting future hook selection.`,
      status: "Active in Memory"
    };

    brand.learnedEdits.unshift(feedbackRecord);
    this.brandStore.saveProfiles();

    return {
      success: true,
      updatedWeights: this.retentionWeights,
      feedbackRecord
    };
  }
}

export const aiEngine = new AiEngine();
