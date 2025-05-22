// playerStore.ts - Principal store for the music player
import { writable, derived, type Writable, type Readable } from 'svelte/store';

// Types
export type RepeatMode = 'off' | 'one' | 'all';

export interface Track {
    id: string;
    title: string;
    artist: string;
    genre?: string;
    duration?: number;
    url: string;
    coverUrl?: string;
    album?: string;
    year?: number;
}

export interface PlayerState {
    currentTrack: Track | null;
    playlist: Track[];
    originalPlaylist: Track[];
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    loading: boolean;
    error: string | null;
    repeat: RepeatMode;
    shuffle: boolean;
    darkMode: boolean;
    history: Track[];
}

export interface PlaybackInfo {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    progress: number;
}

// Initial state
const initialState: PlayerState = {
    currentTrack: null,
    playlist: [],
    originalPlaylist: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    loading: false,
    error: null,
    repeat: 'off',
    shuffle: false,
    darkMode: false,
    history: [],
};

// Store creation with type safety
function createPlayerStore() {
    const { subscribe, set, update } = writable<PlayerState>(initialState);
    
    const store = {
        subscribe,
        set,
        update,

        // Player state methods
        setCurrentTrack: (track: Track) => update(state => ({ 
            ...state, 
            currentTrack: track,
            history: [...state.history, track].slice(-20)
        })),
        
        setIsPlaying: (value: boolean) => update(state => ({ ...state, isPlaying: value })),
        
        setCurrentTime: (value: number) => update(state => ({ ...state, currentTime: value })),
        
        setDuration: (value: number) => update(state => ({ ...state, duration: value })),
        
        setVolume: (value: number) => update(state => ({ 
            ...state, 
            volume: Math.max(0, Math.min(1, value)) // Ensure volume is between 0 and 1
        })),
        
        setLoading: (value: boolean) => update(state => ({ ...state, loading: value })),
        
        setError: (value: string | null) => update(state => ({ ...state, error: value })),
        
        toggleShuffle: () => update(state => ({ 
            ...state, 
            shuffle: !state.shuffle,
            playlist: state.shuffle ? [...state.originalPlaylist] : shuffleArray([...state.playlist], state.currentTrack)
        })),
        
        toggleRepeat: () => update(state => ({ 
            ...state, 
            repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off' 
        })),
        
        toggleDarkMode: () => update(state => ({ 
            ...state, 
            darkMode: !state.darkMode 
        })),
        
        // Playlist management methods
        setPlaylist: (tracks: Track[]) => update(state => ({ 
            ...state, 
            playlist: tracks,
            originalPlaylist: [...tracks]
        })),
        
        addToPlaylist: (track: Track) => update(state => {
            if (state.playlist.some(t => t.id === track.id)) return state;
            
            const newPlaylist = [...state.playlist, track];
            return { 
                ...state, 
                playlist: newPlaylist,
                originalPlaylist: [...newPlaylist]
            };
        }),
        
        removeFromPlaylist: (trackId: string) => update(state => {
            const newPlaylist = state.playlist.filter(t => t.id !== trackId);
            return { 
                ...state, 
                playlist: newPlaylist,
                originalPlaylist: state.originalPlaylist.filter(t => t.id !== trackId)
            };
        }),
        
        // Get next track based on current state
        getNextTrack: (): Track | null => {
            let nextTrack: Track | null = null;
            let currentState: PlayerState = initialState;
            
            const unsubscribe = playerStore.subscribe(state => {
                currentState = state;
            });
            unsubscribe();
            
            if (!currentState.currentTrack || !currentState.playlist.length) return null;
            
            const currentIndex = currentState.playlist.findIndex(
                t => t.id === currentState.currentTrack?.id
            );
            
            if (currentState.repeat === 'one') {
                nextTrack = currentState.currentTrack;
            } else if (currentState.repeat === 'all' || currentIndex < currentState.playlist.length - 1) {
                nextTrack = currentState.playlist[(currentIndex + 1) % currentState.playlist.length];
            }
            
            return nextTrack;
        },
        
        // Get previous track
        getPreviousTrack: (): Track | null => {
            let currentState: PlayerState = initialState;
            
            const unsubscribe = playerStore.subscribe(state => {
                currentState = state;
            });
            unsubscribe();
            
            if (!currentState.currentTrack || !currentState.playlist.length) return null;
            
            const currentIndex = currentState.playlist.findIndex(
                t => t.id === currentState.currentTrack?.id
            );
            
            if (currentState.repeat === 'one') {
                return currentState.currentTrack;
            }
            
            const prevIndex = currentIndex <= 0 ? 
                (currentState.repeat === 'all' ? currentState.playlist.length - 1 : -1) : 
                currentIndex - 1;
                
            return prevIndex >= 0 ? currentState.playlist[prevIndex] : null;
        },
        
        // Get similar tracks with improved logic
        getSimilarTracks: (track: Track): Track[] => {
            let currentState: PlayerState = initialState;
            
            const unsubscribe = playerStore.subscribe(state => {
                currentState = state;
            });
            unsubscribe();
            
            if (!track || !currentState.playlist.length) return [];
            
            return currentState.playlist
                .filter(t => t.id !== track.id)
                .map(t => ({
                    track: t,
                    score: calculateSimilarityScore(track, t)
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map(item => item.track);
        },
        
        // Reset store to initial state
        reset: () => set(initialState)
    };

    return store;
}

// Helper functions
function shuffleArray<T>(array: T[], currentTrack: T | null): T[] {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    
    // If there's a current track, ensure it stays at the beginning
    if (currentTrack) {
        const currentTrackIndex = shuffled.findIndex(item => item === currentTrack);
        if (currentTrackIndex !== -1) {
            [shuffled[0], shuffled[currentTrackIndex]] = [shuffled[currentTrackIndex], shuffled[0]];
            currentIndex = shuffled.length;
            while (--currentIndex > 1) {
                const randomIndex = Math.floor(Math.random() * (currentIndex - 1)) + 1;
                [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
            }
            return shuffled;
        }
    }
    
    // Normal shuffle
    while (--currentIndex) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }
    
    return shuffled;
}

function calculateSimilarityScore(track1: Track, track2: Track): number {
    let score = 0;
    
    // Same artist is a strong match
    if (track1.artist === track2.artist) score += 3;
    
    // Same genre is a good match
    if (track1.genre && track2.genre && track1.genre === track2.genre) score += 2;
    
    // Same album is a good match
    if (track1.album && track2.album && track1.album === track2.album) score += 2;
    
    // Similar year (within 2 years) is a minor match
    if (track1.year && track2.year && Math.abs(track1.year - track2.year) <= 2) score += 1;
    
    return score;
}

// Create and export the store
const store = createPlayerStore();
export const playerStore = store;
export const player = store;

// Derived store for playback info
export const playbackInfo: Readable<PlaybackInfo> = derived(
    playerStore,
    $playerStore => ({
        isPlaying: $playerStore.isPlaying,
        currentTime: $playerStore.currentTime,
        duration: $playerStore.duration,
        progress: $playerStore.duration ? 
            Math.min(100, Math.max(0, ($playerStore.currentTime / $playerStore.duration) * 100)) : 0
    })
); 