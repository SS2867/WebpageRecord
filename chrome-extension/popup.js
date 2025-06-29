class PopupVideoRecorder {
    constructor() {
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordings = [];
        this.currentRecording = null;
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.recordedVideos = document.getElementById('recordedVideos');
        this.helpTip = document.getElementById('helpTip');
        
        this.initializeEventListeners();
        this.loadRecordings();
        this.initializeHelpTip();
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://lijian316.github.io/record/index?auto=1' });
            window.close();
        });
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }

    initializeHelpTip() {
        // 添加帮助提示的折叠功能
        if (this.helpTip) {
            const toggleBtn = document.createElement('button');
            toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
            toggleBtn.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                cursor: pointer;
                color: #6c757d;
                font-size: 12px;
            `;
            
            let isCollapsed = false;
            const content = this.helpTip.querySelector('ul');
            
            toggleBtn.addEventListener('click', () => {
                isCollapsed = !isCollapsed;
                content.style.display = isCollapsed ? 'none' : 'block';
                toggleBtn.innerHTML = isCollapsed ? '<i class="bi bi-chevron-down"></i>' : '<i class="bi bi-chevron-up"></i>';
            });
            
            this.helpTip.style.position = 'relative';
            this.helpTip.appendChild(toggleBtn);
        }
    }

    async startRecording() {
        try {
            this.startBtn.disabled = true;
            
            // 请求屏幕共享权限
            const stream = await this.requestPermission();
            this.initializeRecorder(stream);
            this.recordedChunks = [];
            this.mediaRecorder.start(1000);
            
            // 创建当前录制项
            this.currentRecording = {
                id: Date.now(),
                timestamp: Date.now(),
                stream: stream
            };
            
            // 更新UI状态
            this.stopBtn.disabled = false;
            this.recordingStatus.style.display = 'inline-flex';
            this.recordingStatus.classList.add('active');
            
            // 显示实时预览
            this.displayRecording(this.currentRecording, true);
            
            // 发送消息到background script
            chrome.runtime.sendMessage({
                action: 'recordingStarted',
                recordingId: this.currentRecording.id
            });

        } catch (err) {
            console.error('开始录制失败:', err);
            this.handleRecordingError();
        }
    }

    async requestPermission() {
        try {
            // 显示提示信息
            this.showNotification('正在打开屏幕选择界面...', 'info');
            
            // 使用Chrome扩展的desktopCapture API
            const streamId = await new Promise((resolve, reject) => {
                chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], (streamId) => {
                    if (streamId) {
                        resolve(streamId);
                    } else {
                        reject(new Error('用户取消了屏幕选择'));
                    }
                });
            });

            // 显示获取媒体流提示
            this.showNotification('正在获取媒体流...', 'info');

            // 获取媒体流
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: streamId
                    }
                }
            });

            // 监听流结束事件
            stream.getTracks().forEach(track => {
                track.addEventListener('ended', () => {
                    console.log('Screen sharing stopped');
                    this.handleStreamEnded();
                });
            });

            // 隐藏提示信息
            this.hideNotification();

            return stream;
        } catch (err) {
            this.hideNotification();
            if (err.message.includes('用户取消了屏幕选择')) {
                this.showNotification('已取消屏幕选择', 'info');
            } else {
                throw new Error(`无法获取屏幕共享权限: ${err.message}`);
            }
        }
    }

    handleStreamEnded() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.stopRecording();
        }
        this.resetUI();
    }

    initializeRecorder(stream, mimeType = 'video/webm;codecs=vp9') {
        try {
            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                if (this.recordedChunks.length > 0) {
                    const blob = new Blob(this.recordedChunks, { type: mimeType });
                    this.addRecording(blob);
                }
                this.cleanup();
            };
        } catch (err) {
            throw new Error(`初始化录制器失败: ${err.message}`);
        }
    }

    stopRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
        
        try {
            this.mediaRecorder.stop();
            this.mediaStream?.getTracks().forEach(track => track.stop());
            
            this.resetUI();
            
            // 发送消息到background script
            chrome.runtime.sendMessage({
                action: 'recordingStopped',
                recordingId: this.currentRecording?.id
            });
            
        } catch (err) {
            console.error('停止录制时发生错误:', err);
            this.handleRecordingError();
        }
    }

    resetUI() {
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.recordingStatus.style.display = 'none';
        this.recordingStatus.classList.remove('active');
        
        // 移除实时预览
        if (this.currentRecording) {
            const liveItem = document.getElementById(`video-${this.currentRecording.id}`);
            if (liveItem) liveItem.remove();
        }
    }

    handleRecordingError() {
        this.resetUI();
        // 显示错误提示
        this.showNotification('录制失败，请重试', 'error');
    }

    addRecording(blob) {
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        const recording = {
            id: timestamp,
            url,
            blob,
            timestamp,
            filename: `recording-${timestamp}.webm`
        };
        
        this.recordings.push(recording);
        this.displayRecording(recording);
        this.saveRecordings();
        
        // 发送消息到background script保存文件
        chrome.runtime.sendMessage({
            action: 'saveRecording',
            recording: recording
        });
    }

    displayRecording(recording, isLive = false) {
        // 移除空状态
        const emptyState = this.recordedVideos.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.id = `video-${recording.id}`;

        // 左侧预览区域
        const previewSection = document.createElement('div');
        previewSection.className = 'video-preview';
        
        const video = document.createElement('video');
        if (isLive) {
            video.srcObject = recording.stream;
            video.muted = true;
            video.autoplay = true;
        } else {
            video.src = recording.url;
            video.muted = false;
            const playButton = document.createElement('div');
            playButton.className = 'play-button';
            playButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openVideoPlayer(recording.url);
            });
            previewSection.appendChild(playButton);
        }
        previewSection.appendChild(video);

        // 右侧信息区域
        const infoSection = document.createElement('div');
        infoSection.className = 'video-info';
        
        const timestamp = new Date(recording.timestamp).toLocaleString();
        const formattedTime = new Date(recording.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        infoSection.innerHTML = `
            <h3>录制时间：${timestamp}</h3>
            ${isLive ? '<p class="recording-status active">正在录制...</p>' : ''}
            <div class="time">${formattedTime}</div>
        `;

        if (!isLive) {
            const actions = document.createElement('div');
            actions.className = 'video-actions';

            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = '<i class="bi bi-download"></i> 下载';
            downloadBtn.onclick = (e) => {
                e.stopPropagation();
                this.downloadRecording(recording);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i> 删除';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteRecording(recording);
            };

            actions.appendChild(downloadBtn);
            actions.appendChild(deleteBtn);
            infoSection.appendChild(actions);
        }

        videoItem.appendChild(previewSection);
        videoItem.appendChild(infoSection);
        
        // 添加点击事件打开视频
        if (!isLive) {
            videoItem.addEventListener('click', () => {
                this.openVideoPlayer(recording.url);
            });
        }

        this.recordedVideos.insertBefore(videoItem, this.recordedVideos.firstChild);
    }

    downloadRecording(recording) {
        chrome.downloads.download({
            url: recording.url,
            filename: recording.filename,
            saveAs: true
        });
    }

    deleteRecording(recording) {
        if (confirm('确定要删除这个录制视频吗？')) {
            // 从数组中移除
            this.recordings = this.recordings.filter(r => r.id !== recording.id);
            
            // 从DOM中移除
            const videoItem = document.getElementById(`video-${recording.id}`);
            if (videoItem) {
                videoItem.remove();
            }
            
            // 释放URL对象
            URL.revokeObjectURL(recording.url);
            
            // 保存到存储
            this.saveRecordings();
            
            // 如果没有录制视频了，显示空状态
            if (this.recordings.length === 0) {
                this.showEmptyState();
            }
        }
    }

    openVideoPlayer(videoUrl) {
        // 在新标签页中打开视频播放器
        chrome.tabs.create({
            url: chrome.runtime.getURL('player.html') + '?video=' + encodeURIComponent(videoUrl)
        });
    }

    showEmptyState() {
        this.recordedVideos.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-camera-video-off"></i>
                <p>暂无录制视频<br>点击"开始录制"开始录制屏幕</p>
            </div>
        `;
    }

    async loadRecordings() {
        try {
            const result = await chrome.storage.local.get(['recordings']);
            if (result.recordings) {
                this.recordings = result.recordings;
                this.recordings.forEach(recording => {
                    this.displayRecording(recording);
                });
            }
        } catch (err) {
            console.error('加载录制记录失败:', err);
        }
    }

    async saveRecordings() {
        try {
            await chrome.storage.local.set({ recordings: this.recordings });
        } catch (err) {
            console.error('保存录制记录失败:', err);
        }
    }

    cleanup() {
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.currentRecording = null;
    }

    showNotification(message, type = 'info') {
        // 移除现有的通知
        this.hideNotification();
        
        // 创建新的通知
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.id = 'currentNotification';
        document.body.appendChild(notification);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            this.hideNotification();
        }, 3000);
    }

    hideNotification() {
        const notification = document.getElementById('currentNotification');
        if (notification) {
            notification.remove();
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new PopupVideoRecorder();
}); 