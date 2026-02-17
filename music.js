const allTracks = document.querySelectorAll('.content__music_box');  // блоки треков
const playBtn = document.querySelector('.content__music_player_play_btn'); 
const playIcon = document.getElementById('playIcon'); // изменено на getElementById для надежности
const globalAudio = document.getElementById('globalAudio'); // общий аудио плеер
const globalPlayer = document.querySelector('.content__music_player_box'); // блок плеера
const progressContainer = document.querySelector('.content__music_player_progress'); // контейнер прогресса
const progressBar = document.querySelector('.content__music_player_progress_bar'); // сам прогресс
const audioTime = document.querySelector('.content__music_player_current_time'); // время текущего трека
const audioDuration = document.querySelector('.content__music_player_duration_time'); // продолжительность
const trackInfo = document.querySelector('.content__music_player_trackname'); // название трека
const artistInfo = document.querySelector('.content__music_player_artist'); // имя артиста
const coverImg = document.querySelector('.content__music_player_cover'); // обложка трека
const shuffleBtn = document.querySelector('.navbar__settings_player_shuffle_off'); // кнопка перемешивания
const shuffleIcon = document.querySelector('.navbar__settings_player_shuffle_icon'); // иконка перемешивания

let currentIndex = null; // индекс текущего трека
let isShuffling = false; // режим перемешивания
let touchStartX = 0; // Начальная позиция касания
let touchEndX = 0; // Конечная позиция касания
let touchStartTime = 0; // Время начала касания
let history = []; // Массив для хранения истории треков
let lastSkippedIndex = null; // Индекс последнего пропущенного трека

// Инициализация состояния перемешивания из localStorage
function initShuffleState() {
    const savedShuffleState = localStorage.getItem('isShuffling');
    if (savedShuffleState !== null) {
        isShuffling = savedShuffleState === 'true';
        shuffleIcon.src = isShuffling ? 'img/icons_music/shuffleon.svg' : 'img/icons_music/shuffleoff.svg';
        shuffleIcon.alt = isShuffling ? 'shuffleon' : 'shuffleoff';
    }
}

// Вызываем инициализацию при загрузке
initShuffleState();

// =====================
// 🔹 Вспомогательные функции
// =====================

// Показать плеер
function showPlayer() {
    globalPlayer.classList.add('show_music_player');
}

// Сброс активного трека (удаляет подсветку)
function resetAllTracks() {
    allTracks.forEach(track => track.classList.remove('content__music_box_plays'));
}

// Формат времени в MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Обновление информации о треке: название и обложка
function updateTrackInfo(index) {
    const track = allTracks[index];
    const trackName = track.querySelector('.content__music_trackname')?.textContent || '';
    const artistName = track.querySelector('.content__music_artist')?.textContent || '';
    const coverUrl = track.querySelector('.content__music_cover')?.src || '';

    if (trackInfo) trackInfo.textContent = trackName;
    if (artistInfo) artistInfo.textContent = artistName;
    if (coverImg) coverImg.src = coverUrl;
}

// Обновление иконки play/pause
function updatePlayPauseIcon(isPlaying) {
    if (playIcon) {
        playIcon.src = isPlaying ? 'img/icons_music/pause.svg' : 'img/icons_music/play.svg';
        playIcon.alt = isPlaying ? 'pause' : 'play';
    }
}

// Воспроизведение трека
function playTrack(index, addToHistory = true) {
    if (index < 0 || index >= allTracks.length) return;

    const track = allTracks[index];
    const src = track.dataset.src;
    if (!src) return;

    globalAudio.src = src;
    globalAudio.load();
    
    globalAudio.play().then(() => {
        resetAllTracks();
        track.classList.add('content__music_box_plays');
        updateTrackInfo(index);
        updatePlayPauseIcon(true);
        currentIndex = index;
        if (addToHistory) {
            history.push(index); // Добавляем трек в историю
            lastSkippedIndex = null; // Сбрасываем lastSkippedIndex при новом треке
        }
        showPlayer();
    }).catch(error => {
        console.error('Ошибка воспроизведения:', error);
        updatePlayPauseIcon(false);
    });

    // MediaSession для управления через уведомления/кнопки
    if ('mediaSession' in navigator) {
        const trackName = track.querySelector('.content__music_trackname')?.textContent || '';
        const artistName = track.querySelector('.content__music_artist')?.textContent || '';
        const coverUrl = track.querySelector('.content__music_cover')?.src || '';

        navigator.mediaSession.metadata = new MediaMetadata({
            title: trackName,
            artist: artistName,
            artwork: [
                { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
                { src: coverUrl, sizes: '256x256', type: 'image/jpeg' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
            globalAudio.play().then(() => updatePlayPauseIcon(true));
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            globalAudio.pause();
            updatePlayPauseIcon(false);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (history.length > 1) {
                lastSkippedIndex = currentIndex; // Сохраняем текущий трек как пропущенный
                history.pop(); // Удаляем текущий трек из истории
                const prevIndex = history[history.length - 1]; // Берем предыдущий
                playTrack(prevIndex, false); // Не добавляем в историю
            } else {
                const prevIndex = (currentIndex - 1 + allTracks.length) % allTracks.length;
                lastSkippedIndex = currentIndex; // Сохраняем текущий трек как пропущенный
                playTrack(prevIndex);
            }
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (isShuffling && lastSkippedIndex !== null) {
                playTrack(lastSkippedIndex); // Возвращаемся к последнему пропущенному треку
            } else if (isShuffling) {
                playTrack(getRandomTrackIndex());
            } else {
                playTrack((currentIndex + 1) % allTracks.length);
            }
        });
    }
}

// Получить случайный трек, отличный от текущего
function getRandomTrackIndex() {
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * allTracks.length);
    } while (randomIndex === currentIndex && allTracks.length > 1);
    return randomIndex;
}

// =====================
// 🔹 События
// =====================

// Кнопка перемешивания
shuffleBtn.addEventListener('click', () => {
    isShuffling = !isShuffling;
    shuffleIcon.src = isShuffling ? 'img/icons_music/shuffleon.svg' : 'img/icons_music/shuffleoff.svg';
    shuffleIcon.alt = isShuffling ? 'shuffleon' : 'shuffleoff';
    localStorage.setItem('isShuffling', isShuffling); // Сохраняем состояние в localStorage
});

// Воспроизведение по клику на трек
allTracks.forEach((track, index) => {
    track.addEventListener('click', () => {
        if (currentIndex === index && !globalAudio.paused) {
            globalAudio.pause();
            track.classList.remove('content__music_box_plays');
            updatePlayPauseIcon(false);
        } else {
            playTrack(index);
        }
    });
});

// Кнопка play/pause
playBtn.addEventListener('click', () => {
    if (globalAudio.paused) {
        globalAudio.play().then(() => {
            updatePlayPauseIcon(true);
            if (currentIndex !== null) {
                allTracks[currentIndex].classList.add('content__music_box_plays');
            }
        }).catch(error => {
            console.error('Ошибка воспроизведения:', error);
            updatePlayPauseIcon(false);
        });
    } else {
        globalAudio.pause();
        updatePlayPauseIcon(false);
        if (currentIndex !== null) {
            allTracks[currentIndex].classList.remove('content__music_box_plays');
        }
    }
});

// Когда трек заканчивается
globalAudio.addEventListener('ended', () => {
    if (currentIndex === null) return;

    let nextIndex;
    if (isShuffling) {
        nextIndex = getRandomTrackIndex();
    } else {
        nextIndex = currentIndex + 1;
    }

    if (nextIndex < allTracks.length) {
        playTrack(nextIndex);
    } else if (!isShuffling) {
        resetAllTracks();
        currentIndex = null;
        history = []; // Очищаем историю при завершении плейлиста
        lastSkippedIndex = null; // Сбрасываем lastSkippedIndex
        updatePlayPauseIcon(false);
        if (progressBar) progressBar.style.width = '0%';
        if (audioTime) audioTime.textContent = '00:00';
        if (audioDuration) audioDuration.textContent = '00:00';
        if (trackInfo) trackInfo.textContent = '';
        if (coverImg) coverImg.src = '';
    }
});

// Обновление прогресса
globalAudio.addEventListener('timeupdate', () => {
    if (!progressBar || !globalAudio.duration) return;
    const percent = (globalAudio.currentTime / globalAudio.duration) * 100;
    progressBar.style.width = `${percent}%`;

    if (audioTime && audioDuration) {
        const current = formatTime(globalAudio.currentTime);
        const total = formatTime(globalAudio.duration);
        audioTime.textContent = `${current}`;
        audioDuration.textContent = `${total}`;
    }
});

// Обработка свайпа для переключения треков
const maxSwipeTime = 1000; // Максимальное время свайпа в миллисекундах
const minSwipeDistance = 50; // Минимальная дистанция для свайпа

globalPlayer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartTime = new Date().getTime();
});

globalPlayer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const touchEndTime = new Date().getTime();
    
    if (touchEndTime - touchStartTime <= maxSwipeTime) {
        handleSwipe();
    }
});

function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    
    if (Math.abs(swipeDistance) > minSwipeDistance && currentIndex !== null) {
        if (swipeDistance > 0) {
            if (history.length > 1) {
                lastSkippedIndex = currentIndex; // Сохраняем текущий трек как пропущенный
                history.pop(); // Удаляем текущий трек из истории
                const prevIndex = history[history.length - 1]; // Берем предыдущий
                playTrack(prevIndex, false); // Не добавляем в историю
            } else {
                lastSkippedIndex = currentIndex; // Сохраняем текущий трек как пропущенный
                const prevIndex = (currentIndex - 1 + allTracks.length) % allTracks.length;
                playTrack(prevIndex);
            }
        } else {
            if (isShuffling && lastSkippedIndex !== null) {
                playTrack(lastSkippedIndex); // Возвращаемся к последнему пропущенному треку
            } else if (isShuffling) {
                playTrack(getRandomTrackIndex());
            } else {
                playTrack((currentIndex + 1) % allTracks.length);
            }
        }
    }
}

// Синхронизация иконки при прямых событиях аудио
globalAudio.addEventListener('play', () => {
    updatePlayPauseIcon(true);
    if (currentIndex !== null) {
        allTracks[currentIndex].classList.add('content__music_box_plays');
    }
});

globalAudio.addEventListener('pause', () => {
    updatePlayPauseIcon(false);
    if (currentIndex !== null) {
        allTracks[currentIndex].classList.remove('content__music_box_plays');
    }
});

// Перемотка по клику
progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percent = clickX / width;
    globalAudio.currentTime = percent * globalAudio.duration;
});