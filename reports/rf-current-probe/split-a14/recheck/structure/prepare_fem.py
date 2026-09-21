from pathlib import Path
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
s=(R/'reviews/functionality_20260918/lid_fem.py').read_text()
s=s.replace('R=Path(__file__).resolve().parents[2]','R=Path(__file__).resolve().parents[3]')
s=s.replace("O=Path(__file__).resolve().parent/('fem' if rev=='A09' else 'fem_'+rev)","O=Path(__file__).resolve().parent/'fem_bonded'")
s=s.replace("src=R/('mechanical/assembly_'+rev+'_DRAFT/parts/UpperLid_FREE_DRAFT.step')","src=Path(__file__).resolve().parent/'upper_A14_IDEAL_BONDED.step'")
s=s.replace('SIMULATED_LINEAR_STATIC_ISOTROPIC','SIMULATED_A14_IDEAL_BONDED_UPPER_LINEAR_STATIC')
s=s.replace("limits=['No creep","limits=['NEW A14 geometry, all touching lap faces ideally bonded. No bolt preload, friction, slip or clearance model.','No creep")
s=s.replace('Actual A09 free-lid','Actual A14 IDEAL-BONDED upper-lid')
(O/'lid_bonded_fem.py').write_text(s)
