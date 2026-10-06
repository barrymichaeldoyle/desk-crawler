"""Build paired OG/X review pages with visible, settled-runtime layout results.

Run from the repository root after tools/trmnl/preview.ts --recap, then serve
.previews over localhost. This is a preview harness, not product markup.
"""
from pathlib import Path
import json
states=sorted(p.name.removesuffix('--payload.json') for p in Path('.previews').glob('*--payload.json'))
layouts={'markup':(800,480,1872,1404),'markup_half_horizontal':(800,240,1872,702),'markup_half_vertical':(400,480,936,1404),'markup_quadrant':(400,240,936,702)}
script='''<script>
function inspect(frame){const d=frame.contentDocument;const footer=d.querySelector('.title_bar');const view=d.querySelector('.view');if(!footer||!view)return {error:'Missing view or footer'};const bound=Math.min(footer.getBoundingClientRect().top,view.getBoundingClientRect().bottom);const failures=[...d.querySelectorAll('.layout span,.layout img')].filter(e=>e.getBoundingClientRect().height&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().bottom>bound+2).map(e=>({text:(e.innerText||e.getAttribute('src')||'').slice(0,100),bottom:e.getBoundingClientRect().bottom,bound}));const images=[...d.querySelectorAll('.layout img')].filter(e=>e.getBoundingClientRect().height&&e.complete&&e.naturalWidth===0).map(e=>e.src);const tracks=[...d.querySelectorAll(".progress-bar .track")];const weapon=[...d.querySelectorAll(".layout span")].find(e=>e.textContent==="Weapon"&&e.getBoundingClientRect().height);const art=[...d.querySelectorAll(".layout img")].find(e=>e.getBoundingClientRect().height&&e.naturalWidth>200);const barsBottom=tracks.length?Math.max(...tracks.map(e=>e.getBoundingClientRect().bottom)):null;return {failures,images,footerTop:bound,storyGaps:[...d.querySelectorAll(".layout .grid.grid--cols-1")].filter(e=>e.querySelector(":scope > .flex.flex--row .grow[data-clamp]")&&e.querySelector(":scope > .flex.flex--row .no-shrink.label")).map(e=>{const story=e.querySelector(":scope > .flex.flex--row .grow[data-clamp]");const stats=e.querySelector(":scope > .flex.flex--row .no-shrink.label");return {story:story.textContent.trim().slice(0,70),gap:stats.getBoundingClientRect().top-story.getBoundingClientRect().bottom,computedGap:frame.contentWindow.getComputedStyle(e).gap};}),headerGrids:[...d.querySelectorAll(".layout > .grid:first-of-type .grid")].map(e=>({classes:e.className,gap:frame.contentWindow.getComputedStyle(e).gap})),barToGearGap:weapon&&barsBottom!==null?weapon.getBoundingClientRect().top-barsBottom:null,sceneTop:art?art.getBoundingClientRect().top:null};}
for(const frame of document.querySelectorAll('iframe'))frame.addEventListener('load',async()=>{await frame.contentDocument.fonts.ready;while(frame.contentWindow.TRMNL_PLUGINS_READY!==true)await new Promise(resolve=>requestAnimationFrame(resolve));requestAnimationFrame(()=>requestAnimationFrame(()=>{const result=inspect(frame);document.querySelector(`[data-result="${frame.name}"]`).textContent=JSON.stringify(result);if([...document.querySelectorAll('pre[data-result]')].every(e=>e.textContent!=='Checking…'))document.querySelector('button').hidden=false;}));});
</script>'''
for state in states:
 for layout,(ow,oh,xw,xh) in layouts.items():
  cells=[]
  for device,w,h,scale in [('og',ow,oh,1),('x',xw,xh,0.45 if xh>1000 or xw>1000 else 0.7)]:
   name=f'{state}--{device}--{layout}'
   revision=Path(f'.previews/{name}.html').stat().st_mtime_ns
   cells.append(f'<section><h2>{device.upper()} · {state} · {layout}</h2><div class="stage" style="width:{w*scale}px;height:{h*scale}px"><iframe title="{name}" name="{name}" src="{name}.html?review={revision}" style="width:{w}px;height:{h}px;transform:scale({scale});transform-origin:top left"></iframe></div><pre data-result="{name}">Checking…</pre></section>')
  html='<html><head><meta charset="utf-8"><title>Recap layout review</title><style>body{margin:16px;font:16px system-ui;background:#dedede}main{display:flex;gap:24px;align-items:flex-start}h2{font-size:16px}iframe{border:0;display:block}pre{max-width:820px;white-space:pre-wrap;font-size:12px}.stage{overflow:hidden}</style></head><body><button hidden>Results ready</button><main>'+''.join(cells)+'</main>'+script+'</body></html>'
  Path(f'.previews/review--{state}--{layout}.html').write_text(html)
Path('.previews/recap-review-index.html').write_text('<h1>Recap previews</h1>'+''.join(f'<p><a href="review--{s}--{l}.html">{s} · {l}</a></p>' for s in states for l in layouts))
print(f'Created {len(states)*len(layouts)} review pages for {len(states)} states.')
