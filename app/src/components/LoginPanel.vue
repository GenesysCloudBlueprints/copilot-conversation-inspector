<script setup lang="ts">
import { ref } from "vue";
import { REGIONS, type SignInArgs } from "../genesys";

const props = withDefaults(
  defineProps<{
    initialClientId?: string;
    initialRegion?: string;
    busy?: boolean;
  }>(),
  {
    initialClientId: "",
    initialRegion: "mypurecloud.com",
    busy: false,
  },
);

const emit = defineEmits<{
  (e: "sign-in", args: SignInArgs): void;
}>();

const clientId = ref(props.initialClientId);
const region = ref(props.initialRegion);

function submit(): void {
  if (!clientId.value.trim()) return;
  emit("sign-in", { clientId: clientId.value.trim(), region: region.value });
}
</script>

<template>
  <form
    class="card grid items-end gap-3 grid-cols-1 min-[720px]:grid-cols-[1fr_1fr_auto]"
    @submit.prevent="submit"
  >
    <div class="field">
      <label for="clientId">OAuth Code Authorization (PKCE) Client ID</label>
      <input
        id="clientId"
        v-model="clientId"
        type="text"
        autocomplete="off"
        placeholder="e.g. 1a2b3c4d-…"
        required
        class="input"
      />
    </div>

    <div class="field">
      <label for="region">Genesys Cloud region</label>
      <select id="region" v-model="region" class="select">
        <option v-for="r in REGIONS" :key="r.value" :value="r.value">
          {{ r.label }}
        </option>
      </select>
    </div>

    <button type="submit" class="btn" :disabled="busy">
      {{ busy ? "Signing in…" : "Sign in" }}
    </button>

    <p class="col-span-full m-0 mt-1 text-xs leading-[1.5] text-muted">
      Your OAuth client must use the
      <strong>Code Authorization</strong> grant with
      <strong>PKCE</strong> enabled, list this page's URL as an authorized
      redirect URI, and include the
      <code>conversations:readonly</code>,
      <code>analytics:readonly</code>, and
      <code>user-basic-info</code> scopes (the last one lets the app default
      the conversation list to <strong>Mine only</strong>).
    </p>
  </form>
</template>
