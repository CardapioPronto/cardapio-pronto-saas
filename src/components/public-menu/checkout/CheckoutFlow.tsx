import { useState } from 'react';
import { MenuData } from '@/types/menuTheme';
import { useCart, formatBRL } from '../cart/CartContext';
import { deliveryOrderService, lookupCep, DeliveryAddressInput } from '@/services/deliveryOrderService';
import { ArrowLeft, Loader2, X, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Props {
  data: MenuData;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de crédito (na entrega)',
  cartao_debito: 'Cartão de débito (na entrega)',
};

export const CheckoutFlow = ({ data, onClose }: Props) => {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const primary = data.theme.colors.primary;
  const dCfg = data.deliveryConfig;
  const deliveryFee = dCfg?.delivery_fee || 0;
  const total = subtotal + deliveryFee;

  const [step, setStep] = useState<'address' | 'payment' | 'review' | 'success'>('address');
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

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
  const [payment, setPayment] = useState<string>(dCfg?.payment_methods?.[0] || 'pix');
  const [changeFor, setChangeFor] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

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

  const validateAddress = () => {
    const required: (keyof DeliveryAddressInput)[] = [
      'customer_name', 'customer_phone', 'zip_code', 'street', 'number', 'neighborhood', 'city', 'state',
    ];
    for (const k of required) {
      if (!String(address[k] || '').trim()) {
        toast({ title: 'Campo obrigatório', description: `Preencha ${k.replace('_', ' ')}.`, variant: 'destructive' });
        return false;
      }
    }
    if (address.customer_phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Telefone inválido', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await deliveryOrderService.create({
        restaurant_id: data.restaurant.id,
        items,
        address,
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
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 'address') onClose();
              else if (step === 'payment') setStep('address');
              else if (step === 'review') setStep('payment');
              else onClose();
            }}
            className="p-1.5 hover:bg-muted rounded-md"
            aria-label="Voltar"
          >
            {step === 'address' || step === 'success' ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
          <h3 className="font-bold">
            {step === 'address' && 'Endereço de entrega'}
            {step === 'payment' && 'Forma de pagamento'}
            {step === 'review' && 'Revisar pedido'}
            {step === 'success' && 'Pedido enviado!'}
          </h3>
          <div className="w-7" />
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {step === 'address' && (
            <>
              <Field label="Nome completo *" value={address.customer_name} onChange={v => setAddress(a => ({ ...a, customer_name: v }))} />
              <Field label="Telefone (WhatsApp) *" value={address.customer_phone} onChange={v => setAddress(a => ({ ...a, customer_phone: v }))} placeholder="(11) 99999-9999" />
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
              {(dCfg?.payment_methods || ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']).map(pm => (
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
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-2 border border-border rounded-lg text-sm" placeholder="Ex: sem cebola, troco para 50..." />
              </div>
            </>
          )}

          {step === 'review' && (
            <div className="space-y-3 text-sm">
              <Section title="Itens">
                {items.map(i => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.quantity}x {i.name}</span>
                    <span>{formatBRL(i.price * i.quantity)}</span>
                  </div>
                ))}
              </Section>
              <Section title="Entrega">
                <p className="text-muted-foreground">{address.customer_name} • {address.customer_phone}</p>
                <p className="text-muted-foreground">{address.street}, {address.number} {address.complement && `- ${address.complement}`}</p>
                <p className="text-muted-foreground">{address.neighborhood} - {address.city}/{address.state} • CEP {address.zip_code}</p>
                {address.reference_point && <p className="text-muted-foreground">Ref: {address.reference_point}</p>}
              </Section>
              <Section title="Pagamento">
                <p className="text-muted-foreground">{PAYMENT_LABELS[payment]}{payment === 'dinheiro' && changeFor ? ` (troco para ${formatBRL(Number(changeFor))})` : ''}</p>
              </Section>
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                <div className="flex justify-between"><span>Taxa de entrega</span><span>{deliveryFee > 0 ? formatBRL(deliveryFee) : 'Grátis'}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Total</span><span style={{ color: primary }}>{formatBRL(total)}</span></div>
              </div>
            </div>
          )}

          {step === 'success' && createdId && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto" style={{ color: primary }} />
              <h4 className="text-xl font-bold">Pedido enviado!</h4>
              <p className="text-sm text-muted-foreground">
                Enviamos seu pedido para o restaurante via WhatsApp. Você pode acompanhar o status em tempo real.
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

        {/* Footer */}
        {step !== 'success' && (
          <div className="p-4 border-t border-border">
            <button
              onClick={() => {
                if (step === 'address') { if (validateAddress()) setStep('payment'); }
                else if (step === 'payment') setStep('review');
                else submit();
              }}
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