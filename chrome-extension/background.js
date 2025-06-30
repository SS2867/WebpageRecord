// 后台服务工作者
console.log('Background script 正在加载...');

// Service Worker 安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('网页视频录制器插件已安装');
});

// Service Worker 激活事件
chrome.runtime.onStartup.addListener(() => {
    console.log('网页视频录制器插件已启动');
});

// 确保 Service Worker 保持活跃
chrome.runtime.onSuspend.addListener(() => {
    console.log('网页视频录制器插件即将挂起');
});

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log('标签页关闭:', tabId);
    // 如果录制页面被关闭，重置录制状态
    if (recordingState !== 'idle') {
        console.log('录制页面被关闭，重置录制状态');
        recordingState = 'idle';
        startTime = 0;
        pausedTime = 0;
        elapsed = 0;
        updateBadge(0);
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        broadcastStatus();
    }
});

let recordingState = 'idle'; // idle, recording, paused
let startTime = 0;
let pausedTime = 0;
let elapsed = 0;
let timer = null;

function updateBadge(sec) {
  if (recordingState === 'recording') {
    chrome.action.setBadgeText({ text: String(Math.floor(sec/60)).padStart(2, '0') + ':' + String(sec%60).padStart(2, '0') });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

function broadcastStatus() {
  try {
    chrome.runtime.sendMessage({ action: 'statusUpdate', state: recordingState, elapsed }, (response) => {
      if (chrome.runtime.lastError) {
        // 忽略错误，popup可能已关闭
        console.log('状态广播失败（popup可能已关闭）:', chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.log('状态广播出错:', error);
  }
}

function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (recordingState === 'recording') {
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      updateBadge(elapsed);
      broadcastStatus();
    }
  }, 1000);
}

function broadcastControl(action) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && tab.url.startsWith('https://lijian316.github.io/record/index')) {
        chrome.tabs.sendMessage(tab.id, { action });
      }
    }
  });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Background script 收到消息:', msg);
    
    if (msg.action === 'getStatus') {
        sendResponse({ state: recordingState, elapsed });
    } else if (msg.action === 'startRecording') {
        console.log('开始录制请求');
        if (recordingState === 'idle') {
            recordingState = 'recording';
            startTime = Date.now();
            elapsed = 0;
            updateBadge(0);
            startTimer();
            broadcastStatus();
            broadcastControl('startRecording');
            // TODO: 这里可集成实际录制逻辑
        }
        sendResponse({ success: true });
    } else if (msg.action === 'pauseRecording') {
        console.log('暂停录制请求');
        if (recordingState === 'recording') {
            recordingState = 'paused';
            pausedTime = Date.now();
            broadcastStatus();
            updateBadge(elapsed);
            broadcastControl('pauseRecording');
        }
        sendResponse({ success: true });
    } else if (msg.action === 'resumeRecording') {
        console.log('恢复录制请求');
        if (recordingState === 'paused') {
            recordingState = 'recording';
            startTime += (Date.now() - pausedTime);
            pausedTime = 0;
            startTimer();
            broadcastStatus();
            broadcastControl('resumeRecording');
        }
        sendResponse({ success: true });
    } else if (msg.action === 'stopRecording') {
        console.log('停止录制请求');
        if (recordingState !== 'idle') {
            recordingState = 'idle';
            startTime = 0;
            pausedTime = 0;
            elapsed = 0;
            updateBadge(0);
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            broadcastStatus();
            broadcastControl('stopRecording');
            console.log('录制已停止，计时器已清除');
        }
        sendResponse({ success: true });
    } else if (msg.action === 'recordingStarted') {
        console.log('录制已开始:', msg.recordingId);
        sendResponse({ success: true });
    } else if (msg.action === 'recordingStopped') {
        console.log('录制已停止:', msg.recordingId);
        sendResponse({ success: true });
    } else if (msg.action === 'saveRecordingToHistory') {
        if (!msg.recording || !msg.recording.blobData) {
            sendResponse({ success: false, error: '录制数据无效' });
            return true;
        }
        
        // 将录制信息保存到存储中
        chrome.storage.local.get(['recordings'], (result) => {
            const recordings = result.recordings || [];
            
            const recordingData = {
                ...msg.recording,
                blobData: msg.recording.blobData // base64 字符串
            };
            
            recordings.unshift(recordingData); // 添加到开头
            
            // 限制历史记录数量，避免存储过大
            const maxRecordings = 20; // 减少到20个，因为base64数据较大
            if (recordings.length > maxRecordings) {
                recordings.splice(maxRecordings);
            }
            
            chrome.storage.local.set({ recordings }, () => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: '存储失败' });
                } else {
                    sendResponse({ success: true, count: recordings.length });
                }
            });
        });
        return true; // 异步响应
    } else if (msg.action === 'getVideoForPlayer') {
        // 根据视频URL获取视频数据
        const videoUrl = msg.videoUrl;
        
        chrome.storage.local.get(['recordings'], (result) => {
            const recordings = result.recordings || [];
            const recording = recordings.find(r => r.url === videoUrl || r.blobData);
            
            if (recording) {
                sendResponse({ 
                    success: true, 
                    recording: {
                        title: recording.filename || `录制视频_${new Date(recording.timestamp).toLocaleString()}`,
                        timestamp: recording.timestamp,
                        blobData: recording.blobData
                    }
                });
            } else {
                sendResponse({ success: false, error: '未找到视频数据' });
            }
        });
        return true; // 异步响应
    } else {
        console.log('未知消息:', msg);
        sendResponse({ error: '未知消息类型' });
    }
    
    return true; // 保持消息通道开放
});