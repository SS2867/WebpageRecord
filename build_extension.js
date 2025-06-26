const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 创建发布包
function createReleasePackage() {
    const output = fs.createWriteStream('web-video-recorder-extension.zip');
    const archive = archiver('zip', {
        zlib: { level: 9 } // 设置压缩级别
    });

    output.on('close', function() {
        console.log('✅ 插件打包完成！');
        console.log('📦 文件大小: ' + (archive.pointer() / 1024 / 1024).toFixed(2) + ' MB');
        console.log('📁 输出文件: web-video-recorder-extension.zip');
    });

    archive.on('error', function(err) {
        throw err;
    });

    archive.pipe(output);

    // 添加必需文件
    const files = [
        'manifest.json',
        'popup.html',
        'popup.js',
        'background.js',
        'content.js',
        'player.html',
        'player.js',
        'README.md'
    ];

    // 添加图标文件夹
    if (fs.existsSync('icons')) {
        archive.directory('icons/', 'icons/');
    }

    // 添加其他文件
    files.forEach(file => {
        if (fs.existsSync(file)) {
            archive.file(file, { name: file });
        }
    });

    archive.finalize();
}

// 检查必需文件
function checkRequiredFiles() {
    const requiredFiles = [
        'manifest.json',
        'popup.html',
        'popup.js',
        'background.js',
        'content.js',
        'player.html',
        'player.js'
    ];

    const missingFiles = [];
    requiredFiles.forEach(file => {
        if (!fs.existsSync(file)) {
            missingFiles.push(file);
        }
    });

    if (missingFiles.length > 0) {
        console.log('❌ 缺少必需文件:');
        missingFiles.forEach(file => console.log('  - ' + file));
        return false;
    }

    // 检查图标文件
    if (!fs.existsSync('icons')) {
        console.log('⚠️  警告: icons 文件夹不存在');
    } else {
        const iconFiles = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];
        const missingIcons = [];
        iconFiles.forEach(icon => {
            if (!fs.existsSync(path.join('icons', icon))) {
                missingIcons.push(icon);
            }
        });
        if (missingIcons.length > 0) {
            console.log('⚠️  缺少图标文件:');
            missingIcons.forEach(icon => console.log('  - icons/' + icon));
        }
    }

    return true;
}

// 主函数
function main() {
    console.log('🔧 开始构建Chrome插件发布包...\n');
    
    if (checkRequiredFiles()) {
        createReleasePackage();
    } else {
        console.log('\n❌ 构建失败，请确保所有必需文件都存在');
        process.exit(1);
    }
}

// 运行构建
if (require.main === module) {
    main();
}

module.exports = { createReleasePackage, checkRequiredFiles }; 