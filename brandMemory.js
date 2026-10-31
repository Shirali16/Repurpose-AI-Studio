// Brand Memory & Style Guide Enforcer Store (with LocalStorage persistence)
import { DEFAULT_BRAND_PROFILES, SCHEDULED_CALENDAR_ITEMS } from './data.js';

const STORAGE_KEY_PROFILES = 'repurpose_ai_brand_profiles_v1';
const STORAGE_KEY_ACTIVE_BRAND = 'repurpose_ai_active_brand_id_v1';
const STORAGE_KEY_CALENDAR = 'repurpose_ai_calendar_items_v1';
const STORAGE_KEY_API_CONFIG = 'repurpose_ai_api_config_v1';
const STORAGE_KEY_THEME = 'repurpose_ai_theme_v1';

// Safe storage helper (works in browser, incognito, and Node environments)
const safeStorage = {
  get(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {
      // Ignored
    }
    return null;
  },
  set(key, value) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Ignored
    }
  },
  remove(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      // Ignored
    }
  }
};

export class BrandMemoryStore {
  constructor() {
    this.profiles = this.loadProfiles();
    this.activeBrandId = safeStorage.get(STORAGE_KEY_ACTIVE_BRAND) || (this.profiles[0] ? this.profiles[0].id : 'brand-nexus');
    this.calendarItems = this.loadCalendar();
    this.apiConfig = this.loadApiConfig();
    this.currentTheme = safeStorage.get(STORAGE_KEY_THEME) || 'pastel-pop';
    this.listeners = new Set();
  }

  setTheme(theme) {
    this.currentTheme = theme;
    safeStorage.set(STORAGE_KEY_THEME, theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    this.notify();
  }

  loadProfiles() {
    try {
      const saved = safeStorage.get(STORAGE_KEY_PROFILES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load stored brand profiles, falling back to defaults", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_BRAND_PROFILES));
  }

  saveProfiles() {
    try {
      safeStorage.set(STORAGE_KEY_PROFILES, JSON.stringify(this.profiles));
      this.notify();
    } catch (e) {
      console.error("Failed to save profiles", e);
    }
  }

  loadCalendar() {
    try {
      const saved = safeStorage.get(STORAGE_KEY_CALENDAR);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load stored calendar items", e);
    }
    return JSON.parse(JSON.stringify(SCHEDULED_CALENDAR_ITEMS));
  }

  saveCalendar() {
    try {
      safeStorage.set(STORAGE_KEY_CALENDAR, JSON.stringify(this.calendarItems));
      this.notify();
    } catch (e) {
      console.error("Failed to save calendar items", e);
    }
  }

  loadApiConfig() {
    try {
      const saved = safeStorage.get(STORAGE_KEY_API_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load api config", e);
    }
    return {
      apiKey: "",
      useLiveGemini: false,
      model: "gemini-1.5-flash",
      webhookUrl: "https://api.repurpose-ai.internal/v1/publish/webhook"
    };
  }

  saveApiConfig(config) {
    this.apiConfig = { ...this.apiConfig, ...config };
    try {
      safeStorage.set(STORAGE_KEY_API_CONFIG, JSON.stringify(this.apiConfig));
      this.notify();
    } catch (e) {
      console.error("Failed to save API config", e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }

  getActiveBrand() {
    return this.profiles.find(b => b.id === this.activeBrandId) || this.profiles[0];
  }

  setActiveBrand(brandId) {
    this.activeBrandId = brandId;
    safeStorage.set(STORAGE_KEY_ACTIVE_BRAND, brandId);
    this.notify();
  }

  updateVisualGuide(updates) {
    const brand = this.getActiveBrand();
    brand.visualGuide = { ...brand.visualGuide, ...updates };
    this.saveProfiles();
  }

  // --- Anti-Pattern & Taboo Memory Operations ---
  addBannedWord(word) {
    if (!word || !word.trim()) return;
    const clean = word.trim().toLowerCase();
    const brand = this.getActiveBrand();
    if (!brand.antiPatterns.bannedWords.includes(clean)) {
      brand.antiPatterns.bannedWords.push(clean);
      this.saveProfiles();
    }
  }

  removeBannedWord(word) {
    const brand = this.getActiveBrand();
    brand.antiPatterns.bannedWords = brand.antiPatterns.bannedWords.filter(w => w !== word.toLowerCase());
    this.saveProfiles();
  }

  addBannedHook(pattern) {
    if (!pattern || !pattern.trim()) return;
    const brand = this.getActiveBrand();
    if (!brand.antiPatterns.bannedHookPatterns.includes(pattern.trim())) {
      brand.antiPatterns.bannedHookPatterns.push(pattern.trim());
      this.saveProfiles();
    }
  }

  removeBannedHook(pattern) {
    const brand = this.getActiveBrand();
    brand.antiPatterns.bannedHookPatterns = brand.antiPatterns.bannedHookPatterns.filter(p => p !== pattern);
    this.saveProfiles();
  }

  scanForTaboos(text) {
    if (!text) return { hasViolations: false, violations: [] };
    const brand = this.getActiveBrand();
    const lower = text.toLowerCase();
    const violations = [];

    // Check banned words
    brand.antiPatterns.bannedWords.forEach(banned => {
      // Regex boundary check
      const regex = new RegExp(`\\b${banned.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        violations.push({
          type: 'banned_word',
          pattern: banned,
          reason: `Violates brand taboo: "${banned}" is banned.`
        });
      }
    });

    // Check banned hook patterns
    brand.antiPatterns.bannedHookPatterns.forEach(banned => {
      if (lower.includes(banned.toLowerCase())) {
        violations.push({
          type: 'banned_hook',
          pattern: banned,
          reason: `Violates hook policy: "${banned}" is an anti-pattern.`
        });
      }
    });

    return {
      hasViolations: violations.length > 0,
      violations
    };
  }

  sanitizeText(text) {
    if (!text) return text;
    let sanitized = text;
    const brand = this.getActiveBrand();

    // Map common banned words to cleaner alternatives
    const cleanReplacements = {
      'delve': 'explore',
      'game-changer': 'significant advancement',
      'synergy': 'cohesion',
      'revolutionize': 'modernize',
      'unprecedented': 'rare',
      'mind-blowing': 'compelling',
      'paradigm shift': 'fundamental shift',
      'in this fast-paced world': 'in modern operations',
      'hack': 'framework',
      'guru': 'specialist',
      'secret trick': 'proven method',
      'skyrocket': 'grow substantially'
    };

    brand.antiPatterns.bannedWords.forEach(banned => {
      const replacement = cleanReplacements[banned.toLowerCase()] || '[refined]';
      const regex = new RegExp(`\\b${banned}\\b`, 'gi');
      sanitized = sanitized.replace(regex, replacement);
    });

    brand.antiPatterns.bannedHookPatterns.forEach(pattern => {
      sanitized = sanitized.split(pattern).join('');
    });

    brand.antiPatterns.totalViolationsPrevented += 1;
    this.saveProfiles();
    return sanitized.trim();
  }

  // --- Dynamic Personas ---
  getActivePersona(personaId) {
    const brand = this.getActiveBrand();
    if (personaId) {
      const found = brand.personas.find(p => p.id === personaId);
      if (found) return found;
    }
    return brand.personas[0];
  }

  updatePersona(personaId, updates) {
    const brand = this.getActiveBrand();
    const idx = brand.personas.findIndex(p => p.id === personaId);
    if (idx !== -1) {
      brand.personas[idx] = { ...brand.personas[idx], ...updates };
      this.saveProfiles();
    }
  }

  // --- Creator Edit Learning Flywheel ---
  learnFromEdit(originalText, editedText, platform, personaName) {
    if (!originalText || !editedText || originalText === editedText) return null;

    const brand = this.getActiveBrand();
    const originalWords = originalText.toLowerCase().split(/\s+/);
    const editedWords = editedText.toLowerCase().split(/\s+/);

    // Identify deleted words (candidates for negative constraints)
    const deletedWords = originalWords.filter(w => !editedWords.includes(w) && w.length > 3);
    const addedWords = editedWords.filter(w => !originalWords.includes(w) && w.length > 3);

    let derivedRule = `Creator edited ${platform} copy (${personaName}).`;

    if (deletedWords.length > 0) {
      const sampleBanned = deletedWords.slice(0, 2).join('", "');
      derivedRule = `Eliminated generic phrasing ("${sampleBanned}"). Creator prefers tighter, direct phrasing.`;
      
      // Auto-suggest or add top deleted word to taboo if not already there
      const candidate = deletedWords[0].replace(/[^a-z0-9_-]/gi, '');
      if (candidate.length > 4 && !brand.antiPatterns.bannedWords.includes(candidate)) {
        brand.antiPatterns.bannedWords.push(candidate);
      }
    } else if (addedWords.length > 0) {
      derivedRule = `Enhanced specificity with keywords: "${addedWords.slice(0, 3).join(', ')}".`;
    }

    const newEditRecord = {
      id: `edit-${Date.now()}`,
      timestamp: "Just now",
      originalText: originalText.slice(0, 100) + (originalText.length > 100 ? "..." : ""),
      editedText: editedText.slice(0, 100) + (editedText.length > 100 ? "..." : ""),
      derivedRule,
      status: "Active in Memory"
    };

    brand.learnedEdits.unshift(newEditRecord);
    // Keep max 15 records
    if (brand.learnedEdits.length > 15) {
      brand.learnedEdits.pop();
    }

    this.saveProfiles();
    return newEditRecord;
  }

  // --- Publishing Calendar & Direct Webhook ---
  addCalendarItem(item) {
    const newItem = {
      id: `cal-${Date.now()}`,
      scheduledTime: item.scheduledTime || "Tomorrow, 10:00 AM",
      status: item.status || "scheduled",
      ...item
    };
    this.calendarItems.unshift(newItem);
    this.saveCalendar();
    return newItem;
  }

  updateCalendarStatus(id, newStatus) {
    const item = this.calendarItems.find(c => c.id === id);
    if (item) {
      item.status = newStatus;
      this.saveCalendar();
    }
  }

  deleteCalendarItem(id) {
    this.calendarItems = this.calendarItems.filter(c => c.id !== id);
    this.saveCalendar();
  }

  resetToDefaults() {
    this.profiles = JSON.parse(JSON.stringify(DEFAULT_BRAND_PROFILES));
    this.activeBrandId = this.profiles[0].id;
    this.calendarItems = JSON.parse(JSON.stringify(SCHEDULED_CALENDAR_ITEMS));
    safeStorage.remove(STORAGE_KEY_PROFILES);
    safeStorage.remove(STORAGE_KEY_ACTIVE_BRAND);
    safeStorage.remove(STORAGE_KEY_CALENDAR);
    this.notify();
  }
}

export const brandStore = new BrandMemoryStore();
