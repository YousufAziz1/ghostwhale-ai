// Futuristic Web Audio API Sound Effects

let audioCtx: AudioContext | null = null

export const audio = {
  init: () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  },

  playPing: () => {
    if (!audioCtx) return
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.3)
  },

  playType: () => {
    if (!audioCtx) return
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(150 + Math.random() * 50, audioCtx.currentTime)
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05)
    
    // High-pass filter for typewriter click sound
    const filter = audioCtx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2000

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.05)
  },

  playAlarm: () => {
    if (!audioCtx) return
    // Massive Whale Alarm (Low synth horn)
    const osc = audioCtx.createOscillator()
    const osc2 = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(110, audioCtx.currentTime) // A2
    osc.frequency.linearRampToValueAtTime(108, audioCtx.currentTime + 0.8)

    osc2.type = 'square'
    osc2.frequency.setValueAtTime(110.5, audioCtx.currentTime)
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime)
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1)
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.6)
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8)

    // Filter to make it sound like a cinematic horn
    const filter = audioCtx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(400, audioCtx.currentTime)
    filter.frequency.linearRampToValueAtTime(2000, audioCtx.currentTime + 0.4)

    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(audioCtx.destination)
    
    osc.start()
    osc2.start()
    osc.stop(audioCtx.currentTime + 0.8)
    osc2.stop(audioCtx.currentTime + 0.8)
  },

  playSuccess: () => {
    if (!audioCtx) return
    const ctx = audioCtx
    // Trade closed successfully chime
    const freqs = [523.25, 659.25, 1046.50] // C5, E5, C6
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.1 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.1)
      osc.stop(ctx.currentTime + i * 0.1 + 0.5)
    })
  },

  speak: (text: string) => {
    if (!('speechSynthesis' in window)) return
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.1 // Slightly faster
    utterance.pitch = 0.8 // Deeper, robotic
    utterance.volume = 0.8
    
    // Try to find an English robotic/male voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Zira') || v.name.includes('David'))
    if (preferredVoice) utterance.voice = preferredVoice

    window.speechSynthesis.speak(utterance)
  }
}
