import * as circle from '@circle-agent-stack-examples/circle-tools';

/**
 * Circle CLI primitives re-exported for the agent to consume.
 * TODO: wrap each as a LangChain `tool(...)` with a zod schema.
 */
export const circleNamespace = circle;

export const tools: unknown[] = [];
