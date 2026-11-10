/**
 * Optional, user-controlled Web Audio API ambient sound generator for Focus Room.
 * Strictly obeys the engineering constraint: NEVER autoplays audio.
 * Audio only starts on explicit user click and stops on command or unmount.
 */

export type AmbientSoundType = 'none' | 'soft_rain' | 'warm_drone' | 'white_noise';

class SoundService {
  private ctx: AudioContext | null = null;
  private activeSourceNodes: AudioNode[] = [];
  private gainNode: GainNode | null = null;
  private currentType: AmbientSoundType = 'none';
  private volume: number = 0.25;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getCurrentSound(): AmbientSoundType {
    return this.currentType;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(nextVolume: number): void {
    this.volume = Math.max(0, Math.min(1, nextVolume));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume * 0.35, this.ctx.currentTime, 0.08);
    }
  }

  public stopAmbient(): void {
    for (const node of this.activeSourceNodes) {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.activeSourceNodes = [];
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // Ignore
      }
      this.gainNode = null;
    }
    this.currentType = 'none';
  }

  public startAmbient(type: AmbientSoundType): void {
    this.stopAmbient();
    if (type === 'none') return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    this.currentType = type;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(Math.max(0.01, this.volume * 0.35), ctx.currentTime + 0.5);
    masterGain.connect(ctx.destination);
    this.gainNode = masterGain;

    if (type === 'soft_rain' || type === 'white_noise') {
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'soft_rain') {
          // Pink/brown filtered rain texture
          output[i] = (lastOut + 0.04 * white) / 1.04;
          lastOut = output[i];
          output[i] *= 2.5;
        } else {
          output[i] = white * 0.4;
        }
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'soft_rain' ? 950 : 2400, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start(0);
      this.activeSourceNodes.push(whiteNoise, filter);
    } else if (type === 'warm_drone') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(110, ctx.currentTime); // A2
      osc2.frequency.setValueAtTime(164.81, ctx.currentTime); // E3

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);

      osc1.start();
      osc2.start();
      this.activeSourceNodes.push(osc1, osc2, filter);
    }
  }
}

export const soundService = new SoundService();
