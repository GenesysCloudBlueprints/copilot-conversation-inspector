import { createApp } from "vue";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import App from "./App.vue";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep server state for 5 min before considering it stale.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createApp(App).use(VueQueryPlugin, { queryClient }).mount("#app");
