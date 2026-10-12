import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Discussion from './Discussion';
import { SimDatasetSwitch } from '@/components/SimDatasetSwitch';
import { useSimDataset } from '@/hooks/useSimDataset';

/** /sim with a dataset switch; each dataset remounts its own discussion instance. */
export default function SimPage() {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('dataset');
  const [dataset, setDataset] = useSimDataset(fromUrl === 'august' || fromUrl === 'social' ? fromUrl : null);
  useEffect(() => {
    if (params.get('dataset') !== dataset) setParams((p) => { p.set('dataset', dataset); return p; }, { replace: true });
  }, [dataset, params, setParams]);
  return (
    <>
      <Discussion key={dataset} mode="sim" simDataset={dataset} />
      <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[42] flex justify-center px-4">
        <SimDatasetSwitch value={dataset} onChange={setDataset} className="pointer-events-auto" />
      </div>
    </>
  );
}
