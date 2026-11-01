import clsx from 'clsx'
import {
  BarChart3,
  BookOpen,
  Check,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers,
  PenLine,
  PlayCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Container } from '../components/layout/Container'
import { ButtonLink } from '../components/ui/ButtonLink'

type Accent = 'purple' | 'sky' | 'teal' | 'orange' | 'green' | 'pink'

type HeroSticker = {
  name: string
  icon: LucideIcon
  accent: Accent
  rotation: string
}

type Feature = {
  icon: LucideIcon
  accent: Accent
  title: string
  description: string
}

type Role = Feature & {
  points: readonly string[]
}

type SectionIntroProps = {
  badge: string
  title: string
  titleId: string
  description: string
}

const ACCENT_TILE_CLASSES: Record<Accent, string> = {
  purple: 'bg-accent-purple',
  sky: 'bg-accent-sky',
  teal: 'bg-accent-teal',
  orange: 'bg-accent-orange',
  green: 'bg-accent-green',
  pink: 'bg-accent-pink',
}

const HERO_STICKERS_LEFT: readonly HeroSticker[] = [
  { name: 'book', icon: BookOpen, accent: 'purple', rotation: 'rotate-6' },
  { name: 'quiz', icon: ClipboardCheck, accent: 'pink', rotation: '-rotate-3' },
  { name: 'video', icon: PlayCircle, accent: 'sky', rotation: 'rotate-2' },
]

const HERO_STICKERS_RIGHT: readonly HeroSticker[] = [
  { name: 'file', icon: FileText, accent: 'teal', rotation: '-rotate-6' },
  { name: 'progress', icon: BarChart3, accent: 'green', rotation: 'rotate-3' },
  { name: 'people', icon: Users, accent: 'orange', rotation: '-rotate-2' },
]

const FEATURES: readonly Feature[] = [
  {
    icon: BookOpen,
    accent: 'purple',
    title: 'Course catalog',
    description:
      'Publish a course, make it discoverable, and let students enroll in a click.',
  },
  {
    icon: Layers,
    accent: 'sky',
    title: 'Ordered lessons',
    description:
      'Arrange lessons and mix text, images, files, video, and quizzes in one flow.',
  },
  {
    icon: FileText,
    accent: 'teal',
    title: 'Materials that open',
    description:
      'Preview PDFs, images, DOCX, and plain text securely; download the rest.',
  },
  {
    icon: ClipboardCheck,
    accent: 'orange',
    title: 'Quizzes that keep up',
    description:
      'Autosave every answer, resume after a break, and grade objective questions on the server.',
  },
  {
    icon: BarChart3,
    accent: 'green',
    title: 'Progress at a glance',
    description:
      'Completion updates as lessons are finished, so nobody has to ask.',
  },
  {
    icon: ShieldCheck,
    accent: 'pink',
    title: 'Roles by default',
    description:
      'Students, instructors, and admins see only what their role allows.',
  },
]

const ROLES: readonly Role[] = [
  {
    icon: GraduationCap,
    accent: 'sky',
    title: 'Students',
    description:
      'Browse the published catalog, enroll, and work through lessons at your own pace.',
    points: [
      'Pick up quizzes with autosaved answers',
      'See completion as lessons are finished',
      'Read, watch, and download materials in one place',
    ],
  },
  {
    icon: PenLine,
    accent: 'purple',
    title: 'Instructors',
    description: 'Build a course once and keep every piece in order.',
    points: [
      'Order lessons and blocks without a spreadsheet',
      'Write five question types, graded on the server',
      'Upload documents, images, and short video',
    ],
  },
  {
    icon: ShieldCheck,
    accent: 'pink',
    title: 'Admins',
    description: 'Keep people, roles, and content under control.',
    points: [
      'Change roles with an audit trail',
      'Review and remove content safely',
      'Manage users without touching the database',
    ],
  },
]

function HeroStickerTile({ icon: Icon, accent, rotation }: HeroSticker) {
  return (
    <span
      className={clsx(
        'flex size-12 items-center justify-center rounded-lg text-ink shadow-soft',
        ACCENT_TILE_CLASSES[accent],
        rotation,
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
    </span>
  )
}

function SectionIntro({ badge, title, titleId, description }: SectionIntroProps) {
  return (
    <div className="max-w-2xl">
      <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
        {badge}
      </span>
      <h2 id={titleId} className="mt-md text-heading-2 sm:text-heading-1">
        {title}
      </h2>
      <p className="mt-sm text-body-md text-ink-muted">{description}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, accent, title, description }: Feature) {
  return (
    <li className="rounded-lg border border-hairline bg-surface p-lg">
      <span
        className={clsx(
          'flex size-12 items-center justify-center rounded-lg text-ink',
          ACCENT_TILE_CLASSES[accent],
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-md text-title text-ink">{title}</h3>
      <p className="mt-xs text-body-sm text-ink-muted">{description}</p>
    </li>
  )
}

function RoleCard({ icon: Icon, accent, title, description, points }: Role) {
  return (
    <li className="rounded-lg border border-hairline bg-surface p-lg">
      <span
        className={clsx(
          'flex size-12 items-center justify-center rounded-lg text-ink',
          ACCENT_TILE_CLASSES[accent],
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-md text-title text-ink">{title}</h3>
      <p className="mt-xs text-body-sm text-ink-muted">{description}</p>
      <ul className="mt-md flex flex-col gap-xs">
        {points.map((point) => (
          <li key={point} className="flex gap-xs text-body-sm text-ink-muted">
            <Check
              className="mt-xxs size-4 shrink-0 text-accent-teal"
              aria-hidden="true"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </li>
  )
}

export default function HomePage() {
  return (
    <>
      <section
        aria-labelledby="hero-heading"
        className="bg-secondary text-on-primary"
      >
        <Container className="flex items-center justify-center gap-lg py-section md:py-section-lg">
          <div
            aria-hidden="true"
            className="hidden flex-1 flex-col items-start gap-md lg:flex"
          >
            {HERO_STICKERS_LEFT.map((sticker) => (
              <HeroStickerTile key={sticker.name} {...sticker} />
            ))}
          </div>

          <div className="w-full max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
              A calmer learning management system
            </span>
            <h1
              id="hero-heading"
              className="mt-md text-heading-1 md:text-display-2 lg:text-display-1"
            >
              Everything your course needs, in one calm place.
            </h1>
            <p className="mx-auto mt-md max-w-2xl text-body-md text-on-primary/85">
              Eduvia brings lessons, materials, quizzes, and progress together —
              for students, instructors, and admins.
            </p>
            <div className="mt-xl flex flex-col items-center justify-center gap-sm sm:flex-row">
              <ButtonLink
                href="#features"
                variant="primary"
                className="focus-visible:outline-on-primary"
              >
                Explore features
              </ButtonLink>
              <ButtonLink
                href="#roles"
                variant="secondary"
                className="focus-visible:outline-on-primary"
              >
                See who it's for
              </ButtonLink>
            </div>
            <p className="mt-lg text-caption text-on-primary/75">
              Documents, images, and short video — previewed securely.
            </p>
            <div
              aria-hidden="true"
              className="mt-lg flex justify-center gap-sm lg:hidden"
            >
              {HERO_STICKERS_LEFT.map((sticker) => (
                <HeroStickerTile key={sticker.name} {...sticker} />
              ))}
            </div>
          </div>

          <div
            aria-hidden="true"
            className="hidden flex-1 flex-col items-end gap-md lg:flex"
          >
            {HERO_STICKERS_RIGHT.map((sticker) => (
              <HeroStickerTile key={sticker.name} {...sticker} />
            ))}
          </div>
        </Container>
      </section>

      <section
        id="features"
        aria-labelledby="features-heading"
        className="scroll-mt-section-lg"
      >
        <Container className="py-section md:py-section-lg">
          <SectionIntro
            badge="Features"
            title="Everything a course needs."
            titleId="features-heading"
            description="From the first lesson to the final grade, every piece stays in one quiet workspace."
          />
          <ul className="mt-xxl grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </ul>
        </Container>
      </section>

      <section
        id="roles"
        aria-labelledby="roles-heading"
        className="scroll-mt-section-lg"
      >
        <Container className="py-section md:py-section-lg">
          <SectionIntro
            badge="For every role"
            title="One workspace, three points of view."
            titleId="roles-heading"
            description="Everyone gets the tools and the view their role requires — no extra dashboards, no guesswork."
          />
          <ul className="mt-xxl grid gap-lg lg:grid-cols-3">
            {ROLES.map((role) => (
              <RoleCard key={role.title} {...role} />
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
