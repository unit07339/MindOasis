/**
 * MindOasis Main SPA Controller
 * 모드 라우팅, 라이프사이클 관리, 내비게이션 및 심호흡 가이드
 */

class App {
    constructor() {
        this.currentModeKey = 'home';
        this.currentModeInstance = null;
        this.contentContainer = null;
        this.homeView = null;
        this.activeModeView = null;

        this.modes = {
            squishy: {
                title: '디지털 말랑이',
                sub: 'Squishy Toy',
                icon: '🧸',
                desc: '움푹 들어가고 고무줄처럼 팽팽하게 늘어나는 촉각적 젤리 바운스 시뮬레이션',
                tags: ['소프트바디 물리', '촉각 피드백', '귀여운 반응'],
                badge: '탄성 젤리',
                classRef: window.SquishyMode
            },
            ripple: {
                title: '고요한 물멍 파동',
                sub: 'Water Ripple',
                icon: '💧',
                desc: '어둡고 잔잔한 밤 호수 위에서 마우스 궤적에 따라 퍼져나가는 영롱한 물결과 물방울 소리',
                tags: ['수면 파동', '물방울 ASMR', '반딧불이'],
                badge: '명상 물멍',
                classRef: window.RippleMode
            },
            bubble: {
                title: '무한 뽁뽁이',
                sub: 'Bubble Wrap',
                icon: '🫧',
                desc: '스트레스를 시원하게 터뜨리는 찰진 톡톡 캡슐. 터진 뒤 3~4초 후 부드럽게 무한 자동 복구',
                tags: ['3D 에어캡', '무한 복구', '경쾌한 팝'],
                badge: '스트레스 킬러',
                classRef: window.BubbleMode
            },
            zen: {
                title: '디지털 모래 정원',
                sub: 'Zen Garden',
                icon: '🎋',
                desc: '가레산스이 모래 캔버스에 갈퀴로 가지런한 3D 고랑을 파며 마음을 비우는 정갈한 사색 공간',
                tags: ['모래결 엠보싱', '갈퀴 ASMR', '바위 배치'],
                badge: '마음챙김',
                classRef: window.ZenMode
            },
            stardust: {
                title: '오르골 별가루',
                sub: 'Stardust & Chimes',
                icon: '✨',
                desc: '깊은 밤하늘에 마우스를 저으면 피어오르는 찬란한 별가루 은하수와 맑고 영롱한 펜타토닉 오르골',
                tags: ['별가루 파티클', '오르골 펜타토닉', '별자리'],
                badge: '청각 치유',
                classRef: window.StardustMode
            }
        };
    }

    init() {
        this.contentContainer = document.getElementById('app-content');
        this.homeView = document.getElementById('home-view');
        this.activeModeView = document.getElementById('active-mode-view');

        this.setupNavigation();
        this.setupAudioControls();
        this.setupKeyboardShortcuts();
        this.renderHomeCards();
        this.startBreathingGuide();

        // 브라우저 해시 라우팅 처리
        window.addEventListener('hashchange', () => this.handleHashChange());
        this.handleHashChange();
    }

    setupNavigation() {
        // 홈 로고 버튼
        const homeBtn = document.getElementById('nav-logo-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                location.hash = '#home';
            });
        }

        // 모드 퀵 내비게이션 탭 버튼들
        document.querySelectorAll('.nav-mode-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetMode = link.dataset.mode;
                location.hash = `#${targetMode}`;
            });
        });
    }

    setupAudioControls() {
        const bgmBtn = document.getElementById('btn-global-bgm');
        const muteBtn = document.getElementById('btn-global-mute');
        const fsBtn = document.getElementById('btn-global-fullscreen');

        // BGM 버튼
        if (bgmBtn) {
            bgmBtn.addEventListener('click', () => {
                if (!window.soundEngine) return;
                const isPlaying = window.soundEngine.toggleBgm();
                bgmBtn.classList.toggle('active', isPlaying);
                bgmBtn.querySelector('.audio-label').textContent = isPlaying ? 'BGM 켜짐' : '힐링 BGM';
            });
        }

        // 음소거 토글
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                if (!window.soundEngine) return;
                const isMuted = window.soundEngine.toggleMute();
                muteBtn.classList.toggle('muted', isMuted);
                muteBtn.querySelector('.audio-icon').textContent = isMuted ? '🔇' : '🔊';
                muteBtn.querySelector('.audio-label').textContent = isMuted ? '음소거' : '소리 ON';
            });
        }

        // 전체화면 토글
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                    fsBtn.classList.add('active');
                } else {
                    document.exitFullscreen().catch(() => {});
                    fsBtn.classList.remove('active');
                }
            });
        }
    }

    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // 입력 폼에 포커스되어 있는 경우 무시
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            if (e.key === 'Escape' || e.key.toLowerCase() === 'h') {
                location.hash = '#home';
            } else if (e.key === '1') {
                location.hash = '#squishy';
            } else if (e.key === '2') {
                location.hash = '#ripple';
            } else if (e.key === '3') {
                location.hash = '#bubble';
            } else if (e.key === '4') {
                location.hash = '#zen';
            } else if (e.key === '5') {
                location.hash = '#stardust';
            } else if (e.key.toLowerCase() === 'm') {
                const muteBtn = document.getElementById('btn-global-mute');
                if (muteBtn) muteBtn.click();
            } else if (e.key.toLowerCase() === 'b') {
                const bgmBtn = document.getElementById('btn-global-bgm');
                if (bgmBtn) bgmBtn.click();
            }
        });
    }

    renderHomeCards() {
        const grid = document.getElementById('home-cards-grid');
        if (!grid) return;

        grid.innerHTML = '';
        Object.entries(this.modes).forEach(([key, mode], index) => {
            const card = document.createElement('div');
            card.className = 'healing-card';
            card.dataset.mode = key;

            card.innerHTML = `
                <div class="card-glow-bg"></div>
                <div class="card-header">
                    <span class="card-badge">${mode.badge}</span>
                    <span class="card-num">0${index + 1}</span>
                </div>
                <div class="card-icon-wrapper">
                    <span class="card-icon">${mode.icon}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${mode.title}</h3>
                    <div class="card-sub">${mode.sub}</div>
                    <p class="card-desc">${mode.desc}</p>
                </div>
                <div class="card-tags">
                    ${mode.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}
                </div>
                <div class="card-footer">
                    <span class="card-cta">체험하기 <span class="arrow">→</span></span>
                </div>
            `;

            card.addEventListener('click', () => {
                location.hash = `#${key}`;
                if (window.soundEngine) {
                    window.soundEngine.ensureContext();
                    window.soundEngine.playChime(index * 2, 0.8);
                }
            });

            grid.appendChild(card);
        });
    }

    startBreathingGuide() {
        const breathText = document.getElementById('breathing-guide-text');
        const breathCircle = document.getElementById('breathing-guide-circle');
        if (!breathText || !breathCircle) return;

        const cycle = [
            { text: '숨을 깊게 들이마시세요 (들숨)...', state: 'inhale', duration: 4000 },
            { text: '잠시 숨을 멈추고 고요함을 느껴보세요...', state: 'hold', duration: 4000 },
            { text: '입으로 천천히 내쉬며 긴장을 푸세요 (날숨)...', state: 'exhale', duration: 4000 }
        ];

        let step = 0;
        const nextStep = () => {
            const current = cycle[step];
            breathText.textContent = current.text;
            breathCircle.className = `breath-circle ${current.state}`;

            step = (step + 1) % cycle.length;
            setTimeout(nextStep, current.duration);
        };
        nextStep();
    }

    handleHashChange() {
        const hash = (location.hash || '#home').replace('#', '').trim();
        if (hash === 'home' || !this.modes[hash]) {
            this.showHome();
        } else {
            this.showMode(hash);
        }
    }

    showHome() {
        this.cleanupCurrentMode();
        this.currentModeKey = 'home';

        this.homeView.classList.remove('hidden');
        this.activeModeView.classList.add('hidden');
        this.activeModeView.innerHTML = '';

        this.updateNavActiveState('home');
        document.title = 'MindOasis - 종합 힐링 & 스트레스 해소 라운지';
    }

    showMode(modeKey) {
        const modeInfo = this.modes[modeKey];
        if (!modeInfo) return;

        this.cleanupCurrentMode();
        this.currentModeKey = modeKey;

        this.homeView.classList.add('hidden');
        this.activeModeView.classList.remove('hidden');
        this.activeModeView.innerHTML = `
            <div class="mode-view-header">
                <div class="mode-view-title-group">
                    <button class="back-home-btn" id="btn-back-home" title="홈으로 돌아가기">
                        <span class="back-arrow">←</span>
                        <span class="back-text">홈으로</span>
                    </button>
                    <div class="mode-view-info">
                        <h2 class="mode-view-title"><span class="mode-view-icon">${modeInfo.icon}</span> ${modeInfo.title}</h2>
                        <span class="mode-view-sub">${modeInfo.sub}</span>
                    </div>
                </div>
                <div class="mode-view-quick-nav">
                    ${Object.entries(this.modes).map(([k, m]) => `
                        <button class="mode-quick-chip ${k === modeKey ? 'active' : ''}" data-target="${k}" title="${m.title}">
                            <span>${m.icon}</span>
                            <span class="chip-name">${m.title.split(' ')[1] || m.title}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="mode-stage" id="mode-stage-container"></div>
        `;

        // 뒤로가기 버튼 리스너
        document.getElementById('btn-back-home').addEventListener('click', () => {
            location.hash = '#home';
        });

        // 퀵 칩 내비게이션
        document.querySelectorAll('.mode-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                location.hash = `#${chip.dataset.target}`;
            });
        });

        // 모드 인스턴스 초기화
        const stageContainer = document.getElementById('mode-stage-container');
        const ModeClass = modeInfo.classRef;
        if (ModeClass) {
            this.currentModeInstance = new ModeClass();
            this.currentModeInstance.init(stageContainer);
        }

        this.updateNavActiveState(modeKey);
        document.title = `${modeInfo.title} | MindOasis`;
    }

    cleanupCurrentMode() {
        if (this.currentModeInstance && typeof this.currentModeInstance.destroy === 'function') {
            try {
                this.currentModeInstance.destroy();
            } catch (e) {
                console.warn('Mode cleanup warning:', e);
            }
            this.currentModeInstance = null;
        }
    }

    updateNavActiveState(activeKey) {
        document.querySelectorAll('.nav-mode-link').forEach(link => {
            const isMatch = link.dataset.mode === activeKey;
            link.classList.toggle('active', isMatch);
        });
    }
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
