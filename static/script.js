const { createFFmpeg, fetchFile } = FFmpeg;  // Destructuring from FFmpeg object
const ffmpeg = createFFmpeg({ log: true });   // Initialize FFmpeg
let mediaRecorder;
let recordedChunks = [];
const videoElement = document.getElementById('videoElement');
const questionButton = document.getElementById('questionButton');

ffmpeg.load().then(() => {
  console.log('FFmpeg loaded');
});

startBtn.addEventListener('click', () => {
    recordedChunks = [];  // Clear previous chunks
  
    const stream = videoElement.srcObject;
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      recordedChunks.push(event.data);  // Push recorded chunks of video
    };
  
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const videoURL = URL.createObjectURL(blob);  // Create URL for the recorded video
      console.log('Recording stopped, processing video...');
  
      // Process the video after recording
      await processVideo(blob, videoURL);
    };
  
    mediaRecorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    console.log('Recording started...');
  });