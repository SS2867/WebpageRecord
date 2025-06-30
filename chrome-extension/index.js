let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let isPaused = false;
let currentStream = null;
let videoList = [];
let recordingTimer = null;
let recordingStartTime = null;
let pausedTime = 0;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const status = document.getElementById('status');
const videoContainer = document.getElementById('videoContainer');
const preview = document.getElementById('preview');
const videoListContainer = document.getElementById('videoList');

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
pauseBtn.addEventListener('click', pauseRecording);
resumeBtn.addEventListener('click', resumeRecording);

// 页面加载时加载视频列表
loadVideoList();

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'stopRecording') {
        if (isRecording) {
            stopRecording();
        }
        sendResponse({ success: true });
    } else if (message.action === 'pauseRecording') {
        if (isRecording && !isPaused) {
            pauseRecording();
        }
        sendResponse({ success: true });
    } else if (message.action === 'resumeRecording') {
        if (isRecording && isPaused) {
            resumeRecording();
        }
        sendResponse({ success: true });
    } else if (message.action === 'restartRecording') {
        // 如果当前正在录制，先停止
        if (isRecording) {
            stopRecording();
        }
        // 等待一小段时间后重新开始录制
        setTimeout(() => {
            startRecording();
        }, 500);
        sendResponse({ success: true });
    }
    
    return true; // 保持消息通道开放
});

// 自动录制逻辑
function autoStartRecording() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto') === '1' && !isRecording) {
        console.log('检测到自动录制参数，检查background状态');
        
        // 先检查background是否已经在录制
        chrome.runtime.sendMessage({ action: 'getStatus' }, (resp) => {
            if (chrome.runtime.lastError) {
                console.log('Background script 未响应:', chrome.runtime.lastError);
                return;
            }
            
            if (resp && resp.state === 'recording') {
                console.log('Background显示正在录制，跳过自动录制');
                return;
            }
            
            console.log('Background状态为空闲，开始自动录制');
            const tryClick = () => {
                if (startBtn && !startBtn.disabled && !isRecording) {
                    startBtn.click();
                } else if (!isRecording) {
                    setTimeout(tryClick, 200);
                }
            };
            tryClick();
        });
    }
}

// 页面加载时执行自动录制
window.addEventListener('DOMContentLoaded', () => {
    // 先检查是否已经在录制
    chrome.runtime.sendMessage({ action: 'getStatus' }, (resp) => {
        if (chrome.runtime.lastError) {
            console.log('Background script 未响应:', chrome.runtime.lastError);
            // 如果无法获取状态，执行默认的自动录制逻辑
            autoStartRecording();
            return;
        }
        
        if (resp && resp.state === 'recording') {
            console.log('检测到正在录制，显示录制状态');
            // 如果正在录制，更新UI显示录制状态
            isRecording = true;
            recordingStartTime = Date.now() - (resp.elapsed * 1000);
            startBtn.disabled = true;
            startBtn.style.display = 'none';
            pauseBtn.style.display = '';
            resumeBtn.style.display = 'none';
            stopBtn.disabled = false;
            status.textContent = `正在录制中... ${formatDuration(resp.elapsed)}`;
            status.className = 'recorder-status status-recording';
            
            // 启动录制时长计时器
            recordingTimer = setInterval(updateRecordingTime, 1000);
        } else if (resp && resp.state === 'paused') {
            console.log('检测到录制已暂停，显示暂停状态');
            // 如果录制已暂停，更新UI显示暂停状态
            isRecording = true;
            isPaused = true;
            recordingStartTime = Date.now() - (resp.elapsed * 1000);
            startBtn.disabled = true;
            startBtn.style.display = '';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = '';
            stopBtn.disabled = false;
            status.textContent = '录制已暂停';
            status.className = 'recorder-status status-ready';
        } else {
            // 如果没有录制，执行自动录制逻辑
            autoStartRecording();
        }
    });
});

// 监听页面可见性变化，当页面重新激活时检查是否需要重新录制
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isRecording) {
        // 页面重新可见且当前没有录制时，检查是否需要自动录制
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auto') === '1') {
            console.log('页面重新激活，检查background状态');
            
            // 先检查background是否已经在录制
            chrome.runtime.sendMessage({ action: 'getStatus' }, (resp) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                    return;
                }
                
                if (resp && resp.state === 'recording') {
                    console.log('Background显示正在录制，跳过自动录制');
                    return;
                }
                
                console.log('Background状态为空闲，延迟执行自动录制');
                setTimeout(autoStartRecording, 1000); // 延迟1秒执行
            });
        }
    }
});

function notifyBackground(action) {
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Background script 未响应:', chrome.runtime.lastError);
            }
        });
    }
}

// 格式化录制时长
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 更新录制时长显示
function updateRecordingTime() {
    if (isRecording && recordingStartTime) {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        status.textContent = `正在录制中... ${formatDuration(elapsed)}`;
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: true
        });

        currentStream = stream;
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, {
                type: 'video/webm'
            });
            
            if (recordedChunks.length === 0) {
                console.error('录制数据为空，无法保存');
                return;
            }
            
            if (blob.size === 0) {
                console.error('录制的 Blob 大小为0，无法保存');
                return;
            }
            
            // 停止实时预览，显示录制结果
            preview.srcObject = null;
            preview.src = URL.createObjectURL(blob);
            preview.controls = true;
            preview.muted = false;
            videoContainer.style.display = 'block';
            
            // 保存blob用于下载
            preview.dataset.blob = blob;

            // 添加到视频列表
            addVideoToList(blob);

            // 通知background录制已停止
            notifyBackground('stopRecording');
            
            // 通知插件保存录制历史
            const generateVideoFilename = () => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hour = String(now.getHours()).padStart(2, '0');
                const minute = String(now.getMinutes()).padStart(2, '0');
                const second = String(now.getSeconds()).padStart(2, '0');
                
                return `video_${year}${month}${day}_${hour}${minute}${second}`;
            };
            
            const recordingData = {
                id: Date.now() + Math.random(),
                timestamp: Date.now(),
                size: blob.size,
                filename: generateVideoFilename(),
                blob: blob
            };
            
            // 将 Blob 转换为 base64 字符串后再发送
            const reader = new FileReader();
            reader.onload = () => {
                const messageData = {
                    action: 'saveRecordingToHistory',
                    recording: {
                        ...recordingData,
                        blobData: reader.result, // base64 字符串
                        blob: null // 移除 blob 对象
                    }
                };
                
                // 添加重试机制
                let retryCount = 0;
                const maxRetries = 3;
                
                const saveRecording = () => {
                    chrome.runtime.sendMessage(messageData, (response) => {
                        if (chrome.runtime.lastError) {
                            if (retryCount < maxRetries) {
                                retryCount++;
                                setTimeout(saveRecording, 1000); // 1秒后重试
                            }
                        }
                    });
                };
                
                saveRecording();
            };
            
            reader.onerror = (error) => {
                console.error('Blob 转换为 base64 失败:', error);
            };
            
            reader.readAsDataURL(blob);
        };

        // 监听流结束事件（用户点击停止分享）
        stream.getVideoTracks()[0].onended = () => {
            console.log('用户停止了屏幕分享');
            if (isRecording) {
                stopRecording();
            }
        };

        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();
        
        // 通知popup真正开始录制
        chrome.runtime.sendMessage({ action: 'recordingStarted' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Background script 未响应:', chrome.runtime.lastError);
            }
        });
        
        // 开始实时预览
        preview.srcObject = stream;
        preview.muted = true;
        preview.autoplay = true;
        preview.controls = false;
        videoContainer.style.display = 'block';
        
        // 确保视频开始播放
        preview.play().catch(e => {
            console.log('自动播放失败，用户需要手动点击:', e);
        });
        
        // 启动录制时长计时器
        recordingTimer = setInterval(updateRecordingTime, 1000);
        
        startBtn.disabled = true;
        startBtn.style.display = 'none';
        pauseBtn.style.display = '';
        resumeBtn.style.display = 'none';
        stopBtn.disabled = false;
        
        status.textContent = '正在录制中... 00:00:00';
        status.className = 'recorder-status status-recording';

        // 通知background录制已开始
        notifyBackground('startRecording');
        
    } catch (error) {
        // 区分不同类型的错误
        if (error.name === 'NotAllowedError' || error.name === 'NotReadableError') {
            // 用户取消了屏幕选择或权限被拒绝
            console.log('用户取消了屏幕选择或权限被拒绝');
            
            // 通知popup录制已停止（用户取消）
            chrome.runtime.sendMessage({ action: 'recordingStopped' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                }
            });
            
            // 不显示错误提示，因为这是用户主动取消
        } else {
            // 其他错误显示提示
            alert('录制失败: ' + error.message);
        }
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        
        // 停止所有轨道
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        
        // 停止录制时长计时器
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        
        isRecording = false;
        isPaused = false; // 重置暂停状态
        recordingStartTime = null;
        pausedTime = 0;
        startBtn.disabled = false;
        startBtn.style.display = '';
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        stopBtn.disabled = true;
        
        status.textContent = '录制完成';
        status.className = 'recorder-status status-ready';
        
        // 通知popup录制已停止
        chrome.runtime.sendMessage({ action: 'recordingStopped' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Background script 未响应:', chrome.runtime.lastError);
            }
        });
        
        // 通知background录制已停止（兜底）
        notifyBackground('stopRecording');
    }
}

function pauseRecording() {
    if (mediaRecorder && isRecording && !isPaused) {
        try {
            mediaRecorder.pause();
            isPaused = true;
            pausedTime = Date.now();
            
            // 停止录制时长计时器
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }
            
            startBtn.disabled = true;
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = '';
            stopBtn.disabled = false;
            
            status.textContent = '录制已暂停';
            status.className = 'recorder-status status-ready';
            
            // 通知background录制已暂停
            chrome.runtime.sendMessage({ action: 'recordingPaused' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                }
            });
            
            console.log('录制已暂停');
        } catch (error) {
            console.error('暂停录制失败:', error);
        }
    }
}

function resumeRecording() {
    if (mediaRecorder && isRecording && isPaused) {
        try {
            mediaRecorder.resume();
            isPaused = false;
            
            // 调整录制开始时间，补偿暂停的时间
            const pauseDuration = Date.now() - pausedTime;
            recordingStartTime += pauseDuration;
            pausedTime = 0;
            
            // 重新启动录制时长计时器
            recordingTimer = setInterval(updateRecordingTime, 1000);
            
            startBtn.disabled = true;
            startBtn.style.display = '';
            pauseBtn.style.display = '';
            resumeBtn.style.display = 'none';
            stopBtn.disabled = false;
            
            status.textContent = '正在录制中...';
            status.className = 'recorder-status status-recording';
            
            // 通知background录制已恢复
            chrome.runtime.sendMessage({ action: 'recordingResumed' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script 未响应:', chrome.runtime.lastError);
                }
            });
            
            console.log('录制已恢复');
        } catch (error) {
            console.error('恢复录制失败:', error);
        }
    }
}

function addVideoToList(blob) {
    const generateVideoName = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        
        return `video_${year}${month}${day}_${hour}${minute}${second}`;
    };
    
    const videoItem = {
        id: Date.now() + Math.random(),
        name: generateVideoName(),
        blob: blob,
        size: blob.size,
        date: new Date().toISOString(),
        url: URL.createObjectURL(blob),
        converting: false
    };

    videoList.unshift(videoItem);
    saveVideoList();
    updateVideoListDisplay();
}

function updateVideoListDisplay() {
    if (videoList.length === 0) {
        videoListContainer.innerHTML = `
            <div class="no-videos">
                <p>暂无录制视频</p>
                <p>开始录制后，视频将显示在这里</p>
            </div>
        `;
        return;
    }

    videoListContainer.innerHTML = '';
    videoList.forEach(video => {
        const videoItemDiv = document.createElement('div');
        videoItemDiv.className = 'video-item';
        videoItemDiv.dataset.id = video.id;

        // 缩略图
        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'video-thumbnail';
        const thumbVideo = document.createElement('video');
        thumbVideo.src = video.url;
        thumbVideo.muted = true;
        thumbVideo.addEventListener('loadedmetadata', function() {
            if (this.duration && isFinite(this.duration) && this.duration > 0) {
                this.currentTime = this.duration / 2;
            }
        });
        thumbDiv.appendChild(thumbVideo);
        videoItemDiv.appendChild(thumbDiv);

        // 信息
        const infoDiv = document.createElement('div');
        infoDiv.className = 'video-info';
        const titleDiv = document.createElement('div');
        titleDiv.className = 'video-title';
        titleDiv.textContent = video.name;
        const metaDiv = document.createElement('div');
        metaDiv.className = 'video-meta';
        metaDiv.textContent = `${formatFileSize(video.size)} • ${new Date(video.date).toLocaleString()}`;
        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(metaDiv);
        videoItemDiv.appendChild(infoDiv);

        // 操作按钮
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'video-actions';

        // WebM下载按钮
        const webmBtn = document.createElement('button');
        webmBtn.className = 'btn btn-small';
        webmBtn.title = '下载WebM格式';
        webmBtn.textContent = 'WebM';
        webmBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            downloadVideoFromList(video.id, 'webm');
        });
        actionsDiv.appendChild(webmBtn);

        // MP4下载按钮
        const mp4Btn = document.createElement('button');
        mp4Btn.className = 'btn btn-small btn-success';
        if (video.converting) mp4Btn.classList.add('btn-loading');
        mp4Btn.title = '转换为MP4格式';
        mp4Btn.textContent = video.converting ? '转换中...' : 'MP4';
        mp4Btn.disabled = !!video.converting;
        mp4Btn.addEventListener('click', function(event) {
            event.stopPropagation();
            downloadVideoFromList(video.id, 'mp4');
        });
        actionsDiv.appendChild(mp4Btn);

        // 删除按钮
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-icon btn-secondary';
        delBtn.title = '删除';
        delBtn.textContent = '🗑️';
        delBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            deleteVideo(video.id);
        });
        actionsDiv.appendChild(delBtn);

        videoItemDiv.appendChild(actionsDiv);

        // 点击播放
        videoItemDiv.addEventListener('click', function() {
            playVideo(video.id);
        });

        videoListContainer.appendChild(videoItemDiv);
    });

    // 高亮当前播放项
    document.querySelectorAll('.video-item').forEach(item => {
        item.classList.remove('active');
    });
    if (preview.dataset.blob) {
        const current = videoList.find(v => v.blob === preview.dataset.blob);
        if (current) {
            const activeItem = document.querySelector(`.video-item[data-id="${current.id}"]`);
            if (activeItem) activeItem.classList.add('active');
        }
    }
}

function playVideo(videoId) {
    const video = videoList.find(v => v.id == videoId);
    if (video) {
        preview.src = video.url;
        videoContainer.style.display = 'block';
        preview.dataset.blob = video.blob;
        
        // 更新活动状态
        document.querySelectorAll('.video-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-id="${videoId}"]`).classList.add('active');
    }
}

function downloadVideoFromList(videoId, format) {
    const video = videoList.find(v => v.id == videoId);
    if (!video) return;

    if (format === 'webm') {
        // 直接下载WebM格式
        const url = URL.createObjectURL(video.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = video.name + '.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else if (format === 'mp4') {
        // 转换并下载MP4格式
        convertToMp4(video, videoId);
    }
}

async function convertToMp4(video, videoId) {
    try {
        // 设置转换状态
        video.converting = true;
        updateVideoListDisplay();

        // 创建视频元素
        const videoElement = document.createElement('video');
        videoElement.crossOrigin = 'anonymous';
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        // 等待视频加载
        await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = resolve;
            videoElement.onerror = reject;
            videoElement.src = video.url;
        });

        // 创建canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        // 创建MediaRecorder
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
        videoElement.play();

        // 绘制视频帧到canvas
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
                
                // 下载MP4文件
                const url = URL.createObjectURL(mp4Blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = video.name.replace('.webm', '.mp4');
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                resolve();
            };
        });

        // 重置转换状态
        video.converting = false;
        updateVideoListDisplay();

    } catch (error) {
        console.error('MP4转换失败:', error);
        alert('MP4转换失败，请尝试下载WebM格式');
        
        // 重置转换状态
        video.converting = false;
        updateVideoListDisplay();
    }
}

function deleteVideo(videoId) {
    if (confirm('确定要删除这个视频吗？')) {
        const index = videoList.findIndex(v => v.id == videoId);
        if (index > -1) {
            // 如果删除的是当前播放的视频，清除播放器
            if (preview.dataset.blob === videoList[index].blob) {
                clearVideo();
            }
            
            // 释放URL对象
            URL.revokeObjectURL(videoList[index].url);
            
            videoList.splice(index, 1);
            saveVideoList();
            updateVideoListDisplay();
        }
    }
}

function clearVideo() {
    if (preview.src) {
        URL.revokeObjectURL(preview.src);
        preview.src = '';
        videoContainer.style.display = 'none';
        preview.dataset.blob = null;
        
        document.querySelectorAll('.video-item').forEach(item => {
            item.classList.remove('active');
        });
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function saveVideoList() {
    // 注意：这里只保存元数据，不保存实际的blob数据
    const metadata = videoList.map(video => ({
        id: video.id,
        name: video.name,
        size: video.size,
        date: video.date
    }));
    localStorage.setItem('videoList', JSON.stringify(metadata));
}

function loadVideoList() {
    const saved = localStorage.getItem('videoList');
    if (saved) {
        try {
            const metadata = JSON.parse(saved);
            // 注意：这里只能恢复元数据，实际的blob数据需要用户重新录制
            console.log('已保存的视频元数据:', metadata);
        } catch (error) {
            console.error('加载视频列表失败:', error);
        }
    }
}

function scrollToRecorder() {
    document.querySelector('.web-recorder').scrollIntoView({
        behavior: 'smooth'
    });
}

// 检查浏览器兼容性
if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    alert('您的浏览器不支持屏幕录制功能，请使用Chrome、Firefox或Edge浏览器。');
    startBtn.disabled = true;
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (preview.src) {
        URL.revokeObjectURL(preview.src);
    }
    videoList.forEach(video => {
        URL.revokeObjectURL(video.url);
    });
});

window.addEventListener('message', function(event) {
    if (event.data && event.data.from === 'recorder-extension') {
        if (event.data.action === 'startRecording' && !startBtn.disabled) {
            startBtn.click();
        } else if (event.data.action === 'pauseRecording' && !stopBtn.disabled) {
            // 主页可实现暂停逻辑（如有）
            if (typeof pauseRecording === 'function') pauseRecording();
        } else if (event.data.action === 'resumeRecording' && !stopBtn.disabled) {
            // 主页可实现恢复逻辑（如有）
            if (typeof resumeRecording === 'function') resumeRecording();
        } else if (event.data.action === 'stopRecording' && !stopBtn.disabled) {
            stopBtn.click();
        }
    }
}); 