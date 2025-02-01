const { createFFmpeg, fetchFile } = FFmpeg;  // Destructuring from FFmpeg object
const ffmpeg = createFFmpeg({ log: true });   // Initialize FFmpeg
let mediaRecorder;
let recordedChunks = [];
const videoElement = document.getElementById('videoElement');
const questionButton = document.getElementById('questionButton');
let mediaRecorder;
let recordedChunks = [];
const video = document.getElementById("video");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const downloadLink = document.getElementById("download");

// ✅ Access the webcam
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        video.srcObject = stream;
        mediaRecorder = new MediaRecorder(stream);

        // ✅ Store recorded data chunks
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        // ✅ When recording stops, create a video file
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: "video/webm" });
            recordedChunks = [];
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.style.display = "block"; // Show download button
            downloadLink.innerText = "Download Video";
        };
    })
    .catch(error => {
        console.error("Error accessing webcam:", error);
        alert("Please allow camera access to use this feature.");
    });

// ✅ Start recording
function startRecording() {
    recordedChunks = [];
    mediaRecorder.start();
    startButton.disabled = true;
    stopButton.disabled = false;
}

// ✅ Stop recording
function stopRecording() {
    mediaRecorder.stop();
    startButton.disabled = false;
    stopButton.disabled = true;
}

ffmpeg.load().then(() => {
  console.log('FFmpeg loaded');
});

questionButton.addEventListener('click', () => {
    recordedChunks = [];  // Clear previous chunks
  
    const stream = videoElement.srcObject;
    mediaRecorder = new MediaRecorder(stream);

    fetch('http://127.0.0.1:5000/api/data')  // Replace with your backend API URL
    .then(response => response.json())  // Convert response to JSON
    .then(data => {
        console.log('Data received from backend:', data);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
    
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