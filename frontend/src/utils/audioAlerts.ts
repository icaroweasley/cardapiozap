export type NotificationSoundType = 'cash_register' | 'bell' | 'magic' | 'chime' | 'retro' | 'none';

export const playNotificationSound = (type: NotificationSoundType) => {
  if (type === 'none') return;
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol = 0.5) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      
      gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    switch (type) {
      case 'cash_register':
        playTone(1200, 'square', 0, 0.1, 0.3);
        playTone(1600, 'square', 0.1, 0.2, 0.3);
        playTone(800, 'triangle', 0.15, 0.4, 0.5);
        break;
      case 'bell':
        playTone(880, 'sine', 0, 0.8, 0.6); // A5
        playTone(1760, 'sine', 0, 0.8, 0.3); // A6
        break;
      case 'magic':
        playTone(523.25, 'sine', 0, 0.1, 0.3);
        playTone(659.25, 'sine', 0.1, 0.1, 0.3);
        playTone(783.99, 'sine', 0.2, 0.1, 0.3);
        playTone(1046.50, 'sine', 0.3, 0.4, 0.3);
        break;
      case 'chime':
        playTone(1046.50, 'triangle', 0, 0.2, 0.4);
        playTone(1318.51, 'triangle', 0.2, 0.4, 0.4);
        break;
      case 'retro':
        playTone(440, 'square', 0, 0.1, 0.3);
        playTone(880, 'square', 0.1, 0.1, 0.3);
        break;
    }
  } catch (e) {
    console.warn("AudioContext falhou ao tocar som", e);
  }
};
