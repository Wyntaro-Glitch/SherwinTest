import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AVAILABLE_MODELS, type ModelOption } from "@/utils/aiService";

export type DownloadStatus = "idle" | "downloading" | "ready" | "error" | "deleting";

interface ModelEntry {
  id: string;
  status: DownloadStatus;
  progress: number;
  error: string | null;
  downloadedAt: number | null;
}

interface ModelStoreState {
  models: Record<string, ModelEntry>;
  activeModelId: string | null;
  initModel: (modelId: string) => void;
  setDownloadProgress: (modelId: string, progress: number) => void;
  setDownloadReady: (modelId: string) => void;
  setDownloadError: (modelId: string, error: string) => void;
  setActiveModel: (modelId: string) => void;
  removeModel: (modelId: string) => void;
  getModelInfo: (modelId: string) => ModelOption | undefined;
  getModelsByStatus: (status: DownloadStatus) => ModelEntry[];
}

function ensureModel(store: ModelStoreState, modelId: string): ModelEntry {
  if (!store.models[modelId]) {
    store.models[modelId] = {
      id: modelId,
      status: "idle",
      progress: 0,
      error: null,
      downloadedAt: null,
    };
  }
  return store.models[modelId];
}

export const useModelStore = create<ModelStoreState>()(
  persist(
    (set, get) => ({
      models: {},
      activeModelId: null,

      initModel: (modelId) =>
        set((state) => {
          ensureModel(state, modelId);
          state.models[modelId].status = "downloading";
          state.models[modelId].progress = 0;
          state.models[modelId].error = null;
          return { models: { ...state.models } };
        }),

      setDownloadProgress: (modelId, progress) =>
        set((state) => {
          ensureModel(state, modelId);
          state.models[modelId].progress = progress;
          state.models[modelId].status = "downloading";
          return { models: { ...state.models } };
        }),

      setDownloadReady: (modelId) =>
        set((state) => {
          ensureModel(state, modelId);
          state.models[modelId].status = "ready";
          state.models[modelId].progress = 100;
          state.models[modelId].downloadedAt = Date.now();
          return { models: { ...state.models } };
        }),

      setDownloadError: (modelId, error) =>
        set((state) => {
          ensureModel(state, modelId);
          state.models[modelId].status = "error";
          state.models[modelId].error = error;
          return { models: { ...state.models } };
        }),

      setActiveModel: (modelId) => set({ activeModelId: modelId }),

      removeModel: (modelId) =>
        set((state) => {
          if (state.models[modelId]) {
            state.models[modelId].status = "deleting";
            state.models[modelId].progress = 0;
          }
          return { models: { ...state.models } };
        }),

      getModelInfo: (modelId) => AVAILABLE_MODELS.find((m) => m.id === modelId),

      getModelsByStatus: (status) => {
        return Object.values(get().models).filter((m) => m.status === status);
      },
    }),
    {
      name: "sherwin_model_store",
      partialize: (state) => ({
        models: Object.fromEntries(
          Object.entries(state.models).filter(([, v]) => v.status !== "idle")
        ),
        activeModelId: state.activeModelId,
      }),
    }
  )
);
