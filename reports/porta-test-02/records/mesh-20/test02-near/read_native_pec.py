"""Read the native openEMS VTK XML PEC edge dump; no synthesized field data."""
import argparse,base64,json,struct,zlib
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

def read(path):
    root=ET.parse(path).getroot()
    assert root.attrib['compressor']=='vtkZLibDataCompressor'
    assert root.attrib['header_type']=='UInt32'
    payload=''.join(root.find('AppendedData').text.split())[1:]
    def array(element):
        s=payload[int(element.attrib['offset']):]
        n,block,last=struct.unpack('<III',base64.b64decode(s[:16]))
        length=4*(3+n);enc_length=4*((length+2)//3)
        header=struct.unpack('<'+'I'*(3+n),base64.b64decode(s[:enc_length]))
        compressed=base64.b64decode(s[enc_length:enc_length+4*((sum(header[3:])+2)//3)])
        parts=[];offset=0
        for size in header[3:]:parts.append(zlib.decompress(compressed[offset:offset+size]));offset+=size
        dtype={'Float32':'<f4','Int64':'<i8'}[element.attrib['type']]
        return np.frombuffer(b''.join(parts),dtype=dtype)
    piece=root.find('./PolyData/Piece')
    points=array(piece.find('./Points/DataArray')).reshape(-1,3).astype(float)*1000
    lines=array(piece.find('./Lines/DataArray[@Name="connectivity"]')).reshape(-1,2)
    offsets=array(piece.find('./Lines/DataArray[@Name="offsets"]'))
    assert np.array_equal(offsets,np.arange(1,len(lines)+1)*2)
    mat=coo_matrix((np.ones(len(lines)),(lines[:,0],lines[:,1])),shape=(len(points),len(points)))
    count,labels=connected_components(mat,directed=False)
    return points,lines,labels,count

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--vtp',required=True);p.add_argument('--model',required=True);p.add_argument('--out',required=True);a=p.parse_args()
    points,edges,labels,count=read(a.vtp);model=json.loads(Path(a.model).read_text())
    rows=[]
    for wi,w in enumerate(model['wires']):
        terminal=np.array(w['terminals'][0]);entry=np.array(w['cablePoints'][0])
        ni=int(np.argmin(np.linalg.norm(points-terminal,axis=1)));ei=int(np.argmin(np.linalg.norm(points-entry,axis=1)))
        rows.append({'wire':wi,'group':w['group'],'portNearestNode_mm':points[ni].tolist(),'cableNearestNode_mm':points[ei].tolist(),'portComponent':int(labels[ni]),'cableComponent':int(labels[ei]),'connectedPortToCable':bool(labels[ni]==labels[ei])})
    result={'source':'Native openEMS 0.0.36 setup-only PEC_dump.vtp; original left fanout mesh and geometry; cropped outer domain with PMC faces, no time-domain response.','coordinateUnit':'mm','componentCount':int(count),'nodes':points.tolist(),'edges':edges.tolist(),'component':labels.tolist(),'wireChecks':rows}
    Path(a.out).write_text(json.dumps(result,separators=(',',':')))
    print(json.dumps({'componentCount':count,'wireChecks':rows}))
