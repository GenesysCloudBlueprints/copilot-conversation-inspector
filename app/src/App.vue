<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import LoginPanel from "./components/LoginPanel.vue";
import ConversationList from "./components/ConversationList.vue";
import SummaryCard from "./components/SummaryCard.vue";
import SuggestionsList from "./components/SuggestionsList.vue";
import {
  loadConfig,
  saveConfig,
  signIn,
  signOut,
  hasPendingPKCERedirect,
  getSummaries,
  getSuggestions,
  formatSdkError,
  isNotFoundError,
  type InspectorConfig,
  type SignInArgs,
  type SummariesResponse,
  type SuggestionsResponse,
} from "./genesys";

const queryClient = useQueryClient();

// Reactive so a fresh first-time sign-in immediately propagates to children
// that depend on the saved region (e.g. building Knowledge Workbench links).
const cfg = ref<InspectorConfig>(loadConfig());
const orgName = ref<string>("");
const connected = ref<boolean>(false);
const signingIn = ref<boolean>(false);
const signInError = ref<string>("");
const inspectedId = ref<string>("");

async function handleSignIn(args: SignInArgs): Promise<void> {
  signInError.value = "";
  signingIn.value = true;
  try {
    const next = { ...loadConfig(), clientId: args.clientId, region: args.region };
    saveConfig(next);
    cfg.value = next;
    orgName.value = await signIn(args);
    connected.value = true;
  } catch (e) {
    signInError.value = "Sign-in failed: " + formatSdkError(e);
  } finally {
    signingIn.value = false;
  }
}

function handleSignOut(): void {
  signOut();
  connected.value = false;
  orgName.value = "";
  inspectedId.value = "";
  // Drop every cached query result — most importantly the long-lived
  // `users/me` lookup — so the next sign-in doesn't reuse the previous
  // session's identity or conversation data.
  queryClient.clear();
}

function handleInspect(id: string): void {
  inspectedId.value = id;
}

// 404 from these endpoints means "no Copilot data for this conversation",
// which is a valid state — render an empty card instead of a red error.
async function safeGetSummaries(id: string): Promise<SummariesResponse> {
  try {
    return await getSummaries(id);
  } catch (e) {
    if (isNotFoundError(e)) return { entities: [] };
    throw e;
  }
}
async function safeGetSuggestions(id: string): Promise<SuggestionsResponse> {
  try {
    return await getSuggestions(id);
  } catch (e) {
    if (isNotFoundError(e)) return { entities: [] };
    throw e;
  }
}

const enabled = computed<boolean>(() => connected.value && !!inspectedId.value);

const summariesQuery = useQuery({
  queryKey: computed(() => ["genesys", "conversations", inspectedId.value, "summaries"]),
  queryFn: () => safeGetSummaries(inspectedId.value),
  enabled,
});

const suggestionsQuery = useQuery({
  queryKey: computed(() => ["genesys", "conversations", inspectedId.value, "suggestions"]),
  queryFn: () => safeGetSuggestions(inspectedId.value),
  enabled,
});

const summaries = computed<SummariesResponse | null>(
  () => summariesQuery.data.value ?? null,
);
const suggestions = computed<SuggestionsResponse | null>(
  () => suggestionsQuery.data.value ?? null,
);

const inspecting = computed<boolean>(
  () => summariesQuery.isFetching.value || suggestionsQuery.isFetching.value,
);

const inspectError = computed<string>(() => {
  const errs: string[] = [];
  if (summariesQuery.error.value) {
    errs.push("summaries: " + formatSdkError(summariesQuery.error.value));
  }
  if (suggestionsQuery.error.value) {
    errs.push("suggestions: " + formatSdkError(suggestionsQuery.error.value));
  }
  if (errs.length === 2) return "Both calls failed — " + errs.join("; ");
  if (errs.length === 1) return "Partial failure — " + errs[0];
  return "";
});

const error = computed<string>(() => signInError.value || inspectError.value);

const hasInspectionData = computed<boolean>(
  () => !!inspectedId.value && (!!summaries.value || !!suggestions.value),
);

onMounted(async () => {
  const c = cfg.value;
  if (hasPendingPKCERedirect() && c.clientId && c.region) {
    await handleSignIn({ clientId: c.clientId, region: c.region });
  }
});
</script>

<template>
  <div class="mx-auto max-w-[1200px] px-6 pb-16 pt-7">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="m-0 text-[22px]">Copilot Conversation Inspector</h1>
        <p class="mt-1.5 max-w-[560px] text-[13px] text-muted">
          Replays what Genesys Agent Copilot saw on a given conversation —
          AI summary plus every suggestion it surfaced and how the agent
          handled it.
        </p>
      </div>
      <div class="flex items-center gap-2.5">
        <span class="pill" :data-connected="connected">
          <span class="pill-dot" />
          {{ connected ? "Connected · " + orgName : "Not connected" }}
        </span>
        <button v-if="connected" class="btn-ghost" @click="handleSignOut">
          Sign out
        </button>
      </div>
    </header>

    <main>
      <LoginPanel
        v-if="!connected"
        :initial-client-id="cfg.clientId || ''"
        :initial-region="cfg.region || 'mypurecloud.com'"
        :busy="signingIn"
        @sign-in="handleSignIn"
      />

      <ConversationList
        v-if="connected"
        :selected-id="inspectedId"
        :busy="inspecting"
        @pick="handleInspect"
      />

      <p v-if="error" class="alert-error mt-3">{{ error }}</p>

      <div
        v-if="hasInspectionData"
        class="mt-4 grid gap-4 grid-cols-1 min-[900px]:grid-cols-[minmax(320px,1fr)_minmax(320px,1.4fr)]"
      >
        <SummaryCard :data="summaries" />
        <SuggestionsList :data="suggestions" :region="cfg.region" />
      </div>
    </main>

    <footer class="mt-8 text-center text-xs text-muted">
      <span>
        Companion app for the
        <a href="../blueprint/index.md">Agent Copilot showcase blueprint</a>.
        Calls
        <code>ConversationsApi.getConversationSummaries</code> +
        <code>getConversationSuggestions</code>.
      </span>
    </footer>
  </div>
</template>
