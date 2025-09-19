# MeterSquare ERP MCP Tools

## 🤖 Automatic Tool Usage

Claude will automatically use these tools when you mention related keywords. No need to explicitly ask - just describe what you want!

### Examples of automatic triggers:
- Say "connect to database" → Automatically runs `supabase_connect`
- Say "start the frontend" → Automatically runs `start_frontend`
- Say "check git status" → Automatically runs `git_status`
- Say "install dependencies" → Automatically runs `install_deps`
- Say "lint my code" → Automatically runs `lint_code`

## Quick Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure in Claude Desktop for Automatic Usage:**
Add to your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "metersquare-erp": {
      "command": "node",
      "args": ["C:\\Users\\admin\\Desktop\\metersquare-ERP\\mcp-server.js"],
      "env": {
        "VITE_SUPABASE_URL": "your-supabase-url",
        "VITE_SUPABASE_ANON_KEY": "your-supabase-anon-key"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

## Available Tools (All Work Automatically!)

### Supabase Tools (Auto-triggers when you mention database/Supabase)
- **supabase_connect** - Connect to your Supabase project
- **supabase_query** - Execute database queries (select, insert, update, delete)
- **supabase_browse** - Open Supabase dashboard in browser

### Development Tools (Auto-triggers when you mention npm/build/start)
- **start_frontend** - Start React development server (port 5173)
- **start_backend** - Start backend server (port 5000)
- **install_deps** - Install npm dependencies (frontend/backend/both)
- **run_build** - Build for production
- **lint_code** - Run ESLint and TypeScript checks

### Project Tools (Auto-triggers based on context)
- **git_status** - Check git repository status
- **open_docs** - Open project documentation
- **workflow_info** - Get workflow implementation details
- **create_component** - Generate new React components
- **env_setup** - Configure environment variables

### 🌐 Browser Automation Tools (Auto-triggers for testing/debugging)
- **browser_open** - Launch browser and navigate to your app
- **browser_console** - Get console logs and errors from browser
- **browser_network** - Monitor API calls and network requests
- **browser_screenshot** - Capture screenshots of current page
- **browser_click** - Click buttons and elements
- **browser_type** - Fill forms and input fields
- **browser_evaluate** - Execute JavaScript in browser context
- **browser_close** - Close the browser when done

### 🔧 Backend & Terminal Tools (Auto-triggers for server management)
- **backend_logs** - View backend server logs with filtering
- **backend_test** - Run backend tests with coverage
- **terminal** - Execute any terminal/shell command
- **process_list** - List running Node.js processes
- **kill_process** - Kill process by PID or port
- **api_test** - Test API endpoints with different methods
- **env_check** - Verify environment variables configuration

### 💾 Database Tools (Auto-triggers for database operations)
- **database_backup** - Create database backups (JSON/SQL)
- **database_migrate** - Run database migrations up/down
- **docker_status** - Check Docker containers status
- **redis_check** - Check Redis server status

## Usage Examples

### Automatic Usage (Recommended)
Just say what you want naturally:
- "Connect to the database" → Claude uses supabase_connect
- "Show me the git status" → Claude uses git_status
- "Start the frontend server" → Claude uses start_frontend
- "Check the material purchase workflow" → Claude uses workflow_info
- "Open browser and test the app" → Claude uses browser_open
- "Check console for errors" → Claude uses browser_console
- "Monitor API calls" → Claude uses browser_network
- "Take a screenshot" → Claude uses browser_screenshot
- "Run a terminal command" → Claude uses terminal
- "Check backend logs" → Claude uses backend_logs
- "Kill process on port 5000" → Claude uses kill_process
- "Backup the database" → Claude uses database_backup
- "Test the API endpoint" → Claude uses api_test

### Manual Usage (If needed)
```
Use tool: supabase_connect
```

### Query Database
```
Use tool: supabase_query
Arguments:
  table: "projects"
  operation: "select"
  columns: "id, name, status"
```

### Start Development
```
Use tool: start_frontend
```

### Check Workflow Status
```
Use tool: workflow_info
Arguments:
  workflow: "material-purchase"
```

### Create New Component
```
Use tool: create_component
Arguments:
  name: "DashboardWidget"
  type: "component"
```

### Browser Testing
```
Use tool: browser_open
Arguments:
  url: "http://localhost:5173"

Use tool: browser_console
Arguments:
  clear: false

Use tool: browser_network
Arguments:
  filter: "/api"
  type: "xhr"
```

### Backend Operations
```
Use tool: terminal
Arguments:
  command: "npm run dev"
  cwd: "/path/to/backend"

Use tool: backend_logs
Arguments:
  lines: 100
  filter: "error"

Use tool: api_test
Arguments:
  url: "/api/purchases"
  method: "GET"
  headers: { "Authorization": "Bearer token" }

Use tool: database_backup
Arguments:
  format: "json"
  tables: ["purchases", "projects"]
```

## Environment Variables

The MCP server uses these environment variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:5000)

## Tool Categories

### 🔗 Database & API
- Supabase connection management
- Direct database queries
- API configuration

### 🚀 Development
- Start/stop dev servers
- Build projects
- Dependency management
- Code quality checks

### 📁 Project Management
- Git operations
- Documentation access
- Component generation
- Workflow information

### 🔧 Configuration
- Environment setup
- Port management
- Path configuration

## Troubleshooting

**MCP not connecting:**
- Verify path in Claude Desktop config
- Check Node.js is installed (v16+)
- Restart Claude Desktop after config changes

**Supabase connection failed:**
- Verify environment variables are set
- Check Supabase project is active
- Confirm anon key is valid

**Port already in use:**
- Check if dev servers are already running
- Use different port in arguments
- Kill existing processes if needed