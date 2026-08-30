import { createContext, useContext } from 'react';

/**
 * True while the whole topic is read-only (e.g. the finished August archive).
 * Components use it to hide every write control (composer, ratings, chat start).
 */
const ReadOnlyContext = createContext(false);

export function ReadOnlyProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <ReadOnlyContext.Provider value={value}>{children}</ReadOnlyContext.Provider>;
}

export function useReadOnlyTopic() {
  return useContext(ReadOnlyContext);
}
