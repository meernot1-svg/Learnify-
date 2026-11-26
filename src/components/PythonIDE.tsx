import React, { useState } from 'react';
import { Terminal, Play, RotateCcw } from 'lucide-react';

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

  // f-string: f"..." or f'...'
  if ((trimmed.startsWith('f"') && trimmed.endsWith('"')) || (trimmed.startsWith("f'") && trimmed.endsWith("'"))) {
    const inner = trimmed.slice(2, -1);
    return inner.replace(/\{([^}]+)\}/g, (_, code) => formatPythonValue(evalPythonExpr(code, env)));
  }

  // Plain string literal
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  // List slice: var[a:b]
  const sliceMatch = trimmed.match(/^([a-zA-Z_]\w*)\[(\d*):(\d*)\]$/);
  if (sliceMatch) {
    const arr = env[sliceMatch[1]];
    if (Array.isArray(arr)) {
      const start = sliceMatch[2] ? Number(sliceMatch[2]) : 0;
      const end = sliceMatch[3] ? Number(sliceMatch[3]) : arr.length;
      return arr.slice(start, end);
    }
  }

  // Built-ins
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

  // Safe JS evaluation of simple arithmetic, booleans, arrays, and objects using known env vars
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
        // Skip class body cleanly
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

export default function PythonIDE() {
  const [code, setCode] = useState('print("Hello Learnify!")\n\n# Try adding two numbers\na = 5\nb = 10\nprint(f"The sum of {a} and {b} is {a+b}")');
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeGuide, setActiveGuide] = useState<number | null>(null);

  const runCode = () => {
    setIsRunning(true);
    const result = executePythonSubset(code);
    setTimeout(() => {
      setOutput(result);
      setIsRunning(false);
    }, 200);
  };

  const reset = () => {
    setCode('');
    setOutput([]);
    setActiveGuide(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-80 space-y-4 h-[250px] lg:h-[600px] overflow-y-auto pr-2 scrollbar-hide">
        <div className="p-6 bg-card border border-border rounded-3xl mb-4">
           <h3 className="font-bold mb-1">Code Guides</h3>
           <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">20 Programming Tasks</p>
        </div>
        {PYTHON_GUIDES.map((guide, i) => (
          <button
            key={i}
            onClick={() => {
              setCode(guide.code);
              setActiveGuide(i);
              setOutput([]);
            }}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
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
            <span className="font-mono font-bold text-sm tracking-wider uppercase">edu_python_idle.py</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={reset} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400" title="Reset">
               <RotateCcw size={18} />
             </button>
             <button 
               onClick={runCode}
               disabled={isRunning}
               className="flex items-center gap-2 px-6 py-2 bg-green-500 text-slate-950 font-bold rounded-lg hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50"
             >
               <Play size={16} fill="currentColor" />
               <span>Run</span>
             </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
           {/* Editor */}
           <div className="p-6 border-r border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 mb-4 text-slate-500 text-xs font-mono uppercase tracking-widest">
                 <span>Editor</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none resize-none font-mono text-base leading-relaxed text-blue-300 w-full"
                spellCheck="false"
              />
           </div>

           {/* Output */}
           <div className="p-6 flex flex-col bg-slate-950/50">
              <div className="flex items-center gap-2 mb-4 text-slate-500 text-xs font-mono uppercase tracking-widest">
                 <span>Output</span>
              </div>
              <div className="flex-1 font-mono text-sm space-y-2 overflow-auto">
                 {isRunning ? (
                   <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <span>Executing...</span>
                   </div>
                 ) : (
                   output.map((line, i) => (
                     <div key={i} className="flex gap-2">
                        <span className="text-slate-600">[{i+1}]</span>
                        <span className={line.startsWith('Error') ? 'text-red-400' : 'text-slate-200'}>{line}</span>
                     </div>
                   ))
                 )}
                 {!isRunning && output.length === 0 && (
                   <div className="text-slate-700 italic">Click "Run" to see output...</div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
