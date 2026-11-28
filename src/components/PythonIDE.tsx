import React, { useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import { Terminal, Play, RotateCcw, Globe, Code2, Sparkles, Loader2, Eye } from 'lucide-react';
import { aiService } from '../services/ai';
import { useLanguage } from '../hooks/useLanguage';

type CodeLang = 'python' | 'javascript' | 'html-css' | 'web-studio';

const PYTHON_GUIDES = [
  { title: "Hello Learnify", desc: "Basic print statement output.", code: 'print("Hello Learnify!")' },
  { title: "Variable Logic", desc: "Assigning values to symbols.", code: 'a = 10\nb = 20\nprint(a + b)' },
  { title: "Syntax Error Check", desc: "What happens when you miss a quote?", code: 'print("Missing Quote)' },
  { title: "Math Operations", desc: "Multiply, divide and subtract.", code: 'print(10 * 5)\nprint(100 / 4)' },
  { title: "String Formats", desc: "Using f-strings for output.", code: 'name = "Dev"\nprint(f"User: {name}")' },
  { title: "List Basics", desc: "Creating a data collection.", code: 'my_list = [1, 2, 3]\nprint(my_list)' },
  { title: "Loop Simulation", desc: "Repeating actions efficiently.", code: 'for i in range(5):\n  print(f"Step {i}")' },
  { title: "Boolean Checks", desc: "True and False evaluations.", code: 'print(10 > 5)' },
  { title: "Conditional Split", desc: "If/Else structural logic.", code: 'if 5 > 2:\n  print("Logic Correct")' },
  { title: "Function Define", desc: "Wrapping code in reuse blocks.", code: 'def start():\n  print("Engine Active")\n\nstart()' },
  { title: "Input Capture", desc: "Reading user interactions.", code: 'print("Simulation Input: 42")' },
  { title: "Dictionary Map", desc: "Key-value pair storage.", code: 'user = {"id": 1}\nprint(user)' },
  { title: "Class Structure", desc: "OOP foundation basics.", code: 'class Robot:\n  pass\n\nprint("Robot Created")' },
  { title: "Library Import", desc: "Using math and other modules.", code: 'print("Importing physics data...")' },
  { title: "List Slicing", desc: "Getting parts of a collection.", code: 'data = [0, 1, 2, 3]\nprint(data[0:2])' },
  { title: "While Loops", desc: "Condition-based repetition.", code: 'count = 0\nwhile count < 3:\n  print(f"Tick {count}")\n  count = count + 1' },
  { title: "Exception Handling", desc: "Try/Except safety protocols.", code: 'try:\n  print(1/0)\nexcept:\n  print("Error blocked")' },
  { title: "Data Parsing", desc: "Filtering information from text.", code: 'print("Extracting insights...")' },
  { title: "Algorithm Efficiency", desc: "Big O notation basics.", code: 'print("Complexity: O(n)")' },
  { title: "Binary Logic", desc: "Bitwise operations exploration.", code: 'print(bin(10))' }
];

const JS_GUIDES = [
  {
    title: 'Ohm Law Function',
    desc: 'Compute current V/R with arrow functions.',
    code: 'const voltage = 12;\nconst resistance = 4;\nconst current = voltage / resistance;\nconsole.log(`Current I = ${current} A`);',
  },
  {
    title: 'Array Filter & Map',
    desc: 'Filter passing lab scores above 70.',
    code: 'const scores = [55, 78, 92, 64, 88];\nconst passed = scores.filter(s => s >= 70);\nconsole.log("Passed:", passed);\nconsole.log("Count:", passed.length);',
  },
  {
    title: 'Fibonacci Sequence',
    desc: 'Generate first 8 Fibonacci terms.',
    code: 'const fib = [0, 1];\nfor (let i = 2; i < 8; i++) {\n  fib.push(fib[i - 1] + fib[i - 2]);\n}\nconsole.log("Fibonacci:", fib.join(", "));',
  },
];

const HTML_GUIDES = [
  {
    title: 'Periodic Element Card',
    desc: 'Semantic HTML + styled CSS card.',
    code: '<div class="card">\n  <span class="num">6 · Carbon</span>\n  <h2>C</h2>\n  <p>Atomic Mass: 12.011 u</p>\n</div>\n<style>\n  body { font-family: system-ui; background: #0f172a; color: #f8fafc; display: grid; place-items: center; min-height: 90vh; }\n  .card { border: 2px solid #f59e0b; border-radius: 18px; padding: 24px 36px; text-align: center; background: #1e293b; }\n  .num { color: #fbbf24; font-weight: 700; font-size: 12px; text-transform: uppercase; }\n  h2 { font-size: 48px; margin: 8px 0; color: #38bdf8; }\n</style>',
  },
  {
    title: 'Flexbox Lab Layout',
    desc: 'Responsive 3-column CSS grid.',
    code: '<div class="grid">\n  <div class="box">Physics</div>\n  <div class="box">Chemistry</div>\n  <div class="box">Biology</div>\n</div>\n<style>\n  body { font-family: sans-serif; padding: 20px; background: #090d16; }\n  .grid { display: flex; gap: 12px; }\n  .box { flex: 1; padding: 20px; border-radius: 12px; background: #1e293b; color: #fbbf24; font-weight: 700; text-align: center; border: 1px solid #334155; }\n</style>',
  },
];

const WEB_STUDIO_GUIDES = [
  {
    title: 'Interactive Counter App',
    desc: 'HTML + CSS + JS live DOM clicker.',
    code: '<div class="wrap">\n  <h3>Lab Sample Counter</h3>\n  <p id="val">0</p>\n  <button id="btn">Add Sample</button>\n</div>\n<style>\n  body { font-family: system-ui; background: #0f172a; color: #fff; text-align: center; padding-top: 40px; }\n  button { background: #f59e0b; color: #000; border: 0; padding: 10px 20px; border-radius: 10px; font-weight: 800; cursor: pointer; }\n  #val { font-size: 42px; color: #38bdf8; margin: 12px 0; }\n</style>\n<script>\n  let n = 0;\n  document.getElementById("btn").addEventListener("click", () => {\n    n += 1;\n    document.getElementById("val").textContent = n;\n    console.log("Sample count updated:", n);\n  });\n</script>',
  },
];

function formatPythonValue(val: unknown): string {
  if (val === true) return 'True';
  if (val === false) return 'False';
  if (val === null || val === undefined) return 'None';
  if (Array.isArray(val)) return '[' + val.map(formatPythonValue).join(', ') + ']';
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>).map(
      ([k, v]) => `'${k}': ${formatPythonValue(v)}`
    );
    return '{' + entries.join(', ') + '}';
  }
  return String(val);
}

function checkSyntax(source: string): string | null {
  const lines = source.split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    let inSingle = false;
    let inDouble = false;
    let parenDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (ch === '#') break;
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
        else if (ch === '[') bracketDepth++;
        else if (ch === ']') bracketDepth--;
      }
    }

    if (inSingle || inDouble) {
      return `SyntaxError: unterminated string literal (line ${idx + 1})`;
    }
    if (parenDepth !== 0 || bracketDepth !== 0) {
      return `SyntaxError: unmatched brackets or parentheses (line ${idx + 1})`;
    }
  }
  return null;
}

function evalPythonExpr(expr: string, env: Record<string, any>): any {
  const trimmed = expr.trim();
  if (trimmed === 'True') return true;
  if (trimmed === 'False') return false;
  if (trimmed === 'None') return null;

  if ((trimmed.startsWith('f"') && trimmed.endsWith('"')) || (trimmed.startsWith("f'") && trimmed.endsWith("'"))) {
    const inner = trimmed.slice(2, -1);
    return inner.replace(/\{([^}]+)\}/g, (_, code) => formatPythonValue(evalPythonExpr(code, env)));
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  const sliceMatch = trimmed.match(/^([a-zA-Z_]\w*)\[(\d*):(\d*)\]$/);
  if (sliceMatch) {
    const arr = env[sliceMatch[1]];
    if (Array.isArray(arr)) {
      const start = sliceMatch[2] ? Number(sliceMatch[2]) : 0;
      const end = sliceMatch[3] ? Number(sliceMatch[3]) : arr.length;
      return arr.slice(start, end);
    }
  }

  const binMatch = trimmed.match(/^bin\((.+)\)$/);
  if (binMatch) {
    const n = Number(evalPythonExpr(binMatch[1], env));
    return '0b' + (n >>> 0).toString(2);
  }
  const lenMatch = trimmed.match(/^len\((.+)\)$/);
  if (lenMatch) {
    const v = evalPythonExpr(lenMatch[1], env);
    return v?.length ?? 0;
  }

  const jsExpr = trimmed
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    .replace(/\bnot\s+/g, '!');

  const keys = Object.keys(env);
  const vals = Object.values(env);
  const fn = new Function(...keys, `"use strict"; return (${jsExpr});`);
  const result = fn(...vals);
  if (typeof result === 'number' && !Number.isFinite(result)) {
    throw new Error('ZeroDivisionError: division by zero');
  }
  return result;
}

function executePythonSubset(source: string): string[] {
  const syntaxErr = checkSyntax(source);
  if (syntaxErr) return [`Error: ${syntaxErr}`];

  const output: string[] = [];
  const env: Record<string, any> = {};
  const functions: Record<string, string[]> = {};
  const rawLines = source.split('\n');

  const runBlock = (lines: string[], startIdx: number, baseIndent: number): number => {
    let i = startIdx;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }
      const indent = line.length - line.trimStart().length;
      if (indent < baseIndent) break;

      if (trimmed === 'pass') {
        i++;
        continue;
      }

      if (trimmed.startsWith('class ')) {
        const classIndent = indent;
        i++;
        while (i < lines.length) {
          const next = lines[i];
          if (next.trim() && next.length - next.trimStart().length <= classIndent) break;
          i++;
        }
        continue;
      }

      if (trimmed.startsWith('def ')) {
        const fnMatch = trimmed.match(/^def\s+([a-zA-Z_]\w*)\(\)\s*:$/);
        const defIndent = indent;
        i++;
        const body: string[] = [];
        while (i < lines.length) {
          const next = lines[i];
          if (next.trim() && next.length - next.trimStart().length <= defIndent) break;
          body.push(next);
          i++;
        }
        if (fnMatch) functions[fnMatch[1]] = body;
        continue;
      }

      if (trimmed.startsWith('try:')) {
        const tryIndent = indent;
        i++;
        const tryBody: string[] = [];
        while (i < lines.length) {
          const next = lines[i];
          if (next.trim() && next.length - next.trimStart().length <= tryIndent) break;
          tryBody.push(next);
          i++;
        }
        let exceptBody: string[] = [];
        if (i < lines.length && lines[i].trim().startsWith('except')) {
          i++;
          while (i < lines.length) {
            const next = lines[i];
            if (next.trim() && next.length - next.trimStart().length <= tryIndent) break;
            exceptBody.push(next);
            i++;
          }
        }
        try {
          runBlock(tryBody, 0, tryIndent + 1);
        } catch {
          runBlock(exceptBody, 0, tryIndent + 1);
        }
        continue;
      }

      const forMatch = trimmed.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+range\((\d+)\)\s*:$/);
      if (forMatch) {
        const loopVar = forMatch[1];
        const count = Math.min(100, Number(forMatch[2]));
        const loopIndent = indent;
        i++;
        const body: string[] = [];
        while (i < lines.length) {
          const next = lines[i];
          if (next.trim() && next.length - next.trimStart().length <= loopIndent) break;
          body.push(next);
          i++;
        }
        for (let k = 0; k < count; k++) {
          env[loopVar] = k;
          runBlock(body, 0, loopIndent + 1);
        }
        continue;
      }

      const whileMatch = trimmed.match(/^while\s+(.+)\s*:$/);
      if (whileMatch) {
        const cond = whileMatch[1];
        const loopIndent = indent;
        i++;
        const body: string[] = [];
        while (i < lines.length) {
          const next = lines[i];
          if (next.trim() && next.length - next.trimStart().length <= loopIndent) break;
          body.push(next);
          i++;
        }
        let guard = 0;
        while (evalPythonExpr(cond, env) && guard < 100) {
          runBlock(body, 0, loopIndent + 1);
          guard++;
        }
        continue;
      }

      const ifMatch = trimmed.match(/^if\s+(.+)\s*:$/);
      if (ifMatch) {
        const cond = ifMatch[1];
        const ifIndent = indent;
        i++;
        const body: string[] = [];
        while (i < lines.length) {
          const next = lines[i];
          if (next.trim() && next.length - next.trimStart().length <= ifIndent) break;
          body.push(next);
          i++;
        }
        if (evalPythonExpr(cond, env)) {
          runBlock(body, 0, ifIndent + 1);
        }
        continue;
      }

      const printMatch = trimmed.match(/^print\((.*)\)$/);
      if (printMatch) {
        const val = evalPythonExpr(printMatch[1], env);
        output.push(formatPythonValue(val));
        i++;
        continue;
      }

      const callMatch = trimmed.match(/^([a-zA-Z_]\w*)\(\)$/);
      if (callMatch && functions[callMatch[1]]) {
        runBlock(functions[callMatch[1]], 0, 1);
        i++;
        continue;
      }

      const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
      if (assignMatch) {
        env[assignMatch[1]] = evalPythonExpr(assignMatch[2], env);
        i++;
        continue;
      }

      i++;
    }
    return i;
  };

  try {
    runBlock(rawLines, 0, 0);
  } catch (err: any) {
    output.push(`Error: ${err?.message || 'Runtime execution error.'}`);
  }

  return output.length > 0 ? output : ['> Program finished (no output)'];
}

function buildSandboxedDocument(lang: CodeLang, source: string, runId: number): string {
  const safeBridge = `
    <script>
      (function () {
        const emit = (level, args) => {
          try {
            const text = Array.from(args).map(a => {
              if (typeof a === 'object') { try { return JSON.stringify(a); } catch { return String(a); } }
              return String(a);
            }).join(' ');
            parent.postMessage({ source: 'learnify-code-sandbox', runId: ${runId}, level, text }, '*');
          } catch {}
        };
        const origLog = console.log;
        console.log = function() { emit('log', arguments); origLog && origLog.apply(console, arguments); };
        console.warn = function() { emit('warn', arguments); };
        console.error = function() { emit('error', arguments); };
        window.onerror = function(msg, _src, line) {
          emit('error', ['Error: ' + msg + (line ? ' (line ' + line + ')' : '')]);
          return true;
        };
      })();
    </script>
  `;

  if (lang === 'javascript') {
    return `<!doctype html><html><body style="font-family:monospace;background:#020617;color:#e2e8f0;padding:12px;">
      ${safeBridge}
      <div style="font-size:11px;color:#64748b;">JavaScript Sandbox Execution #${runId}</div>
      <script>
        try {
          ${source.replace(/<\/script>/gi, '<\\/script>')}
        } catch (err) {
          console.error(err && err.message ? err.message : String(err));
        }
      </script>
    </body></html>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    ${safeBridge}
    ${source}
  </body></html>`;
}

export default function PythonIDE() {
  const { language } = useLanguage();
  const [codeLang, setCodeLang] = useState<CodeLang>('python');
  const [code, setCode] = useState(
    'print("Hello Learnify!")\n\n# Try adding two numbers\na = 5\nb = 10\nprint(f"The sum of {a} and {b} is {a+b}")'
  );
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeGuide, setActiveGuide] = useState<number | null>(null);
  const [sandboxDoc, setSandboxDoc] = useState<string>('');
  const [runCounter, setRunCounter] = useState<number>(1);
  const [debugAdvice, setDebugAdvice] = useState<string>('');
  const [debugging, setDebugging] = useState(false);

  const activeGuides = useMemo(() => {
    if (codeLang === 'javascript') return JS_GUIDES;
    if (codeLang === 'html-css') return HTML_GUIDES;
    if (codeLang === 'web-studio') return WEB_STUDIO_GUIDES;
    return PYTHON_GUIDES;
  }, [codeLang]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'learnify-code-sandbox') return;
      const prefix = data.level === 'error' ? 'Error: ' : '';
      setOutput((prev) => [...prev.slice(-80), `${prefix}${data.text}`]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const switchLang = (next: CodeLang) => {
    setCodeLang(next);
    setActiveGuide(0);
    setOutput([]);
    setSandboxDoc('');
    setDebugAdvice('');
    if (next === 'python') {
      setCode(PYTHON_GUIDES[0].code);
    } else if (next === 'javascript') {
      setCode(JS_GUIDES[0].code);
    } else if (next === 'html-css') {
      setCode(HTML_GUIDES[0].code);
    } else {
      setCode(WEB_STUDIO_GUIDES[0].code);
    }
  };

  const runCode = () => {
    setIsRunning(true);
    setOutput([]);
    if (codeLang === 'python') {
      const result = executePythonSubset(code);
      setTimeout(() => {
        setOutput(result);
        setIsRunning(false);
      }, 150);
    } else {
      const nextId = runCounter + 1;
      setRunCounter(nextId);
      setSandboxDoc(buildSandboxedDocument(codeLang, code, nextId));
      setTimeout(() => {
        setIsRunning(false);
      }, 150);
    }
  };

  const reset = () => {
    setCode('');
    setOutput([]);
    setSandboxDoc('');
    setDebugAdvice('');
    setActiveGuide(null);
  };

  const handleAiDebug = async () => {
    if (!code.trim() || debugging) return;
    setDebugging(true);
    try {
      const advice = await aiService.labAssistant({
        action: 'code-debug',
        subject: codeLang.toUpperCase(),
        topic: `Console Output: ${output.join(' | ') || 'No output yet'}`,
        context: code,
        language,
      });
      setDebugAdvice(advice);
    } catch (err: unknown) {
      setDebugAdvice(err instanceof Error ? err.message : 'Unable to reach AI Code Mentor.');
    } finally {
      setDebugging(false);
    }
  };

  const filename =
    codeLang === 'python'
      ? 'edu_python_idle.py'
      : codeLang === 'javascript'
        ? 'sandbox_script.js'
        : codeLang === 'html-css'
          ? 'layout_preview.html'
          : 'interactive_web_app.html';

  return (
    <div className="space-y-4">
      {/* Multi-Language Environment Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'python', label: 'Python', icon: Terminal },
              { id: 'javascript', label: 'JavaScript (Sandboxed)', icon: Code2 },
              { id: 'html-css', label: 'HTML / CSS', icon: Eye },
              { id: 'web-studio', label: 'HTML + CSS + JS App', icon: Globe },
            ] as Array<{ id: CodeLang; label: string; icon: React.ComponentType<{ size?: number }> }>
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchLang(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  codeLang === item.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAiDebug}
          disabled={debugging || !code.trim()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold hover:bg-amber-500/25 disabled:opacity-50 cursor-pointer"
        >
          {debugging ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          <span>AI Debug Assistant</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 space-y-3 h-[240px] lg:h-[600px] overflow-y-auto pr-2 scrollbar-hide">
          <div className="p-5 bg-card border border-border rounded-3xl mb-2">
            <h3 className="font-bold mb-1">Guided Exercises</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
              {activeGuides.length} {codeLang.toUpperCase()} Tasks
            </p>
          </div>
          {activeGuides.map((guide, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCode(guide.code);
                setActiveGuide(i);
                setOutput([]);
                setSandboxDoc('');
              }}
              className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                activeGuide === i
                  ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5'
                  : 'bg-card border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <p className="font-bold text-xs mb-1">{guide.title}</p>
              <p className="text-[10px] opacity-70 line-clamp-1">{guide.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-slate-900 text-white rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl flex flex-col h-[600px] transition-all">
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Terminal size={18} />
              </div>
              <span className="font-mono font-bold text-sm tracking-wider uppercase">{filename}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 cursor-pointer"
                title="Reset"
              >
                <RotateCcw size={18} />
              </button>
              <button
                type="button"
                onClick={runCode}
                disabled={isRunning}
                className="flex items-center gap-2 px-6 py-2 bg-green-500 text-slate-950 font-bold rounded-lg hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Play size={16} fill="currentColor" />
                <span>Run</span>
              </button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
            {/* Editor */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-mono uppercase tracking-widest">
                <span>Editor ({codeLang.toUpperCase()})</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed text-blue-300 w-full"
                spellCheck="false"
              />
            </div>

            {/* Output / Sandboxed Preview */}
            <div className="p-5 flex flex-col bg-slate-950/50 min-h-0 gap-3">
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono uppercase tracking-widest">
                <span>
                  {codeLang === 'html-css' || codeLang === 'web-studio'
                    ? 'Sandboxed Live Preview & Console'
                    : 'Sandboxed Output'}
                </span>
              </div>

              {(codeLang === 'html-css' || codeLang === 'web-studio') && sandboxDoc && (
                <iframe
                  key={runCounter}
                  title="Learnify Sandboxed Preview"
                  sandbox="allow-scripts"
                  srcDoc={sandboxDoc}
                  className="w-full h-56 rounded-xl border border-slate-700 bg-white shrink-0"
                />
              )}

              {codeLang === 'javascript' && sandboxDoc && (
                <iframe
                  key={runCounter}
                  title="Learnify JS Sandbox"
                  sandbox="allow-scripts"
                  srcDoc={sandboxDoc}
                  className="hidden"
                />
              )}

              <div className="flex-1 font-mono text-xs space-y-1.5 overflow-auto">
                {isRunning ? (
                  <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <span>Executing inside sandbox...</span>
                  </div>
                ) : (
                  output.map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-slate-600">[{i + 1}]</span>
                      <span className={line.startsWith('Error') ? 'text-red-400' : 'text-slate-200'}>
                        {line}
                      </span>
                    </div>
                  ))
                )}
                {!isRunning && output.length === 0 && !sandboxDoc && (
                  <div className="text-slate-600 italic">Click "Run" to execute safely...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {debugAdvice && (
        <div className="p-5 rounded-3xl bg-card border border-amber-500/30 prose prose-sm dark:prose-invert max-w-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500">
              AI Debugging Assistant
            </span>
            <button
              type="button"
              onClick={() => setDebugAdvice('')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
          <Markdown>{debugAdvice}</Markdown>
        </div>
      )}
    </div>
  );
}
