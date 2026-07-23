import {
  findRelatedPriority,
  findSchedulePriorityConflicts,
  isProtectableCalendarBlock,
  isTightPriority,
  significantTokens,
} from './briefing.conflicts';

describe('briefing.conflicts', () => {
  const afternoon = new Date('2026-07-23T15:00:00');
  const afternoonEnd = new Date('2026-07-23T16:30:00');
  const now = new Date('2026-07-23T10:00:00');

  it('treats gym as a protectable block', () => {
    expect(
      isProtectableCalendarBlock({
        id: '1',
        title: 'Gym session',
        startsAt: afternoon,
        endsAt: afternoonEnd,
      }),
    ).toBe(true);
  });

  it('flags high-priority deadlines as tight', () => {
    expect(
      isTightPriority({
        id: 'p1',
        title: 'Submit grant proposal',
        reason: 'Due today',
        priority: 'high',
        urgencyLabel: 'Deadline',
        relevance: 0.8,
      }),
    ).toBe(true);
  });

  it('suggests rescheduling gym when a tight priority exists', () => {
    const conflicts = findSchedulePriorityConflicts(
      [
        {
          id: 'gym',
          title: 'Gym',
          startsAt: afternoon,
          endsAt: afternoonEnd,
        },
      ],
      [
        {
          id: 'work',
          title: 'Submit Q3 deck',
          reason: 'Deadline today',
          priority: 'high',
          urgencyLabel: 'Deadline',
          relevance: 0.85,
        },
      ],
      now,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].block.title).toBe('Gym');
    expect(conflicts[0].priority.id).toBe('work');
  });

  it('relates a Stripe payment alert to a Stripe priority', () => {
    const match = findRelatedPriority(
      {
        title: 'Stripe payment failed',
        snippet: 'Your Stripe charge for Acme Billing failed',
        fromAddress: 'support@stripe.com',
      },
      [
        {
          id: 'p1',
          title: 'Fix Stripe Acme checkout',
          reason: 'Customers cannot complete Stripe checkout',
          priority: 'high',
          urgencyLabel: 'Needs action',
          relevance: 0.8,
          platform: 'github',
        },
      ],
    );
    expect(match).not.toBeNull();
    expect(match!.overlapTokens.length).toBeGreaterThan(0);
  });

  it('does not relate a generic unrecognized device login to unrelated work', () => {
    const match = findRelatedPriority(
      {
        title: 'Unrecognized device login',
        snippet: 'New sign-in on Chrome',
        fromAddress: 'noreply@google.com',
      },
      [
        {
          id: 'p1',
          title: 'Submit Q3 deck',
          reason: 'Deadline today',
          priority: 'high',
          urgencyLabel: 'Deadline',
          relevance: 0.8,
        },
      ],
    );
    expect(match).toBeNull();
  });

  it('does not treat google domain as a priority link', () => {
    const match = findRelatedPriority(
      {
        title: 'Security alert',
        snippet: 'New device signed in to your Google Account',
        fromAddress: 'no-reply@accounts.google.com',
      },
      [
        {
          id: 'p1',
          title: 'Review Google Docs draft',
          reason: 'Shared with team',
          priority: 'medium',
          urgencyLabel: 'Follow up',
          relevance: 0.6,
          platform: 'gmail',
        },
      ],
    );
    expect(match).toBeNull();
  });

  it('filters stop words from tokens', () => {
    const tokens = significantTokens('The payment for Acme Billing failed');
    expect(tokens.has('the')).toBe(false);
    expect(tokens.has('payment')).toBe(true);
    expect(tokens.has('acme')).toBe(true);
  });
});
