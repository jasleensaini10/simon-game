"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type Color = "green" | "red" | "yellow" | "blue";
type GameState = "idle" | "showing" | "waiting" | "gameover";

const COLORS: Color[] = ["green", "red", "yellow", "blue"];

const COLOR_CONFIG: Record<
  Color,
  { base: string; active: string; glow: string; freq: number }
> = {
  green: {
    base: "bg-emerald-700 hover:bg-emerald-600",
    active: "bg-emerald-400",
    glow: "shadow-[0_0_40px_10px_rgba(52,211,153,0.7)]",
    freq: 329.63,
  },
  red: {
    base: "bg-red-700 hover:bg-red-600",
    active: "bg-red-400",
    glow: "shadow-[0_0_40px_10px_rgba(248,113,113,0.7)]",
    freq: 261.63,
  },
  yellow: {
    base: "bg-yellow-600 hover:bg-yellow-500",
    active: "bg-yellow-300",
    glow: "shadow-[0_0_40px_10px_rgba(253,224,71,0.7)]",
    freq: 392.0,
  },
  blue: {
    base: "bg-blue-700 hover:bg-blue-600",
    active: "bg-blue-400",
    glow: "shadow-[0_0_40px_10px_rgba(96,165,250,0.7)]",
    freq: 440.0,
  },
};

const PAD_POSITIONS: Record<Color, string> = {
  green: "rounded-tl-full rounded-tr-[12px] rounded-bl-[12px]",
  red: "rounded-tr-full rounded-tl-[12px] rounded-br-[12px]",
  yellow: "rounded-bl-full rounded-tl-[12px] rounded-br-[12px]",
  blue: "rounded-br-full rounded-bl-[12px] rounded-tr-[12px]",
};

function playTone(frequency: number, duration: number = 0.3) {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    setTimeout(() => ctx.close(), duration * 1000 + 100);
  } catch {
    // Audio not available
  }
}

function playErrorSound() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(100, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);

    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio not available
  }
}

export default function SimonGame() {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState<"normal" | "fast" | "insane">("normal");
  const isPlayingRef = useRef(false);

  const speedMs: Record<string, number> = {
    normal: 600,
    fast: 400,
    insane: 220,
  };

  useEffect(() => {
    const stored = localStorage.getItem("simon-high-score");
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  const flashPad = useCallback(
    (color: Color, duration: number = 300): Promise<void> => {
      return new Promise((resolve) => {
        setActiveColor(color);
        playTone(COLOR_CONFIG[color].freq, duration / 1000);
        setTimeout(() => {
          setActiveColor(null);
          setTimeout(resolve, 100);
        }, duration);
      });
    },
    []
  );

  const playSequence = useCallback(
    async (seq: Color[]) => {
      if (isPlayingRef.current) return;
      isPlayingRef.current = true;
      setGameState("showing");

      await new Promise((r) => setTimeout(r, 500));

      const delay = speedMs[speed];
      for (const color of seq) {
        if (!isPlayingRef.current) return;
        await flashPad(color, delay * 0.6);
        await new Promise((r) => setTimeout(r, delay * 0.2));
      }

      isPlayingRef.current = false;
      setGameState("waiting");
      setPlayerIndex(0);
    },
    [flashPad, speed, speedMs]
  );

  const startGame = useCallback(() => {
    const firstColor = COLORS[Math.floor(Math.random() * 4)];
    const newSeq = [firstColor];
    setSequence(newSeq);
    setScore(0);
    setPlayerIndex(0);
    isPlayingRef.current = false;
    playSequence(newSeq);
  }, [playSequence]);

  const nextRound = useCallback(
    (currentSeq: Color[]) => {
      const nextColor = COLORS[Math.floor(Math.random() * 4)];
      const newSeq = [...currentSeq, nextColor];
      setSequence(newSeq);
      setPlayerIndex(0);
      playSequence(newSeq);
    },
    [playSequence]
  );

  const handlePadClick = useCallback(
    async (color: Color) => {
      if (gameState !== "waiting") return;

      setActiveColor(color);
      playTone(COLOR_CONFIG[color].freq, 0.2);
      setTimeout(() => setActiveColor(null), 200);

      if (color === sequence[playerIndex]) {
        const nextIndex = playerIndex + 1;

        if (nextIndex === sequence.length) {
          const newScore = score + 1;
          setScore(newScore);

          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem("simon-high-score", newScore.toString());
          }

          setTimeout(() => nextRound(sequence), 600);
        } else {
          setPlayerIndex(nextIndex);
        }
      } else {
        playErrorSound();
        setGameState("gameover");
      }
    },
    [gameState, sequence, playerIndex, score, highScore, nextRound]
  );

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Score display */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-8 text-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Score
            </p>
            <p className="text-4xl font-bold text-white tabular-nums">
              {score}
            </p>
          </div>
          <div className="w-px bg-zinc-800" />
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Best
            </p>
            <p className="text-4xl font-bold text-zinc-400 tabular-nums">
              {highScore}
            </p>
          </div>
        </div>
      </div>

      {/* Game board */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-3 w-[280px] h-[280px] sm:w-[340px] sm:h-[340px]">
          {(["green", "red", "yellow", "blue"] as Color[]).map((color) => {
            const isActive = activeColor === color;
            const isClickable = gameState === "waiting";
            const cfg = COLOR_CONFIG[color];

            return (
              <button
                key={color}
                onClick={() => handlePadClick(color)}
                disabled={!isClickable}
                className={`
                  ${PAD_POSITIONS[color]}
                  ${isActive ? `${cfg.active} ${cfg.glow}` : cfg.base}
                  transition-all duration-150 ease-out
                  ${isClickable ? "cursor-pointer active:scale-95" : "cursor-default"}
                  ${!isClickable && !isActive ? "opacity-60" : "opacity-100"}
                  border-2 border-white/10
                `}
                aria-label={`${color} pad`}
              />
            );
          })}

          {/* Center circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center">
              {gameState === "idle" && (
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Simon
                </span>
              )}
              {gameState === "showing" && (
                <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider animate-pulse">
                  Watch
                </span>
              )}
              {gameState === "waiting" && (
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Your Turn
                </span>
              )}
              {gameState === "gameover" && (
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Game Over
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {gameState === "waiting" && (
        <div className="flex gap-1.5 items-center">
          {sequence.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < playerIndex ? "bg-emerald-400" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>
      )}

      {/* Speed selector */}
      <div className="flex gap-2">
        {(["normal", "fast", "insane"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            disabled={gameState === "showing" || gameState === "waiting"}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all
              ${
                speed === s
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Start / Restart button */}
      {(gameState === "idle" || gameState === "gameover") && (
        <button
          onClick={startGame}
          className="group relative px-8 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold text-lg
            hover:from-emerald-400 hover:to-blue-400 transition-all duration-300
            shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_50px_rgba(52,211,153,0.5)]
            active:scale-95"
        >
          {gameState === "idle" ? "Start Game" : "Play Again"}
        </button>
      )}

      {gameState === "showing" && (
        <p className="text-zinc-500 text-sm animate-pulse">
          Memorize the sequence...
        </p>
      )}

      {gameState === "waiting" && (
        <p className="text-zinc-500 text-sm">
          Repeat the pattern ({playerIndex}/{sequence.length})
        </p>
      )}
    </div>
  );
}
