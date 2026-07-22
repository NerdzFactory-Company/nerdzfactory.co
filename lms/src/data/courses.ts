import type { Course } from '@/types'
import { IMAGES } from '@/content/images'

/**
 * Placeholder courses — replace with real content when provided.
 * Videos use public YouTube embeds for demo purposes.
 */
export const courses: Course[] = [
  {
    id: 'digital-basics',
    title: 'Digital Skills Basics',
    description:
      'Learn the foundations of using a smartphone and the internet safely. Perfect for first-time learners.',
    thumbnail: IMAGES.courses.digitalBasics,
    category: 'Getting Started',
    level: 'Beginner',
    lessons: [
      {
        id: 'db-1',
        title: 'Welcome to Your Learning Journey',
        description: 'An introduction to what you will learn and how to use this platform.',
        videoUrl: 'https://www.youtube.com/watch?v=09CeBwGbCeg',
        duration: '4:30',
        order: 1,
      },
      {
        id: 'db-2',
        title: 'Understanding Your Smartphone',
        description: 'Learn the main parts of your phone and what each button does.',
        videoUrl: 'https://www.youtube.com/watch?v=x0Yx3qXhL5s',
        duration: '6:15',
        order: 2,
      },
      {
        id: 'db-3',
        title: 'Connecting to the Internet',
        description: 'How to turn on mobile data or Wi-Fi and browse safely.',
        videoUrl: 'https://www.youtube.com/watch?v=WR0C7iO6UI8',
        duration: '5:40',
        order: 3,
      },
      {
        id: 'db-4',
        title: 'Staying Safe Online',
        description: 'Simple tips to protect yourself from scams and keep your information private.',
        videoUrl: 'https://www.youtube.com/watch?v=HxySrTjqcZE',
        duration: '7:20',
        order: 4,
      },
    ],
  },
  {
    id: 'communication',
    title: 'Communication & Messaging',
    description:
      'Master WhatsApp, email basics, and professional communication for work and daily life.',
    thumbnail: IMAGES.courses.communication,
    category: 'Communication',
    level: 'Beginner',
    lessons: [
      {
        id: 'cm-1',
        title: 'Introduction to Messaging Apps',
        description: 'Overview of popular messaging apps and when to use each one.',
        videoUrl: 'https://www.youtube.com/watch?v=YQHsXMglC9A',
        duration: '3:50',
        order: 1,
      },
      {
        id: 'cm-2',
        title: 'Using WhatsApp Effectively',
        description: 'Send messages, voice notes, photos, and make voice calls.',
        videoUrl: 'https://www.youtube.com/watch?v=1uQu0VfNins',
        duration: '8:10',
        order: 2,
      },
      {
        id: 'cm-3',
        title: 'Writing Clear Messages',
        description: 'Tips for writing messages that are easy to understand.',
        videoUrl: 'https://www.youtube.com/watch?v=R1vskiVDwl4',
        duration: '5:25',
        order: 3,
      },
    ],
  },
  {
    id: 'work-readiness',
    title: 'Work Readiness',
    description:
      'Build confidence for the workplace — punctuality, teamwork, and basic computer skills.',
    thumbnail: IMAGES.courses.workReadiness,
    category: 'Career',
    level: 'Beginner',
    lessons: [
      {
        id: 'wr-1',
        title: 'What Employers Look For',
        description: 'Key qualities that help you succeed at work.',
        videoUrl: 'https://www.youtube.com/watch?v=zxJM0yI9B8Y',
        duration: '6:00',
        order: 1,
      },
      {
        id: 'wr-2',
        title: 'Time Management Basics',
        description: 'How to be on time and manage your daily tasks.',
        videoUrl: 'https://www.youtube.com/watch?v=iONDebHX9qk',
        duration: '5:15',
        order: 2,
      },
      {
        id: 'wr-3',
        title: 'Working in a Team',
        description: 'How to collaborate and communicate with colleagues.',
        videoUrl: 'https://www.youtube.com/watch?v=hHIikHJV9fI',
        duration: '7:45',
        order: 3,
      },
      {
        id: 'wr-4',
        title: 'Introduction to Computers',
        description: 'Mouse, keyboard, and opening programs on a computer.',
        videoUrl: 'https://www.youtube.com/watch?v=5mgooiBzdAM',
        duration: '9:30',
        order: 4,
      },
      {
        id: 'wr-5',
        title: 'Your Next Steps',
        description: 'Celebrate your progress and plan what to learn next.',
        videoUrl: 'https://www.youtube.com/watch?v=9No-FiEInLA',
        duration: '4:00',
        order: 5,
      },
    ],
  },
]

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id)
}

export function sortedLessons(course: Course) {
  return [...course.lessons].sort((a, b) => a.order - b.order)
}
