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
