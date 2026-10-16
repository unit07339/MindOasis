/**
 * Mode 5: 오르골 별가루 (Stardust & Chimes)
 * 캔버스 별가루 파티클 시스템 + Web Audio API 펜타토닉 오르골 연주
 */

class StardustMode {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        this.initialized = false;

        this.width = 0;
        this.height = 0;

        this.particles = [];
        this.maxParticles = 350;

        // 배경 고정 별들
        this.staticStars = [];
        this.numStaticStars = 90;

        this.mouse = { x: 0, y: 0, prevX: 0, prevY: 0, speed: 0 };
        this.lastSoundTime = 0;
        this.minSoundInterval = 110; // ms

        // 별자리 라인 연결 옵션
        this.enableConstellations = true;

        this.boundResize = this.resize.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundTouchMove = this.onTouchMove.bind(this);
        this.boundTouchStart = this.onTouchStart.bind(this);
    }

    init(container) {
        container.innerHTML = `
            <div class="mode-canvas-wrapper stardust-container">
                <canvas id="stardust-canvas"></canvas>
                <div class="mode-controls-overlay">
                    <div class="stardust-controls">
                        <button class="glass-pill-sm active" id="btn-toggle-constellation">
                            ✨ 별자리 연결 (ON)
                        </button>
                    </div>
                    <div class="mode-hint">마우스를 상하좌우로 천천히 움직여보세요. 맑은 오르골 선율과 은하수가 그려집니다. (클릭 시 별무리 폭발)</div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('stardust-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.setupUI();
        this.resize();
        this.initStaticStars();

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });

        this.initialized = true;
        this.startLoop();
    }

    setupUI() {
        const constBtn = document.getElementById('btn-toggle-constellation');
        if (constBtn) {
            constBtn.addEventListener('click', () => {
                this.enableConstellations = !this.enableConstellations;
                constBtn.classList.toggle('active', this.enableConstellations);
                constBtn.textContent = `✨ 별자리 연결 (${this.enableConstellations ? 'ON' : 'OFF'})`;
            });
        }
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    initStaticStars() {
        this.staticStars = [];
        for (let i = 0; i < this.numStaticStars; i++) {
            this.staticStars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: 0.8 + Math.random() * 1.8,
                phase: Math.random() * Math.PI * 2,
                speed: 0.01 + Math.random() * 0.02
            });
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.handlePointer(x, y);
    }

    onTouchMove(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            this.handlePointer(x, y);
            e.preventDefault();
        }
    }

    handlePointer(x, y) {
        const dx = x - this.mouse.x;
        const dy = y - this.mouse.y;
        const speed = Math.hypot(dx, dy);

        this.mouse.prevX = this.mouse.x;
        this.mouse.prevY = this.mouse.y;
        this.mouse.x = x;
        this.mouse.y = y;
        this.mouse.speed = speed;

        if (speed > 1.5) {
            // 별가루 파티클 생성
            const spawnCount = Math.min(8, Math.floor(speed / 4) + 2);
            for (let i = 0; i < spawnCount; i++) {
                this.addParticle(x, y, dx * 0.15, dy * 0.15);
            }

            // 오르골 차임 연주 (Y축 위치에 따른 음계 결정: 아래쪽일수록 낮은음, 위쪽일수록 높은음)
            const now = performance.now();
            if (now - this.lastSoundTime > this.minSoundInterval) {
                this.lastSoundTime = now;
                const noteIndex = Math.min(10, Math.max(0, Math.floor((1 - (y / this.height)) * 11)));
                if (window.soundEngine) {
                    window.soundEngine.playChime(noteIndex, Math.min(speed / 12, 1.4));
                }
            }
        }
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.burstStar(x, y);
    }

    onTouchStart(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            this.burstStar(x, y);
            e.preventDefault();
        }
    }

    burstStar(x, y) {
        // 초신성 폭발 (많은 별가루 + 아름다운 아르페지오 화음)
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4.5;
            this.addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, true);
        }

        if (window.soundEngine) {
            const baseNote = Math.min(6, Math.max(0, Math.floor((1 - (y / this.height)) * 8)));
            window.soundEngine.playChime(baseNote, 1.3);
            setTimeout(() => window.soundEngine.playChime(baseNote + 2, 1.1), 80);
            setTimeout(() => window.soundEngine.playChime(baseNote + 4, 1.0), 160);
        }
    }

    addParticle(x, y, vx, vy, isBurst = false) {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift();
        }

        const colors = [
            '#FFF2B2', // 따뜻한 골드 스타
            '#B2EBF2', // 영롱한 아이스 블루
            '#F8BBD0', // 은은한 로즈 핑크
            '#E1BEE7', // 신비로운 오키드 라벤더
            '#FFFFFF'  // 순백의 크리스탈
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.particles.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 8,
            vx: vx + (Math.random() - 0.5) * 1.2,
            vy: vy + (Math.random() - 0.5) * 1.2,
            size: isBurst ? 2.5 + Math.random() * 3.5 : 1.5 + Math.random() * 2.5,
            color: color,
            alpha: 1.0,
            decay: isBurst ? 0.012 + Math.random() * 0.01 : 0.015 + Math.random() * 0.015,
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.08,
            isStarShape: Math.random() > 0.4
        });
    }

    update() {
        // 파티클 물리 및 수명 갱신
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96; // 공기 저항 감쇠
            p.vy *= 0.96;
            p.rotation += p.rotSpeed;
            p.alpha -= p.decay;

            if (p.alpha <= 0.01) {
                this.particles.splice(i, 1);
            }
        }

        // 고정 별 반짝임
        this.staticStars.forEach(s => {
            s.phase += s.speed;
        });
    }

    draw() {
        if (!this.ctx) return;

        // 1. 짙은 밤하늘 코스모스 배경 (우주 성운 그라데이션)
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0, '#060814');
        bgGrad.addColorStop(0.5, '#0B0F2A');
        bgGrad.addColorStop(1, '#161233');

        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 은은한 성운 빛무리 (Nebula Glow)
        const nebulaGrad = this.ctx.createRadialGradient(
            this.width * 0.45, this.height * 0.55, 30,
            this.width * 0.45, this.height * 0.55, this.width * 0.6
        );
        nebulaGrad.addColorStop(0, 'rgba(88, 62, 138, 0.16)');
        nebulaGrad.addColorStop(0.5, 'rgba(38, 70, 118, 0.1)');
        nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = nebulaGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. 고정된 먼 배경 별들
        this.drawStaticStars();

        // 3. 별자리 연결 선 (Constellation lines)
        if (this.enableConstellations && this.particles.length > 1) {
            this.drawConstellationLines();
        }

        // 4. 별가루 파티클 그리기
        this.ctx.save();
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.globalAlpha = p.alpha;

            // 반짝이는 광채 Glow
            const glowGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 3.2);
            glowGrad.addColorStop(0, p.color);
            glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
            this.ctx.fillStyle = glowGrad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.size * 3.2, 0, Math.PI * 2);
            this.ctx.fill();

            // 중심 십자 반짝이 또는 원형 코어
            this.ctx.fillStyle = '#FFFFFF';
            if (p.isStarShape) {
                // 4포인트 십자 반짝이
                this.ctx.beginPath();
                const s = p.size * 2.2;
                const inner = p.size * 0.4;
                this.ctx.moveTo(0, -s);
                this.ctx.lineTo(inner, -inner);
                this.ctx.lineTo(s, 0);
                this.ctx.lineTo(inner, inner);
                this.ctx.lineTo(0, s);
                this.ctx.lineTo(-inner, inner);
                this.ctx.lineTo(-s, 0);
                this.ctx.lineTo(-inner, -inner);
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        });
        this.ctx.restore();
    }

    drawStaticStars() {
        this.ctx.save();
        this.staticStars.forEach(s => {
            const twinkle = (Math.sin(s.phase) + 1) / 2;
            const alpha = 0.2 + twinkle * 0.6;
            this.ctx.fillStyle = `rgba(220, 235, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    drawConstellationLines() {
        this.ctx.save();
        const maxDist = 75;
        const len = this.particles.length;

        for (let i = 0; i < len; i++) {
            const p1 = this.particles[i];
            for (let j = i + 1; j < Math.min(i + 14, len); j++) {
                const p2 = this.particles[j];
                const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (d < maxDist) {
                    const lineAlpha = (1 - d / maxDist) * Math.min(p1.alpha, p2.alpha) * 0.45;
                    this.ctx.strokeStyle = `rgba(180, 215, 255, ${lineAlpha})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
        this.ctx.restore();
    }

    startLoop() {
        const loop = () => {
            this.update();
            this.draw();
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    destroy() {
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
        window.removeEventListener('resize', this.boundResize);
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.boundMouseMove);
            this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        }
        this.initialized = false;
    }
}

window.StardustMode = StardustMode;
