// A simple Web Audio API synthesizer for cinematic UI sounds
// No external assets required.

let ctx: AudioContext | null = null

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return ctx
}

export const audio = {
  init() {
    // Must be called on user interaction
    const actx = getContext()
    if (actx.state === 'suspended') actx.resume()
  },

  playPing() {
    try {
      const actx = getContext()
      const osc = actx.createOscillator()
      const gain = actx.createGain()
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, actx.currentTime) // A5
      osc.frequency.exponentialRampToValueAtTime(440, actx.currentTime + 0.5)

      gain.gain.setValueAtTime(0.3, actx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.8)

      osc.connect(gain)
      gain.connect(actx.destination)

      osc.start()
      osc.stop(actx.currentTime + 1)
    } catch {}
  },

  playAlert() {
    try {
      const actx = getContext()
      const osc = actx.createOscillator()
      const gain = actx.createGain()
      
      osc.type = 'square'
      osc.frequency.setValueAtTime(220, actx.currentTime) // A3
      osc.frequency.setValueAtTime(330, actx.currentTime + 0.1) // E4
      osc.frequency.setValueAtTime(220, actx.currentTime + 0.2) // A3

      gain.gain.setValueAtTime(0.2, actx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.4)

      osc.connect(gain)
      gain.connect(actx.destination)

      osc.start()
      osc.stop(actx.currentTime + 0.5)
    } catch {}
  },

  playType() {
    try {
      const actx = getContext()
      const osc = actx.createOscillator()
      const gain = actx.createGain()
      
      // High frequency click
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(3000 + Math.random() * 1000, actx.currentTime)

      gain.gain.setValueAtTime(0.05, actx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.05)

      osc.connect(gain)
      gain.connect(actx.destination)

      osc.start()
      osc.stop(actx.currentTime + 0.05)
    } catch {}
  }
}
