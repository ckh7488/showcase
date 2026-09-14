"""Record the completed, bounded TEST02 time/grid screening judgment."""
from pathlib import Path
import json
import numpy as np
from collect_cable_results import READ,SHA,DEC,KEYS

r=Path('reports/porta-test-02/records/mesh-20');m=READ(r/'manifest.json');d=READ(r/'drive-reference.json');review=READ(r/'mesh-data-review.json')
assert len(m['cases'])==4 and review['manifest_sha256']==SHA(r/'manifest.json') and review['drive_sha256']==SHA(r/'drive-reference.json')
byid={c['id']:c for c in m['cases']}
for source in review['sources']:
    folder=r/source['id'];assert SHA(folder/'analysis.json')==source['analysis_sha256']
    for f in READ(folder/'analysis.json')['files']:assert SHA(folder/f['file'])==f['sha256']
time=Path('reports/porta-test-02/records/time-18');t=READ(time/'time-verdict.json');tr=READ(time/'time-review.json')
assert t['timeScreeningAccepted'] is True and t['snapshot_sha256']==SHA(time/'time-review.json')
for f in tr['files']:assert SHA(time/tr['evidenceFolder']/f['file'])==f['sha256']
rows=[];directions=[];meshChanges=[]
for level,suffix in [('coarse',''),('fine','-fine')]:
    for ns in ['8','10','12']:
        for basis in ['loaded','drive']:
            def values(name):
                case='test02-'+name+suffix
                return byid[case]['windows'][ns] if basis=='loaded' else d['cases'][case]['windows'][ns]
            floating,near=values('floating'),values('near')
            ratios={k:(abs(DEC(near,k)[:,90])/abs(DEC(floating,k)[:,90])).tolist() for k in KEYS}
            assert all(v>1 for k in ['HdiffNear','Hdiff'] for v in ratios[k])
            assert all(v<1 for k in ['HcommonNear','Hcommon'] for v in ratios[k])
            directions.append({'grid':level,'window_ns':int(ns),'reference':basis,'nearOverFloatingAt100MHz':ratios})
for c in m['cases']:
    for ns in ['8','10','12']:
        v=d['cases'][c['id']]['windows'][ns]
        rows.append({'id':c['id'],'window_ns':int(ns),'reference':'drive','at100MHz':{k:abs(DEC(v,k)[:,90]).tolist() for k in KEYS},
                     'differentialBandPeak_mVperV':max(float(abs(DEC(v,k)).max()) for k in ['HdiffNear','Hdiff'])*1000})
for bond in ['floating','near']:
    coarse=d['cases']['test02-'+bond]['windows'];fine=d['cases']['test02-'+bond+'-fine']['windows']
    delta={k:max(float(abs(abs(DEC(fine[ns],k))-abs(DEC(coarse[ns],k))).max()) for ns in coarse) for k in KEYS}
    meshChanges.append({'bond':bond,'reference':'drive','allWindows_ns':[8,10,12],'maxAbsoluteMagnitudeChange_VperV':delta})
normal=Path('reports/porta-test-02/records/common-14');n=READ(normal/'manifest.json')
for c in n['cases']:
    for f in c['files']:assert SHA(normal/c['id']/f['file'])==f['sha256']
out={'revision':'common-screening-final-20','test':'02','scientificVerdictComplete':True,
     'status':'bounded_time_and_transverse_mesh_screening_complete','timeScreeningAccepted':True,'transverseMeshScreeningAccepted':True,
     'scope':'120mm assumed coupon and fanouts, both Ethernet pairs at both ends. Adopt the100MHz large CM decrease/DM increase for near versus floating and approximate source-referenced output scales.',
     'finding':'The100MHz direction holds in both transverse meshes, all8/10/12ns records, four observations and both input references. The near-only25ns extension preserves that large direction. Stop numerical refinement for this adopted screening scope.',
     'physicsInterpretation':'The two nominally equal50ohm sources drive the power bundles relative to the finite reference plate. Loaded input has residual differential voltage. This is the response of the entire assumed fixture, not isolated pure-CM-to-DM conversion.',
     'acceptedVariations':{'mesh':meshChanges,'time':t['acceptedTimeVariation'],'energyIsPassCriterion':False,'universalPercentTolerance':None},
     'notAdopted':['Small near/both shield advantage; no matched fine or long both-bond comparison.','Exact resonance peaks or precise full-band output ranking.','Axial-grid convergence, shield braid losses or real contact impedance.','Actual20m cable, magnetics/PHY transfer, CRC or real failure cause.'],
     'sourcePins':{'meshManifestSHA256':SHA(r/'manifest.json'),'meshDriveSHA256':SHA(r/'drive-reference.json'),'meshDataReviewSHA256':SHA(r/'mesh-data-review.json'),'normalManifestSHA256':SHA(normal/'manifest.json'),'timeVerdictSHA256':SHA(time/'time-verdict.json')},
     'verification':{'caseEvidenceHashes':sum(s['evidenceHashesChecked'] for s in review['sources']),'loadedOutputScalarChecks':288,'inputScalarChecks':108,'driveScalarChecks':d['independentScalarChecks'],'timeScalarChecks':tr['independentScalarChecks'],'qualitative100MHzChecks':len(directions)*8},
     'sameGridBondComparisons':directions,'sourceReferencedValues':rows}
(r/'screening-verdict.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'complete':out['scientificVerdictComplete'],'directionChecks':out['verification']['qualitative100MHzChecks'],'meshChanges':meshChanges}))
