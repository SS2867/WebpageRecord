// 内容脚本 - 在网页中运行
console.log('网页视频录制器内容脚本已加载');

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'getPageInfo':
            // 返回页面信息
            sendResponse({
                title: document.title,
                url: window.location.href,
                timestamp: Date.now()
            });
            break;
            
        default:
            console.log('内容脚本收到消息:', message);
    }
});

// 可以在这里添加与网页交互的功能
// 例如：检测页面变化、添加录制按钮等 