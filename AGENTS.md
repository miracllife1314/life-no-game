<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Local Port Checking Rule
Before recommending local test links or starting any development server, always check currently occupied ports on the system using `lsof -i -P -n | grep LISTEN` and explicitly list the active ports to the user first.
