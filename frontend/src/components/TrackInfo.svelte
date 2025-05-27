<!-- TrackInfo.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    
    // Props
    export let track;
    
    // Event dispatcher para interacciones
    const dispatch = createEventDispatcher();
    
    // Estado local
    let showDetails = false;
    
    // Formatear la duración
    function formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }
    
    // Emitir eventos
    function showRecommendations() {
        dispatch('showRecommendations');
    }
    
    function downloadTrack() {
        dispatch('download');
    }
    
    function toggleDetails() {
        showDetails = !showDetails;
    }
</script>

<div class="track-info">
    <div class="track-basic-info">
        <div class="track-image" on:click={toggleDetails}>
            <img src={track.image} alt={track.title} />
            {#if !showDetails}
                <div class="image-overlay">
                    <span>Ver detalles</span>
                </div>
            {/if}
        </div>
        
        <div class="track-details">
            <h3>{track.title}</h3>
            <p class="artist">{track.artist}</p>
            
            <div class="track-actions">
                <button class="action-btn" on:click={showRecommendations}>
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-10h2v4h-2zm0-6h2v2h-2z"/>
                    </svg>
                    Similares
                </button>
                <button class="action-btn" on:click={downloadTrack}>
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    Descargar
                </button>
                <button class="action-btn" on:click={toggleDetails}>
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z"/>
                    </svg>
                    {showDetails ? 'Ocultar' : 'Más info'}
                </button>
            </div>
        </div>
    </div>
    
    {#if showDetails}
        <div class="track-extended-info" transition:slide={{ duration: 200 }}>
            <div class="info-grid">
                {#if track.album}
                    <div class="info-item">
                        <span class="info-label">Álbum:</span>
                        <span class="info-value">{track.album}</span>
                    </div>
                {/if}
                
                {#if track.genre}
                    <div class="info-item">
                        <span class="info-label">Género:</span>
                        <span class="info-value">{track.genre}</span>
                    </div>
                {/if}
                
                {#if track.year}
                    <div class="info-item">
                        <span class="info-label">Año:</span>
                        <span class="info-value">{track.year}</span>
                    </div>
                {/if}
                
                {#if track.duration}
                    <div class="info-item">
                        <span class="info-label">Duración:</span>
                        <span class="info-value">{formatDuration(track.duration)}</span>
                    </div>
                {/if}
                
                {#if track.bpm}
                    <div class="info-item">
                        <span class="info-label">BPM:</span>
                        <span class="info-value">{track.bpm}</span>
                    </div>
                {/if}
                
                {#if track.lyrics}
                    <div class="info-item full-width">
                        <span class="info-label">Letra:</span>
                        <div class="lyrics-container">
                            <pre>{track.lyrics}</pre>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .track-info {
        margin-bottom: 2rem;
        border-radius: 8px;
        overflow: hidden;
    }
    
    .track-basic-info {
        display: flex;
        align-items: center;
    }
    
    .track-image {
        width: 120px;
        height: 120px;
        margin-right: 1.5rem;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease;
    }
    
    .track-image:hover {
        transform: scale(1.03);
    }
    
    .track-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .track-image:hover .image-overlay {
        opacity: 1;
    }
    
    .image-overlay span {
        color: white;
        font-size: 0.85rem;
        font-weight: 500;
    }
    
    .track-details {
        flex: 1;
    }
    
    .track-details h3 {
        margin: 0;
        font-size: 1.5rem;
        margin-bottom: 0.3rem;
    }
    
    .artist {
        margin: 0 0 1rem;
        color: #666;
        font-size: 1.1rem;
    }
    
    :global(.dark-mode) .artist {
        color: #aaa;
    }
    
    .track-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    
    .action-btn {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.5rem 0.8rem;
        border: none;
        border-radius: 4px;
        background: #f0f0f0;
        color: #333;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    :global(.dark-mode) .action-btn {
        background: #444;
        color: #eee;
    }
    
    .action-btn:hover {
        background: #e0e0e0;
    }
    
    :global(.dark-mode) .action-btn:hover {
        background: #555;
    }
    
    .track-extended-info {
        margin-top: 1.5rem;
        padding: 1.5rem;
        background: #f5f5f5;
        border-radius: 8px;
    }
    
    :global(.dark-mode) .track-extended-info {
        background: #333;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
    }
    
    .info-item {
        display: flex;
        flex-direction: column;
    }
    
    .info-item.full-width {
        grid-column: 1 / -1;
    }
    
    .info-label {
        font-weight: 600;
        font-size: 0.85rem;
        margin-bottom: 0.3rem;
        color: #555;
    }
    
    :global(.dark-mode) .info-label {
        color: #bbb;
    }
    
    .info-value {
        font-size: 0.95rem;
    }
    
    .lyrics-container {
        max-height: 200px;
        overflow-y: auto;
        background: #fff;
        padding: 1rem;
        border-radius: 4px;
        margin-top: 0.5rem;
    }
    
    :global(.dark-mode) .lyrics-container {
        background: #222;
    }
    
    .lyrics-container pre {
        font-family: inherit;
        white-space: pre-wrap;
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
    }
</style>