
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Star } from "lucide-react";

const testimonials = [
  {
    id: 1,
    quote: "O Pubfy tirou nosso cardapio do papel e reduziu muito a confusao entre atendimento e cozinha.",
    author: "Maria Silva",
    role: "Proprietária, Restaurante Sabor Caseiro",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 2,
    quote: "O PDV online ficou simples para a equipe usar no horario de pico. Os pedidos aparecem com muito mais clareza.",
    author: "João Pereira",
    role: "Gerente, Bar do João",
    image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 3,
    quote: "Conseguimos acompanhar mesas, delivery e WhatsApp sem depender de varias planilhas abertas.",
    author: "Ana Costa",
    role: "Proprietária, Café Aroma",
    image: "https://images.unsplash.com/photo-1629747490241-624f07d70e1e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 4,
    quote: "Os relatorios mostram o que mais vende e ajudam a ajustar promocao, estoque e escala da equipe.",
    author: "Carlos Mendes",
    role: "Sócio, Pizzaria Napoli",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-beige/20">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
            Feito para quem atende cliente todos os dias
          </h2>
          <p className="text-lg text-navy/70">
            A mensagem comercial fica mais forte quando mostra resultados operacionais simples: menos erro, mais velocidade e mais controle.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent>
              {testimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="bg-white p-6 rounded-lg shadow-sm h-full flex flex-col">
                    <div className="mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 inline-block fill-orange text-orange" />
                      ))}
                    </div>
                    <blockquote className="flex-grow">
                      <p className="text-navy/80 italic mb-6">"{testimonial.quote}"</p>
                    </blockquote>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                        <img 
                          src={testimonial.image} 
                          alt={testimonial.author} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-navy">{testimonial.author}</p>
                        <p className="text-sm text-navy/60">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-8">
              <CarouselPrevious className="static translate-y-0 mx-2" />
              <CarouselNext className="static translate-y-0 mx-2" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
