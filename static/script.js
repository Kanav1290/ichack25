const { createFFmpeg, fetchFile } = FFmpeg;  // Destructuring from FFmpeg object
const ffmpeg = createFFmpeg({ log: true });   // Initialize FFmpeg
let mediaRecorder;
let recordedChunks = [];
const videoElement = document.getElementById('videoElement');
const questionButton = document.getElementById('questionButton');

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const capturedImage = document.getElementById("capturedImage");

// ✅ Access webcam and display video stream
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(error => {
        console.error("Error accessing webcam:", error);
    });

// ✅ Capture image from the video
function captureImage() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/png"); // Convert to image URL
    capturedImage.src = imageData;
    capturedImage.style.display = "block"; // Show the captured image
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