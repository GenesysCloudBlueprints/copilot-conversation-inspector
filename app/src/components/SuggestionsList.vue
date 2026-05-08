<script setup lang="ts">
import { computed, ref } from "vue";
import {
  getKnowledgeArticleUrl,
  type SuggestionEntry,
  type SuggestionsResponse,
} from "../genesys";

const props = defineProps<{
  data: SuggestionsResponse | null;
  region?: string;
}>();

const items = computed<SuggestionEntry[]>(() => {
  if (!props.data) return [];
  const raw = props.data.entities || props.data.suggestions || [];
  // Chronological so the timeline reads from start of conversation to end.
  // Entries without a dateCreated sink to the end without disturbing relative order.
  return [...raw].sort((a, b) => {
    const ta = a.dateCreated ? Date.parse(a.dateCreated) : Number.POSITIVE_INFINITY;
    const tb = b.dateCreated ? Date.parse(b.dateCreated) : Number.POSITIVE_INFINITY;
    return ta - tb;
  });
});

const stateFilter = ref<string>("all");
const typeFilter = ref<string>("all");

const types = computed<string[]>(() => {
  const set = new Set<string>();
  items.value.forEach((s) => {
    if (s.type) set.add(s.type);
  });
  return [...set].sort();
});

const states = computed<string[]>(() => {
  const set = new Set<string>();
  items.value.forEach((s) => {
    if (s.state) set.add(String(s.state));
  });
  return [...set].sort();
});

const filtered = computed<SuggestionEntry[]>(() =>
  items.value.filter((s) => {
    if (stateFilter.value !== "all" && s.state !== stateFilter.value) return false;
    if (typeFilter.value !== "all" && s.type !== typeFilter.value) return false;
    return true;
  }),
);

const counts = computed<Record<string, number>>(() => {
  const c: Record<string, number> = {};
  items.value.forEach((s) => {
    const key = String(s.state || "Unknown");
    c[key] = (c[key] || 0) + 1;
  });
  return c;
});

function title(s: SuggestionEntry): string {
  return (
    s.knowledgeSearch?.title ||
    s.title ||
    s.name ||
    s.knowledgeArticle?.title ||
    s.cannedResponse?.name ||
    s.script?.name ||
    s.suggestion?.title ||
    "(untitled)"
  );
}

function snippet(s: SuggestionEntry): string | null {
  // Prefer the long contextual snippet from the article, then various legacy paths.
  const fromKnowledgeSearch = s.knowledgeSearch?.snippets?.[0];
  return (
    fromKnowledgeSearch ||
    s.snippet ||
    s.body ||
    s.answer?.text ||
    s.suggestion?.snippet ||
    s.knowledgeArticle?.snippet ||
    null
  );
}

/** The short, ready-to-paste reply Copilot extracted from the article. */
function highlightedAnswer(s: SuggestionEntry): string | null {
  return s.knowledgeSearch?.knowledgeAnswer?.answer || null;
}

function confidence(s: SuggestionEntry): number | null {
  if (typeof s.knowledgeSearch?.confidence === "number") {
    return s.knowledgeSearch.confidence;
  }
  if (typeof s.confidence === "number") return s.confidence;
  return null;
}

function pct(n: number | null): string | null {
  return n === null ? null : `${Math.round(n * 100)}%`;
}

/** "KnowledgeSearch" → "Knowledge Search" so chips read naturally. */
function humanizeType(t: string | undefined): string {
  if (!t) return "Suggestion";
  return t.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function fmtTime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

function articleUrl(s: SuggestionEntry): string | null {
  return getKnowledgeArticleUrl(s.knowledgeSearch?.document?.selfUri, props.region);
}
</script>

<template>
  <section class="card">
    <header class="mb-3 flex items-baseline justify-between gap-3">
      <h2 class="m-0 text-base">Copilot suggestions</h2>
      <span class="text-xs text-muted">
        From <code>getConversationSuggestions</code>
      </span>
    </header>

    <div class="mb-3 flex flex-wrap gap-2">
      <span
        v-for="(count, state) in counts"
        :key="state"
        :data-state="state"
        class="chip text-[color:var(--state-color,var(--color-muted))] border-[color:var(--state-color,var(--color-border))]/40"
      >
        {{ state }} · {{ count }}
      </span>
    </div>

    <div v-if="items.length" class="mb-3 flex gap-4 text-xs text-muted">
      <label class="inline-flex items-center gap-1.5">
        State
        <select v-model="stateFilter" class="select w-auto px-2 py-1 text-xs">
          <option value="all">All</option>
          <option v-for="s in states" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label class="inline-flex items-center gap-1.5">
        Type
        <select v-model="typeFilter" class="select w-auto px-2 py-1 text-xs">
          <option value="all">All</option>
          <option v-for="t in types" :key="t" :value="t">{{ humanizeType(t) }}</option>
        </select>
      </label>
    </div>

    <p v-if="!items.length" class="m-0 text-muted">
      No Copilot suggestions returned for this conversation.
    </p>

    <ul v-else class="m-0 flex list-none flex-col gap-2.5 p-0">
      <li
        v-for="(s, i) in filtered"
        :key="s.id || i"
        :data-state="s.state ? String(s.state) : undefined"
        class="rounded-lg border border-border bg-panel-2 p-3
               border-l-[3px] border-l-[color:var(--state-color,var(--color-border))]"
      >
        <div
          class="mb-1 flex flex-wrap items-center gap-2.5 text-[11px] uppercase tracking-[0.5px] text-muted"
        >
          <span>{{ humanizeType(s.type) }}</span>
          <span>·</span>
          <span>{{ s.state || "—" }}</span>
          <span v-if="s.triggerType">·</span>
          <span v-if="s.triggerType">{{ s.triggerType }}</span>
          <span v-if="fmtTime(s.dateCreated)" class="ml-auto normal-case tracking-normal">
            {{ fmtTime(s.dateCreated) }}
          </span>
        </div>

        <h3 class="m-0 mb-1 text-sm">
          <a
            v-if="articleUrl(s)"
            :href="articleUrl(s) ?? undefined"
            target="_blank"
            rel="noopener noreferrer"
            class="article-link"
            title="Open article in Knowledge Workbench"
          >
            {{ title(s) }}
            <span aria-hidden="true" class="article-link-arrow">↗</span>
          </a>
          <template v-else>{{ title(s) }}</template>
        </h3>

        <blockquote
          v-if="highlightedAnswer(s)"
          class="answer m-0 mb-1.5"
        >
          {{ highlightedAnswer(s) }}
        </blockquote>

        <p
          v-if="snippet(s)"
          class="m-0 text-[13px] leading-[1.5] text-muted"
        >
          {{ snippet(s) }}
        </p>

        <div v-if="pct(confidence(s))" class="mt-1.5 text-xs text-muted">
          Confidence: {{ pct(confidence(s)) }}
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
@reference "../styles.css";

.answer {
  @apply rounded-md border-l-2 border-l-brand-2 bg-white/[0.04]
         px-3 py-2 text-[13px] leading-[1.5] text-ink;
  font-style: normal;
}

.article-link {
  @apply text-ink no-underline hover:text-brand-2 hover:underline;
}
.article-link-arrow {
  @apply ml-0.5 text-xs text-muted;
}
.article-link:hover .article-link-arrow {
  color: var(--color-brand-2);
}
</style>
