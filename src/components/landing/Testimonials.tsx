
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Dados de exemplo para os depoimentos
const testimonials = [
  {
    id: 1,
    quote: "O CardápioPronto transformou completamente nosso restaurante. Reduziu erros nos pedidos e aumentou nossas vendas em 30%.",
    author: "Maria Silva",
    role: "Proprietária, Restaurante Sabor Caseiro",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 2,
    quote: "O PDV online é incrivelmente intuitivo e facilita muito o trabalho da nossa equipe. Nossos clientes amam o cardápio digital!",
    author: "João Pereira",
    role: "Gerente, Bar do João",
    image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 3,
    quote: "Implementamos o CardápioPronto há 3 meses e já notamos uma diferença significativa na eficiência do nosso atendimento.",
    author: "Ana Costa",
    role: "Proprietária, Café Aroma",
    image: "https://images.unsplash.com/photo-1629747490241-624f07d70e1e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: 4,
    quote: "Os relatórios detalhados nos ajudam a tomar decisões mais acertadas para o negócio. Vale cada centavo do investimento!",
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
            Nossos clientes aprovam
          </h2>
          <p className="text-lg text-navy/70">
            Descubra como o CardápioPronto tem ajudado estabelecimentos como o seu a crescer e melhorar sua operação.
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
                  <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col">
                    <div className="mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i}
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5 inline-block text-orange" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
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
