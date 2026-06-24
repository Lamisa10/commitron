/**
 * All dummy data for the prototype lives here.
 * No real Git execution, no OpenAI calls — this is purely for the demo.
 */

export interface DiffLine {
  type: "add" | "del" | "ctx" | "meta";
  text: string;
}

/** A fake staged diff used by the Commit & Explain screens. */
export const stagedDiff: DiffLine[] = [
  { type: "meta", text: "diff --git a/src/auth/login.ts b/src/auth/login.ts" },
  { type: "ctx", text: "  export async function login(email: string, otp: string) {" },
  { type: "del", text: "-   const ok = await verifyPassword(email);" },
  { type: "add", text: "+   const ok = await verifyOtp(email, otp);" },
  { type: "add", text: "+   if (!ok) throw new AuthError('Invalid OTP');" },
  { type: "ctx", text: "    return issueSession(email);" },
  { type: "ctx", text: "  }" },
  { type: "meta", text: "diff --git a/src/auth/otp.ts b/src/auth/otp.ts" },
  { type: "add", text: "+ export async function verifyOtp(email, code) {" },
  { type: "add", text: "+   return store.get(email)?.code === code;" },
  { type: "add", text: "+ }" },
];

/** Three candidate Conventional-Commit messages for the picker. */
export const commitCandidates = [
  {
    label: "feat(auth): replace password login with OTP verification",
    body: "Swap password check for one-time-password flow and add verifyOtp helper.",
  },
  {
    label: "feat(auth): add OTP-based login flow",
    body: "Introduce verifyOtp and reject invalid codes with AuthError.",
  },
  {
    label: "refactor(auth): migrate login to one-time passwords",
    body: "Remove password verification in favor of OTP for stronger sign-in.",
  },
];

/** Branch-name generation examples (description → generated name). */
export const branchExamples: Record<string, string> = {
  "add login page with OTP": "feat/otp-login",
  "fix crash when cart is empty": "fix/empty-cart-crash",
  "update readme install steps": "docs/readme-install",
  "speed up image loading": "perf/image-loading",
};

export const defaultBranchSuggestion = "feat/otp-login";

/** Plain-English diff summary for the Explain screen. */
export const explainSummary = [
  "This change replaces password-based login with a one-time-password (OTP) flow.",
  "",
  "• src/auth/login.ts — `login()` now takes an `otp` argument and calls the new",
  "  `verifyOtp()` helper instead of `verifyPassword()`. Invalid codes raise AuthError.",
  "• src/auth/otp.ts — adds `verifyOtp()`, which compares the submitted code against",
  "  the one stored for that email.",
  "",
  "Risk: low. No database migrations and the session-issuing logic is unchanged.",
];

/** Natural-language "ask" examples mapped to fake interpreted plans. */
export interface AskPlan {
  intent: string;
  destructive: boolean;
  explanation: string;
  commands: string[];
  warning?: string;
}

export const askExamples: Record<string, AskPlan> = {
  default: {
    intent: "Undo my last commit but keep the changes",
    destructive: true,
    explanation:
      "This rewinds the branch by one commit while leaving your edited files\nuntouched and staged, so nothing you wrote is lost.",
    commands: ["git reset --soft HEAD~1"],
    warning:
      "This rewrites history on your current branch. If you already pushed\nthis commit, collaborators may need to re-sync.",
  },
  status: {
    intent: "Show me what's changed",
    destructive: false,
    explanation: "Read-only — lists staged, unstaged, and untracked files.",
    commands: ["git status --short --branch"],
  },
};

/** A failing Git command + friendly explanation for the Error Helper. */
export const sampleError = {
  command: "git push origin main",
  raw: [
    "! [rejected]        main -> main (non-fast-forward)",
    "error: failed to push some refs to 'origin'",
    "hint: Updates were rejected because the remote contains work that you do",
    "hint: not have locally. This is usually caused by another repository pushing",
    "hint: to the same ref.",
  ],
  friendly:
    "Someone else pushed new commits to `main` before you did, so your local\nbranch is behind. Git refuses to overwrite their work.",
  fix: ["git pull --rebase origin main", "git push origin main"],
};

/** Default config shown / collected by the Setup screen. */
export const defaultConfig = {
  model: "gpt-4o-mini",
  commitStyle: "Conventional Commits",
  configPath: "~/.commitronrc",
};
