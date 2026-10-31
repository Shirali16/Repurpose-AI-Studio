// Interactive Video Player & Visual Style Enforcer with Real Speech Synthesis
import { brandStore } from './brandMemory.js';

export class VideoPlayerController {
  constructor(videoElement, containerElement, subtitleElement, watermarkElement) {
    this.video = videoElement;
    this.container = containerElement;
    this.subtitleEl = subtitleElement;
    this.watermarkEl = watermarkElement;
    this.currentClip = null;
    this.aspectRatio = "9:16"; // 9:16, 1:1, 16:9
    this.isPlaying = false;
    this.voiceEnabled = true;
    this.onTimeUpdateCallback = null;
    this.onClipEndCallback = null;

    // Speech Synthesis state
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.activeUtterance = null;
    this.speechWordIndex = 0;
    this.volume = 1.0;

    // Web Audio Context for guaranteed hardware audio unlock
    this.audioCtx = null;

    this.initEvents();
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Melodic audio chime that guarantees sound plays through computer speakers
  playChime(frequency = 523.25, duration = 0.25) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  testAudioFeedback() {
    this.playChime(587.33, 0.2); // D5
    setTimeout(() => this.playChime(880.00, 0.4), 180); // A5

    if (this.synth) {
      this.synth.cancel();
      setTimeout(() => {
        this.synth.resume();
        const testUtterance = new SpeechSynthesisUtterance("Audio test successful. Sound is working at full volume.");
        testUtterance.volume = this.volume;
        testUtterance.rate = 1.05;
        window._activeSpeechUtterance = testUtterance;
        this.synth.speak(testUtterance);
      }, 50);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.video) {
      this.video.volume = this.volume;
      this.video.muted = this.volume === 0;
    }
  }

  initEvents() {
    this.video.addEventListener('timeupdate', () => this.handleTimeUpdate());
    this.video.addEventListener('ended', () => this.handleEnded());
    this.video.addEventListener('play', () => { 
      this.isPlaying = true;
      if (this.voiceEnabled) this.startSpeechSynthesis();
    });
    this.video.addEventListener('pause', () => { 
      this.isPlaying = false;
      this.stopSpeechSynthesis();
    });

    // Unmute video explicitly so any native audio plays
    this.video.muted = false;
    this.video.volume = 0.8;
    
    // Resilience fallback: If video network stream is blocked, simulate playback clock gracefully
    this.video.addEventListener('error', () => {
      console.warn("Video network stream unavailable, activating synthetic playback simulation");
      this.activateSimulationFallback();
    });
  }

  loadClip(clip, videoUrl) {
    this.currentClip = clip;
    this.stopSpeechSynthesis();

    if (videoUrl && this.video.src !== videoUrl) {
      this.video.src = videoUrl;
      this.video.load();
    }
    this.seekTo(clip.startTime);
    this.applyBrandVisuals();
    this.renderSubtitleAtTime(clip.startTime);
  }

  seekTo(seconds) {
    const target = Math.max(0, seconds);
    if (this.simulationActive) {
      this.simulatedTime = target;
      this.handleTimeUpdate();
    } else if (!isNaN(seconds) && this.video) {
      this.video.currentTime = target;
    }

    if (this.isPlaying && this.voiceEnabled) {
      this.startSpeechSynthesis(target);
    }
  }

  togglePlay() {
    if (this.simulationActive) {
      if (this.simInterval) {
        clearInterval(this.simInterval);
        this.simInterval = null;
        this.isPlaying = false;
        this.stopSpeechSynthesis();
      } else {
        this.isPlaying = true;
        this.simInterval = setInterval(() => {
          this.simulatedTime += 0.25;
          this.handleTimeUpdate();
        }, 250);
        if (this.voiceEnabled) this.startSpeechSynthesis(this.simulatedTime);
      }
      return;
    }

    if (this.video.paused) {
      this.video.muted = false;
      this.video.play().then(() => {
        if (this.voiceEnabled) this.startSpeechSynthesis(this.video.currentTime);
      }).catch(e => {
        console.warn("Video play interrupted, activating simulation fallback:", e);
        this.activateSimulationFallback();
        this.togglePlay();
      });
    } else {
      this.video.pause();
      this.stopSpeechSynthesis();
    }
  }

  // --- Real Voice Speech Synthesis (Speaks the Script Aloud!) ---
  startSpeechSynthesis(fromSeconds = null) {
    if (!this.synth || !this.currentClip || !this.currentClip.transcriptWords) return;

    this.stopSpeechSynthesis();
    this.playChime(523.25, 0.15); // C5 audio chime to unlock speakers

    const words = this.currentClip.transcriptWords;
    const currentTime = fromSeconds !== null ? fromSeconds : (this.simulationActive ? this.simulatedTime : this.video.currentTime);

    // Find words from current timestamp to end of clip
    let startIndex = words.findIndex(w => w.start >= currentTime);
    if (startIndex === -1) startIndex = 0;

    const remainingWords = words.slice(startIndex);
    const spokenText = remainingWords.map(w => w.word).join(' ');

    if (!spokenText.trim()) return;

    // 40ms delay to ensure cancel queue is flushed and Chromium audio engine is ready
    setTimeout(() => {
      try {
        this.synth.resume();
        const utterance = new SpeechSynthesisUtterance(spokenText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = this.volume;

        // Prevent Chromium garbage collection bug
        window._activeSpeechUtterance = utterance;

        // Pick voice if loaded
        const voices = this.synth.getVoices();
        if (voices && voices.length > 0) {
          const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Samantha')));
          if (naturalVoice) utterance.voice = naturalVoice;
        }

        // Synchronize words dynamically via speech boundaries
        utterance.onboundary = (event) => {
          if (event.name === 'word' && event.charIndex !== undefined) {
            const textBefore = spokenText.slice(0, event.charIndex);
            const wordOffset = textBefore.trim().split(/\s+/).filter(Boolean).length;
            const targetWord = remainingWords[wordOffset];
            if (targetWord) {
              this.renderSubtitleAtTime(targetWord.start);
              if (this.onTimeUpdateCallback) {
                this.onTimeUpdateCallback(targetWord.start);
              }
            }
          }
        };

        utterance.onend = () => {
          this.activeUtterance = null;
        };

        utterance.onerror = (e) => {
          console.warn("Speech error:", e);
        };

        this.activeUtterance = utterance;
        this.synth.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis error:", e);
      }
    }, 40);
  }

  stopSpeechSynthesis() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // Ignored
      }
    }
    this.activeUtterance = null;
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled) {
      this.stopSpeechSynthesis();
    } else if (this.isPlaying) {
      this.startSpeechSynthesis();
    }
    return this.voiceEnabled;
  }

  setAspectRatio(ratio) {
    this.aspectRatio = ratio;
    this.updateContainerFrame();
    brandStore.updateVisualGuide({ aspectRatio: ratio });
  }

  updateContainerFrame() {
    if (!this.container) return;
    this.container.classList.remove('aspect-9-16', 'aspect-1-1', 'aspect-16-9');
    if (this.aspectRatio === '9:16') {
      this.container.classList.add('aspect-9-16');
    } else if (this.aspectRatio === '1:1') {
      this.container.classList.add('aspect-1-1');
    } else {
      this.container.classList.add('aspect-16-9');
    }
  }

  applyBrandVisuals() {
    const brand = brandStore.getActiveBrand();
    const visual = brand.visualGuide;

    // Apply Watermark
    if (this.watermarkEl) {
      if (visual.watermarkEnabled) {
        this.watermarkEl.style.display = 'flex';
        this.watermarkEl.innerText = visual.logoText || brand.name;
        this.watermarkEl.style.opacity = `${visual.logoOpacity / 100}`;
        this.watermarkEl.style.borderColor = visual.primaryColor;
        this.watermarkEl.className = `watermark-badge watermark-${visual.logoPlacement}`;
      } else {
        this.watermarkEl.style.display = 'none';
      }
    }

    if (visual.aspectRatio) {
      this.aspectRatio = visual.aspectRatio;
      this.updateContainerFrame();
    }
  }

  handleTimeUpdate() {
    const currentTime = this.simulationActive ? this.simulatedTime : this.video.currentTime;

    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(currentTime);
    }

    // Clip boundary enforcement
    if (this.currentClip && currentTime >= this.currentClip.endTime) {
      this.stopSpeechSynthesis();
      if (this.simulationActive) {
        if (this.simInterval) clearInterval(this.simInterval);
        this.simInterval = null;
        this.simulatedTime = this.currentClip.startTime;
      } else {
        this.video.pause();
        this.video.currentTime = this.currentClip.startTime;
      }
      if (this.onClipEndCallback) {
        this.onClipEndCallback();
      }
      return;
    }

    // Subtitle rendering
    this.renderSubtitleAtTime(currentTime);
  }

  handleEnded() {
    this.stopSpeechSynthesis();
    if (this.currentClip) {
      this.video.currentTime = this.currentClip.startTime;
    }
  }

  renderSubtitleAtTime(currentTime) {
    if (!this.subtitleEl || !this.currentClip || !this.currentClip.transcriptWords) return;

    const words = this.currentClip.transcriptWords;
    const brand = brandStore.getActiveBrand();
    const visual = brand.visualGuide;

    const activeIndex = words.findIndex(w => currentTime >= w.start && currentTime <= w.end);
    const currentWordObj = words.find(w => currentTime >= w.start && currentTime <= w.end) || 
      words.reduce((prev, curr) => Math.abs(curr.start - currentTime) < Math.abs(prev.start - currentTime) ? curr : prev, words[0]);

    if (!currentWordObj) {
      this.subtitleEl.innerHTML = '';
      return;
    }

    const targetIdx = words.indexOf(currentWordObj);
    const startIdx = Math.max(0, targetIdx - 2);
    const endIdx = Math.min(words.length, targetIdx + 3);
    const phrase = words.slice(startIdx, endIdx);

    const html = phrase.map((item, i) => {
      const isCurrent = (startIdx + i) === activeIndex;
      const highlightColor = visual.accentColor || '#f59e0b';

      if (isCurrent) {
        return `<span class="kinetic-word-active" style="color: ${highlightColor} !important;">${item.word}</span>`;
      }
      return `<span class="kinetic-word">${item.word}</span>`;
    }).join(' ');

    this.subtitleEl.innerHTML = html;
  }

  activateSimulationFallback() {
    if (this.simulationActive) return;
    this.simulationActive = true;
    this.simulatedTime = this.currentClip ? this.currentClip.startTime : 0;
    
    let fallback = this.container.querySelector('.video-fallback-card');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.className = 'video-fallback-card';
      fallback.style.cssText = `
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, #fff0f5 0%, #f0f7ff 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        z-index: 1;
      `;
      fallback.innerHTML = `
        <div style="width:68px; height:68px; border-radius:20px; background:linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); display:flex; align-items:center; justify-content:center; font-size:2rem; box-shadow:0 8px 20px rgba(236,72,153,0.3);">🎙️</div>
        <div style="font-size:0.95rem; font-weight:800; color:var(--text-main);">AI Voice Audio Stream</div>
        <div style="display:flex; gap:5px; align-items:flex-end; height:32px;">
          <span style="width:5px; height:20px; background:var(--brand-primary); border-radius:3px;"></span>
          <span style="width:5px; height:32px; background:var(--brand-secondary); border-radius:3px;"></span>
          <span style="width:5px; height:24px; background:var(--brand-accent); border-radius:3px;"></span>
          <span style="width:5px; height:28px; background:var(--brand-primary); border-radius:3px;"></span>
          <span style="width:5px; height:18px; background:var(--brand-secondary); border-radius:3px;"></span>
        </div>
      `;
      this.container.appendChild(fallback);
    }
  }
}
