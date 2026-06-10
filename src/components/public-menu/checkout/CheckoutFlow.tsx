import { useEffect, useMemo, useRef, useState } from 'react';
import { MenuData } from '@/types/menuTheme';
import { useCart, formatBRL } from '../cart/cartContextCore';
import {
  deliveryOrderService,
  OnlineOrderPayment,
  lookupCep,
  DeliveryAddressInput,
  FulfillmentType,
} from '@/services/deliveryOrderService';
import { ArrowLeft, Loader2, X, CheckCircle2, Bike, Store, UtensilsCrossed, TicketPercent, Gift } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  clearPendingCheckout,
  createClientRequestId,
  readPendingCheckout,
  writePendingCheckout,
} from '@/lib/publicMenuCheckoutIdempotency';
import { getPublicLoyaltyQuote } from '@/services/loyaltyService';
import type { PublicLoyaltyQuote } from '@/types/loyalty';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  getCartAbandonmentSessionToken,
  rotateCartAbandonmentSessionToken,
} from '@/lib/cartAbandonmentSession';
import { cartAbandonmentService } from '@/services/cartAbandonmentService';
import { trackPublicMenuEventQuietly } from '@/services/publicMenuAnalyticsService';

interface Props {
  data: MenuData;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  pix_online: 'PIX online',
  credit_card_online: 'Cartão online',
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
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();
  const primary = data.theme.colors.primary;
  const dCfg = data.deliveryConfig;
  const paymentCfg = data.paymentSettings;
  const context = data.context;
  const clientRequestIdRef = useRef(createClientRequestId());
  const submitInFlightRef = useRef(false);

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
  const getPaymentMethods = (type: FulfillmentType) => {
    const offlineMethods = type === 'table' || type === 'counter'
      ? ['local']
      : (dCfg?.payment_methods?.length ? dCfg.payment_methods : ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);

    const onlineMethods = paymentCfg?.enabled && paymentCfg.allowedFulfillment.includes(type)
      ? paymentCfg.methods
          .filter(method => method === 'pix')
          .map(method => method === 'pix' ? 'pix_online' : 'credit_card_online')
      : [];

    return [...onlineMethods, ...offlineMethods];
  };
  const paymentMethods = getPaymentMethods(fulfillmentType);
  const deliveryFee = needsAddress ? dCfg?.delivery_fee || 0 : 0;
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    title?: string;
    discount: number;
  } | null>(null);
  const [loyaltyQuote, setLoyaltyQuote] = useState<PublicLoyaltyQuote | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [useLoyaltyCredit, setUseLoyaltyCredit] = useState(false);
  const hasOrderPromotion = !!data.orderPromotions && data.orderPromotions.length > 0;

  const firstDataStep = needsAddress ? 'address' : 'customer';
  const [step, setStep] = useState<'fulfillment' | 'customer' | 'address' | 'payment' | 'review' | 'success'>(
    availableFulfillmentTypes.length > 1 ? 'fulfillment' : firstDataStep,
  );
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [onlinePayment, setOnlinePayment] = useState<OnlineOrderPayment | null>(null);

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    acceptsEmailMarketing: false,
    acceptsWhatsappReminder: false,
  });
  const initialCartSessionToken = useMemo(
    () => getCartAbandonmentSessionToken(data.restaurant.id),
    [data.restaurant.id],
  );
  const cartSessionTokenRef = useRef(initialCartSessionToken);

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
  const couponDiscountAmount = appliedCoupon?.discount || 0;
  const loyaltyPhone = customer.phone || address.customer_phone;
  const loyaltyOrderSubtotal = Math.max(subtotal - couponDiscountAmount, 0);
  const loyaltyRedeemAmount = useLoyaltyCredit
    ? Math.min(Number(loyaltyQuote?.max_redeem_amount || 0), loyaltyOrderSubtotal)
    : 0;
  const discountAmount = couponDiscountAmount + loyaltyRedeemAmount;
  const total = Math.max(subtotal - discountAmount, 0) + deliveryFee;
  const notifyOffline = (description = 'Reconecte a internet para concluir esta ação.') => {
    toast({
      title: 'Sem conexão',
      description,
      variant: 'destructive',
    });
  };

  useEffect(() => {
    if (!paymentMethods.includes(payment)) {
      setPayment(paymentMethods[0] || 'pix');
    }
  }, [payment, paymentMethods]);

  useEffect(() => {
    const trackableSteps = new Set(['customer', 'address', 'payment', 'review']);
    if (!trackableSteps.has(step) || items.length === 0) return;

    const phone = (customer.phone || address.customer_phone || '').replace(/\D/g, '');
    if (phone.length < 10) return;

    const timer = window.setTimeout(() => {
      void cartAbandonmentService.upsertPublicSession({
        restaurantId: data.restaurant.id,
        sessionToken: cartSessionTokenRef.current,
        phone: customer.phone || address.customer_phone,
        customerName: customer.name || address.customer_name,
        customerEmail: customer.email,
        acceptsEmail: customer.acceptsEmailMarketing,
        acceptsWhatsapp: customer.acceptsWhatsappReminder,
        fulfillmentType,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    step,
    items,
    subtotal,
    customer.name,
    customer.phone,
    customer.email,
    customer.acceptsEmailMarketing,
    customer.acceptsWhatsappReminder,
    address.customer_phone,
    address.customer_name,
    data.restaurant.id,
    fulfillmentType,
  ]);

  const moveBack = () => {
    if (step === 'fulfillment') onClose();
    else if (step === 'customer') {
      if (availableFulfillmentTypes.length > 1) setStep('fulfillment');
      else onClose();
    } else if (step === 'address') {
      if (availableFulfillmentTypes.length > 1) setStep('fulfillment');
      else onClose();
    }
    else if (step === 'payment') setStep(needsAddress ? 'address' : 'customer');
    else if (step === 'review') setStep('payment');
    else onClose();
  };

  const handleFulfillmentChange = (type: FulfillmentType) => {
    setFulfillmentType(type);
    const nextPaymentMethods = getPaymentMethods(type);
    setPayment(nextPaymentMethods[0] || 'pix');
  };

  const applyCoupon = async () => {
    if (!isOnline) {
      notifyOffline('Reconecte a internet para validar o cupom.');
      return;
    }

    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast({ title: 'Informe um cupom', variant: 'destructive' });
      return;
    }

    setCouponLoading(true);
    try {
      const result = await deliveryOrderService.validateCoupon({
        restaurant_id: data.restaurant.id,
        code,
        subtotal,
      });

      if (!result.valid) {
        setAppliedCoupon(null);
        toast({ title: 'Cupom inválido', description: result.message, variant: 'destructive' });
        return;
      }

      setCouponCode(result.code || code);
      setAppliedCoupon({
        code: result.code || code,
        title: result.title,
        discount: Number(result.discount || 0),
      });
      toast({ title: 'Cupom aplicado', description: result.message });
    } catch (error: unknown) {
      setAppliedCoupon(null);
      toast({
        title: 'Erro ao validar cupom',
        description: getErrorMessage(error, 'Tente novamente em instantes.'),
        variant: 'destructive',
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  useEffect(() => {
    if (step !== 'review') return;

    const digits = loyaltyPhone.replace(/\D/g, '');
    if (!isOnline || digits.length < 10 || loyaltyOrderSubtotal <= 0) {
      setLoyaltyQuote(null);
      setUseLoyaltyCredit(false);
      setLoyaltyLoading(false);
      return;
    }

    let cancelled = false;
    setLoyaltyLoading(true);

    getPublicLoyaltyQuote({
      restaurantId: data.restaurant.id,
      phone: loyaltyPhone,
      orderSubtotal: loyaltyOrderSubtotal,
    })
      .then(quote => {
        if (cancelled) return;
        setLoyaltyQuote(quote);
        if (!quote.enabled || quote.max_redeem_amount <= 0) {
          setUseLoyaltyCredit(false);
        }
      })
      .catch(error => {
        if (cancelled) return;
        setLoyaltyQuote(null);
        setUseLoyaltyCredit(false);
        console.warn('Erro ao consultar fidelidade', error);
      })
      .finally(() => {
        if (!cancelled) setLoyaltyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data.restaurant.id, isOnline, loyaltyOrderSubtotal, loyaltyPhone, step]);

  const handleCepBlur = async () => {
    const clean = address.zip_code.replace(/\D/g, '');
    if (clean.length !== 8) return;
    if (!isOnline) {
      notifyOffline('Reconecte a internet para buscar o endereço pelo CEP.');
      return;
    }

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
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      toast({ title: 'E-mail inválido', variant: 'destructive' });
      return false;
    }
    if (payment === 'pix_online' && customer.phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Telefone obrigatório', description: 'Informe o WhatsApp para gerar o pagamento online.', variant: 'destructive' });
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
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      toast({ title: 'E-mail inválido', variant: 'destructive' });
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
    if (submitInFlightRef.current) return;
    if (!isOnline) {
      notifyOffline('Reconecte a internet para enviar o pedido.');
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);
    try {
      setOnlinePayment(null);
      const restaurantId = data.restaurant.id;
      const pending = readPendingCheckout(restaurantId);
      const reusePending =
        pending?.client_request_id === clientRequestIdRef.current && pending.order_id;

      let result: Awaited<ReturnType<typeof deliveryOrderService.create>>;

      if (reusePending) {
        result = {
          id: pending.tracking_id,
          order_id: pending.order_id,
          delivery_order_id: pending.delivery_order_id,
          order_number: pending.order_number,
          fulfillment_type: fulfillmentType,
          discount_amount: 0,
          total: pending.total ?? total,
        };
      } else {
        const deliveryAddress = needsAddress
          ? {
              ...address,
              customer_name: customer.name || address.customer_name,
              customer_phone: customer.phone || address.customer_phone,
            }
          : undefined;

        result = await deliveryOrderService.create({
          restaurant_id: restaurantId,
          client_request_id: clientRequestIdRef.current,
          fulfillment_type: fulfillmentType,
          table_id: fulfillmentType === 'table' ? context?.tableId : undefined,
          items,
          address: deliveryAddress,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email || undefined,
          accepts_marketing_email: customer.acceptsEmailMarketing,
          payment_method: payment,
          change_for: payment === 'dinheiro' && changeFor ? Number(changeFor) : undefined,
          notes,
          coupon_code: appliedCoupon?.code,
          delivery_fee: deliveryFee,
          estimated_delivery_minutes: dCfg?.estimated_delivery_minutes,
          loyalty_redeem_amount: loyaltyRedeemAmount || undefined,
        });

        writePendingCheckout(restaurantId, {
          client_request_id: clientRequestIdRef.current,
          order_id: result.order_id,
          tracking_id: result.id,
          delivery_order_id: result.delivery_order_id,
          order_number: result.order_number,
          fulfillment_type,
          total: result.total,
        });
      }

      if (reusePending && loyaltyRedeemAmount > 0) {
        const redemption = await deliveryOrderService.applyLoyaltyRedemption(result.order_id, loyaltyRedeemAmount);
        if (redemption.applied) {
          result = {
            ...result,
            discount_amount: Number(result.discount_amount || 0) + Number(redemption.discount_amount || 0),
            total: Number(redemption.total ?? result.total),
          };
        }
      }

      setCreatedId(result.id);
      if (payment === 'pix_online') {
        const paymentResult = await deliveryOrderService.createOnlinePayment({
          order_id: result.order_id,
          tracking_id: result.id,
          payment_method: 'pix',
        });
        setOnlinePayment(paymentResult);
      }
      trackPublicMenuEventQuietly({
        restaurantId,
        eventType: 'order_completed',
        orderId: result.order_id,
        metadata: {
          tracking_id: result.id,
          delivery_order_id: result.delivery_order_id,
          fulfillment_type: fulfillmentType,
          payment_method: payment,
          item_count: items.reduce((sum, item) => sum + item.quantity, 0),
          subtotal,
          total: result.total,
          discount_amount: result.discount_amount,
        },
      });
      clearPendingCheckout(restaurantId);
      cartSessionTokenRef.current = rotateCartAbandonmentSessionToken(restaurantId);
      setStep('success');
      clear();
    } catch (e: unknown) {
      toast({ title: 'Erro ao enviar pedido', description: getErrorMessage(e, 'Tente novamente'), variant: 'destructive' });
    } finally {
      submitInFlightRef.current = false;
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
              <Field label="E-mail para acompanhar o pedido" value={customer.email} onChange={v => setCustomer(c => ({ ...c, email: v }))} placeholder="voce@email.com" type="email" />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={customer.acceptsEmailMarketing}
                  onChange={e => setCustomer(c => ({ ...c, acceptsEmailMarketing: e.target.checked }))}
                  className="mt-0.5"
                />
                Aceito receber novidades e cupons deste restaurante por e-mail.
              </label>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={customer.acceptsWhatsappReminder}
                  onChange={e => setCustomer(c => ({ ...c, acceptsWhatsappReminder: e.target.checked }))}
                  className="mt-0.5"
                />
                Aceito receber lembrete deste pedido por WhatsApp se eu não finalizar.
              </label>
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
              <Field label="E-mail para acompanhar o pedido" value={customer.email} onChange={v => setCustomer(c => ({ ...c, email: v }))} placeholder="voce@email.com" type="email" />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={customer.acceptsEmailMarketing}
                  onChange={e => setCustomer(c => ({ ...c, acceptsEmailMarketing: e.target.checked }))}
                  className="mt-0.5"
                />
                Aceito receber novidades e cupons deste restaurante por e-mail.
              </label>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={customer.acceptsWhatsappReminder}
                  onChange={e => setCustomer(c => ({ ...c, acceptsWhatsappReminder: e.target.checked }))}
                  className="mt-0.5"
                />
                Aceito receber lembrete deste pedido por WhatsApp se eu não finalizar.
              </label>
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
              {payment === 'pix_online' && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  O pedido será enviado após gerar a cobrança. O restaurante acompanha a confirmação pelo painel.
                </p>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Observações do pedido</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-2 border border-border rounded-lg text-sm" placeholder="Ex: sem cebola, ponto da carne, pagamento no caixa..." />
              </div>
            </>
          )}

          {step === 'review' && (
            <div className="space-y-3 text-sm">
              {!isOnline && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  Reconecte a internet para confirmar e enviar este pedido.
                </div>
              )}
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
                  {customer.email && <p className="text-muted-foreground">{customer.email}</p>}
                </Section>
              ) : null}
              <Section title="Pagamento">
                <p className="text-muted-foreground">{PAYMENT_LABELS[payment]}{payment === 'dinheiro' && changeFor ? ` (troco para ${formatBRL(Number(changeFor))})` : ''}</p>
              </Section>
              <Section title="Cupom de desconto">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <TicketPercent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={couponCode}
                      onChange={e => {
                        setCouponCode(e.target.value.toUpperCase());
                        if (appliedCoupon) setAppliedCoupon(null);
                      }}
                      placeholder="Digite seu cupom"
                      className="w-full h-10 pl-9 pr-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {appliedCoupon ? (
                    <button type="button" onClick={removeCoupon} className="px-3 rounded-lg border border-border text-sm font-medium">
                      Remover
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !isOnline}
                      className="px-3 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                      style={{ backgroundColor: primary }}
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                    </button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="text-xs text-green-600">
                    {appliedCoupon.title || appliedCoupon.code}: -{formatBRL(appliedCoupon.discount)}
                  </p>
                )}
                {hasOrderPromotion && (
                  <p className="text-xs text-muted-foreground">
                    Há promoção ativa no pedido. Cupom e promoção do pedido não somam: aplicamos o que der maior desconto.
                  </p>
                )}
              </Section>
              {loyaltyPhone.replace(/\D/g, '').length >= 10 && (
                <Section title="Fidelidade">
                  {loyaltyLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Consultando saldo...
                    </div>
                  ) : loyaltyQuote?.enabled && loyaltyQuote.balance > 0 ? (
                    <div className="rounded-lg border border-border p-3">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={useLoyaltyCredit}
                          disabled={loyaltyQuote.max_redeem_amount <= 0}
                          onChange={event => setUseLoyaltyCredit(event.target.checked)}
                          className="mt-0.5"
                        />
                        <span className="flex-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Gift className="h-4 w-4" style={{ color: primary }} />
                            Usar {formatBRL(loyaltyQuote.max_redeem_amount)} de saldo
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Saldo disponivel: {formatBRL(loyaltyQuote.balance)}
                          </span>
                        </span>
                      </label>
                      {loyaltyQuote.max_redeem_amount <= 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          O pedido ainda nao atingiu a regra minima para resgate.
                        </p>
                      )}
                    </div>
                  ) : loyaltyQuote?.enabled && loyaltyQuote.earn_estimate > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Este pedido gera {formatBRL(loyaltyQuote.earn_estimate)} de cashback apos finalizar.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem saldo disponivel para este pedido.</p>
                  )}
                </Section>
              )}
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                {couponDiscountAmount > 0 && <div className="flex justify-between text-green-600"><span>Cupom</span><span>-{formatBRL(couponDiscountAmount)}</span></div>}
                {loyaltyRedeemAmount > 0 && <div className="flex justify-between text-green-600"><span>Fidelidade</span><span>-{formatBRL(loyaltyRedeemAmount)}</span></div>}
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
              {onlinePayment?.qr_code && (
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-left">
                  <p className="mb-2 text-sm font-semibold">PIX copia e cola</p>
                  <textarea
                    readOnly
                    value={onlinePayment.qr_code}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-border bg-background p-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(onlinePayment.qr_code || '')}
                    className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium"
                  >
                    Copiar código PIX
                  </button>
                </div>
              )}
              {onlinePayment?.qr_code_url && (
                <img
                  src={onlinePayment.qr_code_url}
                  alt="QR Code PIX"
                  className="mx-auto h-44 w-44 rounded-lg border border-border bg-white p-2"
                />
              )}
            </div>
          )}
        </div>

        {step !== 'success' && (
          <div className="p-4 border-t border-border">
            <button
              onClick={next}
              disabled={submitting || (step === 'review' && !isOnline)}
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

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;
