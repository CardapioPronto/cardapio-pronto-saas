import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Clock, QrCode, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useActivePlan } from "@/hooks/useActivePlan";
import { DEFAULT_TRIAL_DAYS, formatTrialDurationText } from "@/lib/trialDays";

const Hero = () => {
  const { plan } = useActivePlan();
  const trialDays = plan?.trial_days ?? DEFAULT_TRIAL_DAYS;

  return (
    <section className="relative min-h-[720px] overflow-hidden bg-navy pt-24 text-white md:pt-28">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(27,29,43,0.94) 0%, rgba(27,29,43,0.86) 42%, rgba(27,29,43,0.42) 100%), url('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=85')",
        }}
      />

      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-3xl py-16 md:py-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
            <QrCode size={16} className="text-beige" />
            Cardápio digital, PDV, pedidos e atendimento em uma única plataforma
          </div>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
            Venda mais no salão, delivery e WhatsApp com uma operação mais simples.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl">
            O Pubfy centraliza cardápio por QR Code, PDV online, mesas, pedidos, cupons, relatórios, equipe e automações para o restaurante trabalhar com menos erro e mais velocidade.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/teste-gratis">
              <Button size="lg" className="h-14 w-full bg-orange px-7 text-base font-semibold text-white hover:bg-orange/90 sm:w-auto">
                {trialDays > 0 ? "Começar teste grátis" : "Criar conta"}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Link to="/demonstracao">
              <Button size="lg" variant="outline" className="h-14 w-full border-white/70 bg-white/10 px-7 text-base font-semibold text-white hover:bg-white/20 sm:w-auto">
                Ver demonstração
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-white/90 sm:grid-cols-3">
            {["Sem cartão no teste", "Implantação guiada", "Acesso pelo navegador"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 size={17} className="shrink-0 text-green-light" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative -mb-20 grid gap-5 pb-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="overflow-hidden rounded-lg border border-white/20 bg-white shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-gray-100 bg-offwhite/70 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">Painel operacional</p>
                <p className="font-semibold text-navy">Pedidos de hoje</p>
              </div>
              <div className="rounded-md bg-green px-3 py-1 text-xs font-semibold text-white">Ao vivo</div>
            </div>
            <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-gray-100 p-5 md:border-b-0 md:border-r">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Vendas", "R$ 2.840"],
                    ["Pedidos", "86"],
                    ["Ticket médio", "R$ 33,02"],
                    ["Tempo médio", "11 min"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-gray-100 bg-white p-4">
                      <p className="text-xs text-navy/55">{label}</p>
                      <p className="mt-1 text-xl font-bold text-navy">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-md bg-navy p-4 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp size={17} className="text-green-light" />
                    Produtos em destaque
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    {["Combo burger", "Pizza margherita", "Suco natural"].map((item, index) => (
                      <div key={item} className="flex items-center justify-between">
                        <span>{item}</span>
                        <span className="text-white/70">{32 - index * 7} vendas</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold text-navy">Fila de pedidos</p>
                  <Clock size={18} className="text-orange" />
                </div>
                <div className="space-y-3">
                  {[
                    ["Mesa 08", "2 itens", "Preparando", "bg-orange/10 text-orange"],
                    ["Delivery", "4 itens", "Novo", "bg-green/10 text-green"],
                    ["WhatsApp", "1 item", "Confirmar", "bg-beige/30 text-navy"],
                    ["Mesa 12", "3 itens", "Pronto", "bg-navy/10 text-navy"],
                  ].map(([origin, items, status, color]) => (
                    <div key={origin} className="flex items-center justify-between rounded-md border border-gray-100 p-3">
                      <div>
                        <p className="font-medium text-navy">{origin}</p>
                        <p className="text-xs text-navy/55">{items}</p>
                      </div>
                      <span className={`rounded-md px-3 py-1 text-xs font-semibold ${color}`}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:pb-10">
            <div className="rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-bold">{formatTrialDurationText(trialDays)}</p>
              <p className="mt-1 text-sm text-white/72">
                {trialDays > 0 ? "para testar sem cartão" : "cadastro direto para ativação"}
              </p>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-bold">QR Code</p>
              <p className="mt-1 text-sm text-white/72">cardápio pronto para divulgar</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
