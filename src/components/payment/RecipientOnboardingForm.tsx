import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner-toast";
import {
  AccountType,
  ManagingPartnerInput,
  RecipientAddressInput,
  RecipientSubmitError,
  RecipientSubmitInput,
  RecipientSubmitResponse,
  restaurantRecipientService,
} from "@/services/restaurantRecipientService";
import { AlertCircle, Loader2 } from "lucide-react";

const EMPTY_ADDRESS: RecipientAddressInput = {
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zip_code: "",
  reference_point: "",
};

const EMPTY_PARTNER: ManagingPartnerInput = {
  name: "",
  document: "",
  email: "",
  birthdate: "",
  mother_name: "",
  monthly_income: 0,
  professional_occupation: "",
  phone: "",
  address: { ...EMPTY_ADDRESS },
  self_declared_legal_representative: true,
};

interface FormState {
  holder_name: string;
  holder_document: string;
  email: string;
  phone: string;
  birthdate: string;
  mother_name: string;
  monthly_income: string;
  professional_occupation: string;
  company_name: string;
  trading_name: string;
  annual_revenue: string;
  address: RecipientAddressInput;
  managing_partners: ManagingPartnerInput[];
  bank_code: string;
  branch_number: string;
  branch_check_digit: string;
  account_number: string;
  account_check_digit: string;
  account_type: AccountType;
}

const EMPTY_FORM: FormState = {
  holder_name: "",
  holder_document: "",
  email: "",
  phone: "",
  birthdate: "",
  mother_name: "",
  monthly_income: "",
  professional_occupation: "",
  company_name: "",
  trading_name: "",
  annual_revenue: "",
  address: { ...EMPTY_ADDRESS },
  managing_partners: [{ ...EMPTY_PARTNER, address: { ...EMPTY_ADDRESS } }],
  bank_code: "",
  branch_number: "",
  branch_check_digit: "",
  account_number: "",
  account_check_digit: "",
  account_type: "checking",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
}

function AddressFields({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: RecipientAddressInput;
  onChange: (patch: Partial<RecipientAddressInput>) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${prefix}_street`}>Rua / logradouro</Label>
        <Input
          id={`${prefix}_street`}
          value={value.street}
          onChange={e => onChange({ street: e.target.value })}
          placeholder="Ex.: Rua das Flores"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}_number`}>Número</Label>
        <Input
          id={`${prefix}_number`}
          value={value.number}
          onChange={e => onChange({ number: e.target.value })}
          placeholder="123"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}_complement`}>Complemento (opcional)</Label>
        <Input
          id={`${prefix}_complement`}
          value={value.complement || ""}
          onChange={e => onChange({ complement: e.target.value })}
          placeholder="Sala, bloco, etc."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}_neighborhood`}>Bairro</Label>
        <Input
          id={`${prefix}_neighborhood`}
          value={value.neighborhood}
          onChange={e => onChange({ neighborhood: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}_city`}>Cidade</Label>
        <Input
          id={`${prefix}_city`}
          value={value.city}
          onChange={e => onChange({ city: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}_state`}>UF</Label>
        <Input
          id={`${prefix}_state`}
          value={value.state}
          onChange={e => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })}
          placeholder="SP"
          maxLength={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}_zip`}>CEP</Label>
        <Input
          id={`${prefix}_zip`}
          value={value.zip_code}
          onChange={e => onChange({ zip_code: e.target.value })}
          placeholder="Somente números"
          inputMode="numeric"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${prefix}_reference`}>Ponto de referência (opcional)</Label>
        <Input
          id={`${prefix}_reference`}
          value={value.reference_point || ""}
          onChange={e => onChange({ reference_point: e.target.value })}
          placeholder="Próximo ao mercado, etc."
        />
      </div>
    </div>
  );
}

function buildSubmitPayload(form: FormState): RecipientSubmitInput {
  const doc = form.holder_document.replace(/\D/g, "");
  const isPJ = doc.length === 14;
  const address: RecipientAddressInput = {
    street: form.address.street.trim(),
    number: form.address.number.trim(),
    neighborhood: form.address.neighborhood.trim(),
    city: form.address.city.trim(),
    state: form.address.state.trim(),
    zip_code: form.address.zip_code.replace(/\D/g, ""),
    complement: form.address.complement?.trim() || undefined,
    reference_point: form.address.reference_point?.trim() || undefined,
  };

  const payload: RecipientSubmitInput = {
    holder_name: form.holder_name.trim(),
    holder_document: doc,
    email: form.email.trim(),
    phone: form.phone.replace(/\D/g, "") || undefined,
    address,
    bank_account: {
      bank_code: form.bank_code.replace(/\D/g, ""),
      branch_number: form.branch_number.replace(/\D/g, ""),
      branch_check_digit: form.branch_check_digit.replace(/\D/g, "") || undefined,
      account_number: form.account_number.replace(/\D/g, ""),
      account_check_digit: form.account_check_digit.trim(),
      account_type: form.account_type,
    },
  };

  if (isPJ) {
    payload.company_name = form.company_name.trim() || form.holder_name.trim();
    payload.trading_name = form.trading_name.trim() || form.holder_name.trim();
    payload.annual_revenue = Number(form.annual_revenue);
    payload.managing_partners = form.managing_partners.map(partner => ({
      ...partner,
      document: partner.document.replace(/\D/g, ""),
      phone: partner.phone?.replace(/\D/g, "") || undefined,
      monthly_income: Number(partner.monthly_income),
      address: {
        ...partner.address,
        zip_code: partner.address.zip_code.replace(/\D/g, ""),
        complement: partner.address.complement?.trim() || undefined,
        reference_point: partner.address.reference_point?.trim() || undefined,
      },
    }));
  } else {
    payload.birthdate = form.birthdate;
    payload.mother_name = form.mother_name.trim();
    payload.professional_occupation = form.professional_occupation.trim();
    payload.monthly_income = Number(form.monthly_income);
  }

  return payload;
}

interface RecipientOnboardingFormProps {
  restaurantId: string;
  recipientCreated: boolean;
  onSuccess?: (data: RecipientSubmitResponse) => void;
}

export function RecipientOnboardingForm({
  restaurantId,
  recipientCreated,
  onSuccess,
}: RecipientOnboardingFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const { data: details, isLoading } = useQuery({
    queryKey: ["restaurant-recipient-details", restaurantId],
    queryFn: () => restaurantRecipientService.getAccountDetails(restaurantId),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (!details?.exists) return;
    setForm(prev => ({
      ...prev,
      holder_name: details.holder_name || prev.holder_name,
      holder_document: details.holder_document || prev.holder_document,
      email: details.email || prev.email,
      phone: details.phone || prev.phone,
      birthdate: details.birthdate || prev.birthdate,
      mother_name: details.mother_name || prev.mother_name,
      monthly_income: details.monthly_income != null ? String(details.monthly_income) : prev.monthly_income,
      professional_occupation: details.professional_occupation || prev.professional_occupation,
      company_name: details.company_name || prev.company_name,
      trading_name: details.trading_name || prev.trading_name,
      annual_revenue: details.annual_revenue != null ? String(details.annual_revenue) : prev.annual_revenue,
      address: details.address ? { ...EMPTY_ADDRESS, ...details.address } : prev.address,
      managing_partners: details.managing_partners.length
        ? details.managing_partners.map(p => ({
            ...EMPTY_PARTNER,
            ...p,
            address: { ...EMPTY_ADDRESS, ...p.address },
          }))
        : prev.managing_partners,
      bank_code: details.bank_account?.bank_code || prev.bank_code,
      branch_number: details.bank_account?.branch_number || prev.branch_number,
      branch_check_digit: details.bank_account?.branch_check_digit || prev.branch_check_digit,
      account_number: details.bank_account?.account_number || prev.account_number,
      account_check_digit: details.bank_account?.account_check_digit || prev.account_check_digit,
      account_type: details.bank_account?.account_type || prev.account_type,
    }));
  }, [details]);

  const docDigits = form.holder_document.replace(/\D/g, "");
  const isPF = docDigits.length === 11;
  const isPJ = docDigits.length === 14;

  const updateForm = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));
  const updateAddress = (patch: Partial<RecipientAddressInput>) =>
    setForm(prev => ({ ...prev, address: { ...prev.address, ...patch } }));

  const updatePartner = (index: number, patch: Partial<ManagingPartnerInput>) => {
    setForm(prev => ({
      ...prev,
      managing_partners: prev.managing_partners.map((partner, i) =>
        i === index ? { ...partner, ...patch } : partner,
      ),
    }));
  };

  const updatePartnerAddress = (index: number, patch: Partial<RecipientAddressInput>) => {
    setForm(prev => ({
      ...prev,
      managing_partners: prev.managing_partners.map((partner, i) =>
        i === index ? { ...partner, address: { ...partner.address, ...patch } } : partner,
      ),
    }));
  };

  const formValid = useMemo(() => {
    const addressOk =
      form.address.street.trim() &&
      form.address.number.trim() &&
      form.address.neighborhood.trim() &&
      form.address.city.trim() &&
      form.address.state.trim().length === 2 &&
      form.address.zip_code.replace(/\D/g, "").length === 8;

    const bankOk =
      form.bank_code.trim() &&
      form.branch_number.trim() &&
      form.account_number.trim() &&
      form.account_check_digit.trim();

    const baseOk =
      form.holder_name.trim().length > 1 &&
      (isPF || isPJ) &&
      form.email.includes("@") &&
      addressOk &&
      bankOk;

    if (!baseOk) return false;

    if (isPF) {
      return (
        form.birthdate &&
        form.mother_name.trim() &&
        form.professional_occupation.trim() &&
        Number(form.monthly_income) > 0
      );
    }

    if (isPJ) {
      const partnerOk = form.managing_partners.every(partner => {
        const partnerDoc = partner.document.replace(/\D/g, "");
        const partnerAddrOk =
          partner.address.street.trim() &&
          partner.address.number.trim() &&
          partner.address.neighborhood.trim() &&
          partner.address.city.trim() &&
          partner.address.state.trim().length === 2 &&
          partner.address.zip_code.replace(/\D/g, "").length === 8;
        return (
          partner.name.trim() &&
          partnerDoc.length === 11 &&
          partner.birthdate &&
          partner.mother_name.trim() &&
          partner.professional_occupation.trim() &&
          Number(partner.monthly_income) > 0 &&
          partnerAddrOk
        );
      });
      return Number(form.annual_revenue) > 0 && partnerOk;
    }

    return false;
  }, [form, isPF, isPJ]);

  const submitMutation = useMutation({
    mutationFn: async () => restaurantRecipientService.submit(buildSubmitPayload(form), restaurantId),
    onSuccess: data => {
      setFieldErrors([]);
      onSuccess?.(data);
      toast.success(
        data.recipient_status === "active"
          ? "Recebedor ativo! Você já pode ligar o PIX online."
          : "Recebedor enviado. Aguardando validação do Pagar.me.",
      );
    },
    onError: (error: Error) => {
      if (error instanceof RecipientSubmitError) {
        setFieldErrors(error.fieldErrors);
        toast.error(error.message);
        return;
      }
      setFieldErrors([]);
      toast.error(error.message || "Erro ao enviar dados do recebedor");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando dados do recebedor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fieldErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Corrija os campos indicados pelo Pagar.me</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {fieldErrors.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <SectionTitle>Titular do recebedor</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="holder_name">
              {isPJ ? "Razão social" : "Nome completo do titular"}
            </Label>
            <Input
              id="holder_name"
              value={form.holder_name}
              onChange={e => updateForm({ holder_name: e.target.value })}
              placeholder={isPJ ? "Ex.: Restaurante Sabor Ltda" : "Ex.: João da Silva"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holder_document">CPF ou CNPJ</Label>
            <Input
              id="holder_document"
              value={form.holder_document}
              onChange={e => updateForm({ holder_document: e.target.value })}
              placeholder="Somente números"
              inputMode="numeric"
            />
            {docDigits.length > 0 && !isPF && !isPJ && (
              <p className="text-xs text-destructive">Informe 11 dígitos (CPF) ou 14 (CNPJ).</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient_email">E-mail</Label>
            <Input
              id="recipient_email"
              type="email"
              value={form.email}
              onChange={e => updateForm({ email: e.target.value })}
              placeholder="financeiro@restaurante.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient_phone">Telefone</Label>
            <Input
              id="recipient_phone"
              value={form.phone}
              onChange={e => updateForm({ phone: e.target.value })}
              placeholder="DDD + número"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <SectionTitle>Endereço {isPJ ? "da empresa" : "do titular"}</SectionTitle>
        <AddressFields prefix="holder" value={form.address} onChange={updateAddress} />
      </div>

      {isPF && (
        <div className="space-y-4">
          <SectionTitle>Dados pessoais (KYC — pessoa física)</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthdate">Data de nascimento</Label>
              <Input
                id="birthdate"
                type="date"
                value={form.birthdate}
                onChange={e => updateForm({ birthdate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mother_name">Nome da mãe</Label>
              <Input
                id="mother_name"
                value={form.mother_name}
                onChange={e => updateForm({ mother_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="professional_occupation">Ocupação profissional</Label>
              <Input
                id="professional_occupation"
                value={form.professional_occupation}
                onChange={e => updateForm({ professional_occupation: e.target.value })}
                placeholder="Ex.: Empresário, autônomo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_income">Renda mensal (R$)</Label>
              <Input
                id="monthly_income"
                type="number"
                min={0}
                step="0.01"
                value={form.monthly_income}
                onChange={e => updateForm({ monthly_income: e.target.value })}
                placeholder="Ex.: 5000"
              />
            </div>
          </div>
        </div>
      )}

      {isPJ && (
        <>
          <div className="space-y-4">
            <SectionTitle>Dados da empresa (KYC — pessoa jurídica)</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Razão social (confirmação)</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={e => updateForm({ company_name: e.target.value })}
                  placeholder={form.holder_name || "Igual ao titular"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trading_name">Nome fantasia</Label>
                <Input
                  id="trading_name"
                  value={form.trading_name}
                  onChange={e => updateForm({ trading_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annual_revenue">Faturamento anual estimado (R$)</Label>
                <Input
                  id="annual_revenue"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.annual_revenue}
                  onChange={e => updateForm({ annual_revenue: e.target.value })}
                  placeholder="Ex.: 120000"
                />
              </div>
            </div>
          </div>

          {form.managing_partners.map((partner, index) => (
            <div key={index} className="space-y-4 rounded-md border p-4">
              <SectionTitle>
                Sócio / representante legal {form.managing_partners.length > 1 ? index + 1 : ""}
              </SectionTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`partner_name_${index}`}>Nome completo</Label>
                  <Input
                    id={`partner_name_${index}`}
                    value={partner.name}
                    onChange={e => updatePartner(index, { name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner_doc_${index}`}>CPF do sócio</Label>
                  <Input
                    id={`partner_doc_${index}`}
                    value={partner.document}
                    onChange={e => updatePartner(index, { document: e.target.value })}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner_email_${index}`}>E-mail (opcional)</Label>
                  <Input
                    id={`partner_email_${index}`}
                    type="email"
                    value={partner.email || ""}
                    onChange={e => updatePartner(index, { email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner_phone_${index}`}>Telefone (opcional)</Label>
                  <Input
                    id={`partner_phone_${index}`}
                    value={partner.phone || ""}
                    onChange={e => updatePartner(index, { phone: e.target.value })}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner_birth_${index}`}>Data de nascimento</Label>
                  <Input
                    id={`partner_birth_${index}`}
                    type="date"
                    value={partner.birthdate}
                    onChange={e => updatePartner(index, { birthdate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner_mother_${index}`}>Nome da mãe</Label>
                  <Input
                    id={`partner_mother_${index}`}
                    value={partner.mother_name}
                    onChange={e => updatePartner(index, { mother_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner_occupation_${index}`}>Ocupação profissional</Label>
                  <Input
                    id={`partner_occupation_${index}`}
                    value={partner.professional_occupation}
                    onChange={e => updatePartner(index, { professional_occupation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner_income_${index}`}>Renda mensal (R$)</Label>
                  <Input
                    id={`partner_income_${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={partner.monthly_income || ""}
                    onChange={e => updatePartner(index, { monthly_income: Number(e.target.value) })}
                  />
                </div>
                <label className="flex items-center gap-2 md:col-span-2">
                  <Checkbox
                    checked={partner.self_declared_legal_representative}
                    onCheckedChange={checked =>
                      updatePartner(index, { self_declared_legal_representative: Boolean(checked) })
                    }
                  />
                  <span className="text-sm">Declaro ser representante legal da empresa</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label>Endereço do sócio</Label>
                <AddressFields
                  prefix={`partner_${index}`}
                  value={partner.address}
                  onChange={patch => updatePartnerAddress(index, patch)}
                />
              </div>
            </div>
          ))}
        </>
      )}

      <div className="space-y-4">
        <SectionTitle>Conta bancária para repasse</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="bank_code">Banco (código)</Label>
            <Input
              id="bank_code"
              value={form.bank_code}
              onChange={e => updateForm({ bank_code: e.target.value })}
              placeholder="Ex.: 341"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch_number">Agência</Label>
            <Input
              id="branch_number"
              value={form.branch_number}
              onChange={e => updateForm({ branch_number: e.target.value })}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch_check_digit">Dígito da agência (opcional)</Label>
            <Input
              id="branch_check_digit"
              value={form.branch_check_digit}
              onChange={e => updateForm({ branch_check_digit: e.target.value })}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de conta</Label>
            <Select
              value={form.account_type}
              onValueChange={value => updateForm({ account_type: value as AccountType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Corrente</SelectItem>
                <SelectItem value="savings">Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account_number">Número da conta</Label>
            <Input
              id="account_number"
              value={form.account_number}
              onChange={e => updateForm({ account_number: e.target.value })}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account_check_digit">Dígito da conta</Label>
            <Input
              id="account_check_digit"
              value={form.account_check_digit}
              onChange={e => updateForm({ account_check_digit: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || !formValid}
        >
          {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {recipientCreated ? "Atualizar recebedor" : "Cadastrar recebedor"}
        </Button>
      </div>
    </div>
  );
}
