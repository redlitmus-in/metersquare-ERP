#!/usr/bin/env node

/**
 * MeterSquare ERP MCP Server
 * Single file MCP server for easy project access and management
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { createClient } = require('@supabase/supabase-js');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const open = require('open');
const puppeteer = require('puppeteer');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  },
  project: {
    name: 'MeterSquare ERP',
    frontendPath: path.join(__dirname, 'frontend'),
    backendPath: path.join(__dirname, 'backend'),
    docsPath: path.join(__dirname, 'docs'),
    databasePath: path.join(__dirname, 'database'),
  },
  ports: {
    frontend: 5173,
    backend: 5000,
  }
};

// Initialize Supabase client
let supabase = null;
if (CONFIG.supabase.url && CONFIG.supabase.anonKey) {
  supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
}

// Browser instance for automation
let browser = null;
let currentPage = null;

// Server instance
const server = new Server(
  {
    name: 'metersquare-erp-mcp',
    version: '1.0.0',
    description: 'MeterSquare ERP development tools for automatic project management',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Helper functions
async function runCommand(command, cwd = __dirname) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { success: true, output: stdout || stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkPortInUse(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

// Tool definitions with automatic usage hints
const tools = [
  // Supabase Tools
  {
    name: 'supabase_connect',
    description: 'Connect to Supabase and verify connection. Use automatically when user mentions Supabase connection or database setup.',
    autoTriggers: ['supabase', 'database connection', 'db connect'],
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Supabase project URL (optional, uses env if not provided)' },
        anonKey: { type: 'string', description: 'Supabase anon key (optional, uses env if not provided)' }
      }
    },
    handler: async (args) => {
      const url = args.url || CONFIG.supabase.url;
      const key = args.anonKey || CONFIG.supabase.anonKey;

      if (!url || !key) {
        return { success: false, message: 'Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
      }

      supabase = createClient(url, key);

      try {
        const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        return { success: true, message: 'Successfully connected to Supabase', url };
      } catch (error) {
        return { success: false, message: `Failed to connect: ${error.message}` };
      }
    }
  },

  {
    name: 'supabase_query',
    description: 'Execute a Supabase query. Use automatically when user needs to fetch, insert, update or delete data from database.',
    autoTriggers: ['fetch data', 'get records', 'insert data', 'update database', 'delete from'],
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table name' },
        operation: { type: 'string', enum: ['select', 'insert', 'update', 'delete'], description: 'Operation type' },
        data: { type: 'object', description: 'Data for insert/update operations' },
        filters: { type: 'object', description: 'Filters for select/update/delete' },
        columns: { type: 'string', description: 'Columns to select (default: *)' }
      },
      required: ['table', 'operation']
    },
    handler: async (args) => {
      if (!supabase) {
        return { success: false, message: 'Not connected to Supabase. Run supabase_connect first.' };
      }

      try {
        let query = supabase.from(args.table);

        switch (args.operation) {
          case 'select':
            query = query.select(args.columns || '*');
            break;
          case 'insert':
            query = query.insert(args.data);
            break;
          case 'update':
            query = query.update(args.data);
            break;
          case 'delete':
            query = query.delete();
            break;
        }

        if (args.filters) {
          for (const [key, value] of Object.entries(args.filters)) {
            query = query.eq(key, value);
          }
        }

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data, count: data?.length };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'supabase_browse',
    description: 'Open Supabase dashboard in browser. Use automatically when user wants to view or manage Supabase project.',
    autoTriggers: ['open supabase', 'supabase dashboard', 'view database'],
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      const url = CONFIG.supabase.url;
      if (!url) {
        return { success: false, message: 'Supabase URL not configured' };
      }

      const dashboardUrl = url.replace('https://', 'https://app.supabase.com/project/').split('.')[0];
      await open(dashboardUrl);
      return { success: true, message: `Opened Supabase dashboard: ${dashboardUrl}` };
    }
  },

  // Project Management Tools
  {
    name: 'start_frontend',
    description: 'Start the frontend development server. Use automatically when user wants to run or start the React application.',
    autoTriggers: ['start frontend', 'run react', 'npm run dev', 'start development'],
    inputSchema: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'Port number (default: 5173)' }
      }
    },
    handler: async (args) => {
      const port = args.port || CONFIG.ports.frontend;
      const inUse = await checkPortInUse(port);

      if (inUse) {
        return { success: false, message: `Port ${port} is already in use` };
      }

      const result = await runCommand('npm run dev', CONFIG.project.frontendPath);
      return result;
    }
  },

  {
    name: 'start_backend',
    description: 'Start the backend server. Use automatically when user wants to run the API or backend services.',
    autoTriggers: ['start backend', 'run api', 'start server', 'npm start'],
    inputSchema: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'Port number (default: 5000)' }
      }
    },
    handler: async (args) => {
      const port = args.port || CONFIG.ports.backend;
      const inUse = await checkPortInUse(port);

      if (inUse) {
        return { success: false, message: `Port ${port} is already in use` };
      }

      const result = await runCommand('npm start', CONFIG.project.backendPath);
      return result;
    }
  },

  {
    name: 'install_deps',
    description: 'Install project dependencies. Use automatically when user mentions npm install or package installation.',
    autoTriggers: ['npm install', 'install packages', 'install dependencies', 'setup project'],
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['frontend', 'backend', 'both'], description: 'Which dependencies to install' }
      },
      required: ['target']
    },
    handler: async (args) => {
      const results = {};

      if (args.target === 'frontend' || args.target === 'both') {
        results.frontend = await runCommand('npm install', CONFIG.project.frontendPath);
      }

      if (args.target === 'backend' || args.target === 'both') {
        results.backend = await runCommand('npm install', CONFIG.project.backendPath);
      }

      return results;
    }
  },

  {
    name: 'run_build',
    description: 'Build the project for production. Use automatically when user wants to create production build.',
    autoTriggers: ['build project', 'npm run build', 'production build', 'compile'],
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['frontend', 'backend', 'both'], description: 'What to build' }
      },
      required: ['target']
    },
    handler: async (args) => {
      const results = {};

      if (args.target === 'frontend' || args.target === 'both') {
        results.frontend = await runCommand('npm run build', CONFIG.project.frontendPath);
      }

      if (args.target === 'backend' || args.target === 'both') {
        results.backend = await runCommand('npm run build', CONFIG.project.backendPath);
      }

      return results;
    }
  },

  {
    name: 'lint_code',
    description: 'Run linting and type checking. Use automatically when user wants to check code quality or fix issues.',
    autoTriggers: ['lint code', 'check types', 'eslint', 'typecheck', 'code quality'],
    inputSchema: {
      type: 'object',
      properties: {
        fix: { type: 'boolean', description: 'Auto-fix linting issues' }
      }
    },
    handler: async (args) => {
      const command = args.fix ? 'npm run lint:fix' : 'npm run lint';
      const results = {};

      results.lint = await runCommand(command, CONFIG.project.frontendPath);
      results.typecheck = await runCommand('npm run typecheck', CONFIG.project.frontendPath);

      return results;
    }
  },

  {
    name: 'git_status',
    description: 'Get git repository status. Use automatically when user asks about git status or current changes.',
    autoTriggers: ['git status', 'check changes', 'uncommitted files', 'current branch'],
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      const status = await runCommand('git status --short');
      const branch = await runCommand('git branch --show-current');
      const lastCommit = await runCommand('git log -1 --oneline');

      return {
        branch: branch.output?.trim(),
        status: status.output || 'Clean working directory',
        lastCommit: lastCommit.output?.trim()
      };
    }
  },

  {
    name: 'open_docs',
    description: 'Open project documentation',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Specific documentation file to open' }
      }
    },
    handler: async (args) => {
      let docPath = CONFIG.project.docsPath;

      if (args.file) {
        docPath = path.join(docPath, args.file);
      }

      try {
        const exists = await fs.access(docPath).then(() => true).catch(() => false);
        if (!exists) {
          return { success: false, message: `Documentation not found: ${docPath}` };
        }

        await open(docPath);
        return { success: true, message: `Opened: ${docPath}` };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'workflow_info',
    description: 'Get information about implemented workflows. Use automatically when user asks about ERP workflows or business processes.',
    autoTriggers: ['workflow', 'business process', 'procurement workflow', 'material dispatch'],
    inputSchema: {
      type: 'object',
      properties: {
        workflow: {
          type: 'string',
          enum: ['material-purchase', 'vendor-subcontractor', 'material-dispatch-production', 'material-dispatch-site', 'all'],
          description: 'Which workflow to get info about'
        }
      }
    },
    handler: async (args) => {
      const workflows = {
        'material-purchase': {
          name: 'Material Purchases - Project Bound',
          actors: 'Site/MEP Supervisor → Procurement → Project Manager → Estimation → Technical Director → Accounts → Design',
          form: 'PurchaseRequisitionForm.tsx',
          flags: ['QTY/SPEC FLAG', 'COST FLAG'],
          status: 'Frontend Complete'
        },
        'vendor-subcontractor': {
          name: 'Subcontractor/Vendor - Project Bound',
          actors: 'Procurement → Project Manager → Estimation → Technical Director → Accounts → Design',
          form: 'VendorScopeOfWorkForm.tsx',
          flags: ['QTY/SCOPE FLAG'],
          status: 'Frontend Complete'
        },
        'material-dispatch-production': {
          name: 'Material Dispatch - Production',
          actors: 'Factory Supervisor → Procurement/Store → Project Manager → Estimation → Technical Director → Design',
          form: 'MaterialRequisitionForm.tsx',
          page: 'MaterialDispatchProductionPage.tsx',
          status: 'Frontend Complete'
        },
        'material-dispatch-site': {
          name: 'Material Dispatch - Site Works',
          actors: 'Site/MEP/Factory Supervisor → Procurement → Project Manager → Technical Director → Design',
          form: 'MaterialDeliveryNote.tsx',
          page: 'MaterialDispatchSitePage.tsx',
          flags: ['QTY/SPEC/REQ FLAG'],
          status: 'Frontend Complete'
        }
      };

      if (args.workflow === 'all') {
        return workflows;
      }

      return workflows[args.workflow] || { message: 'Workflow not found' };
    }
  },

  {
    name: 'create_component',
    description: 'Create a new React component with TypeScript',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name' },
        type: { type: 'string', enum: ['component', 'page', 'form'], description: 'Component type' },
        path: { type: 'string', description: 'Custom path (optional)' }
      },
      required: ['name', 'type']
    },
    handler: async (args) => {
      const componentTemplate = `import React from 'react';
import { cn } from '@/lib/utils';

interface ${args.name}Props {
  className?: string;
}

export const ${args.name}: React.FC<${args.name}Props> = ({ className }) => {
  return (
    <div className={cn('', className)}>
      {/* ${args.name} implementation */}
    </div>
  );
};`;

      const basePath = CONFIG.project.frontendPath;
      let targetPath;

      if (args.path) {
        targetPath = path.join(basePath, args.path);
      } else {
        const typeMap = {
          'component': 'src/components',
          'page': 'src/pages',
          'form': 'src/components/forms'
        };
        targetPath = path.join(basePath, typeMap[args.type]);
      }

      const filePath = path.join(targetPath, `${args.name}.tsx`);

      try {
        await fs.mkdir(targetPath, { recursive: true });
        await fs.writeFile(filePath, componentTemplate);
        return { success: true, message: `Created component: ${filePath}` };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  // Browser Automation Tools
  {
    name: 'browser_open',
    description: 'Open browser and navigate to URL. Use automatically when user wants to test or check the application in browser.',
    autoTriggers: ['open browser', 'test in browser', 'check browser', 'launch browser'],
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to (default: http://localhost:5173)' },
        headless: { type: 'boolean', description: 'Run in headless mode (default: false)' }
      }
    },
    handler: async (args) => {
      try {
        const url = args.url || 'http://localhost:5173';
        const headless = args.headless || false;

        if (browser) {
          await browser.close();
        }

        browser = await puppeteer.launch({
          headless,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          defaultViewport: { width: 1280, height: 800 }
        });

        currentPage = await browser.newPage();

        // Enable console log capturing
        currentPage.on('console', msg => {
          console.log('Browser Console:', msg.text());
        });

        await currentPage.goto(url, { waitUntil: 'networkidle2' });

        return {
          success: true,
          message: `Browser opened at ${url}`,
          headless,
          pageTitle: await currentPage.title()
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'browser_console',
    description: 'Get console logs from the browser. Use automatically when user wants to check browser console or debug frontend errors.',
    autoTriggers: ['check console', 'console logs', 'browser errors', 'debug frontend'],
    inputSchema: {
      type: 'object',
      properties: {
        clear: { type: 'boolean', description: 'Clear console after reading (default: false)' }
      }
    },
    handler: async (args) => {
      if (!currentPage) {
        return { success: false, message: 'No browser page open. Use browser_open first.' };
      }

      try {
        const logs = [];

        // Inject script to capture all console methods
        const consoleLogs = await currentPage.evaluate(() => {
          const logs = [];
          const originalConsole = window.console;

          // Capture recent logs from memory if available
          if (window.__consoleLogs) {
            return window.__consoleLogs;
          }

          // Setup capturing for future logs
          window.__consoleLogs = [];
          ['log', 'error', 'warn', 'info', 'debug'].forEach(method => {
            const original = console[method];
            console[method] = (...args) => {
              window.__consoleLogs.push({
                type: method,
                message: args.map(arg => {
                  if (typeof arg === 'object') {
                    try { return JSON.stringify(arg, null, 2); }
                    catch { return String(arg); }
                  }
                  return String(arg);
                }).join(' '),
                timestamp: new Date().toISOString()
              });
              original.apply(console, args);
            };
          });

          return window.__consoleLogs;
        });

        if (args.clear) {
          await currentPage.evaluate(() => {
            window.__consoleLogs = [];
            console.clear();
          });
        }

        return {
          success: true,
          logs: consoleLogs || [],
          count: consoleLogs ? consoleLogs.length : 0
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'browser_network',
    description: 'Monitor network requests in the browser. Use automatically when user wants to check API calls or network activity.',
    autoTriggers: ['check network', 'api calls', 'network requests', 'http requests', 'fetch requests'],
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Filter requests by URL pattern' },
        type: { type: 'string', enum: ['all', 'xhr', 'fetch', 'document', 'stylesheet', 'script', 'image'], description: 'Request type to monitor' }
      }
    },
    handler: async (args) => {
      if (!currentPage) {
        return { success: false, message: 'No browser page open. Use browser_open first.' };
      }

      try {
        const requests = [];
        const filter = args.filter || '';
        const type = args.type || 'all';

        // Enable request interception
        await currentPage.setRequestInterception(true);

        // Collect requests for 3 seconds
        const requestHandler = (request) => {
          const url = request.url();
          const resourceType = request.resourceType();

          if (type === 'all' || resourceType === type ||
              (type === 'xhr' && (resourceType === 'xhr' || resourceType === 'fetch'))) {
            if (!filter || url.includes(filter)) {
              requests.push({
                url,
                method: request.method(),
                type: resourceType,
                headers: request.headers(),
                timestamp: new Date().toISOString()
              });
            }
          }
          request.continue();
        };

        currentPage.on('request', requestHandler);

        // Wait and collect
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Remove handler
        currentPage.removeListener('request', requestHandler);
        await currentPage.setRequestInterception(false);

        return {
          success: true,
          requests,
          count: requests.length,
          filter: filter || 'none',
          type
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current browser page. Use automatically when user wants to capture or see the current page state.',
    autoTriggers: ['take screenshot', 'capture page', 'show me the page', 'browser screenshot'],
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: { type: 'boolean', description: 'Capture full page (default: false)' },
        path: { type: 'string', description: 'Save path for screenshot' }
      }
    },
    handler: async (args) => {
      if (!currentPage) {
        return { success: false, message: 'No browser page open. Use browser_open first.' };
      }

      try {
        const screenshotPath = args.path || path.join(__dirname, `screenshot-${Date.now()}.png`);

        await currentPage.screenshot({
          path: screenshotPath,
          fullPage: args.fullPage || false
        });

        return {
          success: true,
          message: 'Screenshot captured',
          path: screenshotPath
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'browser_click',
    description: 'Click an element in the browser. Use automatically when user wants to interact with the page.',
    autoTriggers: ['click button', 'click element', 'interact with page'],
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector or text content of element to click' },
        wait: { type: 'number', description: 'Wait time after click in ms (default: 1000)' }
      },
      required: ['selector']
    },
    handler: async (args) => {
      if (!currentPage) {
        return { success: false, message: 'No browser page open. Use browser_open first.' };
      }

      try {
        // Try CSS selector first
        try {
          await currentPage.click(args.selector);
        } catch {
          // Try clicking by text content
          await currentPage.evaluate((text) => {
            const elements = Array.from(document.querySelectorAll('*'));
            const element = elements.find(el => el.textContent?.trim() === text);
            if (element) element.click();
            else throw new Error('Element not found');
          }, args.selector);
        }

        if (args.wait) {
          await currentPage.waitForTimeout(args.wait);
        } else {
          await currentPage.waitForTimeout(1000);
        }

        return { success: true, message: `Clicked element: ${args.selector}` };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'browser_type',
    description: 'Type text into an input field in the browser. Use automatically when user wants to fill forms or enter data.',
    autoTriggers: ['type text', 'fill form', 'enter text', 'input text'],
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of input field' },
        text: { type: 'string', description: 'Text to type' },
        clear: { type: 'boolean', description: 'Clear field before typing (default: true)' }
      },
      required: ['selector', 'text']
    },
    handler: async (args) => {
      if (!currentPage) {
        return { success: false, message: 'No browser page open. Use browser_open first.' };
      }

      try {
        if (args.clear !== false) {
          await currentPage.click(args.selector, { clickCount: 3 }); // Select all
        }
        await currentPage.type(args.selector, args.text);

        return { success: true, message: `Typed "${args.text}" into ${args.selector}` };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'browser_close',
    description: 'Close the browser. Use automatically when done with browser testing.',
    autoTriggers: ['close browser', 'quit browser', 'stop browser'],
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      if (!browser) {
        return { success: false, message: 'No browser is open.' };
      }

      try {
        await browser.close();
        browser = null;
        currentPage = null;
        return { success: true, message: 'Browser closed successfully' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'browser_evaluate',
    description: 'Execute JavaScript in the browser context. Use for advanced browser automation and debugging.',
    autoTriggers: ['run javascript', 'execute script', 'browser script', 'eval javascript'],
    inputSchema: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'JavaScript code to execute in browser' }
      },
      required: ['script']
    },
    handler: async (args) => {
      if (!currentPage) {
        return { success: false, message: 'No browser page open. Use browser_open first.' };
      }

      try {
        const result = await currentPage.evaluate((script) => {
          try {
            return eval(script);
          } catch (error) {
            return { error: error.message };
          }
        }, args.script);

        return { success: true, result };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  // Backend Management Tools
  {
    name: 'backend_logs',
    description: 'View backend server logs. Use automatically when debugging backend issues or checking API errors.',
    autoTriggers: ['backend logs', 'server logs', 'api logs', 'check backend errors'],
    inputSchema: {
      type: 'object',
      properties: {
        lines: { type: 'number', description: 'Number of lines to show (default: 50)' },
        filter: { type: 'string', description: 'Filter logs by keyword' },
        follow: { type: 'boolean', description: 'Follow logs in real-time (default: false)' }
      }
    },
    handler: async (args) => {
      const lines = args.lines || 50;
      const filter = args.filter || '';

      try {
        const logPath = path.join(CONFIG.project.backendPath, 'logs', 'app.log');

        // Check if log file exists
        const exists = await fs.access(logPath).then(() => true).catch(() => false);
        if (!exists) {
          // Try to read from console output instead
          const command = `tail -n ${lines} ${logPath} 2>&1 || echo "No log file found"`;
          const result = await runCommand(command);
          return result;
        }

        // Read log file
        const content = await fs.readFile(logPath, 'utf-8');
        const allLines = content.split('\n');
        let filteredLines = allLines;

        if (filter) {
          filteredLines = allLines.filter(line =>
            line.toLowerCase().includes(filter.toLowerCase())
          );
        }

        const relevantLines = filteredLines.slice(-lines);

        return {
          success: true,
          logs: relevantLines.join('\n'),
          count: relevantLines.length,
          filtered: !!filter
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'backend_test',
    description: 'Run backend tests. Use automatically when user wants to test backend API or services.',
    autoTriggers: ['test backend', 'run backend tests', 'api tests', 'test api'],
    inputSchema: {
      type: 'object',
      properties: {
        testFile: { type: 'string', description: 'Specific test file to run' },
        coverage: { type: 'boolean', description: 'Generate coverage report (default: false)' }
      }
    },
    handler: async (args) => {
      let command = 'npm test';

      if (args.testFile) {
        command += ` -- ${args.testFile}`;
      }

      if (args.coverage) {
        command = 'npm run test:coverage';
      }

      const result = await runCommand(command, CONFIG.project.backendPath);
      return result;
    }
  },

  {
    name: 'database_backup',
    description: 'Create a database backup. Use automatically when user wants to backup database.',
    autoTriggers: ['backup database', 'db backup', 'save database', 'export database'],
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['sql', 'json', 'csv'], description: 'Backup format (default: sql)' },
        tables: { type: 'array', items: { type: 'string' }, description: 'Specific tables to backup' }
      }
    },
    handler: async (args) => {
      if (!supabase) {
        return { success: false, message: 'Database not connected. Run supabase_connect first.' };
      }

      const format = args.format || 'sql';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, 'backups');
      const backupFile = path.join(backupDir, `backup-${timestamp}.${format}`);

      try {
        await fs.mkdir(backupDir, { recursive: true });

        if (format === 'json') {
          // Export data as JSON
          const tables = args.tables || ['purchases', 'projects', 'materials'];
          const data = {};

          for (const table of tables) {
            const { data: tableData, error } = await supabase
              .from(table)
              .select('*');

            if (error) throw error;
            data[table] = tableData;
          }

          await fs.writeFile(backupFile, JSON.stringify(data, null, 2));
        } else {
          // For SQL format, use pg_dump equivalent
          const url = CONFIG.supabase.url;
          const dbUrl = url.replace('https://', '').split('.')[0];

          return {
            success: true,
            message: `Backup initiated. For SQL backups, use Supabase dashboard or pg_dump with connection string.`,
            dashboardUrl: `https://app.supabase.com/project/${dbUrl}/database/backups`
          };
        }

        return {
          success: true,
          message: 'Backup created successfully',
          path: backupFile,
          format,
          timestamp
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'database_migrate',
    description: 'Run database migrations. Use automatically when user wants to migrate or update database schema.',
    autoTriggers: ['run migrations', 'migrate database', 'update schema', 'db migrate'],
    inputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down'], description: 'Migration direction (default: up)' },
        target: { type: 'string', description: 'Target migration version' }
      }
    },
    handler: async (args) => {
      const direction = args.direction || 'up';
      const migrationsPath = path.join(CONFIG.project.backendPath, 'migrations');

      try {
        // Check for migration files
        const exists = await fs.access(migrationsPath).then(() => true).catch(() => false);

        if (!exists) {
          return {
            success: false,
            message: 'No migrations folder found. Create migrations in backend/migrations/'
          };
        }

        // Run migration command
        let command = `npx knex migrate:${direction}`;
        if (args.target) {
          command += ` --to ${args.target}`;
        }

        const result = await runCommand(command, CONFIG.project.backendPath);
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'terminal',
    description: 'Execute terminal commands. Use automatically when user wants to run shell commands.',
    autoTriggers: ['run command', 'execute', 'terminal', 'shell command'],
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' },
        cwd: { type: 'string', description: 'Working directory (default: project root)' },
        timeout: { type: 'number', description: 'Timeout in seconds (default: 30)' }
      },
      required: ['command']
    },
    handler: async (args) => {
      const cwd = args.cwd || __dirname;
      const timeout = (args.timeout || 30) * 1000;

      try {
        const { stdout, stderr } = await execAsync(args.command, {
          cwd,
          timeout,
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        return {
          success: true,
          stdout: stdout || '',
          stderr: stderr || '',
          command: args.command,
          cwd
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          stdout: error.stdout || '',
          stderr: error.stderr || '',
          code: error.code
        };
      }
    }
  },

  {
    name: 'process_list',
    description: 'List running Node.js processes. Use automatically when checking what servers are running.',
    autoTriggers: ['list processes', 'running servers', 'check processes', 'ps'],
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Filter processes by name' }
      }
    },
    handler: async (args) => {
      try {
        const command = process.platform === 'win32'
          ? 'wmic process where "name=\'node.exe\'" get processid,commandline /format:list'
          : 'ps aux | grep node';

        const { stdout } = await execAsync(command);
        let processes = stdout.split('\n').filter(line => line.trim());

        if (args.filter) {
          processes = processes.filter(line =>
            line.toLowerCase().includes(args.filter.toLowerCase())
          );
        }

        return {
          success: true,
          processes,
          count: processes.length,
          platform: process.platform
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'kill_process',
    description: 'Kill a process by PID or port. Use automatically when stopping servers or freeing ports.',
    autoTriggers: ['kill process', 'stop server', 'free port', 'kill port'],
    inputSchema: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: 'Process ID to kill' },
        port: { type: 'number', description: 'Kill process using this port' }
      }
    },
    handler: async (args) => {
      try {
        let command;

        if (args.port) {
          // Kill by port
          if (process.platform === 'win32') {
            // First find the PID
            const { stdout } = await execAsync(`netstat -ano | findstr :${args.port}`);
            const lines = stdout.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              return { success: false, message: `No process found on port ${args.port}` };
            }

            // Extract PID from the output
            const pid = lines[0].trim().split(/\s+/).pop();
            command = `taskkill /F /PID ${pid}`;
          } else {
            command = `lsof -ti:${args.port} | xargs kill -9`;
          }
        } else if (args.pid) {
          // Kill by PID
          command = process.platform === 'win32'
            ? `taskkill /F /PID ${args.pid}`
            : `kill -9 ${args.pid}`;
        } else {
          return { success: false, message: 'Provide either pid or port' };
        }

        await execAsync(command);
        return {
          success: true,
          message: args.port
            ? `Killed process on port ${args.port}`
            : `Killed process ${args.pid}`
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'api_test',
    description: 'Test API endpoints. Use automatically when user wants to test API routes.',
    autoTriggers: ['test api', 'api endpoint', 'test endpoint', 'curl'],
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'API URL to test' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method' },
        body: { type: 'object', description: 'Request body for POST/PUT/PATCH' },
        headers: { type: 'object', description: 'Request headers' }
      },
      required: ['url', 'method']
    },
    handler: async (args) => {
      try {
        const url = args.url.startsWith('http')
          ? args.url
          : `http://localhost:5000${args.url}`;

        const options = {
          method: args.method,
          headers: {
            'Content-Type': 'application/json',
            ...args.headers
          }
        };

        if (args.body && ['POST', 'PUT', 'PATCH'].includes(args.method)) {
          options.body = JSON.stringify(args.body);
        }

        const response = await fetch(url, options);
        const data = await response.json().catch(() => response.text());

        return {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  },

  {
    name: 'docker_status',
    description: 'Check Docker containers status. Use automatically when checking Docker services.',
    autoTriggers: ['docker status', 'containers', 'docker ps', 'check docker'],
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', description: 'Show all containers including stopped ones' }
      }
    },
    handler: async (args) => {
      const command = args.all ? 'docker ps -a' : 'docker ps';
      const result = await runCommand(command);
      return result;
    }
  },

  {
    name: 'redis_check',
    description: 'Check Redis server status. Use automatically when debugging cache issues.',
    autoTriggers: ['redis status', 'check redis', 'cache status'],
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Redis host (default: localhost)' },
        port: { type: 'number', description: 'Redis port (default: 6379)' }
      }
    },
    handler: async (args) => {
      const host = args.host || 'localhost';
      const port = args.port || 6379;

      try {
        const command = `redis-cli -h ${host} -p ${port} ping`;
        const { stdout } = await execAsync(command);

        return {
          success: stdout.trim() === 'PONG',
          status: stdout.trim(),
          host,
          port
        };
      } catch (error) {
        return {
          success: false,
          message: 'Redis not available or redis-cli not installed',
          error: error.message
        };
      }
    }
  },

  {
    name: 'env_check',
    description: 'Verify environment variables configuration. Use automatically when debugging env issues.',
    autoTriggers: ['check env', 'environment variables', 'env vars', 'check config'],
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['frontend', 'backend', 'both'], description: 'Which env to check' }
      }
    },
    handler: async (args) => {
      const target = args.target || 'both';
      const results = {};

      const checkEnv = async (name, dir, prefix) => {
        const envFiles = ['.env', '.env.local', '.env.development'];
        const found = {};

        for (const file of envFiles) {
          const filePath = path.join(dir, file);
          const exists = await fs.access(filePath).then(() => true).catch(() => false);

          if (exists) {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
            const vars = {};

            for (const line of lines) {
              const [key, value] = line.split('=');
              if (key && (!prefix || key.startsWith(prefix))) {
                vars[key.trim()] = value ? '***' : 'NOT SET'; // Hide actual values
              }
            }

            found[file] = vars;
          }
        }

        return found;
      };

      if (target === 'frontend' || target === 'both') {
        results.frontend = await checkEnv('frontend', CONFIG.project.frontendPath, 'VITE_');
      }

      if (target === 'backend' || target === 'both') {
        results.backend = await checkEnv('backend', CONFIG.project.backendPath, null);
      }

      return {
        success: true,
        environments: results,
        recommendation: 'Ensure all required variables are set in appropriate .env files'
      };
    }
  },

  {
    name: 'env_setup',
      type: 'object',
      properties: {
        supabaseUrl: { type: 'string', description: 'Supabase project URL' },
        supabaseAnonKey: { type: 'string', description: 'Supabase anon key' },
        apiBaseUrl: { type: 'string', description: 'Backend API base URL' }
      }
    },
    handler: async (args) => {
      const envPath = path.join(CONFIG.project.frontendPath, '.env.local');
      const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=${args.supabaseUrl || ''}
VITE_SUPABASE_ANON_KEY=${args.supabaseAnonKey || ''}

# API Configuration
VITE_API_BASE_URL=${args.apiBaseUrl || 'http://localhost:5000'}

# Environment
VITE_ENV=development`;

      try {
        await fs.writeFile(envPath, envContent);
        return { success: true, message: 'Environment variables configured', path: envPath };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  }
];

// Register all tools
tools.forEach(tool => {
  server.setRequestHandler(
    {
      method: 'tools/call',
      params: {
        name: tool.name,
        arguments: {}
      }
    },
    async (request) => {
      const args = request.params.arguments || {};
      const result = await tool.handler(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );
});

// List available tools with automatic usage hints
server.setRequestHandler({ method: 'tools/list' }, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      // Include triggers for Claude to know when to use each tool automatically
      metadata: {
        autoTriggers: tool.autoTriggers || [],
        category: tool.category || 'general',
        priority: tool.priority || 'normal'
      }
    }))
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('MeterSquare ERP MCP Server started');
  console.error(`Available tools: ${tools.map(t => t.name).join(', ')}`);
}

main().catch(console.error);