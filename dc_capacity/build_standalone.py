"""Builds dashboard_standalone.html: index.html + engine.js inlined, no server needed."""
import os
d = os.path.dirname(os.path.abspath(__file__))
html = open(f"{d}/static/index.html").read()
engine = open(f"{d}/static/engine.js").read()
old = 'const p=$("proc").value,d=await (await fetch(`/api/data?days=${$("days").value}&process=${p}`)).json();'
assert old in html
html = html.replace(old, 'const p=$("proc").value,d=api(ROWS,+$("days").value,p);')
html = html.replace("<script>\nconst KPI=", f"<script>\n{engine}\nconst ROWS=generate();\nconst KPI=", 1)
html = html.replace("Capacity Monitor</h1>", "Capacity Monitor <small style='font-weight:400;color:#667085'>(demo - synthetic data)</small></h1>")
open(f"{d}/dashboard_standalone.html", "w").write(html)
