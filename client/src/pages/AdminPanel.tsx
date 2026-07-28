/**
 * AdminPanel — manage models and providers.
 *
 * Two sections:
 *  1. Add Model form (name, slug, category, priority, provider)
 *  2. Add Provider form (name, slug, baseUrl)
 *  3. Provider list with reliability stats
 *
 * Uses mutations with toast feedback and form validation.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Server, Package } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useProviders, useCreateModel, useCreateProvider } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import { CATEGORY_META, CATEGORY_ORDER, cn } from "@/lib/utils";
import type { ModelCategory, ModelPriority } from "@/lib/types";

export function AdminPanel() {
  const { data: providersData } = useProviders();
  const createModel = useCreateModel();
  const createProvider = useCreateProvider();
  const { showToast } = useToast();

  const providers = providersData?.providers ?? [];

  // Model form state
  const [modelForm, setModelForm] = useState({
    name: "",
    slug: "",
    category: "OPUS" as ModelCategory,
    priority: "" as ModelPriority | "",
    advantage: "",
    bestFor: "",
    whenToUse: "",
    providerId: "",
  });

  // Provider form state
  const [providerForm, setProviderForm] = useState({
    name: "",
    slug: "",
    baseUrl: "",
  });

  const handleCreateModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelForm.name || !modelForm.slug || !modelForm.providerId) {
      showToast({ title: "Missing required fields", variant: "error" });
      return;
    }
    createModel.mutate(
      {
        name: modelForm.name,
        slug: modelForm.slug,
        category: modelForm.category,
        priority: modelForm.priority || undefined,
        advantage: modelForm.advantage || undefined,
        bestFor: modelForm.bestFor || undefined,
        whenToUse: modelForm.whenToUse || undefined,
        providerId: modelForm.providerId,
      },
      {
        onSuccess: () => {
          showToast({ title: "Model added", variant: "success" });
          setModelForm({
            name: "",
            slug: "",
            category: "OPUS",
            priority: "",
            advantage: "",
            bestFor: "",
            whenToUse: "",
            providerId: "",
          });
        },
        onError: () => {
          showToast({ title: "Failed to add model", variant: "error" });
        },
      },
    );
  };

  const handleCreateProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerForm.name || !providerForm.slug || !providerForm.baseUrl) {
      showToast({ title: "Missing required fields", variant: "error" });
      return;
    }
    createProvider.mutate(
      {
        name: providerForm.name,
        slug: providerForm.slug,
        baseUrl: providerForm.baseUrl,
      },
      {
        onSuccess: () => {
          showToast({ title: "Provider added", variant: "success" });
          setProviderForm({ name: "", slug: "", baseUrl: "" });
        },
        onError: () => {
          showToast({ title: "Failed to add provider", variant: "error" });
        },
      },
    );
  };

  const inputClass = cn(
    "w-full h-10 px-3 rounded-input bg-ink-800/40 border border-ink-700/30",
    "text-sm text-ink-100 placeholder:text-ink-500",
    "focus:outline-none focus:border-accent/40 focus:bg-ink-800/60",
    "transition-colors duration-200 ease-fluid",
  );

  const labelClass = "block text-xs font-medium text-ink-300 mb-1.5";

  return (
    <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10"
      >
        <h1 className="text-hero font-medium text-ink-100">Admin Panel</h1>
        <p className="text-sm text-ink-400 mt-2">
          Add models and providers to the rating system.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Model Form */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
              <Package className="h-4 w-4 text-accent" />
            </div>
            <h2 className="text-sm font-medium text-ink-100">Add Model</h2>
          </div>

          <form onSubmit={handleCreateModel} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="model-name">
                Name <span className="text-danger">*</span>
              </label>
              <input
                id="model-name"
                type="text"
                className={inputClass}
                placeholder="DeepSeek V3"
                value={modelForm.name}
                onChange={(e) =>
                  setModelForm({ ...modelForm, name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="model-slug">
                Slug <span className="text-danger">*</span>
              </label>
              <input
                id="model-slug"
                type="text"
                className={cn(inputClass, "font-mono")}
                placeholder="deepseek/deepseek-chat"
                value={modelForm.slug}
                onChange={(e) =>
                  setModelForm({ ...modelForm, slug: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="model-category">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  id="model-category"
                  className={inputClass}
                  value={modelForm.category}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      category: e.target.value as ModelCategory,
                    })
                  }
                >
                  {CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_META[cat]?.label ?? cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="model-priority">
                  Priority
                </label>
                <select
                  id="model-priority"
                  className={inputClass}
                  value={modelForm.priority}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      priority: e.target.value as ModelPriority | "",
                    })
                  }
                >
                  <option value="">—</option>
                  <option value="primary">Primary</option>
                  <option value="backup">Backup</option>
                  <option value="fast">Fast</option>
                  <option value="vision">Vision</option>
                  <option value="code-expert">Code Expert</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="model-provider">
                Provider <span className="text-danger">*</span>
              </label>
              <select
                id="model-provider"
                className={inputClass}
                value={modelForm.providerId}
                onChange={(e) =>
                  setModelForm({ ...modelForm, providerId: e.target.value })
                }
                required
              >
                <option value="">Select provider...</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="model-advantage">
                Advantage
              </label>
              <input
                id="model-advantage"
                type="text"
                className={inputClass}
                placeholder="Top-tier reasoning"
                value={modelForm.advantage}
                onChange={(e) =>
                  setModelForm({ ...modelForm, advantage: e.target.value })
                }
              />
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={createModel.isPending}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Model
            </Button>
          </form>
        </Card>

        {/* Add Provider Form + Provider List */}
        <div className="space-y-6">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                <Server className="h-4 w-4 text-accent" />
              </div>
              <h2 className="text-sm font-medium text-ink-100">Add Provider</h2>
            </div>

            <form onSubmit={handleCreateProvider} className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="provider-name">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  id="provider-name"
                  type="text"
                  className={inputClass}
                  placeholder="OpenRouter"
                  value={providerForm.name}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="provider-slug">
                  Slug <span className="text-danger">*</span>
                </label>
                <input
                  id="provider-slug"
                  type="text"
                  className={cn(inputClass, "font-mono")}
                  placeholder="openrouter"
                  value={providerForm.slug}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, slug: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="provider-url">
                  Base URL <span className="text-danger">*</span>
                </label>
                <input
                  id="provider-url"
                  type="url"
                  className={cn(inputClass, "font-mono")}
                  placeholder="https://api.example.com/v1"
                  value={providerForm.baseUrl}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, baseUrl: e.target.value })
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                fullWidth
                isLoading={createProvider.isPending}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Provider
              </Button>
            </form>
          </Card>

          {/* Provider list */}
          <Card padding="md">
            <h3 className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-3">
              Registered Providers
            </h3>
            <div className="space-y-2">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-ink-800/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ink-100 truncate">{p.name}</p>
                    <p className="text-[10px] text-ink-500 font-mono truncate">
                      {p.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs tabular-nums text-ink-400">
                      {p.totalModels - p.offlineModels}/{p.totalModels}
                    </span>
                    {p.isUnreliable ? (
                      <Badge variant="warning" size="xs" dot>
                        Unreliable
                      </Badge>
                    ) : (
                      <Badge variant="success" size="xs" dot>
                        Stable
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {providers.length === 0 && (
                <p className="text-xs text-ink-500 py-3 text-center">
                  No providers registered yet.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
