"""Audit Wire PEC edge connectivity using the openEMS 0.0.36 rule.

CalcPEC_Range samples each Yee electric edge at its midpoint. CSPrimWire
accepts the union of radius-r capsules along its polyline; Wire does not
receive the extra connected path that CalcPEC_Curves assigns to Curve.
This is a geometry audit, not a time-domain simulation.
"""
import argparse
import json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

def audit(folder):
    model=json.loads((folder/'model.json').read_text())
    mesh=json.loads((folder/'mesh.json').read_text())
    grid=[np.array(mesh[a]) for a in 'xyz']; shape=tuple(map(len,grid))
    radius=model['input']['copperRadius_mm']
    def node(p): return tuple(int(np.argmin(abs(g-v))) for g,v in zip(grid,p))
    def nid(p):return np.ravel_multi_index(np.array(p).T,shape)
    def components(edges):
        ends=[]
        for d,idx in edges:
            stop=list(idx);stop[d]+=1;ends.append((nid(idx),nid(stop)))
        ends=np.array(ends)
        ids,remap=np.unique(ends,return_inverse=True); remap=remap.reshape(-1,2)
        matrix=coo_matrix((np.ones(len(ends)),(remap[:,0],remap[:,1])),shape=(len(ids),len(ids)))
        n,labels=connected_components(matrix,directed=False)
        return n,dict(zip(ids.tolist(),labels.tolist())),np.bincount(labels)
    rows=[];all_edges=set();edge_sets=[]
    for wi,w in enumerate(model['wires']):
        edges=set()
        for a,b in zip(w['points'][:-1],w['points'][1:]):
            a=np.array(a); b=np.array(b);delta=b-a
            for d in range(3):
                coords=[(g[:-1]+g[1:])/2 if k==d else g for k,g in enumerate(grid)]
                indices=[np.flatnonzero((g>=min(a[k],b[k])-radius)&(g<=max(a[k],b[k])+radius)) for k,g in enumerate(coords)]
                if any(len(i)==0 for i in indices):continue
                ii=np.array(np.meshgrid(*indices,indexing='ij')).reshape(3,-1).T
                points=np.column_stack([coords[k][ii[:,k]] for k in range(3)])
                t=np.clip((points-a)@delta/(delta@delta),0,1)
                inside=np.sum((points-a-t[:,None]*delta)**2,axis=1)<radius**2
                edges.update((d,tuple(q)) for q in ii[inside])
        count,labels,sizes=components(edges)
        terminals=[int(nid(node(p))) for p in w['terminals']]
        tl=[labels.get(n) for n in terminals]
        # Extents of each piece show where the wire breaks on the grid.
        pieces=[]
        for label in np.argsort(sizes)[::-1]:
            ids=np.array([n for n,l in labels.items() if l==label])
            ii=np.array(np.unravel_index(ids,shape)).T
            pieces.append({'nodes':int(sizes[label]),'xRange_mm':[float(grid[0][ii[:,0]].min()),float(grid[0][ii[:,0]].max())]})
        rows.append({'wire':wi,'group':w['group'],'edges':len(edges),'components':count,'terminalsConnected':tl[0] is not None and tl[0]==tl[1],'terminalComponents':tl,'pieces':pieces})
        all_edges.update(edges);edge_sets.append(edges)
    # Add metal end caps created by LumpedPort's caps=True.
    for port in model['ports']:
        d=1 if port['role']=='power' else 2
        start=node(np.minimum(port['start'],port['stop']));stop=node(np.maximum(port['start'],port['stop']))
        for cap in [start[d],stop[d]]:
            for k in range(3):
                if k==d:continue
                ranges=[range(start[j],stop[j]+(0 if j==k else 1)) if j!=d else [cap] for j in range(3)]
                for idx in np.array(np.meshgrid(*ranges,indexing='ij')).reshape(3,-1).T:
                    all_edges.add((k,tuple(idx)))
    total,labels,sizes=components(all_edges)
    terminal_rows=[]
    for w in model['wires']:
        terminal_rows.append([labels.get(int(nid(node(p)))) for p in w['terminals']])
    return {'method':'Exact midpoint capsule rule reconstructed from openEMS 0.0.36 CalcPEC_Range and CSXCAD 0.6.3 CSPrimWire::IsInside; metal Wire primitives plus lumped-port caps. Not a native operator dump.','mesh':model['input']['meshLines'],'wiring':model['input']['wiring'],'wireAudits':rows,'allWireAndCapComponents':total,'terminalComponentsWithCaps':terminal_rows,'sources':['https://github.com/thliebig/openEMS/blob/v0.0.36/FDTD/operator.cpp','https://github.com/thliebig/CSXCAD/blob/v0.6.3/src/CSPrimWire.cpp','https://github.com/thliebig/CSXCAD/blob/v0.6.3/src/CSPrimitives.h']}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--run',required=True);p.add_argument('--out',required=True);args=p.parse_args()
    result=audit(Path(args.run));Path(args.out).write_text(json.dumps(result,indent=2))
    print(json.dumps({k:v for k,v in result.items() if k!='wireAudits'}))
    for row in result['wireAudits']: print(json.dumps({k:v for k,v in row.items() if k!='pieces'}))
