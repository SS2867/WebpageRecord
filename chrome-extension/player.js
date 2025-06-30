class VideoPlayer {
    constructor() {
        this.video = document.getElementById('videoPlayer');
        this.videoTitle = document.getElementById('videoTitle');
        this.videoMeta = document.getElementById('videoMeta');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.controls = document.getElementById('controls');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.playBtn = document.getElementById('playBtn');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.closeBtn = document.getElementById('closeBtn');
        this.centerPlayBtn = document.getElementById('centerPlayBtn');
        
        this.videoData = null;
        this.isPlaying = false;
        this.videoLoaded = false;
        
        this.initializeEventListeners();
        
        // 显示加载状态
        this.videoTitle.textContent = '正在加载视频...';
        
        // 从存储中加载视频数据
        this.loadVideoFromStorage();
    }
    
    initializeEventListeners() {
        // 播放/暂停按钮
        this.playBtn.addEventListener('click', () => {
            this.togglePlay();
        });
        
        // 中央播放按钮
        this.centerPlayBtn.addEventListener('click', () => {
            this.togglePlay();
        });
        
        // 视频点击播放/暂停
        this.video.addEventListener('click', () => {
            this.togglePlay();
        });
        
        // 视频播放/暂停事件
        this.video.addEventListener('play', () => {
            this.isPlaying = true;
            this.playBtn.textContent = '⏸';
            this.centerPlayBtn.classList.remove('show');
        });
        
        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playBtn.textContent = '▶';
            this.centerPlayBtn.classList.add('show');
        });
        
        // 进度条点击
        this.progressBar.addEventListener('click', (e) => {
            const rect = this.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.video.currentTime = percent * this.video.duration;
        });
        
        // 视频时间更新
        this.video.addEventListener('timeupdate', () => {
            this.updateProgress();
            this.updateTimeDisplay();
        });
        
        // 视频加载完成
        this.video.addEventListener('loadedmetadata', () => {
            this.loading.style.display = 'none';
            this.updateTimeDisplay();
            // 初始状态显示中央播放按钮
            this.centerPlayBtn.classList.add('show');
        });
        
        // 视频加载错误
        this.video.addEventListener('error', () => {
            this.loading.style.display = 'none';
            this.error.style.display = 'block';
        });
        
        // 添加更多事件监听器来调试
        this.video.addEventListener('loadstart', () => {
            console.log('视频开始加载');
        });
        
        this.video.addEventListener('canplay', () => {
            console.log('视频可以播放');
            this.loading.style.display = 'none';
        });
        
        this.video.addEventListener('canplaythrough', () => {
            console.log('视频可以流畅播放');
        });
        
        this.video.addEventListener('loadeddata', () => {
            console.log('视频数据已加载');
            this.updateTimeDisplay(); // 再次更新时长显示
        });
        
        this.video.addEventListener('error', (e) => {
            console.error('视频加载错误:', e);
            this.loading.style.display = 'none';
            this.error.style.display = 'block';
        });
        
        // 全屏按钮
        this.fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // 关闭按钮
        this.closeBtn.addEventListener('click', () => {
            window.close();
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
                case 'KeyF':
                    this.toggleFullscreen();
                    break;
            }
        });
    }
    
    async loadVideoFromStorage() {
        try {
            const result = await chrome.storage.local.get(['tempVideoData']);
            
            if (result.tempVideoData) {
                this.loadVideoFromData(result.tempVideoData);
                // 清除临时数据
                chrome.storage.local.remove(['tempVideoData']);
            } else {
                this.showError('未找到视频数据');
            }
        } catch (error) {
            console.error('加载视频数据失败:', error);
            this.showError('加载视频数据失败');
        }
    }
    
    loadVideoFromData(videoData) {
        console.log('加载视频数据:', videoData);
        
        if (!videoData || !videoData.blobData) {
            this.showError('未找到视频数据');
            return;
        }
        
        // 设置视频信息
        this.videoTitle.textContent = videoData.title || '录制视频';
        
        if (videoData.timestamp) {
            const date = new Date(parseInt(videoData.timestamp));
            this.videoMeta.textContent = date.toLocaleString();
        }
        
        try {
            // 将 base64 转换为 Blob
            const byteString = atob(videoData.blobData.split(',')[1]);
            const mimeString = videoData.blobData.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            const blobUrl = URL.createObjectURL(blob);
            
            console.log('创建Blob URL:', blobUrl);
            
            // 加载视频
            this.video.src = blobUrl;
            this.video.load();
            
            // 保存blob URL用于下载
            this.videoBlobUrl = blobUrl;
            this.videoLoaded = true;
            
        } catch (error) {
            console.error('创建Blob URL失败:', error);
            this.showError('视频数据格式错误');
            return;
        }
    }
    
    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }
    
    updateProgress() {
        if (this.video.duration) {
            const percent = (this.video.currentTime / this.video.duration) * 100;
            this.progressFill.style.width = percent + '%';
        }
    }
    
    updateTimeDisplay() {
        const current = this.formatTime(this.video.currentTime);
        const total = this.formatTime(this.video.duration);
        
        // 检查时长是否有效
        if (isNaN(this.video.duration) || !isFinite(this.video.duration) || this.video.duration <= 0) {
            this.timeDisplay.textContent = current;
        } else {
            this.timeDisplay.textContent = `${current} / ${total}`;
        }
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
        
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.video.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    showError(message) {
        this.loading.style.display = 'none';
        this.error.style.display = 'block';
        this.error.querySelector('p').textContent = message;
    }
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    console.log('播放器页面加载完成');
    new VideoPlayer();
}); 