import { db } from "@workspace/db";
import {
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
  seedMetaTable,
} from "@workspace/db";
import { eq, sql, and, like, notInArray } from "drizzle-orm";
import { logger } from "./logger";

// Content version of the seeded curriculum. BUMP THIS whenever the TOPICS or
// ASSIGNMENTS content below changes. On boot, seedIfEmpty compares this against
// the value stored in seed_meta; a mismatch forces a full re-seed, so content
// edits self-heal in every environment (including a republished production)
// without a manual database wipe.
const SEED_CONTENT_VERSION = "2026-08-15-ai-math-level-1-v1";

type SeedTopic = {
  slug: string;
  title: string;
  weekNumber: number;
  blurb: string;
  lectureTitle: string;
  body: string;
};

const TOPICS: SeedTopic[] = [
  // Day 1 — AI Math Level 1: a one-day intensive on the math behind the machine
  {
    slug: "numbers-as-meaning",
    title: "Numbers as meaning",
    weekNumber: 1,
    blurb:
      "When a chatbot writes a poem it feels like magic — but underneath it is all numbers and arithmetic, and 'meaning' itself becomes a location in space.",
    lectureTitle: "Numbers as meaning: why AI is really math",
    body: `# Numbers as meaning: why AI is really math

You type a question and a chatbot answers in fluent, natural sentences — it really does feel like there's a mind inside the box. There isn't. Underneath the human-sounding words, an AI is doing one thing: an unimaginable amount of plain arithmetic on lists of numbers. This one-day intensive is about that surprising truth — **AI is really math** — and this first session covers the front half of the story: how the world becomes numbers, and how those numbers come to carry meaning.

## Everything becomes numbers

A computer can't think about the *word* "cat" or the *idea* of a sunset. The very first thing any AI does is turn whatever you give it — text, images, sound — into numbers. A word becomes a list of numbers; a photo becomes a giant grid of numbers (one per dot of color); a sound becomes numbers measuring the wave. Once the world is numbers, the machine can do the only thing it's good at: arithmetic. Every clever-looking thing AI does starts with this quiet translation step.

## A giant pile of tunable dials

Inside the model is a huge collection of numbers called **weights** — picture millions or billions of little dials. When numbers flow through the model, each dial multiplies and nudges them along the way. The exact settings of all those dials are what make one model good at writing code and another good at describing pictures. Nobody sets them by hand — the model **learns** them: it makes a guess, sees how wrong it was, and nudges the dials a tiny bit toward "less wrong," billions of times. The model isn't a brain full of facts; it's a mountain of dials whose particular settings happen to produce useful answers. And because it's all arithmetic, AI is math, not magic: it has no secret wisdom, it can be confidently wrong, and it can be measured, tested, and improved.

## Vectors: a list of numbers is a location

A single number can't capture much — how would one number hold the meaning of the word "ocean"? The trick is to use a *whole list* of numbers at once. That list is called a **vector**, and it's nothing more than an ordered list of numbers, like \`[2, 5, 1]\`. You can think of it as a location: \`[2, 5]\` is a spot on a map, two steps east and five steps north. AI uses much longer lists — hundreds of numbers — which is just a spot in a space with hundreds of directions instead of two. We can't picture that, but the math doesn't care; a location is a location whether it has 2 numbers or 500.

## Embeddings: meaning as a place in space

Here's the leap. AI gives every word its own vector — its own location — and arranges them so that **words with similar meanings sit close together.** "Dog," "puppy," and "cat" land in the same neighborhood; "helicopter" is far away across town. The machine has no dictionary and no idea what a dog *is.* It just knows that the word "dog" lives near the word "puppy," and that nearness is what meaning becomes for a machine. An **embedding** is exactly this: a map where distance means similarity. The map has an even more surprising feature: the *directions* between points mean something. The step that takes you from "man" to "woman" is roughly the same step that takes you from "king" to "queen" — so you can do arithmetic on meaning: take the vector for "king," subtract "man," add "woman," and you land right next to "queen."

## Measuring likeness: distance and the dot product

A map is only useful if you can measure it. How does a machine actually *tell* that "dog" and "puppy" are close while "dog" and "helicopter" are far? Two rulers do almost all the work. **Distance** is the plain straight-line gap between two points — small distance means similar, large means different, exactly like measuring between two cities. The **dot product** asks a slightly different question: **do these two arrows point in the same direction?** Multiply the matching numbers of two vectors and add the results — large and positive means they agree, near zero means unrelated, negative means opposed. And when you care about direction but not size — a long document and a short one can mean the same thing — **cosine similarity** is the dot product after ignoring length, measuring only the angle between two vectors. Search, recommendations, and even a chatbot deciding which earlier words to pay attention to are mostly this: measuring likeness, billions of times.

## In the real world

When a search engine understands that "how to fix a flat tire" and "repairing a punctured wheel" are asking the same thing — despite sharing almost no words — it's because both phrases land in nearly the same spot on the embedding map, and a likeness measurement (small distance, high cosine similarity) confirms it. The old way matched keywords and missed it; the new way matches *locations* and nails it. That quiet shift, from matching words to matching places in space, is why search and chatbots suddenly got so much better at knowing what you actually meant.`,
  },
  {
    slug: "how-ai-learns",
    title: "How AI learns",
    weekNumber: 1,
    blurb:
      "From matrices that move information through a network, to loss, gradients, gradient descent, probability, and backpropagation — the whole learning loop in one session.",
    lectureTitle: "How AI learns: from matrices to backpropagation",
    body: `# How AI learns: from matrices to backpropagation

The first session turned meaning into numbers and locations. This closing session answers the remaining question: how does a machine that only does arithmetic actually *get good* at anything? The answer is a single loop — guess, measure how wrong, assign blame, nudge every dial — built from a handful of humble ideas: matrices, loss, gradients, gradient descent, probability, and backpropagation.

## Matrices: how a network moves information

A **matrix** is just numbers arranged in a grid of rows and columns, and what makes it useful is that it transforms a vector into a new vector. Each output number is a weighted blend of all the input numbers — multiply each input by a weight in the grid and add them up — so every output can draw a little from every input, mixing and reshaping the information. Those grid weights are exactly the tunable dials the network learns, which is why **one layer of a neural network is basically one matrix multiply.** A single matrix can only reshape so much, so networks stack many of them, with a small non-linear "bend" between layers so the steps don't collapse into one. Layer after layer, the numbers get refined — raw word-numbers near the bottom, rich meaning near the top.

## Loss and the gradient: which way is better?

To improve, a model first needs a single number for how wrong it is, called the **loss** — high loss means bad answers, low loss means good ones, so learning becomes "make the loss small." Picture the loss as a landscape where height means error. A slope tells you how steep something is and which way is up; since the model has millions of dials, it needs a slope for each one at once, and that bundle is the **gradient.** The gradient points in the direction the loss increases fastest — straight uphill toward more error — so to get better, the model steps the *opposite* way, downhill. That gives every one of the millions of dials a precise "turn up a little / turn down a little" instruction instead of blind guessing.

## Gradient descent: learning by rolling downhill

**Gradient descent** is the whole method: compute which way is downhill, nudge every dial a small amount that way, then repeat from the new spot — thousands or millions of times. Each step is tiny and unimpressive, but relentlessly repeated they carry the model from high-up nonsense down into a low valley where its answers are good; patience, not insight, does the work. The step size, called the **learning rate**, matters: too-big steps leap over the valley and bounce around or diverge, while too-small steps make learning crawl. And because the landscape is bumpy, the model can settle into a shallow **local valley** that isn't the true lowest point — which is why training uses tricks like randomness and momentum to avoid getting stuck.

## Probability: how AI handles not knowing

An AI never looks up a known truth; for any output it produces a **probability** for each possibility and goes with the likely ones — it is fundamentally a guessing machine. A chatbot in particular predicts the **next word** by probability, over and over, chaining likely guesses into fluent sentences; nothing is planned in advance. The confidence attached to an answer reflects how well it fits the patterns the model learned, *not* whether it's true — so it can assign high probability to something flatly false and state it in a calm, sure voice. A little randomness, often called **temperature**, keeps it from always grabbing the single top word: low temperature is safe and predictable, high temperature is more creative (and sometimes weird).

## Backpropagation: the self-teaching loop

Now the loop closes. The **forward pass** is the guess: input becomes vectors and flows through layer after layer of matrices until the model produces an output and a confidence. The loss measures how wrong the guess was — but not *whose fault* it was among millions of dials. **Backpropagation** works backward from the mistake, layer by layer, asking how much each dial contributed to the error, passing the blame back using the same slope idea behind gradients. By the time it reaches the front, every dial has its own gradient — a precise "turn up a little / down a little" — and gradient descent takes one small downhill step using all of them. Repeat this guess-measure-blame-nudge loop across billions of examples and the network tunes itself from random nonsense into something useful. No one programs the dials; the loop discovers them.

## In the real world

Training a large chatbot is nothing but this loop run at staggering scale: warehouses of computers doing forward passes, computing losses, backpropagating blame, and nudging billions of dials, around the clock for months. Nothing "smarter" is hiding underneath — capable writing and translation emerge from an immense number of humble downhill nudges. That gap between "simple math" and "feels like magic" is exactly what this course set out to close.`,
  },
];

type SeedAssignment = {
  kind: "homework" | "test" | "midterm" | "final";
  title: string;
  weekNumber: number;
  isTimed: boolean;
  timeLimitMinutes: number | null;
  instructions: string;
  problems: Array<{
    topicSlug: string;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>;
};

const ASSIGNMENTS: SeedAssignment[] = [
  {
    kind: "homework",
    title: "Homework 1 — Numbers as meaning",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering the morning session (Numbers as meaning). Answer each question in a few sentences (about 3–5) in your own words. You don't need to do any calculations — just explain the idea clearly. One-word answers won't receive credit.",
    problems: [
      {
        topicSlug: "numbers-as-meaning",
        prompt:
          "A friend says, 'AI must understand things — it answers my questions just like a person would, so there's clearly a little mind in there.' Using the idea that AI is really math, explain why this is a misunderstanding. (3–5 sentences.)",
        correctAnswer:
          "There's no little mind inside; underneath the human-sounding words an AI is only doing an enormous amount of plain arithmetic on lists of numbers. It first turns the input (text, images, sound) into numbers, then pushes them through millions of tunable numbers called weights, multiplying and adding along the way. What looks like understanding is really patterns in those numbers producing a likely-looking output, not a mind grasping meaning. So the fluent answer is the result of math at huge scale, which can look like thinking without any thinking actually happening.",
        explanation:
          "Full credit: explains AI is arithmetic on numbers (inputs become numbers, weights transform them) and that fluent output isn't genuine understanding/a mind.",
      },
      {
        topicSlug: "numbers-as-meaning",
        prompt:
          "A music app builds a playlist of songs 'you might like.' Explain how turning songs into vectors and measuring likeness (distance or the dot product) could let it do this, even though it has no idea what the songs sound like. (3–5 sentences.)",
        correctAnswer:
          "The app turns every song into a vector — a location in space arranged by an embedding so similar things sit near each other — and then measures how alike two songs are by how close their vectors are (small distance) or by a large dot product, which checks whether two vectors point the same way. To build the playlist it compares the songs you already love to millions of others and ranks them by that similarity score, floating the closest ones to the top. It doesn't need to 'hear' anything; it just runs a ruler across a map of points. So the feeling that it 'gets your taste' is really just repeated likeness measurements between vectors.",
        explanation:
          "Full credit: explains songs become vectors and the app ranks by similarity (small distance / large dot product) between your liked items and candidates, with no real understanding of the audio.",
        hint: "What does 'close together on the map' represent for a machine that only handles numbers?",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2 — How AI learns",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering the afternoon session (How AI learns). Answer each question in a few sentences (about 3–5) in your own words. No calculations are required — explain your reasoning. One-word answers won't receive credit.",
    problems: [
      {
        topicSlug: "how-ai-learns",
        prompt:
          "A model just gave a very wrong answer, and it has millions of dials it could adjust. Explain how the ideas of a 'loss' and a 'gradient' tell it which way to change those dials to do better. (3–5 sentences.)",
        correctAnswer:
          "First the model needs a single number for how wrong it is, called the loss — high loss means bad answers, low loss means good ones, so the goal becomes making the loss small. The gradient is the bundle of slopes that says, for each dial, whether nudging it makes the loss go up or down and how fast. The gradient actually points in the direction the loss increases fastest — straight uphill toward more error — so to improve, the model turns each dial the opposite way, downhill. That gives every one of the millions of dials a precise 'turn up a little / turn down a little' instruction instead of blind guessing.",
        explanation:
          "Full credit: explains the loss measures how wrong the model is, the gradient gives a per-dial slope pointing uphill (toward more error), and the model moves the opposite way (downhill) to improve.",
      },
      {
        topicSlug: "how-ai-learns",
        prompt:
          "A chatbot states a made-up 'fact' in a calm, confident voice, and it turns out to be false. Using what you know about how AI handles probability and uncertainty, explain why this happens. (3–5 sentences.)",
        correctAnswer:
          "An AI never looks up a known truth; it produces a probability for each possible output and goes with the likely ones, so it's fundamentally a guessing machine. A chatbot in particular predicts the next word by probability over and over, chaining likely guesses into fluent sentences. The confidence number reflects how well an answer fits the patterns it learned, not whether the answer is actually true — so it can assign high probability to something flatly false. That's why it can deliver a made-up fact in a sure, calm voice: the fluent confidence is about pattern-fit, not verified truth.",
        explanation:
          "Full credit: explains AI assigns probabilities rather than knowing facts, predicts likely words, and that high confidence reflects pattern-fit (not truth), so it can be confidently wrong.",
      },
    ],
  },
  {
    kind: "test",
    title: "Course Test — AI Math Level 1: The Math Behind the Machine",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 15,
    instructions:
      "Timed. 15 minutes. Covers both sessions of the course. Answer each question in a few sentences (about 4–6) in your own words. No calculations are required. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "numbers-as-meaning",
        prompt:
          "A skeptical colleague at a language-tech startup objects: 'You can't put the meaning of words into a computer — meaning isn't a number.' Using the course's ideas, respond: explain what a vector and an embedding are, how 'meaning' becomes a location in space, and what it means that directions (like king − man + woman ≈ queen) can carry meaning too. (4–6 sentences.)",
        correctAnswer:
          "A vector is just an ordered list of numbers, which you can picture as a location — a spot in a space with as many directions as there are numbers. An embedding gives every word its own vector and arranges them so that words with similar meanings sit close together, so 'dog,' 'puppy,' and 'cat' land in one neighborhood while 'helicopter' is far away. For a machine that only does arithmetic, that nearness IS meaning: it has no dictionary, it just knows which points sit near which. Even more surprising, the directions between points carry meaning too — the step from 'man' to 'woman' is about the same as the step from 'king' to 'queen,' so you can do arithmetic on meaning and land near 'queen.' This turns slippery meaning into hard geometry, which is what lets an arithmetic machine handle language at all.",
        explanation:
          "Full credit: defines a vector (list of numbers/location) and an embedding (similar meanings placed near each other), explains nearness = meaning, and that directions encode relationships (king−man+woman≈queen).",
      },
      {
        topicSlug: "how-ai-learns",
        prompt:
          "An intern watching a training run asks why the model improves so slowly — thousands of barely-noticeable adjustments instead of one big fix. Answer them by explaining gradient descent as 'learning by rolling downhill': the error landscape, why tiny repeated steps work, why the learning rate matters, and the problem of local valleys. (4–6 sentences.)",
        correctAnswer:
          "Gradient descent pictures the model's error as a hilly landscape where high ground is 'very wrong' and low valleys are 'very right,' with the model starting high up because random dials give terrible answers. The method is short: compute which way is downhill (the gradient), nudge every dial a small amount that way, then repeat from the new spot thousands or millions of times. Each step is tiny, but relentlessly repeated they carry the model from nonsense down into a good valley — patience, not insight, does the work. The step size, called the learning rate, matters because too-big steps leap over the valley and bounce around or diverge, while too-small steps make learning crawl. A further problem is local valleys: the landscape is bumpy, so the model can settle in a shallow dip that isn't the true lowest point, which is why training uses tricks like randomness and momentum to avoid getting stuck.",
        explanation:
          "Full credit: explains the error landscape, repeated small downhill steps reaching a low-error valley, the learning-rate tradeoff, and local valleys/getting stuck.",
      },
      {
        topicSlug: "how-ai-learns",
        prompt:
          "A network with millions of dials just gave a badly wrong answer, and no engineer tells it which dials were at fault — yet over training it steadily improves. Explain how backpropagation lets it 'teach itself': the forward pass, how blame is assigned backward, how it connects to gradient descent, and how repeating the loop produces learning. (4–6 sentences.)",
        correctAnswer:
          "Learning runs as a loop: guess, measure how wrong, and adjust. The guess is the forward pass — the input becomes vectors and flows through layer after layer of matrices until the model produces an output and a confidence — and the loss then measures the gap from the right answer, telling the model that it was wrong but not whose fault it was among millions of dials. Backpropagation works backward from the mistake, layer by layer, asking how much each dial contributed to the error and passing the blame back using the same slope idea behind gradients. By the time it reaches the front, every dial has its own gradient, a precise 'turn up or down a little' to reduce the error. Gradient descent then takes one small downhill step using all those instructions, and repeating the whole loop across billions of examples slowly tunes the network from random nonsense into something useful — no one programs the dials, the loop discovers them.",
        explanation:
          "Full credit: explains the forward pass produces a guess + loss, backprop assigns blame backward to give each dial a gradient, gradient descent steps downhill, and repeating the loop is self-teaching.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final — AI Math Level 1: The Math Behind the Machine",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 25,
    instructions:
      "Timed cumulative final. 25 minutes. Covers the whole one-day course. Answer each question in a paragraph (about 5–7 sentences) in your own words. No calculations are required. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "how-ai-learns",
        prompt:
          "Using ideas from across the whole course, trace how a single piece of input becomes an answer and how the model learns from its mistake. Show how at least four different ideas fit together (for example: numbers/vectors, embeddings, matrices, loss/gradient, gradient descent, probability, backpropagation). (5–7 sentences.)",
        correctAnswer:
          "It starts by turning the input into numbers — specifically vectors, lists of numbers arranged by an embedding so that location stands for meaning, with similar things placed near each other. Those vectors flow forward through layer after layer of matrices, grids of weights that mix and reshape the numbers, carrying information from 'what the question means' toward 'what the answer should be.' The model's output is really a set of probabilities — for a chatbot, a likely next word — so its answer is a confident guess, not a looked-up fact. To learn, a loss scores how wrong that guess was, and the gradient gives a per-dial slope pointing toward more error, so the model knows which way is 'better.' Backpropagation passes the blame for the mistake backward through the layers so every weight gets its own gradient, and gradient descent nudges them all a small step downhill. Repeat this guess-measure-blame-nudge loop across billions of examples and the network tunes itself from random nonsense into something that works. Every 'intelligent' step is really one of these humble math operations chained together.",
        explanation:
          "Full credit: traces input → numbers/vectors/embeddings → matrices → probabilistic output → loss/gradient → backprop → gradient descent loop, correctly connecting at least four distinct ideas.",
      },
      {
        topicSlug: "numbers-as-meaning",
        prompt:
          "Someone insists, 'A search engine can only match the exact words you type — if you use different words, it can't possibly know what you mean.' Using the course's ideas about vectors, embeddings, and measuring likeness, argue why modern systems can do better. Use a concrete example. (5–7 sentences.)",
        correctAnswer:
          "The 'only exact words' view describes the old way of searching, which did just match keywords and missed anything phrased differently. Modern systems instead turn each phrase into a vector — a location in space — using an embedding that places similar meanings close together, regardless of the exact words used. So 'how to fix a flat tire' and 'repairing a punctured wheel' land in nearly the same spot even though they share almost no words. To find matches, the system measures likeness between vectors — small distance, or a large dot product / high cosine similarity — and returns the closest ones, which is comparing locations rather than spellings. That's why search and chatbots got dramatically better at understanding what you meant rather than just what you typed. The key shift was treating meaning as geometry: once meaning is a place in space, different words for the same idea sit in the same neighborhood.",
        explanation:
          "Full credit: explains embeddings place similar meanings near each other and likeness is measured by distance/dot product/cosine, so different words for the same idea match — with a concrete example.",
      },
    ],
  },
];

type SeedPrimer = SeedTopic;

const REASONING_PRIMERS: SeedPrimer[] = [
  {
    slug: "reasoning-primer-subject",
    title: "How to reason about AI-math cases",
    weekNumber: 1,
    blurb:
      "Diagnostic primer: applying the course's ideas to concrete situations about how AI really works.",
    lectureTitle: "Primer: How to reason about AI-math cases",
    body: `# How to reason about AI-math cases

This short primer prepares you for the **AI Math** diagnostic. That check is *ungraded practice* — it never affects your course grade. It is drawn from the two sessions of this one-day course and asks you to *apply* what you have learned to a specific situation, not to recite a definition.

## It tests application, not memorization

A diagnostic question gives you a small, concrete scene — a search engine matching two differently-worded phrases, a chatbot answering confidently but wrongly, a model overshooting because its steps are too big — and asks what the course's ideas tell you about it. Knowing the words "embedding" or "gradient descent" is not enough; the question wants you to recognize *when* you are looking at one and *why* it matters here.

## What the questions reward

- **Naming the right idea** — match the situation to the concept that fits it: whether something is about turning things into numbers, meaning as location (embeddings), measuring likeness (distance/dot product), reshaping with matrices, finding "better" with a gradient, learning by rolling downhill, handling uncertainty with probability, or self-teaching with backpropagation.
- **Using evidence from the scene** — point to the detail in the situation that supports your answer, rather than answering from a general impression.
- **Avoiding the "magic" story** — the course replaces "AI just understands" with careful explanation. The best answers resist "there's a mind in there" or "it must know the truth," and stay grounded in the math.

## How to do this activity well

1. **Read the situation first**, then ask which topic it belongs to.
2. **Find the detail that decides it** — what in the scene makes one answer better than another.
3. For written items, **give the core idea in a sentence or two** — clear and correct beats long and padded.

Take it as often as you like; the questions are freshly generated every time, and there is no penalty for any answer.`,
  },
  {
    slug: "reasoning-primer-general",
    title: "Core reasoning skills",
    weekNumber: 1,
    blurb:
      "Diagnostic primer: analysis, inference, evaluation, deduction, and induction.",
    lectureTitle: "Primer: Core reasoning skills",
    body: `# Core reasoning skills

This short primer prepares you for the **General Reasoning** diagnostic — an *ungraded* check that tests five genuine reasoning skills. These are the same skills you use to decide what a set of facts really shows, so they matter directly for thinking clearly about how AI works.

## The five skills

- **Analysis** — break an argument into parts: find its **point** (the conclusion), the **reasons** given for it, and any hidden assumption it leans on. Ask: "What is this trying to convince me of, and what does it take for granted?"
- **Inference** — work out what *follows* from what you're told, and how strongly. Tell apart what *must* be true, what is *likely*, and what is only *possible*.
- **Evaluation** — judge how much the reasons actually support the point. Notice when evidence is beside the point, a source isn't trustworthy, or a step doesn't really connect.
- **Deduction** — reasoning where true starting facts *guarantee* the conclusion. If the starting facts are true, the conclusion can't be false. Watch for sneaky forms that only *look* airtight.
- **Induction** — reasoning from a few examples to a *probable* general rule or prediction. Strong induction uses many fair examples; weak induction over-generalizes from too few.

## A recurring trap: things that move together

Most wrong answers are statements that *sound* reasonable but are **not actually backed up by what you were told**. The discipline this check rewards is the same one careful thinking about technology demands: keep apart what the facts **show**, what you're **assuming**, and what only *sounds* right. Two things happening together does not prove one causes the other.

## How to do this activity well

1. Find the **point** (conclusion) first, then the reasons.
2. Ask which of the five skills the question is testing (a hidden-assumption question is analysis; a "what follows" question is inference or deduction; a "how good is this reasoning" question is evaluation).
3. Pick the option that follows **only** from what you were given — not the one that merely sounds true or appealing.

Take it as often as you like; the questions are freshly generated every time, and it never affects your grade.`,
  },
];

// Insert any teaching-to-the-test primer lectures whose slug is not yet present.
// Safe to run on every boot: it only adds what is missing.
export async function seedReasoningPrimersIfMissing(): Promise<void> {
  const currentSlugs = REASONING_PRIMERS.map((p) => p.slug);
  // Remove any obsolete primer topics from earlier diagnostic models (their
  // lectures cascade-delete), so renamed/retired primers self-heal instead of
  // stranding stale content in existing or republished databases.
  const stale = await db
    .delete(topicsTable)
    .where(
      and(
        like(topicsTable.slug, "reasoning-primer-%"),
        notInArray(topicsTable.slug, currentSlugs),
      ),
    )
    .returning({ slug: topicsTable.slug });
  if (stale.length > 0) {
    logger.info(
      { removed: stale.map((s) => s.slug) },
      "Reasoning primers: removed obsolete primers",
    );
  }
  let added = 0;
  for (let i = 0; i < REASONING_PRIMERS.length; i++) {
    const t = REASONING_PRIMERS[i]!;
    const existing = await db
      .select({ id: topicsTable.id })
      .from(topicsTable)
      .where(eq(topicsTable.slug, t.slug));
    if (existing.length > 0) continue;
    const [inserted] = await db
      .insert(topicsTable)
      .values({
        slug: t.slug,
        title: t.title,
        weekNumber: t.weekNumber,
        blurb: t.blurb,
        position: 900 + i,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert primer ${t.slug}`);
    await db.insert(lecturesTable).values({
      topicId: inserted.id,
      weekNumber: t.weekNumber,
      title: t.lectureTitle,
      body: t.body,
    });
    added += 1;
  }
  if (added > 0) {
    logger.info({ added }, "Reasoning primers seeded");
  } else {
    logger.info("Reasoning primers: already present, skipping");
  }
}

export async function seedIfEmpty(): Promise<void> {
  // The course was converted to the one-day intensive syllabus. Detect the
  // marker topic; if present and the content version matches, the content is
  // current and we skip. This makes the seed self-healing across environments:
  // a database that still holds older content (e.g. a previous curriculum) is
  // detected and replaced on boot.
  const markerTopic = await db
    .select({ id: topicsTable.id })
    .from(topicsTable)
    .where(eq(topicsTable.slug, "numbers-as-meaning"));
  // Read the stored content version. Tolerate the seed_meta table not yet
  // existing (e.g. a boot that races ahead of schema migration): treat that as
  // "no version recorded", which forces a reseed once the table is present.
  let currentVersion: string | null = null;
  try {
    const storedVersion = await db
      .select({ value: seedMetaTable.value })
      .from(seedMetaTable)
      .where(eq(seedMetaTable.key, "content_version"));
    currentVersion = storedVersion[0]?.value ?? null;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Seed: seed_meta unavailable, treating version as unset");
    currentVersion = null;
  }
  if (markerTopic.length > 0 && currentVersion === SEED_CONTENT_VERSION) {
    logger.info("Seed: course content present and current, skipping");
    return;
  }
  if (markerTopic.length > 0) {
    logger.warn(
      { storedVersion: currentVersion, expected: SEED_CONTENT_VERSION },
      "Seed: course content present but out of date — re-seeding with the current curriculum",
    );
  }

  // No current content. Either the database is empty (fresh) or it still holds
  // an older curriculum. Do the (optional) wipe and the full reseed in a SINGLE
  // transaction so the marker topic only ever becomes visible once the entire
  // curriculum has committed. A crash mid-seed rolls back, so the next boot
  // retries instead of leaving partial content that the marker check would
  // wrongly treat as healthy. TRUNCATE also takes an ACCESS EXCLUSIVE lock, so
  // concurrent readers never observe a half-empty course during the replace
  // window. The diagnostic tables are truncated here too so the (non
  // version-gated) diagnostic seed repopulates them with the current content on
  // the same boot.
  await db.transaction(async (tx) => {
    const existing = await tx.execute(sql`select count(*)::int as n from topics`);
    const row = (existing.rows[0] ?? {}) as { n?: number };
    if ((row.n ?? 0) > 0) {
      logger.warn(
        "Seed: stale course content detected — replacing with the AI Math Level 1 one-day curriculum",
      );
      await tx.execute(
        sql`TRUNCATE TABLE answers, attempts, practice_attempts, practice_problems, practice_sessions, problems, assignments, lectures, topics, diagnostic_responses, diagnostic_attempts, diagnostic_items, diagnostic_assessments RESTART IDENTITY CASCADE`,
      );
    } else {
      logger.info("Seed: populating course content");
    }

    // Topics + lectures
    const slugToTopicId = new Map<string, number>();
    for (let i = 0; i < TOPICS.length; i++) {
      const t = TOPICS[i]!;
      const [inserted] = await tx
        .insert(topicsTable)
        .values({
          slug: t.slug,
          title: t.title,
          weekNumber: t.weekNumber,
          blurb: t.blurb,
          position: i,
        })
        .returning();
      if (!inserted) throw new Error(`Failed to insert topic ${t.slug}`);
      slugToTopicId.set(t.slug, inserted.id);
      await tx.insert(lecturesTable).values({
        topicId: inserted.id,
        weekNumber: t.weekNumber,
        title: t.lectureTitle,
        body: t.body,
      });
    }

    // Assignments + problems
    for (let i = 0; i < ASSIGNMENTS.length; i++) {
      const a = ASSIGNMENTS[i]!;
      const [inserted] = await tx
        .insert(assignmentsTable)
        .values({
          kind: a.kind,
          title: a.title,
          weekNumber: a.weekNumber,
          position: i,
          isTimed: a.isTimed,
          timeLimitMinutes: a.timeLimitMinutes,
          instructions: a.instructions,
        })
        .returning();
      if (!inserted) throw new Error(`Failed to insert assignment ${a.title}`);
      for (let p = 0; p < a.problems.length; p++) {
        const prob = a.problems[p]!;
        const topicId = slugToTopicId.get(prob.topicSlug);
        if (!topicId) throw new Error(`Unknown topic slug ${prob.topicSlug}`);
        await tx.insert(problemsTable).values({
          assignmentId: inserted.id,
          topicId,
          position: p,
          prompt: prob.prompt,
          correctAnswer: prob.correctAnswer,
          explanation: prob.explanation,
          hint: prob.hint ?? null,
        });
      }
    }

    // Stamp the content version last, inside the same transaction, so the
    // marker check on the next boot only treats the course as "current" once
    // the entire curriculum has committed.
    await tx
      .insert(seedMetaTable)
      .values({ key: "content_version", value: SEED_CONTENT_VERSION })
      .onConflictDoUpdate({
        target: seedMetaTable.key,
        set: { value: SEED_CONTENT_VERSION, updatedAt: new Date() },
      });
  });

  logger.info(
    { topics: TOPICS.length, assignments: ASSIGNMENTS.length, version: SEED_CONTENT_VERSION },
    "Seed complete",
  );
}
