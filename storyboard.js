// Interactive Storyboard & Transcript-Based Clip Trimmer
export class StoryboardController {
  constructor(transcriptContainer, storyboardContainer, onSeekCallback, onTrimCallback) {
    this.transcriptEl = transcriptContainer;
    this.storyboardEl = storyboardContainer;
    this.onSeek = onSeekCallback;
    this.onTrim = onTrimCallback;
    this.currentClip = null;
  }

  render(clip, currentTime) {
    this.currentClip = clip;
    this.renderTranscript(clip, currentTime);
    this.renderStoryboardCards(clip);
  }

  renderTranscript(clip, currentTime) {
    if (!this.transcriptEl || !clip || !clip.transcriptWords) return;

    const html = clip.transcriptWords.map((wordObj, idx) => {
      const isCurrent = currentTime >= wordObj.start && currentTime <= wordObj.end;
      const isPast = currentTime > wordObj.end;
      const classes = [
        'transcript-word',
        isCurrent ? 'active' : '',
        isPast ? 'past' : ''
      ].filter(Boolean).join(' ');

      return `<span class="${classes}" data-start="${wordObj.start}" title="Seek to ${wordObj.start.toFixed(1)}s">${wordObj.word}</span>`;
    }).join(' ');

    this.transcriptEl.innerHTML = html;

    // Attach click listeners to words
    this.transcriptEl.querySelectorAll('.transcript-word').forEach(span => {
      span.addEventListener('click', (e) => {
        const start = parseFloat(e.target.dataset.start);
        if (!isNaN(start) && this.onSeek) {
          this.onSeek(start);
        }
      });
    });
  }

  updateWordHighlights(currentTime) {
    if (!this.transcriptEl || !this.currentClip) return;
    const spans = this.transcriptEl.querySelectorAll('.transcript-word');
    if (!spans.length) return;

    this.currentClip.transcriptWords.forEach((wordObj, idx) => {
      const span = spans[idx];
      if (!span) return;
      if (currentTime >= wordObj.start && currentTime <= wordObj.end) {
        span.classList.add('active');
        span.classList.remove('past');
        // Smooth auto-scroll transcript to keep active word in view
        span.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } else if (currentTime > wordObj.end) {
        span.classList.remove('active');
        span.classList.add('past');
      } else {
        span.classList.remove('active', 'past');
      }
    });
  }

  renderStoryboardCards(clip) {
    if (!this.storyboardEl) return;
    const cards = clip.storyboard || [
      { time: "00:00", description: "Hook sequence: Fast opening frame" },
      { time: "00:15", description: "Core insight & visual contrast" }
    ];

    const html = cards.map((card, i) => `
      <div class="storyboard-beat-card">
        <div class="beat-header">
          <span class="beat-time">${card.time}</span>
          <span class="beat-index">Beat 0${i + 1}</span>
        </div>
        <p class="beat-desc">${card.description}</p>
      </div>
    `).join('');

    this.storyboardEl.innerHTML = html;
  }
}
