import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 sm:p-20 font-sans">
      <main className="max-w-4xl mx-auto flex flex-col gap-12">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent pb-2">
            DevTools
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400">
            Essential utilities for modern development
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Downloader Card */}
          <Link
            href="/downloader"
            className="group relative block p-8 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">
                ⬇️
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Downloader
                </h2>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  Download videos and media from various sources including YouTube. Simple and fast.
                </p>
              </div>
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                Open Tool <span>→</span>
              </div>
            </div>
          </Link>

          {/* JSON Visualizer Card */}
          <Link
            href="/json-visualizer"
            className="group relative block p-8 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:border-emerald-500/50 dark:hover:border-emerald-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl">
                {/* JSON Icon representation */}
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{"{ }"}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  JSON Visualizer
                </h2>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  Beautify, validate, and explore JSON data with an interactive tree view.
                </p>
              </div>
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                Open Tool <span>→</span>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
