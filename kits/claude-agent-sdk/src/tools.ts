import * as circle from '@agent-stack-ecosystem-kits/circle-tools';

/**
 * Circle CLI primitives re-exported for the agent to consume.
 * TODO: expose each as a Claude Agent SDK custom tool (input schema + handler).
 */
export const circleNamespace = circle;

export const tools: unknown[] = [];
