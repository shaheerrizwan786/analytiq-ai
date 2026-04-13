export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <main className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Analytiq AI</h1>
          <p className="mt-1 text-sm text-gray-500">
            Restaurant feedback intelligence — powered by AI.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restaurant Name
            </label>
            <input
              type="text"
              placeholder="e.g. Nobu Melbourne"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              placeholder="e.g. Melbourne, VIC"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <button
            className="w-full mt-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Connect &amp; Analyse
          </button>
        </div>
      </main>
    </div>
  );
}
