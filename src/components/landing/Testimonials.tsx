
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listPublicLandingTestimonials } from "@/services/landingTestimonialsService";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const Testimonials = () => {
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["public-landing-testimonials"],
    queryFn: async () => {
      const { data, error } = await listPublicLandingTestimonials(6);
      if (error) throw new Error(error.message);
      return data;
    },
    retry: 1,
  });

  if (isLoading) {
    return null;
  }

  if (!isLoading && !testimonials?.length) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-beige/20">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
            Resultados de quem já está construindo canal próprio
          </h2>
          <p className="text-lg text-navy/70">
            Depoimentos reais de restaurantes que usam o Pubfy para organizar pedidos, relacionamento, campanhas e operação.
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
              {(testimonials ?? []).map((testimonial) => (
                <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="bg-white p-6 rounded-lg shadow-sm h-full flex flex-col">
                    <div className="mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 inline-block fill-orange text-orange" />
                      ))}
                    </div>
                    <blockquote className="flex-grow">
                      <p className="text-navy/80 italic mb-6">"{testimonial.message}"</p>
                    </blockquote>
                    <div className="flex items-center">
                      <div className="mr-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-green/10 text-sm font-semibold text-green">
                        {testimonial.avatar_url ? (
                          <img
                            src={testimonial.avatar_url}
                            alt={testimonial.restaurant_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(testimonial.restaurant_name || testimonial.author_name)
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-navy">{testimonial.author_name}</p>
                        <p className="text-sm text-navy/60">
                          {[testimonial.author_role, testimonial.restaurant_name].filter(Boolean).join(" · ")}
                        </p>
                        {testimonial.public_note && (
                          <p className="mt-1 text-xs text-green">{testimonial.public_note}</p>
                        )}
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
