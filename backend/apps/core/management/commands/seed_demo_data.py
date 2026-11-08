"""seed_demo_data — populate PAI with a realistic, demonstrative dataset.

Run with:  python manage.py seed_demo_data
Flags:     --reset   delete existing demo content first
           --no-users  skip demo user creation

All seeded content is clearly fictional. Demo reviews are flagged is_demo and
the login credentials printed at the end are for local exploration only.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User, UserRoles
from apps.analytics.models import PlatformSettings
from apps.courses.models import Category, Course, CourseSection, CourseStatus, Difficulty, Lesson
from apps.learning.models import Bookmark, Enrollment, LessonProgress
from apps.reviews.models import Review
from apps.reviews.services import recompute_course_rating

# Real Unsplash photography (licensed under the Unsplash License). Production
# deployments should mirror these assets to their own storage — see README.
U = "https://images.unsplash.com/{id}?auto=format&fit=crop&w={w}&q=80"

CATEGORIES = [
    {
        "name": "Programming & Technology",
        "icon": "Code2",
        "description": "Software engineering, web development, mobile and systems programming.",
        "image": "photo-1461749280684-dccba630e2f6",
    },
    {
        "name": "Business & Entrepreneurship",
        "icon": "Briefcase",
        "description": "Strategy, operations, finance and building companies.",
        "image": "photo-1552664730-d307ca884978",
    },
    {
        "name": "Design & Creative Skills",
        "icon": "Palette",
        "description": "UI/UX, graphic design, motion and creative direction.",
        "image": "photo-1561070791-2526d30994b5",
    },
    {
        "name": "Marketing",
        "icon": "Megaphone",
        "description": "Digital marketing, growth, SEO, content and social media.",
        "image": "photo-1460925895917-afdab827c52f",
    },
    {
        "name": "Data Science & AI",
        "icon": "BrainCircuit",
        "description": "Analytics, machine learning, deep learning and MLOps.",
        "image": "photo-1526374965328-7f61d4dc18c5",
    },
    {
        "name": "Personal Development",
        "icon": "Sparkles",
        "description": "Productivity, communication, leadership and career growth.",
        "image": "photo-1499750310107-5fef28a66643",
    },
]

INSTRUCTORS = [
    {
        "email": "amara.okafor@pai.demo",
        "first_name": "Amara",
        "last_name": "Okafor",
        "headline": "Senior Software Engineer & Educator",
        "bio": "Amara has spent a decade building web platforms and now teaches modern JavaScript and Python to thousands of students.",
        "avatar": "photo-1573497019940-1c28c88b4f3e",
    },
    {
        "email": "daniel.moreau@pai.demo",
        "first_name": "Daniel",
        "last_name": "Moreau",
        "headline": "Product & Growth Strategist",
        "bio": "Daniel has led product and growth teams at three venture-backed startups and mentors founders worldwide.",
        "avatar": "photo-1500648767791-00dcc994a43e",
    },
    {
        "email": "sofia.rossi@pai.demo",
        "first_name": "Sofia",
        "last_name": "Rossi",
        "headline": "Design Lead & UX Researcher",
        "bio": "Sofia designs digital products used by millions and teaches human-centred design and design systems.",
        "avatar": "photo-1494790108377-be9c29b29330",
    },
    {
        "email": "wei.zhang@pai.demo",
        "first_name": "Wei",
        "last_name": "Zhang",
        "headline": "Data Scientist & ML Engineer",
        "bio": "Wei builds production machine-learning systems and enjoys making statistics and deep learning approachable.",
        "avatar": "photo-1472099645785-5658abf4ff4e",
    },
    {
        "email": "grace.mitchell@pai.demo",
        "first_name": "Grace",
        "last_name": "Mitchell",
        "headline": "Marketing Director & Coach",
        "bio": "Grace has scaled content and paid-acquisition programmes for global consumer brands and loves teaching marketing fundamentals.",
        "avatar": "photo-1580489944761-15a19d654956",
    },
]

STUDENTS = [
    {"email": "student@pai.demo", "first_name": "Alex", "last_name": "Rivera", "headline": "Aspiring full-stack developer"},
    {"email": "priya.nair@pai.demo", "first_name": "Priya", "last_name": "Nair", "headline": "Marketing associate"},
    {"email": "tom.becker@pai.demo", "first_name": "Tom", "last_name": "Becker", "headline": "Data analyst"},
]

ADMIN = {"email": "admin@pai.demo", "first_name": "PAI", "last_name": "Admin", "headline": "Platform administrator"}

COURSES = [
    {
        "title": "Modern React: From Fundamentals to Production",
        "subtitle": "Build fast, accessible interfaces with React, TypeScript and TanStack Query.",
        "instructor": "amara.okafor@pai.demo",
        "category": "Programming & Technology",
        "difficulty": Difficulty.INTERMEDIATE,
        "price_cents": 7999,
        "thumb": "photo-1633356122544-f134324a6cee",
        "featured": True,
        "objectives": [
            "Build component-driven UIs with React and TypeScript",
            "Manage server state with TanStack Query",
            "Structure production-ready front-end projects",
            "Write accessible, testable components",
        ],
        "requirements": ["Comfortable with JavaScript ES6", "Basic HTML and CSS"],
        "sections": [
            ("Foundations", [
                ("Welcome to the course", "photo", "A tour of what you'll build and how the course is organised.", 6, True),
                ("Thinking in components", "video", "Composition, props and the mental model behind React.", 18, True),
                ("TypeScript for React developers", "video", "Typing props, state and hooks without fighting the compiler.", 24, False),
            ]),
            ("Data & State", [
                ("Server state with TanStack Query", "video", "Caching, invalidation and optimistic updates.", 27, False),
                ("Forms with React Hook Form and Zod", "video", "Validation that scales with your product.", 22, False),
                ("Quiz: data and state", "text", "Check your understanding of queries, mutations and cache keys.", 10, False),
            ]),
            ("Shipping", [
                ("Performance and code splitting", "video", "Keep first paint fast as the app grows.", 20, False),
                ("Testing your components", "video", "Testing Library patterns that catch real bugs.", 25, False),
                ("Deploying the front end", "video", "Build pipelines, environment variables and previews.", 15, False),
            ]),
        ],
        "reviews": [
            (5, "The clearest React course I have taken", "Amara explains the *why* behind each pattern. The TanStack Query section alone was worth it."),
            (5, "Practical and current", "No stale class components here — everything reflects how teams actually build today."),
            (4, "Great depth", "Would love even more on testing, but the production sections are excellent."),
        ],
    },
    {
        "title": "Python for Data Analysis",
        "subtitle": "Turn raw data into insight with pandas, NumPy and clear visualisations.",
        "instructor": "wei.zhang@pai.demo",
        "category": "Data Science & AI",
        "difficulty": Difficulty.BEGINNER,
        "price_cents": 5999,
        "thumb": "photo-1526374965328-7f61d4dc18c5",
        "featured": True,
        "objectives": [
            "Load, clean and reshape real datasets with pandas",
            "Summarise data with NumPy and descriptive statistics",
            "Create clear visualisations with Matplotlib",
            "Present findings that drive decisions",
        ],
        "requirements": ["Basic Python syntax", "No statistics background required"],
        "sections": [
            ("Getting started", [
                ("Why data analysis matters", "video", "Where analysis creates value in modern organisations.", 8, True),
                ("Your first dataset", "video", "Reading CSVs and inspecting a DataFrame.", 20, False),
            ]),
            ("Wrangling", [
                ("Cleaning messy data", "video", "Missing values, types and duplicates.", 26, False),
                ("Grouping and aggregating", "video", "Split-apply-combine in practice.", 24, False),
                ("Practice: retail sales", "text", "A guided exercise on a real-world style dataset.", 30, False),
            ]),
            ("Communicating", [
                ("Visualising distributions", "video", "Choosing the right chart for the question.", 22, False),
                ("Telling the story", "video", "Turning charts into recommendations.", 18, False),
            ]),
        ],
        "reviews": [
            (5, "Perfect starting point", "I had never used pandas before and now I use it daily at work."),
            (4, "Very clear", "The exercises cemented the concepts. Some solutions could be explained more."),
        ],
    },
    {
        "title": "UI/UX Design Foundations",
        "subtitle": "Design interfaces people love — research, wireframes, visual systems and handoff.",
        "instructor": "sofia.rossi@pai.demo",
        "category": "Design & Creative Skills",
        "difficulty": Difficulty.BEGINNER,
        "price_cents": 4999,
        "thumb": "photo-1561070791-2526d30994b5",
        "featured": True,
        "objectives": [
            "Run lightweight user research",
            "Sketch and wireframe efficiently",
            "Build a reusable visual design system",
            "Hand off designs developers can implement",
        ],
        "requirements": ["No prior design experience needed"],
        "sections": [
            ("Design thinking", [
                ("What makes a design good", "video", "The principles behind usable, delightful interfaces.", 12, True),
                ("Understanding your users", "video", "Interviews, jobs-to-be-done and personas.", 20, False),
            ]),
            ("From sketch to system", [
                ("Wireframing fast", "video", "Getting ideas out of your head cheaply.", 18, False),
                ("Colour, type and spacing", "video", "Building a coherent visual language.", 26, False),
                ("Components and states", "video", "Designing for empty, loading and error states.", 22, False),
            ]),
            ("Working with developers", [
                ("Specs and handoff", "video", "Documenting design decisions clearly.", 16, False),
                ("Usability testing", "video", "Finding problems before you ship.", 20, False),
            ]),
        ],
        "reviews": [
            (5, "Transformed how I work", "I moved into a product design role three months after finishing this course."),
        ],
    },
    {
        "title": "Digital Marketing Strategy",
        "subtitle": "Build a growth engine across content, search, social and paid channels.",
        "instructor": "grace.mitchell@pai.demo",
        "category": "Marketing",
        "difficulty": Difficulty.INTERMEDIATE,
        "price_cents": 6499,
        "thumb": "photo-1460925895917-afdab827c52f",
        "featured": False,
        "objectives": [
            "Define a positioning and messaging strategy",
            "Plan content and SEO that compounds",
            "Run paid campaigns that stay profitable",
            "Measure what actually matters",
        ],
        "requirements": ["Some experience with a business or side project helps"],
        "sections": [
            ("Strategy first", [
                ("The marketing funnel, revisited", "video", "Mapping channels to intent.", 15, True),
                ("Positioning and messaging", "video", "Why customers choose you.", 22, False),
            ]),
            ("Channels", [
                ("Content and SEO", "video", "Building durable organic demand.", 28, False),
                ("Paid acquisition", "video", "Budgets, targeting and creative testing.", 26, False),
                ("Social and community", "video", "Earning attention instead of buying it.", 20, False),
            ]),
            ("Measurement", [
                ("Analytics that matter", "video", "North-star metrics and attribution basics.", 24, False),
            ]),
        ],
        "reviews": [
            (4, "Very actionable", "I rebuilt our content plan and saw organic traffic double in a quarter."),
            (5, "Great frameworks", "Grace's funnel mapping exercise gave our whole team clarity."),
        ],
    },
    {
        "title": "Business Fundamentals for Founders",
        "subtitle": "Validate ideas, price products and understand the numbers behind a business.",
        "instructor": "daniel.moreau@pai.demo",
        "category": "Business & Entrepreneurship",
        "difficulty": Difficulty.BEGINNER,
        "price_cents": 0,
        "thumb": "photo-1552664730-d307ca884978",
        "featured": True,
        "objectives": [
            "Validate a business idea quickly and cheaply",
            "Understand unit economics",
            "Price your product with confidence",
            "Read a simple P&L",
        ],
        "requirements": ["An open mind and an idea worth testing"],
        "sections": [
            ("Finding the problem", [
                ("Ideas are cheap, problems are not", "video", "Talking to customers before you build.", 16, True),
                ("Rapid validation", "video", "Experiments you can run this week.", 20, False),
            ]),
            ("The numbers", [
                ("Unit economics explained", "video", "CAC, LTV and payback in plain language.", 24, False),
                ("Pricing", "video", "Value-based pricing without guesswork.", 18, False),
                ("Reading a P&L", "video", "The three numbers every founder should know.", 20, False),
            ]),
        ],
        "reviews": [
            (5, "Free and fantastic", "I finally understand the economics of my side project."),
        ],
    },
    {
        "title": "Applied Machine Learning",
        "subtitle": "Go from linear regression to deploying a real model in production.",
        "instructor": "wei.zhang@pai.demo",
        "category": "Data Science & AI",
        "difficulty": Difficulty.ADVANCED,
        "price_cents": 9999,
        "thumb": "photo-1555949963-aa79dcee981c",
        "featured": False,
        "objectives": [
            "Frame business problems as ML problems",
            "Build robust training pipelines with scikit-learn",
            "Evaluate models honestly",
            "Deploy and monitor a model in production",
        ],
        "requirements": ["Comfortable with Python", "Basic linear algebra and statistics"],
        "sections": [
            ("Foundations", [
                ("When to use machine learning", "video", "And, importantly, when not to.", 14, True),
                ("Feature engineering", "video", "The work that decides most outcomes.", 28, False),
            ]),
            ("Modelling", [
                ("Trees, forests and boosting", "video", "Practical model selection.", 30, False),
                ("Honest evaluation", "video", "Cross-validation and leakage.", 26, False),
            ]),
            ("In production", [
                ("Serving predictions", "video", "An API around your model.", 24, False),
                ("Monitoring and drift", "video", "Keeping models healthy over time.", 22, False),
            ]),
        ],
        "reviews": [
            (5, "Advanced and honest", "Wei doesn't skip the hard parts — leakage and monitoring sections are gold."),
            (4, "Challenging", "Not for beginners, but exactly what I needed."),
        ],
    },
    {
        "title": "Effective Communication at Work",
        "subtitle": "Write clearly, present confidently and give feedback that lands.",
        "instructor": "daniel.moreau@pai.demo",
        "category": "Personal Development",
        "difficulty": Difficulty.BEGINNER,
        "price_cents": 3499,
        "thumb": "photo-1517048676732-d65bc937f952",
        "featured": False,
        "objectives": [
            "Write concise, persuasive documents",
            "Present with structure and confidence",
            "Give and receive feedback well",
            "Run meetings that respect everyone's time",
        ],
        "requirements": ["None"],
        "sections": [
            ("Writing", [
                ("The pyramid principle", "video", "Lead with the answer.", 18, True),
                ("Editing ruthlessly", "video", "Cut the noise, keep the meaning.", 16, False),
            ]),
            ("Speaking", [
                ("Structuring a presentation", "video", "Openings, arcs and endings.", 20, False),
                ("Handling difficult conversations", "video", "Feedback without friction.", 22, False),
            ]),
        ],
        "reviews": [
            (5, "Quietly life-changing", "I use the pyramid principle in every email now."),
        ],
    },
    {
        "title": "DevOps Essentials with Docker",
        "subtitle": "Containerise, ship and operate applications with confidence.",
        "instructor": "amara.okafor@pai.demo",
        "category": "Programming & Technology",
        "difficulty": Difficulty.INTERMEDIATE,
        "price_cents": 6999,
        "thumb": "photo-1607799279861-4dd421887fb3",
        "featured": False,
        "objectives": [
            "Write production-quality Dockerfiles",
            "Compose multi-service applications",
            "Automate builds and deployments",
            "Understand logging, health checks and secrets",
        ],
        "requirements": ["Comfortable on the command line", "Some experience deploying an app"],
        "sections": [
            ("Containers", [
                ("Why containers", "video", "Images, layers and reproducibility.", 16, True),
                ("Writing a good Dockerfile", "video", "Caching, non-root users and small images.", 26, False),
            ]),
            ("Orchestration", [
                ("Compose for local development", "video", "Services, volumes and networks.", 24, False),
                ("Health checks and dependencies", "video", "Starting in the right order.", 18, False),
            ]),
            ("Production", [
                ("Secrets and configuration", "video", "Twelve-factor apps in practice.", 20, False),
                ("Observability", "video", "Logs, metrics and what to alert on.", 22, False),
            ]),
        ],
        "reviews": [
            (5, "Exactly what I needed", "My Dockerfiles are half the size and my deploys are boring now — in the best way."),
        ],
    },
    {
        # Deliberately left pending so the admin moderation queue is demonstrable.
        "title": "Advanced TypeScript Patterns",
        "subtitle": "Generics, conditional types and type-safe APIs at scale.",
        "instructor": "amara.okafor@pai.demo",
        "category": "Programming & Technology",
        "difficulty": Difficulty.ADVANCED,
        "price_cents": 7499,
        "thumb": "photo-1516116216624-53e697fedbea",
        "status": CourseStatus.PENDING,
        "featured": False,
        "objectives": [
            "Model complex domains with generics",
            "Use conditional and mapped types",
            "Design type-safe APIs",
        ],
        "requirements": ["Solid TypeScript experience"],
        "sections": [
            ("Types at scale", [
                ("Generics in depth", "video", "Constraints, defaults and inference.", 24, True),
                ("Conditional types", "video", "Distributive conditionals and infer.", 26, False),
            ]),
        ],
        "reviews": [],
    },
]

VIDEO_URLS = [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
]

DEMO_PASSWORD = "PaiDemo!2024"


class Command(BaseCommand):
    help = "Seed PAI with demonstration data (categories, instructors, courses, reviews)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing demo content first")
        parser.add_argument("--no-users", action="store_true", help="Do not create demo users")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self._reset()

        settings = PlatformSettings.load()
        settings.support_email = "support@pai.example.com"
        settings.save()
        self.stdout.write("Platform settings ensured.")

        categories = self._create_categories()
        instructors = {} if options["no_users"] else self._create_instructors()
        if not options["no_users"]:
            self._create_students_and_admin()

        courses = self._create_courses(categories, instructors)
        self._create_enrollments_and_progress()

        self.stdout.write(self.style.SUCCESS(f"\nSeeded {len(courses)} courses across {len(categories)} categories."))
        if not options["no_users"]:
            self.stdout.write(
                self.style.SUCCESS(
                    "\nDemo accounts (password: %s)\n"
                    "  Administrator : admin@pai.demo\n"
                    "  Instructor    : amara.okafor@pai.demo\n"
                    "  Student       : student@pai.demo\n"
                    "\nThese accounts and all seeded reviews are demonstration data — "
                    "do not use them in production.\n" % DEMO_PASSWORD
                )
            )

    # ------------------------------------------------------------------
    def _reset(self):
        self.stdout.write("Resetting demo content…")
        Course.objects.filter(owner__email__endswith="@pai.demo").delete()
        User.objects.filter(email__endswith="@pai.demo").delete()
        Category.objects.all().delete()
        self.stdout.write("  done.")

    def _create_categories(self):
        result = {}
        for index, spec in enumerate(CATEGORIES):
            category, _ = Category.objects.update_or_create(
                name=spec["name"],
                defaults={
                    "description": spec["description"],
                    "icon": spec["icon"],
                    "image_url": U.format(id=spec["image"], w=800),
                    "order": index,
                    "is_active": True,
                },
            )
            result[spec["name"]] = category
        self.stdout.write(f"Categories: {len(result)}")
        return result

    def _create_instructors(self):
        instructors = {}
        for spec in INSTRUCTORS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "first_name": spec["first_name"],
                    "last_name": spec["last_name"],
                    "role": UserRoles.INSTRUCTOR,
                    "is_approved": True,
                    "headline": spec["headline"],
                    "bio": spec["bio"],
                    "avatar_url": U.format(id=spec["avatar"], w=400),
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            instructors[spec["email"]] = {"user": user, "avatar": U.format(id=spec["avatar"], w=400)}
        self.stdout.write(f"Instructors: {len(instructors)}")
        return instructors

    def _create_students_and_admin(self):
        for spec in STUDENTS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "first_name": spec["first_name"],
                    "last_name": spec["last_name"],
                    "role": UserRoles.STUDENT,
                    "headline": spec["headline"],
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()

        admin, created = User.objects.get_or_create(
            email=ADMIN["email"],
            defaults={
                "first_name": ADMIN["first_name"],
                "last_name": ADMIN["last_name"],
                "role": UserRoles.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "headline": ADMIN["headline"],
            },
        )
        if created:
            admin.set_password(DEMO_PASSWORD)
            admin.save()

    def _create_courses(self, categories, instructors):
        created = []
        for spec in COURSES:
            instructor_data = instructors.get(spec["instructor"])
            if instructor_data is None:
                continue
            owner = instructor_data["user"]
            course, _ = Course.objects.update_or_create(
                title=spec["title"],
                defaults={
                    "owner": owner,
                    "category": categories[spec["category"]],
                    "subtitle": spec["subtitle"],
                    "description": (
                        f"{spec['subtitle']}\n\n"
                        "This course blends short, focused video lessons with hands-on practice so you can "
                        "apply what you learn immediately. Each section builds on the last, and you can "
                        "learn at your own pace with lifetime access to your materials."
                    ),
                    "learning_objectives": spec["objectives"],
                    "requirements": spec["requirements"],
                    "difficulty": spec["difficulty"],
                    "price_cents": spec["price_cents"],
                    "currency": "usd",
                    "thumbnail_url": U.format(id=spec["thumb"], w=1200),
                    "status": spec.get("status", CourseStatus.PUBLISHED),
                    "is_featured": spec.get("featured", False),
                    "published_at": timezone.now() if spec.get("status", CourseStatus.PUBLISHED) == CourseStatus.PUBLISHED else None,
                },
            )
            self._build_curriculum(course, spec["sections"])
            self._build_reviews(course, spec["reviews"])
            created.append(course)
        self.stdout.write(f"Courses: {len(created)}")
        return created

    def _build_curriculum(self, course, sections):
        # Rebuild curriculum deterministically.
        course.sections.all().delete()
        for s_index, (section_title, lessons) in enumerate(sections, start=1):
            section = CourseSection.objects.create(
                course=course,
                title=section_title,
                order=s_index,
                summary=f"{len(lessons)} lessons",
            )
            for l_index, (title, kind, description, minutes, preview) in enumerate(lessons, start=1):
                video_url = ""
                if kind == "video":
                    video_url = VIDEO_URLS[(s_index + l_index) % len(VIDEO_URLS)]
                Lesson.objects.create(
                    section=section,
                    title=title,
                    description=description,
                    content=f"{description}\n\nTake notes as you go and try the exercises before moving on.",
                    video_url=video_url,
                    duration_minutes=minutes,
                    order=l_index,
                    is_preview=preview,
                )
        course.recompute_aggregates()

    def _build_reviews(self, course, reviews):
        students = list(User.objects.filter(email__in=[s["email"] for s in STUDENTS]))
        if not students:
            return
        for index, (rating, title, body) in enumerate(reviews):
            student = students[index % len(students)]
            Review.objects.update_or_create(
                course=course,
                user=student,
                defaults={
                    "rating": rating,
                    "title": title,
                    "body": body,
                    "is_demo": True,
                    "moderation_status": "visible",
                },
            )
        recompute_course_rating(course)

    def _create_enrollments_and_progress(self):
        student = User.objects.filter(email="student@pai.demo").first()
        priya = User.objects.filter(email="priya.nair@pai.demo").first()
        if not student:
            return

        published = list(Course.objects.filter(status=CourseStatus.PUBLISHED))
        if not published:
            return

        # Student: two in-progress courses and one completed course.
        for course, completion in [(published[0], 0.55), (published[1], 0.2)]:
            enrollment, _ = Enrollment.objects.get_or_create(user=student, course=course)
            lessons = list(Lesson.objects.filter(section__course=course).order_by("section__order", "order"))
            done = int(len(lessons) * completion)
            for lesson in lessons[:done]:
                LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
            enrollment.recalculate_progress()

        # A completed course for the certificate demo.
        if len(published) > 3:
            course = published[3]
            enrollment, _ = Enrollment.objects.get_or_create(user=student, course=course)
            for lesson in Lesson.objects.filter(section__course=course):
                LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
            enrollment.recalculate_progress()

        if priya:
            course = published[0]
            enrollment, _ = Enrollment.objects.get_or_create(user=priya, course=course)
            for lesson in list(Lesson.objects.filter(section__course=course))[:3]:
                LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
            enrollment.recalculate_progress()
            Bookmark.objects.get_or_create(user=priya, course=published[-1])

        # Refresh denormalised counters.
        for course in published:
            course.enrollment_count = Enrollment.objects.filter(course=course).count()
            course.save(update_fields=["enrollment_count"])
        self.stdout.write("Enrollments, progress and bookmarks created.")
