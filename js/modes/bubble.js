/**
 * Mode 3: 무한 뽁뽁이 (Digital Bubble Wrap)
 * 그리드 기반 실감나는 3D 에어캡 캡슐 + 경쾌한 톡톡 팝 사운드 + 자동 재생성
 */

class BubbleMode {
    constructor() {
        this.container = null;
        this.gridContainer = null;
        this.bubbles = [];
        this.isMouseDown = false;
        this.popCount = 0;
        this.respawnDelay = 3800; // 3.8초 후 복구
        this.initialized = false;

        this.boundMouseDown = () => { this.isMouseDown = true; };
        this.boundMouseUp = () => { this.isMouseDown = false; };
        this.boundTouchStart = () => { this.isMouseDown = true; };
        this.boundTouchEnd = () => { this.isMouseDown = false; };
        this.boundResize = this.generateGrid.bind(this);
    }

    init(container) {
        this.container = container;
        container.innerHTML = `
            <div class="bubble-mode-wrapper">
                <div class="bubble-top-bar">
                    <div class="bubble-stat-badge">
                        <span class="stat-icon">🫧</span>
                        <span class="stat-text">터뜨린 스트레스: <strong id="bubble-count-num">0</strong>개</span>
                    </div>
                    <div class="bubble-action-btns">
                        <button class="glass-pill-sm" id="btn-pop-all">⚡ 한 번에 다 터뜨리기</button>
                        <button class="glass-pill-sm" id="btn-reset-bubbles">🔄 모두 복구</button>
                    </div>
                </div>

                <div class="bubble-grid-scroll-area">
                    <div class="bubble-grid" id="bubble-grid"></div>
                </div>

                <div class="mode-controls-overlay">
                    <div class="mode-hint">마우스를 누른 채로 긁듯이 지나가면 연속으로 톡톡 터집니다! (3~4초 뒤 자동 복구)</div>
                </div>
            </div>
        `;

        this.gridContainer = document.getElementById('bubble-grid');
        this.setupButtons();
        this.generateGrid();

        window.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mouseup', this.boundMouseUp);
        window.addEventListener('touchstart', this.boundTouchStart);
        window.addEventListener('touchend', this.boundTouchEnd);
        window.addEventListener('resize', this.boundResize);

        this.initialized = true;
    }

    setupButtons() {
        const popAllBtn = document.getElementById('btn-pop-all');
        if (popAllBtn) {
            popAllBtn.addEventListener('click', () => {
                this.popAll();
            });
        }

        const resetBtn = document.getElementById('btn-reset-bubbles');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetAll();
            });
        }
    }

    generateGrid() {
        if (!this.gridContainer) return;
        this.gridContainer.innerHTML = '';
        this.bubbles = [];

        // 화면 크기에 맞추어 최적의 버블 수 자동 계산
        const rect = this.gridContainer.getBoundingClientRect();
        const bubbleSize = 64; // px
        const gap = 12;

        const cols = Math.max(4, Math.floor(rect.width / (bubbleSize + gap)));
        const rows = Math.max(4, Math.floor(rect.height / (bubbleSize + gap)));
        const total = cols * rows;

        this.gridContainer.style.gridTemplateColumns = `repeat(${cols}, ${bubbleSize}px)`;

        for (let i = 0; i < total; i++) {
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'bubble-item';
            bubbleEl.dataset.index = i;

            // 캡슐 내부 입체 광택 하이라이트 돔
            bubbleEl.innerHTML = `
                <div class="bubble-dome">
                    <div class="bubble-shine"></div>
                    <div class="bubble-shine-sub"></div>
                </div>
            `;

            const bubbleObj = {
                id: i,
                element: bubbleEl,
                isPopped: false,
                restoreTimeout: null
            };

            // 이벤트 핸들러
            bubbleEl.addEventListener('mouseenter', () => {
                if (this.isMouseDown && !bubbleObj.isPopped) {
                    this.popBubble(bubbleObj);
                }
            });

            bubbleEl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (!bubbleObj.isPopped) {
                    this.popBubble(bubbleObj);
                }
            });

            // 터치 드래그 지원
            bubbleEl.addEventListener('touchstart', (e) => {
                if (!bubbleObj.isPopped) {
                    this.popBubble(bubbleObj);
                }
            }, { passive: true });

            this.gridContainer.appendChild(bubbleEl);
            this.bubbles.push(bubbleObj);
        }

        // 터치 연속 스와이프를 위한 터치 무브 리스너
        this.gridContainer.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
            if (targetEl) {
                const bubbleEl = targetEl.closest('.bubble-item');
                if (bubbleEl) {
                    const idx = parseInt(bubbleEl.dataset.index, 10);
                    const b = this.bubbles[idx];
                    if (b && !b.isPopped) {
                        this.popBubble(b);
                    }
                }
            }
        }, { passive: true });
    }

    popBubble(bubbleObj) {
        if (bubbleObj.isPopped) return;
        bubbleObj.isPopped = true;

        // 시각 효과 클래스
        bubbleObj.element.classList.add('popped');

        // 사운드
        if (window.soundEngine) {
            window.soundEngine.playBubblePop();
        }

        // 터진 위치에 미니 스파크 파티클 생성
        this.createPopSparkles(bubbleObj.element);

        // 카운트 증가
        this.popCount++;
        const countEl = document.getElementById('bubble-count-num');
        if (countEl) countEl.textContent = this.popCount.toLocaleString();

        // 자동 서서히 원래 상태로 부풀어오름 복구 (3.8초)
        if (bubbleObj.restoreTimeout) clearTimeout(bubbleObj.restoreTimeout);
        bubbleObj.restoreTimeout = setTimeout(() => {
            if (!this.initialized) return;
            this.restoreBubble(bubbleObj);
        }, this.respawnDelay + Math.random() * 800);
    }

    restoreBubble(bubbleObj) {
        if (!bubbleObj.isPopped) return;
        bubbleObj.element.classList.remove('popped');
        bubbleObj.element.classList.add('restoring');

        setTimeout(() => {
            bubbleObj.element.classList.remove('restoring');
            bubbleObj.isPopped = false;
        }, 400);
    }

    createPopSparkles(targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 6; i++) {
            const spark = document.createElement('div');
            spark.className = 'bubble-sparkle';
            document.body.appendChild(spark);

            const angle = (i / 6) * Math.PI * 2;
            const dist = 18 + Math.random() * 16;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;

            spark.style.left = `${centerX}px`;
            spark.style.top = `${centerY}px`;
            spark.style.setProperty('--tx', `${tx}px`);
            spark.style.setProperty('--ty', `${ty}px`);

            setTimeout(() => {
                spark.remove();
            }, 450);
        }
    }

    popAll() {
        let delay = 0;
        this.bubbles.forEach((b, idx) => {
            if (!b.isPopped) {
                setTimeout(() => {
                    this.popBubble(b);
                }, delay);
                delay += 18; // 파도타기 터짐 연출
            }
        });
    }

    resetAll() {
        this.bubbles.forEach(b => {
            if (b.restoreTimeout) clearTimeout(b.restoreTimeout);
            this.restoreBubble(b);
        });
    }

    destroy() {
        window.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mouseup', this.boundMouseUp);
        window.removeEventListener('touchstart', this.boundTouchStart);
        window.removeEventListener('touchend', this.boundTouchEnd);
        window.removeEventListener('resize', this.boundResize);

        this.bubbles.forEach(b => {
            if (b.restoreTimeout) clearTimeout(b.restoreTimeout);
        });
        this.bubbles = [];
        this.initialized = false;
    }
}

window.BubbleMode = BubbleMode;
