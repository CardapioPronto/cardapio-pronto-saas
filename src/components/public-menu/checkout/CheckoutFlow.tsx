import { useMemo, useState } from 'react';
import { MenuData } from '@/types/menuTheme';
import { useCart, formatBRL } from '../cart/CartContext';
import {
  deliveryOrderService,
  lookupCep,
  DeliveryAddressInput,
  FulfillmentType,
} from '@/services/deliveryOrderService';
import { ArrowLeft, Loader2, X, CheckCircle2, Bike, Store, UtensilsCrossed } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Props {
  data: MenuData;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  local: 'Pagar no caixa ou com o garçom',
};

const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  delivery: 'Receber por delivery',
  pickup: 'Retirar no balcão',
  table: 'Pedir na mesa',
  counter: 'Pedir no balcão',
};

export const CheckoutFlow = ({ data, onClose }: Props) => {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const primary = data.theme.colors.primary;
  const dCfg = data.deliveryConfig;
  const context = data.context;

  const availableFulfillmentTypes = useMemo<FulfillmentType[]>(() => {
    const modes: FulfillmentType[] = [];
    if (context?.tableId) modes.push('table');
    if (dCfg?.delivery_enabled !== false) modes.push('delivery');
    if (dCfg?.pickup_enabled !== false) modes.push('pickup');
    if (!modes.length) modes.push('counter');
    return modes;
  }, [context?.tableId, dCfg?.delivery_enabled, dCfg?.pickup_enabled]);

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    context?.fulfillmentType && availableFulfillmentTypes.includes(context.fulfillmentType)
      ? context.fulfillmentType
      : availableFulfillmentTypes[0],
  );

  const needsAddress = fulfillmentType === 'delivery';
  const needsCustomer = fulfillmentType === 'delivery' || fulfillmentType === 'pickup';
  const paymentMethods = fulfillmentType === 'table' || fulfillmentType === 'counter'
    ? ['local']
    : (dCfg?.payment_methods?.length ? dCfg.payment_methods : ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
  const deliveryFee = needsAddress ? dCfg?.delivery_fee || 0 : 0;
  const total = subtotal + deliveryFee;

  const firstDataStep = needsAddress ? 'address' : 'customer';
  const [step, setStep] = useState<'fulfillment' | 'customer' | 'address' | 'payment' | 'review' | 'success'>(
    availableFulfillmentTypes.length > 1 ? 'fulfillment' : firstDataStep,
  );
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
  });

  const [address, setAddress] = useState<DeliveryAddressInput>({
    customer_name: '',
    customer_phone: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    reference_point: '',
  });
  const [payment, setPayment] = useState<string>(paymentMethods[0] || 'pix');
  const [changeFor, setChangeFor] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  const moveBack = () => {
    if (step === 'fulfillment') onClose();
    else if (step === 'customer') availableFulfillmentTypes.length > 1 ? setStep('fulfillment') : onClose();
    else if (step === 'address') availableFulfillmentTypes.length > 1 ? setStep('fulfillment') : onClose();
    else if (step === 'payment') setStep(needsAddress ? 'address' : 'customer');
    else if (step === 'review') setStep('payment');
    else onClose();
  };

  const handleFulfillmentChange = (type: FulfillmentType) => {
    setFulfillmentType(type);
    const nextPaymentMethods = type === 'table' || type === 'counter'
      ? ['local']
      : (dCfg?.payment_methods?.length ? dCfg.payment_methods : ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
    setPayment(nextPaymentMethods[0] || 'pix');
  };

  const handleCepBlur = async () => {
    const clean = address.zip_code.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    const result = await lookupCep(clean);
    setCepLoading(false);
    if (result) {
      setAddress(a => ({
        ...a,
        street: result.street || a.street,
        neighborhood: result.neighborhood || a.neighborhood,
        city: result.city || a.city,
        state: result.state || a.state,
      }));
    } else {
      toast({ title: 'CEP não encontrado', description: 'Preencha o endereço manualmente.', variant: 'destructive' });
    }
  };

  const validateCustomer = () => {
    if (!needsCustomer) return true;
    if (!customer.name.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Preencha seu nome.', variant: 'destructive' });
      return false;
    }
    if (customer.phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Telefone inválido', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const validateAddress = () => {
    const merged = {
      ...address,
      customer_name: customer.name || address.customer_name,
      customer_phone: customer.phone || address.customer_phone,
    };
    const required: (keyof DeliveryAddressInput)[] = [
      'customer_name', 'customer_phone', 'zip_code', 'street', 'number', 'neighborhood', 'city', 'state',
    ];
    for (const k of required) {
      if (!String(merged[k] || '').trim()) {
        toast({ title: 'Campo obrigatório', description: `Preencha ${k.replace('_', ' ')}.`, variant: 'destructive' });
        return false;
      }
    }
    if (merged.customer_phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Telefone inválido', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const next = () => {
    if (step === 'fulfillment') {
      setStep(needsAddress ? 'address' : 'customer');
    } else if (step === 'customer') {
      if (validateCustomer()) setStep('payment');
    } else if (step === 'address') {
      if (validateAddress()) setStep('payment');
    } else if (step === 'payment') {
      setStep('review');
    } else {
      submit();
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const deliveryAddress = needsAddress
        ? {
            ...address,
            customer_name: customer.name || address.customer_name,
            customer_phone: customer.phone || address.customer_phone,
          }
        : undefined;

      const result = await deliveryOrderService.create({
        restaurant_id: data.restaurant.id,
        fulfillment_type: fulfillmentType,
        table_id: fulfillmentType === 'table' ? context?.tableId : undefined,
        items,
        address: deliveryAddress,
        customer_name: customer.name,
        customer_phone: customer.phone,
        payment_method: payment,
        change_for: payment === 'dinheiro' && changeFor ? Number(changeFor) : undefined,
        notes,
        delivery_fee: deliveryFee,
        estimated_delivery_minutes: dCfg?.estimated_delivery_minutes,
      });
      setCreatedId(result.id);
      setStep('success');
      clear();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao enviar pedido', description: e?.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[95vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button onClick={moveBack} className="p-1.5 hover:bg-muted rounded-md" aria-label="Voltar">
            {step === 'fulfillment' || step === 'success' ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
          <h3 className="font-bold">
            {step === 'fulfillment' && 'Como deseja pedir?'}
            {step === 'customer' && 'Seus dados'}
            {step === 'address' && 'Endereço de entrega'}
            {step === 'payment' && 'Forma de pagamento'}
            {step === 'review' && 'Revisar pedido'}
            {step === 'success' && 'Pedido enviado!'}
          </h3>
          <div className="w-7" />
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {step === 'fulfillment' && (
            <div className="space-y-3">
              {availableFulfillmentTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleFulfillmentChange(type)}
                  className="w-full flex items-center gap-3 p-4 border rounded-xl text-left"
                  style={fulfillmentType === type ? { borderColor: primary, borderWidth: 2 } : {}}
                >
                  {type === 'delivery' && <Bike className="h-5 w-5" style={{ color: primary }} />}
                  {type === 'pickup' && <Store className="h-5 w-5" style={{ color: primary }} />}
                  {(type === 'table' || type === 'counter') && <UtensilsCrossed className="h-5 w-5" style={{ color: primary }} />}
                  <div>
                    <p className="font-semibold">{FULFILLMENT_LABELS[type]}</p>
                    <p className="text-xs text-muted-foreground">
                      {type === 'delivery' && 'Receba no endereço informado.'}
                      {type === 'pickup' && 'O pedido chega ao painel da loja para retirada.'}
                      {type === 'table' && 'O pedido entra direto na comanda da mesa.'}
                      {type === 'counter' && 'Use a lista para pedir no balcão.'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'customer' && (
            <>
              <Field label={needsCustomer ? 'Nome completo *' : 'Nome ou apelido'} value={customer.name} onChange={v => setCustomer(c => ({ ...c, name: v }))} />
              <Field label={needsCustomer ? 'Telefone (WhatsApp) *' : 'Telefone (opcional)'} value={customer.phone} onChange={v => setCustomer(c => ({ ...c, phone: v }))} placeholder="(11) 99999-9999" />
              {fulfillmentType === 'table' && (
                <p className="text-xs text-muted-foreground">
                  Seu pedido será enviado para a mesa vinculada ao QR Code.
                </p>
              )}
            </>
          )}

          {step === 'address' && (
            <>
              <Field label="Nome completo *" value={customer.name} onChange={v => setCustomer(c => ({ ...c, name: v }))} />
              <Field label="Telefone (WhatsApp) *" value={customer.phone} onChange={v => setCustomer(c => ({ ...c, phone: v }))} placeholder="(11) 99999-9999" />
              <div className="relative">
                <Field label="CEP *" value={address.zip_code} onChange={v => setAddress(a => ({ ...a, zip_code: v }))} onBlur={handleCepBlur} placeholder="00000-000" />
                {cepLoading && <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin" />}
              </div>
              <Field label="Rua *" value={address.street} onChange={v => setAddress(a => ({ ...a, street: v }))} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Número *" value={address.number} onChange={v => setAddress(a => ({ ...a, number: v }))} />
                <Field label="Complemento" value={address.complement || ''} onChange={v => setAddress(a => ({ ...a, complement: v }))} />
              </div>
              <Field label="Bairro *" value={address.neighborhood} onChange={v => setAddress(a => ({ ...a, neighborhood: v }))} />
              <div className="grid grid-cols-[1fr,80px] gap-2">
                <Field label="Cidade *" value={address.city} onChange={v => setAddress(a => ({ ...a, city: v }))} />
                <Field label="UF *" value={address.state} onChange={v => setAddress(a => ({ ...a, state: v.toUpperCase().slice(0, 2) }))} />
              </div>
              <Field label="Ponto de referência" value={address.reference_point || ''} onChange={v => setAddress(a => ({ ...a, reference_point: v }))} />
            </>
          )}

          {step === 'payment' && (
            <>
              <p className="text-sm text-muted-foreground">Como você quer pagar?</p>
              {paymentMethods.map(pm => (
                <label key={pm} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${payment === pm ? 'border-2' : 'border-border'}`} style={payment === pm ? { borderColor: primary } : {}}>
                  <span className="text-sm font-medium">{PAYMENT_LABELS[pm] || pm}</span>
                  <input type="radio" checked={payment === pm} onChange={() => setPayment(pm)} className="accent-current" style={{ color: primary }} />
                </label>
              ))}
              {payment === 'dinheiro' && (
                <Field label="Precisa de troco para?" value={changeFor} onChange={setChangeFor} placeholder="Ex: 100" type="number" />
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Observações do pedido</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-2 border border-border rounded-lg text-sm" placeholder="Ex: sem cebola, ponto da carne, pagamento no caixa..." />
              </div>
            </>
          )}

          {step === 'review' && (
            <div className="space-y-3 text-sm">
              <Section title="Tipo de pedido">
                <p className="text-muted-foreground">{FULFILLMENT_LABELS[fulfillmentType]}</p>
              </Section>
              <Section title="Itens">
                {items.map(i => (
                  <div key={i.id} className="flex justify-between gap-3">
                    <span>{i.quantity}x {i.name}</span>
                    <span>{formatBRL(i.price * i.quantity)}</span>
                  </div>
                ))}
              </Section>
              {needsAddress ? (
                <Section title="Entrega">
                  <p className="text-muted-foreground">{customer.name} • {customer.phone}</p>
                  <p className="text-muted-foreground">{address.street}, {address.number} {address.complement && `- ${address.complement}`}</p>
                  <p className="text-muted-foreground">{address.neighborhood} - {address.city}/{address.state} • CEP {address.zip_code}</p>
                  {address.reference_point && <p className="text-muted-foreground">Ref: {address.reference_point}</p>}
                </Section>
              ) : customer.name || customer.phone ? (
                <Section title="Cliente">
                  <p className="text-muted-foreground">{customer.name || 'Cliente'}{customer.phone ? ` • ${customer.phone}` : ''}</p>
                </Section>
              ) : null}
              <Section title="Pagamento">
                <p className="text-muted-foreground">{PAYMENT_LABELS[payment]}{payment === 'dinheiro' && changeFor ? ` (troco para ${formatBRL(Number(changeFor))})` : ''}</p>
              </Section>
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                {needsAddress && <div className="flex justify-between"><span>Taxa de entrega</span><span>{deliveryFee > 0 ? formatBRL(deliveryFee) : 'Grátis'}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>Total</span><span style={{ color: primary }}>{formatBRL(total)}</span></div>
              </div>
            </div>
          )}

          {step === 'success' && createdId && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto" style={{ color: primary }} />
              <h4 className="text-xl font-bold">Pedido enviado!</h4>
              <p className="text-sm text-muted-foreground">
                O pedido entrou no painel do estabelecimento. Você pode acompanhar o status pelo link.
              </p>
              <button
                onClick={() => { onClose(); navigate(`/pedido/${createdId}`); }}
                className="w-full text-white font-semibold py-3 rounded-xl"
                style={{ backgroundColor: primary }}
              >
                Acompanhar pedido
              </button>
            </div>
          )}
        </div>

        {step !== 'success' && (
          <div className="p-4 border-t border-border">
            <button
              onClick={next}
              disabled={submitting}
              className="w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === 'review' ? `Confirmar e enviar (${formatBRL(total)})` : 'Continuar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({
  label, value, onChange, placeholder, onBlur, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; onBlur?: () => void; type?: string }) => (
  <div>
    <label className="text-sm font-medium block mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h5 className="font-semibold mb-1.5">{title}</h5>
    <div className="space-y-1">{children}</div>
  </div>
);
