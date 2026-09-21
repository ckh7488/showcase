from pathlib import Path
import json,numpy as np,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
O=Path(__file__).resolve().parent;r=json.loads((O/'pcb_rim_candidate.json').read_text())
fig,axes=plt.subplots(2,3,figsize=(13,9),layout='constrained')
for col,c in enumerate(r['section_geometry']):
 for row,m in enumerate(c['models']):
  ax=axes[row,col];xy=np.array(m['xy']);tris=xy[np.array(m['triangles'])]
  ax.add_collection(PolyCollection(tris,facecolors='#327c92' if row==0 else '#43a089',edgecolors='none'))
  if c['axis']=='Z':
   ax.set_xlim(-27,27);ax.set_xlabel('X (mm)')
   ax.plot([-18.5,-18.5,18.5,18.5],[-35,-65,-65,-35],color='#d48622',ls='--',lw=1.2,label='Same inner opening')
  else:
   ax.set_xlim(-13,19);ax.set_xlabel('Z (mm)')
   ax.plot([4.75,4.75,6.35,6.35,4.75],[-64,-36,-36,-64,-64],color='#d48622',ls='--',lw=1.2,label='PCB envelope')
  ax.set_ylim(-73,-30);ax.set_aspect('equal');ax.grid(alpha=.15);ax.set_ylabel('Y (mm)');ax.set_title(m['label']+' | '+c['name'],fontsize=11)
fig.suptitle('A14 PCB holder: actual CAD sections\nReview candidate adds material outside the PCB opening; JLC DFM acceptance remains unverified',fontsize=13)
fig.savefig(O/'pcb_holder_sections.png',dpi=170)
