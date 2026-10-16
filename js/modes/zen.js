/**
 * Mode 4: 디지털 모래 정원 (Zen Garden)
 * 일본 가레산스이(枯山水) 스타일의 모래 빗질 캔버스 + 입체 갈퀴 엠보싱 깊이감 + 바위 배치 & 모래 정리 ASMR
 */

class ZenMode {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.baseCanvas = null; // 모래 노이즈 배경 캐시
        this.initialized = false;

        this.isDrawing = false;
        this.lastX = null;
        this.lastY = null;
        this.rakeWidth = 5; // 갈퀴 날 개수 (3개 or 5개)
        this.spacing = 10;  // 빗살 간격
        this.currentTool = 'rake'; // 'rake' or 'stone'

        this.stones = [];
        this.boundResize = this.resize.bind(this);
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        this.boundTouchStart = this.onTouchStart.bind(this);
        this.boundTouchMove = this.onTouchMove.bind(this);
        this.boundTouchEnd = this.onTouchEnd.bind(this);
        this.lastRakeSoundTime = 0;
    }

    init(container) {
        container.innerHTML = `
            <div class="mode-canvas-wrapper zen-container">
                <canvas id="zen-canvas"></canvas>
                
                <!-- 상단 툴바 -->
                <div class="zen-top-tools">
                    <div class="zen-tool-group">
                        <button class="glass-pill-sm active" id="tool-rake-5">🎋 5줄 갈퀴</button>
                        <button class="glass-pill-sm" id="tool-rake-3">🌾 3줄 갈퀴</button>
                        <button class="glass-pill-sm" id="tool-add-stone">🪨 정원 바위 놓기</button>
                    </div>
                </div>

                <!-- 우측 하단 명상 & 초기화 컨트롤 -->
                <div class="zen-bottom-actions">
                    <button class="zen-clear-btn" id="btn-zen-clear">
                        <span class="clear-icon">🧹</span>
                        <span>모래 평평하게 고르기 (Clear)</span>
                    </button>
                </div>

                <div class="mode-controls-overlay">
                    <div class="mode-hint">마우스를 천천히 드래그해 모래 결(파동)을 그려보세요. 마음이 차분하게 정돈됩니다.</div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('zen-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.setupUI();
        this.resize();
        this.initDefaultStones();
        this.renderAll();

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mouseup', this.boundMouseUp);

        this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        window.addEventListener('touchend', this.boundTouchEnd);

        this.initialized = true;
    }

    setupUI() {
        const rake5Btn = document.getElementById('tool-rake-5');
        const rake3Btn = document.getElementById('tool-rake-3');
        const stoneBtn = document.getElementById('tool-add-stone');
        const clearBtn = document.getElementById('btn-zen-clear');

        const setActiveTool = (activeBtn) => {
            [rake5Btn, rake3Btn, stoneBtn].forEach(b => b && b.classList.remove('active'));
            activeBtn.classList.add('active');
        };

        if (rake5Btn) {
            rake5Btn.addEventListener('click', () => {
                this.currentTool = 'rake';
                this.rakeWidth = 5;
                this.spacing = 10;
                setActiveTool(rake5Btn);
            });
        }

        if (rake3Btn) {
            rake3Btn.addEventListener('click', () => {
                this.currentTool = 'rake';
                this.rakeWidth = 3;
                this.spacing = 13;
                setActiveTool(rake3Btn);
            });
        }

        if (stoneBtn) {
            stoneBtn.addEventListener('click', () => {
                this.currentTool = 'stone';
                setActiveTool(stoneBtn);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.smoothClearSand();
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

        this.createSandTexture();
        this.renderAll();
    }

    createSandTexture() {
        // 모래 미세 질감 생성
        this.baseCanvas = document.createElement('canvas');
        this.baseCanvas.width = this.width;
        this.baseCanvas.height = this.height;
        const bCtx = this.baseCanvas.getContext('2d');

        // 기본 모래 따뜻한 아이보리/베이지 톤
        bCtx.fillStyle = '#E5D9C5';
        bCtx.fillRect(0, 0, this.width, this.height);

        // 노이즈 모래 알갱이 레이어
        const imgData = bCtx.getImageData(0, 0, this.width, this.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 16;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));         // R
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.8)); // B
        }
        bCtx.putImageData(imgData, 0, 0);

        // 부드러운 음영 비네팅
        const grad = bCtx.createRadialGradient(
            this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.4,
            this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.8
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(100, 85, 65, 0.12)');
        bCtx.fillStyle = grad;
        bCtx.fillRect(0, 0, this.width, this.height);
    }

    initDefaultStones() {
        this.stones = [
            { x: this.width * 0.35, y: this.height * 0.45, rx: 38, ry: 28, rot: 0.3, color: '#4E535C' },
            { x: this.width * 0.42, y: this.height * 0.52, rx: 24, ry: 18, rot: -0.4, color: '#686F7A' },
            { x: this.width * 0.68, y: this.height * 0.38, rx: 42, ry: 32, rot: 1.1, color: '#3A3F47' }
        ];
    }

    renderAll() {
        if (!this.ctx || !this.baseCanvas) return;
        this.ctx.drawImage(this.baseCanvas, 0, 0, this.width, this.height);
        this.drawStones();
    }

    drawStones() {
        this.stones.forEach(stone => {
            this.ctx.save();
            this.ctx.translate(stone.x, stone.y);
            this.ctx.rotate(stone.rot);

            // 1. 바위 그림자
            this.ctx.beginPath();
            this.ctx.ellipse(8, 12, stone.rx * 1.1, stone.ry * 0.9, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(60, 50, 40, 0.35)';
            this.ctx.filter = 'blur(8px)';
            this.ctx.fill();
            this.ctx.filter = 'none';

            // 2. 바위 본체
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, stone.rx, stone.ry, 0, 0, Math.PI * 2);
            
            const stoneGrad = this.ctx.createRadialGradient(
                -stone.rx * 0.3, -stone.ry * 0.3, 4,
                0, 0, stone.rx
            );
            stoneGrad.addColorStop(0, '#868E96');
            stoneGrad.addColorStop(0.7, stone.color);
            stoneGrad.addColorStop(1, '#212529');

            this.ctx.fillStyle = stoneGrad;
            this.ctx.fill();

            // 3. 이끼 질감 (Zen Moss 포인트)
            this.ctx.beginPath();
            this.ctx.ellipse(stone.rx * 0.35, stone.ry * 0.2, stone.rx * 0.35, stone.ry * 0.25, 0.4, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(74, 110, 68, 0.7)';
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.startAction(x, y);
    }

    onTouchStart(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            this.startAction(x, y);
            e.preventDefault();
        }
    }

    startAction(x, y) {
        if (this.currentTool === 'stone') {
            // 바위 추가
            this.stones.push({
                x: x,
                y: y,
                rx: 26 + Math.random() * 20,
                ry: 20 + Math.random() * 14,
                rot: Math.random() * Math.PI,
                color: ['#4E535C', '#3A3F47', '#5C5549'][Math.floor(Math.random() * 3)]
            });
            this.renderAll();
            if (window.soundEngine) window.soundEngine.playSandRake(0.12);
        } else {
            // 갈퀴질 시작
            this.isDrawing = true;
            this.lastX = x;
            this.lastY = y;
        }
    }

    onMouseMove(e) {
        if (!this.isDrawing || this.currentTool !== 'rake') return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.drawRakeStroke(x, y);
    }

    onTouchMove(e) {
        if (!this.isDrawing || this.currentTool !== 'rake') return;
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            this.drawRakeStroke(x, y);
            e.preventDefault();
        }
    }

    onMouseUp() {
        this.isDrawing = false;
        this.lastX = null;
        this.lastY = null;
    }

    onTouchEnd() {
        this.isDrawing = false;
        this.lastX = null;
        this.lastY = null;
    }

    drawRakeStroke(currentX, currentY) {
        if (this.lastX === null || this.lastY === null) {
            this.lastX = currentX;
            this.lastY = currentY;
            return;
        }

        const dx = currentX - this.lastX;
        const dy = currentY - this.lastY;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) return;

        // 사운드 ASMR 재생
        const now = performance.now();
        if (now - this.lastRakeSoundTime > 90) {
            this.lastRakeSoundTime = now;
            if (window.soundEngine) window.soundEngine.playSandRake(0.09);
        }

        // 진행 방향의 법선 벡터 (수직 벡터)
        const nx = -dy / dist;
        const ny = dx / dist;

        const count = this.rakeWidth;
        const half = (count - 1) / 2;

        this.ctx.save();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // 3D 엠보싱 효과:
        // 깊이 파인 골(Shadow: 짙은 갈색) + 불룩 솟은 모래 둔덕(Highlight: 밝은 크림색)
        for (let i = 0; i < count; i++) {
            const offset = (i - half) * this.spacing;
            const p1x = this.lastX + nx * offset;
            const p1y = this.lastY + ny * offset;
            const p2x = currentX + nx * offset;
            const p2y = currentY + ny * offset;

            // 1. 파인 홈(그림자 선)
            this.ctx.beginPath();
            this.ctx.moveTo(p1x, p1y);
            this.ctx.lineTo(p2x, p2y);
            this.ctx.strokeStyle = 'rgba(138, 120, 95, 0.65)';
            this.ctx.lineWidth = 4.5;
            this.ctx.stroke();

            // 2. 홈 중심 깊은 골짜기
            this.ctx.beginPath();
            this.ctx.moveTo(p1x, p1y);
            this.ctx.lineTo(p2x, p2y);
            this.ctx.strokeStyle = 'rgba(85, 70, 52, 0.45)';
            this.ctx.lineWidth = 2.0;
            this.ctx.stroke();

            // 3. 솟아오른 둔덕 하이라이트 (빛이 위/왼쪽에서 비치는 느낌: 미세 오프셋)
            const hlOffset = offset + 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX + nx * hlOffset, this.lastY + ny * hlOffset);
            this.ctx.lineTo(currentX + nx * hlOffset, currentY + ny * hlOffset);
            this.ctx.strokeStyle = 'rgba(255, 252, 242, 0.55)';
            this.ctx.lineWidth = 2.5;
            this.ctx.stroke();
        }

        this.ctx.restore();

        // 바위 위에 모래가 그려지지 않도록 바위 다시 덧그리기
        this.drawStones();

        this.lastX = currentX;
        this.lastY = currentY;
    }

    smoothClearSand() {
        if (!this.ctx) return;
        if (window.soundEngine) window.soundEngine.playSandRake(0.4);

        // 부드러운 페이드 정돈 애니메이션
        let progress = 0;
        const animClear = () => {
            progress += 0.08;
            this.ctx.save();
            this.ctx.globalAlpha = 0.25;
            this.ctx.drawImage(this.baseCanvas, 0, 0, this.width, this.height);
            this.ctx.restore();

            if (progress < 1) {
                requestAnimationFrame(animClear);
            } else {
                this.renderAll();
            }
        };
        requestAnimationFrame(animClear);
    }

    destroy() {
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mouseup', this.boundMouseUp);
        window.removeEventListener('touchmove', this.boundTouchMove);
        window.removeEventListener('touchend', this.boundTouchEnd);
        this.initialized = false;
    }
}

window.ZenMode = ZenMode;
