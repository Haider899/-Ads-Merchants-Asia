import os
import re

routes_dir = r"d:\Ads Merchants Asia\server\routes"

for filename in os.listdir(routes_dir):
    if filename.endswith('.js'):
        filepath = os.path.join(routes_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Make route handlers async
        # Pattern: router.METHOD('path', (req, res) => { or router.METHOD('path', authMiddleware, (req, res) => {
        content = re.sub(r'router\.(get|post|put|delete|all)\((.*?),\s*(authMiddleware,\s*)?\((req,\s*res.*?)\)\s*=>\s*\{',
                         r'router.\1(\2, \3async (\4) => {', content)
                         
        # Replace db.method(...) with await db.method(...)
        content = re.sub(r'(?<!await\s)db\.([a-zA-Z0-9_]+)\(', r'await db.\1(', content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Refactored {filename}")
