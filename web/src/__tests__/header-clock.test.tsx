import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import i18n from '../i18n';

let currentVirtualTime = new Date('2026-04-07T00:00:00');

vi.mock('../lib/runtime', () => ({
  getRuntime: () => ({
    getVirtualTime: () => currentVirtualTime,
  }),
}));

vi.mock('../components/LiveFeed', () => ({
  LiveFeed: () => <div>live-feed</div>,
}));

import { Header } from '../components/Header';

describe('Header clock', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    currentVirtualTime = new Date('2026-04-07T00:00:00');
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('updates demo virtual time without waiting a full second', async () => {
    const { container } = render(
      <Header
        date="2026-04-07"
        onDateChange={() => {}}
        availableDates={['2026-04-07']}
        frameCount={120}
        onDashboardClick={() => {}}
        onChatClick={() => {}}
        onDataClick={() => {}}
        theme="dark"
        onThemeToggle={() => {}}
      />,
    );

    const clock = container.querySelector('.header-clock');
    expect(clock).not.toBeNull();

    const initialText = clock!.textContent;
    currentVirtualTime = new Date('2026-04-07T00:00:20');
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(clock!.textContent).not.toBe(initialText);
  });
});
