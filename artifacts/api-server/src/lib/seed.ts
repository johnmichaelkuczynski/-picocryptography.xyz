import { db } from "@workspace/db";
import {
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
  seedMetaTable,
} from "@workspace/db";
import { eq, sql, like } from "drizzle-orm";
import { logger } from "./logger";

const SEED_CONTENT_VERSION = "2026-09-05-cryptography-v2";

type SeedTopic = {
  slug: string;
  title: string;
  weekNumber: number;
  blurb: string;
  lectureTitle: string;
  body: string;
  bodyMedium: string;
  bodyLong: string;
};

function topic(
  slug: string,
  title: string,
  blurb: string,
  short: string,
  mediumExtra: string,
  longExtra: string,
): SeedTopic {
  const heading = `# ${title}\n\n`;
  return {
    slug,
    title,
    weekNumber: 1,
    blurb,
    lectureTitle: title,
    body: heading + short,
    bodyMedium: heading + short + "\n\n## A closer look\n\n" + mediumExtra,
    bodyLong:
      heading +
      short +
      "\n\n## A closer look\n\n" +
      mediumExtra +
      "\n\n## Apply it\n\n" +
      longExtra,
  };
}

const TOPICS: SeedTopic[] = [
  topic(
    "secret-alphabets",
    "HOUR 1 EVERY CODE EVER BROKEN WAS BROKEN BECAUSE PEOPLE REPEAT THEMSELVES",
    "Letter counts, stock phrases, weather reports: Enigma fell to habit, not to genius.",
    `A **substitution cipher** replaces each letter with another symbol. The key may look enormous, but the same plaintext letter always leaves the same fingerprint. In ordinary English, E is common, Q is rare, common pairs recur, and short words have constrained shapes.

    An attacker counts symbols, guesses likely letters and word patterns, then tests whether the guesses make the rest of the message more coherent. Spaces, repeated names, and several messages using one key make the attack easier. The weakness is not that the alphabet was chosen carelessly; it is that a fixed substitution preserves language statistics.

Linear B shows decipherment without an adversary or hidden key. Alice Kober systematically tabulated repeated sign groups, triplets, and changing inflected endings, then built a grid of consonant/vowel relationships while deliberately assigning no sound values. Michael Ventris later tested likely Cretan place-name cribs, including Knossos and Amnisos, propagated the resulting values through the grid, and found that the language was Greek. This was an orphaned script recovered from internal repetition and geographical clues—not deliberate concealment. Hours 2–4 instead concern systems intentionally designed to keep information from an adversary.`,
    `Frequency analysis is evidence, not a mechanical “most common means E” rule. A short message may be unusual, so a codebreaker combines counts with repeated-letter patterns, likely context, and trial substitutions. Caesar shifts are especially weak because there are very few keys to test; a general monoalphabetic substitution has more keys but leaks the same structure.`,
    `Suppose a club encrypts every newsletter with one secret alphabet. An attacker can pool months of ciphertext, spot recurring greetings and names, and use each solved fragment to unlock the rest. Changing the alphabet for every message helps against pooling, but a fixed substitution within each long message still leaks patterns. Modern encryption aims to make ciphertext statistically unrelated to the plaintext rather than merely renaming its symbols.`,
  ),
  topic(
    "one-time-pad",
    "HOUR 1 EVERY CODE EVER BROKEN WAS BROKEN BECAUSE PEOPLE REPEAT THEMSELVES",
    "Letter counts, stock phrases, weather reports: Enigma fell to habit, not to genius.",
    `A **one-time pad** combines a message with a truly random key that is at least as long as the message. If that key stays secret and is never reused, every possible plaintext of that length is equally compatible with the ciphertext. The ciphertext alone therefore reveals no preferred answer.

The conditions are unforgiving: generate real randomness, deliver a message-length key securely, protect it, and destroy it after one use. Reusing a pad lets attackers cancel the repeated key and compare the messages. Perfect mathematical secrecy trades away practical key distribution and storage, which is why ordinary systems use compact reusable keys with carefully designed modern ciphers.`,
    `The proof idea is simple: for any guessed plaintext, exactly one possible pad would turn it into the observed ciphertext, and every pad was equally likely. “Almost random,” a short repeated keyword, or a pseudorandom stream used incorrectly does not earn that guarantee. The pad solves encryption only after the parties have already solved the hard problem of sharing a huge secret.`,
    `Imagine two offices must exchange a gigabyte daily. They would first need to transport and guard a fresh gigabyte of secret pad material every day—often harder than protecting the data itself. If an operator accidentally uses Tuesday’s pad again on Wednesday, the XOR of the ciphertexts equals the XOR of the plaintexts, exposing relationships that language structure can exploit.`,
  ),
  topic(
    "block-encryption",
    "HOUR 2 PERFECT SECRECY EXISTS, IS PROVABLE, AND IS WORTHLESS",
    "Why the unbreakable cipher went unused, and why security is priced, not guaranteed.",
    `A **block cipher** transforms fixed-size blocks under a compact secret key. Encrypting each identical block independently makes identical plaintext blocks produce identical ciphertext blocks. In an image, repeated colors and regions can leave the picture’s outline visible even though individual blocks look scrambled.

A secure mode links blocks or combines them with a unique **nonce** so repetition does not survive. Modern authenticated-encryption modes also detect tampering. The cipher can be strong while the surrounding mode, nonce handling, or integrity design is disastrously wrong.`,
    `Electronic Codebook mode is the famous bad picture example because it preserves equality between blocks. Random-looking encryption needs more than a good primitive: the mode’s requirements must be followed exactly. A nonce often need not be secret, but reusing it with modes such as CTR or GCM can reveal relationships or even enable forgery.`,
    `A photo archive that encrypts each file block independently may conceal exact pixels while exposing logos, borders, and repeated backgrounds. Switching to an authenticated mode with a fresh nonce per encryption hides those patterns and causes altered ciphertext to fail verification. The system must store the nonce and authentication tag and must reject—not display—data whose tag fails.`,
  ),
  topic(
    "hashes-passwords",
    "HOUR 2 PERFECT SECRECY EXISTS, IS PROVABLE, AND IS WORTHLESS",
    "Why the unbreakable cipher went unused, and why security is priced, not guaranteed.",
    `A cryptographic **hash** maps any input to a fixed-size fingerprint. It is designed to be easy to compute forward and infeasible to reverse or to find a different input with the same fingerprint. Hashes support integrity checks, but ordinary fast hashes are unsafe password storage.

A service should store a unique random **salt** and the output of a slow, memory-hard password-hashing function. At login it repeats the calculation and compares results. If the database leaks, attackers still guess passwords offline; salts prevent one precomputed table from cracking every account, while cost slows each guess. Strong unique passwords remain important.`,
    `Hashing is not encryption: there is no decryption key. Yet weak passwords can be recovered by guessing likely candidates and hashing each one. A salt is public and stored beside the result; its purpose is uniqueness, not secrecy. Rate limits help online attacks but cannot stop offline guessing after a database theft.`,
    `If two users choose the same password, unsalted hashes reveal that fact and one successful guess breaks both records. Unique salts make the stored outputs differ. A fast general hash lets specialized hardware try enormous numbers of guesses, whereas Argon2id, scrypt, or bcrypt deliberately raises time or memory cost. A separate server-held pepper can add a layer, but it does not replace salts or a password-specific function.`,
  ),
  topic(
    "key-agreement",
    "HOUR 3 TWO STRANGERS CAN AGREE ON A SECRET WHILE EVERYONE LISTENS",
    "The one genuinely astonishing idea in the field, and the reason there is an internet.",
    `Symmetric encryption is efficient, but both parties need the same secret key. Sending that key over the same watched channel simply gives it to the listener. This **key-distribution problem** blocked secure communication between strangers at internet scale.

Public-key methods let two parties exchange public values and independently derive the same shared secret without transmitting that secret. A passive observer sees the public conversation but lacks the private values needed for the derivation. Key agreement alone does not prove identity: without authentication, an active attacker can negotiate separate secrets with each side.`,
    `Protocols therefore combine ephemeral key agreement with certificates or signatures. Authentication binds a public key to the server a client intended to reach; ephemeral secrets can provide forward secrecy, so later theft of a long-term signing key does not automatically reveal old sessions. The derived secret is normally fed through a key-derivation function before use.`,
    `On café Wi-Fi, a browser and bank can agree on fresh session keys while every packet is visible. The browser must also validate the bank’s certificate and hostname. If it ignores a certificate warning, a middle attacker can complete one agreement with the browser and another with the bank, reading and re-encrypting traffic despite sound mathematics.`,
  ),
  topic(
    "public-keys-signatures",
    "HOUR 3 TWO STRANGERS CAN AGREE ON A SECRET WHILE EVERYONE LISTENS",
    "The one genuinely astonishing idea in the field, and the reason there is an internet.",
    `Public-key cryptography uses a matched pair: a **public key** may be shared, while a **private key** must remain secret. The mixing-paint analogy captures a one-way operation: parties publicly combine values yet keep private ingredients that make the shared result possible. The analogy guides intuition, not the actual arithmetic.

For confidentiality, anyone can use a recipient’s public key to help create a secret only the private-key holder can recover. For authenticity, a private key signs a message and anyone with the public key can verify it. Encryption and signing solve different problems, and neither proves who owns a public key without a trustworthy binding such as a certificate.`,
    `Real systems usually use public-key operations to authenticate and establish short-lived symmetric keys, then use fast symmetric encryption for the data. A signature covers exact bytes or their hash: changing the signed software package makes verification fail. Protecting the private key is operationally critical because theft lets an attacker impersonate the owner.`,
    `A software vendor signs a release manifest with an offline private key. Customers verify it using a public key obtained through a trusted channel; a mirror cannot silently replace the download without invalidating the signature. The signature does not hide the package, and encrypting the package to customers would not by itself prove that the vendor created it.`,
  ),
  topic(
    "implementation-failures",
    "HOUR 4 NOBODY BREAKS THE MATH — THINGS FALL APART AT THE SEAMS",
    "Keys, people, sloppy code, and governments: where every real-world break has come from.",
    `Attackers rarely need to defeat the central theorem. They exploit **bad randomness** that makes keys predictable, timing or power differences that leak secret-dependent behavior, reused nonces, exposed backups, copied keys, unpatched libraries, or people tricked into approving access.

Security therefore depends on the whole system: operating-system randomness, reviewed libraries, constant-time implementations where needed, hardware-backed key protection, rotation and revocation, least privilege, useful warnings, and incident response. “We use strong encryption” is not evidence that keys were generated, stored, and used safely.`,
    `A random-number generator seeded from a clock may produce only a small set of likely keys. A comparison routine that exits at the first wrong byte can reveal, through many timing measurements, how much of a secret guess was correct. Human processes matter too: a valid encrypted connection to a convincing phishing site still protects traffic to the attacker.`,
    `After a token-signing key leaks into a public repository, changing the encryption algorithm does not solve the incident. The team must revoke or rotate the key, invalidate affected tokens, inspect logs, remove excessive access, and prevent recurrence with secret scanning and managed key storage. The lesson is to trace generation, use, storage, backup, access, and retirement—not just algorithm names.`,
  ),
  topic(
    "quantum-backdoors",
    "HOUR 4 NOBODY BREAKS THE MATH — THINGS FALL APART AT THE SEAMS",
    "Keys, people, sloppy code, and governments: where every real-world break has come from.",
    `A sufficiently capable quantum computer would threaten widely used public-key systems through Shor’s algorithm, while symmetric encryption and hashes face a smaller square-root speedup from Grover’s algorithm. Such machines do not yet break today’s internet at scale, but long-lived secrets can be collected now and decrypted later.

Organizations should inventory cryptography, identify data that must remain secret for years, adopt standardized post-quantum algorithms through tested upgrades, and build **crypto agility** rather than panic-switching to inventions. A mandated backdoor is a deliberate extra access path: it cannot reliably remain usable only by approved people, and it enlarges the system’s attack surface.`,
    `Post-quantum algorithms run on ordinary computers; “post-quantum” describes the attacks they resist. Migration is difficult because protocols, certificates, devices, performance, and compatibility all change. Hybrid deployments can combine established and post-quantum methods while standards and implementations mature, but only with careful validation.`,
    `A hospital archive that must stay confidential for thirty years has more urgency than a public weather feed. It should locate vulnerable key exchange and signatures, prioritize long-lived records, test supported standardized replacements, and plan certificate and device updates. Installing an unreviewed “quantum-proof” product or weakening encryption for exceptional access creates immediate risk rather than managing the future one.`,
  ),
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
    type?: "multiple_choice" | "freeform";
    options?: string[];
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>;
};

const ASSIGNMENTS: SeedAssignment[] = [
  {
    kind: "homework",
    title: "Practice — Codes, patterns, and perfect secrecy",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Choose the best answer. Short written responses are graded on substance, not form.",
    problems: [
      {
        topicSlug: "secret-alphabets",
        type: "multiple_choice",
        prompt: "What best explains why Alder Society's fixed substitution remains breakable?",
        options: ["It preserves repeated language patterns.", "Its alphabet has too few symbols.", "It requires a public key.", "It destroys all word boundaries."],
        correctAnswer: "It preserves repeated language patterns.",
        explanation: "Full credit connects multiple observable patterns to fixed-substitution leakage and recommends a structural remedy.",
      },
      {
        topicSlug: "one-time-pad",
        type: "multiple_choice",
        prompt: "What does reusing yesterday's one-time pad expose?",
        options: ["A relationship between the two plaintexts.", "The courier's identity.", "The random generator's source code.", "Every possible key equally."],
        correctAnswer: "A relationship between the two plaintexts.",
        explanation: "Full credit identifies cancellation under reuse and ties the remedy to the pad’s exact operating conditions.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Practice — Machine encryption and passwords",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Choose the best answer. Short written responses are graded on substance, not form.",
    problems: [
      {
        topicSlug: "block-encryption",
        type: "multiple_choice",
        prompt: "Why are silhouettes visible in Mira's independently encrypted image blocks?",
        options: ["Equal plaintext blocks produce equal ciphertext blocks.", "The key is necessarily too short.", "Hashes reveal the original pixels.", "Authentication decrypts the image."],
        correctAnswer: "Equal plaintext blocks produce equal ciphertext blocks.",
        explanation: "Full credit distinguishes cipher strength from mode misuse and includes nonce uniqueness plus integrity.",
      },
      {
        topicSlug: "hashes-passwords",
        type: "multiple_choice",
        prompt: "Which storage redesign best addresses fast unsalted password hashes?",
        options: ["Unique salts plus a memory-hard password hash.", "Encrypt all hashes with one public key.", "Use the username as a secret salt.", "Remove login rate limits."],
        correctAnswer: "Unique salts plus a memory-hard password hash.",
        explanation: "Full credit explains the distinct roles of salts and password-hashing cost without claiming that guessing becomes impossible.",
      },
    ],
  },
  {
    kind: "test",
    title: "Course Test — Cryptography and Digital Trust",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 20,
    instructions: "Timed. Choose the best answer or respond briefly; grading considers substance, not writing form.",
    problems: [
      {
        topicSlug: "key-agreement",
        type: "multiple_choice",
        prompt: "What should Lina do after key agreement produces a certificate-name warning?",
        options: ["Stop because the peer is not authenticated.", "Continue because encryption proves identity.", "Email the session key to the bank.", "Reuse the session without certificates."],
        correctAnswer: "Stop because the peer is not authenticated.",
        explanation: "Full credit separates secrecy from peer authentication and explains the active middle-person path.",
      },
      {
        topicSlug: "public-keys-signatures",
        prompt: "A mirror can replace an installer and manifest but lacks the vendor's signing key. What must customers verify, and what does the signature not provide?",
        correctAnswer: "Customers must verify the exact files with an authentically obtained vendor public key; the signature provides origin and integrity, not confidentiality.",
        explanation: "Full credit traces trust in the public key, exact signed content, integrity, and the absence of confidentiality.",
      },
      {
        topicSlug: "implementation-failures",
        prompt: "A payment device seeds keys from the current second and compares tags with an early return. What are the two failures and fixes?",
        correctAnswer: "Clock-seeded keys are guessable and need cryptographic randomness; early-return tag checks leak timing and need a vetted constant-time comparison.",
        explanation: "Full credit connects each implementation detail to a distinct attack and gives operational remediation.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final — Cryptography: Secrets, Locks, and Digital Trust",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 25,
    instructions: "Timed cumulative final. Answer briefly and directly; grading considers conceptual substance, not length or form.",
    problems: [
      {
        topicSlug: "hashes-passwords",
        prompt: "Northbridge uses fast unsalted password hashes and leaked its reset-token signing key. State the immediate containment and redesign.",
        correctAnswer: "Rotate the signing key and invalidate tokens, then move signing to restricted key storage; rehash passwords with unique salts and a memory-hard function.",
        explanation: "Full credit separates password verification from token authenticity and combines containment, migration, and private-key controls.",
      },
      {
        topicSlug: "quantum-backdoors",
        prompt: "An archive needs 30-year secrecy. Assess an unpublished 'quantum-proof' cipher and a universal access key, then name a safer migration.",
        correctAnswer: "Reject both unreviewed crypto and the high-value backdoor; inventory long-lived risks and stage standardized post-quantum or hybrid upgrades with crypto agility.",
        explanation: "Full credit weighs time horizon, standardized post-quantum migration, differing risks, and the systemic weakness of backdoors.",
      },
    ],
  },
];

export async function seedReasoningPrimersIfMissing(): Promise<void> {
  // Diagnostics now carry their own instructions and blueprints. Remove legacy
  // primer lectures so the four-hour curriculum remains exactly eight lectures.
  const stale = await db
    .delete(topicsTable)
    .where(like(topicsTable.slug, "reasoning-primer-%"))
    .returning({ slug: topicsTable.slug });
  if (stale.length > 0) {
    logger.info({ removed: stale.map((s) => s.slug) }, "Reasoning primers: removed obsolete primers");
  }
}

export async function seedIfEmpty(): Promise<void> {
  const markerTopic = await db
    .select({ id: topicsTable.id })
    .from(topicsTable)
    .where(eq(topicsTable.slug, "secret-alphabets"));
  let currentVersion: string | null = null;
  try {
    const storedVersion = await db
      .select({ value: seedMetaTable.value })
      .from(seedMetaTable)
      .where(eq(seedMetaTable.key, "content_version"));
    currentVersion = storedVersion[0]?.value ?? null;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Seed: seed_meta unavailable, treating version as unset");
  }
  if (markerTopic.length > 0 && currentVersion === SEED_CONTENT_VERSION) {
    logger.info("Seed: course content present and current, skipping");
    return;
  }

  await db.transaction(async (tx) => {
    const existing = await tx.execute(sql`select count(*)::int as n from topics`);
    const row = (existing.rows[0] ?? {}) as { n?: number };
    if ((row.n ?? 0) > 0) {
      logger.warn("Seed: stale course content detected — replacing with Cryptography");
      await tx.execute(
        sql`TRUNCATE TABLE answers, attempts, practice_attempts, practice_problems, practice_sessions, problems, assignments, lectures, topics, diagnostic_responses, diagnostic_attempts, diagnostic_items, diagnostic_assessments RESTART IDENTITY CASCADE`,
      );
    }

    const slugToTopicId = new Map<string, number>();
    for (let i = 0; i < TOPICS.length; i++) {
      const t = TOPICS[i]!;
      const [inserted] = await tx
        .insert(topicsTable)
        .values({ slug: t.slug, title: t.title, weekNumber: t.weekNumber, blurb: t.blurb, position: i })
        .returning();
      if (!inserted) throw new Error(`Failed to insert topic ${t.slug}`);
      slugToTopicId.set(t.slug, inserted.id);
      await tx.insert(lecturesTable).values({
        topicId: inserted.id,
        weekNumber: t.weekNumber,
        title: t.lectureTitle,
        body: t.body,
        bodyMedium: t.bodyMedium,
        bodyLong: t.bodyLong,
      });
    }

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
          type: prob.type ?? "freeform",
          options: prob.options ?? null,
          correctAnswer: prob.correctAnswer,
          explanation: prob.explanation,
          hint: prob.hint ?? null,
        });
      }
    }

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