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
        this.recordedVideos = document.getElementById('history-list');
        this.helpTip = document.getElementById('helpTip');
        this.timerEl = document.getElementById('timer');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resumeBtn = document.getElementById('resumeBtn');
        this.statusText = document.getElementById('statusText');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
        
        this.initializeEventListeners();
        this.initializeHelpTip();
        
        // 设置默认状态
        this.updateUI('idle', 0);
        
        // 延迟加载最新的录制历史，确保 popup 完全加载
        setTimeout(() => {
            this.loadRecordings();
        }, 100);
        
        // 尝试同步状态，但不依赖它
        this.syncState();
        
        // 定期检查状态（每5秒检查一次，减少频率）
        this.statusCheckInterval = setInterval(() => {
            // 检查popup是否还打开
            if (document.visibilityState === 'visible') {
                this.syncState();
            }
        }, 5000);
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => {
            // 立即更新 UI 状态
            this.updateUI('recording', 0);
            this.startTimer(0); // 启动计时器
            
            // 发送开始录制消息给 background script
            chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                    // 即使 background script 未响应，也继续打开录制页面
                }
            });
            
            // 检查是否已有打开的录制页面
            chrome.tabs.query({}, (tabs) => {
                const existingTab = tabs.find(tab => 
                    tab.url && tab.url.includes('index.html')
                );
                
                if (existingTab) {
                    console.log('找到已存在的录制页面，激活并重新开始录制');
                    // 激活现有标签页
                    chrome.tabs.update(existingTab.id, { active: true });
                    // 发送重新开始录制消息
                    chrome.tabs.sendMessage(existingTab.id, { action: 'restartRecording' }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.log('录制页面未响应，刷新页面后重新开始');
                            // 如果页面没有响应，刷新页面并添加自动录制参数
                            chrome.tabs.reload(existingTab.id, { url: chrome.runtime.getURL('index.html?auto=1') });
                        }
                    });
                } else {
                    console.log('没有找到录制页面，创建新页面');
                    // 打开新的录制页面
                    chrome.tabs.create({ url: chrome.runtime.getURL('index.html?auto=1') });
                }
            });
            
            window.close();
        });
        
        this.stopBtn.addEventListener('click', () => {
            // 立即更新 UI 状态
            this.updateUI('idle', 0);
            this.stopTimer(); // 停止倒计时
            
            // 发送停止录制消息给 background script
            chrome.runtime.sendMessage({ action: 'stopRecording' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                }
            });
            
            // 不关闭页面，只停止录制
            // 可以通过消息通知录制页面停止录制
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.url && tab.url.includes('index.html')) {
                        // 发送消息给录制页面停止录制
                        chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.log('录制页面未响应:', chrome.runtime.lastError);
                            }
                        });
                    }
                });
            });
        });
        
        this.pauseBtn.addEventListener('click', () => {
            // 立即更新 UI 状态
            this.updateUI('paused', 0);
            
            chrome.runtime.sendMessage({ action: 'pauseRecording' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                }
            });
        });
        this.resumeBtn.addEventListener('click', () => {
            // 立即更新 UI 状态
            this.updateUI('recording', 0);
            
            chrome.runtime.sendMessage({ action: 'resumeRecording' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                }
            });
        });
        
        // 清空历史按钮
        this.clearHistoryBtn.addEventListener('click', () => {
            this.showCustomConfirm('确定要清空所有录制历史吗？此操作不可恢复。').then((confirmed) => {
                if (confirmed) {
                    this.clearAllRecordings();
                }
            });
        });
        
        // 刷新历史按钮
        this.refreshHistoryBtn.addEventListener('click', () => {
            this.loadRecordings();
        });
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
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                }
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
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                }
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
        const recording = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            size: blob.size,
            url: URL.createObjectURL(blob),
            filename: `录制视频_${new Date().toLocaleString()}.webm`,
            blob: blob
        };

        this.recordings.unshift(recording); // 添加到开头
        this.saveRecordings();
        this.displayRecording(recording, false, true);
    }

    displayRecording(recording, isLive = false, isNewRecording = false) {
        // 移除空状态显示
        const emptyState = this.recordedVideos.querySelector('.empty-history');
        if (emptyState) {
            emptyState.remove();
        }

        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.id = `video-${recording.id}`;

        // 第一行：视频标题
        const videoTitle = document.createElement('div');
        videoTitle.className = 'video-title';
        
        // 生成显示标题
        const generateDisplayTitle = (timestamp) => {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            const second = String(date.getSeconds()).padStart(2, '0');
            
            return `video_${year}${month}${day}_${hour}${minute}${second}`;
        };
        
        videoTitle.textContent = generateDisplayTitle(recording.timestamp);

        // 第二行：录制时间
        const videoMeta = document.createElement('div');
        videoMeta.className = 'video-meta';
        const dateStr = new Date(recording.timestamp).toLocaleString();
        videoMeta.textContent = dateStr;

        // 第三行：操作按钮
        const videoActions = document.createElement('div');
        videoActions.className = 'video-actions';

        if (!isLive) {
            // WebM下载按钮
            const webmBtn = document.createElement('button');
            webmBtn.className = 'action-btn download-webm';
            webmBtn.title = '下载 WebM 格式';
            webmBtn.textContent = 'WebM';
            webmBtn.onclick = (e) => {
                e.stopPropagation();
                this.downloadRecording(recording, 'webm');
            };

            // MP4下载按钮
            const mp4Btn = document.createElement('button');
            mp4Btn.className = 'action-btn download-mp4';
            mp4Btn.title = '下载 MP4 格式';
            mp4Btn.textContent = 'MP4';
            mp4Btn.onclick = (e) => {
                e.stopPropagation();
                this.downloadRecording(recording, 'mp4');
            };
            
            // 保存按钮引用，用于状态管理
            recording.mp4Button = mp4Btn;

            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.title = '删除';
            deleteBtn.textContent = '删除';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteRecording(recording);
            };

            videoActions.appendChild(webmBtn);
            videoActions.appendChild(mp4Btn);
            videoActions.appendChild(deleteBtn);
        }

        // 组装DOM结构
        videoItem.appendChild(videoTitle);
        videoItem.appendChild(videoMeta);
        videoItem.appendChild(videoActions);

        // 添加点击事件打开视频
        if (!isLive) {
            videoItem.addEventListener('click', () => {
                this.openVideoPlayer(recording.url);
            });
        }

        // 根据情况决定插入位置
        if (isNewRecording) {
            // 新增录制：插入到列表开头
            this.recordedVideos.insertBefore(videoItem, this.recordedVideos.firstChild);
        } else {
            // 加载历史记录：追加到列表末尾（因为已经按时间排序了）
            this.recordedVideos.appendChild(videoItem);
        }
    }

    downloadRecording(recording, format) {
        // 生成安全的文件名
        const generateSafeFilename = (timestamp, extension) => {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            const second = String(date.getSeconds()).padStart(2, '0');
            
            return `video_${year}${month}${day}_${hour}${minute}${second}.${extension}`;
        };

        if (format === 'webm') {
            // 如果有blobData，从base64创建Blob URL
            if (recording.blobData) {
                try {
                    // 将 base64 转换为 Blob
                    const byteString = atob(recording.blobData.split(',')[1]);
                    const mimeString = recording.blobData.split(',')[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    const blobUrl = URL.createObjectURL(blob);
                    
                    // 生成安全的文件名
                    const filename = generateSafeFilename(recording.timestamp, 'webm');
                    
                    // 下载文件
                    chrome.downloads.download({
                        url: blobUrl,
                        filename: filename,
                        saveAs: true
                    });
                    
                    // 清理URL
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                } catch (error) {
                    console.error('创建下载URL失败:', error);
                    alert('下载失败: ' + error.message);
                }
            } else if (recording.url) {
                // 生成安全的文件名
                const filename = generateSafeFilename(recording.timestamp, 'webm');
                
                // 直接下载 WebM 格式
                chrome.downloads.download({
                    url: recording.url,
                    filename: filename,
                    saveAs: true
                });
            } else {
                alert('无法下载：视频数据不可用');
            }
        } else if (format === 'mp4') {
            // 转换并下载 MP4 格式
            this.convertToMp4(recording);
        }
    }

    setConvertingState(recording, isConverting) {
        if (recording.mp4Button) {
            if (isConverting) {
                recording.mp4Button.classList.add('converting');
                recording.mp4Button.textContent = '转换中';
                recording.mp4Button.disabled = true;
            } else {
                recording.mp4Button.classList.remove('converting');
                recording.mp4Button.textContent = 'MP4';
                recording.mp4Button.disabled = false;
            }
        }
    }

    async convertToMp4(recording) {
        try {
            // 设置转换状态
            this.setConvertingState(recording, true);
            
            // 创建视频元素
            const videoElement = document.createElement('video');
            videoElement.crossOrigin = 'anonymous';
            videoElement.muted = true;
            videoElement.playsInline = true;
            
            // 准备视频源
            let videoSrc;
            if (recording.blobData) {
                // 从base64创建Blob URL
                const byteString = atob(recording.blobData.split(',')[1]);
                const mimeString = recording.blobData.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeString });
                videoSrc = URL.createObjectURL(blob);
            } else if (recording.url) {
                videoSrc = recording.url;
            } else {
                throw new Error('无法获取视频数据');
            }
            
            // 等待视频加载
            await new Promise((resolve, reject) => {
                videoElement.onloadedmetadata = resolve;
                videoElement.onerror = reject;
                videoElement.src = videoSrc;
            });
            
            // 创建 canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            
            // 创建 MediaRecorder
            const stream = canvas.captureStream(30); // 30fps
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            const chunks = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            
            // 开始录制
            mediaRecorder.start();
            videoElement.currentTime = 0;
            videoElement.play();
            
            // 绘制视频帧到 canvas
            const drawFrame = () => {
                if (!videoElement.paused && !videoElement.ended) {
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    requestAnimationFrame(drawFrame);
                }
            };
            drawFrame();
            
            // 等待视频播放完成
            await new Promise((resolve) => {
                videoElement.onended = () => {
                    mediaRecorder.stop();
                    resolve();
                };
            });
            
            // 等待录制完成
            await new Promise((resolve) => {
                mediaRecorder.onstop = () => {
                    const mp4Blob = new Blob(chunks, { type: 'video/mp4' });
                    
                    // 生成安全的文件名
                    const generateSafeFilename = (timestamp, extension) => {
                        const date = new Date(timestamp);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hour = String(date.getHours()).padStart(2, '0');
                        const minute = String(date.getMinutes()).padStart(2, '0');
                        const second = String(date.getSeconds()).padStart(2, '0');
                        
                        return `video_${year}${month}${day}_${hour}${minute}${second}.${extension}`;
                    };
                    
                    const filename = generateSafeFilename(recording.timestamp, 'mp4');
                    
                    // 下载MP4文件
                    const url = URL.createObjectURL(mp4Blob);
                    
                    chrome.downloads.download({
                        url: url,
                        filename: filename,
                        saveAs: true
                    });
                    
                    // 清理URL
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                        if (videoSrc && videoSrc !== recording.url) {
                            URL.revokeObjectURL(videoSrc);
                        }
                    }, 1000);
                    
                    resolve();
                };
            });
            
        } catch (error) {
            console.error('MP4 转换失败:', error);
            alert('MP4 转换失败: ' + error.message);
        } finally {
            // 恢复按钮状态
            this.setConvertingState(recording, false);
        }
    }

    deleteRecording(recording) {
        this.showCustomConfirm('确定要删除这个录制视频吗？').then((confirmed) => {
            if (confirmed) {
                // 从数组中移除
                this.recordings = this.recordings.filter(r => r.id !== recording.id);
                
                // 从DOM中移除
                const videoItem = document.getElementById(`video-${recording.id}`);
                if (videoItem) {
                    videoItem.remove();
                }
                
                // 释放URL对象
                if (recording.url) {
                    URL.revokeObjectURL(recording.url);
                }
                
                // 保存到存储
                this.saveRecordings();
                
                // 如果没有录制视频了，显示空状态
                if (this.recordings.length === 0) {
                    this.showEmptyState();
                }
            }
        });
    }

    clearAllRecordings() {
        // 释放所有URL对象
        this.recordings.forEach(recording => {
            if (recording.url) {
                URL.revokeObjectURL(recording.url);
            }
        });
        
        // 清空数组
        this.recordings = [];
        
        // 清空DOM
        this.recordedVideos.innerHTML = '';
        
        // 保存到存储
        this.saveRecordings();
        
        // 显示空状态
        this.showEmptyState();
    }

    openVideoPlayer(videoUrl) {
        // 从录制记录中找到对应的视频信息
        const recording = this.recordings.find(r => r.url === videoUrl);
        if (!recording) {
            console.error('未找到对应的录制记录');
            return;
        }
        
        // 将视频数据存储到临时存储中
        const tempVideoData = {
            title: `video_${new Date(recording.timestamp).toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')}`,
            timestamp: recording.timestamp,
            blobData: recording.blobData
        };
        
        chrome.storage.local.set({ tempVideoData }, () => {
            // 打开播放器页面
            const playerUrl = chrome.runtime.getURL('player.html');
            chrome.tabs.create({ url: playerUrl });
        });
    }

    showEmptyState() {
        this.recordedVideos.innerHTML = `
            <div class="empty-history">
                <i class="bi bi-camera-video-off"></i>
                <p>暂无录制视频</p>
                <p>开始录制后，视频将显示在这里</p>
            </div>
        `;
    }

    async loadRecordings() {
        try {
            const result = await chrome.storage.local.get(['recordings']);
            
            if (result.recordings && result.recordings.length > 0) {
                this.recordings = result.recordings;
                // 清空现有显示
                this.recordedVideos.innerHTML = '';
                
                // 按时间戳排序，最新的在前面
                const sortedRecordings = [...this.recordings].sort((a, b) => b.timestamp - a.timestamp);
                
                // 处理每个录制记录
                sortedRecordings.forEach((recording, index) => {
                    // 如果有 base64 数据，转换为 Blob URL
                    if (recording.blobData && !recording.url) {
                        // 将 base64 转换为 Blob
                        const byteString = atob(recording.blobData.split(',')[1]);
                        const mimeString = recording.blobData.split(',')[0].split(':')[1].split(';')[0];
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        const blob = new Blob([ab], { type: mimeString });
                        recording.url = URL.createObjectURL(blob);
                        recording.blob = blob; // 保存 blob 对象供下载使用
                    }
                    this.displayRecording(recording, false, false);
                });
            } else {
                this.showEmptyState();
            }
        } catch (err) {
            console.error('加载录制记录失败:', err);
            this.showEmptyState();
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
        
        // 清理定时器
        this.stopTimer();
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
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

    syncState() {
        chrome.runtime.sendMessage({ action: 'getStatus' }, (resp) => {
            if (chrome.runtime.lastError) {
                console.log('Background script 未响应，使用默认状态:', chrome.runtime.lastError);
                this.updateUI('idle', 0);
                return;
            }
            
            if (resp) {
                this.updateUI(resp.state, resp.elapsed);
                if (resp.state === 'recording') {
                    this.startTimer(resp.elapsed);
                    this.checkRecordingPage();
                } else {
                    this.stopTimer();
                }
            } else {
                this.updateUI('idle', 0);
            }
        });
    }

    checkRecordingPage() {
        chrome.tabs.query({}, (tabs) => {
            const recordingPageExists = tabs.some(tab => 
                tab.url && tab.url.includes('index.html')
            );
            
            if (!recordingPageExists && this.currentState === 'recording') {
                console.log('录制页面不存在，重置状态');
                this.updateUI('idle', 0);
                this.stopTimer();
            }
        });
    }

    updateUI(state, sec) {
        this.currentState = state;
        this.updateTimerUI(sec);
        
        if (state === 'idle') {
            this.startBtn.style.display = '';
            this.pauseBtn.style.display = 'none';
            this.resumeBtn.style.display = 'none';
            this.stopBtn.disabled = true;
            this.statusText.textContent = '等待录制';
            this.stopTimer(); // 停止计时器
        } else if (state === 'recording') {
            this.startBtn.style.display = 'none';
            this.pauseBtn.style.display = '';
            this.resumeBtn.style.display = 'none';
            this.stopBtn.disabled = false;
            this.statusText.textContent = '正在录制...';
            this.startTimer(sec); // 启动计时器
        } else if (state === 'paused') {
            this.startBtn.style.display = 'none';
            this.pauseBtn.style.display = 'none';
            this.resumeBtn.style.display = '';
            this.stopBtn.disabled = false;
            this.statusText.textContent = '已暂停';
            this.stopTimer(); // 暂停时停止计时器
        }
    }

    updateTimerUI(sec) {
        const h = String(Math.floor(sec / 3600)).padStart(2, '0');
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        this.timerEl.textContent = `${h}:${m}:${s}`;
    }

    startTimer(sec) {
        this.stopTimer(); // 先停止现有计时器
        let t = sec;
        this.timerInterval = setInterval(() => {
            t++;
            this.updateTimerUI(t);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showCustomConfirm(message, onConfirm) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'custom-confirm-overlay';
            
            const dialog = document.createElement('div');
            dialog.className = 'custom-confirm-dialog';
            
            dialog.innerHTML = `
                <div class="custom-confirm-title">确认删除</div>
                <div class="custom-confirm-message">${message}</div>
                <div class="custom-confirm-buttons">
                    <button class="custom-confirm-btn cancel">取消</button>
                    <button class="custom-confirm-btn confirm">删除</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // 绑定按钮事件
            const cancelBtn = dialog.querySelector('.cancel');
            const confirmBtn = dialog.querySelector('.confirm');
            
            const closeDialog = (result) => {
                document.body.removeChild(overlay);
                resolve(result);
            };
            
            cancelBtn.addEventListener('click', () => closeDialog(false));
            confirmBtn.addEventListener('click', () => closeDialog(true));
            
            // 点击遮罩层关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeDialog(false);
                }
            });
            
            // ESC键关闭
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    closeDialog(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const popup = new PopupVideoRecorder();
    
    // 监听 popup 关闭事件
    window.addEventListener('beforeunload', () => {
        popup.cleanup();
    });
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // popup 即将关闭，清理资源
            popup.cleanup();
        }
    });
}); 