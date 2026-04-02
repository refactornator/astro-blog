// harness/orchestrator.js — Main optimization loop.
// Entry point: bun harness/orchestrator.js

import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { getMetrics } from "./posthog.js"

const EXPERIMENTS_FILE = path.resolve("./experiments.json")
const MIN_SESSIONS = parseInt(process.env.MIN_SESSIONS ?? "5", 10)
const DRY_RUN = process.env.DRY_RUN === "true"
const AUTO_PUSH = process.env.AUTO_PUSH === "true"

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + "%" : "no data"
}

// ── Brief generation (inlined, no separate analyzer) ──────────────────────────

function generateBrief(metrics, experiments) {
  const issues = []

  if (metrics.home_bio_social_ctr != null && metrics.home_bio_social_ctr < 0.05) {
    issues.push({
      severity: 3,
      element: "home_bio_social",
      metric: "home_bio_social_ctr",
      value: metrics.home_bio_social_ctr,
      suggestion:
        "the bio text or social link presentation in src/pages/index.astro — make the links more prominent or the bio more compelling",
    })
  }

  if (metrics.footer_social_ctr != null && metrics.footer_social_ctr < 0.02) {
    issues.push({
      severity: 2,
      element: "footer_social",
      metric: "footer_social_ctr",
      value: metrics.footer_social_ctr,
      suggestion:
        "the footer social icons in src/components/Footer.astro — consider adding labels or changing icon sizing",
    })
  }

  if (metrics.projects_nav_ctr != null && metrics.projects_nav_ctr < 0.15) {
    issues.push({
      severity: 2,
      element: "nav_projects",
      metric: "projects_nav_ctr",
      value: metrics.projects_nav_ctr,
      suggestion:
        "the navigation in src/components/Nav.astro — consider reordering links or changing labels to draw more attention to Projects",
    })
  }

  // Fallback
  if (issues.length === 0) {
    issues.push({
      severity: 1,
      element: "home_bio_social",
      metric: "home_bio_social_ctr",
      value: metrics.home_bio_social_ctr,
      suggestion:
        "the bio copy in src/pages/index.astro — refine the opening line to better communicate value",
    })
  }

  // Pick highest severity not recently targeted
  const recentElements = experiments.slice(-5).map((e) => e.target_surface)
  issues.sort((a, b) => b.severity - a.severity)
  const target = issues.find((i) => !recentElements.includes(i.element)) ?? issues[0]

  const recentLines = experiments.length
    ? experiments
        .slice(-5)
        .map((e) => `  - ${e.id}: ${e.description} → ${e.verdict}`)
        .join("\n")
    : "  - No experiments run yet"

  return `# Optimization Brief — ${new Date().toISOString()}

## Current metrics (last ${metrics.window_hours}h, ${metrics.page_views} page views)
- Home bio social link CTR: ${pct(metrics.home_bio_social_ctr)}
- Footer social icon CTR: ${pct(metrics.footer_social_ctr)}
- Projects nav CTR: ${pct(metrics.projects_nav_ctr)}

## Recent experiments
${recentLines}

## Your task
Make one targeted change to improve **${target.metric}** (currently ${pct(target.value)}).
Focus specifically on: ${target.suggestion}

Rules:
- EXACTLY one change
- Do NOT remove or modify any data-track, data-track-surface, or data-track-label attributes
- Do NOT commit — the orchestrator handles commits
- Run \`bun run build\` to verify your change doesn't break the build
`
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function run() {
  log("=== Harness cycle starting ===")

  // Precondition: main tree must be clean (skip in dry-run mode)
  if (!DRY_RUN) {
    const status = execSync("git status --porcelain", { encoding: "utf8" }).trim()
    if (status) {
      log("ERROR: Working tree is dirty. Commit or stash changes before running the harness.")
      log(status)
      process.exit(1)
    }
  }

  const state = JSON.parse(fs.readFileSync(EXPERIMENTS_FILE, "utf8"))

  // 1. Fetch metrics
  log("Querying PostHog...")
  let metrics
  try {
    metrics = await getMetrics(48)
  } catch (err) {
    log(`ERROR: Failed to fetch metrics: ${err.message}`)
    process.exit(1)
  }
  log(
    `page_views=${metrics.page_views} home_bio_social_ctr=${pct(metrics.home_bio_social_ctr)} footer_social_ctr=${pct(metrics.footer_social_ctr)} projects_nav_ctr=${pct(metrics.projects_nav_ctr)}`,
  )

  // 2. Guard: need real traffic
  if (!metrics.page_views || metrics.page_views < MIN_SESSIONS) {
    log(`Only ${metrics.page_views ?? 0} page views (min: ${MIN_SESSIONS}). Skipping cycle.`)
    return
  }

  // 3. Resolve active experiment if conditions met
  const pending = [...state.experiments].reverse().find((e) => e.verdict === "pending")
  if (pending) {
    const hoursSinceDeploy =
      (Date.now() - new Date(pending.started_at).getTime()) / (1000 * 60 * 60)

    if (
      hoursSinceDeploy >= 24 &&
      metrics.page_views >= (pending.min_exposure_views ?? MIN_SESSIONS)
    ) {
      pending.metrics_after = {
        home_bio_social_ctr: metrics.home_bio_social_ctr,
        footer_social_ctr: metrics.footer_social_ctr,
        projects_nav_ctr: metrics.projects_nav_ctr,
      }

      const before = pending.metrics_before?.[state.primary_metric]
      const after = pending.metrics_after[state.primary_metric]

      if (before != null && after != null) {
        const delta = after - before
        if (delta > 0.005) pending.verdict = "improved"
        else if (delta < -0.005) pending.verdict = "regressed"
        else pending.verdict = "no_change"
      } else {
        pending.verdict = "no_data"
      }

      log(`Experiment ${pending.id} → ${pending.verdict}`)
    } else {
      log(
        `Experiment ${pending.id} only ${hoursSinceDeploy.toFixed(1)}h old / ${metrics.page_views} views — waiting.`,
      )
    }
  }

  // 4. Set baseline if first run
  if (!state.baseline) {
    state.baseline = {
      home_bio_social_ctr: metrics.home_bio_social_ctr,
      footer_social_ctr: metrics.footer_social_ctr,
      projects_nav_ctr: metrics.projects_nav_ctr,
      page_views: metrics.page_views,
      measured_at: metrics.measured_at,
    }
    log("Baseline recorded.")
  }

  // 5. Generate brief
  const brief = generateBrief(metrics, state.experiments)
  log("Brief generated.")

  if (DRY_RUN) {
    log("DRY_RUN=true — printing brief and stopping.")
    console.log("\n" + brief)
    // Save state updates (baseline, verdicts) even in dry run
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(state, null, 2) + "\n")
    return
  }

  // 6. Create disposable worktree
  const timestamp = Date.now()
  const worktreePath = `/tmp/harness-work-${timestamp}`
  const worktreeBranch = `harness-work-${timestamp}`
  const briefPath = `/tmp/harness-brief-${timestamp}.txt`

  try {
    execSync(`git worktree add ${worktreePath} -b ${worktreeBranch} HEAD`, {
      stdio: "inherit",
    })
    log(`Worktree created at ${worktreePath}`)
  } catch (err) {
    log(`ERROR: Failed to create worktree: ${err.message}`)
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(state, null, 2) + "\n")
    process.exit(1)
  }

  // 7. Write brief
  fs.writeFileSync(briefPath, brief, "utf8")

  // 8. Run Claude Code in the worktree
  const agentInstructions = path.resolve("./harness/AGENT_INSTRUCTIONS.md")
  const prompt = `Read ${agentInstructions} for your standing orders. Your optimization brief:\n\n${brief}`

  log("Starting Claude Code...")
  let agentSuccess = false
  try {
    execSync(`claude --model claude-sonnet-4-6 --max-turns 25 -p ${JSON.stringify(prompt)}`, {
      cwd: worktreePath,
      stdio: "inherit",
      timeout: 8 * 60 * 1000,
    })
    agentSuccess = true
    log("Claude Code session complete.")
  } catch (err) {
    log(`ERROR: Claude Code failed: ${err.message}`)
  }

  if (!agentSuccess) {
    cleanup(worktreePath, worktreeBranch, briefPath)
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(state, null, 2) + "\n")
    return
  }

  // 9. Post-mutation checks
  const changedFiles = execSync("git diff --name-only", {
    cwd: worktreePath,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean)

  if (changedFiles.length === 0) {
    log("No files changed by agent. Skipping.")
    cleanup(worktreePath, worktreeBranch, briefPath)
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(state, null, 2) + "\n")
    return
  }

  // Check allowlist
  const disallowed = changedFiles.filter((f) => !state.editable_files.includes(f))
  if (disallowed.length > 0) {
    log(`ERROR: Agent modified disallowed files: ${disallowed.join(", ")}`)
    cleanup(worktreePath, worktreeBranch, briefPath)
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(state, null, 2) + "\n")
    return
  }

  // Check data-track attributes still present
  for (const file of state.editable_files) {
    const filePath = path.join(worktreePath, file)
    if (!fs.existsSync(filePath)) continue
    const content = fs.readFileSync(filePath, "utf8")
    const origContent = fs.readFileSync(path.resolve(file), "utf8")

    const origTracks = (origContent.match(/data-track(?:[-\w]*)="[^"]*"/g) || []).sort()
    const newTracks = (content.match(/data-track(?:[-\w]*)="[^"]*"/g) || []).sort()

    if (origTracks.join("|") !== newTracks.join("|")) {
      log(
        `ERROR: data-track attributes changed in ${file}. Expected: ${origTracks.length} attrs, got: ${newTracks.length}`,
      )
      cleanup(worktreePath, worktreeBranch, briefPath)
      fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(state, null, 2) + "\n")
      return
    }
  }

  // Build check
  log("Running build check in worktree...")
  try {
    execSync("bun run build", { cwd: worktreePath, stdio: "inherit" })
    log("Build passed.")
  } catch (err) {
    log(`ERROR: Build failed: ${err.message}`)
    cleanup(worktreePath, worktreeBranch, briefPath)
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(state, null, 2) + "\n")
    return
  }

  // 10. Create experiment entry and commit in worktree
  const expId = `exp-${String(state.next_experiment_id).padStart(3, "0")}`
  const experiment = {
    id: expId,
    target_metric: state.primary_metric,
    target_surface: changedFiles[0],
    description: `Agent change to ${changedFiles.join(", ")}`,
    hypothesis: "Automated optimization based on metrics brief",
    edited_files: changedFiles,
    commit: null,
    started_at: new Date().toISOString(),
    min_exposure_views: MIN_SESSIONS,
    metrics_before: {
      home_bio_social_ctr: metrics.home_bio_social_ctr,
      footer_social_ctr: metrics.footer_social_ctr,
      projects_nav_ctr: metrics.projects_nav_ctr,
    },
    metrics_after: null,
    verdict: "pending",
  }

  // Update experiments.json in worktree
  const worktreeState = JSON.parse(
    fs.readFileSync(path.join(worktreePath, "experiments.json"), "utf8"),
  )
  worktreeState.experiments.push(experiment)
  worktreeState.next_experiment_id = state.next_experiment_id + 1
  if (!worktreeState.baseline) worktreeState.baseline = state.baseline
  fs.writeFileSync(
    path.join(worktreePath, "experiments.json"),
    JSON.stringify(worktreeState, null, 2) + "\n",
  )

  // Commit in worktree
  execSync("git add -A", { cwd: worktreePath })
  const commitMsg = `${expId}: change to ${changedFiles.join(", ")}`
  execSync(`git commit -m ${JSON.stringify(commitMsg)}`, {
    cwd: worktreePath,
    stdio: "inherit",
  })

  const commitSha = execSync("git rev-parse HEAD", {
    cwd: worktreePath,
    encoding: "utf8",
  }).trim()

  experiment.commit = commitSha
  log(`Committed ${expId} in worktree: ${commitSha}`)

  // 11. Cherry-pick into main branch
  try {
    execSync(`git cherry-pick ${commitSha}`, { stdio: "inherit" })
    log(`Cherry-picked ${commitSha} into main branch.`)
  } catch (err) {
    log(`ERROR: Cherry-pick failed: ${err.message}`)
    execSync("git cherry-pick --abort", { stdio: "pipe" }).toString()
    cleanup(worktreePath, worktreeBranch, briefPath)
    return
  }

  // Update local state to match
  state.experiments.push(experiment)
  state.next_experiment_id++
  fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(state, null, 2) + "\n")

  // 12. Push if enabled
  if (AUTO_PUSH) {
    try {
      execSync("git push", { stdio: "inherit" })
      log("git push succeeded — deployment pipeline triggered.")
    } catch (err) {
      log(`WARNING: git push failed: ${err.message}`)
      log("Change is committed locally. Push manually to deploy.")
    }
  } else {
    log("AUTO_PUSH=false — change committed locally. Push manually to deploy.")
  }

  // 13. Cleanup
  cleanup(worktreePath, worktreeBranch, briefPath)
  log(`Cycle complete. Total experiments: ${state.experiments.length}`)
}

function cleanup(worktreePath, worktreeBranch, briefPath) {
  try {
    execSync(`git worktree remove ${worktreePath} --force`, { stdio: "pipe" })
  } catch {}
  try {
    execSync(`git branch -D ${worktreeBranch}`, { stdio: "pipe" })
  } catch {}
  try {
    fs.unlinkSync(briefPath)
  } catch {}
}

run().catch((err) => {
  console.error("[harness] Unhandled error:", err)
  process.exit(1)
})
