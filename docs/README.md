# 网页视频录制工具 - 开发文档

一个功能强大的网页视频录制解决方案，支持多种使用方式。

## 🌟 功能特性

- **多种使用方式**：网页版、Chrome插件、离线包
- **高质量录制**：支持屏幕录制、摄像头录制、音频录制
- **实时预览**：录制过程中可实时查看效果
- **一键下载**：录制完成后可直接下载视频文件
- **隐私保护**：所有内容仅在本地处理，不上传服务器
- **跨平台兼容**：支持Windows、macOS、Linux

## 📁 项目结构

```
网页视频录制/
├── chrome-extension/     # Chrome扩展相关文件
│   ├── manifest.json     # 扩展配置文件
│   ├── popup.html        # 扩展弹窗界面
│   ├── popup.js          # 弹窗逻辑
│   ├── background.js     # 后台脚本
│   ├── content.js        # 内容脚本
│   ├── player.html       # 视频播放器页面
│   ├── player.js         # 播放器逻辑
│   ├── icons/            # 扩展图标
│   ├── build_extension.js # 构建脚本
│   └── web-video-recorder-extension.zip # 打包文件
├── web-app/              # 网页应用
│   ├── index.html        # 主页面（集成录制功能）
│   └── privacy_policy.html # 隐私政策页面
├── docs/                 # 项目文档
│   ├── README.md         # 详细说明文档
│   ├── PRIVACY_POLICY.md # 隐私政策文档
│   ├── PUBLISHING_GUIDE.md # 发布指南
│   └── STORE_DESCRIPTION.md # 商店描述
├── package.json          # 项目配置
└── .gitignore           # Git忽略文件
```

## 🚀 使用方式

### 1. 网页版（推荐）
直接在浏览器中使用，无需安装任何软件：

1. 访问 [网页版录制工具](../web-app/index.html)
2. 点击"开始录制"按钮
3. 选择要录制的屏幕或窗口
4. 录制完成后点击"停止录制"
5. 预览并下载视频

**优点**：
- 无需安装，即开即用
- 支持所有现代浏览器
- 完全免费使用

### 2. Chrome插件
安装Chrome插件，在任何网页上快速录制：

1. 运行 `npm install` 安装依赖
2. 运行 `npm run build` 构建扩展包
3. 在Chrome扩展程序页面加载插件
4. 点击插件图标开始录制
5. 在插件管理页面查看和下载视频

**优点**：
- 集成到浏览器，使用方便
- 支持快捷键操作
- 可管理多个录制文件

### 3. Chrome商店版本
等待插件发布成功后，可从Chrome Web Store下载：

1. 访问Chrome Web Store
2. 搜索"网页视频录制工具"
3. 点击"添加至Chrome"
4. 开始使用

**优点**：
- 自动更新
- 官方认证
- 用户评价和反馈

## 🛠️ 技术栈

- **前端**：HTML5、CSS3、JavaScript (ES6+)
- **录制API**：MediaRecorder API、getDisplayMedia API
- **存储**：IndexedDB、LocalStorage
- **插件框架**：Chrome Extension Manifest V3
- **视频格式**：WebM (VP9编码)

## 🔧 开发指南

### Chrome扩展开发

#### 文件结构说明
- `manifest.json`: 扩展配置文件，定义权限和功能
- `popup.html/popup.js`: 扩展弹窗界面和逻辑
- `background.js`: 后台脚本，处理录制逻辑
- `content.js`: 内容脚本，注入到网页中
- `player.html/player.js`: 视频播放器页面
- `icons/`: 扩展图标文件

#### 开发流程
1. 修改 `chrome-extension/` 目录下的文件
2. 运行 `npm run build` 重新打包
3. 在Chrome扩展管理页面重新加载
4. 测试功能是否正常

#### 构建脚本
```bash
# 安装依赖
npm install

# 构建扩展包
npm run build

# 构建后的文件位于 chrome-extension/web-video-recorder-extension.zip
```

### 网页应用开发

#### 文件结构说明
- `index.html`: 主页面，集成完整的录制功能
- `privacy_policy.html`: 隐私政策页面

#### 开发流程
1. 修改 `web-app/` 目录下的文件
2. 直接在浏览器中打开测试
3. 使用本地服务器进行开发（推荐）

#### 本地开发服务器
```bash
# 使用Python启动本地服务器
python -m http.server 8000

# 或使用Node.js
npx http-server -p 8000

# 然后访问 http://localhost:8000/web-app/
```

## 📖 使用指南

### 开始录制
1. 点击"开始录制"按钮
2. 选择录制类型：
   - 屏幕录制：录制整个屏幕或特定窗口
   - 摄像头录制：录制摄像头画面
   - 音频录制：仅录制音频
3. 选择录制区域
4. 开始录制

### 录制控制
- **暂停/继续**：点击录制按钮暂停或继续
- **停止录制**：点击停止按钮完成录制
- **实时预览**：录制过程中可查看实时效果

### 视频管理
- **预览视频**：录制完成后自动显示预览
- **下载视频**：点击下载按钮保存到本地
- **视频列表**：在播放器页面管理所有视频

## 🔒 隐私保护

我们非常重视您的隐私：

- ✅ **本地处理**：所有录制内容仅在您的设备上处理
- ✅ **不上传**：不会将任何视频内容上传到服务器
- ✅ **最小权限**：只请求必要的录制权限
- ✅ **透明开源**：代码完全开源，可审查

详细隐私政策请查看 [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## 🌐 浏览器兼容性

| 浏览器 | 版本要求 | 支持状态 |
|--------|----------|----------|
| Chrome | 74+ | ✅ 完全支持 |
| Firefox | 66+ | ✅ 完全支持 |
| Edge | 79+ | ✅ 完全支持 |
| Safari | 13+ | ⚠️ 部分支持 |

## 🐛 常见问题

### Q: 录制时没有声音？
A: 确保在录制设置中启用了音频录制，并检查系统音频权限。

### Q: 录制的视频文件很大？
A: 可以调整录制质量设置，或使用视频压缩工具。

### Q: 插件无法安装？
A: 确保Chrome版本在74以上，并开启了开发者模式。

### Q: 录制失败怎么办？
A: 检查浏览器权限设置，确保允许屏幕录制权限。

## 🤝 贡献指南

欢迎贡献代码和提出建议：

1. Fork 本项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

### 开发规范
- 遵循ES6+语法规范
- 保持代码注释清晰
- 测试功能完整性
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系我们

- **GitHub Issues**: [提交问题](https://github.com/your-username/web-video-recorder/issues)
- **邮箱**: support@webvideorecorder.com
- **隐私问题**: privacy@webvideorecorder.com

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

**注意**：请确保遵守当地法律法规，不要录制涉及他人隐私或商业机密的内容。 