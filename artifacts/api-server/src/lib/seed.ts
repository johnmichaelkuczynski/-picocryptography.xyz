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
const SEED_CONTENT_VERSION = "2026-08-25-cloud-architecture-v1";

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

const TOPICS: SeedTopic[] = [
  {
    slug: "building-blocks",
    title: "The building blocks",
    weekNumber: 1,
    blurb:
      "Understand cloud computing through its four primitives—compute, storage, network, and identity—and learn how provider services combine them into dependable systems.",
    lectureTitle: "The building blocks",
    body: `# The building blocks

Cloud computing means **renting capacity instead of owning hardware**. AWS or Azure operates the physical facilities, but the customer still chooses the architecture, configures access, protects data, and pays for what runs. The ownership boundary changes; responsibility does not disappear.

Most cloud services are variations on four primitives: **compute, storage, network, and identity**. Compute forms a ladder from virtual machines, to containers, to serverless functions. Moving up the ladder reduces operating work but also reduces control over the runtime.

Storage is not one interchangeable bucket. **Object storage** suits durable files and blobs, **block storage** behaves like a disk attached to a machine, and **file storage** gives several systems a shared hierarchy. Managed relational and key-value databases remove routine infrastructure work, but schema, indexing, capacity, backups, and access remain design responsibilities.

Geography also shapes the architecture. A **region** is a geographic market; **availability zones** are isolated locations within it. A virtual private cloud or virtual network, subnets, routes, and security groups control how resources communicate. **Identity and access management** controls who or what may act. Least privilege matters because a broad permission can expose an otherwise well-written system.`,
    bodyMedium: `# The building blocks

## Renting changes the boundary

In a private data center, an organization buys servers, installs them, replaces failed hardware, and plans capacity months ahead. In AWS or Azure, it rents services on demand. The provider maintains buildings, power, cooling, and physical equipment; the customer still chooses regions, network boundaries, identities, data placement, resilience, and cost controls. Cloud architecture begins by drawing that responsibility boundary accurately.

## Four primitives under every service

Nearly every named cloud product combines **compute, storage, network, and identity**. A managed web platform still runs compute, reads and writes storage, communicates over a network, and authorizes identities. Product names change across AWS and Azure, but these primitives make unfamiliar services easier to reason about.

## Compute on a ladder

A **virtual machine** gives the most operating-system control and the most patching responsibility. A **container** packages an application and its dependencies while sharing more of the host environment. A **serverless function** runs short units of code when triggered and removes server management, but introduces execution limits, cold starts, and tighter provider constraints. The right rung depends on control, portability, workload shape, and operational capacity.

## Storage and databases

**Object storage** is durable and scalable for media, backups, logs, and static assets, but it is not a normal mounted disk. **Block storage** is suited to low-latency disk access for one machine or database node. **File storage** supports shared file semantics across clients. Choosing the wrong type creates unnecessary cost, latency, or coordination problems.

Managed relational databases preserve tables, joins, and transactions while the provider automates much of the underlying operation. Managed key-value systems favor predictable access patterns and horizontal scale. “Managed” does not mean “someone else's problem”: teams still own schema choices, queries, permissions, backup policy, recovery testing, and cost.

## Regions and availability zones

A **region** determines latency, regulation, service availability, and price. Multiple **availability zones** within a region reduce exposure to a single facility failure, but only if the application and data are actually distributed across them. Copying a diagram across zones without testing failover is not resilience.

## Network and identity boundaries

A virtual private cloud or virtual network defines an isolated address space. **Subnets** separate public entry points from private application and data tiers. Routes decide where traffic can go; security groups or network security groups act as stateful gates. Identity policies decide which people and workloads may perform actions. Start with no access and add only what is required: least privilege limits the blast radius of mistakes and stolen credentials.`,
    bodyLong: `# The building blocks

## Renting instead of owning

Cloud computing replaces capital ownership with on-demand access to someone else's infrastructure. This creates speed and elasticity: a team can provision capacity in minutes and release it when demand falls. It also changes failure and cost behavior. A forgotten resource keeps billing, a provider outage can affect many services at once, and a misconfigured permission can expose resources globally.

The provider secures the physical data centers, networking fabric, and managed-service substrate. The customer decides what to deploy, where to deploy it, how identities are authorized, how data is encrypted, and how the application recovers. Exact boundaries vary by service: a virtual machine leaves more operating-system work to the customer than a serverless function.

## The four primitives

Use four questions to decode any cloud design. **Compute:** where does code execute, for how long, and with what isolation? **Storage:** what persists, under which access and durability model? **Network:** which components can communicate, through which routes and controls? **Identity:** which human or workload may perform each action? Named services are useful implementations, but the primitive questions prevent product catalogs from replacing architecture.

## Compute choices and their tradeoffs

Virtual machines provide operating-system access, custom networking, long-running processes, and broad software compatibility. That control includes patching, image maintenance, scaling, and process supervision. Containers standardize packaging and deployment while leaving orchestration, image security, and cluster or platform choices. Serverless functions scale around events and charge for execution, but impose runtime, duration, networking, and observability constraints.

Consider the same checkout API built three ways. A pair of virtual machines may be cheap at steady load but require patching and manual capacity decisions. Containers make packaging repeatable and horizontal scaling easier, but introduce an orchestrator or managed container platform. Serverless functions remove idle servers and absorb bursts, yet may cost more at sustained high volume and constrain long-running work. The cheapest first month can become the hardest architecture to change.

## Storage is not one thing

Object storage addresses data by key and excels at durable blobs, backups, logs, data lakes, and static content. Block storage exposes disk-like volumes for filesystems and database engines. File storage presents shared directories and file-locking semantics. The access model must match the workload. Treating object storage like a mounted disk creates awkward rewrites; putting a large media archive on premium block volumes wastes money.

Durability and availability are different. A service may preserve data even while an endpoint is temporarily unavailable. Lifecycle rules, replication, retention, and encryption should follow business requirements rather than defaults.

## Databases as a service

Managed relational databases automate hardware replacement, patching windows, backups, and replicas while preserving SQL and transactional structure. Managed key-value databases scale around known partition and access patterns. The provider can operate the service, but it cannot choose a sound schema, prevent an unbounded query, define acceptable data loss, or decide who should read sensitive records.

Before selecting a database, identify consistency needs, transactions, query patterns, growth, recovery targets, and team expertise. A service is not simpler merely because provisioning takes one click.

## Geography is architecture

Regions affect user latency, data residency, disaster exposure, service availability, and cost. Availability zones provide independent power and facilities within a region. A multi-zone architecture places redundant application instances and data paths across those zones, removes single-zone dependencies, and proves failover through testing.

Multi-region systems can reduce global latency or survive a regional failure, but they add replication delay, conflict handling, higher cost, and operational complexity. Use them when the recovery requirement justifies them, not because the diagram looks more advanced.

## Virtual networks, subnets, and gates

A VPC in AWS or virtual network in Azure gives resources a controlled address space. Public subnets host components that must receive internet traffic, such as load balancers. Private subnets keep application and data services away from direct public reach. Route tables describe paths; gateways connect networks; security groups or network security groups allow only required flows.

A strong design can explain every permitted connection. The public load balancer may reach application instances on one port; application instances may reach the database on another; the database has no direct internet route. “Inside the network” is not sufficient authorization, so identity and encryption still apply.

## Identity, access, and least privilege

Identity is the control plane for every cloud action. Human users, applications, automation, and managed services should use distinct identities with short-lived credentials where possible. Policies should grant specific actions on specific resources under specific conditions. Broad administrator permissions are convenient during setup and dangerous in operation.

Many cloud breaches are permission failures rather than novel code exploits: a public storage container, an exposed access key, or a workload role that can read every secret. Least privilege, multi-factor authentication, workload identities, permission review, and audit logs reduce the likelihood and blast radius of those failures.

## A reusable selection method

For each component, state the workload, required control, persistence model, communication paths, identity, geographic requirement, failure behavior, and cost shape. Then choose services. Architecture starts with constraints and evidence; provider product names come after the reasoning.`,
  },
  {
    slug: "designing-for-real-use",
    title: "Designing for real use",
    weekNumber: 1,
    blurb:
      "Design cloud systems for traffic, failures, recovery, cost, portability, observability, and security instead of treating deployment as the finish line.",
    lectureTitle: "Designing for real use",
    body: `# Designing for real use

A cloud diagram becomes an architecture only when it explains how the system behaves under traffic, failure, recovery, and change. **Scaling up** gives one machine more capacity; **scaling out** adds machines. Horizontal scaling usually wins for resilience, but it requires a load balancer and application instances that do not depend on local session state.

Designing for failure means assuming instances, zones, dependencies, and deployments will break. Redundancy keeps service available; backups preserve data; recovery objectives define how much data loss and downtime the business can tolerate. A backup that has never been restored is only a hope.

Pay-per-use makes cost a design constraint. Managed services can reduce operational work, while self-hosting can preserve control and portability; neither is automatically cheaper. **Infrastructure as code** makes the architecture reviewable and repeatable. **Logs, metrics, and traces** make behavior visible.

Security follows the shared responsibility model. Encrypt data, protect secrets, minimize permissions, patch what you own, and test recovery. A stateless application spread across zones can survive a traffic spike and an instance loss; a single stateful server with no tested backup may fail even when its code is correct.`,
    bodyMedium: `# Designing for real use

## Scale up or scale out

**Vertical scaling** replaces a machine with a larger one. It is simple but has a ceiling and often requires interruption. **Horizontal scaling** adds interchangeable instances behind a load balancer. It improves elasticity and failure tolerance, but only when work can be distributed and instances do not hide essential state on local disks or memory.

## Load balancing and statelessness

A load balancer accepts traffic, checks instance health, and routes requests only to healthy targets. The application should keep durable state in shared services such as databases, object storage, or caches rather than on one instance. Then any request can reach any healthy instance, and failed capacity can be replaced.

## Design for failure and recovery

Redundant instances across availability zones protect against a machine or facility failure. Backups protect against deletion, corruption, and some disasters. They solve different problems. Define a **recovery time objective** for acceptable downtime and a **recovery point objective** for acceptable data loss, then design and test against them.

## Cost, managed services, and lock-in

Cloud bills follow resources, requests, data transfer, storage class, and reserved capacity. Architecture should expose the cost drivers before launch. Managed services reduce patching and routine operations but may cost more, restrict configuration, or create provider-specific dependencies. Self-hosting increases control and portability while moving availability, patching, scaling, and backups back to the team.

## Infrastructure as code and observability

Infrastructure as code records networks, identities, compute, and data services in reviewable files. Teams can reproduce environments, inspect changes, and roll back through normal delivery controls. Observability combines **logs** for events, **metrics** for numerical trends, and **traces** for a request's path across services. Alerts should point to user impact and a responsible owner.

## Security posture

Encrypt data in transit and at rest, keep secrets outside source code, rotate credentials, and grant least privilege. The cloud provider secures the infrastructure it operates; the customer secures identities, configuration, applications, and data according to the service model. Shared responsibility must be mapped component by component, not treated as a slogan.`,
    bodyLong: `# Designing for real use

## Begin with demand and failure, not a service catalog

A production architecture should state expected traffic, latency, availability, data durability, recovery, security, compliance, and cost constraints. Those requirements determine where redundancy is needed and which managed services are justified. “Use the cloud” is not a requirement, and a diagram without failure behavior is not yet an operating design.

## Scaling up versus scaling out

Vertical scaling adds CPU, memory, or faster storage to one machine. It can be the correct early choice for a database or a modest application because it preserves simplicity. Its limits are maximum machine size, maintenance interruption, and a larger single failure domain.

Horizontal scaling adds multiple instances. Capacity can grow and shrink incrementally, and one instance can fail without ending the service. The application must support concurrency, distribute work, and avoid local state that only one instance can see. Scaling out wins when demand varies or availability matters, but it adds coordination and observability needs.

## Load balancing and stateless application tiers

A load balancer provides one entry point and routes requests across healthy targets. Health checks should verify that an instance can actually serve useful traffic, not merely that a process exists. Session data, uploads, and durable work should live in shared stores. Idempotent request handling and queue-based background work help the system tolerate retries.

Imagine a ticket launch. A stateless web tier scales from four instances to forty while a managed queue absorbs slower confirmation work. A competitor keeps carts in local memory on two servers. When traffic shifts or one server fails, customers lose sessions. The traffic spike exposed an architecture decision, not a lack of raw CPU.

## Everything breaks

Instances terminate, networks partition, credentials expire, dependencies throttle, zones fail, and operators make mistakes. Design timeouts, retries with backoff, circuit breakers, queues, and graceful degradation around those facts. Retries must be bounded and safe; uncontrolled retries can turn a partial outage into a full one.

Redundancy removes single points of failure only when dependencies are also redundant. Two application instances that share one database in one zone still depend on that zone. Failover paths need regular exercises so documentation and actual behavior do not diverge.

## Redundancy, backup, and recovery objectives

Redundancy keeps a service operating through component failure. Backups preserve recoverable copies after deletion or corruption. Replication can copy corruption quickly, so it does not replace backups. Define the **RTO**—how long recovery may take—and the **RPO**—how much recent data may be lost.

These objectives drive design. A five-minute RTO may require warm standby capacity and automated failover. A 24-hour RTO may allow restoration from backups. Test restores, measure time, verify application consistency, and record whether the exercise met both objectives.

## Pay-per-use is a design constraint

Costs arise from active compute, provisioned capacity, stored bytes, request counts, managed-service tiers, data transfer, logging, backups, and idle environments. Track unit economics such as cost per customer, request, or workload. Tag resources, set budgets, remove idle capacity, and select storage and compute based on workload shape.

The lowest list price is not always the lowest total cost. A self-hosted database may look cheaper until patching, on-call work, backup testing, and downtime are included. A fully managed service may be expensive at high scale. Architecture should make the tradeoff explicit.

## Managed services, self-hosting, and lock-in

Managed services transfer routine operation to the provider and can improve reliability for a small team. They also introduce service limits, provider-specific APIs, migration work, and concentrated dependency. Self-hosting offers control and potentially easier portability, but the team owns upgrades, scaling, security hardening, availability, and recovery.

Evaluate lock-in by likely change, not fear alone. Standard protocols, exportable data, clear boundaries, and infrastructure as code can preserve options. Deliberately accepting provider-specific features can be rational when their operational value exceeds plausible migration cost.

## Infrastructure as code

Infrastructure as code turns architecture into versioned, reviewable definitions. A change to a network rule or database tier can pass through peer review, automated validation, and deployment history. Reusable modules reduce drift across development, staging, and production.

State, secrets, and provider permissions still require care. Plans should be reviewed before application; destructive changes need safeguards; emergency console changes should be reconciled back into code. The goal is reproducibility and accountability, not merely automation.

## Logs, metrics, and traces

Logs capture discrete events with context. Metrics summarize rates, errors, latency, saturation, and business outcomes over time. Traces follow one request across distributed services. Together they let a team move from “users report checkout is slow” to the dependency and operation consuming the latency budget.

Observability should be designed with the system. Use correlation identifiers, structured logs, service-level indicators, actionable alerts, retention controls, and dashboards tied to user impact. Unlimited logging can leak sensitive data and create large bills, so collection itself needs architecture.

## Security and shared responsibility

Encrypt traffic and stored data, centralize secrets, rotate credentials, patch customer-managed systems, restrict public exposure, and record privileged actions. Identity policies should be specific; network controls provide another layer but do not replace authorization.

The shared responsibility boundary moves with the service. On a VM, the customer patches the operating system. On a managed database, the provider patches more of the platform while the customer owns data access, configuration, schema, and application behavior. On serverless compute, the provider owns still more runtime operation, but insecure code and excessive permissions remain the customer's responsibility.

## A production-readiness review

Before launch, ask: Can instances be replaced without losing state? What happens when a zone or dependency fails? Are backups restorable within the stated RTO and RPO? Which resources drive cost? Can the environment be recreated from code? Do logs, metrics, and traces reveal user impact? Which security duties belong to the provider and which remain ours? A design is ready when these answers are tested, not merely documented.`,
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
    title: "Homework 1 — The building blocks",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering Session 1. Explain each concrete case in 3–5 reasoned sentences. Definitions and one-word answers do not receive credit.",
    problems: [
      {
        topicSlug: "building-blocks",
        prompt:
          "Northstar Media stores a growing video archive on premium block volumes attached to one virtual machine. Costs are rising, uploads stop whenever that machine is replaced, and viewers only need to fetch complete video files. Recommend a better storage design and explain why it fits the access pattern. (3–5 sentences.)",
        correctAnswer:
          "Move the durable video objects to object storage because they are retrieved as whole blobs, need independent durability, and should not depend on one VM's attached disk. Serve them through controlled object access or a content-delivery layer, and keep only temporary processing space on block storage. The design lowers cost, removes the single-machine dependency, and lets compute instances be replaced or scaled independently.",
        explanation:
          "Full credit connects whole-file access to object storage and explains the durability, cost, and compute-decoupling consequences.",
      },
      {
        topicSlug: "building-blocks",
        prompt:
          "Priya deploys a payroll service on a public virtual machine whose role can read every storage bucket and secret in the account. The application needs one private database and one payroll-export bucket. Redesign its network and identity boundaries using least privilege. (3–5 sentences.)",
        correctAnswer:
          "Place the application in a private subnet behind a controlled public entry point rather than exposing the VM directly. Give its workload identity permission only to connect to the payroll database and read or write the named export bucket, while denying unrelated secrets and storage. Restrict network flows to the required ports and record access so a compromised instance has a limited blast radius.",
        explanation:
          "Full credit combines private networking, restricted flows, workload identity, and resource-specific permissions instead of relying on one broad account role.",
        hint: "Separate where traffic may flow from which cloud actions the workload may perform.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2 — Designing for real use",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering Session 2. Connect each observed failure to an architectural change in 3–5 reasoned sentences. Definitions and one-word answers do not receive credit.",
    problems: [
      {
        topicSlug: "designing-for-real-use",
        prompt:
          "Harbor Tickets runs two web servers behind a load balancer, but each server keeps customer carts in local memory. During a launch, scaled-out instances send returning customers to different servers and their carts disappear. Explain the architectural failure and redesign the state handling. (3–5 sentences.)",
        correctAnswer:
          "The web tier is not stateless, so the load balancer cannot safely route each request to any healthy instance. Move cart state to a shared durable database or managed cache with an appropriate persistence policy, and keep application instances interchangeable. Then the platform can add, replace, or remove instances without losing customer state.",
        explanation:
          "Full credit identifies local state as the barrier to horizontal scaling and moves durable session data to a shared service.",
      },
      {
        topicSlug: "designing-for-real-use",
        prompt:
          "Mateo's team copies its production database into a second availability zone and calls disaster recovery complete, but it has never restored a backup or measured failover. The business allows at most 15 minutes of data loss and one hour of downtime. Design a testable recovery plan. (3–5 sentences.)",
        correctAnswer:
          "Translate the business limits into an RPO of 15 minutes and an RTO of one hour. Use multi-zone redundancy for service continuity, maintain backups or point-in-time recovery that satisfy the RPO, and regularly restore into an isolated environment while timing the process. Test application failover and data consistency, because replication alone can copy corruption and an untested backup does not prove recovery.",
        explanation:
          "Full credit distinguishes redundancy from backup and ties restore and failover tests to the stated RPO and RTO.",
      },
    ],
  },
  {
    kind: "test",
    title: "Course Test — Cloud Architecture",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 15,
    instructions:
      "Timed. 15 minutes. Covers both sessions. Analyze each concrete engineering case in 4–6 sentences. Definitions and unsupported one-line recommendations do not receive credit. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "building-blocks",
        prompt:
          "Atlas Health must place a patient portal in one cloud region. Users need a public HTTPS endpoint, but application instances and the relational database must not be directly reachable from the internet. Design the network, identity, and availability-zone layout. (4–6 sentences.)",
        correctAnswer:
          "Place a managed load balancer in public subnets and application instances in private subnets across at least two availability zones. Put the managed relational database in private data subnets with multi-zone capability and allow database traffic only from the application security group. Give the application a workload identity with only the required database and secret permissions, while administrators use separate controlled identities. Encrypt traffic and data, and avoid public addresses on application and database resources.",
        explanation:
          "Full credit connects public entry, private tiers, multi-zone placement, restricted security-group flows, workload identity, and encryption.",
      },
      {
        topicSlug: "designing-for-real-use",
        prompt:
          "A retailer expects a flash sale to produce ten times normal traffic for two hours. Its current application runs on one large VM, writes uploaded receipts to local disk, and deploys by changing that machine manually. Redesign for the spike, replaceability, and repeatable operations. (4–6 sentences.)",
        correctAnswer:
          "Run multiple stateless application instances or containers behind a load balancer with autoscaling based on tested demand signals. Move receipts to object storage and shared application state to managed data services so instances can be replaced without data loss. Define the network, identities, scaling rules, and services as infrastructure as code instead of manual changes. Add health checks, metrics, logs, and a rollback-capable deployment process, then load-test the architecture before the sale.",
        explanation:
          "Full credit integrates horizontal scaling, statelessness, object storage, infrastructure as code, observability, testing, and rollback.",
      },
      {
        topicSlug: "designing-for-real-use",
        prompt:
          "A legal-document service promises recovery within two hours with no more than ten minutes of lost uploads. It has multi-zone compute but keeps one database and has nightly backups that nobody has restored. Explain the gaps and design recovery evidence that would justify the promise. (4–6 sentences.)",
        correctAnswer:
          "The stated RTO is two hours and the RPO is ten minutes, but nightly backups cannot satisfy the RPO and multi-zone compute does not protect the single database. Add database redundancy and continuous or frequent point-in-time recovery that can meet ten minutes of data loss. Run scheduled failover and isolated restore exercises, time each step, verify document consistency, and record whether both objectives were met. Keep runbooks and observability for the recovery path, not only normal operation.",
        explanation:
          "Full credit maps the promise to RTO/RPO, finds the single data-tier failure, and requires measured failover and restore tests.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final — Cloud Architecture",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 25,
    instructions:
      "Timed cumulative final. 25 minutes. Analyze each end-to-end case in 5–7 sentences connecting multiple course decisions. Definitions and unsupported labels do not receive credit. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "building-blocks",
        prompt:
          "A research publisher is moving an internal manuscript platform to AWS or Azure. It needs a public web entry point, private application and database tiers, durable document storage, controlled staff access, and continued service through one availability-zone failure. Trace a defensible architecture from the four primitives through regional placement and permissions. (5–7 sentences.)",
        correctAnswer:
          "Use a public managed load balancer as the only internet entry point and place interchangeable application compute in private subnets across at least two availability zones. Store manuscripts in encrypted object storage and use a managed relational database in private data subnets with multi-zone resilience and tested backups. Security groups should allow only the required load-balancer-to-application and application-to-database flows. Workload identities should receive resource-specific permissions, while staff use separate roles with multi-factor authentication and least privilege. Choose the region based on user latency and data-residency requirements, record audit activity, and verify that losing one zone leaves a healthy path to compute and data.",
        explanation:
          "Full credit integrates compute, storage, network, identity, geography, multi-zone design, least privilege, and recovery rather than listing services without relationships.",
      },
      {
        topicSlug: "designing-for-real-use",
        prompt:
          "After a product launch, an online marketplace suffers timeouts, duplicate orders from retries, rapidly rising cloud costs, and an hour-long recovery after one zone fails. The environment was created manually and the team has logs but no metrics or traces. Diagnose the architectural failures and give a safe improvement plan. (5–7 sentences.)",
        correctAnswer:
          "Contain the incident by stabilizing traffic, protecting order integrity, and failing over to known-good capacity while preserving evidence. Make order operations idempotent, use bounded retries with backoff, and move slow work through queues so retries do not multiply damage. Run stateless application instances across zones behind a load balancer and remove any single-zone data dependency, with recovery designed to explicit RTO and RPO targets. Recreate the environment as reviewed infrastructure as code, add metrics for rates, errors, latency, saturation, and cost, and add traces to locate slow dependencies. Attribute spending to services and unit demand, then test autoscaling, zone failure, restore, and rollback before the next launch. Recheck least privilege, secrets, encryption, and the shared-responsibility boundary during the redesign.",
        explanation:
          "Full credit integrates containment, idempotency, scaling, resilience, recovery objectives, infrastructure as code, observability, cost, and security.",
      },
    ],
  },
];

type SeedPrimer = Omit<SeedTopic, "bodyMedium" | "bodyLong">;

const REASONING_PRIMERS: SeedPrimer[] = [
  {
    slug: "reasoning-primer-subject",
    title: "How to reason about cloud-architecture cases",
    weekNumber: 1,
    blurb:
      "Diagnostic primer: applying Cloud Architecture concepts to concrete deployment and operations cases.",
    lectureTitle: "Primer: How to reason about cloud-architecture cases",
    body: `# How to reason about cloud-architecture cases

This primer prepares you for the **Cloud Architecture** diagnostic. It is ungraded, fresh on every attempt, and asks you to apply the two sessions rather than recite terms.

## It tests application, not memorization

A question gives a short scene: a public database is reachable from the internet, a workload has account-wide permissions, a load-balanced application loses local sessions, or an untested nightly backup cannot meet a ten-minute recovery point. Name the cloud-architecture idea that explains the failure and point to the scene detail that decides it.

## What the questions reward

- **Naming the right idea** — distinguish compute, storage, network, and identity choices; vertical and horizontal scaling; redundancy and backup; recovery objectives; cost, observability, and shared responsibility.
- **Using evidence from the scene** — point to the detail in the situation that supports your answer, rather than answering from a general impression.
- **Choosing the right operating layer** — decide whether the remedy belongs in resource selection, network boundaries, permissions, state management, failure recovery, infrastructure as code, observability, or security.

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

This short primer prepares you for the **General Reasoning** diagnostic — an ungraded, fresh-attempt check of five genuine reasoning skills. The skills remain domain-general, with cloud-architecture examples showing how they guide engineering judgment.

## The five skills

- **Analysis** separates layers and assumptions. A timeout caused by a saturated database is different from one caused by an unhealthy application instance.
- **Inference** distinguishes what a signal proves from what it merely suggests. Rising CPU may justify investigation; by itself it does not prove horizontal scaling is the only solution.
- **Evaluation** asks whether evidence supports a decision. A successful backup job cannot justify a recovery claim without a measured restore.
- **Deduction** identifies architectural guarantees. If every request can reach any stateless instance and durable state is shared, replacing one instance does not erase a session.
- **Induction** generalizes cautiously from samples. One successful failover test supports limited confidence; repeated tests under representative load support a stronger claim.

## A recurring trap: things that move together

Most wrong answers sound plausible but outrun the evidence. Keep apart what facts show, what architecture guarantees, what you assume, and what is only possible. A multi-zone diagram suggests redundancy; a measured zone-failure exercise is stronger evidence that the system actually recovers.

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
  // Detect the current curriculum marker. If present and version-matched, the
  // marker topic; if present and the content version matches, the content is
  // current and we skip. This makes the seed self-healing across environments:
  // a database that still holds older content (e.g. a previous curriculum) is
  // detected and replaced on boot.
  const markerTopic = await db
    .select({ id: topicsTable.id })
    .from(topicsTable)
    .where(eq(topicsTable.slug, "building-blocks"));
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
        "Seed: stale course content detected — replacing with Cloud Architecture",
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
        bodyMedium: t.bodyMedium,
        bodyLong: t.bodyLong,
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
