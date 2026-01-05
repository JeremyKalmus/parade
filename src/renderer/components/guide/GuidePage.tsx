import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { Button } from '@/renderer/components/ui/button';
import { ScrollArea } from '@/renderer/components/ui/scroll-area';
import * as Tabs from '@radix-ui/react-tabs';
import { GuideStepCard } from './GuideStepCard';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Brain,
  GitBranch,
  Sparkles,
  FolderTree,
  Target,
} from 'lucide-react';

// Workflow steps data - 5 stages (4 core + 1 optional retro)
const workflowSteps = [
  {
    id: 'init-project',
    command: '/init-project',
    title: 'Initialize Project',
    shortDescription: 'Set up project configuration and directory scaffold.',
    description:
      'Two-step initialization process: First, run npx parade-init in your terminal to scaffold the directory structure and install beads. Then, use /init-project in Claude to configure your project with guided questions.',
    whenToUse:
      'Starting a new project or adding configuration to an existing codebase',
    outputs: ['.parade/', 'project.yaml', '.claude/', '.beads/', 'docs/CONSTITUTION.md'],
    example: `# Step 1: Scaffold the project
$ npx parade-init
🎪 Parade Initializer v1.0.0
✅ Beads CLI installed
✅ Created .parade/
✅ Created .claude/
✅ Initialized .beads/

# Step 2: Configure with Claude
$ claude
User: /init-project
Claude: Let's configure your project...

Claude: What is the name of this project?
You: MyTaskTracker

Claude: Describe the project in 1-2 sentences.
You: A task management app that helps developers track feature work.`,
  },
  {
    id: 'discover',
    command: '/discover',
    title: 'Discover Feature',
    shortDescription: 'Capture idea and run discovery in one step.',
    description:
      'Combines brief creation and discovery into a single streamlined flow. Captures your feature idea, assesses complexity, asks targeted questions, and spawns SME agents to produce a detailed specification.',
    whenToUse: 'You have a new feature idea to develop',
    outputs: ['discovery.db entry', 'Interview answers', 'SME reviews', 'Spec ready for approval'],
    example: `You: I want to add a way for users to track their workout progress

Claude: Great idea! Let me capture this and run discovery.

## Complexity Assessment
This appears to be a STANDARD feature.

## Discovery Questions
1. What problem does this solve?
2. How will you know this feature is successful?
3. What data needs to be tracked?

[After answers, spawns SME agents and generates spec]`,
  },
  {
    id: 'approve-spec',
    command: '/approve-spec',
    title: 'Approve Specification',
    shortDescription: 'Export spec to beads as tasks.',
    description:
      'Convert an approved specification into actionable beads tasks. Creates epic, child tasks, dependencies, and agent labels.',
    whenToUse: 'After reviewing the spec from /discover',
    outputs: ['Epic in .beads/', 'Child tasks with dependencies', 'Agent labels applied'],
    example: `Claude: ## Spec Approved and Exported to Beads

Epic: bd-x7y8 - Feature Name

Tasks created:
- bd-x7y8.1: Database schema [agent:sql]
- bd-x7y8.2: API endpoint [agent:typescript]`,
  },
  {
    id: 'run-tasks',
    command: '/run-tasks',
    title: 'Run Tasks',
    shortDescription: 'Execute tasks via sub-agents.',
    description:
      'Orchestrate task execution through coordinated sub-agents. Manages parallel execution, TDD support, and status updates.',
    whenToUse: 'After /approve-spec has created tasks',
    outputs: ['Completed tasks', 'Updated beads status', 'Verification results'],
    example: `Claude: ## Starting Task Execution

### Batch 1
Spawning agents...
- bd-x7y8.1: Database schema [agent:sql]

## Batch 1 Complete
✓ bd-x7y8.1: PASS (closed)`,
  },
  {
    id: 'retro',
    command: '/retro',
    title: 'Retrospective (Optional)',
    shortDescription: 'Analyze execution and generate improvements.',
    description:
      'Analyze epic execution telemetry, identify patterns, and generate actionable recommendations for improving agent prompts, adding debug-knowledge entries, and tuning workflow config. Accumulates learnings over time.',
    whenToUse: 'After epic completion, especially if debug loops occurred',
    outputs: ['.claude/retrospectives/<epic-id>.md', 'Updated INSIGHTS.md', 'Agent prompt improvements', 'Debug-knowledge entries'],
    example: `Claude: ## Retrospective: bd-x7y8

### Efficiency Score: 8/10
- Tasks: 5 completed, 0 blocked
- Debug loops: 1
- Avg tokens: 1,200/task

### Recommendations
1. Update swift-agent with state binding warning
2. Add null-check pattern to debug-knowledge

Apply these changes? [Y/n]`,
  },
];

export interface GuidePageProps {
  initialStep?: string;
  onStepComplete?: (stepId: string) => void;
}

/**
 * GuidePage Component
 *
 * Displays the Parade workflow guide with two tabs:
 * - Overview: Vision, architecture, and philosophy
 * - Workflow: The 5 workflow steps with navigation
 */
export function GuidePage({ initialStep, onStepComplete }: GuidePageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStepId, setSelectedStepId] = useState(
    initialStep || workflowSteps[0].id
  );
  const [copied, setCopied] = useState(false);
  const stepRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedStepIndex = workflowSteps.findIndex(
    (step) => step.id === selectedStepId
  );
  const selectedStep = workflowSteps[selectedStepIndex];

  const handleStepClick = useCallback((id: string) => {
    setSelectedStepId(id);
  }, []);

  const handlePrevious = useCallback(() => {
    if (selectedStepIndex > 0) {
      setSelectedStepId(workflowSteps[selectedStepIndex - 1].id);
    }
  }, [selectedStepIndex]);

  const handleNext = useCallback(() => {
    if (selectedStepIndex < workflowSteps.length - 1) {
      setSelectedStepId(workflowSteps[selectedStepIndex + 1].id);
    }
  }, [selectedStepIndex]);

  const handleCopyCommand = useCallback(async () => {
    if (selectedStep) {
      try {
        await navigator.clipboard.writeText(selectedStep.command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy command:', err);
      }
    }
  }, [selectedStep]);

  const handleMarkComplete = useCallback(() => {
    if (onStepComplete && selectedStep) {
      onStepComplete(selectedStep.id);
    }
  }, [onStepComplete, selectedStep]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = workflowSteps.findIndex(
        (step) => step.id === document.activeElement?.getAttribute('data-testid')?.replace('guide-step-card-', '')
      );

      if (event.key === 'ArrowDown' && currentIndex < workflowSteps.length - 1) {
        event.preventDefault();
        const nextId = workflowSteps[currentIndex + 1].id;
        const nextRef = stepRefs.current.get(nextId);
        nextRef?.focus();
      } else if (event.key === 'ArrowUp' && currentIndex > 0) {
        event.preventDefault();
        const prevId = workflowSteps[currentIndex - 1].id;
        const prevRef = stepRefs.current.get(prevId);
        prevRef?.focus();
      }
    },
    []
  );

  // Register refs for keyboard navigation
  const setStepRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      stepRefs.current.set(id, el);
    } else {
      stepRefs.current.delete(id);
    }
  }, []);

  return (
    <main
      data-testid="guide-page"
      className="flex h-full flex-col bg-background"
    >
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Header with Tabs */}
        <header className="flex flex-col gap-4 p-6 pb-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parade Guide</h1>
            <p className="text-muted-foreground">
              Workflow orchestration for Claude Code - from idea to implementation
            </p>
          </div>

          <Tabs.List className="flex gap-1 border-b border-border">
            <Tabs.Trigger
              value="overview"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground transition-colors"
            >
              Overview
            </Tabs.Trigger>
            <Tabs.Trigger
              value="workflow"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground transition-colors"
            >
              Workflow
            </Tabs.Trigger>
          </Tabs.List>
        </header>

        {/* Overview Tab */}
        <Tabs.Content value="overview" className="data-[state=active]:flex-1 overflow-auto p-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Vision Statement - spans both columns */}
            <section className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Vision</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parade transforms Claude Code from a general-purpose assistant into a <strong className="text-foreground">structured workflow orchestrator</strong>.
                Instead of ad-hoc coding sessions, Parade provides clear guidance, governance, and continuous improvement -
                keeping AI development "on rails" while maintaining flexibility for complex features.
              </p>
            </section>

            {/* Coordinator Pattern - spans both columns */}
            <section className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Brain className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold">The Coordinator Pattern</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Your main Claude Code conversation acts as the <strong className="text-foreground">orchestrator</strong> - it doesn't write implementation code directly.
                Instead, it delegates to specialized sub-agents at each stage, keeping its context focused on high-level coordination.
              </p>

              {/* Stage breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Discovery Stage */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-500">1</div>
                    <h3 className="text-sm font-medium text-foreground">/discover</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">SME agents analyze requirements</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Technical SME</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Business SME</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Domain Experts</span>
                  </div>
                </div>

                {/* Run Tasks Stage */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-500">2</div>
                    <h3 className="text-sm font-medium text-foreground">/run-tasks</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Coding agents implement features</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Swift</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">TypeScript</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">SQL</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Test</span>
                  </div>
                </div>

                {/* Debug Pattern */}
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-500">↻</div>
                    <h3 className="text-sm font-medium text-foreground">Debug Loop</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Failures spawn debug agents</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Debug Agent</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Fresh Context</span>
                  </div>
                </div>
              </div>

              {/* Why this matters */}
              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Why This Creates Better Output</h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span><strong className="text-foreground">Clean coordinator context</strong> - The main conversation stays focused on orchestration, not implementation details</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span><strong className="text-foreground">Isolated debugging</strong> - Bug fixes happen in sub-agents, keeping error traces out of the main context window</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span><strong className="text-foreground">Specialized prompts</strong> - Each agent type has domain-specific knowledge and patterns built in</span>
                  </div>
                </div>
              </div>
            </section>

            {/* TDD & Quality Gates - spans both columns */}
            <section className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Check className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-lg font-semibold">Test-Driven Development & Quality Gates</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Parade uses TDD to create <strong className="text-foreground">verification gates</strong> that ensure high-quality output.
                This follows Anthropic's best practices for long-running coding tasks: clear checkpoints with automated verification.
              </p>

              {/* TDD Cycle */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-500">1</div>
                    <h3 className="text-sm font-medium text-red-400">RED</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Test agent writes failing tests that define expected behavior</p>
                </div>
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] font-bold text-green-500">2</div>
                    <h3 className="text-sm font-medium text-green-400">GREEN</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Coding agent implements until tests pass</p>
                </div>
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500">3</div>
                    <h3 className="text-sm font-medium text-blue-400">REFACTOR</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Clean up code while tests ensure nothing breaks</p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-500">↻</div>
                    <h3 className="text-sm font-medium text-amber-400">RETRY</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Failed tests trigger debug agents with error context</p>
                </div>
              </div>

              {/* Why TDD matters for AI */}
              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Why TDD Matters for AI-Assisted Development</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-500 shrink-0">•</span>
                    <span><strong className="text-foreground">Objective verification</strong> - Tests provide a clear pass/fail gate, removing ambiguity about whether code works</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-500 shrink-0">•</span>
                    <span><strong className="text-foreground">Automatic retry loops</strong> - When tests fail, agents can retry with the specific error, not vague "it doesn't work"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-500 shrink-0">•</span>
                    <span><strong className="text-foreground">Regression prevention</strong> - Each task's tests become permanent guards against future breakage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-500 shrink-0">•</span>
                    <span><strong className="text-foreground">Scoped debugging</strong> - Failed test output goes to debug agent, not the coordinator's context window</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Governance Structure */}
            <section className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <FolderTree className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold">Governance Structure</h2>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 font-mono text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <code className="text-primary shrink-0">.claude/</code>
                  <span className="text-muted-foreground">Skills, prompts, retrospectives</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="text-primary shrink-0">.beads/</code>
                  <span className="text-muted-foreground">Tasks, dependencies, status</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="text-primary shrink-0">.design/</code>
                  <span className="text-muted-foreground">Design tokens, UI patterns</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="text-primary shrink-0">.docs/</code>
                  <span className="text-muted-foreground">Documentation, guides</span>
                </div>
              </div>
            </section>

            {/* Self-Improvement */}
            <section className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-lg font-semibold">Self-Improvement</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                The <code className="bg-muted px-1 rounded">/retro</code> skill analyzes execution and generates:
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground ml-3">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>Agent prompt improvements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>Debug knowledge entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>Accumulated insights in INSIGHTS.md</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>Workflow optimizations</span>
                </li>
              </ul>
            </section>

            {/* Beads Link - spans both columns */}
            <section className="lg:col-span-2 rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm">Powered by Beads</h3>
                  <p className="text-xs text-muted-foreground">
                    Lightweight CLI for AI-assisted task management
                  </p>
                </div>
              </div>
              <a
                href="https://github.com/steveyegge/beads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline shrink-0"
              >
                Learn more →
              </a>
            </section>
          </div>
        </Tabs.Content>

        {/* Workflow Tab */}
        <Tabs.Content value="workflow" className="data-[state=active]:flex-1 data-[state=active]:flex flex-col overflow-hidden p-6 pt-4 gap-4">
          {/* Workflow Diagram */}
          <div
            data-testid="workflow-diagram"
            className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs text-muted-foreground overflow-x-auto"
          >
            <pre className="whitespace-pre">
{`┌──────────────────────────────────────────────────────────────────────────────────┐
│  /init-project  →  /discover  →  /approve-spec  →  /run-tasks  →  /retro        │
│  (setup)           (idea+spec)   (create beads)    (execute)      (optional)     │
└──────────────────────────────────────────────────────────────────────────────────┘`}
            </pre>
          </div>

          {/* Progress Indicator */}
          <div
            data-testid="step-progress"
            className="text-sm text-muted-foreground"
          >
            Step {selectedStepIndex + 1} of {workflowSteps.length}
          </div>

          {/* Main content area */}
          <div className="flex flex-1 gap-6 min-h-0">
            {/* Step Navigation */}
            <nav
              role="navigation"
              aria-label="Workflow steps"
              className="w-80 shrink-0"
              onKeyDown={handleKeyDown}
            >
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-3 pr-4">
                  {workflowSteps.map((step, index) => (
                    <GuideStepCard
                      key={step.id}
                      ref={(el) => setStepRef(step.id, el)}
                      stepNumber={index + 1}
                      id={step.id}
                      command={step.command}
                      title={step.title}
                      description={step.shortDescription}
                      isSelected={step.id === selectedStepId}
                      onClick={handleStepClick}
                    />
                  ))}
                </div>
              </ScrollArea>
            </nav>

            {/* Step Detail Panel */}
            <div
              data-testid="step-detail-panel"
              className="flex-1 rounded-lg border border-border bg-card p-6 overflow-auto"
            >
              {selectedStep && (
                <div className="flex flex-col gap-6">
                  {/* Command Copy Button */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCommand}
                      aria-label="Copy command"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="ml-1">Copy command</span>
                    </Button>
                  </div>

                  {/* Description */}
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-2">
                      Description
                    </h2>
                    <p className="text-muted-foreground">{selectedStep.description}</p>
                  </div>

                  {/* When to Use */}
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-2">
                      When to Use
                    </h2>
                    <p className="text-muted-foreground">{selectedStep.whenToUse}</p>
                  </div>

                  {/* Outputs */}
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-2">
                      Outputs
                    </h2>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      {selectedStep.outputs.map((output, index) => (
                        <li key={index}>
                          {output.includes('.') || output.includes('/') ? (
                            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                              {output}
                            </code>
                          ) : (
                            output
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Example */}
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-2">
                      Example
                    </h2>
                    <pre className="rounded-lg bg-muted p-4 text-sm text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                      {selectedStep.example}
                    </pre>
                  </div>

                  {/* Mark as Done button (only shown when callback provided) */}
                  {onStepComplete && (
                    <div className="pt-4 border-t border-border">
                      <Button onClick={handleMarkComplete} aria-label="Mark as done">
                        Mark Complete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={selectedStepIndex === 0}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={selectedStepIndex === workflowSteps.length - 1}
              aria-label="Next step"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}

export default GuidePage;
