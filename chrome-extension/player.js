class VideoPlayer {
    constructor() {
        this.video = document.getElementById('videoPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.playbackRate = document.getElementById('playbackRate');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.loading = document.getElementById('loading');
        this.errorMessage = document.getElementById('errorMessage');
        
        this.initializeEventListeners();
        this.loadVideoFromURL();
    }

    initializeEventListeners() {
        // 播放/暂停控制
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.video.addEventListener('click', () => this.togglePlayPause());
        
        // 播放速度控制
        this.playbackRate.addEventListener('change', (e) => {
            this.video.playbackRate = parseFloat(e.target.value);
        });
        
        // 进度条控制
        this.progressBar.addEventListener('click', (e) => {
            const rect = this.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.video.currentTime = pos * this.video.duration;
        });
        
        // 音量控制
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => {
            this.video.volume = e.target.value / 100;
            this.updateMuteButton();
        });
        
        // 全屏控制
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // 视频事件
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.video.addEventListener('ended', () => this.onVideoEnded());
        this.video.addEventListener('error', () => this.onVideoError());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    loadVideoFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('video');
        
        if (videoUrl) {
            this.video.src = decodeURIComponent(videoUrl);
            this.video.load();
        } else {
            this.showError('未找到视频文件');
        }
    }

    togglePlayPause() {
        if (this.video.paused) {
            this.video.play();
            this.playPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        } else {
            this.video.pause();
            this.playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
    }

    updateProgress() {
        if (this.video.duration) {
            const progress = (this.video.currentTime / this.video.duration) * 100;
            this.progressFill.style.width = `${progress}%`;
            this.updateTimeDisplay();
        }
    }

    updateTimeDisplay() {
        const currentTime = this.formatTime(this.video.currentTime);
        const duration = this.formatTime(this.video.duration);
        this.timeDisplay.textContent = `${currentTime} / ${duration}`;
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateMuteButton();
    }

    updateMuteButton() {
        if (this.video.muted || this.video.volume === 0) {
            this.muteBtn.innerHTML = '<i class="bi bi-volume-mute"></i>';
        } else if (this.video.volume < 0.5) {
            this.muteBtn.innerHTML = '<i class="bi bi-volume-down"></i>';
        } else {
            this.muteBtn.innerHTML = '<i class="bi bi-volume-up"></i>';
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.fullscreenBtn.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
        } else {
            document.exitFullscreen();
            this.fullscreenBtn.innerHTML = '<i class="bi bi-fullscreen"></i>';
        }
    }

    handleKeyboard(e) {
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.video.currentTime = Math.max(0, this.video.currentTime - 10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 10);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.video.volume = Math.min(1, this.video.volume + 0.1);
                this.volumeSlider.value = this.video.volume * 100;
                this.updateMuteButton();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.video.volume = Math.max(0, this.video.volume - 0.1);
                this.volumeSlider.value = this.video.volume * 100;
                this.updateMuteButton();
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'KeyF':
                e.preventDefault();
                this.toggleFullscreen();
                break;
        }
    }

    onVideoLoaded() {
        this.loading.style.display = 'none';
        this.errorMessage.style.display = 'none';
        this.updateTimeDisplay();
        this.updateMuteButton();
        
        // 自动播放
        this.video.play().then(() => {
            this.playPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        }).catch(err => {
            console.log('自动播放失败:', err);
        });
    }

    onVideoEnded() {
        this.playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
    }

    onVideoError() {
        this.loading.style.display = 'none';
        this.showError('视频加载失败');
    }

    showError(message) {
        this.errorMessage.innerHTML = `<i class="bi bi-exclamation-triangle"></i><br>${message}`;
        this.errorMessage.style.display = 'block';
    }
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    new VideoPlayer();
}); 