/**
 * Mode 2: 고요한 물멍 파동 (Water Ripple)
 * 부드러운 수면 파동 역학 시뮬레이션 + 물방울 ASMR 사운드
 */

class RippleMode {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        this.initialized = false;

        this.width = 0;
        this.height = 0;

        // 파동 목록
        this.ripples = [];
        this.maxRipples = 40;

        // 반딧불이 / 부유 파티클
        this.fireflies = [];
        this.numFireflies = 25;

        // 연꽃 잎 오브젝트
        this.lotusLeaves = [];

        // 비 내림(Rain) 자동 모드
        this.autoRain = true;
        this.rainTimer = 0;

        // 색상 테마 (깊은 밤 호수, 신비한 청록 심해, 황혼의 노을 수면)
        this.themes = [
            {
                name: 'Midnight Lake',
                bgGrad: ['#0A1128', '#001F54', '#034078'],
                waveColor: 'rgba(128, 206, 255, ',
                fireflyColor: 'rgba(180, 240, 255, 0.8)'
            },
            {
                name: 'Emerald Abyss',
                bgGrad: ['#051c14', '#0b3c2c', '#145c44'],
                waveColor: 'rgba(130, 240, 190, ',
                fireflyColor: 'rgba(180, 255, 210, 0.8)'
            },
            {
                name: 'Twilight Dusk',
                bgGrad: ['#1c102a', '#341547', '#542065'],
                waveColor: 'rgba(255, 180, 215, ',
                fireflyColor: 'rgba(255, 220, 180, 0.8)'
            }
        ];
        this.currentThemeIdx = 0;

        this.boundResize = this.resize.bind(this);
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundTouch = this.onTouch.bind(this);
        this.lastMoveTime = 0;
    }

    init(container) {
        container.innerHTML = `
            <div class="mode-canvas-wrapper ripple-container">
                <canvas id="ripple-canvas"></canvas>
                <div class="mode-controls-overlay">
                    <div class="ripple-controls">
                        <button class="glass-pill-btn active" id="btn-toggle-rain">
                            <span class="btn-icon">🌧️</span> 자동 물방울 (ON)
                        </button>
                        <div class="theme-pill-group" id="ripple-theme-group"></div>
                    </div>
                    <div class="mode-hint">수면을 클릭하거나 가볍게 쓸어넘겨 보세요. 고요한 물결이 퍼져나갑니다.</div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('ripple-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.setupUI();
        this.resize();
        this.initObjects();

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('touchstart', this.boundTouch, { passive: false });
        this.canvas.addEventListener('touchmove', this.boundTouch, { passive: false });

        this.initialized = true;
        this.startLoop();
    }

    setupUI() {
        const rainBtn = document.getElementById('btn-toggle-rain');
        if (rainBtn) {
            rainBtn.addEventListener('click', () => {
                this.autoRain = !this.autoRain;
                rainBtn.classList.toggle('active', this.autoRain);
                rainBtn.innerHTML = `<span class="btn-icon">${this.autoRain ? '🌧️' : '☀️'}</span> 자동 물방울 (${this.autoRain ? 'ON' : 'OFF'})`;
            });
        }

        const themeGroup = document.getElementById('ripple-theme-group');
        if (themeGroup) {
            themeGroup.innerHTML = '';
            this.themes.forEach((th, idx) => {
                const btn = document.createElement('button');
                btn.className = `glass-pill-sm ${idx === this.currentThemeIdx ? 'active' : ''}`;
                btn.textContent = th.name;
                btn.addEventListener('click', () => {
                    this.currentThemeIdx = idx;
                    document.querySelectorAll('#ripple-theme-group .glass-pill-sm').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.addRipple(this.width / 2, this.height / 2, 1.2);
                    if (window.soundEngine) window.soundEngine.playWaterDrop(1.0);
                });
                themeGroup.appendChild(btn);
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

    initObjects() {
        this.fireflies = [];
        for (let i = 0; i < this.numFireflies; i++) {
            this.fireflies.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: 1.5 + Math.random() * 2.5,
                phase: Math.random() * Math.PI * 2,
                speed: 0.02 + Math.random() * 0.03
            });
        }

        // 연꽃 잎 3~5개 배치
        this.lotusLeaves = [
            { xRatio: 0.22, yRatio: 0.35, radius: 48, rot: 0.4, sway: 0 },
            { xRatio: 0.78, yRatio: 0.65, radius: 62, rot: -0.6, sway: 0 },
            { xRatio: 0.35, yRatio: 0.78, radius: 40, rot: 1.2, sway: 0 },
            { xRatio: 0.72, yRatio: 0.28, radius: 36, rot: 2.1, sway: 0 }
        ];
    }

    addRipple(x, y, intensity = 1.0, playSound = true) {
        if (this.ripples.length >= this.maxRipples) {
            this.ripples.shift();
        }

        this.ripples.push({
            x: x,
            y: y,
            radius: 4,
            maxRadius: 180 + intensity * 90,
            intensity: intensity,
            speed: 1.8 + intensity * 0.7,
            alpha: 0.85,
            width: 2.5 + intensity * 1.5
        });

        // 2차 잔물결 (약간의 지연 파동)
        setTimeout(() => {
            if (!this.initialized) return;
            this.ripples.push({
                x: x,
                y: y,
                radius: 2,
                maxRadius: 130 + intensity * 70,
                intensity: intensity * 0.65,
                speed: 1.4,
                alpha: 0.55,
                width: 2.0
            });
        }, 110);

        // 연꽃 잎 흔들림 반응
        this.lotusLeaves.forEach(leaf => {
            const lx = leaf.xRatio * this.width;
            const ly = leaf.yRatio * this.height;
            const d = Math.hypot(lx - x, ly - y);
            if (d < 180) {
                leaf.sway = 0.08 * (1 - d / 180) * intensity;
            }
        });

        if (playSound && window.soundEngine) {
            window.soundEngine.playWaterDrop(intensity);
        }
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.addRipple(x, y, 1.2, true);
    }

    onMouseMove(e) {
        const now = performance.now();
        if (now - this.lastMoveTime < 130) return; // 잔물결 발생 빈도 조절
        this.lastMoveTime = now;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.addRipple(x, y, 0.45, true);
    }

    onTouch(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.addRipple(x, y, 1.0, true);
            e.preventDefault();
        }
    }

    update() {
        // 자동 비 모드
        if (this.autoRain) {
            this.rainTimer++;
            if (this.rainTimer > 65 + Math.random() * 50) {
                const rx = Math.random() * this.width;
                const ry = Math.random() * this.height;
                this.addRipple(rx, ry, 0.6 + Math.random() * 0.7, true);
                this.rainTimer = 0;
            }
        }

        // 파동 확장 및 페이드아웃
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed;
            const progress = r.radius / r.maxRadius;
            r.alpha = Math.max(0, (1 - progress) * 0.85);

            if (r.radius >= r.maxRadius || r.alpha <= 0.01) {
                this.ripples.splice(i, 1);
            }
        }

        // 반딧불이 업데이트
        this.fireflies.forEach(f => {
            f.x += f.vx;
            f.y += f.vy;
            f.phase += f.speed;

            if (f.x < -10) f.x = this.width + 10;
            if (f.x > this.width + 10) f.x = -10;
            if (f.y < -10) f.y = this.height + 10;
            if (f.y > this.height + 10) f.y = -10;
        });

        // 연꽃 잎 감쇠
        this.lotusLeaves.forEach(leaf => {
            leaf.sway *= 0.94;
        });
    }

    draw() {
        if (!this.ctx) return;
        const theme = this.themes[this.currentThemeIdx];

        // 1. 깊은 수면 배경 그라데이션
        const bgGrad = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 40,
            this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.75
        );
        bgGrad.addColorStop(0, theme.bgGrad[2]);
        bgGrad.addColorStop(0.5, theme.bgGrad[1]);
        bgGrad.addColorStop(1, theme.bgGrad[0]);

        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. 연꽃 잎 렌더링
        this.drawLotusLeaves();

        // 3. 물결 파동 그리기 (동심원 굴절 하이라이트)
        this.ctx.save();
        for (let i = 0; i < this.ripples.length; i++) {
            const r = this.ripples[i];
            
            // 파동의 밝은 테두리
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `${theme.waveColor}${r.alpha})`;
            this.ctx.lineWidth = r.width;
            this.ctx.stroke();

            // 파동의 내부 부드러운 그림자 (입체 굴절 느낌)
            if (r.radius > 15) {
                this.ctx.beginPath();
                this.ctx.arc(r.x, r.y, r.radius - 3, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(0, 5, 20, ${r.alpha * 0.35})`;
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            }
        }
        this.ctx.restore();

        // 4. 몽환적인 반딧불이 그리기
        this.drawFireflies(theme);
    }

    drawLotusLeaves() {
        this.lotusLeaves.forEach(leaf => {
            const lx = leaf.xRatio * this.width;
            const ly = leaf.yRatio * this.height;
            const currentRot = leaf.rot + Math.sin(performance.now() * 0.002) * 0.05 + leaf.sway;

            this.ctx.save();
            this.ctx.translate(lx, ly);
            this.ctx.rotate(currentRot);

            // 그림자
            this.ctx.beginPath();
            this.ctx.arc(4, 6, leaf.radius, 0.25, Math.PI * 2 - 0.25);
            this.ctx.fillStyle = 'rgba(2, 8, 16, 0.4)';
            this.ctx.filter = 'blur(6px)';
            this.ctx.fill();
            this.ctx.filter = 'none';

            // 잎 본체
            this.ctx.beginPath();
            this.ctx.arc(0, 0, leaf.radius, 0.25, Math.PI * 2 - 0.25);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();

            const leafGrad = this.ctx.createRadialGradient(0, 0, 5, 0, 0, leaf.radius);
            leafGrad.addColorStop(0, '#2b6b55');
            leafGrad.addColorStop(0.7, '#1b4a3a');
            leafGrad.addColorStop(1, '#0e2b21');

            this.ctx.fillStyle = leafGrad;
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(78, 180, 140, 0.4)';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            // 잎맥 선
            for (let a = 0.5; a < Math.PI * 2 - 0.5; a += 0.7) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(Math.cos(a) * leaf.radius * 0.85, Math.sin(a) * leaf.radius * 0.85);
                this.ctx.strokeStyle = 'rgba(120, 220, 175, 0.22)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            // 잎 위 작은 물방울
            this.ctx.beginPath();
            this.ctx.arc(leaf.radius * 0.35, -leaf.radius * 0.2, 3.5, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    drawFireflies(theme) {
        this.ctx.save();
        this.fireflies.forEach(f => {
            const glow = (Math.sin(f.phase) + 1) / 2; // 0 ~ 1 깜빡임
            const alpha = 0.2 + glow * 0.65;

            // 광채
            const grad = this.ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 3.5);
            grad.addColorStop(0, theme.fireflyColor.replace('0.8', `${alpha}`));
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(f.x, f.y, f.size * 3.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 중심 핵
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(f.x, f.y, f.size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        });
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
            this.canvas.removeEventListener('mousedown', this.boundMouseDown);
            this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        }
        this.initialized = false;
    }
}

window.RippleMode = RippleMode;
