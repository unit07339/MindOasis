/**
 * Mode 1: 디지털 말랑이 (Squishy Toy)
 * 소프트바디(Soft-body) 질량-스프링-댐핑 물리 시뮬레이션 & 젤리 인터랙션
 */

class SquishyMode {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        this.initialized = false;

        // 물리 상수
        this.numPoints = 28;
        this.baseRadius = 140;
        this.center = { x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0 };
        this.points = [];
        
        // 인터랙션 상태
        this.isDragging = false;
        this.draggedPoint = null;
        this.mouse = { x: 0, y: 0, prevX: 0, prevY: 0, speed: 0 };
        this.squishAmount = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.expression = 'happy'; // 'happy', 'squished', 'surprised'

        // 젤리 테마 색상 (파스텔 톤)
        this.themes = [
            { name: 'Peach Pink', body: '#FF9AA2', inner: '#FFB7B2', shadow: '#E27B88', eye: '#4A3B4E' },
            { name: 'Sky Lavender', body: '#B5B9FF', inner: '#D0D4FF', shadow: '#969CFF', eye: '#3B3D66' },
            { name: 'Mint Breeze', body: '#88E5D0', inner: '#B7F5E8', shadow: '#65C2AD', eye: '#2C544B' },
            { name: 'Sunny Lemon', body: '#FFE082', inner: '#FFF1B0', shadow: '#E5C058', eye: '#5C4B23' },
            { name: 'Soft Coral', body: '#FFB385', inner: '#FFD3B6', shadow: '#E29062', eye: '#5E3823' }
        ];
        this.currentThemeIdx = 0;

        this.boundResize = this.resize.bind(this);
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        this.boundTouchStart = this.onTouchStart.bind(this);
        this.boundTouchMove = this.onTouchMove.bind(this);
        this.boundTouchEnd = this.onTouchEnd.bind(this);
    }

    init(container) {
        container.innerHTML = `
            <div class="mode-canvas-wrapper squishy-container">
                <canvas id="squishy-canvas"></canvas>
                <div class="mode-controls-overlay">
                    <div class="squishy-palette">
                        <span class="palette-label">말랑이 색상:</span>
                        <div class="palette-options" id="squishy-palette-options"></div>
                    </div>
                    <div class="mode-hint">마우스로 누르고 잡아당겨보세요! 놓으면 통통 튕깁니다.</div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('squishy-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.renderPaletteUI();
        this.resize();
        this.initPhysics();

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mouseup', this.boundMouseUp);

        this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        window.addEventListener('touchend', this.boundTouchEnd);

        this.initialized = true;
        this.startLoop();
    }

    renderPaletteUI() {
        const paletteContainer = document.getElementById('squishy-palette-options');
        if (!paletteContainer) return;
        paletteContainer.innerHTML = '';
        this.themes.forEach((th, idx) => {
            const btn = document.createElement('button');
            btn.className = `color-chip ${idx === this.currentThemeIdx ? 'active' : ''}`;
            btn.style.backgroundColor = th.body;
            btn.title = th.name;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentThemeIdx = idx;
                document.querySelectorAll('.squishy-palette .color-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (window.soundEngine) window.soundEngine.playSquishy(1.2);
            });
            paletteContainer.appendChild(btn);
        });
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

        this.center.targetX = this.width / 2;
        this.center.targetY = this.height / 2;

        if (!this.isDragging) {
            this.center.x = this.center.targetX;
            this.center.y = this.center.targetY;
        }
    }

    initPhysics() {
        this.points = [];
        this.center.x = this.width / 2;
        this.center.y = this.height / 2;
        this.center.targetX = this.center.x;
        this.center.targetY = this.center.y;
        this.center.vx = 0;
        this.center.vy = 0;

        for (let i = 0; i < this.numPoints; i++) {
            const angle = (i / this.numPoints) * Math.PI * 2;
            this.points.push({
                angle: angle,
                baseRadius: this.baseRadius,
                currentRadius: this.baseRadius,
                targetRadius: this.baseRadius,
                vx: 0,
                vy: 0,
                x: this.center.x + Math.cos(angle) * this.baseRadius,
                y: this.center.y + Math.sin(angle) * this.baseRadius
            });
        }
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this.startDrag(mx, my);
    }

    onTouchStart(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.touches[0].clientX - rect.left;
            const my = e.touches[0].clientY - rect.top;
            this.startDrag(mx, my);
            e.preventDefault();
        }
    }

    startDrag(mx, my) {
        const dx = mx - this.center.x;
        const dy = my - this.center.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= this.baseRadius * 1.35) {
            this.isDragging = true;
            this.mouse.x = mx;
            this.mouse.y = my;
            this.mouse.prevX = mx;
            this.mouse.prevY = my;
            this.expression = 'squished';

            // 클릭 지점 근처 버텍스에 변형 주기
            const clickAngle = Math.atan2(dy, dx);
            this.deformAt(clickAngle, -dist * 0.45);

            if (window.soundEngine) {
                window.soundEngine.playSquishy(0.8);
            }
        }
    }

    onMouseMove(e) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.handleMove(e.clientX - rect.left, e.clientY - rect.top);
    }

    onTouchMove(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            this.handleMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
            e.preventDefault();
        }
    }

    handleMove(mx, my) {
        this.mouse.prevX = this.mouse.x;
        this.mouse.prevY = this.mouse.y;
        this.mouse.x = mx;
        this.mouse.y = my;

        const vx = mx - this.mouse.prevX;
        const vy = my - this.mouse.prevY;
        this.mouse.speed = Math.hypot(vx, vy);

        if (this.isDragging) {
            // 드래그 시 중심점과 버텍스들을 마우스 방향으로 당김
            const pullDx = mx - this.center.targetX;
            const pullDy = my - this.center.targetY;
            const pullDist = Math.hypot(pullDx, pullDy);

            // 중심 이동 (고무줄처럼 팽팽해지도록 제약)
            const maxStretch = 180;
            const factor = Math.min(pullDist / maxStretch, 1);
            this.center.x = this.center.targetX + pullDx * 0.45;
            this.center.y = this.center.targetY + pullDy * 0.45;

            // 잡아당기는 방향의 점들은 늘어나고, 수직인 점들은 얇아짐 (부피 보존 시뮬레이션)
            const dragAngle = Math.atan2(pullDy, pullDx);
            for (let i = 0; i < this.points.length; i++) {
                const pt = this.points[i];
                let angleDiff = Math.abs(pt.angle - dragAngle);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                const alignment = Math.cos(angleDiff); // 1 = 같은 방향, -1 = 반대 방향
                if (alignment > 0) {
                    pt.targetRadius = this.baseRadius + pullDist * 0.4 * alignment;
                } else {
                    pt.targetRadius = Math.max(60, this.baseRadius - pullDist * 0.25 * (-alignment));
                }
            }

            if (pullDist > 100) {
                this.expression = 'surprised';
            } else {
                this.expression = 'squished';
            }
        }
    }

    onMouseUp() {
        this.endDrag();
    }

    onTouchEnd() {
        this.endDrag();
    }

    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.expression = 'happy';

            // 놓았을 때 튕겨나가는 바운스 속도 부여
            const pullDx = this.center.x - this.center.targetX;
            const pullDy = this.center.y - this.center.targetY;
            const dist = Math.hypot(pullDx, pullDy);

            this.center.vx = -pullDx * 0.35;
            this.center.vy = -pullDy * 0.35;

            // 각 점들에게 탄성 진동 충격파 부여
            for (let i = 0; i < this.points.length; i++) {
                const pt = this.points[i];
                pt.targetRadius = this.baseRadius;
                pt.currentRadius += (Math.random() - 0.5) * dist * 0.4;
            }

            if (window.soundEngine) {
                window.soundEngine.playSquishy(Math.min(dist / 80, 2.5));
            }
        }
    }

    deformAt(angle, amount) {
        for (let i = 0; i < this.points.length; i++) {
            const pt = this.points[i];
            let diff = Math.abs(pt.angle - angle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (diff < Math.PI / 2) {
                const influence = Math.cos(diff);
                pt.currentRadius += amount * influence;
            } else {
                // 반대쪽은 팽창 (볼륨 보존)
                const oppDiff = Math.PI - diff;
                const influence = Math.cos(oppDiff);
                pt.currentRadius -= (amount * 0.4) * influence;
            }
        }
    }

    updatePhysics() {
        // 중심 복원력 (스프링 + 댐핑)
        const springK = 0.085;
        const damping = 0.82;

        if (!this.isDragging) {
            const fx = (this.center.targetX - this.center.x) * springK;
            const fy = (this.center.targetY - this.center.y) * springK;
            this.center.vx = (this.center.vx + fx) * damping;
            this.center.vy = (this.center.vy + fy) * damping;
            this.center.x += this.center.vx;
            this.center.y += this.center.vy;
        }

        // 각 점의 반지름 물리 (원형 복원 + 인접 점 장력)
        const pointK = 0.12;
        const pointDamping = 0.84;

        for (let i = 0; i < this.points.length; i++) {
            const pt = this.points[i];
            if (!this.isDragging) {
                pt.targetRadius = this.baseRadius;
            }

            const prevPt = this.points[(i - 1 + this.points.length) % this.points.length];
            const nextPt = this.points[(i + 1) % this.points.length];
            const neighborAvg = (prevPt.currentRadius + nextPt.currentRadius) / 2;

            // 목표 반경 복원력 + 주변 점과의 스무딩 장력
            const force = (pt.targetRadius - pt.currentRadius) * pointK + (neighborAvg - pt.currentRadius) * 0.1;
            pt.vx = (pt.vx + force) * pointDamping;
            pt.currentRadius += pt.vx;

            // 실제 좌표 갱신
            pt.x = this.center.x + Math.cos(pt.angle) * pt.currentRadius;
            pt.y = this.center.y + Math.sin(pt.angle) * pt.currentRadius;
        }

        // 눈 깜빡임 타이머
        this.blinkTimer++;
        if (this.blinkTimer > 200 + Math.random() * 80) {
            this.isBlinking = true;
            if (this.blinkTimer > 215) {
                this.isBlinking = false;
                this.blinkTimer = 0;
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        const theme = this.themes[this.currentThemeIdx];

        // 1. 하단 부드러운 그림자 (바닥 접촉 느낌)
        const shadowY = this.height * 0.76;
        const shadowDist = shadowY - this.center.y;
        const shadowScale = Math.max(0.4, 1.2 - shadowDist / 350);
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.ellipse(this.center.x, shadowY, this.baseRadius * 1.1 * shadowScale, 18 * shadowScale, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(28, 35, 60, 0.16)';
        this.ctx.filter = 'blur(10px)';
        this.ctx.fill();
        this.ctx.restore();

        // 2. 젤리 소프트바디 외곽선 (부드러운 곡선 Bezier Spline)
        this.ctx.save();
        this.ctx.beginPath();
        const pts = this.points;
        const len = pts.length;

        // 곡선 닫힌 패스
        const startMidX = (pts[0].x + pts[len - 1].x) / 2;
        const startMidY = (pts[0].y + pts[len - 1].y) / 2;
        this.ctx.moveTo(startMidX, startMidY);

        for (let i = 0; i < len; i++) {
            const nextIdx = (i + 1) % len;
            const midX = (pts[i].x + pts[nextIdx].x) / 2;
            const midY = (pts[i].y + pts[nextIdx].y) / 2;
            this.ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        this.ctx.closePath();

        // 바디 젤리 그라데이션 채우기
        const grad = this.ctx.createRadialGradient(
            this.center.x - this.baseRadius * 0.3,
            this.center.y - this.baseRadius * 0.35,
            this.baseRadius * 0.15,
            this.center.x,
            this.center.y,
            this.baseRadius * 1.3
        );
        grad.addColorStop(0, theme.inner);
        grad.addColorStop(0.7, theme.body);
        grad.addColorStop(1, theme.shadow);

        this.ctx.fillStyle = grad;
        this.ctx.fill();

        // 은은한 외곽선 테두리
        this.ctx.strokeStyle = theme.shadow;
        this.ctx.lineWidth = 3.5;
        this.ctx.stroke();

        // 3. 젤리 상단 하이라이트 (Glossy Shine)
        this.ctx.beginPath();
        const hlX = this.center.x - this.baseRadius * 0.35;
        const hlY = this.center.y - this.baseRadius * 0.38;
        this.ctx.ellipse(hlX, hlY, this.baseRadius * 0.32, this.baseRadius * 0.18, -Math.PI / 5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        this.ctx.fill();

        // 작은 서브 하이라이트
        this.ctx.beginPath();
        this.ctx.arc(hlX + this.baseRadius * 0.38, hlY + this.baseRadius * 0.08, 9, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.fill();

        // 4. 귀여운 얼굴 표정 렌더링
        this.drawFace(theme);

        this.ctx.restore();
    }

    drawFace(theme) {
        // 시선 처리 (마우스 위치 바라보기)
        const eyeOffsetMax = 12;
        const dx = this.mouse.x - this.center.x;
        const dy = this.mouse.y - this.center.y;
        const dist = Math.hypot(dx, dy) || 1;
        const lookX = (dx / dist) * Math.min(eyeOffsetMax, dist * 0.05);
        const lookY = (dy / dist) * Math.min(eyeOffsetMax, dist * 0.05);

        const eyeSpacing = 42;
        const leftEyeX = this.center.x - eyeSpacing + lookX;
        const rightEyeX = this.center.x + eyeSpacing + lookX;
        const eyeY = this.center.y - 10 + lookY;

        this.ctx.fillStyle = theme.eye;
        this.ctx.strokeStyle = theme.eye;
        this.ctx.lineWidth = 3.5;
        this.ctx.lineCap = 'round';

        // 볼터치 (Blush)
        this.ctx.fillStyle = 'rgba(255, 100, 130, 0.32)';
        this.ctx.beginPath();
        this.ctx.ellipse(this.center.x - 55 + lookX, eyeY + 16, 14, 8, 0, 0, Math.PI * 2);
        this.ctx.ellipse(this.center.x + 55 + lookX, eyeY + 16, 14, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = theme.eye;

        // 눈 그리기
        if (this.isBlinking || this.expression === 'squished') {
            // > < 찡긋 감은 눈
            this.ctx.beginPath();
            this.ctx.moveTo(leftEyeX - 10, eyeY - 2);
            this.ctx.lineTo(leftEyeX, eyeY + 5);
            this.ctx.lineTo(leftEyeX + 10, eyeY - 2);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(rightEyeX - 10, eyeY - 2);
            this.ctx.lineTo(rightEyeX, eyeY + 5);
            this.ctx.lineTo(rightEyeX + 10, eyeY - 2);
            this.ctx.stroke();
        } else if (this.expression === 'surprised') {
            // O O 놀란 눈
            this.ctx.beginPath();
            this.ctx.arc(leftEyeX, eyeY, 8, 0, Math.PI * 2);
            this.ctx.arc(rightEyeX, eyeY, 8, 0, Math.PI * 2);
            this.ctx.fill();

            // 눈동자 하이라이트
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(leftEyeX - 2, eyeY - 2, 3, 0, Math.PI * 2);
            this.ctx.arc(rightEyeX - 2, eyeY - 2, 3, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // 행복한 둥근 눈
            this.ctx.beginPath();
            this.ctx.arc(leftEyeX, eyeY, 6.5, 0, Math.PI * 2);
            this.ctx.arc(rightEyeX, eyeY, 6.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 반짝이
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(leftEyeX - 2, eyeY - 2, 2.5, 0, Math.PI * 2);
            this.ctx.arc(rightEyeX - 2, eyeY - 2, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 입 그리기
        this.ctx.fillStyle = theme.eye;
        this.ctx.strokeStyle = theme.eye;
        this.ctx.lineWidth = 3.5;

        const mouthY = eyeY + 18;
        if (this.expression === 'surprised') {
            this.ctx.beginPath();
            this.ctx.ellipse(this.center.x + lookX, mouthY + 4, 7, 10, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (this.expression === 'squished') {
            this.ctx.beginPath();
            this.ctx.arc(this.center.x + lookX, mouthY - 4, 12, 0.2 * Math.PI, 0.8 * Math.PI);
            this.ctx.stroke();
        } else {
            // 방긋 웃는 입
            this.ctx.beginPath();
            this.ctx.arc(this.center.x + lookX, mouthY, 11, 0.15 * Math.PI, 0.85 * Math.PI);
            this.ctx.stroke();
        }
    }

    startLoop() {
        const loop = () => {
            this.updatePhysics();
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
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mouseup', this.boundMouseUp);
        window.removeEventListener('touchmove', this.boundTouchMove);
        window.removeEventListener('touchend', this.boundTouchEnd);
        this.initialized = false;
    }
}

window.SquishyMode = SquishyMode;
