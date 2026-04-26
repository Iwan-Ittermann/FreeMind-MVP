import type { Step } from 'react-joyride';

export const FREEMIND_ONBOARDING_COMPLETED_KEY = 'freemind-onboarding-completed';

export type TTOnboardingStepId = 'welcome' | 'graph' | 'create' | 'chat' | 'ratings';

export interface TTOnboardingStep extends Step {
  data: {
    id: TTOnboardingStepId;
    pulseSelectors?: string[];
    prepare?: 'select-opinion' | 'open-chat';
  };
}

export const ttOnboardingSteps: TTOnboardingStep[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Willkommen bei Freemind',
    content: 'Hey, hier kannst du produktiv diskutieren.',
    data: { id: 'welcome' },
  },
  {
    target: '[data-onboarding="tt-graph"]',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Meinungskreis',
    content: 'Das sind die Meinungen.',
    spotlightPadding: 18,
    data: {
      id: 'graph',
      pulseSelectors: ['[data-onboarding="tt-graph"]'],
    },
  },
  {
    target: '[data-onboarding="opinion-cta"]',
    placement: 'top',
    disableBeacon: true,
    title: 'Eigene Meinung',
    content: 'Hier kannst du deine eigene Meinung posten.',
    spotlightPadding: 12,
    data: {
      id: 'create',
      pulseSelectors: ['[data-onboarding="opinion-cta"]', '[data-onboarding="post-button"]'],
    },
  },
  {
    target: '[data-onboarding="selected-opinion-panel"], [data-onboarding="chat-tab"]',
    placement: 'left',
    disableBeacon: true,
    title: 'Dialog starten',
    content: 'Dann kannst du mit anderen chatten.',
    spotlightPadding: 12,
    data: {
      id: 'chat',
      prepare: 'select-opinion',
      pulseSelectors: ['[data-onboarding="selected-opinion-panel"]', '[data-onboarding="lets-chat-button"]', '[data-onboarding="chat-tab"]'],
    },
  },
  {
    target: '[data-onboarding="disagreement-rating"], [data-onboarding="chat-productivity-rating"]',
    placement: 'top',
    disableBeacon: true,
    title: 'Bewerten und einordnen',
    content: 'Du kannst anderen Meinungen zustimmen oder widersprechen.\nUnd die Produktivität deiner Chats bewerten.\nDadurch entsteht die Verteilung im Kreis.',
    spotlightPadding: 12,
    locale: { last: "Let's go!" },
    data: {
      id: 'ratings',
      prepare: 'open-chat',
      pulseSelectors: ['[data-onboarding="disagreement-rating"]', '[data-onboarding="chat-productivity-rating"]'],
    },
  },
];
