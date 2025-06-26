# 部署隐私政策到GitHub Pages

## 步骤一：创建GitHub仓库

1. **登录GitHub**
   - 访问 https://github.com
   - 使用您的GitHub账号登录

2. **创建新仓库**
   - 点击右上角的 "+" 号
   - 选择 "New repository"
   - 仓库名称：`web-video-recorder-privacy`
   - 选择 "Public"
   - 勾选 "Add a README file"
   - 点击 "Create repository"

## 步骤二：上传隐私政策文件

### 方法A：通过GitHub网页上传

1. **创建index.html文件**
   - 在仓库页面点击 "Add file" → "Create new file"
   - 文件名：`index.html`
   - 复制以下内容：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网页视频录制器 - 隐私政策</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        .highlight {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #3498db;
            margin: 20px 0;
        }
        .contact {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>网页视频录制器 - 隐私政策</h1>
    
    <p><strong>最后更新时间：</strong> 2024年12月</p>

    <h2>概述</h2>
    <p>网页视频录制器（以下简称"本插件"）是一款Chrome浏览器扩展程序，用于屏幕录制和视频管理。我们非常重视您的隐私保护，本隐私政策说明了我们如何收集、使用和保护您的信息。</p>

    <h2>信息收集</h2>
    <h3>我们收集的信息</h3>
    <div class="highlight">
        <strong>本插件不会收集、传输或存储您的个人信息。</strong> 所有录制的视频文件都保存在您的本地设备上，我们无法访问这些文件。
    </div>

    <h3>权限说明</h3>
    <p>本插件需要以下权限才能正常工作：</p>
    <ul>
        <li><strong>desktopCapture</strong> - 用于屏幕录制功能</li>
        <li><strong>storage</strong> - 用于在本地保存录制记录和设置</li>
        <li><strong>downloads</strong> - 用于下载录制的视频文件</li>
        <li><strong>host_permissions</strong> - 用于访问网页内容</li>
    </ul>
    <p>这些权限仅用于插件功能，不会用于收集个人信息。</p>

    <h2>信息使用</h2>
    <h3>本地存储</h3>
    <ul>
        <li>录制的视频文件保存在您的浏览器本地存储中</li>
        <li>插件设置和录制记录也保存在本地</li>
        <li>这些数据不会上传到任何服务器</li>
    </ul>

    <h3>无网络传输</h3>
    <ul>
        <li>本插件不会向任何服务器发送数据</li>
        <li>不会收集您的浏览历史、个人信息或其他敏感数据</li>
        <li>所有功能都在本地执行</li>
    </ul>

    <h2>信息保护</h2>
    <h3>本地安全</h3>
    <ul>
        <li>所有数据都存储在您的设备上</li>
        <li>我们无法访问您的本地文件</li>
        <li>您的隐私完全由您控制</li>
    </ul>

    <h3>数据删除</h3>
    <ul>
        <li>您可以随时删除录制的视频文件</li>
        <li>卸载插件时，所有本地数据会被清除</li>
        <li>您可以通过浏览器设置清除插件数据</li>
    </ul>

    <h2>第三方服务</h2>
    <p>本插件<strong>不依赖</strong>任何第三方服务或API，所有功能都是独立的本地功能。</p>

    <h2>儿童隐私</h2>
    <p>本插件不专门针对13岁以下的儿童。如果您是家长或监护人，并且知道您的孩子向我们提供了个人信息，请联系我们。</p>

    <h2>隐私政策更新</h2>
    <p>我们可能会不时更新本隐私政策。更新后的政策将在此页面发布，并更新"最后更新时间"。</p>

    <h2>联系我们</h2>
    <div class="contact">
        <p>如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：</p>
        <ul>
            <li>GitHub Issues: <a href="https://github.com/yourusername/web-video-recorder-extension/issues">提交问题</a></li>
            <li>邮箱: your-email@example.com</li>
        </ul>
    </div>

    <h2>同意</h2>
    <p>使用本插件即表示您同意本隐私政策的条款。如果您不同意本政策，请不要使用本插件。</p>

    <hr>
    <p><strong>重要提醒：</strong> 本插件仅用于合法的屏幕录制目的。请确保您遵守当地法律法规，不要录制涉及他人隐私或商业机密的内容。</p>
</body>
</html>
```

2. **提交文件**
   - 点击 "Commit new file"

## 步骤三：启用GitHub Pages

1. **进入仓库设置**
   - 在仓库页面点击 "Settings" 标签

2. **配置Pages**
   - 在左侧菜单找到 "Pages"
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "main"
   - 点击 "Save"

3. **获取网站地址**
   - 等待几分钟后，您会看到类似这样的地址：
   - `https://yourusername.github.io/web-video-recorder-privacy/`

## 步骤四：在Chrome Web Store中使用

在Chrome Web Store的隐私政策字段中，输入您的GitHub Pages地址：
```
https://yourusername.github.io/web-video-recorder-privacy/
```

## 方法B：使用其他免费托管服务

### 1. Netlify Drop
- 访问 https://app.netlify.com/drop
- 拖拽包含index.html的文件夹
- 获得免费域名

### 2. Vercel
- 访问 https://vercel.com
- 连接GitHub仓库
- 自动部署

### 3. Surge.sh
- 安装：`npm install -g surge`
- 部署：`surge`
- 获得免费域名

## 注意事项

1. **更新联系信息**：记得将HTML中的邮箱地址改为您的真实邮箱
2. **保持更新**：如果隐私政策有变化，记得更新GitHub Pages
3. **备份**：建议在本地保存一份隐私政策文件

这样您就有了一个免费的隐私政策网站，完全符合Chrome Web Store的要求！ 