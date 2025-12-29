"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { generateAPI, historyAPI } from "@/lib/api";
import type { GenerateResponse, Run } from "@/lib/types";

// Dynamically import Monaco Editor (client-side only)
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Example presets
const EXAMPLES = {
  simple: {
    prompt: "Extract the person information: John Doe is 30 years old and lives in San Francisco. His email is john@example.com",
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        email: { type: "string" },
      },
      required: ["name", "age", "email"],
    }
  },
  complex: {
    prompt: `Analyze this product review and extract detailed structured information:

"I recently purchased the TechPro X1 Laptop from BestElectronics on December 15, 2024.
The laptop has an amazing 15.6-inch 4K display and the Intel i9-13900H processor is incredibly fast.
I paid $1,899.99 which included a 2-year warranty.

Pros: The battery life is outstanding - I get about 12 hours on a single charge. The build quality
feels premium with its aluminum chassis. The keyboard is comfortable for long typing sessions.

Cons: It runs quite hot under heavy load, reaching temps around 85°C. The fans can get pretty loud
during gaming. Also, at 4.2 pounds, it's heavier than I expected.

The customer service was excellent - Sarah from support helped me set everything up via email
(support@bestelectronics.com). They responded within 2 hours.

Overall, I'd rate this laptop 4 out of 5 stars. It's perfect for professional work and content
creation, though gamers might want something with better cooling. I'd definitely recommend it to
software developers and video editors.

Update (Dec 20, 2024): After using it for a week, the battery life has been consistently great.
I'm updating my rating to 4.5 stars."`,
    schema: {
      type: "object",
      properties: {
        product: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            price: { type: "number" },
            warranty_years: { type: "number" }
          },
          required: ["name", "price"]
        },
        purchase_details: {
          type: "object",
          properties: {
            store: { type: "string" },
            date: { type: "string", format: "date" },
            purchase_price: { type: "number" }
          },
          required: ["store", "date"]
        },
        specifications: {
          type: "object",
          properties: {
            screen_size: { type: "string" },
            processor: { type: "string" },
            weight_pounds: { type: "number" },
            battery_life_hours: { type: "number" }
          }
        },
        pros: {
          type: "array",
          items: { type: "string" },
          minItems: 1
        },
        cons: {
          type: "array",
          items: { type: "string" },
          minItems: 1
        },
        ratings: {
          type: "object",
          properties: {
            initial_rating: { type: "number", minimum: 0, maximum: 5 },
            updated_rating: { type: "number", minimum: 0, maximum: 5 },
            would_recommend: { type: "boolean" }
          },
          required: ["initial_rating"]
        },
        customer_service: {
          type: "object",
          properties: {
            representative_name: { type: "string" },
            contact_method: { type: "string" },
            email: { type: "string", format: "email" },
            response_time_hours: { type: "number" },
            quality_rating: { type: "string", enum: ["excellent", "good", "average", "poor"] }
          }
        },
        recommended_for: {
          type: "array",
          items: { type: "string" }
        },
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", format: "date" },
              content: { type: "string" }
            }
          }
        }
      },
      required: ["product", "purchase_details", "pros", "cons", "ratings"]
    }
  }
};

export default function Home() {
  const [prompt, setPrompt] = useState(EXAMPLES.complex.prompt);
  const [schema, setSchema] = useState(JSON.stringify(EXAMPLES.complex.schema, null, 2));
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1500);
  const [apiKey, setApiKey] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Run[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadExample = (example: keyof typeof EXAMPLES) => {
    setPrompt(EXAMPLES[example].prompt);
    setSchema(JSON.stringify(EXAMPLES[example].schema, null, 2));
    setResult(null);
    setError(null);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await historyAPI.list({ page: 1, page_size: 50 });
      setHistory(response.runs);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadFromHistory = (run: Run) => {
    setPrompt(run.prompt);
    setSchema(JSON.stringify(run.json_schema, null, 2));
    setProvider(run.provider);
    setModel(run.model);
    setShowHistory(false);
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  // Progress through loading stages
  useEffect(() => {
    if (!loading) {
      setLoadingStage(0);
      return;
    }

    const stages = [
      { delay: 0, stage: 0 },      // "Analyzing schema..."
      { delay: 800, stage: 1 },    // "Preparing prompt..."
      { delay: 1600, stage: 2 },   // "Generating response..."
      { delay: 3000, stage: 3 },   // "Validating output..."
    ];

    const timers = stages.map(({ delay, stage }) =>
      setTimeout(() => setLoadingStage(stage), delay)
    );

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    setLoadingStage(0);
    setError(null);
    setResult(null);

    try {
      const jsonSchema = JSON.parse(schema);

      const response = await generateAPI.generate({
        prompt,
        json_schema: jsonSchema,
        provider,
        model,
        temperature,
        max_tokens: maxTokens,
        ...(apiKey && { api_key: apiKey }),
      });

      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-gray-100 relative">
      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute inset-y-0 left-0 w-80 bg-[#252525] border-r border-gray-800 z-50 flex flex-col">
          {/* History Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold">History</h2>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                No history yet
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {history.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => loadFromHistory(run)}
                    className="w-full text-left p-3 bg-[#2d2d2d] hover:bg-[#363636] border border-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-500">#{run.id}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${run.validation_status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-gray-500">{run.provider}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                      {run.prompt}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{run.model}</span>
                      {run.latency_ms && <span>{run.latency_ms.toFixed(0)}ms</span>}
                      {run.tokens_used && <span>{run.tokens_used} tokens</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Left Side - Input */}
      <div className="flex-1 flex flex-col border-r border-gray-800">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <h1 className="text-sm font-semibold">Parsec Playground</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#363636] border border-gray-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate
              </>
            )}
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="p-6 border-b border-gray-800 space-y-4">
          {/* Example Selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Example Presets</label>
            <div className="flex gap-2">
              <button
                onClick={() => loadExample('simple')}
                className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#363636] border border-gray-700 rounded-md text-sm transition-colors"
              >
                Simple Person
              </button>
              <button
                onClick={() => loadExample('complex')}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-md text-sm transition-colors text-blue-400"
              >
                Complex Review (Recommended)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-[#2d2d2d] border border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#2d2d2d] border border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {provider === "openai" ? (
                  <>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </>
                ) : (
                  <>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full bg-[#2d2d2d] border border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full bg-[#2d2d2d] border border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* API Key Input */}
          <div className="mt-3">
            <label className="block text-xs text-gray-400 mb-1.5">
              API Key (Optional)
              <span className="ml-2 text-gray-500">Leave empty to use server key</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
              className="w-full bg-[#2d2d2d] border border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Editors */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Prompt */}
          <div className="flex-1 flex flex-col border-b border-gray-800">
            <div className="h-10 flex items-center px-6 border-b border-gray-800">
              <span className="text-xs font-medium text-gray-400">PROMPT</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={prompt}
                onChange={(value) => setPrompt(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "off",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  padding: { top: 16, bottom: 16 },
                  renderLineHighlight: "none",
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  scrollbar: {
                    vertical: "auto",
                    horizontal: "hidden",
                  },
                }}
              />
            </div>
          </div>

          {/* Schema */}
          <div className="flex-1 flex flex-col">
            <div className="h-10 flex items-center px-6 border-b border-gray-800">
              <span className="text-xs font-medium text-gray-400">JSON SCHEMA</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={schema}
                onChange={(value) => setSchema(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  renderLineHighlight: "none",
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Output */}
      <div className="w-[600px] flex flex-col bg-[#252525]">
        {/* Output Header */}
        <div className="h-14 flex items-center px-6 border-b border-gray-800">
          <span className="text-sm font-semibold">Output</span>
        </div>

        {/* Output Content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-400">Error</h3>
                  <p className="text-sm text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-6">
                {/* Animated spinner */}
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                </div>

                {/* Progressive loading messages */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">
                    {loadingStage === 0 && "Analyzing schema..."}
                    {loadingStage === 1 && "Preparing prompt..."}
                    {loadingStage === 2 && "Generating response..."}
                    {loadingStage === 3 && "Validating output..."}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <div className={`w-2 h-2 rounded-full transition-colors ${loadingStage >= 0 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                    <div className={`w-2 h-2 rounded-full transition-colors ${loadingStage >= 1 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                    <div className={`w-2 h-2 rounded-full transition-colors ${loadingStage >= 2 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                    <div className={`w-2 h-2 rounded-full transition-colors ${loadingStage >= 3 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!result && !error && !loading && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No output yet</p>
                <p className="text-xs text-gray-600 mt-1">Click Generate to see results</p>
              </div>
            </div>
          )}

          {result && (
            <div className="p-6 space-y-4">
              {/* Metrics Bar */}
              <div className="grid grid-cols-4 gap-4 pb-4 border-b border-gray-800">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Run ID</p>
                  <p className="text-sm font-mono text-gray-300">#{result.run_id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${result.validation_status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className={`text-sm font-medium ${result.validation_status ? 'text-green-400' : 'text-red-400'}`}>
                      {result.validation_status ? 'Valid' : 'Invalid'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Latency</p>
                  <p className="text-sm font-mono text-gray-300">{result.latency_ms.toFixed(0)}ms</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tokens</p>
                  <p className="text-sm font-mono text-gray-300">{result.tokens_used}</p>
                </div>
              </div>

              {/* Parsed Output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-400">PARSED OUTPUT</h3>
                </div>
                <div className="bg-[#1e1e1e] rounded-lg border border-gray-800 overflow-hidden">
                  <Editor
                    height="200px"
                    defaultLanguage="json"
                    value={JSON.stringify(result.parsed_output, null, 2)}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "off",
                      scrollBeyondLastLine: false,
                      renderLineHighlight: "none",
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              </div>

              {/* Raw Output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-400">RAW OUTPUT</h3>
                </div>
                <div className="bg-[#1e1e1e] rounded-lg border border-gray-800 p-4">
                  <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-auto">
                    {result.raw_output}
                  </pre>
                </div>
              </div>

              {/* Validation Errors */}
              {result.validation_errors && result.validation_errors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-gray-400">VALIDATION ERRORS</h3>
                  </div>
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                    <ul className="space-y-2">
                      {result.validation_errors.map((err, i) => (
                        <li key={i} className="text-sm text-red-300 font-mono">
                          <span className="text-red-400">{err.path}:</span> {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
