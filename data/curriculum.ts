import type { BookCategory } from "@/lib/book-categories";

export type CurriculumFocusId =
  | "consumer-psychology"
  | "offers-pricing"
  | "attention"
  | "creative-advertising"
  | "humour"
  | "social-distribution"
  | "experimentation"
  | "strategy-scaling";

export type CurriculumBook = {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  focusId: CurriculumFocusId | "leadership";
  role: "capability" | "leader";
  purpose: string;
};

export type CurriculumFocus = {
  id: CurriculumFocusId;
  label: string;
  diagnosis: string;
  outcome: string;
  capabilityBookIds: string[];
  leaderBookId: string;
  synthesisPrompt: string;
};

export const curriculumBooks: CurriculumBook[] = [
  { id: "consumer-behavior", title: "Consumer Behavior: Buying, Having, and Being", author: "Michael R. Solomon & Cristel Antonia Russell", category: "psychology", focusId: "consumer-psychology", role: "capability", purpose: "Build a systematic model of perception, motivation, identity, social influence, learning, memory, and buying decisions." },
  { id: "cambridge-consumer-psychology", title: "The Cambridge Handbook of Consumer Psychology", author: "Cait Lamberton, Derek D. Rucker & Stephen A. Spiller (eds.)", category: "psychology", focusId: "consumer-psychology", role: "capability", purpose: "Use as the deeper reference layer when a behavioural claim needs stronger theory, boundary conditions, or research context." },
  { id: "decoded", title: "Decoded: The Science Behind Why We Buy", author: "Phil Barden", category: "marketing", focusId: "consumer-psychology", role: "capability", purpose: "Bridge behavioural science and practical marketing decisions without reducing buying behaviour to slogans." },
  { id: "choice-factory", title: "The Choice Factory", author: "Richard Shotton", category: "marketing", focusId: "consumer-psychology", role: "capability", purpose: "Study behavioural effects as testable mechanisms rather than a list of persuasion tricks." },
  { id: "demand-side-sales", title: "Demand-Side Sales 101", author: "Bob Moesta & Greg Engle", category: "business", focusId: "consumer-psychology", role: "capability", purpose: "Understand the forces that make a buyer switch, delay, hesitate, or act now." },
  { id: "competing-against-luck", title: "Competing Against Luck", author: "Clayton M. Christensen, Taddy Hall, Karen Dillon & David S. Duncan", category: "business", focusId: "consumer-psychology", role: "capability", purpose: "Learn to model the job a customer is trying to make progress on rather than relying on demographic avatars." },

  { id: "strategy-tactics-pricing", title: "The Strategy and Tactics of Pricing", author: "Thomas T. Nagle, Georg Müller & Evert Gruyaert", category: "business", focusId: "offers-pricing", role: "capability", purpose: "Understand economic value, perceived value, willingness to pay, price sensitivity, reference prices, and value communication." },
  { id: "monetizing-innovation", title: "Monetizing Innovation", author: "Madhavan Ramanujam & Georg Tacke", category: "business", focusId: "offers-pricing", role: "capability", purpose: "Start with willingness to pay and monetisation rather than building first and pricing afterwards." },
  { id: "alchemy", title: "Alchemy", author: "Rory Sutherland", category: "marketing", focusId: "offers-pricing", role: "capability", purpose: "Study how framing, context, signalling, and psychological value alter the experienced value of an offer." },

  { id: "attention-merchants", title: "The Attention Merchants", author: "Tim Wu", category: "marketing", focusId: "attention", role: "capability", purpose: "Understand attention as a scarce market that platforms, media, advertisers, and audiences continuously reprice." },
  { id: "made-to-stick", title: "Made to Stick", author: "Chip Heath & Dan Heath", category: "marketing", focusId: "attention", role: "capability", purpose: "Build ideas that survive exposure by becoming simple, concrete, unexpected, credible, emotional, and memorable." },

  { id: "hey-whipple", title: "Hey, Whipple, Squeeze This", author: "Luke Sullivan", category: "marketing", focusId: "creative-advertising", role: "capability", purpose: "Develop creative range, concept generation, and the ability to express one selling idea through many executions." },
  { id: "building-distinctive-assets", title: "Building Distinctive Brand Assets", author: "Jenni Romaniuk", category: "marketing", focusId: "creative-advertising", role: "capability", purpose: "Learn how recognisable brand assets improve retrieval, identification, and consistency across repeated exposures." },
  { id: "how-brands-grow", title: "How Brands Grow", author: "Byron Sharp", category: "marketing", focusId: "creative-advertising", role: "capability", purpose: "Challenge direct-response assumptions with empirical work on penetration, mental availability, and physical availability." },

  { id: "psychology-humor", title: "The Psychology of Humor", author: "Rod A. Martin & Thomas Ford", category: "psychology", focusId: "humour", role: "capability", purpose: "Build a serious model of humour, cognition, emotion, social function, and individual differences before trying to weaponise humour in ads." },
  { id: "inside-jokes", title: "Inside Jokes", author: "Matthew M. Hurley, Daniel C. Dennett & Reginald B. Adams Jr.", category: "psychology", focusId: "humour", role: "capability", purpose: "Study why minds detect and reward particular kinds of incongruity and cognitive error." },
  { id: "humor-seriously", title: "Humor, Seriously", author: "Jennifer Aaker & Naomi Bagdonas", category: "business", focusId: "humour", role: "capability", purpose: "Translate humour research into deliberate communication and business use." },

  { id: "contagious", title: "Contagious", author: "Jonah Berger", category: "marketing", focusId: "social-distribution", role: "capability", purpose: "Understand why people voluntarily transmit products, ideas, stories, and messages to other people." },
  { id: "hype-machine", title: "The Hype Machine", author: "Sinan Aral", category: "business", focusId: "social-distribution", role: "capability", purpose: "Study social-network mechanics, platform dynamics, peer effects, and information propagation rather than just post formats." },

  { id: "trustworthy-experiments", title: "Trustworthy Online Controlled Experiments", author: "Ron Kohavi, Diane Tang & Ya Xu", category: "business", focusId: "experimentation", role: "capability", purpose: "Learn to distinguish causal improvement from noise through trustworthy online experimentation." },

  { id: "good-strategy", title: "Good Strategy/Bad Strategy", author: "Richard Rumelt", category: "business", focusId: "strategy-scaling", role: "capability", purpose: "Diagnose the real challenge, identify leverage, and coordinate action around the constraint rather than confusing goals with strategy." },
  { id: "seven-powers", title: "7 Powers", author: "Hamilton Helmer", category: "business", focusId: "strategy-scaling", role: "capability", purpose: "Study the structural sources of durable competitive advantage once acquisition tactics alone are no longer enough." },

  { id: "leader-caesar", title: "Caesar: Life of a Colossus", author: "Adrian Goldsworthy", category: "great-leaders", focusId: "leadership", role: "leader", purpose: "Study ambition, coalition building, narrative, political adaptation, command, and the interaction between reputation and power." },
  { id: "leader-rockefeller", title: "Titan: The Life of John D. Rockefeller, Sr.", author: "Ron Chernow", category: "great-leaders", focusId: "leadership", role: "leader", purpose: "Study economics, bargaining power, standardisation, capital allocation, scale, reputation, and institution building." },
  { id: "leader-napoleon", title: "Napoleon: A Life", author: "Andrew Roberts", category: "great-leaders", focusId: "leadership", role: "leader", purpose: "Study tempo, attention, symbolism, information, concentration of force, administration, and decision-making under pressure." },
  { id: "leader-churchill", title: "Churchill: Walking with Destiny", author: "Andrew Roberts", category: "great-leaders", focusId: "leadership", role: "leader", purpose: "Study language, persuasion, morale, performance under pressure, narrative, and the use of memorable communication." },
  { id: "leader-lincoln", title: "Team of Rivals", author: "Doris Kearns Goodwin", category: "great-leaders", focusId: "leadership", role: "leader", purpose: "Study social intelligence, coalition management, communication, humour, rivalry, and persuasion across competing factions." },
  { id: "leader-alexander", title: "Alexander the Great", author: "Philip Freeman", category: "great-leaders", focusId: "leadership", role: "leader", purpose: "Study momentum, identity, symbolic leadership, adaptation across cultures, and the limits of continual expansion." },
  { id: "leader-frederick", title: "Frederick the Great: King of Prussia", author: "Tim Blanning", category: "great-leaders", focusId: "leadership", role: "leader", purpose: "Study disciplined adaptation, state capacity, learning under adverse conditions, and repeated decision-making with constrained resources." },
  { id: "leader-genghis", title: "Genghis Khan and the Making of the Modern World", author: "Jack Weatherford", category: "great-leaders", focusId: "leadership", role: "leader", purpose: "Use as a comparative study of organisation, delegation, mobility, information flow, expansion, and institutional scale." },
];

export const curriculumFocuses: CurriculumFocus[] = [
  {
    id: "consumer-psychology",
    label: "Consumer Psychology & Buying",
    diagnosis: "Use when you can produce ads but cannot yet explain, from first principles, why a person notices, interprets, trusts, delays, switches, or buys.",
    outcome: "Build a model of the customer that predicts behaviour instead of merely describing an avatar.",
    capabilityBookIds: ["consumer-behavior", "decoded", "choice-factory", "demand-side-sales", "competing-against-luck", "cambridge-consumer-psychology"],
    leaderBookId: "leader-caesar",
    synthesisPrompt: "Where do observed human motives, identity, status, uncertainty, and social influence explain behaviour in both a buying decision and Caesar's political or military choices—and where does the analogy fail?"
  },
  {
    id: "offers-pricing",
    label: "Offers, Value & Pricing",
    diagnosis: "Use when acquisition works but the offer feels weak, interchangeable, discount-dependent, or difficult to scale profitably.",
    outcome: "Understand perceived value, willingness to pay, risk transfer, reference prices, and offer architecture beneath tactical templates.",
    capabilityBookIds: ["strategy-tactics-pricing", "monetizing-innovation", "alchemy"],
    leaderBookId: "leader-rockefeller",
    synthesisPrompt: "How do value, bargaining power, alternatives, perceived risk, and structural advantage shape both a commercial offer and Rockefeller's economic position?"
  },
  {
    id: "attention",
    label: "Attention & Memory",
    diagnosis: "Use when the product may be good but the market scrolls past, forgets the message, or cannot retrieve the brand later.",
    outcome: "Understand attention as a scarce resource and design messages that survive exposure and memory decay.",
    capabilityBookIds: ["attention-merchants", "made-to-stick"],
    leaderBookId: "leader-napoleon",
    synthesisPrompt: "How did Napoleon direct attention, symbolism, information, and tempo, and what general principles transfer to capturing and retaining customer attention without confusing war with marketing?"
  },
  {
    id: "creative-advertising",
    label: "Creative Advertising & Distinctiveness",
    diagnosis: "Use when you understand direct response but your executions converge on the same hooks, layouts, claims, and visual language as everyone else.",
    outcome: "Increase creative range while preserving a clear selling idea and building recognisable memory structures.",
    capabilityBookIds: ["hey-whipple", "building-distinctive-assets", "how-brands-grow"],
    leaderBookId: "leader-churchill",
    synthesisPrompt: "What makes an idea memorable enough to travel through repetition, language, symbolism, and distinctive expression, and how did Churchill use those forces in a radically different context?"
  },
  {
    id: "humour",
    label: "Humour Psychology",
    diagnosis: "Use when you want humour to function as an attention, liking, memory, or transmission mechanism rather than random entertainment.",
    outcome: "Understand why humour works, when it fails, and how audience, status, incongruity, context, and social norms change the effect.",
    capabilityBookIds: ["psychology-humor", "inside-jokes", "humor-seriously"],
    leaderBookId: "leader-lincoln",
    synthesisPrompt: "When does humour reduce tension, signal confidence, build affiliation, or sharpen a point, and when would the same humour undermine authority, trust, or persuasion?"
  },
  {
    id: "social-distribution",
    label: "Social Media, Networks & Transmission",
    diagnosis: "Use when you are treating social platforms as content slots rather than systems through which information, identity, status, and behaviour propagate.",
    outcome: "Understand voluntary sharing, peer effects, network structure, and distribution beyond paid placement.",
    capabilityBookIds: ["contagious", "hype-machine"],
    leaderBookId: "leader-alexander",
    synthesisPrompt: "How do identity, stories, symbols, networks, local adaptation, and social transmission change the speed at which an idea or institution spreads?"
  },
  {
    id: "experimentation",
    label: "Experimentation & Causal Learning",
    diagnosis: "Use when results move but you cannot confidently tell which intervention caused the movement or which apparent winner will reproduce.",
    outcome: "Turn the business into a learning system that can separate signal from noise and revise beliefs when tests disagree.",
    capabilityBookIds: ["trustworthy-experiments"],
    leaderBookId: "leader-frederick",
    synthesisPrompt: "How should a decision-maker update after success, failure, incomplete information, and changing conditions, and what evidence would justify repeating or abandoning a tactic?"
  },
  {
    id: "strategy-scaling",
    label: "Strategy, Advantage & Scaling",
    diagnosis: "Use when growth is becoming a collection of local optimisations and you need to identify the governing constraint, leverage point, and durable advantage.",
    outcome: "Move from scaling ads to scaling a coherent system with strategic leverage and structural advantage.",
    capabilityBookIds: ["good-strategy", "seven-powers"],
    leaderBookId: "leader-genghis",
    synthesisPrompt: "Which structures let an organisation expand without every decision remaining centralised, what becomes the bottleneck at scale, and what breaks when the system grows beyond its original conditions?"
  },
];

export const curriculumBookById = (id: string) => curriculumBooks.find((book) => book.id === id);
export const curriculumFocusById = (id: CurriculumFocusId) => curriculumFocuses.find((focus) => focus.id === id);
