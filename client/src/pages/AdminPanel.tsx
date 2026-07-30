import { useState } from "react";
import { Check, KeyRound, Play, RefreshCw, X } from "lucide-react";
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

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const actions = useAdminActions();
  const { showToast } = useToast();
  return <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
    event.preventDefault();
    if (newPassword !== confirmation) { showToast({ title: "Пароли не совпадают", variant: "error" }); return; }
    actions.changePassword.mutate({ currentPassword, newPassword }, { onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirmation(""); showToast({ title: "Пароль изменён", variant: "success" }); }, onError: () => showToast({ title: "Не удалось изменить пароль", variant: "error" }) });
  }}>
    <input aria-label="Текущий пароль" type="password" autoComplete="current-password" minLength={12} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Текущий пароль" className="h-8 w-36 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200" required />
    <input aria-label="Новый пароль" type="password" autoComplete="new-password" minLength={12} maxLength={256} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Новый пароль" className="h-8 w-36 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200" required />
    <input aria-label="Подтверждение нового пароля" type="password" autoComplete="new-password" minLength={12} maxLength={256} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Повтор" className="h-8 w-28 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200" required />
    <Button type="submit" size="sm" isLoading={actions.changePassword.isPending}>Сменить пароль</Button>
  </form>;
}

function CandidateRow({ candidate }: { candidate: CandidateModel }) {
  const actions = useAdminActions();
  const { showToast } = useToast();
  const [category, setCategory] = useState<ModelCategory>(candidate.categorySuggestion ?? "DEFAULT");
  const [stars, setStars] = useState(4);
  const busy = actions.setQuota.isPending || actions.test.isPending || actions.approve.isPending || actions.reject.isPending || actions.updateMetadata.isPending;

  const fail = () => showToast({ title: "Операция не выполнена", variant: "error" });

  return (
    <article className="grid gap-3 px-4 py-4 border-b border-ink-800/60 last:border-0 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink-100 truncate">{candidate.name}</p>
          <StatusIndicator status={candidate.testStatus} showLabel size="xs" />
          <span className={candidate.quotaStatus === "FREE" ? "text-[10px] text-success" : candidate.quotaStatus === "LIMITED" ? "text-[10px] text-warning" : "text-[10px] text-ink-500"}>{candidate.quotaStatus}</span>
        </div>
        <p className="text-[11px] text-ink-500 font-mono truncate mt-1">{candidate.provider.name} / {candidate.slug}</p>
        <p className="text-[11px] text-ink-500 mt-1">{candidate.errorMessage ?? candidate.freeSource ?? "Ожидает проверки"}{candidate.speedMs ? ` · ${formatSpeed(candidate.speedMs)}` : ""}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={busy} isLoading={actions.test.isPending} leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => actions.test.mutate(candidate.id, { onSuccess: () => showToast({ title: "Тест завершён", variant: "success" }), onError: fail })}>Тест</Button>
        <Button size="sm" variant="ghost" disabled={busy} aria-label="Отклонить" onClick={() => actions.reject.mutate(candidate.id, { onSuccess: () => showToast({ title: "Кандидат исключён", variant: "success" }), onError: fail })}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex items-center gap-2">
        <select value={candidate.quotaStatus} onChange={(event) => actions.setQuota.mutate({ id: candidate.id, status: event.target.value as CandidateModel["quotaStatus"] }, { onError: fail })} className="h-8 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200">
          {(["UNKNOWN", "FREE", "LIMITED"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={category} onChange={(event) => { const value = event.target.value as ModelCategory; setCategory(value); actions.updateMetadata.mutate({ id: candidate.id, body: { category: value } }, { onError: fail }); }} className="h-8 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200">
          {CATEGORY_ORDER.map((value) => <option key={value} value={value}>{CATEGORY_META[value].label}</option>)}
        </select>
        <select value={stars} onChange={(event) => setStars(Number(event.target.value))} className="h-8 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200">
          {[5, 4.5, 4, 3.5, 3].map((value) => <option key={value} value={value}>{value} ★</option>)}
        </select>
        <Button size="sm" disabled={busy || !["FREE", "LIMITED"].includes(candidate.quotaStatus) || candidate.testStatus !== "ONLINE"} isLoading={actions.approve.isPending} leftIcon={<Check className="h-3.5 w-3.5" />} onClick={() => actions.approve.mutate({ id: candidate.id, category, stars }, { onSuccess: () => showToast({ title: "Модель опубликована в каталоге", variant: "success" }), onError: fail })}>В каталог</Button>
      </div>
    </article>
  );
}

export function AdminPanel() {
  const session = useAdminSession();
  const [providerFilter, setProviderFilter] = useState<string>();
  const [quotaFilter, setQuotaFilter] = useState<"ALL" | CandidateModel["quotaStatus"]>("ALL");
  const providersQuery = useAdminProviders(Boolean(session.data?.authenticated));
  const candidatesQuery = useCandidates(Boolean(session.data?.authenticated), providerFilter);
  const actions = useAdminActions();
  const { showToast } = useToast();
  const fail = () => showToast({ title: "Операция не выполнена", variant: "error" });

  if (session.isLoading) return <div className="pt-28 text-center text-sm text-ink-400">Проверяю доступ…</div>;
  if (!session.data?.authenticated) return <LoginForm />;

  const providers = providersQuery.data?.providers ?? [];
  const candidates = (candidatesQuery.data?.candidates ?? []).filter((candidate) => candidate.reviewStatus === "DISCOVERED" && !candidate.hidden && (quotaFilter === "ALL" || candidate.quotaStatus === quotaFilter));

  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs text-accent uppercase tracking-[0.18em]">Контур отбора</p><h1 className="text-hero font-medium text-ink-100 mt-1">Провайдеры и кандидаты</h1><p className="text-sm text-ink-400 mt-2 max-w-2xl">Ключи не покидают сервер. Витрина получает только модели, прошедшие проверку free и реальный запрос.</p></div>
        <div className="flex flex-wrap justify-end gap-2"><ChangePasswordForm /><Button variant="secondary" size="sm" isLoading={actions.discoverAll.isPending} onClick={() => actions.discoverAll.mutate(undefined, { onSuccess: () => showToast({ title: "Каталоги провайдеров обновлены", variant: "success" }), onError: fail })}>Обновить всех</Button><Button variant="secondary" size="sm" isLoading={actions.testAll.isPending} onClick={() => actions.testAll.mutate(undefined, { onSuccess: (data) => showToast({ title: `Проверено моделей: ${data.totalChecked}`, variant: "success" }), onError: fail })}>Проверить все</Button><Button variant="ghost" size="sm" onClick={() => actions.logout.mutate(undefined, { onSuccess: () => window.location.reload() })}>Выйти</Button></div>
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><div><h2 className="text-base font-medium text-ink-100">Очередь проверки</h2><p className="text-xs text-ink-500 mt-1">Unknown не публикуется; тариф и роль подтверждаются администратором.</p></div><div className="flex items-center gap-2"><select value={quotaFilter} onChange={(event) => setQuotaFilter(event.target.value as typeof quotaFilter)} className="h-8 rounded-lg bg-ink-800/60 border border-ink-700/40 px-2 text-xs text-ink-200"><option value="ALL">Все</option><option value="FREE">Free</option><option value="LIMITED">Limited</option><option value="UNKNOWN">Unknown</option></select><span className="text-xs tabular-nums text-ink-400">{candidates.length}</span></div></div>
        <Card padding="none">
          {candidatesQuery.isLoading ? <p className="px-4 py-8 text-sm text-ink-500">Загрузка кандидатов…</p> : candidates.length === 0 ? <p className="px-4 py-8 text-sm text-ink-500">Кандидатов пока нет. Загрузите каталог одного из подключённых провайдеров.</p> : candidates.map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} />)}
        </Card>
      </section>
    </div>
  );
}
