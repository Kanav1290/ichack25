const fs = require('fs');
const filePath = './darktoggle.txt';

fs.readFile(filePath, 'utf8', (err, data) => {
    const firstLine = data.split('\n')[0];  // Get the first line
    console.log(firstLine);
});


document.addEventListener("DOMContentLoaded", function () {

    let darkmodetoggle = document.getElementById("darkModeToggle");
    let lightdark = document.getElementById("lightdark");


    darkmodetoggle.addEventListener("click", function() {
        
        
    })

    

});