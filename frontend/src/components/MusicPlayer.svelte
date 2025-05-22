<!-- MusicPlayer.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { playerStore } from '../stores/playerStore';
    import TrackInfo from './TrackInfo.svelte';
    import PlayQueue from './PlayQueue.svelte';
    // import ThemeToggle from './ThemeToggle.svelte';
    import PlayerControls from './PlayerControls.svelte';
    // import Visualizer from './Visualizer.svelte';
    import { fade } from 'svelte/transition';

    // Estado local
    let audio;
    let progressValue = 0;
    let isDragging = false;
    let showQueue = false;
    let showRecommendations = false;
    let audioContext;
    let analyser;
    let dataArray;
    let visualizerActive = false;

    // Referencias al store
    let player = $playerStore;
    let unsubscribe;

    onMount(() => {
        // Inicializar el reproductor de audio
        audio = new Audio();
        
        // Suscribirse al store
        unsubscribe = playerStore.subscribe(value => {
            player = value;
            if (player && player.currentTrack) {
                // Initialize audio only if we have a track
                if (!audio.src) {
                    audio.src = player.currentTrack.url;
                    audio.volume = player.volume;
                }
                // Update volume if it changed
                if (player.volume !== audio.volume) {
                    audio.volume = player.volume;
                }
                // Resetear el tiempo si hay un cambio de canción
                if (audio.src !== player.currentTrack.url) {
                    audio.src = player.currentTrack.url;
                    audio.currentTime = 0;
                }
            }
        });

        // Configurar eventos de audio
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleTrackEnd);
        audio.addEventListener('loadedmetadata', handleTrackLoaded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('play', () => playerStore.setIsPlaying(true));
        audio.addEventListener('pause', () => playerStore.setIsPlaying(false));
        
        // Configurar el visualizador de audio si está soportado
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            visualizerActive = true;
        } catch (e) {
            console.log('El visualizador de audio no está soportado en este navegador');
            visualizerActive = false;
        }

        // Restaurar la última sesión si existe
        const savedState = localStorage.getItem('hibeatPlayerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            playerStore.setVolume(state.volume);
            audio.volume = state.volume;
            
            if (state.currentTrackId && player.playlist.length > 0) {
                const track = player.playlist.find(t => t.id === state.currentTrackId);
                if (track) {
                    playerStore.setCurrentTrack(track);
                    audio.src = track.url;
                    audio.currentTime = state.currentTime || 0;
                }
            }
        }
    });

    onDestroy(() => {
        // Limpiar los event listeners y guardar el estado
        if (audio) {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleTrackEnd);
            audio.removeEventListener('loadedmetadata', handleTrackLoaded);
            audio.removeEventListener('error', handleError);
            audio.pause();
        }
        
        // Guardar el estado para la próxima sesión
        if (player && player.currentTrack) {
            const stateToSave = {
                volume: player.volume,
                currentTrackId: player.currentTrack?.id,
                currentTime: audio?.currentTime || 0
            };
            localStorage.setItem('hibeatPlayerState', JSON.stringify(stateToSave));
        }
        
        // Limpiar la suscripción al store
        if (unsubscribe) unsubscribe();
    });

    // Funciones de control del reproductor
    function playTrack(track) {
        if (!track) return;
        
        playerStore.setLoading(true);
        playerStore.setError(null);
        playerStore.setCurrentTrack(track);
        
        audio.src = track.url;
        audio.play().catch(err => {
            playerStore.setError(`Error al reproducir: ${err.message}`);
            playerStore.setLoading(false);
        });
    }

    function togglePlay() {
        if (!player || !player.currentTrack) {
            if (player && player.playlist.length > 0) {
                playTrack(player.playlist[0]);
            }
            return;
        }
        
        if (player.isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(err => {
                playerStore.setError(`Error al reproducir: ${err.message}`);
            });
        }
    }

    function handleTrackEnd() {
        if (player.repeat === 'one') {
            audio.currentTime = 0;
            audio.play();
            return;
        }
        
        // Pasar a la siguiente canción si existe
        const currentIndex = player.playlist.findIndex(t => t.id === player.currentTrack.id);
        
        if (currentIndex < player.playlist.length - 1) {
            playTrack(player.playlist[currentIndex + 1]);
        } else if (player.repeat === 'all') {
            // Si está en modo repetir todo, volver a la primera canción
            playTrack(player.playlist[0]);
        } else {
            playerStore.setIsPlaying(false);
        }
    }

    function handleTrackLoaded() {
        playerStore.setDuration(audio.duration);
        playerStore.setLoading(false);
    }

    function updateProgress() {
        if (!isDragging && audio.duration) {
            progressValue = (audio.currentTime / audio.duration) * 100;
            playerStore.setCurrentTime(audio.currentTime);
        }
    }

    function handleProgressChange(e) {
        progressValue = parseFloat(e.target.value);
        const newTime = (progressValue / 100) * audio.duration;
        audio.currentTime = newTime;
        playerStore.setCurrentTime(newTime);
    }

    function handleProgressDragStart() {
        isDragging = true;
    }

    function handleProgressDragEnd() {
        isDragging = false;
        const newTime = (progressValue / 100) * audio.duration;
        audio.currentTime = newTime;
        playerStore.setCurrentTime(newTime);
    }

    function handleVolumeChange(e) {
        const volume = parseFloat(e.target.value);
        audio.volume = volume;
        playerStore.setVolume(volume);
    }

    function handleError() {
        playerStore.setLoading(false);
        playerStore.setError('Error al reproducir la canción. Verifique la URL o conexión.');
    }

    function skipToNext() {
        if (!player.currentTrack) return;
        
        const currentIndex = player.playlist.findIndex(t => t.id === player.currentTrack.id);
        if (currentIndex < player.playlist.length - 1) {
            playTrack(player.playlist[currentIndex + 1]);
        } else if (player.repeat === 'all') {
            playTrack(player.playlist[0]);
        }
    }

    function skipToPrevious() {
        if (!player.currentTrack) return;
        
        // Si lleva reproduciendo más de 3 segundos, reiniciar la canción
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        
        const currentIndex = player.playlist.findIndex(t => t.id === player.currentTrack.id);
        if (currentIndex > 0) {
            playTrack(player.playlist[currentIndex - 1]);
        } else if (player.repeat === 'all') {
            playTrack(player.playlist[player.playlist.length - 1]);
        }
    }

    function toggleShuffle() {
        playerStore.toggleShuffle();
        
        if (player.shuffle) {
            // Guardar el orden original y crear lista mezclada
            playerStore.shufflePlaylist();
        } else {
            // Restaurar orden original
            playerStore.restorePlaylistOrder();
        }
    }

    function toggleRepeat() {
        playerStore.toggleRepeat();
    }

    function toggleQueue() {
        showQueue = !showQueue;
        showRecommendations = false;
    }

    function toggleRecommendations() {
        showRecommendations = !showRecommendations;
        showQueue = false;
    }

    function downloadCurrentTrack() {
        if (!player.currentTrack) return;
        
        const a = document.createElement('a');
        a.href = player.currentTrack.url;
        a.download = `${player.currentTrack.title} - ${player.currentTrack.artist}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function formatTime(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }
</script>

<div class="music-player" class:dark-mode={player.darkMode}>
    <div class="player-header">
        <div class="header-content">
            <div class="logo-container">
                <svg class="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" fill="currentColor"/>
                </svg>
                <h2>HiBeat Player</h2>
            </div>
            <div class="header-actions">
                <button class="header-btn tooltip" on:click={toggleQueue} aria-label="Cola de reproducción">
                    <span class="tooltip-text">Cola</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
                    </svg>
                </button>
                <button class="header-btn tooltip" on:click={toggleRecommendations} aria-label="Recomendaciones">
                    <span class="tooltip-text">Recomendaciones</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                    </svg>
                </button>
                <button class="header-btn tooltip" on:click={toggleTheme} aria-label="Cambiar tema">
                    <span class="tooltip-text">Tema</span>
                    {#if player.darkMode}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <div class="player-content">
        <div class="main-player">
            {#if player.currentTrack}
                <div class="now-playing">
                    <div class="track-artwork-container">
                        <img src={player.currentTrack.image} alt={player.currentTrack.title} class="track-artwork" />
                        <div class="track-overlay">
                            <button class="play-pause-btn" on:click={player.isPlaying ? pauseTrack : playTrack} aria-label={player.isPlaying ? 'Pausar' : 'Reproducir'}>
                                {#if player.isPlaying}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"></rect>
                                        <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"></rect>
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z" fill="currentColor"></path>
                                    </svg>
                                {/if}
                            </button>
                        </div>
                    </div>
                    
                    <div class="track-details">
                        <div class="track-info">
                            <h3 class="track-title">{player.currentTrack.title}</h3>
                            <p class="track-artist">{player.currentTrack.artist}</p>
                        </div>
                        
                        <div class="visualizer-container" class:active={visualizerActive} on:click={toggleVisualizer}>
                            {#if visualizerActive}
                                <div class="visualizer-bars">
                                    {#each Array(40) as _, i}
                                        <div class="bar" style="height: {dataArray[i * 3] * 1.5}px"></div>
                                    {/each}
                                </div>
                            {:else}
                                <div class="visualizer-placeholder">
                                    <span>Click para activar visualizador</span>
                                </div>
                            {/if}
                        </div>
                        
                        <div class="progress-container">
                            <span class="time-display">{formatTime(audio?.currentTime || 0)}</span>
                            <div class="progress-bar" on:click={handleProgressClick}>
                                <div class="progress-background"></div>
                                <div class="progress" style="width: {progressValue}%"></div>
                                <div class="progress-handle" style="left: {progressValue}%"></div>
                            </div>
                            <span class="time-display">{formatTime(audio?.duration || 0)}</span>
                        </div>
                        
                        <div class="player-controls">
                            <button class="control-btn" on:click={toggleShuffle} class:active={player.shuffle} aria-label="Aleatorio">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="16 3 21 3 21 8"></polyline>
                                    <line x1="4" y1="20" x2="21" y2="3"></line>
                                    <polyline points="21 16 21 21 16 21"></polyline>
                                    <line x1="15" y1="15" x2="21" y2="21"></line>
                                    <line x1="4" y1="4" x2="9" y2="9"></line>
                                </svg>
                            </button>
                            
                            <button class="control-btn" on:click={previousTrack} aria-label="Anterior">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="19 20 9 12 19 4 19 20"></polygon>
                                    <line x1="5" y1="19" x2="5" y2="5"></line>
                                </svg>
                            </button>
                            
                            <button class="control-btn primary" on:click={player.isPlaying ? pauseTrack : playTrack} aria-label={player.isPlaying ? 'Pausar' : 'Reproducir'}>
                                {#if player.isPlaying}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                                        <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                {/if}
                            </button>
                            
                            <button class="control-btn" on:click={nextTrack} aria-label="Siguiente">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="5 4 15 12 5 20 5 4"></polygon>
                                    <line x1="19" y1="5" x2="19" y2="19"></line>
                                </svg>
                            </button>
                            
                            <button class="control-btn" on:click={toggleRepeat} class:active={player.repeat} aria-label="Repetir">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="17 1 21 5 17 9"></polyline>
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                    <polyline points="7 23 3 19 7 15"></polyline>
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="volume-container">
                            <button class="volume-btn" on:click={toggleMute} aria-label={player.muted ? 'Activar sonido' : 'Silenciar'}>
                                {#if player.muted || player.volume === 0}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                        <line x1="12" y1="19" x2="12" y2="23"></line>
                                        <line x1="8" y1="23" x2="16" y2="23"></line>
                                    </svg>
                                {:else if player.volume < 0.5}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                    </svg>
                                {/if}
                            </button>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                value={player.volume} 
                                on:input={handleVolumeChange}
                                class="volume-slider"
                                aria-label="Control de volumen"
                            />
                        </div>
                    </div>
                </div>
            {:else}
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                    </svg>
                    <h3>No hay canción seleccionada</h3>
                    <p>Selecciona una canción para comenzar a escuchar</p>
                </div>
            {/if}
        </div>

        <div class="side-panel" class:visible={showQueue || showRecommendations}>
            <div class="panel-tabs">
                <button class="panel-tab" class:active={showQueue} on:click={toggleQueue}>Cola</button>
                <button class="panel-tab" class:active={showRecommendations} on:click={toggleRecommendations}>Recomendaciones</button>
                <button class="close-panel" on:click={closePanel} aria-label="Cerrar panel">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            {#if showQueue}
                <div class="panel-content">
                    <h3>Cola de reproducción</h3>
                    {#if player.playlist && player.playlist.length > 0}
                        <div class="tracks-list">
                            {#each player.playlist as track, index}
                                <div 
                                    class="track-item" 
                                    class:active={player.currentTrack && player.currentTrack.id === track.id}
                                    on:click={() => playTrack(track)}
                                >
                                    <div class="track-number">{index + 1}</div>
                                    <img src={track.image} alt={track.title} class="track-thumbnail" />
                                    <div class="track-info">
                                        <h4 class="track-name">{track.title}</h4>
                                        <p class="track-artist">{track.artist}</p>
                                    </div>
                                    <div class="track-duration">{formatTime(track.duration)}</div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div class="empty-list">
                            <p>No hay canciones en la cola</p>
                        </div>
                    {/if}
                </div>
            {/if}
            
            {#if showRecommendations && player && player.currentTrack}
                <div class="panel-content">
                    <h3>Recomendaciones similares</h3>
                    {#if player.recommendations && player.recommendations.length > 0}
                        <div class="tracks-list">
                            {#each player.recommendations as track, index}
                                <div class="track-item" on:click={() => playTrack(track)}>
                                    <div class="track-number">{index + 1}</div>
                                    <img src={track.image} alt={track.title} class="track-thumbnail" />
                                    <div class="track-info">
                                        <h4 class="track-name">{track.title}</h4>
                                        <p class="track-artist">{track.artist}</p>
                                    </div>
                                    <button class="add-to-queue" on:click|stopPropagation={() => addToQueue(track)} aria-label="Añadir a la cola">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div class="empty-list">
                            <p>No hay recomendaciones disponibles</p>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Variables CSS para personalización y coherencia */
    :root {
        --primary-color: #5a67d8;
        --primary-hover: #4c51bf;
        --background-light: #f7fafc;
        --background-dark: #161b22;
        --surface-light: #ffffff;
        --surface-dark: #1e2329;
        --text-light: #1a202c;
        --text-dark: #e2e8f0;
        --accent-light: #6366f1;
        --accent-dark: #818cf8;
        --border-light: #e2e8f0;
        --border-dark: #30363d;
        --shadow-light: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        --shadow-dark: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        --transition-default: all 0.3s ease;
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
    }

    /* Estilos base y modo oscuro */
    .music-player {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        background: var(--surface-light);
        color: var(--text-light);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-light);
        overflow: hidden;
        transition: var(--transition-default);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }

    .dark-mode {
        background: var(--surface-dark);
        color: var(--text-dark);
        box-shadow: var(--shadow-dark);
    }

    /* Encabezado del reproductor */
    .player-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border-light);
    }

    .dark-mode .player-header {
        border-bottom: 1px solid var(--border-dark);
    }

    .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .logo-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .logo-icon {
        color: var(--primary-color);
    }

    .dark-mode .logo-icon {
        color: var(--accent-dark);
    }

    .header-content h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
    }

    .header-actions {
        display: flex;
        gap: 0.75rem;
    }

    .header-btn {
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        color: var(--text-light);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        transition: var(--transition-default);
        position: relative;
    }

    .dark-mode .header-btn {
        color: var(--text-dark);
    }

    .header-btn:hover {
        background: rgba(0, 0, 0, 0.05);
    }

    .dark-mode .header-btn:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    /* Tooltip */
    .tooltip {
        position: relative;
    }

    .tooltip-text {
        visibility: hidden;
        width: auto;
        min-width: 80px;
        background-color: rgba(0, 0, 0, 0.75);
        color: #fff;
        text-align: center;
        border-radius: 4px;
        padding: 5px 8px;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.2s, visibility 0.2s;
        font-size: 0.75rem;
        pointer-events: none;
        white-space: nowrap;
    }

    .tooltip:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
    }

    /* Contenido principal */
    .player-content {
        display: flex;
        gap: 1.5rem;
        padding: 1.5rem;
        height: calc(100% - 70px);
        position: relative;
    }

    /* Reproductor principal */
    .main-player {
        flex: 1;
        background: var(--background-light);
        border-radius: var(--radius-md);
        overflow: hidden;
        transition: var(--transition-default);
        height: 100%;
        min-height: 500px;
    }

    .dark-mode .main-player {
        background: var(--background-dark);
    }

    .now-playing {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .track-artwork-container {
        position: relative;
        width: 100%;
        padding-bottom: 56.25%; /* 16:9 aspect ratio */
        overflow: hidden;
        border-radius: var(--radius-md) var(--radius-md) 0 0;
    }

    .track-artwork {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }

    .track-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        opacity: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.3s ease;
    }

    .track-artwork-container:hover .track-overlay {
        opacity: 1;
    }

    .track-artwork-container:hover .track-artwork {
        transform: scale(1.05);
    }

    .play-pause-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 50%;
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        backdrop-filter: blur(5px);
        transition: transform 0.2s ease, background 0.2s ease;
    }

    .play-pause-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
    }

    .track-details {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        flex-grow: 1;
    }

    .track-info {
        text-align: center;
        margin-bottom: 1rem;
    }

    .track-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.25rem 0;
    }

    .track-artist {
        font-size: 1rem;
        color: #666;
        margin: 0;
    }

    .dark-mode .track-artist {
        color: #aaa;
    }

    /* Visualizador */
    .visualizer-container {
        background: rgba(0, 0, 0, 0.05);
        border-radius: var(--radius-md);
        height: 80px;
        overflow: hidden;
        cursor: pointer;
        transition: var(--transition-default);
        margin-bottom: 1rem;
    }

    .dark-mode .visualizer-container {
        background: rgba(255, 255, 255, 0.05);
    }

    .visualizer-container:hover {
        background: rgba(0, 0, 0, 0.1);
    }

    .dark-mode .visualizer-container:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .visualizer-bars {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        height: 100%;
        gap: 2px;
        padding: 0.5rem;
    }

    .bar {
        flex: 1;
        background: var(--primary-color);
        max-width: 6px;
        border-radius: 2px;
        transition: height 0.1s ease;
    }

    .dark-mode .bar {
        background: var(--accent-dark);
    }

    .visualizer-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 0.875rem;
        color: #666;
    }

    .dark-mode .visualizer-placeholder {
        color: #aaa;
    }

    /* Progreso */
    .progress-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0.5rem 0;
    }

    .time-display {
        font-size: 0.8rem;
        color: #666;
        min-width: 40px;
    }

    .dark-mode .time-display {
        color: #aaa;
    }

    .progress-bar {
        flex: 1;
        height: 6px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
        position: relative;
        cursor: pointer;
        overflow: hidden;
    }

    .dark-mode .progress-bar {
        background: rgba(255, 255, 255, 0.1);
    }

    .progress-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.05);
    }

    .dark-mode .progress-background {
        background: rgba(255, 255, 255, 0.05);
    }

    .progress {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: var(--primary-color);
        border-radius: 3px;
        transition: width 0.1s linear;
    }

    .dark-mode .progress {
        background: var(--accent-dark);
    }

    .progress-handle {
        position: absolute;
        top: 50%;
        width: 12px;
        height: 12px;
        background: var(--primary-color);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .dark-mode .progress-handle {
        background: var(--accent-dark);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }

    .progress-bar:hover .progress-handle {
        opacity: 1;
    }

    /* Controles del reproductor */
    .player-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin: 1rem 0;
    }

    .control-btn {
        background: transparent;
        border: none;
        color: var(--text-light);
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        transition: var(--transition-default);
    }

    .dark-mode .control-btn {
        color: var(--text-dark);
    }

    .control-btn:hover {
        background: rgba(0, 0, 0, 0.05);
    }

    .dark-mode .control-btn:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .control-btn.primary {
        background: var(--primary-color);
        color: white;
        width: 56px;
        height: 56px;
    }

    .dark-mode .control-btn.primary {
        background: var(--accent-dark);
    }

    .control-btn.primary:hover {
        background: var(--primary-hover);
        transform: scale(1.05);
    }

    .control-btn.active {
        color: var(--primary-color);
    }

    .dark-mode .control-btn.active {
        color: var(--accent-dark);
    }

    /* Control de volumen */
    .volume-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 0.5rem;
    }

    .volume-btn {
        background: transparent;
        border: none;
        color: var(--text-light);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem;
        transition: var(--transition-default);
    }

    .dark-mode .volume-btn {
        color: var(--text-dark);
    }

    .volume-slider {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 2px;
        outline: none;
    }

    .dark-mode .volume-slider {
        background: rgba(255, 255, 255, 0.1);
    }

    .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
        transition: transform 0.2s ease;
    }

    .dark-mode .volume-slider::-webkit-slider-thumb {
        background: var(--accent-dark);
    }

    .volume-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
    }

    /* Estado vacío */
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
        color: #666;
    }

    .dark-mode .empty-state {
        color: #aaa;
    }

    .empty-state svg {
        opacity: 0.5;
        margin-bottom: 1.5rem;
    }

    .empty-state h3 {
        margin: 0 0 0.5rem 0;
        font-weight: 600;
    }

    .empty-state p {
        margin: 0;
        font-size: 0.9rem;
    }

    /* Panel lateral */
    .side-panel {
        width: 300px;
        background: var(--surface-light);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-light);
        overflow: hidden;
        transition: var(--transition-default);
        transform: translateX(110%);
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        bottom: 1.5rem;
        z-index: 10;
    }

    .side-panel.visible {
        transform: translateX(0);
    }

    .dark-mode .side-panel {
        background: var(--surface-dark);
        box-shadow: var(--shadow-dark);
    }

    .panel-tabs {
        display: flex;
        border-bottom: 1px solid var(--border-light);
        position: relative;
    }

    .dark-mode .panel-tabs {
        border-bottom: 1px solid var(--border-dark);
    }

    .panel-tab {
        flex: 1;
        background: transparent;
        border: none;
        padding: 1rem;
        font-weight: 500;
        color: #666;
        cursor: pointer;
        transition: var(--transition-default);
        position: relative;
    }

    .dark-mode .panel-tab {
        color: #aaa;
    }

    .panel-tab.active {
        color: var(--primary-color);
    }

    .dark-mode .panel-tab.active {
        color: var(--accent-dark);
    }

    .panel-tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--primary-color);
    }

    .dark-mode .panel-tab.active::after {
        background: var(--accent-dark);
    }

    .close-panel {
        position: absolute;
        top: 0.65rem;
        right: 0.5rem;
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition-default);
    }

    .dark-mode .close-panel {
        color: #aaa;
    }

    .close-panel:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--text-light);
    }

    .dark-mode .close-panel:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-dark);
    }

    .panel-content {
        padding: 1.25rem;
        height: calc(100% - 53px);
        overflow-y: auto;
    }

    .panel-content h3 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        color: var(--text-light);
    }

    .dark-mode .panel-content h3 {
        color: var(--text-dark);
    }

    /* Lista de pistas */
    .tracks-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .track-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: var(--transition-default);
        position: relative;
    }

    .track-item:hover {
        background: rgba(0, 0, 0, 0.03);
    }

    .dark-mode .track-item:hover {
        background: rgba(255, 255, 255, 0.03);
    }

    .track-item.active {
        background: rgba(90, 103, 216, 0.08);
    }

    .dark-mode .track-item.active {
        background: rgba(129, 140, 248, 0.08);
    }

    .track-number {
        width: 24px;
        text-align: center;
        font-size: 0.875rem;
        color: #666;
    }

    .dark-mode .track-number {
        color: #aaa;
    }

    .track-thumbnail {
        width: 40px;
        height: 40px;
        border-radius: 4px;
        object-fit: cover;
        margin: 0 0.75rem;
    }

    .track-info {
        flex: 1;
        min-width: 0;
    }

    .track-name {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .track-artist {
        margin: 0.25rem 0 0;
        font-size: 0.75rem;
        color: #666;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .dark-mode .track-artist {
        color: #aaa;
    }

    .track-duration {
        font-size: 0.75rem;
        color: #666;
        margin-left: 0.5rem;
    }

    .dark-mode .track-duration {
        color: #aaa;
    }

    .add-to-queue {
        opacity: 0;
        background: transparent;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        margin-left: 0.5rem;
        padding: 0.25rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition-default);
    }

    .dark-mode .add-to-queue {
        color: var(--accent-dark);
    }

    .track-item:hover .add-to-queue {
        opacity: 1;
    }

    .add-to-queue:hover {
        background: rgba(90, 103, 216, 0.1);
    }

    .dark-mode .add-to-queue:hover {
        background: rgba(129, 140, 248, 0.1);
    }

    .empty-list {
        padding: 2rem 0;
        text-align: center;
        color: #666;
    }

    .dark-mode .empty-list {
        color: #aaa;
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .player-content {
            flex-direction: column;
        }

        .side-panel {
            width: auto;
            position: relative;
            transform: translateX(0);
            top: auto;
            right: auto;
            bottom: auto;
            display: none;
        }

        .side-panel.visible {
            display: block;
        }
    }

    @media (max-width: 576px) {
        .player-header {
            padding: 1rem;
        }

        .header-content h2 {
            font-size: 1.1rem;
        }

        .player-content {
            padding: 1rem;
        }

        .track-title {
            font-size: 1.25rem;
        }

        .player-controls {
            gap: 0.5rem;
        }

        .control-btn {
            width: 36px;
            height: 36px;
        }

        .control-btn.primary {
            width: 48px;
            height: 48px;
        }
    }
</style>
