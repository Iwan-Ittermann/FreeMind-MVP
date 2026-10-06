import { createContext, useContext } from 'react';

export const WediumPresentationContext = createContext(false);
export const useWediumPresentation = () => useContext(WediumPresentationContext);