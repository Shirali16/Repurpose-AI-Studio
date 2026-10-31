// Repurpose AI Studio - Master Controller (Pastel Pop & Tabbed Mobile Navigation Edition)
import { DEMO_SOURCES } from './data.js';
import { brandStore } from './brandMemory.js';
import { aiEngine } from './aiEngine.js';
import { VideoPlayerController } from './videoPlayer.js';
import { StoryboardController } from './storyboard.js';

class StudioApp {
  constructor() {
    this.currentSource = DEMO_SOURCES[0];
    this.currentClip = this.currentSource.clips[0];
    this.activePlatform = 'tiktok'; // tiktok, linkedin, twitter, newsletter
    this.activePersonaId = brandStore.getActiveBrand().personas[0].id;
    this.originalCopyCache = {};

    this.initDOMElements();
    this.initControllers();
    this.bindEvents();
    this.applyTheme(brandStore.currentTheme);
    this.renderAll();
  }

  initDOMElements() {
    // Navigation & Tabs
    this.navTabButtons = document.querySelectorAll('.nav-tab-btn, .mobile-nav-item');
    this.tabViews = document.querySelectorAll('.tab-view');
    this.themeSelector = document.getElementById('themeSelector');
    this.brandSelector = document.getElementById('brandSelector');
    this.btnIngestNew = document.getElementById('btnIngestNew');

    // Video Player & Stage Elements
    this.videoEl = document.getElementById('stageVideo');
    this.stageContainer = document.getElementById('videoStageContainer');
    this.subtitleEl = document.getElementById('subtitleOverlay');
    this.watermarkEl = document.getElementById('watermarkBadge');
    this.btnPlayPause = document.getElementById('btnPlayPause');
    this.btnToggleVoice = document.getElementById('btnToggleVoice');
    this.voiceStatusText = document.getElementById('voiceStatusText');
    this.timelineSlider = document.getElementById('timelineSlider');
    this.timeReadout = document.getElementById('timeReadout');
    this.clipStatusBadge = document.getElementById('clipStatusBadge');
    this.aspectButtons = document.querySelectorAll('.aspect-btn');
    this.btnTestSound = document.getElementById('btnTestSound');
    this.btnMuteToggle = document.getElementById('btnMuteToggle');
    this.volumeSlider = document.getElementById('volumeSlider');

    // Studio Transcript & Copy Panels
    this.transcriptContainer = document.getElementById('transcriptContainer');
    this.platformTabs = document.querySelectorAll('.platform-tab');
    this.personaSelect = document.getElementById('personaSelect');
    this.inputHook = document.getElementById('inputHook');
    this.textareaBody = document.getElementById('textareaBody');
    this.inputCta = document.getElementById('inputCta');
    this.inputHashtags = document.getElementById('inputHashtags');
    this.tabooBox = document.getElementById('tabooBox');
    this.tabooPills = document.getElementById('tabooPills');
    this.tabooTitle = document.getElementById('tabooTitle');
    this.btnSanitize = document.getElementById('btnSanitize');
    this.btnLearnEdits = document.getElementById('btnLearnEdits');
    this.btnRegenerate = document.getElementById('btnRegenerate');
    this.btnPublishNow = document.getElementById('btnPublishNow');
    this.btnSchedulePost = document.getElementById('btnSchedulePost');

    // Tab 2: Clips & Storyboard
    this.clipListContainer = document.getElementById('clipList');
    this.storyboardContainer = document.getElementById('storyboardContainer');
    this.storyboardClipTitle = document.getElementById('storyboardClipTitle');
    this.storyboardThesis = document.getElementById('storyboardThesis');
    this.btnPlayFromClipsTab = document.getElementById('btnPlayFromClipsTab');

    // Tab 3: Brand Memory & Taboos
    this.brandPrimaryColor = document.getElementById('brandPrimaryColor');
    this.brandSecondaryColor = document.getElementById('brandSecondaryColor');
    this.brandAccentColor = document.getElementById('brandAccentColor');
    this.brandLogoText = document.getElementById('brandLogoText');
    this.brandLogoPlacement = document.getElementById('brandLogoPlacement');
    this.brandLogoOpacity = document.getElementById('brandLogoOpacity');
    this.brandSubtitleStyle = document.getElementById('brandSubtitleStyle');
    this.btnSaveBrandGuide = document.getElementById('btnSaveBrandGuide');
    this.bannedWordsList = document.getElementById('bannedWordsList');
    this.newTabooInput = document.getElementById('newTabooInput');
    this.btnAddTabooWord = document.getElementById('btnAddTabooWord');
    this.learnedEditsList = document.getElementById('learnedEditsList');

    // Tab 4: Calendar
    this.calendarItemsList = document.getElementById('calendarItemsList');

    // Tab 5: Settings & Lab
    this.perfViews = document.getElementById('perfViews');
    this.perfRetention = document.getElementById('perfRetention');
    this.btnRunPerformanceFeedback = document.getElementById('btnRunPerformanceFeedback');
    this.btnResetDefaults = document.getElementById('btnResetDefaults');
    this.settingApiKey = document.getElementById('settingApiKey');

    // Ingestion Modal & File Dropzone
    this.modalIngest = document.getElementById('modalIngest');
    this.dropzoneContainer = document.getElementById('dropzoneContainer');
    this.mediaFileInput = document.getElementById('mediaFileInput');
    this.btnBrowseFile = document.getElementById('btnBrowseFile');
    this.demoSourceSelector = document.getElementById('demoSourceSelector');
    this.btnLoadDemoSource = document.getElementById('btnLoadDemoSource');
  }

  initControllers() {
    this.player = new VideoPlayerController(
      this.videoEl,
      this.stageContainer,
      this.subtitleEl,
      this.watermarkEl
    );

    this.player.onTimeUpdateCallback = (currentTime) => {
      this.updateTimelineUI(currentTime);
      this.storyboard.updateWordHighlights(currentTime);
    };

    this.player.onClipEndCallback = () => {
      this.btnPlayPause.innerHTML = '▶ Play Clip';
    };

    this.storyboard = new StoryboardController(
      this.transcriptContainer,
      this.storyboardContainer,
      (seekTime) => this.player.seekTo(seekTime),
      (start, end) => {}
    );
  }

  bindEvents() {
    // Navigation Tabs (Desktop & Mobile)
    this.navTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.dataset.tab;
        this.switchTab(targetTabId);
      });
    });

    // Theme Switcher
    if (this.themeSelector) {
      this.themeSelector.value = brandStore.currentTheme;
      this.themeSelector.addEventListener('change', (e) => {
        this.applyTheme(e.target.value);
      });
    }

    // Brand Switcher
    this.brandSelector.addEventListener('change', (e) => {
      brandStore.setActiveBrand(e.target.value);
      this.activePersonaId = brandStore.getActiveBrand().personas[0].id;
      this.populatePersonaDropdown();
      this.populateBrandTabValues();
      this.loadClipData(this.currentClip);
      this.player.applyBrandVisuals();
      this.showToast(`Switched brand to ${brandStore.getActiveBrand().name}`);
    });

    // Video Controls
    this.btnPlayPause.addEventListener('click', () => {
      this.player.togglePlay();
      this.btnPlayPause.innerHTML = this.player.isPlaying ? '⏸ Pause' : '▶ Play Clip';
    });

    // Voice Speech Toggle
    this.btnToggleVoice.addEventListener('click', () => {
      const isVoiceOn = this.player.toggleVoice();
      this.voiceStatusText.innerText = isVoiceOn ? 'ON' : 'OFF';
      this.btnToggleVoice.className = `voice-speech-toggle ${isVoiceOn ? 'active' : ''}`;
      this.showToast(isVoiceOn ? '🔊 Real Voice Speech Synthesis: ON' : '🔇 Voice Audio: Muted');
    });

    // Test Sound Button (Guaranteed Audio Verification)
    if (this.btnTestSound) {
      this.btnTestSound.addEventListener('click', () => {
        this.player.testAudioFeedback();
        this.showToast('🔔 Testing sound: Playing audio chime and voice check!');
      });
    }

    // Volume Slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        this.player.setVolume(val);
        this.btnMuteToggle.innerText = val === 0 ? '🔇' : (val < 0.5 ? '🔉' : '🔊');
      });
    }

    // Mute Toggle Button
    if (this.btnMuteToggle) {
      this.btnMuteToggle.addEventListener('click', () => {
        if (this.player.volume > 0) {
          this.previousVolume = this.player.volume;
          this.player.setVolume(0);
          this.volumeSlider.value = 0;
          this.btnMuteToggle.innerText = '🔇';
          this.showToast('🔇 Audio muted');
        } else {
          const restore = this.previousVolume || 1.0;
          this.player.setVolume(restore);
          this.volumeSlider.value = Math.round(restore * 100);
          this.btnMuteToggle.innerText = '🔊';
          this.player.playChime(523.25, 0.15);
          this.showToast('🔊 Audio unmuted at 100%');
        }
      });
    }

    this.timelineSlider.addEventListener('input', (e) => {
      const targetTime = parseFloat(e.target.value);
      this.player.seekTo(targetTime);
    });

    // Aspect Ratio Buttons
    this.aspectButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.aspectButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.player.setAspectRatio(btn.dataset.ratio);
      });
    });

    // Platform Tabs
    this.platformTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.platformTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activePlatform = tab.dataset.platform;
        this.loadPlatformCopy(this.currentClip, this.activePlatform);
      });
    });

    // Persona Selector
    this.personaSelect.addEventListener('change', (e) => {
      this.activePersonaId = e.target.value;
      this.regeneratePlatformCopy();
    });

    // Real-Time Taboo Scanning
    const scanHandler = () => this.checkTabooViolations();
    this.inputHook.addEventListener('input', scanHandler);
    this.textareaBody.addEventListener('input', scanHandler);

    // Auto-Sanitize Taboos
    this.btnSanitize.addEventListener('click', () => {
      this.inputHook.value = brandStore.sanitizeText(this.inputHook.value);
      this.textareaBody.value = brandStore.sanitizeText(this.textareaBody.value);
      this.checkTabooViolations();
      this.showToast('🌸 Auto-sanitized: Taboo buzzwords cleaned with brand-approved phrasing');
    });

    // Learn From My Edits
    this.btnLearnEdits.addEventListener('click', () => {
      const currentFullText = `${this.inputHook.value}\n${this.textareaBody.value}`;
      const originalFullText = this.originalCopyCache[this.activePlatform] || '';
      const persona = brandStore.getActivePersona(this.activePersonaId);

      const record = brandStore.learnFromEdit(
        originalFullText,
        currentFullText,
        this.activePlatform,
        persona.name
      );

      if (record) {
        this.showToast(`🧠 Brand Memory Codified: ${record.derivedRule}`);
        this.renderLearnedEditsList();
      } else {
        this.showToast('ℹ️ Make an edit to the copy first to train Brand Memory');
      }
    });

    // Regenerate
    this.btnRegenerate.addEventListener('click', () => this.regeneratePlatformCopy());

    // 1-Click Publishing & Scheduling
    this.btnPublishNow.addEventListener('click', () => this.handleDirectPublish());
    this.btnSchedulePost.addEventListener('click', () => this.handleSchedulePost());

    // Jump from Clips Tab to Studio Tab
    this.btnPlayFromClipsTab.addEventListener('click', () => {
      this.switchTab('tab-studio');
      this.player.togglePlay();
      this.btnPlayPause.innerHTML = this.player.isPlaying ? '⏸ Pause' : '▶ Play Clip';
    });

    // Brand Tab Save
    this.btnSaveBrandGuide.addEventListener('click', () => {
      brandStore.updateVisualGuide({
        primaryColor: this.brandPrimaryColor.value,
        secondaryColor: this.brandSecondaryColor.value,
        accentColor: this.brandAccentColor.value,
        logoText: this.brandLogoText.value,
        logoPlacement: this.brandLogoPlacement.value,
        logoOpacity: parseInt(this.brandLogoOpacity.value),
        subtitleStyle: this.brandSubtitleStyle.value
      });
      this.player.applyBrandVisuals();
      this.showToast('🎨 Brand Visual Identity Updated!');
    });

    // Add Taboo Word
    this.btnAddTabooWord.addEventListener('click', () => {
      if (this.newTabooInput.value.trim()) {
        brandStore.addBannedWord(this.newTabooInput.value.trim());
        this.newTabooInput.value = '';
        this.renderBannedWordsList();
        this.checkTabooViolations();
        this.showToast('🚫 Added new negative constraint taboo');
      }
    });

    // Settings Feedback Recalibration
    this.btnRunPerformanceFeedback.addEventListener('click', () => {
      const views = parseInt(this.perfViews.value) || 125000;
      const retention = parseInt(this.perfRetention.value) || 84;
      aiEngine.ingestPerformanceMetrics(this.currentClip.id, {
        views,
        retentionRate: retention,
        ctr: 7.2,
        shares: Math.floor(views * 0.04)
      });
      this.renderLearnedEditsList();
      this.showToast('📈 Performance Ingested: Hook scoring weights boosted by +5%!');
    });

    // Team Approval Status buttons
    document.querySelectorAll('.btn-set-status').forEach(btn => {
      btn.addEventListener('click', () => {
        const newStatus = btn.dataset.status;
        this.currentClip.reviewStatus = newStatus;
        this.updateStatusBadge(newStatus);
        this.showToast(`Team review status set to: ${newStatus.toUpperCase()}`);
      });
    });

    // Reset Defaults
    this.btnResetDefaults.addEventListener('click', () => {
      if (confirm('Reset brand memory and demo data to factory defaults?')) {
        brandStore.resetToDefaults();
        this.renderAll();
        this.showToast('🔄 Reset to default data successfully.');
      }
    });

    // Ingest Modal & Drag-and-Drop File Upload
    this.btnIngestNew.addEventListener('click', () => {
      this.populateIngestModal();
      this.modalIngest.classList.add('active');
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        this.modalIngest.classList.remove('active');
      });
    });

    // File Dropzone Wiring
    this.btnBrowseFile.addEventListener('click', () => this.mediaFileInput.click());
    this.mediaFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleUploadedMediaFile(e.target.files[0]);
      }
    });

    this.dropzoneContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzoneContainer.classList.add('dragover');
    });

    this.dropzoneContainer.addEventListener('dragleave', () => {
      this.dropzoneContainer.classList.remove('dragover');
    });

    this.dropzoneContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzoneContainer.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleUploadedMediaFile(e.dataTransfer.files[0]);
      }
    });

    this.btnLoadDemoSource.addEventListener('click', () => {
      const selectedId = this.demoSourceSelector.value;
      const found = DEMO_SOURCES.find(s => s.id === selectedId);
      if (found) {
        this.currentSource = found;
        this.currentClip = found.clips[0];
        this.renderClipsList();
        this.selectClip(this.currentClip);
        this.modalIngest.classList.remove('active');
        this.showToast(`📥 Loaded masterclass: "${found.title}"`);
      }
    });
  }

  handleUploadedMediaFile(file) {
    const fileUrl = URL.createObjectURL(file);
    const fileName = file.name.replace(/\.[^/.]+$/, "");

    // Create a new source from the uploaded file
    const newSource = {
      id: `custom-src-${Date.now()}`,
      title: fileName,
      speaker: "Creator Upload",
      duration: "02:30",
      category: "Custom Media",
      videoUrl: fileUrl,
      clips: [
        {
          id: `custom-clip-${Date.now()}`,
          title: `Viral Hook: ${fileName.slice(0, 35)}`,
          startTime: 0,
          endTime: 30,
          duration: "30s",
          viralityScore: 92,
          viralityLabel: "Viral Outlier",
          hookType: "Pattern Interrupt",
          retentionThesis: "Immediate high contrast opening from creator upload. High retention predicted.",
          reviewStatus: "draft",
          reviewerNotes: "Uploaded file ready for multi-platform distribution.",
          transcriptWords: "Here is the breakthrough method that changed our entire content workflow. Watch what happens when you build permanent brand memory instead of starting over every time.".split(/\s+/).map((word, idx) => ({
            word,
            start: idx * 0.45,
            end: (idx + 1) * 0.45
          })),
          storyboard: [
            { time: "00:00", description: `Dynamic intro: "${fileName.slice(0, 25)}..."` },
            { time: "00:12", description: "Brand watermark overlay & kinetic caption transition" }
          ],
          copyVariants: {
            tiktok: {
              hook: `Stop doing this manually! Here is the fix ⚡`,
              body: `We just uploaded "${fileName}" into RepurposeAI. Here is why autonomous brand memory changes content creation forever.`,
              cta: `Save this post for later.`,
              hashtags: ["#ContentRepurposing", "#VideoEditing", "#AIWorkflow"]
            },
            linkedin: {
              hook: `How we automated our content repurposing pipeline:`,
              body: `Uploaded: "${fileName}".\n\nBy codifying negative constraints and visual rules into persistent memory, our editorial team saves 15 hours a week without sacrificing brand voice.`,
              cta: `How is your team scaling content operations?`,
              hashtags: ["#Operations", "#ContentStrategy", "#B2B"]
            }
          }
        }
      ]
    };

    DEMO_SOURCES.unshift(newSource);
    this.currentSource = newSource;
    this.currentClip = newSource.clips[0];
    this.modalIngest.classList.remove('active');
    this.renderClipsList();
    this.selectClip(this.currentClip);
    this.switchTab('tab-studio');
    this.showToast(`🎉 Ingested file: "${file.name}"!`);
  }

  switchTab(tabId) {
    this.navTabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this.tabViews.forEach(view => {
      view.classList.toggle('active', view.id === tabId);
    });
  }

  applyTheme(theme) {
    brandStore.setTheme(theme);
    if (this.themeSelector) this.themeSelector.value = theme;
  }

  renderAll() {
    this.populateBrandDropdown();
    this.populatePersonaDropdown();
    this.populateBrandTabValues();
    this.renderClipsList();
    this.selectClip(this.currentClip);
    this.renderCalendarList();
  }

  populateBrandDropdown() {
    this.brandSelector.innerHTML = brandStore.profiles.map(b => 
      `<option value="${b.id}" ${b.id === brandStore.activeBrandId ? 'selected' : ''}>🏢 ${b.name}</option>`
    ).join('');
  }

  populatePersonaDropdown() {
    const brand = brandStore.getActiveBrand();
    this.personaSelect.innerHTML = brand.personas.map(p => 
      `<option value="${p.id}" ${p.id === this.activePersonaId ? 'selected' : ''}>🎭 ${p.name} (${p.platform})</option>`
    ).join('');
  }

  populateBrandTabValues() {
    const brand = brandStore.getActiveBrand();
    const visual = brand.visualGuide;

    this.brandPrimaryColor.value = visual.primaryColor;
    this.brandSecondaryColor.value = visual.secondaryColor;
    this.brandAccentColor.value = visual.accentColor;
    this.brandLogoText.value = visual.logoText;
    this.brandLogoPlacement.value = visual.logoPlacement;
    this.brandLogoOpacity.value = visual.logoOpacity;
    this.brandSubtitleStyle.value = visual.subtitleStyle;

    this.renderBannedWordsList();
    this.renderLearnedEditsList();
  }

  renderBannedWordsList() {
    const brand = brandStore.getActiveBrand();
    this.bannedWordsList.innerHTML = brand.antiPatterns.bannedWords.map(w => 
      `<span class="taboo-pill" style="cursor:pointer;" title="Click to remove" data-word="${w}">🚫 ${w} &times;</span>`
    ).join('');

    this.bannedWordsList.querySelectorAll('.taboo-pill').forEach(el => {
      el.addEventListener('click', () => {
        brandStore.removeBannedWord(el.dataset.word);
        this.renderBannedWordsList();
        this.checkTabooViolations();
      });
    });
  }

  renderLearnedEditsList() {
    const brand = brandStore.getActiveBrand();
    if (!this.learnedEditsList) return;

    if (!brand.learnedEdits || !brand.learnedEdits.length) {
      this.learnedEditsList.innerHTML = '<p style="font-size:0.78rem; color:var(--text-dim);">No edits logged yet. Edit text in Studio and click "Learn from my edits".</p>';
      return;
    }

    this.learnedEditsList.innerHTML = brand.learnedEdits.map(e => `
      <div style="background:var(--bg-main); border:1px solid var(--border-strong); border-radius:10px; padding:10px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="font-size:0.75rem; font-weight:800; color:var(--brand-primary);">${e.derivedRule}</span>
          <span style="font-size:0.68rem; color:var(--text-dim);">${e.timestamp}</span>
        </div>
        <p style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">${e.editedText}</p>
      </div>
    `).join('');
  }

  renderClipsList() {
    this.clipListContainer.innerHTML = this.currentSource.clips.map(clip => {
      const isActive = clip.id === this.currentClip.id;
      const isOutlier = clip.viralityScore >= 92;

      return `
        <div class="clip-card ${isActive ? 'active' : ''}" data-id="${clip.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="virality-badge ${isOutlier ? 'outlier' : ''}">
              🔥 ${clip.viralityScore} • ${clip.hookType}
            </span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:var(--text-dim);">${clip.duration}</span>
          </div>
          <div style="font-size:0.92rem; font-weight:800; color:var(--text-main); margin-bottom:4px;">${clip.title}</div>
          <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.4;">${clip.retentionThesis}</p>
        </div>
      `;
    }).join('');

    this.clipListContainer.querySelectorAll('.clip-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const found = this.currentSource.clips.find(c => c.id === id);
        if (found) this.selectClip(found);
      });
    });
  }

  selectClip(clip) {
    this.currentClip = clip;
    this.renderClipsList();
    this.player.loadClip(clip, this.currentSource.videoUrl);
    this.storyboard.render(clip, clip.startTime);
    this.timelineSlider.min = clip.startTime;
    this.timelineSlider.max = clip.endTime;
    this.timelineSlider.value = clip.startTime;
    this.loadPlatformCopy(clip, this.activePlatform);
    this.updateStatusBadge(clip.reviewStatus);

    // Update Storyboard Tab Title & Thesis
    this.storyboardClipTitle.innerText = clip.title;
    this.storyboardThesis.innerText = `Retention Thesis: ${clip.retentionThesis}`;
    this.renderStoryboardTabBeats(clip);
  }

  renderStoryboardTabBeats(clip) {
    const beats = clip.storyboard || [
      { time: "00:00", description: "Opening punchline with immediate tension" },
      { time: "00:12", description: "B-roll cutaway and retention hook transition" }
    ];

    this.storyboardContainer.innerHTML = beats.map((b, i) => `
      <div class="beat-item-row">
        <span class="beat-time-tag">${b.time}</span>
        <div>
          <div style="font-size:0.78rem; font-weight:800; text-transform:uppercase; color:var(--text-dim);">Scene Beat 0${i + 1}</div>
          <p style="font-size:0.85rem; color:var(--text-main); font-weight:600; margin-top:2px;">${b.description}</p>
        </div>
      </div>
    `).join('');
  }

  loadPlatformCopy(clip, platform) {
    const variants = clip.copyVariants || {};
    const platformKey = platform === 'reels' || platform === 'shorts' ? 'tiktok' : platform;
    const data = variants[platformKey] || {
      hook: `${clip.title}`,
      body: `Key takeaway: "${clip.retentionThesis}"`,
      cta: `Share your thoughts.`,
      hashtags: ["#Tech", "#Innovation"]
    };

    this.inputHook.value = data.hook;
    this.textareaBody.value = data.body;
    this.inputCta.value = data.cta;
    this.inputHashtags.value = (data.hashtags || []).join(' ');

    this.originalCopyCache[platform] = `${data.hook}\n${data.body}`;
    this.checkTabooViolations();
  }

  async regeneratePlatformCopy() {
    this.btnRegenerate.innerHTML = '⚡ Generating...';
    this.btnRegenerate.disabled = true;

    try {
      const result = await aiEngine.generatePlatformCopy(
        this.currentClip,
        this.activePlatform,
        this.activePersonaId
      );

      this.inputHook.value = result.hook;
      this.textareaBody.value = result.body;
      this.inputCta.value = result.cta;
      this.inputHashtags.value = (result.hashtags || []).join(' ');

      this.originalCopyCache[this.activePlatform] = `${result.hook}\n${result.body}`;
      this.checkTabooViolations();
      this.showToast(`✨ Generated ${this.activePlatform.toUpperCase()} copy via Brand Engine`);
    } finally {
      this.btnRegenerate.innerHTML = '⚡ Regenerate';
      this.btnRegenerate.disabled = false;
    }
  }

  checkTabooViolations() {
    const fullText = `${this.inputHook.value} ${this.textareaBody.value}`;
    const scan = brandStore.scanForTaboos(fullText);

    if (scan.hasViolations) {
      this.tabooBox.className = 'taboo-warning-box';
      this.tabooTitle.innerText = `⚠️ ${scan.violations.length} Taboo Anti-Pattern(s) Detected`;
      this.tabooPills.innerHTML = scan.violations.map(v => 
        `<span class="taboo-pill">🚫 "${v.pattern}"</span>`
      ).join('');
      this.btnSanitize.style.display = 'inline-flex';
    } else {
      this.tabooBox.className = 'taboo-warning-box clean';
      this.tabooTitle.innerText = '🛡️ Brand Voice Compliant (Zero Taboos)';
      this.tabooPills.innerHTML = '<span style="font-size:0.75rem; color:#16a34a; font-weight:600;">Passes all negative constraints & tone guidelines</span>';
      this.btnSanitize.style.display = 'none';
    }
  }

  updateTimelineUI(currentTime) {
    this.timelineSlider.value = currentTime;
    const currentM = Math.floor(currentTime / 60);
    const currentS = Math.floor(currentTime % 60).toString().padStart(2, '0');
    const endM = Math.floor(this.currentClip.endTime / 60);
    const endS = Math.floor(this.currentClip.endTime % 60).toString().padStart(2, '0');
    this.timeReadout.innerText = `${currentM}:${currentS} / ${endM}:${endS}`;
  }

  updateStatusBadge(status) {
    const badge = this.clipStatusBadge;
    if (!badge) return;
    badge.className = `status-pill status-${status || 'draft'}`;
    const map = {
      draft: '📝 Draft',
      in_review: '⏳ In Review',
      approved: '✅ Approved',
      published: '🚀 Published'
    };
    badge.innerText = map[status] || status;
  }

  handleDirectPublish() {
    this.currentClip.reviewStatus = 'published';
    this.updateStatusBadge('published');

    brandStore.addCalendarItem({
      clipId: this.currentClip.id,
      title: this.currentClip.title,
      platform: this.activePlatform,
      scheduledTime: 'Published Just Now',
      status: 'published',
      persona: brandStore.getActivePersona(this.activePersonaId).name,
      postPreview: this.inputHook.value
    });

    this.renderCalendarList();
    this.showToast(`🚀 Published to ${this.activePlatform.toUpperCase()}! Webhook delivered.`);
  }

  handleSchedulePost() {
    brandStore.addCalendarItem({
      clipId: this.currentClip.id,
      title: this.currentClip.title,
      platform: this.activePlatform,
      scheduledTime: 'Tomorrow, 10:00 AM',
      status: 'scheduled',
      persona: brandStore.getActivePersona(this.activePersonaId).name,
      postPreview: this.inputHook.value
    });

    this.renderCalendarList();
    this.showToast(`📅 Scheduled post added to Calendar Queue`);
  }

  renderCalendarList() {
    const list = this.calendarItemsList;
    if (!list) return;

    list.innerHTML = brandStore.calendarItems.map(item => `
      <div class="glass-box" style="padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:0.75rem; font-weight:800; color:var(--brand-primary); text-transform:uppercase;">${item.platform}</span>
          <span class="status-pill status-${item.status}">${item.status}</span>
        </div>
        <div style="font-size:0.92rem; font-weight:800; margin-bottom:4px;">${item.title}</div>
        <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.4;">${item.postPreview.slice(0, 90)}...</p>
        <div style="font-size:0.72rem; color:var(--text-dim); margin-top:8px;">🕒 ${item.scheduledTime} • 🎭 ${item.persona}</div>
      </div>
    `).join('');
  }

  populateIngestModal() {
    this.demoSourceSelector.innerHTML = DEMO_SOURCES.map(s => 
      `<option value="${s.id}" ${s.id === this.currentSource.id ? 'selected' : ''}>${s.title} (${s.speaker})</option>`
    ).join('');
  }

  showToast(message) {
    let toast = document.getElementById('studioToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'studioToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 74px;
        right: 24px;
        background: #ffffff;
        color: #1e293b;
        border: 2px solid var(--brand-primary);
        padding: 12px 18px;
        border-radius: 12px;
        font-size: 0.82rem;
        font-weight: 700;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 3500);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.studioApp = new StudioApp();
  });
}
