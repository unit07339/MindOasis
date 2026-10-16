/**
 * MindOasis Audio Engine (Web Audio API 기반 자체 합성 사운드)
 * 외부 파일 의존성 없이 로컬 오프라인 환경에서도 100% 동작합니다.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.bgmGain = null;
        this.isMuted = false;
        this.bgmPlaying = false;
        this.bgmOscillators = [];
        this.sandNoiseNode = null;
        this.sandGainNode = null;
        this.volume = 0.7;

        // 펜타토닉 힐링 오르골 주파수 목록 (Hz) - 맑고 영롱한 음계
        this.chimeScale = [
            261.63, // C4
            293.66, // D4
            329.63, // E4
            392.00, // G4
            440.00, // A4
            523.25, // C5
            587.33, // D5
            659.25, // E5
            783.99, // G5
            880.00, // A5
            1046.50 // C6
        ];
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // 마스터 게인
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // 효과음 게인
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // BGM 앰비언스 게인
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);
    }

    ensureContext() {
        if (!this.ctx) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.ensureContext();
        this.isMuted = muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
        }
        return this.isMuted;
    }

    toggleMute() {
        return this.setMuted(!this.isMuted);
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && !this.isMuted) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
        }
    }

    /**
     * 모드 1: 디지털 말랑이 젤리 튕김음
     * 피치가 올라갔다 내려오며 부드러운 젤리 느낌을 줍니다.
     */
    playSquishy(stretch = 1) {
        this.ensureContext();
        if (this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        const baseFreq = 160 + Math.min(stretch * 120, 300);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.28);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * 모드 2: 물멍 - 맑고 청아한 물방울 똑! 소리
     */
    playWaterDrop(intensity = 1) {
        this.ensureContext();
        if (this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // 무작위 약간의 피치 변화로 다채로운 빗방울/물방울 구현
        const startFreq = 850 + Math.random() * 400 + (intensity * 200);
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 1.45, now + 0.02);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.8, now + 0.14);

        const peakGain = Math.min(0.25 * intensity, 0.4);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.26);
    }

    /**
     * 모드 3: 무한 뽁뽁이 - 찰진 톡/뽁! 터짐 소리
     */
    playBubblePop() {
        this.ensureContext();
        if (this.isMuted) return;

        const now = this.ctx.currentTime;
        
        // 팝의 핵심 타격음 (클릭 임펄스)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 팝의 고주파 잔향
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1600 + Math.random() * 600;
        noiseFilter.Q.value = 3.0;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        // 톤 스윕
        osc.type = 'sine';
        const startPitch = 500 + Math.random() * 250;
        osc.frequency.setValueAtTime(startPitch, now);
        osc.frequency.exponentialRampToValueAtTime(startPitch * 2.5, now + 0.02);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        whiteNoise.start(now);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    /**
     * 모드 4: 디지털 모래 정원 - 사각사각 갈퀴질 ASMR
     */
    playSandRake(duration = 0.08) {
        this.ensureContext();
        if (this.isMuted) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200 + Math.random() * 400, now);
        filter.Q.setValueAtTime(1.8, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
    }

    /**
     * 모드 5: 오르골 별가루 - 맑은 크리스탈 오르골 / 윈드차임
     */
    playChime(noteIndex = null, speed = 1) {
        this.ensureContext();
        if (this.isMuted) return;

        const now = this.ctx.currentTime;
        let freq;
        if (noteIndex !== null && this.chimeScale[noteIndex]) {
            freq = this.chimeScale[noteIndex];
        } else {
            const randomIndex = Math.floor(Math.random() * this.chimeScale.length);
            freq = this.chimeScale[randomIndex];
        }

        // 기본음 + 오버톤(배음) 2개로 영롱하고 투명한 오르골 음색 생성
        const harmonics = [
            { mult: 1, gain: 0.35, decay: 1.6 },
            { mult: 2.76, gain: 0.12, decay: 0.9 }, // 벨/차임 고유 비조화 배음
            { mult: 5.4, gain: 0.05, decay: 0.5 }
        ];

        harmonics.forEach(h => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * h.mult, now);

            const peak = h.gain * Math.min(speed, 1.2);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(peak, now + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + h.decay);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + h.decay + 0.05);
        });
    }

    /**
     * 배경 힐링 앰비언스 BGM 토글 (432Hz 기반 포근한 힐링 드론 코드)
     */
    toggleBgm() {
        this.ensureContext();
        if (this.bgmPlaying) {
            this.stopBgm();
            return false;
        } else {
            this.startBgm();
            return true;
        }
    }

    startBgm() {
        if (this.bgmPlaying) return;
        this.ensureContext();
        this.bgmPlaying = true;

        const now = this.ctx.currentTime;
        // 힐링 F# Major 9 / D#m7 앰비언트 코드 (치유와 이완의 주파수)
        const chordFreqs = [108, 162, 216, 270, 324]; // 54Hz(A1 harmonic series)

        this.bgmOscillators = chordFreqs.map((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            // 미세 디튠으로 영롱한 코러스 효과
            osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450 + idx * 80, now);

            const oscGain = 0.06 / (idx + 1);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(oscGain, now + 3.0); // 3초 페이드 인

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(now);
            return { osc, gain };
        });
    }

    stopBgm() {
        if (!this.bgmPlaying) return;
        const now = this.ctx.currentTime;
        this.bgmOscillators.forEach(({ osc, gain }) => {
            gain.gain.setTargetAtTime(0.0001, now, 0.8);
            setTimeout(() => {
                try { osc.stop(); } catch(e) {}
            }, 1200);
        });
        this.bgmOscillators = [];
        this.bgmPlaying = false;
    }
}

// 싱글톤 사운드 인스턴스 전역 노출
window.soundEngine = new SoundEngine();
