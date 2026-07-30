import { useState } from "react";
import { Check, Eye, KeyRound, Minus, Play, Plus, RefreshCw, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/health/StatusIndicator";
import { useAdminActions, useAdminProviders, useAdminSession, useCandidates } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import { CATEGORY_META, formatSpeed } from "@/lib/utils";
import { api } from "@/lib/api";
import type { CandidateModel, ModelCategory } from "@/lib/types";

function LoginGate() {
  const [password, setPassword] = useState("");
  const actions = useAdminActions();
  const { showToast } = useToast();

  return (
    <div className="pt-28 px-4 max-w-md mx-auto">
      <Card padding="lg">
        <KeyRound className="h-6 w-6 text-accent mb-4" />
        <h1 className="text-xl font-medium text-ink-100">Вход в Free Models</h1>
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            actions.login.mutate(password, {
              onError: () => showToast({ title: "Неверный пароль", variant: "error" }),
            });
          }}
        >
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full h-10 px-3 rounded-input bg-ink-800/40 border border-ink-700/30 text-sm text-ink-100"
            placeholder="Пароль"
            required
          />
          <Button type="submit" fullWidth isLoading={actions.login.isPending}>Войти</Button>
        </form>
      </Card>
    </div>
  );
}

function Stars({ stars }: { stars: number }) {
  return (
    <span className="inline-flex text-warning" title={`${stars} stars`}>
      {Array.from({ length: Math.round(stars) }).map((_, index) => (
        <Star key={index} className="h-3 w-3 fill-current" />
      ))}
    </span>
  );
}

function CandidateRow({ candidate }: { candidate: CandidateModel }) {
  const actions = useAdminActions();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Array<{ role: ModelCategory; stars: number }>>([]);
  const [open, setOpen] = useState(false);
  const busy = actions.test.isPending || actions.approve.isPending || actions.updateMetadata.isPending;
  const canPublish = candidate.testStatus === "ONLINE" && ["FREE", "LIMITED"].includes(candidate.quotaStatus);

  const toggleRole = (role: ModelCategory, stars: number) => {
    setSelected((current) => current.some((item) => item.role === role)
      ? current.filter((item) => item.role !== role)
      : [...current, { role, stars }]);
  };

  return (
    <article className="grid gap-3 p-4 border-b border-ink-800/60 last:border-0 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 items-center">
          <p className="text-sm text-ink-100 font-medium truncate">{candidate.name}</p>
          <StatusIndicator status={candidate.testStatus} size="xs" showLabel />
          <span className={candidate.quotaStatus === "FREE" ? "text-success text-xs" : candidate.quotaStatus === "LIMITED" ? "text-warning text-xs" : "text-ink-500 text-xs"}>
            {candidate.quotaStatus}{candidate.quotaLimit ? ` · ${candidate.quotaLimit}` : ""}
          </span>
        </div>
        <p className="text-[11px] text-ink-500 font-mono mt-1 truncate">
          {candidate.provider.name} / {candidate.slug}{candidate.speedMs ? ` · ${formatSpeed(candidate.speedMs)}` : ""}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {candidate.roleMatches.map((match) => (
            <span key={match.role} className="inline-flex gap-1 items-center rounded border border-ink-700/50 px-1.5 py-0.5 text-[10px] text-ink-300">
              <span>{CATEGORY_META[match.role]?.label ?? match.role}</span>
              <Stars stars={match.stars} />
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          isLoading={actions.test.isPending}
          leftIcon={<Play className="h-3.5 w-3.5" />}
          onClick={() => actions.test.mutate(candidate.id, {
            onSuccess: () => showToast({ title: "Тест завершён", variant: "success" }),
            onError: () => showToast({ title: "Тест не выполнен", variant: "error" }),
          })}
        >
          Тест
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          aria-label={candidate.hidden ? "Вернуть" : "Скрыть"}
          title={candidate.hidden ? "Вернуть в рабочую очередь" : "Скрыть из активной очереди"}
          onClick={() => actions.updateMetadata.mutate({ id: candidate.id, body: { hidden: !candidate.hidden } })}
        >
          {candidate.hidden ? <Eye className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </Button>
      </div>
      <div className="relative">
        <Button
          size="sm"
          disabled={busy || !canPublish || !candidate.roleMatches.length}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setOpen((value) => !value)}
          title={canPublish ? "Выбрать роли" : "Сначала выполните успешный тест модели"}
        >
          Добавить
        </Button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-ink-700 bg-ink-900 p-3 shadow-xl">
            <p className="text-xs text-ink-400 mb-2">Добавить в роли (рекомендации от 3★)</p>
            {candidate.roleMatches.map((match) => (
              <label key={match.role} className="flex items-center justify-between py-1.5 text-xs text-ink-200">
                <span className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={selected.some((item) => item.role === match.role)}
                    onChange={() => toggleRole(match.role, match.stars)}
                  />
                  {CATEGORY_META[match.role]?.label ?? match.role}
                </span>
                <Stars stars={match.stars} />
              </label>
            ))}
            <Button
              className="mt-3"
              size="sm"
              fullWidth
              disabled={!selected.length}
              isLoading={actions.approve.isPending}
              onClick={() => actions.approve.mutate({ id: candidate.id, placements: selected }, {
                onSuccess: () => {
                  setOpen(false);
                  setSelected([]);
                  showToast({ title: "Добавлено в рейтинг", variant: "success" });
                },
                onError: () => showToast({ title: "Добавление не выполнено", variant: "error" }),
              })}
            >
              <Check className="h-3.5 w-3.5" />Добавить выбранные
            </Button>
          </div>
        )}
        {!canPublish && <p className="mt-1 text-[10px] text-ink-500">Добавление станет доступно после Online-теста.</p>}
      </div>
    </article>
  );
}

export function AdminPanel() {
  const session = useAdminSession();
  const actions = useAdminActions();
  const { showToast } = useToast();
  const [providerSlug, setProviderSlug] = useState<string>();
  const [quota, setQuota] = useState<"ALL" | CandidateModel["quotaStatus"]>("ALL");
  const [candidateView, setCandidateView] = useState<"FOCUS" | "ARCHIVE" | "HIDDEN">("FOCUS");
  const [customUrl, setCustomUrl] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customModels, setCustomModels] = useState<Array<{ slug: string; name: string }>>([]);
  const [customBusy, setCustomBusy] = useState(false);
  const providersQuery = useAdminProviders(Boolean(session.data?.authenticated));
  const candidatesQuery = useCandidates(Boolean(session.data?.authenticated), providerSlug);

  if (!session.data?.authenticated) return <LoginGate />;

  const providers = providersQuery.data?.providers ?? [];
  const selectedProvider = providers.find((provider) => provider.slug === providerSlug);
  const candidates = (candidatesQuery.data?.candidates ?? []).filter((candidate) => {
    if (!["DISCOVERED", "APPROVED"].includes(candidate.reviewStatus) || (quota !== "ALL" && candidate.quotaStatus !== quota)) return false;
    if (candidateView === "HIDDEN") return candidate.hidden;
    if (candidate.hidden) return false;
    const isCandidateForTest = ["FREE", "LIMITED"].includes(candidate.quotaStatus);
    return candidateView === "FOCUS" ? isCandidateForTest : !isCandidateForTest;
  });

  const discover = () => selectedProvider && actions.discover.mutate(selectedProvider.slug, {
    onSuccess: () => showToast({ title: "Модели обнаружены", variant: "success" }),
    onError: () => showToast({ title: "Discovery не выполнен", variant: "error" }),
  });

  const testAvailable = () => actions.testAll.mutate(selectedProvider?.slug, {
    onSuccess: (result) => showToast({ title: `Проверено моделей: ${result.totalChecked}`, variant: "success" }),
    onError: () => showToast({ title: "Групповой тест не выполнен", variant: "error" }),
  });

  const testCustom = async () => {
    setCustomBusy(true);
    try {
      const result = await api.discoverCustom(customUrl, customKey);
      setCustomModels(result.models);
      showToast({ title: `Найдено моделей: ${result.models.length}`, variant: "success" });
    } catch {
      showToast({ title: "Custom API недоступен", variant: "error" });
    } finally {
      setCustomBusy(false);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between gap-3 mb-7">
        <div>
          <h1 className="text-display font-medium text-ink-100">Отбор моделей</h1>
          <p className="text-sm text-ink-400 mt-1">Discovery → проверка задачи → ручное добавление в роли.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => actions.logout.mutate()}>Выйти</Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card padding="md">
          <p className="text-xs text-ink-400 mb-2">Провайдер из Portainer</p>
          <div className="flex gap-2">
            <select
              value={providerSlug ?? ""}
              onChange={(event) => setProviderSlug(event.target.value || undefined)}
              className="h-10 min-w-0 flex-1 rounded-lg bg-ink-800/60 border border-ink-700/40 px-3 text-sm text-ink-100"
            >
              <option value="">Выберите провайдера</option>
              {providers.filter((provider) => provider.configured).map((provider) => (
                <option key={provider.id} value={provider.slug}>{provider.name}</option>
              ))}
            </select>
            <Button disabled={!selectedProvider} isLoading={actions.discover.isPending} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={discover}>
              Discover models
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <p className="text-xs text-success">{selectedProvider?.configured ? "Credential подключён через Portainer" : "Выберите подключённого провайдера"}</p>
            <Button size="sm" variant="secondary" disabled={!selectedProvider} isLoading={actions.testAll.isPending} onClick={testAvailable}>
              Тест доступных моделей
            </Button>
          </div>
        </Card>

        <Card padding="md">
          <p className="text-xs text-ink-400 mb-1">Custom API — только на сессию</p>
          <p className="text-[11px] text-ink-500 mb-2">Для известных провайдеров используйте выбор слева. Для Custom API нужен Base URL; ключ не сохраняется.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={customUrl} onChange={(event) => setCustomUrl(event.target.value)} placeholder="Base URL" className="h-9 rounded-lg bg-ink-800/60 border border-ink-700/40 px-3 text-xs text-ink-100" />
            <input value={customKey} onChange={(event) => setCustomKey(event.target.value)} type="password" autoComplete="off" placeholder="API key" className="h-9 rounded-lg bg-ink-800/60 border border-ink-700/40 px-3 text-xs text-ink-100" />
          </div>
          <Button size="sm" className="mt-2" disabled={!customKey} isLoading={customBusy} onClick={testCustom}>Проверить</Button>
          {customModels.length > 0 && <p className="text-xs text-ink-400 mt-2">Custom discovery: {customModels.length}. Ключ не сохранён.</p>}
        </Card>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-medium text-ink-100">{candidateView === "FOCUS" ? "Доступные кандидаты" : candidateView === "HIDDEN" ? "Скрытые кандидаты" : "Paid / Unknown / Offline"}</h2>
            <p className="text-xs text-ink-500 mt-1">
              {candidateView === "FOCUS" ? "Free/Limited: сначала массовый тест, после Online можно добавить в рейтинг." : candidateView === "HIDDEN" ? "Скрыты из рабочей очереди; история сохранена." : "Справочный архив: не публикуется и не расходует batch-тесты."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={candidateView === "FOCUS" ? "primary" : "secondary"} onClick={() => setCandidateView("FOCUS")}>Free / Limited</Button>
            <Button size="sm" variant={candidateView === "ARCHIVE" ? "primary" : "secondary"} onClick={() => setCandidateView("ARCHIVE")}>Paid / Unknown</Button>
            <Button size="sm" variant={candidateView === "HIDDEN" ? "primary" : "secondary"} onClick={() => setCandidateView("HIDDEN")}>Скрытые</Button>
            <select value={quota} onChange={(event) => setQuota(event.target.value as typeof quota)} className="h-8 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200">
              <option value="ALL">Все</option><option value="FREE">Free</option><option value="LIMITED">Limited</option><option value="PAID">Paid</option><option value="UNKNOWN">Unknown</option>
            </select>
          </div>
        </div>
        <Card padding="none">
          {candidatesQuery.isLoading ? <p className="p-6 text-sm text-ink-500">Загрузка…</p>
            : candidates.length ? candidates.map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} />)
              : <p className="p-6 text-sm text-ink-500">Выберите provider и запустите Discover models.</p>}
        </Card>
      </section>
    </div>
  );
}
