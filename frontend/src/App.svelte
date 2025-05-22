<script>
    import '../src/global.css';
    import MusicPlayer from './components/MusicPlayer.svelte';
    import { player } from './stores/playerStore';
    
    // Simulación de una playlist
    const playlist = [
        {
            id: 1,
            title: "Track 1",
            artist: "Artist 1",
            image: "https://via.placeholder.com/100",
            url: "https://example.com/track1.mp3"
        },
        {
            id: 2,
            title: "Track 2",
            artist: "Artist 2",
            image: "https://via.placeholder.com/100",
            url: "https://example.com/track2.mp3"
        }
    ];

    // Inicializar la playlist
    player.setPlaylist(playlist);
</script>

<div class="app-container">
    <MusicPlayer />
</div>

<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background-color: #121212;
        color: #fff;
        min-height: 100vh;
    }
    
    .app-container {
        width: 100%;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
    }
</style>
