import { FastMCP } from "fastmcp";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define types for our actions system
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ActionDefinition<T extends z.ZodObject<any> = any> {
  name: string;
  description: string;
  keywords: string[];
  parameters: T;
  execute: (parameters: z.infer<T>) => Promise<string> | string;
}

export const startMCP = () => {
  const server = new FastMCP({
    name: "MCP Manager",
    version: "1.0.0",
  });
  // Central registry of all available actions
  const actionsRegistry: ActionDefinition[] = [];

  // Helper function to add actions to the registry in a type-safe way
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registerAction = <T extends z.ZodObject<any>>(
    action: ActionDefinition<T>
  ) => {
    actionsRegistry.push(action);
    return action;
  };

  // Register available actions
  registerAction({
    name: "random",
    description: "Generate a random number",
    keywords: ["random", "number", "generate"],
    parameters: z.object({
      min: z.number(),
      max: z.number(),
    }),
    execute: (parameters) => {
      const { min, max } = parameters;
      return String(Math.floor(Math.random() * (max - min + 1)) + min);
    },
  });

  registerAction({
    name: "add",
    description: "Add two numbers",
    keywords: ["math", "addition", "sum"],
    parameters: z.object({
      a: z.coerce.number(),
      b: z.coerce.number(),
    }),
    execute: (parameters) => {
      const { a, b } = parameters;
      return String(a + b);
    },
  });

  // Helper function to get action by name
  const getAction = (name: string): ActionDefinition | undefined => {
    return actionsRegistry.find((action) => action.name === name);
  };

  // Helper function to get action metadata without the execute function
  const getActionMetadata = (action: ActionDefinition) => {
    const { name, description, parameters, keywords } = action;
    // Convert Zod schema to JSON Schema for serialization
    const jsonSchema = zodToJsonSchema(parameters);
    return { name, description, parameters: jsonSchema, keywords };
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
      const actions = JSON.stringify(actionsRegistry.map(getActionMetadata));
      console.log("request-actions actions", actions);
      return actions;
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
        try {
          // Parse and validate the parameters using the action's Zod schema
          const validatedParams = action.parameters.parse(args.parameters);
          const result = await action.execute(validatedParams);
          console.log("dispatch-actions result", result);
          return result;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return JSON.stringify({
              error: "Invalid parameters",
              details: error.format(),
            });
          }
          return `Error: ${String(error)}`;
        }
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
