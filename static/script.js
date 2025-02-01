const { createFFmpeg, fetchFile } = FFmpeg;  // Destructuring from FFmpeg object
const ffmpeg = createFFmpeg({ log: true });   // Initialize FFmpeg
let mediaRecorder;
let recordedChunks = [];
const videoElement = document.getElementById('videoElement');
const startBtn = document.getElementById('startBtn');

ffmpeg.load().then(() => {
  console.log('FFmpeg loaded');
});
