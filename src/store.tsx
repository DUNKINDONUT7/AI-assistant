import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  defaultSettings,
  type Dashboard,
  type Message,
  type AIResult,
  type AITask,
} from "../shared/contracts";
import { request, supabase } from "./api";
const empty: Dashboard = {
  organization: { id: "", name: "Your workspace" },
  role: "agent",
  business: {
    name: "",
    category: "",
    description: "",
    location: "",
    contact: "",
    hours: "",
    delivery: "",
    payments: "",
    policies: "",
  },
  settings: defaultSettings,
  conversations: [],
  automations: [],
  knowledge: [],
  accounts: [],
  drafts: [],
  usage: [],
  members: [],
  notifications: [],
};
type Store = {
  data: Dashboard;
  demo: false;
  loading: boolean;
  error: string;
  toast: (text: string) => void;
  refresh: () => Promise<void>;
  mutate: <T>(path: string, method: string, body?: unknown) => Promise<T>;
  messages: (id: string) => Promise<Message[]>;
  generate: (
    task: AITask,
    message: string,
    conversationId?: string,
  ) => Promise<AIResult>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dashboard>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const toast = useCallback((text: string) => setNotice(text), []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const refresh = useCallback(async () => {
    try {
      setData(await request<Dashboard>("/dashboard"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    const listener = supabase?.auth.onAuthStateChange(() => {
      setLoading(true);
      void refresh();
    });
    return () => {
      clearInterval(timer);
      listener?.data.subscription.unsubscribe();
    };
  }, [refresh]);
  const messages = useCallback(
    (id: string) => request<Message[]>(`/conversations/${id}/messages`),
    [],
  );
  const mutate = useCallback(
    async <T,>(path: string, method: string, body?: unknown): Promise<T> => {
      const result = await request<T>(path, method, body);
      await refresh();
      return result;
    },
    [refresh],
  );
  const generate = useCallback(
    async (
      task: AITask,
      message: string,
      conversationId?: string,
    ): Promise<AIResult> => {
      const result = await request<AIResult>(`/ai/${task}`, "POST", {
        message,
        ...(conversationId ? { conversationId } : {}),
      });
      await refresh();
      return result;
    },
    [refresh],
  );
  return (
    <Context.Provider
      value={{
        data,
        demo: false,
        loading,
        error,
        toast,
        refresh,
        mutate,
        messages,
        generate,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          <span className="toast-check">✓</span>
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("Missing StoreProvider");
  return store;
}
