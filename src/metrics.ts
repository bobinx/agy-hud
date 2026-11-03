import { Config } from "./config";
import { Payload } from "./statusline";

export interface StepState {
  conversationId?: string;
  agentState?: string;
  stepCount?: number;
  lastActivityAt?: string;
}

export function updateStepState(
  prevState: StepState | null | undefined,
  payload: Payload | null | undefined
): StepState {
  const conversationId = (payload?.conversation_id ?? "").trim();
  const rawAgentState = (payload?.agent_state ?? "").trim().toLowerCase();
  const prevConvId = prevState?.conversationId ?? "";
  const prevAgentState = prevState?.agentState ?? "";

  let stepCount = typeof prevState?.stepCount === "number" ? prevState.stepCount : 1;
  const convChanged = conversationId !== "" && conversationId !== prevConvId;

  if (convChanged) {
    stepCount = 1;
  }

  const becameActive = rawAgentState !== "" && rawAgentState !== "idle" && rawAgentState !== prevAgentState;
  if (becameActive) {
    stepCount += 1;
  }

  return {
    conversationId,
    agentState: rawAgentState,
    stepCount,
    lastActivityAt: prevState?.lastActivityAt
  };
}

export function renderStepSegment(
  state: StepState | null | undefined,
  payload: Payload | null | undefined,
  config: Config
): string {
  if (!config.showStepCount) {
    return "";
  }
  const raw = payload as Record<string, unknown> | null | undefined;
  const rawStep = raw?.step ?? raw?.step_index ?? raw?.turn ?? raw?.turn_index;
  if (typeof rawStep === "number" && rawStep > 0) {
    return `Step ${rawStep}`;
  }
  if (typeof state?.stepCount === "number" && state.stepCount > 0) {
    return `Step ${state.stepCount}`;
  }
  return "";
}
