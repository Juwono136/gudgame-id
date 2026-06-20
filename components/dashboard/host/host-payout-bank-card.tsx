"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { HostBankAccountView, HostBankPayoutProfileView } from "@/lib/payments/host-payout/types";
import {
  normalizePayoutSchedule,
  type PayoutSchedule,
} from "@/lib/payments/host-payout/constants";
import { PayoutScheduleField } from "@/components/dashboard/host/payout-schedule-field";
import { cn } from "@/lib/utils";

type AccountFormState = {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  label: string;
};

const EMPTY_FORM: AccountFormState = {
  bankCode: "",
  accountNumber: "",
  accountHolder: "",
  label: "",
};

type BankOption = { code: string; name: string; canNameValidate: boolean };

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

function validateForm(form: AccountFormState) {
  const errors: Partial<Record<keyof AccountFormState, string>> = {};
  const n = form.accountNumber.replace(/\D/g, "");
  if (!form.bankCode?.trim()) errors.bankCode = "Please select a bank.";
  if (!n) errors.accountNumber = "Account number is required.";
  else if (n.length < 8 || n.length > 20) errors.accountNumber = "Account number must be 8–20 digits.";
  if (!form.accountHolder.trim()) errors.accountHolder = "Account holder name is required.";
  else if (form.accountHolder.trim().length < 3) errors.accountHolder = "Name is too short.";
  else if (form.accountHolder.trim().length > 120) errors.accountHolder = "Name is too long.";
  if (form.label.trim().length > 60) errors.label = "Label must be 60 characters or less.";
  return { errors, ok: Object.keys(errors).length === 0 };
}

export function HostPayoutBankCard({
  className,
  embedded = false,
}: {
  className?: string;
  embedded?: boolean;
}) {
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<HostBankAccountView | null>(null);
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM);
  const [schedule, setSchedule] = useState<PayoutSchedule>("weekly");
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof AccountFormState, boolean>>>({});
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["host", "bank-payout"],
    queryFn: async () => {
      const res = await fetch("/api/host/payout/bank");
      const json = await parseJsonResponse<{ success: boolean; data: { profile: HostBankPayoutProfileView } }>(
        res,
      );
      if (!res.ok) throw new Error("Failed to load payout profile");
      return json.data.profile;
    },
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBanksLoading(true);
      try {
        const res = await fetch("/api/payments/payout-channels");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed to load banks");
        const list = (json.data?.banks ?? []) as BankOption[];
        if (!cancelled) {
          setBanks(list);
          if (!editingAccount && list.length > 0) {
            setForm((f) => ({ ...f, bankCode: f.bankCode || list[0]!.code }));
          }
        }
      } catch (e) {
        // Keep UI usable even if Xendit is not configured yet.
        if (!cancelled) setBanks([]);
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingAccount]);

  useEffect(() => {
    if (profile?.payoutSchedule) {
      setSchedule(normalizePayoutSchedule(profile.payoutSchedule));
    }
  }, [profile?.payoutSchedule]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["host", "bank-payout"] });

  const openAddForm = () => {
    setEditingAccount(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setBankPickerOpen(false);
    setBankQuery("");
  };

  const openEditForm = (account: HostBankAccountView) => {
    setEditingAccount(account);
    setForm({
      bankCode: account.bankCode,
      accountNumber: account.bankAccountNumber,
      accountHolder: account.bankAccountHolder,
      label: account.label ?? "",
    });
    setFormOpen(true);
    setBankPickerOpen(false);
    setBankQuery("");
  };

  const saveAccount = useMutation({
    mutationFn: async () => {
      const payload = {
        bankCode: form.bankCode,
        bankAccountNumber: form.accountNumber.replace(/\D/g, ""),
        bankAccountHolder: form.accountHolder,
        label: form.label.trim() || undefined,
      };

      const ok = await confirm({
        title: editingAccount ? "Update bank account?" : "Add bank account?",
        description: editingAccount
          ? "Changes apply to future tournament payouts."
          : "Official tournament earnings will be transferred to your primary account on schedule.",
        confirmLabel: editingAccount ? "Save changes" : "Add account",
        cancelLabel: "Cancel",
      });
      if (!ok) throw new Error("cancelled");

      const url = editingAccount
        ? `/api/host/payout/bank/${editingAccount.id}`
        : "/api/host/payout/bank";
      const res = await fetch(url, {
        method: editingAccount ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseJsonResponse(res);
      if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "Save failed");
      return json;
    },
    onSuccess: () => {
      toast.success(editingAccount ? "Account updated" : "Account added");
      setFormOpen(false);
      setEditingAccount(null);
      setTouched({});
      invalidate();
    },
    onError: (e: Error) => {
      if (e.message !== "cancelled") toast.error(e.message);
    },
  });

  const setPrimary = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/host/payout/bank/${accountId}/primary`, { method: "POST" });
      const json = await parseJsonResponse(res);
      if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Primary account updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAccount = useMutation({
    mutationFn: async (account: HostBankAccountView) => {
      const ok = await confirm({
        title: "Remove bank account?",
        description: `${bankNameForCode(account.bankCode)} ${account.maskedAccount} will be removed from your payout list.`,
        confirmLabel: "Remove",
        cancelLabel: "Cancel",
        variant: "destructive",
      });
      if (!ok) throw new Error("cancelled");

      const res = await fetch(`/api/host/payout/bank/${account.id}`, { method: "DELETE" });
      const json = await parseJsonResponse(res);
      if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "Delete failed");
    },
    onSuccess: () => {
      toast.success("Account removed");
      invalidate();
    },
    onError: (e: Error) => {
      if (e.message !== "cancelled") toast.error(e.message);
    },
  });

  const saveSchedule = useMutation({
    mutationFn: async (value: PayoutSchedule) => {
      const res = await fetch("/api/host/payout/bank", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutSchedule: value }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data?: { profile: HostBankPayoutProfileView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not update payout schedule"));
      }
      return json.data?.profile;
    },
    onSuccess: (updatedProfile) => {
      if (updatedProfile?.payoutSchedule) {
        setSchedule(normalizePayoutSchedule(updatedProfile.payoutSchedule));
      }
      toast.success("Payout schedule updated");
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const handleScheduleChange = (value: PayoutSchedule) => {
    if (value === schedule || saveSchedule.isPending || migrationRequired) return;
    const previous = schedule;
    setSchedule(value);
    saveSchedule.mutate(value, {
      onError: () => setSchedule(previous),
    });
  };

  // Hooks MUST be called unconditionally (before early returns).
  const debouncedBankQuery = useDebouncedValue(bankQuery, 150);
  const filteredBanks = debouncedBankQuery.trim()
    ? banks.filter((b) => b.name.toLowerCase().includes(debouncedBankQuery.trim().toLowerCase()))
    : banks;

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-cp-border bg-cp-elevated/40 p-4", className)}>
        <LoadingSpinner label="Loading payout accounts…" />
      </div>
    );
  }

  const accounts = profile?.accounts ?? [];
  const canAdd = accounts.length < (profile?.maxAccounts ?? 3);
  const isConfigured = accounts.length > 0;
  const migrationRequired = Boolean(profile?.migrationRequired);

  const bankNameForCode = (code: string) =>
    banks.find((b) => b.code === code)?.name ?? code;

  const validation = validateForm(form);

  return (
    <div
      className={cn(
        embedded ? "space-y-5" : "rounded-2xl border p-4 sm:p-6",
        !embedded &&
          (isConfigured
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-cp-primary/30 bg-cp-primary/5"),
        embedded && "min-w-0",
        className,
      )}
    >
      <LoadingOverlay
        show={
          saveAccount.isPending ||
          removeAccount.isPending ||
          setPrimary.isPending ||
          saveSchedule.isPending
        }
        label={
          saveSchedule.isPending ? "Saving payout schedule…" : "Updating payout accounts…"
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {isConfigured ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
          )}
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {embedded ? "Your payout accounts" : "Payout bank accounts"}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-cp-muted">
              Add up to {profile?.maxAccounts ?? 3} accounts. Select one as primary — tournament
              earnings are deposited there on your chosen schedule. Notifications come from TandingBase
              only.
            </p>
          </div>
        </div>
        {canAdd ? (
          <Button size="sm" className="shrink-0 bg-cp-primary" onClick={openAddForm}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add account
          </Button>
        ) : null}
      </div>

      {migrationRequired ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
          This environment is missing DB migration for multi-bank accounts. Run migration
          <span className="font-medium"> `0003_host_bank_accounts.sql`</span> to enable adding
          multiple accounts and avoid API errors.
        </div>
      ) : null}

      {accounts.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {accounts.map((account) => (
            <li
              key={account.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border bg-cp-card/80 p-4 sm:flex-row sm:items-center sm:justify-between",
                account.isPrimary ? "border-cp-primary/40 ring-1 ring-cp-primary/20" : "border-cp-border",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">
                    {bankNameForCode(account.bankCode)} · {account.maskedAccount}
                  </p>
                  {account.isPrimary ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cp-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cp-primary">
                      <Star className="h-3 w-3 fill-current" />
                      Primary
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-cp-muted">{account.bankAccountHolder}</p>
                {account.label ? (
                  <p className="mt-0.5 text-xs text-cp-text-dim">{account.label}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!account.isPrimary ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-cp-border text-xs"
                    disabled={setPrimary.isPending}
                    onClick={() => setPrimary.mutate(account.id)}
                  >
                    Set primary
                  </Button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="border-cp-border px-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditForm(account)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-400"
                      onClick={() => removeAccount.mutate(account)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-cp-border py-10 text-center">
          <Banknote className="mx-auto h-8 w-8 text-cp-muted" />
          <p className="mt-3 text-sm font-medium text-foreground">No payout account yet</p>
          <p className="mt-1 text-xs text-cp-muted">Add a bank account to receive official tournament revenue.</p>
          <Button size="sm" className="mt-4 bg-cp-primary" onClick={openAddForm}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add your first account
          </Button>
        </div>
      )}

      {isConfigured ? (
        <div className="mt-5 border-t border-cp-border/60 pt-5">
          <PayoutScheduleField
            value={schedule}
            onChange={handleScheduleChange}
            disabled={migrationRequired}
            isSaving={saveSchedule.isPending}
          />
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-cp-muted lg:justify-end">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Bank details are encrypted and used only for tournament payouts.</span>
          </p>
        </div>
      ) : null}

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            className="w-full max-w-md rounded-2xl border border-cp-border bg-cp-card p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-form-title"
          >
            <h3 id="bank-form-title" className="text-lg font-semibold text-foreground">
              {editingAccount ? "Edit bank account" : "Add bank account"}
            </h3>
            <p className="mt-1 text-xs text-cp-muted">
              {editingAccount
                ? "Update account details. Primary selection is managed separately."
                : `You can add ${(profile?.maxAccounts ?? 3) - accounts.length} more account(s).`}
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const v = validateForm(form);
                if (!v.ok) {
                  setTouched({ bankCode: true, accountNumber: true, accountHolder: true, label: true });
                  toast.error("Please complete the required fields", {
                    description: "Check the highlighted inputs and try again.",
                  });
                  return;
                }
                saveAccount.mutate();
              }}
            >
              <div>
                <Label>Label (optional)</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Business account"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                />
                {touched.label && validation.errors.label ? (
                  <p className="mt-1 text-xs text-red-300">{validation.errors.label}</p>
                ) : null}
              </div>
              <div>
                <Label>Bank</Label>
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setBankPickerOpen((s) => !s)}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border bg-cp-elevated/40 px-3 text-sm",
                      touched.bankCode && validation.errors.bankCode
                        ? "border-red-500/40"
                        : "border-cp-border",
                    )}
                  >
                    <span className={cn("truncate", form.bankCode ? "text-foreground" : "text-cp-muted")}>
                      {banksLoading
                        ? "Loading banks…"
                        : form.bankCode
                          ? bankNameForCode(form.bankCode)
                          : "Select bank"}
                    </span>
                    <span className="text-cp-muted">▾</span>
                  </button>

                  {bankPickerOpen ? (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-cp-border bg-cp-card shadow-xl">
                      <div className="border-b border-cp-border p-2">
                        <Input
                          autoFocus
                          placeholder="Search bank…"
                          value={bankQuery}
                          onChange={(e) => setBankQuery(e.target.value)}
                        />
                      </div>
                      <div className="max-h-64 overflow-auto p-1">
                        {filteredBanks.length > 0 ? (
                          filteredBanks.map((b) => (
                            <button
                              key={b.code}
                              type="button"
                              onClick={() => {
                                setForm((f) => ({ ...f, bankCode: b.code }));
                                setTouched((t) => ({ ...t, bankCode: true }));
                                setBankPickerOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-cp-elevated/60",
                                form.bankCode === b.code ? "bg-cp-primary/10 text-cp-primary" : "text-foreground",
                              )}
                            >
                              <span className="truncate">{b.name}</span>
                              {form.bankCode === b.code ? <span className="text-xs">Selected</span> : null}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-3 text-sm text-cp-muted">No banks match your search.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                {touched.bankCode && validation.errors.bankCode ? (
                  <p className="mt-1 text-xs text-red-300">{validation.errors.bankCode}</p>
                ) : null}
              </div>
              <div>
                <Label>Account number</Label>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  placeholder="1234567890"
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, "") }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, accountNumber: true }))}
                />
                {touched.accountNumber && validation.errors.accountNumber ? (
                  <p className="mt-1 text-xs text-red-300">{validation.errors.accountNumber}</p>
                ) : null}
              </div>
              <div>
                <Label>Account holder name</Label>
                <Input
                  className="mt-1"
                  placeholder="As shown on bank account"
                  value={form.accountHolder}
                  onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
                  onBlur={() => setTouched((t) => ({ ...t, accountHolder: true }))}
                />
                {touched.accountHolder && validation.errors.accountHolder ? (
                  <p className="mt-1 text-xs text-red-300">{validation.errors.accountHolder}</p>
                ) : null}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-cp-border"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingAccount(null);
                    setTouched({});
                      setBankPickerOpen(false);
                      setBankQuery("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-cp-primary"
                  disabled={saveAccount.isPending || migrationRequired || banksLoading}
                >
                  {saveAccount.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : editingAccount ? (
                    "Save changes"
                  ) : (
                    "Add account"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
