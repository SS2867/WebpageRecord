# 网页视频录制项目

这是一个集成了网页应用和Chrome扩展的视频录制解决方案，支持屏幕录制、视频预览和下载功能。

## 📁 项目结构

```
网页视频录制/
├── index.html                    # 主页面（集成录制功能）
├── privacy_policy.html           # 隐私政策页面
├── chrome-extension/             # Chrome扩展相关文件
│   ├── manifest.json             # 扩展配置文件
│   ├── popup.html                # 扩展弹窗界面
│   ├── popup.js                  # 弹窗逻辑
│   ├── background.js             # 后台脚本
│   ├── content.js                # 内容脚本
│   ├── player.html               # 视频播放器页面
│   ├── player.js                 # 播放器逻辑
│   ├── icons/                    # 扩展图标
│   ├── build_extension.js        # 构建脚本
│   └── web-video-recorder-extension.zip # 打包文件
├── docs/                         # 项目文档
│   ├── README.md                 # 详细说明文档
│   ├── PRIVACY_POLICY.md         # 隐私政策文档
│   ├── PUBLISHING_GUIDE.md       # 发布指南
│   └── STORE_DESCRIPTION.md      # 商店描述
├── package.json                  # 项目配置
└── .gitignore                   # Git忽略文件
```

## 🚀 快速开始

### 使用网页应用
1. 打开 `index.html` 即可直接使用录制功能
2. 支持屏幕录制、摄像头录制、音频录制
3. 可预览和下载录制的视频

### 安装Chrome扩展
1. 运行 `npm install` 安装依赖
2. 运行 `npm run build` 构建扩展包
3. 在Chrome中加载 `chrome-extension/` 目录或使用打包的zip文件

## 📋 功能特性

- **多源录制**：支持屏幕、摄像头、音频录制
- **实时预览**：录制过程中可实时预览
- **格式支持**：支持WebM格式，兼容性好
- **下载管理**：支持视频下载和重命名
- **隐私保护**：本地处理，不上传数据

## 🔧 开发指南

### Chrome扩展开发
- 修改 `chrome-extension/` 目录下的文件
- 使用 `npm run build` 重新打包
- 在Chrome扩展管理页面重新加载

### 网页应用开发
- 修改根目录下的 `index.html` 和 `privacy_policy.html`
- 直接在浏览器中打开测试

## 📖 详细文档

- [详细说明](docs/README.md)
- [隐私政策](docs/PRIVACY_POLICY.md)
- [发布指南](docs/PUBLISHING_GUIDE.md)
- [商店描述](docs/STORE_DESCRIPTION.md)

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## �� 许可证

MIT License 