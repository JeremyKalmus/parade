import { useState } from 'react';
import { Terminal, Wand2, Sparkles, Copy, Check } from 'lucide-react';
import type { SetupStatus } from '../../../shared/types/ipc';

export interface SetupIncompleteStateProps {
  status: SetupStatus;
  projectPath?: string;
}

export function SetupIncompleteState({ status, projectPath }: SetupIncompleteStateProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = async (text: string, commandId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandId);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderCodeBlock = (command: string, commandId: string) => (
    <div className="relative group">
      <pre className="bg-slate-800 rounded-lg p-4 text-sky-300 font-mono text-sm overflow-x-auto">
        {command}
      </pre>
      <button
        onClick={() => copyToClipboard(command, commandId)}
        className="absolute top-2 right-2 p-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy to clipboard"
      >
        {copiedCommand === commandId ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );

  if (status === 'not-started') {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="max-w-2xl w-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-sky-500/20 rounded-lg">
              <Terminal className="w-8 h-8 text-sky-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Initialize Your Project</h2>
              <p className="text-slate-400 mt-1">Parade needs configuration to get started.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Run in your terminal:</h3>
                  {renderCodeBlock('npx parade-init', 'cmd-1')}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Then run Claude Code:</h3>
                  {renderCodeBlock('claude', 'cmd-2')}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-bold flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Tell Claude:</h3>
                  {renderCodeBlock('/init-project', 'cmd-3')}
                </div>
              </div>
            </div>
          </div>

          {projectPath && (
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">
                <span className="font-medium text-slate-300">Current project:</span> {projectPath}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'scaffolded') {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="max-w-2xl w-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-purple-500/20 rounded-lg">
              <Wand2 className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Complete Project Setup</h2>
              <p className="text-slate-400 mt-1">Directory structure exists. Run the configuration wizard.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Open Claude Code in this directory</h3>
                  {renderCodeBlock('claude', 'cmd-scaffolded-1')}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Tell Claude:</h3>
                  {renderCodeBlock('/init-project', 'cmd-scaffolded-2')}
                </div>
              </div>
            </div>
          </div>

          {projectPath && (
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">
                <span className="font-medium text-slate-300">Current project:</span> {projectPath}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'configured') {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="max-w-2xl w-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-green-500/20 rounded-lg">
              <Sparkles className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Run Your First Discovery</h2>
              <p className="text-slate-400 mt-1">Project is configured! Start your first feature.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-400 font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Open Claude Code</h3>
                  {renderCodeBlock('claude', 'cmd-configured-1')}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-400 font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Tell Claude:</h3>
                  {renderCodeBlock('/discover', 'cmd-configured-2')}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-400 font-bold flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Describe your feature idea</h3>
                  <p className="text-slate-400 text-sm">
                    For example: "Add user authentication with email and password"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {projectPath && (
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">
                <span className="font-medium text-slate-300">Current project:</span> {projectPath}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For 'ready' status, return null (should not render this component)
  return null;
}
