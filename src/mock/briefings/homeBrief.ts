import type { HomeBrief } from '@/features/brief/types';

export const homeBrief: HomeBrief = {
  userName: 'Clark',
  successScore: 0.78,
  successLabel: 'On track',
  successInsight: 'Clear the Focus list before noon and the rest of the day opens up.',
  focus: [
    {
      id: 'f1',
      platform: 'github',
      title: 'Review and merge PR #182',
      reason: 'Blocks payment-flow deploy · Est. 12 min',
      estimatedTime: '12 min',
      priority: 'high',
      confidence: 0.96,
      actions: [
        { id: 'f1-ask', label: 'Ask Chief', tone: 'accent', execution: 'ask_chief' },
        {
          id: 'f1-open',
          label: 'Open PR',
          execution: 'handoff',
          handoff: {
            target: 'github',
            url: 'https://github.com',
            summary: 'Opens GitHub so you can review and merge PR #182.',
          },
        },
      ],
      urgencyLabel: 'Blocks deployment',
      aboutTitle: 'Blocking release',
      aboutBody:
        'PR #182 is the last gate on payment-flow deployment. Staging is green and three teammates already approved.',
      actionTitle: 'What to do',
      actionBody: 'Review the diff, merge when satisfied, and confirm deploy starts.',
      whyImportant:
        'PR #182 is the last gate on payment-flow deployment. Staging is green and three teammates already approved.',
      delayImpact: 'Review the diff, merge when satisfied, and confirm deploy starts.',
      aiRecommendation: 'Review and merge this PR now.',
    },
    {
      id: 'f2',
      platform: 'gmail',
      title: 'Reply to the investor email today',
      reason: 'Same-day reply keeps momentum · Est. 15 min',
      estimatedTime: '15 min',
      priority: 'high',
      confidence: 0.9,
      actions: [
        { id: 'f2-ask', label: 'Ask Chief', execution: 'ask_chief' },
        {
          id: 'f2-open',
          label: 'Reply',
          execution: 'handoff',
          handoff: {
            target: 'gmail',
            url: 'https://mail.google.com/mail/u/0/#inbox',
            summary: 'Opens Gmail so you can reply to the investor thread.',
          },
        },
      ],
      urgencyLabel: 'Same-day reply',
      aboutTitle: 'Investor thread',
      aboutBody:
        'The investor thread expects a clear answer today. Your draft already covers runway, hiring, and the next demo.',
      actionTitle: 'Send the reply',
      actionBody: 'Review the draft once, send it, and clear the open loop.',
      whyImportant:
        'The investor thread expects a clear answer today. Your draft already covers runway, hiring, and the next demo.',
      delayImpact: 'Review the draft once, send it, and clear the open loop.',
      aiRecommendation: 'Review the draft once, then send the reply.',
    },
    {
      id: 'f3',
      platform: 'calendar',
      title: 'Reschedule Sprint Planning',
      reason: 'Schedule conflict · Est. 5 min',
      estimatedTime: '5 min',
      priority: 'medium',
      confidence: 0.85,
      actions: [
        { id: 'f3-ask', label: 'Ask Chief', execution: 'ask_chief' },
        {
          id: 'f3-open',
          label: 'Prepare',
          execution: 'handoff',
          handoff: {
            target: 'calendar',
            url: 'https://calendar.google.com',
            summary: 'Opens Google Calendar so you can resolve the conflict.',
          },
        },
      ],
      urgencyLabel: 'Schedule conflict',
      aboutTitle: 'Calendar conflict',
      aboutBody:
        'Sprint Planning overlaps with customer demo prep. Leaving it unresolved creates a no-show or a weak demo.',
      actionTitle: 'Resolve the conflict',
      actionBody: 'Move Sprint Planning to an open slot and notify attendees.',
      whyImportant:
        'Sprint Planning overlaps with customer demo prep. Leaving it unresolved creates a no-show or a weak demo.',
      delayImpact: 'Move Sprint Planning to an open slot and notify attendees.',
      aiRecommendation: 'Move Sprint Planning to 3:30 PM today.',
    },
    {
      id: 'f4',
      platform: 'slack',
      title: 'Decide empty-state direction',
      reason: 'Waiting on your decision · Est. 8 min',
      estimatedTime: '8 min',
      priority: 'medium',
      confidence: 0.88,
      actions: [
        { id: 'f4-ask', label: 'Ask Chief', execution: 'ask_chief' },
        { id: 'f4-decide', label: 'Decide', tone: 'accent' },
      ],
      urgencyLabel: 'Blocks engineering',
      aboutTitle: 'Design decision needed',
      aboutBody:
        'Maya and engineering are blocked on illustration-led vs copy-first empty states.',
      actionTitle: 'Make the call',
      actionBody: 'Pick a direction and reply in #design so polish can finish tonight.',
      whyImportant:
        'Maya and engineering are blocked on illustration-led vs copy-first empty states.',
      delayImpact: 'Pick a direction and reply in #design so polish can finish tonight.',
      aiRecommendation: 'Pick copy-first empty states and reply in #design.',
    },
  ],
  briefing: [
    {
      id: 's1',
      platform: 'github',
      section: 'Projects',
      title: 'Merge PR #182 so payment-flow deployment can ship today',
      summary:
        '• Three teammates already approved\n• Staging is green — merge is the remaining blocker\n• Customer demo depends on this release',
      timestamp: '12m ago',
    },
    {
      id: 's2',
      platform: 'github',
      section: 'Projects',
      title: 'Check the CI flake on main before it hides a real auth regression',
      summary:
        '• Nightly auth tests failed once, then passed on retry\n• Confirm whether this needs a pin or quarantine',
      timestamp: '40m ago',
    },
    {
      id: 's3',
      platform: 'slack',
      section: 'Needs Attention',
      title: 'Approve the campaign copy so marketing can publish on schedule',
      summary:
        '• Sarah is blocked in #marketing until you sign off\n• A quick yes/no with edits unblocks launch',
      timestamp: '25m ago',
    },
    {
      id: 's4',
      platform: 'slack',
      section: 'Needs Attention',
      title: 'Decide empty-state direction so engineering can finish the polish pass',
      summary:
        '• Maya needs illustration-led vs copy-first\n• Your call unblocks tonight’s staging cut',
      timestamp: '50m ago',
    },
    {
      id: 's5',
      platform: 'calendar',
      section: 'Meetings',
      title: 'Prepare for the 1:00 PM design review with clear asks',
      summary:
        '• Four attendees are on the invite\n• Skim latest frames\n• List two decisions you need from the room',
      timestamp: '30m ago',
    },
    {
      id: 's6',
      platform: 'notion',
      section: 'Projects',
      title: 'Review the two new Launch tasks assigned to you on the Q3 Roadmap',
      summary:
        '• Confirm owners and due dates\n• Decide whether either belongs on today’s Top Priorities',
      timestamp: '45m ago',
    },
  ],
};


