import test from "node:test";
import assert from "node:assert/strict";
import { progressBar, progressBarWithColor } from "../src/progressbar";
import { updateStepState, renderStepSegment } from "../src/metrics";
import { defaultConfig, parseConfig } from "../src/config";
import { render, Payload } from "../src/statusline";

test("progressbar supports block, rectangle, and line styles", () => {
  // Line style (━ and ─)
  const lineNoColor = progressBar(50, 10, false, "line");
  assert.equal(lineNoColor, "━━━━━─────");

  // Rectangle style (▬)
  const rectNoColor = progressBar(50, 10, false, "rectangle");
  assert.equal(rectNoColor, "▬▬▬▬▬     ");

  // Block style (█ and ░)
  const blockNoColor = progressBar(50, 10, false, "block");
  assert.equal(blockNoColor, "█████░░░░░");
});

test("progressbar with color styles filled and empty characters", () => {
  const lineColored = progressBar(50, 10, true, "line");
  // 50% maps to yellow (\x1b[33m), empty to muted (\x1b[90m)
  assert.match(lineColored, /\x1b\[33m━━━━━\x1b\[0m\x1b\[90m─────\x1b\[0m/);

  const rectColored = progressBar(50, 10, true, "rectangle");
  assert.match(rectColored, /\x1b\[33m▬▬▬▬▬\x1b\[0m\x1b\[90m▬▬▬▬▬\x1b\[0m/);

  const blockColored = progressBar(50, 10, true, "block");
  assert.match(blockColored, /\x1b\[33m█████░░░░░\x1b\[0m/);
});

test("config parses progress_bar_style and show_step_count", () => {
  const cfg = parseConfig(JSON.stringify({
    progress_bar_style: "line",
    show_step_count: false
  }));
  assert.equal(cfg.progressBarStyle, "line");
  assert.equal(cfg.showStepCount, false);
});

test("metrics tracks step count across active turns", () => {
  const s0 = updateStepState(null, { conversation_id: "c1", agent_state: "idle" });
  assert.equal(s0.stepCount, 1);

  // Transition from idle to working increments step count
  const s1 = updateStepState(s0, { conversation_id: "c1", agent_state: "working" });
  assert.equal(s1.stepCount, 2);

  // Still working does not re-increment
  const s2 = updateStepState(s1, { conversation_id: "c1", agent_state: "working" });
  assert.equal(s2.stepCount, 2);

  // New conversation resets step count to 1
  const s3 = updateStepState(s2, { conversation_id: "c2", agent_state: "working" });
  assert.equal(s3.stepCount, 1);
});

test("renderStepSegment respects config.showStepCount", () => {
  const cfgOn = { ...defaultConfig(), showStepCount: true };
  const cfgOff = { ...defaultConfig(), showStepCount: false };

  assert.equal(renderStepSegment({ stepCount: 3 }, null, cfgOn), "Step 3");
  assert.equal(renderStepSegment({ stepCount: 3 }, null, cfgOff), "");

  // Payload step override if present
  assert.equal(renderStepSegment({ stepCount: 1 }, { step: 5 } as unknown as Payload, cfgOn), "Step 5");
});

test("render incorporates step count and custom progress bar style", () => {
  const config = {
    ...defaultConfig(),
    color: false,
    showIcons: false,
    progressBarStyle: "line",
    showStepCount: true
  };
  const payload: Payload = {
    model: { display_name: "Claude Sonnet 4.6" },
    plan_tier: "Google AI Pro",
    cwd: "/workspace/project",
    agent_state: "idle",
    terminal_width: 120,
    context_window: { used_percentage: 40 }
  };

  const out = render(payload, {
    config,
    gitBranch: "main",
    stepState: { stepCount: 4 }
  });

  // Verify line progress bar and Step 4 appear in multiline layout
  assert.match(out, /Step 4/);
  assert.match(out, /━━━━──────/);

  // Verify single-line layout also includes Step 4 and line bar
  const single = render(payload, {
    config: { ...config, multiline: false },
    stepState: { stepCount: 4 }
  });
  assert.match(single, /Step 4/);
  assert.match(single, /━━━━──────/);
});

test("single-line mode includes cwd, git branch, and quota bar", () => {
  const config = {
    ...defaultConfig(),
    multiline: false,
    color: false,
    showIcons: false,
    showCWD: true,
    showGitBranch: true,
    showProgressBar: true,
    progressBarStyle: "line",
    showStepCount: true
  };
  const payload: Payload = {
    model: { display_name: "Gemini 3.5 Flash" },
    plan_tier: "Google AI Pro",
    cwd: "/Users/xb/Projects/forks/agy-hud",
    agent_state: "working",
    terminal_width: 200,
    context_window: { used_percentage: 35 },
    quota: { "gemini-5h": { remaining_fraction: 0.8, reset_in_seconds: 3600 } }
  };

  const out = render(payload, {
    config,
    gitBranch: "xb-main",
    stepState: { stepCount: 2 }
  });

  assert.match(out, /agy-hud/);
  assert.match(out, /xb-main/);
  assert.match(out, /Step 2/);
  assert.match(out, /Ctx 35%/);
  assert.match(out, /Usage ━━━━━━── 80% left/);
});

test("context_value remaining displays remaining percentage and inverts progress bar", () => {
  const config = {
    ...defaultConfig(),
    color: false,
    showIcons: false,
    contextValue: "remaining",
    progressBarStyle: "line"
  };
  const payload: Payload = {
    model: { display_name: "Gemini 3.5 Flash" },
    context_window: { used_percentage: 35 },
    terminal_width: 120
  };

  const out = render(payload, { config });
  assert.match(out, /Context ━━━━━━━─── 65%/);
});
