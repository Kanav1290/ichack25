const { createFFmpeg, fetchFile } = FFmpeg;  // Destructuring from FFmpeg object
const ffmpeg = createFFmpeg({ log: true });   // Initialize FFmpeg
let mediaRecorder;
let recordedChunks = [];
const videoElement = document.getElementById('videoElement');
const questionButton = document.getElementById('questionButton');
const questionText = document.getElementById('questionText');

ffmpeg.load().then(() => {
  console.log('FFmpeg loaded');
});

async function getNextQuestion() {
    const response = await fetch('http://127.0.0.1:5000/api/getPrompt');
    if (!response.ok) {
        throw new Error('Error status: ${response.status}')
    }
    const data = await response.json();
    const prompt = data.text;
    const prep = data.prep;
    const time = data.time;
    return {prompt, prep, time};
}

questionButton.addEventListener('click', () => {
    recordedChunks = [];  // Clear previous chunks
  
    const stream = videoElement.srcObject;
    mediaRecorder = new MediaRecorder(stream);
    const {prompt, prep, time} = getNextQuestion();
    
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
    console.log('Recording started...');
  });