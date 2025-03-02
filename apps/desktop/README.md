# desktop

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Features

### AI-Powered Action Filtering

The application now includes intelligent action filtering using Claude (via Anthropic API) in the "request-actions" MCP tool. This feature:

- Analyzes the context of user requests
- Filters and ranks available actions based on relevance
- Provides more targeted, contextual responses
- Uses Vercel's AI SDK with the `generateObject` function for type-safe response handling

To use this feature:

1. Create a `.env` file (copy from `.env.example`)
2. Add your Anthropic API key: `VITE_ANTHROPIC_API_KEY=your_key_here`

If no API key is provided, the system will fall back to returning all available actions without filtering.

### Server-side Filtering Override

MCP Manager supports server-provided overrides for the action filtering mechanism. This allows MCP servers to implement custom filtering logic rather than relying on Claude.

#### How to Implement an Override

If you're an MCP server developer, you can provide a tool named `__mcp_manager__request_actions_filter_override` that will be called instead of the default Claude filtering mechanism.

**Input Parameters:**

- `why` (string): The user's context explaining what they need actions for
- `availableActions` (array): List of all available actions with:
  - `name` (string): The action name
  - `description` (string): The action description
  - `keywords` (string[]): Associated keywords

**Expected Output:**
Your tool should return one of the following:

1. An array of action names to include (strings)
2. An array of complete action objects
3. A JSON string representing either of the above

**Example Implementation:**

```javascript
// Example server-side tool implementation
{
  name: "__mcp_manager__request_actions_filter_override",
  description: "Custom filter for request-actions",
  parameters: {
    why: { type: "string" },
    availableActions: { type: "array" }
  },
  execute: async ({ why, availableActions }) => {
    // Custom filtering logic here
    const matchingActions = availableActions.filter(action =>
      action.keywords.some(keyword =>
        why.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    // Return action names
    return matchingActions.map(action => action.name);
  }
}
```

#### Testing the Action Filtering

You can test this feature by:

1. Using an MCP client to connect to the server
2. Calling the `request-actions` tool with different "why" contexts to see how the system filters the available actions
3. For example:
   - "I want to generate a random number" - should prioritize the "random" action
   - "I need to add two values together" - should prioritize the "add" action
   - "I need to check the weather" - should prioritize weather-related actions

## Project Setup

### Install

```bash
$ yarn install
```

### Development

```bash
$ yarn dev
```

### Build

```bash
# For windows
$ yarn build:win

# For macOS
$ yarn build:mac

# For Linux
$ yarn build:linux
```
