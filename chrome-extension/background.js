// 后台服务工作者
chrome.runtime.onInstalled.addListener(() => {
    console.log('网页视频录制器插件已安装');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'recordingStarted':
            console.log('录制开始:', message.recordingId);
            // 可以在这里添加录制开始的通知
            break;
            
        case 'recordingStopped':
            console.log('录制停止:', message.recordingId);
            // 可以在这里添加录制停止的通知
            break;
            
        case 'saveRecording':
            console.log('保存录制:', message.recording);
            // 可以在这里处理录制文件的保存
            break;
            
        default:
            console.log('未知消息:', message);
    }
});

// 处理下载
chrome.downloads.onChanged.addListener((downloadDelta) => {
    if (downloadDelta.state && downloadDelta.state.current === 'complete') {
        console.log('下载完成:', downloadDelta.id);
    }
});

// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
    // 如果需要在图标点击时执行某些操作，可以在这里添加
    console.log('扩展图标被点击');
}); 