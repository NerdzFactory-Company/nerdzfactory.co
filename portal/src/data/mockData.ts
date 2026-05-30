/**
 * Seed data for the portal. Every page reads this through DataContext
 * — never import this file directly from a page/component.
 *
 * Replace with Supabase queries in DataContext when the backend is wired.
 */

import type {
  Announcement,
  DocumentItem,
  EventItem,
  LeaveRequest,
  OnboardingChecklistItem,
  OnboardingProgress,
  OnboardingVideo,
  RecognitionPost,
  Task,
  User,
  WeeklyCheckIn,
  WorkspaceNote,
  WorkspaceTeam,
} from '@/types'
import { startOfWeek, addDays, format } from 'date-fns'

const isoToday = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
const lastWeekStart = startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }).toISOString()

/* --------------------------------- Users --------------------------------- */

export const seedUsers: User[] = [
  {
    id: 'u_admin',
    email: 'admin@nerdzfactory.co',
    password: 'admin123',
    name: 'Emmanuel Okpiaifo',
    role: 'admin',
    department: 'Engineering',
    jobTitle: 'Founder & Lead Engineer',
    joinedAt: '2022-01-15T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Emmanuel+Okpiaifo&size=128&background=3e8cff&color=ffffff&bold=true',
    bio: 'Building useful things at the intersection of tech, development and society.',
    skills: ['React', 'Node.js', 'Product', 'Strategy'],
    phone: '+234 916 463 8956',
    workLocation: 'Lagos · Hybrid',
    pronouns: 'he/him',
    linkedinUrl: 'https://www.linkedin.com/company/nerdzfactory',
    active: true,
  },
  {
    id: 'u_hr',
    email: 'hr@nerdzfactory.co',
    password: 'hr123',
    name: 'Adaeze Nwosu',
    role: 'hr',
    department: 'People & Culture',
    jobTitle: 'People & Culture Lead',
    joinedAt: '2023-03-10T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Adaeze+Nwosu&size=128&background=6366f1&color=ffffff&bold=true',
    bio: 'People-first. Clear policies, fair process, and a warm welcome for every new joiner.',
    skills: ['People Ops', 'Onboarding', 'Policy', 'Coaching'],
    phone: '+234 800 000 0001',
    workLocation: 'Lagos · On-site',
    pronouns: 'she/her',
    reportsToId: 'u_admin',
    active: true,
  },
  {
    id: 'u_lead',
    email: 'lead@nerdzfactory.co',
    password: 'lead123',
    name: 'Tunde Bello',
    role: 'team_lead',
    department: 'Engineering',
    jobTitle: 'Engineering Team Lead',
    joinedAt: '2023-06-01T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Tunde+Bello&size=128&background=0ea5e9&color=ffffff&bold=true',
    bio: 'Coaching engineers, clearing blockers, and keeping delivery predictable.',
    skills: ['React', 'System design', 'Mentorship', 'Delivery'],
    phone: '+234 800 000 0002',
    workLocation: 'Lagos · Hybrid',
    pronouns: 'he/him',
    reportsToId: 'u_admin',
    active: true,
  },
  {
    id: 'u_staff',
    email: 'staff@nerdzfactory.co',
    password: 'staff123',
    name: 'Chioma Eze',
    role: 'staff',
    department: 'Engineering',
    jobTitle: 'Frontend Developer',
    joinedAt: isoToday(-14),
    avatarUrl:
      'https://ui-avatars.com/api/?name=Chioma+Eze&size=128&background=8b5cf6&color=ffffff&bold=true',
    bio: 'Shipping accessible UI for client and internal products — learning fast and documenting as I go.',
    skills: ['React', 'TypeScript', 'CSS', 'Tailwind', 'Accessibility'],
    phone: '+234 800 000 0003',
    workLocation: 'Lagos · Hybrid',
    pronouns: 'she/her',
    linkedinUrl: 'https://www.linkedin.com/in/example-chioma-eze',
    reportsToId: 'u_lead',
    active: true,
  },
  {
    id: 'u_staff2',
    email: 'kola@nerdzfactory.co',
    password: 'kola123',
    name: 'Kola Adeyemi',
    role: 'staff',
    department: 'Design',
    jobTitle: 'Product Designer',
    joinedAt: '2024-08-20T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Kola+Adeyemi&size=128&background=f59e0b&color=ffffff&bold=true',
    bio: 'Design systems, research, and prototypes — partnering with engineering from discovery to QA.',
    skills: ['Figma', 'Design systems', 'Prototyping', 'UX writing'],
    phone: '+234 800 000 0004',
    workLocation: 'Remote · Nigeria',
    pronouns: 'he/him',
    reportsToId: 'u_lead',
    active: true,
  },
  {
    id: 'u_staff3',
    email: 'fatima@nerdzfactory.co',
    password: 'fatima123',
    name: 'Fatima Yusuf',
    role: 'staff',
    department: 'Operations',
    jobTitle: 'Operations Associate',
    joinedAt: '2024-05-12T00:00:00.000Z',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Fatima+Yusuf&size=128&background=10b981&color=ffffff&bold=true',
    bio: 'Vendor coordination, reporting, and making sure the studio runs smoothly behind the scenes.',
    skills: ['Logistics', 'Vendor management', 'Reporting', 'Notion'],
    phone: '+234 800 000 0005',
    workLocation: 'Lagos · On-site',
    pronouns: 'she/her',
    reportsToId: 'u_hr',
    active: true,
  },
]

/* --------------------------------- Tasks --------------------------------- */

export const seedTasks: Task[] = [
  {
    id: 't_1',
    ownerId: 'u_staff',
    title: 'Fix mobile nav overlap on home page',
    description: 'On screens < 480px the menu drawer overlaps the topbar.',
    status: 'in_progress',
    priority: 'high',
    category: 'react',
    dueDate: isoToday(0),
    hoursLogged: 2,
    estimatedHours: 4,
    activity: [
      { at: isoToday(-2), by: 'u_staff', message: 'Created task' },
      { at: isoToday(-1), by: 'u_staff', message: 'Status \u2192 In Progress' },
    ],
    createdAt: isoToday(-2),
    updatedAt: isoToday(-1),
  },
  {
    id: 't_2',
    ownerId: 'u_staff',
    title: 'Migrate blog from WordPress to MDX',
    status: 'todo',
    priority: 'medium',
    category: 'wordpress',
    dueDate: isoToday(5),
    hoursLogged: 0,
    estimatedHours: 16,
    activity: [{ at: isoToday(-1), by: 'u_staff', message: 'Created task' }],
    createdAt: isoToday(-1),
    updatedAt: isoToday(-1),
  },
  {
    id: 't_3',
    ownerId: 'u_staff',
    title: 'Lighthouse audit on services page',
    description: 'Get LCP under 2.5s.',
    status: 'done',
    priority: 'medium',
    category: 'performance',
    dueDate: isoToday(-3),
    hoursLogged: 3,
    estimatedHours: 3,
    activity: [
      { at: isoToday(-5), by: 'u_staff', message: 'Created task' },
      { at: isoToday(-3), by: 'u_staff', message: 'Status \u2192 Done' },
    ],
    createdAt: isoToday(-5),
    updatedAt: isoToday(-3),
  },
  {
    id: 't_4',
    ownerId: 'u_staff',
    title: 'Awaiting client copy for portfolio page',
    status: 'blocked',
    priority: 'low',
    category: 'freelance',
    dueDate: isoToday(2),
    hoursLogged: 1,
    estimatedHours: 6,
    blockers: 'Client has not sent the case-study text yet.',
    activity: [{ at: isoToday(-2), by: 'u_staff', message: 'Created task' }],
    createdAt: isoToday(-2),
    updatedAt: isoToday(-1),
  },
  {
    id: 't_5',
    ownerId: 'u_lead',
    assigneeId: 'u_staff',
    title: 'Code review: team workspace foundations',
    status: 'in_progress',
    priority: 'high',
    category: 'react',
    dueDate: isoToday(0),
    hoursLogged: 1,
    estimatedHours: 2,
    activity: [{ at: isoToday(-1), by: 'u_lead', message: 'Created task' }],
    createdAt: isoToday(-1),
    updatedAt: isoToday(0),
  },
  {
    id: 't_6',
    ownerId: 'u_staff2',
    title: 'Design dashboard empty states',
    status: 'todo',
    priority: 'medium',
    category: 'other',
    dueDate: isoToday(3),
    hoursLogged: 0,
    estimatedHours: 4,
    activity: [{ at: isoToday(-1), by: 'u_staff2', message: 'Created task' }],
    createdAt: isoToday(-1),
    updatedAt: isoToday(-1),
  },
]

export const seedTeams: WorkspaceTeam[] = [
  {
    id: 'team_eng',
    name: 'Engineering squad',
    description: 'Product & web engineering',
    memberIds: ['u_admin', 'u_lead', 'u_staff'],
  },
  {
    id: 'team_design',
    name: 'Design studio',
    description: 'Product design & research',
    memberIds: ['u_admin', 'u_staff2'],
  },
  {
    id: 'team_ops',
    name: 'People & Operations',
    description: 'HR, ops, and studio admin',
    memberIds: ['u_hr', 'u_staff3', 'u_admin'],
  },
]

export const seedWorkspaceNotes: WorkspaceNote[] = [
  {
    id: 'n_seed_1',
    title: 'Sprint planning scratchpad',
    body: '',
    blocks: [
      {
        id: 'b_sp_1',
        type: 'heading2',
        text: 'This sprint',
      },
      { id: 'b_sp_2', type: 'bullet', text: 'Demo realtime notes' },
      { id: 'b_sp_3', type: 'bullet', text: 'Presence on directory' },
      { id: 'b_sp_4', type: 'todo', text: 'Review pending code reviews', checked: false },
    ],
    parentId: null,
    iconEmoji: '📝',
    ownerId: 'u_lead',
    createdAt: isoToday(-3),
    updatedAt: isoToday(-1),
    updatedById: 'u_lead',
    version: Date.now() - 86400000,
    share: { scope: 'teams', teamIds: ['team_eng'] },
  },
  {
    id: 'n_seed_2',
    title: 'Client call — ACME',
    body: '',
    blocks: [
      { id: 'b_ac_1', type: 'callout', text: 'Questions to ask' },
      { id: 'b_ac_2', type: 'numbered', text: 'Timeline for phase 2' },
      { id: 'b_ac_3', type: 'numbered', text: 'Brand assets handoff' },
      { id: 'b_ac_4', type: 'paragraph', text: 'Owner: Chioma · Design to join for UI section.' },
    ],
    parentId: null,
    iconEmoji: '☎️',
    ownerId: 'u_staff',
    createdAt: isoToday(-5),
    updatedAt: isoToday(-2),
    updatedById: 'u_staff',
    version: Date.now() - 172800000,
    share: { scope: 'people', peopleUserIds: ['u_lead', 'u_staff2'] },
  },
]

/* --------------------------- Weekly check-ins ---------------------------- */

export const seedCheckIns: WeeklyCheckIn[] = [
  {
    id: 'ci_1',
    userId: 'u_lead',
    weekStart: lastWeekStart,
    completed: 'Shipped the careers page redesign. Reviewed four peer design reviews.',
    nextWeek: 'Kick off the employee portal rollout and mentor Chioma on her first client project.',
    blockers: 'None',
    hoursWorked: 38,
    submittedAt: addDays(new Date(), -3).toISOString(),
  },
  {
    id: 'ci_2',
    userId: 'u_staff2',
    weekStart: lastWeekStart,
    completed: 'Wireframes for the portal dashboard and tasks board.',
    nextWeek: 'Hi-fi mocks and component spec for the portal.',
    hoursWorked: 36,
    submittedAt: addDays(new Date(), -3).toISOString(),
  },
  {
    id: 'ci_3',
    userId: 'u_staff2',
    weekStart,
    completed: 'Hi-fi mocks for dashboard, tasks board and weekly check-in screens.',
    nextWeek: 'Polish empty states, hand off to engineering.',
    blockers: 'Waiting on copy for the recognition wall tags.',
    hoursWorked: 22,
    submittedAt: addDays(new Date(), -1).toISOString(),
  },
  {
    id: 'ci_4',
    userId: 'u_staff3',
    weekStart,
    completed: 'Renewed Lagos office insurance. Booked Q3 team retreat venue.',
    nextWeek: 'Vendor contracts for the new equipment, finalise expense report.',
    hoursWorked: 36,
    submittedAt: addDays(new Date(), -1).toISOString(),
  },
]

/* ----------------------------- Announcements ----------------------------- */

export const seedAnnouncements: Announcement[] = [
  {
    id: 'a_1',
    title: 'Welcome to the NerdzFactory Portal',
    body: 'This is our new internal hub. Tasks, check-ins, leave requests, onboarding videos \u2014 everything in one place. Explore around and send feedback to Emmanuel.',
    audience: 'all',
    priority: 'info',
    postedById: 'u_admin',
    postedAt: isoToday(-1),
    readBy: [],
    media: [
      {
        kind: 'image',
        url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop',
      },
    ],
  },
  {
    id: 'a_2',
    title: 'Friday check-ins now mandatory',
    body: 'Please submit your weekly check-in every Friday by 5pm. Your team lead will see the digest first thing Monday morning.',
    audience: 'all',
    priority: 'important',
    postedById: 'u_hr',
    postedAt: isoToday(-2),
    readBy: [],
  },
  {
    id: 'a_3',
    title: 'Office closed Monday for Workers Day',
    body: 'Reminder that the office is closed on May 1st. Remote work is optional \u2014 take the day off if you can.',
    audience: 'all',
    priority: 'urgent',
    postedById: 'u_admin',
    postedAt: isoToday(-4),
    readBy: ['u_lead'],
  },
]

/* ----------------------------- Leave requests ---------------------------- */

export const seedLeave: LeaveRequest[] = [
  {
    id: 'l_1',
    userId: 'u_staff',
    type: 'annual',
    startDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 18), 'yyyy-MM-dd'),
    reason: 'Family trip to Calabar.',
    status: 'pending',
    submittedAt: isoToday(-1),
  },
  {
    id: 'l_2',
    userId: 'u_staff2',
    type: 'sick',
    startDate: format(addDays(new Date(), -3), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), -2), 'yyyy-MM-dd'),
    reason: 'Flu.',
    status: 'approved',
    submittedAt: isoToday(-3),
    reviewedById: 'u_hr',
    reviewerNote: 'Get well soon!',
  },
]

/* ------------------------------ Onboarding ------------------------------- */

export const seedOnboardingVideos: OnboardingVideo[] = [
  {
    id: 'v_1',
    title: 'Welcome to NerdzFactory',
    section: 'Welcome & Culture',
    description: 'A short hello from Emmanuel and an intro to who we are.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '4:20',
    order: 1,
  },
  {
    id: 'v_2',
    title: 'Our values & how we work',
    section: 'Welcome & Culture',
    description: 'The principles that guide every decision we make.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '6:15',
    order: 2,
  },
  {
    id: 'v_3',
    title: 'Setting up your laptop & tools',
    section: 'Tools & Processes',
    description: 'Slack, Notion, GitHub access and 1Password.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '8:42',
    order: 3,
  },
  {
    id: 'v_4',
    title: 'How we run weekly check-ins',
    section: 'Tools & Processes',
    description: 'The accountability ritual that keeps us aligned.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '5:10',
    order: 4,
  },
  {
    id: 'v_5',
    title: 'Your first 30 days',
    section: 'Your Role',
    description: 'What we expect, what you can expect from us.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '7:33',
    order: 5,
  },
  {
    id: 'v_6',
    title: 'Code of conduct',
    section: 'Policies',
    description: 'How we treat each other and our clients.',
    youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '3:50',
    order: 6,
  },
]

export const seedOnboardingChecklist: OnboardingChecklistItem[] = [
  { id: 'ck_1', label: 'Complete your profile in the directory', order: 1 },
  { id: 'ck_2', label: 'Read the staff handbook', link: '#', order: 2 },
  { id: 'ck_3', label: 'Schedule a 1-on-1 with your team lead', order: 3 },
  { id: 'ck_4', label: 'Set up your work tools (Slack, Notion, GitHub)', order: 4 },
  { id: 'ck_5', label: 'Submit your first weekly check-in', order: 5 },
]

export const seedOnboardingProgress: OnboardingProgress[] = [
  { userId: 'u_staff', watchedVideoIds: ['v_1', 'v_2', 'v_3'], completedChecklistIds: ['ck_1', 'ck_4'] },
]

/* ------------------------------ Documents ------------------------------- */

export const seedDocuments: DocumentItem[] = [
  {
    id: 'd_1',
    title: 'Staff Handbook 2025',
    description: 'The full staff handbook \u2014 read on day one.',
    category: 'policies',
    fileName: 'staff-handbook-2025.pdf',
    fileSize: '1.2 MB',
    uploadedById: 'u_hr',
    uploadedAt: '2025-01-15T00:00:00.000Z',
  },
  {
    id: 'd_2',
    title: 'Brand colours & logo pack',
    category: 'brand',
    fileName: 'nerdzfactory-brand.zip',
    fileSize: '8.4 MB',
    uploadedById: 'u_admin',
    uploadedAt: '2024-11-02T00:00:00.000Z',
  },
  {
    id: 'd_3',
    title: 'Project kickoff template',
    category: 'templates',
    fileName: 'project-kickoff.docx',
    fileSize: '120 KB',
    uploadedById: 'u_lead',
    uploadedAt: '2025-02-10T00:00:00.000Z',
  },
  {
    id: 'd_4',
    title: 'Q4 Performance Review (Management only)',
    category: 'reports',
    fileName: 'q4-perf.pdf',
    fileSize: '420 KB',
    uploadedById: 'u_hr',
    uploadedAt: '2025-01-20T00:00:00.000Z',
    managementOnly: true,
  },
]

/* ----------------------------- Recognition ------------------------------ */

export const seedRecognition: RecognitionPost[] = [
  {
    id: 'r_1',
    giverId: 'u_lead',
    receiverId: 'u_staff',
    message: 'Shipped the careers redesign with zero regressions. Excellent attention to detail!',
    tag: 'great_work',
    createdAt: isoToday(-2),
    reactedBy: ['u_admin', 'u_hr', 'u_staff2'],
  },
  {
    id: 'r_2',
    giverId: 'u_admin',
    receiverId: 'u_staff2',
    message: 'The new dashboard mocks are clean. Thanks for jumping on this so quickly.',
    tag: 'above_beyond',
    createdAt: isoToday(-4),
    reactedBy: ['u_lead'],
  },
]

/* -------------------------------- Events -------------------------------- */

export const seedEvents: EventItem[] = [
  {
    id: 'e_1',
    title: 'All-hands stand-up',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:30',
    endTime: '10:00',
    location: 'Zoom',
    audience: 'all',
  },
  {
    id: 'e_2',
    title: 'Engineering retro',
    date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    startTime: '15:00',
    endTime: '16:00',
    location: 'Conference room',
    audience: 'Engineering',
  },
  {
    id: 'e_3',
    title: 'Lunch & learn: Web performance',
    date: format(addDays(new Date(), 4), 'yyyy-MM-dd'),
    startTime: '13:00',
    endTime: '14:00',
    location: 'Lounge',
    audience: 'all',
  },
]

export { weekStart, lastWeekStart }
