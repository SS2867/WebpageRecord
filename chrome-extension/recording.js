let mediaRecorder, recordedChunks = [], stream;
const preview = document.getElementById('preview');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');
const mp4Btn = document.getElementById('mp4Btn');
const status = document.getElementById('status');
const errorDiv = document.getElementById('error');
const mp4Progress = document.getElementById('mp4Progress');
let lastWebmBlob = null;

async function startCapture() {
  try {
    status.textContent = '请选择要分享的屏幕或窗口...';
    let localStream;
    try {
      localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch (e) {
      localStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    }
    if (!localStream || !(localStream instanceof MediaStream)) {
      throw new Error('未能获取到有效的屏幕流，请重试或检查权限设置。');
    }
    stream = localStream;
    preview.srcObject = stream;
    preview.style.display = 'block';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.textContent = '正在录制...';
    errorDiv.textContent = '';
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      lastWebmBlob = blob;
      preview.srcObject = null;
      preview.src = URL.createObjectURL(blob);
      preview.controls = true;
      downloadBtn.style.display = 'inline-block';
      mp4Btn.style.display = 'inline-block';
      downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = preview.src;
        a.download = 'recording-' + Date.now() + '.webm';
        a.click();
      };
      mp4Btn.onclick = () => {
        convertToMp4(blob);
      };
      status.textContent = '录制已完成，可下载视频';
    };
    mediaRecorder.start();
  } catch (err) {
    errorDiv.textContent = '录制失败：' + (err && err.message ? err.message : err);
    status.textContent = '';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    console.error('录制失败:', err);
  }
}

startBtn.onclick = startCapture;
stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    stream.getTracks().forEach(track => track.stop());
    stopBtn.disabled = true;
    status.textContent = '正在处理视频...';
  }
};

// 页面加载后自动弹出分享
window.onload = () => {
  startCapture();
};

// WebM转MP4
async function convertToMp4(webmBlob) {
  mp4Progress.textContent = '正在转码为MP4，请稍候...';
  mp4Btn.disabled = true;
  try {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true, corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js' });
    await ffmpeg.load();
    ffmpeg.FS('writeFile', 'input.webm', await fetchFile(webmBlob));
    await ffmpeg.run('-i', 'input.webm', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', 'output.mp4');
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(mp4Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording-' + Date.now() + '.mp4';
    a.click();
    mp4Progress.textContent = '转码完成！';
  } catch (e) {
    mp4Progress.textContent = '转码失败：' + (e && e.message ? e.message : e);
  } finally {
    mp4Btn.disabled = false;
    setTimeout(() => { mp4Progress.textContent = ''; }, 5000);
  }
} 