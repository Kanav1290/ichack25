function togglelightdark() {

    let themeStylesheet = document.getElementById("themeStylesheet");
    let currentTheme = themeStylesheet.getAttribute("href");

    let newTheme = currentTheme.includes("../static/styles.css") ? "../static/dark-mode.css" : "../static/styles.css";

    themeStylesheet.setAttribute("href", newTheme);

    localStorage.setItem("theme", newTheme);
        
}

function toggledyslexic() {
    let dyslexicStylesheet = document.getElementById("dyslexicStylesheet");
    let isDyslexic = dyslexicStylesheet.getAttribute("href") === "../static/dyslexic.css";

    if (isDyslexic) {
        dyslexicStylesheet.setAttribute("href", "");
        localStorage.setItem("dyslexic", "off");
    } else {
        dyslexicStylesheet.setAttribute("href", "../static/dyslexic.css");
        localStorage.setItem("dyslexic", "on");
    }
}

window.onload = function () {
    let savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
        document.getElementById("themeStylesheet").setAttribute("href", savedTheme);
    }

    let savedDyslexic = localStorage.getItem("dyslexic");
    if (savedDyslexic === "on") {
        document.getElementById("dyslexicStylesheet").setAttribute("href", "../static/dyslexic.css")
    }
}