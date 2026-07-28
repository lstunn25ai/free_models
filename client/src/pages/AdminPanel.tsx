import { useState } from "react";
import { Check, KeyRound, Play, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/health/StatusIndicator";
import { useAdminActions, useAdminProviders, useAdminSession, useCandidates } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import { CATEGORY_META, CATEGORY_ORDER, cn, formatSpeed } from "@/lib/utils";
import type { CandidateModel, ModelCategory } from "@/lib/types";

function LoginForm() {
  const [password, setPassword] = useState("");
  const actions = useAdminActions();
  const { showToast } = useToast();

  return (
    <div className="pt-28 px-4 max-w-md mx-auto">
      <Card padding="lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 mb-5">
          <KeyRound className="h-5 w-5 text-accent" />
        </div>
        <h1 className="text-2xl font-medium text-ink-100">Администрирование</h1>
        <p className="text-sm text-ink-400 mt-2">Подключение провайдеров и тесты моделей доступны только владельцу.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            actions.login.mutate(password, {
              onError: () => showToast({ title: "Не удалось войти", variant: "error" }),
            });
          }}
        >
          <label className="block text-xs text-ink-400" htmlFor="admin-password">Пароль администратора</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full h-10 px-3 rounded-input bg-ink-800/40 border border-ink-700/30 text-sm text-ink-100 focus:outline-none focus:border-accent/50"
            required
          />
          <Button type="submit" fullWidth isLoading={actions.login.isPending} leftIcon={<KeyRound className="h-4 w-4" />}>Войти</Button>
        </form>
      </Card>
    </div>
  );
}

function SetupForm({ setupToken }: { setupToken: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const actions = useAdminActions();
  const { showToast } = useToast();

  return (
    <div className="pt-28 px-4 max-w-md mx-auto">
      <Card padding="lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 mb-5"><ShieldCheck className="h-5 w-5 text-success" /></div>
        <h1 className="text-2xl font-medium text-ink-100">Создать администратора</h1>
        <p className="text-sm text-ink-400 mt-2">Будет создан единственный локальный аккаунт <code>admin</code>. Пароль сохраняется только как хэш.</p>
        <form className="mt-6 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          if (password !== confirmation) { showToast({ title: "Пароли не совпадают", variant: "error" }); return; }
          actions.setup.mutate({ password, setupToken }, { onSuccess: () => { window.history.replaceState({}, "", "/admin"); showToast({ title: "Администратор создан", variant: "success" }); }, onError: () => showToast({ title: "Не удалось завершить первичную настройку", variant: "error" }) });
        }}>
          <label className="block text-xs text-ink-400" htmlFor="setup-password">Новый пароль (минимум 12 символов)</label>
          <input id="setup-password" type="password" autoComplete="new-password" minLength={12} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full h-10 px-3 rounded-input bg-ink-800/40 border border-ink-700/30 text-sm text-ink-100 focus:outline-none focus:border-accent/50" required />
          <label className="block text-xs text-ink-400" htmlFor="setup-confirmation">Повторите пароль</label>
          <input id="setup-confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={256} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full h-10 px-3 rounded-input bg-ink-800/40 border border-ink-700/30 text-sm text-ink-100 focus:outline-none focus:border-accent/50" required />
          <Button type="submit" fullWidth isLoading={actions.setup.isPending} leftIcon={<ShieldCheck className="h-4 w-4" />}>Создать admin</Button>
        </form>
      </Card>
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: CandidateModel }) {
  const actions = useAdminActions();
  const { showToast } = useToast();
  const [category, setCategory] = useState<ModelCategory>(candidate.categorySuggestion ?? "DEFAULT");
  const [stars, setStars] = useState(4);
  const busy = actions.setFree.isPending || actions.test.isPending || actions.approve.isPending || actions.reject.isPending;

  const fail = () => showToast({ title: "Операция не выполнена", variant: "error" });

  return (
    <article className="grid gap-3 px-4 py-4 border-b border-ink-800/60 last:border-0 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink-100 truncate">{candidate.name}</p>
          <StatusIndicator status={candidate.testStatus} showLabel size="xs" />
          {candidate.isFree ? <span className="text-[10px] text-success">FREE verified</span> : <span className="text-[10px] text-warning">требует проверки free</span>}
        </div>
        <p className="text-[11px] text-ink-500 font-mono truncate mt-1">{candidate.provider.name} / {candidate.slug}</p>
        <p className="text-[11px] text-ink-500 mt-1">{candidate.errorMessage ?? candidate.freeSource ?? "Ожидает проверки"}{candidate.speedMs ? ` · ${formatSpeed(candidate.speedMs)}` : ""}</p>
      </div>
      <div className="flex items-center gap-2">
        {!candidate.isFree ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => actions.setFree.mutate({ id: candidate.id, isFree: true }, { onSuccess: () => showToast({ title: "Модель отмечена как free", variant: "success" }), onError: fail })}>Подтвердить free</Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={busy} isLoading={actions.test.isPending} leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => actions.test.mutate(candidate.id, { onSuccess: () => showToast({ title: "Тест завершён", variant: "success" }), onError: fail })}>Тест</Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} aria-label="Отклонить" onClick={() => actions.reject.mutate(candidate.id, { onSuccess: () => showToast({ title: "Кандидат исключён", variant: "success" }), onError: fail })}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex items-center gap-2">
        <select value={category} onChange={(event) => setCategory(event.target.value as ModelCategory)} className="h-8 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200">
          {CATEGORY_ORDER.map((value) => <option key={value} value={value}>{CATEGORY_META[value].label}</option>)}
        </select>
        <select value={stars} onChange={(event) => setStars(Number(event.target.value))} className="h-8 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200">
          {[5, 4.5, 4, 3.5, 3].map((value) => <option key={value} value={value}>{value} ★</option>)}
        </select>
        <Button size="sm" disabled={busy || !candidate.isFree || candidate.testStatus !== "ONLINE"} isLoading={actions.approve.isPending} leftIcon={<Check className="h-3.5 w-3.5" />} onClick={() => actions.approve.mutate({ id: candidate.id, category, stars }, { onSuccess: () => showToast({ title: "Модель опубликована в каталоге", variant: "success" }), onError: fail })}>В каталог</Button>
      </div>
    </article>
  );
}

export function AdminPanel({ setupToken }: { setupToken?: string }) {
  const session = useAdminSession();
  const [providerFilter, setProviderFilter] = useState<string>();
  const providersQuery = useAdminProviders(Boolean(session.data?.authenticated));
  const candidatesQuery = useCandidates(Boolean(session.data?.authenticated), providerFilter);
  const actions = useAdminActions();
  const { showToast } = useToast();

  if (session.isLoading) return <div className="pt-28 text-center text-sm text-ink-400">Проверяю доступ…</div>;
  if (session.data?.setupRequired && setupToken) return <SetupForm setupToken={setupToken} />;
  if (session.data?.setupRequired) return <div className="pt-28 px-4 max-w-xl mx-auto"><Card padding="lg"><ShieldCheck className="h-6 w-6 text-warning mb-4" /><h1 className="text-xl text-ink-100">Первичная настройка защищена</h1><p className="text-sm text-ink-400 mt-2">Откройте одноразовую ссылку из логов контейнера. Она действует 15 минут и после создания admin станет недействительной.</p></Card></div>;
  if (!session.data?.authenticated) return <LoginForm />;

  const providers = providersQuery.data?.providers ?? [];
  const candidates = (candidatesQuery.data?.candidates ?? []).filter((candidate) => candidate.reviewStatus === "DISCOVERED");

  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs text-accent uppercase tracking-[0.18em]">Контур отбора</p><h1 className="text-hero font-medium text-ink-100 mt-1">Провайдеры и кандидаты</h1><p className="text-sm text-ink-400 mt-2 max-w-2xl">Ключи не покидают сервер. Витрина получает только модели, прошедшие проверку free и реальный запрос.</p></div>
        <Button variant="ghost" size="sm" onClick={() => actions.logout.mutate(undefined, { onSuccess: () => window.location.reload() })}>Выйти</Button>
      </header>

      <section aria-label="Провайдеры" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {providers.map((provider) => (
          <Card key={provider.id} padding="md" className={cn(!provider.configured && "opacity-65")}>
            <div className="flex items-start justify-between gap-2"><div><h2 className="text-sm font-medium text-ink-100">{provider.name}</h2><p className="text-xs text-ink-500 mt-1">{provider.candidateCount} кандидатов · {provider.approvedModelCount} опубликовано</p></div><span className={cn("h-2 w-2 rounded-full mt-1.5", provider.configured ? "bg-success" : "bg-ink-600")} /></div>
            <p className="text-xs text-ink-400 mt-5">{provider.configured ? "Ключ обнаружен в защищённом окружении" : "Ключ не задан"}</p>
            <div className="mt-4 flex gap-2"><Button size="sm" variant="secondary" disabled={!provider.configured} isLoading={actions.discover.isPending} leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => actions.discover.mutate(provider.slug, { onSuccess: (data) => showToast({ title: `Импортировано: ${data.imported}; free: ${data.freeCandidates}`, variant: "success" }), onError: () => showToast({ title: "Не удалось получить каталог", variant: "error" }) })}>Загрузить модели</Button><Button size="sm" variant="ghost" onClick={() => setProviderFilter(providerFilter === provider.slug ? undefined : provider.slug)}>Показать</Button></div>
          </Card>
        ))}
      </section>

      <section className="mt-10" aria-label="Кандидаты моделей">
        <div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="text-base font-medium text-ink-100">Очередь проверки</h2><p className="text-xs text-ink-500 mt-1">Тест доступен после подтверждения бесплатного доступа. В каталог попадёт только ответившая модель.</p></div><span className="text-xs tabular-nums text-ink-400">{candidates.length}</span></div>
        <Card padding="none">
          {candidatesQuery.isLoading ? <p className="px-4 py-8 text-sm text-ink-500">Загрузка кандидатов…</p> : candidates.length === 0 ? <p className="px-4 py-8 text-sm text-ink-500">Кандидатов пока нет. Загрузите каталог одного из подключённых провайдеров.</p> : candidates.map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} />)}
        </Card>
      </section>
    </div>
  );
}
