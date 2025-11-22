let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

// ----------------------------------------------------------------------
// Function to dynamically fetch MP3s from the specified folder
// This remains unchanged and relies on server directory listing for MP3s
// ----------------------------------------------------------------------
async function getSongs(folder) {
    // The folder passed here is "songs/cs" or "songs/ncs"
    currFolder = folder;

    // Fetch the directory listing for MP3 files
    let a = await fetch(`/${folder}/`); 
    let response = await a.text();

    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");
    songs = [];

    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split(`/${folder}/`)[1]); 
        }
    }

    let songUL = document.querySelector(".songlist").getElementsByTagName("ul")[0];
    songUL.innerHTML = "";
    for (const song of songs) {
        songUL.innerHTML += `<li> 
            <img class="invert" width="34" src="music.svg" alt="">
            <div class="info">
                <div>${song.replaceAll("%20", " ")}</div>
                <div>Artist Name</div> 
            </div>
            <div class="playnow">
                <span>Play now</span>
                <img class="invert" src="play.svg" alt="">
            </div>
        </li>`;
    }

    Array.from(document.querySelector(".songlist").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", element => {
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
        });
    });

    return songs;
}

const playMusic = (track, pause = false) => {
    currentSong.src = `/${currFolder}/` + track; 
    if (!pause) {
        currentSong.play();
        play.src = "pause.svg";
    }

    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}

// ----------------------------------------------------------------------
// FIX: displayAlbums now fetches data from the central albums.json file
// ----------------------------------------------------------------------
async function displayAlbums() {
    let cardContainer = document.querySelector(".cardContainer");
    
    // 1. Fetch the JSON file from the project root
    let a = await fetch(`/albums.json`);
    
    let albums = [];
    try {
        albums = await a.json(); // Directly parse response as JSON
    } catch (e) {
        console.error("Error fetching or parsing albums.json. Ensure file exists and is valid JSON.");
        return;
    }
    
    if (!Array.isArray(albums)) {
        console.error("Album data is not in the expected array format.");
        return;
    }
    
    cardContainer.innerHTML = ""; 

    // 2. Iterate over the fetched album data
    for (const album of albums) {
        // Use the folder name to dynamically construct the path
        const dataFolder = `songs/${album.folder}`;
        const coverPath = `songs/${album.folder}/cover.jpg`;
        
        cardContainer.innerHTML += `
            <div data-folder="${dataFolder}" class="card">
                <div class="play">
                    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="17" fill="#00ff00" stroke="black" stroke-width="2" />
                        <path d="M15 12L24 18L15 24Z" fill="black" />
                    </svg>
                </div>
                <img src="${coverPath}" alt="${album.title} Album Cover" onerror="this.src='default-cover.jpg'">
                <h2>${album.title}</h2>
                <p>${album.description}</p>
            </div>
        `;
    }

    // 3. Attach event listeners to the new cards
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            // Pass the full path (e.g., songs/cs) to getSongs
            songs = await getSongs(item.currentTarget.dataset.folder);
            playMusic(songs[0]);
        });
    });
}
// ----------------------------------------------------------------------

async function main() {
    // Load and display all album cards
    await displayAlbums();
    
    // Initial load of default playlist (assuming ncs is always present)
    await getSongs("songs/ncs");
    playMusic(songs[0], true);

    // Event listener for Play/Pause button
    const playButton = document.getElementById("play");
    const previousButton = document.getElementById("previous");
    const nextButton = document.getElementById("next");
    
    playButton.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            playButton.src = "pause.svg";
        } else {
            currentSong.pause();
            playButton.src = "play.svg";
        }
    });

    // Time update listener for seekbar and time display
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)}/${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Seekbar click listener
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100;
    });

    // Hamburger and Close button functionality for mobile sidebar
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0%";
    });
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Previous song functionality
    previousButton.addEventListener("click", () => {
        currentSong.pause();
        let currentTrackName = decodeURI(currentSong.src.split("/").slice(-1)[0]);
        let index = songs.findIndex(song => decodeURI(song) === currentTrackName);

        if ((index - 1) >= 0) {
            playMusic(songs[index - 1]);
        }
    });

    // Next song functionality
    nextButton.addEventListener("click", () => {
        currentSong.pause();
        let currentTrackName = decodeURI(currentSong.src.split("/").slice(-1)[0]);
        let index = songs.findIndex(song => decodeURI(song) === currentTrackName);
        
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    // Volume control listener and mute/unmute
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;
        if (currentSong.volume === 0) {
             document.querySelector(".volume>img").src = "mute.svg";
        } else {
             document.querySelector(".volume>img").src = "volume.svg";
        }
    });
    
    document.querySelector(".volume>img").addEventListener("click", e=>{
        const volumeInput = document.querySelector(".range input");
        if(e.target.src.includes("volume.svg")){
            e.target.src = "mute.svg";
            currentSong.volume = 0;
            volumeInput.value = 0;
        } else {
            e.target.src = "volume.svg";
            currentSong.volume = volumeInput.value > 0 ? volumeInput.value / 100 : 0.50;
            volumeInput.value = volumeInput.value > 0 ? volumeInput.value : 50;
        }
    })
    
    document.querySelector(".range input").value = 50;
    currentSong.volume = 0.50;
}

main();