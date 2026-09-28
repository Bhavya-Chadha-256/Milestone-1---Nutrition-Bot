"use client";
import { useEffect, useState } from "react";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs")
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-teal-400">Phase 8 Failure Logs</h1>
          <a href="/" className="text-gray-400 hover:text-white underline">Back to Chat</a>
        </header>

        {loading ? (
          <p>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p>No failure logs recorded yet. Run the Phase 8 script!</p>
        ) : (
          <div className="grid gap-6">
            {logs.map((log) => (
              <div key={log.id} className="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow">
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 bg-gray-800 text-xs font-semibold text-gray-400 rounded mr-2">
                    {log.category}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(log.run_at).toLocaleString()}</span>
                </div>
                <h3 className="text-xl font-medium mb-3">{log.question}</h3>
                
                <div className="mb-3">
                  <strong className="text-teal-500">Failures detected: </strong>
                  {JSON.parse(log.failure_types).length > 0 ? (
                    <span className="text-red-400 font-medium">{JSON.parse(log.failure_types).join(", ")}</span>
                  ) : (
                    <span className="text-green-500 font-medium">None ✅</span>
                  )}
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-200 transition-colors">View Raw JSON Response</summary>
                  <pre className="mt-3 p-3 bg-gray-950 rounded text-gray-300 overflow-x-auto whitespace-pre-wrap border border-gray-800">
                    {log.response_json}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
