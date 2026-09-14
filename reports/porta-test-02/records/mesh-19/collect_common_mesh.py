"""Package matched TEST02 meshes separately, with source-reference checks."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET
import numpy as np
from collect_cable_results import collect_case, compare, KEYS, READ, SHA, ENC, DEC

p=argparse.ArgumentParser();p.add_argument('--runs',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
a.out.mkdir(parents=True,exist_ok=True)
names=['test02-floating','test02-near','test02-floating-fine','test02-near-fine']
cases=[];drive={'definition':'Edrive=((V7+50*I7)+(V8+50*I8))/2; twice average incident voltage, not loaded cable voltage.','cases':{},'independentScalarChecks':0}
pins=[]
for name in names:
    src=a.runs/name;dst=a.out/name
    if not (src/'response.json').exists():continue
    c=collect_case(src,a.runs/'logs'/f'{name}.log',dst);cases.append(c)
    windows={}
    for ns in c['windows']:
        ar=np.load(dst/f'window-{ns}ns.npz');v=ar['portVoltage'];i=ar['portCurrent'];sources=v[6:8]+50*i[6:8];e=sources.mean(axis=0);factor=ar['Vin']/e
        assert np.isfinite(e).all() and np.all(abs(e)>1e-30)
        values={key:ar[key]*factor for key in KEYS}
        currents=ar['HshieldCurrent']*factor
        windows[ns]={'npz_sha256':SHA(dst/f'window-{ns}ns.npz'),'VinOverDrive':ENC(factor),'driveSpectrum':ENC(e),
            'driveImbalance':ENC((sources[0]-sources[1])/e),'HshieldCurrent':ENC(currents),**{k:ENC(v) for k,v in values.items()}}
        cache={}
        def scalar(filename,k):
            if filename not in cache:
                raw=np.loadtxt(dst/filename,comments='%');cache[filename]=raw[raw[:,0]<=int(ns)*1e-9]
            t,y=cache[filename].T
            return sum(v0*np.exp(-2j*np.pi*ar['frequency_Hz'][k]*t0) for t0,v0 in zip(t,y))*2*(t[1]-t[0])
        for k in [0,90,163,165,190]:
            source=(scalar('port_ut_7',k)+50*scalar('port_it_7',k)+scalar('port_ut_8',k)+50*scalar('port_it_8',k))/2
            np.testing.assert_allclose(source,e[k],rtol=1e-10,atol=1e-20);drive['independentScalarChecks']+=1
            for suffix,end,offset in [('Near',-1,1),('',1,4)]:
                for pair in range(2):
                    dm=scalar(f'port_ut_{offset+pair}',k)/source;cm=(scalar(f'cm_{end}_{pair}_0',k)+scalar(f'cm_{end}_{pair}_1',k))/(2*source)
                    np.testing.assert_allclose([dm,cm],[values['Hdiff'+suffix][pair,k],values['Hcommon'+suffix][pair,k]],rtol=1e-10,atol=1e-13);drive['independentScalarChecks']+=2
            for bi,b in enumerate(c['input']['shieldBonds']):
                np.testing.assert_allclose(scalar(b['currentProbe'],k)/source,currents[bi,k],rtol=1e-10,atol=1e-13);drive['independentScalarChecks']+=1
    drive['cases'][name]={'analysis_sha256':SHA(dst/'analysis.json'),'windows':windows}
    for f in c['files']:assert SHA(dst/f['file'])==f['sha256']
    pins.append({'id':name,'analysis_sha256':SHA(dst/'analysis.json'),'response_sha256':SHA(dst/'response.json'),'evidenceHashesChecked':len(c['files'])})

byid={c['id']:c for c in cases};comparisons={};geometry=[]
for bond in ['floating','near']:
    base='test02-'+bond;fine=base+'-fine'
    if fine not in byid:continue
    x,y=byid[base],byid[fine]
    mx,my=[READ(a.out/n/'model.json') for n in [base,fine]]
    assert {k:v for k,v in mx.items() if k!='input'}=={k:v for k,v in my.items() if k!='input'}
    assert ET.tostring(ET.parse(a.out/base/'geometry.xml').getroot().find('Properties'))==ET.tostring(ET.parse(a.out/fine/'geometry.xml').getroot().find('Properties'))
    proof=a.runs/f'test02-preflight-{bond}-fine/mesh-comparison-preflight.json'
    shutil.copy2(proof,a.out/(fine+'-preflight.json'))
    geometry.append({'bond':bond,'allPhysicalPropertiesIdentical':True,'coarseGeometrySHA256':SHA(a.out/base/'geometry.xml'),'fineGeometrySHA256':SHA(a.out/fine/'geometry.xml'),'preflightSHA256':SHA(proof)})
    comparisons[bond]={basis:{ns:compare(x['windows'][ns] if basis=='loaded' else drive['cases'][base]['windows'][ns],y['windows'][ns] if basis=='loaded' else drive['cases'][fine]['windows'][ns],np.array(x['frequency_Hz'])) for ns in x['windows']} for basis in ['loaded','drive']}
manifest={'revision':'mesh-19','test':'02','expectedCases':names,'cases':cases,'updatedAtUTC':datetime.now(timezone.utc).isoformat(),'scientificVerdictComplete':False,'status':'all_case_data_checked_review_pending' if len(cases)==4 else 'partial_mesh_data_checked','comparisons':comparisons}
(a.out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8')
(a.out/'drive-reference.json').write_text(json.dumps(drive,ensure_ascii=False),encoding='utf-8')
for script in ['collect_cable_results.py','collect_common_mesh.py']:
    shutil.copy2(Path(__file__).parent/script,a.out/script)
review={'revision':'mesh-data-19','scientificVerdictComplete':False,'sources':pins,'geometry':geometry,'independentSourceReferencedChecks':drive['independentScalarChecks'],'meshComparisons':comparisons,'manifest_sha256':SHA(a.out/'manifest.json'),'drive_sha256':SHA(a.out/'drive-reference.json')}
(a.out/'mesh-data-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cases':len(cases),'independentLoadedOutputChecks':sum(c['numericalVerification']['independentScalarOutputs'] for c in cases),'independentInputChecks':sum(c['inputDiagnostics']['independentScalarOutputs'] for c in cases),'independentDriveChecks':drive['independentScalarChecks'],'evidenceHashes':sum(x['evidenceHashesChecked'] for x in pins)}))
for name in byid:
    print(name,json.dumps({basis:{key:abs(DEC(values,key)[:,90]).tolist() for key in KEYS} for basis,values in [('loaded',byid[name]['windows']['12']),('drive',drive['cases'][name]['windows']['12'])]}))
