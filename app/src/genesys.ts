import platformClient from "purecloud-platform-client-v2";

const sdk = platformClient as unknown as {
  ApiClient: {
    instance: {
      setEnvironment(env: string): void;
      setPersistSettings(persist: boolean, prefix?: string): void;
      loginPKCEGrant(clientId: string, redirectUri: string): Promise<unknown>;
      clearAccessToken(): void;
    };
  };
  ConversationsApi: new () => {
    getConversationSummaries(conversationId: string): Promise<SummariesResponse>;
    getConversationSuggestions(
      conversationId: string,
      opts?: Record<string, unknown>,
    ): Promise<SuggestionsResponse>;
  };
  AnalyticsApi: new () => {
    postAnalyticsConversationsDetailsQuery(
      body: Record<string, unknown>,
    ): Promise<ConversationsQueryResponse>;
  };
  TokensApi: new () => {
    getTokensMe(): Promise<{ homeOrganization?: { name?: string } }>;
  };
  UsersApi: new () => {
    getUsersMe(): Promise<{ id?: string; name?: string; email?: string }>;
  };
};

const client = sdk.ApiClient.instance;
const conversationsApi = new sdk.ConversationsApi();
const analyticsApi = new sdk.AnalyticsApi();
const tokensApi = new sdk.TokensApi();
const usersApi = new sdk.UsersApi();

const STORAGE_KEY = "copilot-inspector.config";

export interface InspectorConfig {
  clientId?: string;
  region?: string;
}

export interface RegionOption {
  value: string;
  label: string;
}

export interface SummaryEntry {
  id?: string;
  /** Free-form overall summary text at the top of the entry. */
  text?: string;
  /** Overall confidence score 0..1 for the whole entry. */
  confidence?: number;
  status?: string;
  mediaType?: string;
  language?: string;
  reason?: ConfidenceField | string;
  resolution?: ConfidenceField | string;
  followup?: ConfidenceField | string;
  /** Legacy shape — kept so older response payloads still render. */
  summary?: ConfidenceField | string;
  predictedWrapupCodes?: Array<{ id?: string; name?: string }>;
  suggestedWrapUpCode?: { name?: string };
  wrapUp?: { name?: string; code?: string };
}

export interface ConfidenceField {
  text?: string;
  value?: string;
  content?: string;
  /** Longer explanation accompanying `text`. Genesys fills this on reason/resolution/followup. */
  description?: string;
  confidence?: number;
  /** Resolution-specific: e.g. "Resolved" / "Not Resolved". */
  outcome?: string;
}

export interface SummariesResponse {
  /** Current Genesys shape: per-session AI summaries. */
  sessionSummaries?: SummaryEntry[];
  /** Top-level aggregate summary; often empty on single-session conversations. */
  summary?: Record<string, unknown>;
  conversation?: { id?: string; selfUri?: string };
  /** Legacy / alternate shapes — kept so older or paged payloads still render. */
  entities?: SummaryEntry[];
  summaries?: SummaryEntry[];
}

export type SuggestionState =
  | "Suggested"
  | "Accepted"
  | "Dismissed"
  | "Failed"
  | "Rated";

/** A single highlighted answer extracted from the underlying article. */
export interface KnowledgeAnswer {
  answer?: string;
  startIndex?: number;
  endIndex?: number;
}

/** Shape Genesys returns under `knowledgeSearch` for KnowledgeSearch-type suggestions. */
export interface KnowledgeSearchPayload {
  title?: string;
  snippets?: string[];
  confidence?: number;
  searchId?: string;
  document?: { id?: string; selfUri?: string };
  version?: { id?: string; selfUri?: string };
  knowledgeAnswer?: KnowledgeAnswer;
  variations?: Array<{ id?: string; selfUri?: string }>;
}

export interface SuggestionContext {
  queue?: { id?: string; selfUri?: string };
  mediaType?: string;
  user?: { id?: string; selfUri?: string };
  externalContact?: { id?: string; selfUri?: string };
  message?: { id?: string; selfUri?: string };
}

export interface SuggestionEntry {
  id?: string;
  /** e.g. "KnowledgeSearch", "CannedResponse", "Script". */
  type?: string;
  state?: SuggestionState | string;
  dateCreated?: string;
  /** e.g. "Fallback", "ExplicitQuery" — how Copilot decided to surface this. */
  triggerType?: string;
  /** Current Genesys shape for KnowledgeSearch-type suggestions. */
  knowledgeSearch?: KnowledgeSearchPayload;
  context?: SuggestionContext;

  /* Legacy / alternate shapes — kept so older payloads still render. */
  title?: string;
  name?: string;
  snippet?: string;
  body?: string;
  confidence?: number;
  knowledgeArticle?: { title?: string; snippet?: string };
  cannedResponse?: { name?: string };
  script?: { name?: string };
  suggestion?: { title?: string; snippet?: string };
  answer?: { text?: string };
}

export interface SuggestionsResponse {
  entities?: SuggestionEntry[];
  suggestions?: SuggestionEntry[];
}

export interface ConversationListEntry {
  conversationId: string;
  conversationStart?: string;
  conversationEnd?: string;
  participants?: Array<{
    purpose?: string;
    participantName?: string;
    sessions?: Array<{ mediaType?: string }>;
  }>;
}

export interface ConversationsQueryResponse {
  conversations?: ConversationListEntry[];
  totalHits?: number;
}

export function loadConfig(): InspectorConfig {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as InspectorConfig) || {};
  } catch {
    return {};
  }
}

export function saveConfig(cfg: InspectorConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export const REGIONS: RegionOption[] = [
  { value: "mypurecloud.com", label: "us-east-1 (mypurecloud.com)" },
  { value: "usw2.pure.cloud", label: "us-west-2 (usw2.pure.cloud)" },
  { value: "cac1.pure.cloud", label: "ca-central-1 (cac1.pure.cloud)" },
  { value: "mypurecloud.ie", label: "eu-west-1 (mypurecloud.ie)" },
  { value: "euw2.pure.cloud", label: "eu-west-2 (euw2.pure.cloud)" },
  { value: "mypurecloud.de", label: "eu-central-1 (mypurecloud.de)" },
  { value: "euc2.pure.cloud", label: "eu-central-2 (euc2.pure.cloud)" },
  { value: "mypurecloud.jp", label: "ap-northeast-1 (mypurecloud.jp)" },
  { value: "apne2.pure.cloud", label: "ap-northeast-2 (apne2.pure.cloud)" },
  { value: "aps1.pure.cloud", label: "ap-south-1 (aps1.pure.cloud)" },
  { value: "mypurecloud.com.au", label: "ap-southeast-2 (mypurecloud.com.au)" },
  { value: "sae1.pure.cloud", label: "sa-east-1 (sae1.pure.cloud)" },
];

export interface SignInArgs {
  clientId: string;
  region: string;
}

export async function signIn({ clientId, region }: SignInArgs): Promise<string> {
  client.setEnvironment(region);
  client.setPersistSettings(true, "copilot-inspector");
  const redirectUri = window.location.origin + window.location.pathname;
  await client.loginPKCEGrant(clientId, redirectUri);
  // Strip the auth code/state from the URL so a refresh doesn't re-trigger exchange.
  if (window.location.search.includes("code=")) {
    window.history.replaceState({}, document.title, redirectUri);
  }
  try {
    const me = await tokensApi.getTokensMe();
    return me?.homeOrganization?.name || "signed in";
  } catch {
    return "signed in";
  }
}

export function signOut(): void {
  try {
    client.clearAccessToken();
  } catch {
    // no-op
  }
  // Invalidate the per-session identity cache so a different user signing
  // in next doesn't inherit the previous user's id.
  cachedMyUserId = undefined;
}

export function hasPendingPKCERedirect(): boolean {
  return new URLSearchParams(window.location.search).has("code");
}

/**
 * The Genesys SDK rejects with a plain object shaped roughly like
 * `{ status, statusText, body, headers, ... }` rather than an Error
 * instance. This pulls the most useful bits out into a single string.
 */
export function formatSdkError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const err = e as {
      status?: number;
      statusText?: string;
      body?: unknown;
      message?: string;
    };
    const status = err.status
      ? `${err.status}${err.statusText ? ` ${err.statusText}` : ""}`
      : "";
    let bodyMsg = "";
    if (err.body && typeof err.body === "object") {
      const b = err.body as { message?: string; code?: string };
      bodyMsg = b.message || b.code || "";
    } else if (typeof err.body === "string") {
      bodyMsg = err.body;
    }
    const msg = err.message || bodyMsg;
    const parts = [status, msg].filter(Boolean);
    if (parts.length) return parts.join(" — ");
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

export function isNotFoundError(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { status?: number }).status === 404);
}

/**
 * Builds a Genesys Cloud Knowledge Workbench V2 article deep-link from
 * a `selfUri` of shape `/api/v2/knowledge/knowledgebases/{kbId}/documents/{docId}`.
 * Returns `null` if the URI doesn't match or no region is known yet.
 */
export function getKnowledgeArticleUrl(
  selfUri: string | undefined,
  region: string | undefined,
): string | null {
  if (!selfUri || !region) return null;
  const m = selfUri.match(/\/knowledgebases\/([^/]+)\/documents\/([^/?#]+)/);
  if (!m) return null;
  const [, kbId, docId] = m;
  return `https://apps.${region}/directory/#/admin/knowledge/v2/knowledge-bases/${kbId}/articles/${docId}`;
}

export function getSummaries(conversationId: string): Promise<SummariesResponse> {
  return conversationsApi.getConversationSummaries(conversationId);
}

export function getSuggestions(conversationId: string): Promise<SuggestionsResponse> {
  return conversationsApi.getConversationSuggestions(conversationId, {
    pageSize: "200",
  });
}

export const PAGE_SIZE = 25;

export interface TimeRangeOption {
  value: number;
  label: string;
}

// `postAnalyticsConversationsDetailsQuery` enforces a 7-day max interval, so
// we cap the dropdown at 7 days. Longer windows would need request chunking
// or the conversation-detail export job, both out of scope for this app.
export const TIME_RANGES: TimeRangeOption[] = [
  { value: 1, label: "Last 1 hour" },
  { value: 24, label: "Last 24 hours" },
  { value: 24 * 3, label: "Last 3 days" },
  { value: 24 * 7, label: "Last 7 days" },
];

export const DEFAULT_RANGE_HOURS = 24 * 7;

/**
 * Cached after the first successful `UsersApi.getUsersMe()` call. Cleared
 * by `signOut()` so a different user signing in next doesn't inherit it.
 */
let cachedMyUserId: string | undefined;

export async function getMyUserId(): Promise<string | undefined> {
  if (cachedMyUserId) return cachedMyUserId;
  try {
    const me = await usersApi.getUsersMe();
    cachedMyUserId = me?.id;
    return cachedMyUserId;
  } catch {
    return undefined;
  }
}

export interface ListConversationsOptions {
  windowHours?: number;
  /** When set, only conversations the given user participated in are returned. */
  userId?: string;
}

/**
 * Recent conversations from the analytics details query, paged.
 *
 * The Genesys analytics endpoint is 1-indexed for paging and returns a
 * `totalHits` value we surface for pagination.
 */
export async function listRecentConversations(
  pageNumber: number,
  opts: ListConversationsOptions = {},
): Promise<ConversationsQueryResponse> {
  const windowHours = opts.windowHours ?? DEFAULT_RANGE_HOURS;
  const end = new Date();
  const start = new Date(end.getTime() - windowHours * 60 * 60 * 1000);
  const interval = `${start.toISOString()}/${end.toISOString()}`;

  const body: Record<string, unknown> = {
    interval,
    order: "desc",
    orderBy: "conversationStart",
    paging: { pageSize: PAGE_SIZE, pageNumber },
  };

  if (opts.userId) {
    body.segmentFilters = [
      {
        type: "and",
        predicates: [
          {
            type: "dimension",
            dimension: "userId",
            operator: "matches",
            value: opts.userId,
          },
        ],
      },
    ];
  }

  return analyticsApi.postAnalyticsConversationsDetailsQuery(body);
}
