import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw, Trophy } from 'lucide-react';

const TRACKS = [
  {
    id: 1,
    title: "Cybernetic Horizon",
    artist: "AI Soundscape (01)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "6:12"
  },
  {
    id: 2,
    title: "Neon Pulse",
    artist: "AI Soundscape (02)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "7:05"
  },
  {
    id: 3,
    title: "Digital Drift",
    artist: "AI Soundscape (03)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "5:44"
  }
];

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 }; // Start idle but going up on first move if not pressed

const generateFood = (snake: {x: number, y: number}[]) => {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    const collision = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    if (!collision) break;
  }
  return newFood;
};

export default function App() {
  // MUSIC PLAYER STATE
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // GAME STATE
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState({ x: 0, y: 0 }); // start without moving
  const [food, setFood] = useState({ x: 15, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  // DIRECTION REF to avoid rapid reverse inputs causing immediate collisions
  const directionRef = useRef(direction);
  
  // MUSIC LOGIC
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play blocked", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setProgress((current / duration) * 100 || 0);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTrackEnd = () => handleSkipForward();

  const handleSkipForward = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const handleSkipBack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  // GAME LOGIC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrows and space if gaming
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      
      // Spacebar plays/pauses if game is active or not
      if (e.key === " ") {
        if (!gameStarted) {
           e.preventDefault();
           togglePlay();
           return;
        }
        e.preventDefault();
      }

      if (gameOver) return;

      if (!gameStarted && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        setGameStarted(true);
      }

      const { x, y } = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
          if (y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
          if (x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
          if (x === 0) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, gameStarted, isPlaying]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection({ x: 0, y: 0 });
    setFood(generateFood(INITIAL_SNAKE));
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
  };

  useEffect(() => {
    if (gameOver || !gameStarted) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const currentDir = directionRef.current;
        
        // Prevent moving if direction is still 0,0 somehow
        if (currentDir.x === 0 && currentDir.y === 0) return prevSnake;

        const newHead = {
          x: head.x + currentDir.x,
          y: head.y + currentDir.y
        };

        // Wall Collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          return prevSnake;
        }

        // Self Collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food Collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 10);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const interval = setInterval(moveSnake, 100); // 100ms for faster snake
    return () => clearInterval(interval);
  }, [gameOver, gameStarted, food]);

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
    }
  }, [gameOver, score, highScore]);

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fuchsia-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-900/10 blur-[100px] rounded-full pointer-events-none" />
      
      <header className="mb-4 md:mb-12 text-center z-10 pt-4 md:pt-0">
        <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.4)]">
          NEON VIPER
        </h1>
        <p className="tracking-widest text-cyan-400 text-xs md:text-sm mt-2 opacity-80 uppercase">& Beats System</p>
      </header>

      <div className="flex flex-col-reverse xl:flex-row gap-8 xl:gap-16 items-center xl:items-start z-10 w-full max-w-[1200px] justify-center">
        
        {/* MUSIC PLAYER WIDGET */}
        <div className="w-full max-w-sm xl:max-w-md bg-[#0a0a0a] border border-cyan-500/20 rounded-2xl p-0 shadow-[0_0_30px_rgba(6,182,212,0.1)] relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-2xl opacity-10 group-hover:opacity-20 transition duration-500 blur"></div>
          
          <div className="relative bg-[#0d0d0d] rounded-2xl p-6 border border-white/5 h-full flex flex-col">
            <audio 
              ref={audioRef} 
              src={currentTrack.url} 
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleTrackEnd}
            />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-[10px] text-fuchsia-400 font-bold tracking-widest mb-2 uppercase">Audio Stream</h3>
                <h2 className="text-xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] line-clamp-1">{currentTrack.title}</h2>
                <p className="text-cyan-400/80 text-xs mt-1">{currentTrack.artist}</p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-black/50 overflow-hidden relative">
                 <div className={`absolute inset-0 bg-[conic-gradient(var(--color-cyan-400)_0deg,transparent_120deg)] ${isPlaying ? 'animate-[spin_2s_linear_infinite]' : 'hidden'}`} />
                 <div className="absolute inset-0.5 bg-[#0d0d0d] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full drop-shadow-[0_0_5px_white]" />
                 </div>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mb-6">
              <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                if (audioRef.current) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  audioRef.current.currentTime = pos * audioRef.current.duration;
                }
              }}>
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-semibold">
                <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}</span>
                <span>{currentTrack.duration}</span>
              </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center justify-between px-2">
              <button onClick={handleSkipBack} className="text-gray-400 hover:text-cyan-400 transition-colors hover:scale-110">
                <SkipBack size={24} />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-950 to-fuchsia-950 border border-fuchsia-500/50 text-white flex items-center justify-center hover:scale-105 hover:shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>
              
              <button onClick={handleSkipForward} className="text-gray-400 hover:text-cyan-400 transition-colors hover:scale-110">
                <SkipForward size={24} />
              </button>

              <div className="w-px h-8 bg-gray-800 mx-2" />

              <button onClick={toggleMute} className="text-gray-400 hover:text-fuchsia-400 transition-colors">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>

            {/* TRACKLIST */}
            <div className="mt-8 flex-1 flex flex-col justify-end">
              <div className="border-t border-white/5 space-y-1 pt-2">
                {TRACKS.map((track, idx) => (
                  <div 
                    key={track.id} 
                    onClick={() => {
                      setCurrentTrackIndex(idx);
                      setIsPlaying(true);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${idx === currentTrackIndex ? 'bg-gradient-to-r from-cyan-950/40 to-transparent border-l-2 border-cyan-400' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] sm:text-xs font-bold ${idx === currentTrackIndex ? 'text-cyan-400' : 'text-gray-600'}`}>0{track.id}</span>
                      <span className={`text-xs sm:text-sm ${idx === currentTrackIndex ? 'text-white' : 'text-gray-400'}`}>{track.title}</span>
                    </div>
                    {idx === currentTrackIndex && isPlaying && (
                      <div className="flex items-end gap-[2px] h-3">
                        <div className="w-[3px] bg-cyan-400 animate-[bounce_1s_infinite] h-full" />
                        <div className="w-[3px] bg-fuchsia-400 animate-[bounce_0.8s_infinite] h-2/3" />
                        <div className="w-[3px] bg-cyan-400 animate-[bounce_1.2s_infinite] h-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* GAME WIDGET */}
        <div className="flex flex-col items-center w-full max-w-[500px]">
          
          <div className="flex justify-between w-full mb-3 md:mb-4 px-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-cyan-400/70 uppercase tracking-widest mb-0.5">Score</span>
              <div className="flex items-center text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                <span className="font-black text-2xl md:text-3xl leading-none">{score.toString().padStart(4, '0')}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-fuchsia-400/70 uppercase tracking-widest mb-0.5">High Score</span>
              <div className="flex items-center gap-2 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]">
                <Trophy size={18} className="md:w-6 md:h-6" />
                <span className="font-black text-2xl md:text-3xl leading-none">{highScore.toString().padStart(4, '0')}</span>
              </div>
            </div>
          </div>

          <div className="relative w-full aspect-square max-w-[400px] xl:max-w-[500px] bg-[#050505] border border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.15)] rounded-xl overflow-hidden group">
            {/* Inner glow on grid borders */}
            <div className="absolute inset-0 ring-1 ring-inset ring-fuchsia-500/20 rounded-xl pointer-events-none z-30" />
            
            {/* Game Grid Overlay (subtle) */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:5%_5%]"></div>

            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                <div className="text-center bg-[#0a0a0a]/90 px-8 py-6 rounded-2xl border border-cyan-500/30">
                  <p className="text-cyan-400 font-bold tracking-widest mb-4 animate-pulse">SYSTEM READY</p>
                  <p className="text-gray-400 text-xs tracking-widest max-w-[200px]">PRESS W,A,S,D OR ARROWS TO INITIATE</p>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md z-20 transition-all">
                <h2 className="text-3xl md:text-4xl font-black text-fuchsia-500 mb-2 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)] tracking-widest">CRASH</h2>
                <p className="text-gray-300 mb-8 tracking-widest text-sm">FINAL SCORE: {score.toString().padStart(4, '0')}</p>
                <button 
                  onClick={resetGame}
                  className="group flex items-center gap-3 px-8 py-3 bg-fuchsia-500/10 border border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black hover:shadow-[0_0_30px_rgba(217,70,239,0.6)] transition-all rounded-full uppercase tracking-widest font-bold text-sm"
                >
                  <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> Reboot System
                </button>
              </div>
            )}

            {/* Render Snake */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              return (
                <div
                  key={`${segment.x}-${segment.y}-${index}`}
                  className={`absolute rounded-sm transition-all duration-[100ms] ease-linear ${isHead ? 'bg-cyan-300 shadow-[0_0_15px_rgba(103,232,249,1)] z-10' : 'bg-cyan-600/60 border border-cyan-400/30'}`}
                  style={{
                    width: '5%',
                    height: '5%',
                    left: `${(segment.x / GRID_SIZE) * 100}%`,
                    top: `${(segment.y / GRID_SIZE) * 100}%`,
                  }}
                />
              )
            })}

            {/* Render Food */}
            <div
              className="absolute flex items-center justify-center"
              style={{
                width: '5%',
                height: '5%',
                left: `${(food.x / GRID_SIZE) * 100}%`,
                top: `${(food.y / GRID_SIZE) * 100}%`,
              }}
            >
              <div className="w-2/3 h-2/3 bg-fuchsia-500 rounded-full shadow-[0_0_15px_rgba(217,70,239,1)] animate-pulse" />
            </div>
            
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-6 text-[10px] text-gray-500 uppercase tracking-widest">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-sm shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                <span>Player Unit</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-fuchsia-500 rounded-full shadow-[0_0_5px_rgba(217,70,239,0.8)]" />
                <span>Data Target</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
