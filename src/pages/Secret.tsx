import { useSearchParams } from 'react-router-dom';
import Discussion from './Discussion';

/**
 * Open experiment: same discussion as /go, but all chats are rendered as short
 * directional arrows (length = chat length, color = points). No password and no
 * time lock — anyone with the link can look around.
 * `?topic=test` previews the arrows on the playground question.
 */
export default function Secret() {
  const [params] = useSearchParams();
  const mode = params.get('topic') === 'test' ? 'test' : 'real';

  return <Discussion mode={mode} variant="arrows" />;
}
