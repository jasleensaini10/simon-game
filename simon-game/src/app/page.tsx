import SimonGame from "./components/SimonGame";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-950 font-sans min-h-screen">
      <main className="flex flex-1 w-full flex-col items-center justify-center py-12 px-4">
        <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 mb-2 tracking-tight">
          Simon
        </h1>
        <p className="text-zinc-500 text-sm mb-10 tracking-wide">
          Test your memory
        </p>
        <SimonGame />
        <footer className="mt-12 text-zinc-700 text-xs">
          Press the colored pads in the correct order
        </footer>
      </main>
    </div>
  );
}
