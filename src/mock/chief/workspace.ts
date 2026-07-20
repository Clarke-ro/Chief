import type { ChiefWorkspace, ConversationTurn } from '@/features/chief/types';

const morningTurns: ConversationTurn[] = [
  {
    id: 'u1',
    role: 'user',
    content: 'Why is PR #182 important?',
  },
  {
    id: 'c1',
    role: 'chief',
    content:
      "It blocks today's deployment and three teammates are waiting for approval. It also sits on the critical path for the customer demo at 2 PM — clear this and the afternoon opens up.",
    actionsLead: 'Next steps',
    actions: [
      { id: 'a1', label: 'Open GitHub' },
      { id: 'a2', label: 'Notify Team' },
      { id: 'a3', label: 'Draft Update' },
    ],
    context: ['github', 'calendar', 'slack', 'notion'],
  },
];

export const chiefWorkspace: ChiefWorkspace = {
  activeSessionId: 'session-morning',
  sessions: [
    {
      id: 'session-morning',
      title: 'Morning brief',
      updatedAt: 'Just now',
      preview: 'Why is PR #182 important?',
      turns: morningTurns,
    },
    {
      id: 'session-pr182',
      title: 'PR #182 blockers',
      updatedAt: 'Yesterday',
      preview: 'Who is waiting on the review?',
      turns: [
        {
          id: 'pr-u1',
          role: 'user',
          content: 'Who is waiting on the PR #182 review?',
        },
        {
          id: 'pr-c1',
          role: 'chief',
          content:
            'Maya, Jordan, and Sam are blocked. Maya owns the release checklist, Jordan needs the API change for the demo path, and Sam is holding the staging deploy.',
          actionsLead: 'What would you like to do next?',
          actions: [
            { id: 'pr-a1', label: 'Open GitHub' },
            { id: 'pr-a2', label: 'Ping reviewers' },
            { id: 'pr-a3', label: 'Draft status' },
          ],
          context: ['github', 'slack'],
        },
      ],
    },
    {
      id: 'session-investor',
      title: 'Investor prep',
      updatedAt: 'Yesterday',
      preview: 'What should I lead with?',
      turns: [
        {
          id: 'inv-u1',
          role: 'user',
          content: 'What should I lead with in the investor meeting?',
        },
        {
          id: 'inv-c1',
          role: 'chief',
          content:
            'Lead with traction this week: deployment cadence, the customer demo at 2 PM, and the marketing approval that unlocks launch messaging. Keep PR #182 as a risk you are actively clearing.',
          actionsLead: 'What would you like to do next?',
          actions: [
            { id: 'inv-a1', label: 'Open deck' },
            { id: 'inv-a3', label: 'Draft talking points' },
          ],
          context: ['calendar', 'notion', 'slack'],
        },
      ],
    },
    {
      id: 'session-slack',
      title: 'Slack triage',
      updatedAt: '2 days ago',
      preview: 'What actually needs me?',
      turns: [
        {
          id: 'sl-u1',
          role: 'user',
          content: 'Summarize Slack — only what needs me today.',
        },
        {
          id: 'sl-c1',
          role: 'chief',
          content:
            'Three threads need you: marketing approval on the launch copy, Jordan asking for a deploy window, and a customer question from success that can wait until after the investor call.',
          context: ['slack', 'calendar'],
        },
      ],
    },
    {
      id: 'session-afternoon',
      title: 'Free up afternoon',
      updatedAt: 'Mon',
      preview: 'What can I move?',
      turns: [
        {
          id: 'af-u1',
          role: 'user',
          content: 'What can I move to free up my afternoon?',
        },
        {
          id: 'af-c1',
          role: 'chief',
          content:
            'The 3:30 sync can move to tomorrow without risk. The design review is optional if you send notes async. Protect the investor meeting and a 90-minute focus block for PR #182.',
          actionsLead: 'Next steps',
          actions: [
            { id: 'af-a1', label: 'Reschedule sync' },
            { id: 'af-a2', label: 'Send async notes' },
          ],
          context: ['calendar', 'slack', 'notion'],
        },
      ],
    },
  ],
};

