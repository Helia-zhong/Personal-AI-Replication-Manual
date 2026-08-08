globalThis.VideoLabData = [
  {
    "id": "launch-teaser", "title": "Product Launch Teaser", "duration_sec": 72, "format": "teaser", "theme": "launch",
    "description": "一条产品发布预告，强调问题、演示和行动号召。",
    "highlights": [
      { "start": 0, "end": 8, "reason": "opening hook" },
      { "start": 18, "end": 34, "reason": "product demo" },
      { "start": 50, "end": 72, "reason": "call to action" }
    ],
    "scenes": [
      { "id": "lt-01", "start": 0, "end": 8, "label": "hook", "visual": "Presenter walks in front of a clean studio backdrop.", "transcript": "What if your team could answer every product question in seconds?", "ocr": "AI Assistant", "audio": "uplift intro sting", "objects": ["presenter", "screen", "logo"] },
      { "id": "lt-02", "start": 8, "end": 18, "label": "problem", "visual": "Dashboard shows scattered tools and slow support queues.", "transcript": "Most teams lose time switching between tools and hunting for the right answer.", "ocr": "slow queue", "audio": "voiceover", "objects": ["dashboard", "queue", "chat"] },
      { "id": "lt-03", "start": 18, "end": 34, "label": "demo", "visual": "The product opens a fast answer panel with citations and actions.", "transcript": "The assistant pulls a grounded answer, cites the source, and offers a next step.", "ocr": "source cited", "audio": "clicks and UI blips", "objects": ["assistant panel", "citation", "controls"] },
      { "id": "lt-04", "start": 34, "end": 50, "label": "proof", "visual": "Metric cards animate with higher resolution and lower handoff time.", "transcript": "Teams get faster first replies, better traceability, and fewer manual handoffs.", "ocr": "42% faster", "audio": "bass pulse", "objects": ["metric cards", "trend line", "team"] },
      { "id": "lt-05", "start": 50, "end": 72, "label": "cta", "visual": "End card invites viewers to book a demo and explore the workflow.", "transcript": "Book a demo and see the workflow in action.", "ocr": "Book a demo", "audio": "closing hit", "objects": ["cta card", "calendar", "brand mark"] }
    ]
  },
  {
    "id": "support-recap", "title": "Support Training Recap", "duration_sec": 96, "format": "recap", "theme": "training",
    "description": "客服培训回顾，适合观察字幕覆盖和信息密度。",
    "highlights": [
      { "start": 4, "end": 16, "reason": "agenda" },
      { "start": 28, "end": 44, "reason": "policy example" },
      { "start": 62, "end": 78, "reason": "escalation checklist" }
    ],
    "scenes": [
      { "id": "sr-01", "start": 0, "end": 12, "label": "intro", "visual": "Trainer opens with the agenda and session goals.", "transcript": "Today we will review escalation rules, privacy checks, and handoff etiquette.", "ocr": "Agenda", "audio": "spoken agenda", "objects": ["trainer", "slides"] },
      { "id": "sr-02", "start": 12, "end": 28, "label": "policy", "visual": "Checklist appears with policy examples and do-not-share warnings.", "transcript": "Use the policy checklist before answering any account or billing question.", "ocr": "Do not share secrets", "audio": "cursor clicks", "objects": ["checklist", "policy card", "cursor"] },
      { "id": "sr-03", "start": 28, "end": 44, "label": "example", "visual": "A sample chat illustrates the right refusal and a proper redirect.", "transcript": "If the request is sensitive, refuse briefly and guide the customer to the approved flow.", "ocr": "approved flow", "audio": "chat notification", "objects": ["chat window", "badge", "arrow"] },
      { "id": "sr-04", "start": 44, "end": 62, "label": "qa", "visual": "Participants ask questions while the trainer annotates the screen.", "transcript": "Questions should be answered with the policy page open beside the ticket.", "ocr": "ticket", "audio": "room ambience", "objects": ["annotation tool", "ticket", "policy page"] },
      { "id": "sr-05", "start": 62, "end": 82, "label": "checklist", "visual": "The final checklist appears with escalation tiers and contact points.", "transcript": "Use the escalation ladder when the customer is blocked, upset, or waiting too long.", "ocr": "tier 1 tier 2", "audio": "voiceover", "objects": ["checklist", "tier card", "contact list"] },
      { "id": "sr-06", "start": 82, "end": 96, "label": "wrap", "visual": "Closing slide asks viewers to review the policy handbook later.", "transcript": "Please review the handbook and keep the cheat sheet handy.", "ocr": "", "audio": "closing tone", "objects": ["handbook", "bookmark"] }
    ]
  },
  {
    "id": "webinar-cutdown", "title": "Webinar Cutdown", "duration_sec": 84, "format": "cutdown", "theme": "webinar",
    "description": "长视频剪成短片的练习，包含一个过长镜头和一个空字幕镜头。",
    "highlights": [
      { "start": 10, "end": 26, "reason": "feature reveal" },
      { "start": 36, "end": 58, "reason": "live demo" },
      { "start": 64, "end": 82, "reason": "closing takeaway" }
    ],
    "scenes": [
      { "id": "wc-01", "start": 0, "end": 10, "label": "setup", "visual": "Moderator introduces the webinar topic and speakers.", "transcript": "Welcome to the session and thanks for joining us today.", "ocr": "webinar", "audio": "intro music", "objects": ["moderator", "speaker card"] },
      { "id": "wc-02", "start": 10, "end": 26, "label": "reveal", "visual": "The host reveals the main feature with a sleek product slide.", "transcript": "The new workflow saves time by connecting answers, actions, and follow-up tasks.", "ocr": "new workflow", "audio": "slide transition", "objects": ["product slide", "feature badge", "task list"] },
      { "id": "wc-03", "start": 26, "end": 44, "label": "demo", "visual": "A live screen share shows the workflow in action.", "transcript": "Here is the live demo with search, rerank, and review steps in one flow.", "ocr": "search rerank review", "audio": "screen share audio", "objects": ["browser window", "steps", "cursor"] },
      { "id": "wc-04", "start": 44, "end": 58, "label": "example", "visual": "A long explanatory segment lingers on architecture details.", "transcript": "The architecture discussion continues with extra detail on implementation decisions and trade-offs.", "ocr": "architecture", "audio": "speaker voice", "objects": ["diagram", "speaker", "code block"] },
      { "id": "wc-05", "start": 58, "end": 72, "label": "takeaway", "visual": "The host summarizes the main lessons and next steps.", "transcript": "", "ocr": "takeaway", "audio": "closing voiceover", "objects": ["summary card", "check mark"] },
      { "id": "wc-06", "start": 72, "end": 84, "label": "cta", "visual": "A final call to action invites viewers to try the workflow.", "transcript": "Try the workflow and share your results with the team.", "ocr": "try it", "audio": "ending hit", "objects": ["cta card", "button"] }
    ]
  },
  {
    "id": "release-story", "title": "Release Story Clip", "duration_sec": 60, "format": "story", "theme": "release",
    "description": "发布故事短片，强调节奏和镜头均衡。",
    "highlights": [
      { "start": 6, "end": 18, "reason": "problem setup" },
      { "start": 22, "end": 36, "reason": "product turn" },
      { "start": 42, "end": 58, "reason": "closing payoff" }
    ],
    "scenes": [
      { "id": "rs-01", "start": 0, "end": 6, "label": "intro", "visual": "Fast opening montage shows the team preparing the release.", "transcript": "This release changes the way the team works.", "ocr": "release day", "audio": "beat intro", "objects": ["team", "release board"] },
      { "id": "rs-02", "start": 6, "end": 18, "label": "problem", "visual": "Old workflow pain points appear on screen with stacked cards.", "transcript": "The old process was slow, manual, and hard to trace.", "ocr": "slow manual trace", "audio": "voiceover", "objects": ["cards", "workflow", "timer"] },
      { "id": "rs-03", "start": 18, "end": 30, "label": "turn", "visual": "The new product screen replaces the old flow with one clean panel.", "transcript": "The new panel combines answers, actions, and evidence in one place.", "ocr": "one panel", "audio": "screen click", "objects": ["panel", "evidence", "actions"] },
      { "id": "rs-04", "start": 30, "end": 42, "label": "proof", "visual": "Metrics slide shows better response time and clearer review steps.", "transcript": "Metrics improve because the team can see what happened at a glance.", "ocr": "faster response", "audio": "music rise", "objects": ["chart", "metric card", "review step"] },
      { "id": "rs-05", "start": 42, "end": 60, "label": "closing", "visual": "Ending frame repeats the release message and the team's next milestone.", "transcript": "The release is live, and the next milestone is already in motion.", "ocr": "now live", "audio": "closing note", "objects": ["closing card", "milestone", "brand mark"] }
    ]
  }
];
