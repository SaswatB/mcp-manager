import { FastMCP } from "fastmcp";
import { z } from "zod";

// Define types for our actions system
type ActionParameter = "string" | "number" | "boolean" | "object";

interface ActionDefinition {
  name: string;
  description: string;
  keywords: string[];
  parameters: Record<string, ActionParameter>;
  execute: (parameters: Record<string, unknown>) => Promise<string> | string;
}

export const startMCP = () => {
  const server = new FastMCP({
    name: "MCP Manager",
    version: "1.0.0",
  });

  // Central registry of all available actions
  const actionsRegistry: ActionDefinition[] = [
    {
      name: "random",
      description: "Generate a random number",
      keywords: ["random", "number", "generate"],
      parameters: {
        min: "number",
        max: "number",
      },
      execute: (parameters) => {
        const min = Number(parameters.min);
        const max = Number(parameters.max);
        return String(Math.floor(Math.random() * (max - min + 1)) + min);
      },
    },
    {
      name: "add",
      description: "Add two numbers",
      keywords: ["math", "addition", "sum"],
      parameters: {
        a: "number",
        b: "number",
      },
      execute: (parameters) => {
        return String(Number(parameters.a) + Number(parameters.b));
      },
    },
  ];

  // Helper function to get action by name
  const getAction = (name: string): ActionDefinition | undefined => {
    return actionsRegistry.find((action) => action.name === name);
  };

  // Helper function to get action metadata without the execute function
  const getActionMetadata = (action: ActionDefinition) => {
    const { name, description, parameters, keywords } = action;
    return { name, description, parameters, keywords };
  };

  // Get all unique keywords from the registry
  const getAllKeywords = (): string[] => {
    const keywordSet = new Set<string>();
    actionsRegistry.forEach((action) => {
      action.keywords.forEach((keyword) => keywordSet.add(keyword));
    });
    return Array.from(keywordSet);
  };

  // Generate dynamic description for request-actions
  const getKeywordsDescription = (): string => {
    const keywords = getAllKeywords();
    return `Request the actions that can be performed. Current available actions are related to these keywords: '${keywords.join("', '")}'`;
  };

  server.addTool({
    name: "request-actions",
    description: getKeywordsDescription(),
    parameters: z.object({
      why: z.string({
        description:
          "Please give context on what you need actions for, this will help provide the relevant actions. Actions returned must be called with dispatch-actions tool.",
      }),
    }),
    execute: async (args, context) => {
      console.log("request-actions tool called", args, context);
      // Return all available actions metadata (without execute functions)
      return JSON.stringify(actionsRegistry.map(getActionMetadata));
    },
  });

  server.addTool({
    name: "dispatch-actions",
    description: "Dispatch the actions available in the system",
    parameters: z.object({
      name: z.string({ description: "The name of the action to dispatch" }),
      parameters: z.record(z.string(), z.any()),
    }),
    execute: async (args, context) => {
      console.log("dispatch-actions tool called", args, context);
      const action = getAction(args.name);

      if (action) {
        return action.execute(args.parameters);
      }

      return "Unknown action";
    },
  });

  server.start({
    transportType: "sse",
    sse: {
      endpoint: "/mcp",
      port: 3000,
    },
  });
};
