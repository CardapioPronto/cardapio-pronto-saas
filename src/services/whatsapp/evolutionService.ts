import { supabase } from "@/integrations/supabase/client";
import { EvolutionAction, EvolutionResponse } from "@/types/whatsappAI";

/** Cliente fino para a Edge Function evolution-api (instâncias por restaurante). */
export class EvolutionService {
  static async callEvolutionAPI(
    action: EvolutionAction,
    instanceName: string,
    restaurantId: string,
  ): Promise<EvolutionResponse> {
    const { data, error } = await supabase.functions.invoke("evolution-api", {
      body: { action, instanceName, restaurantId },
    });

    if (error) {
      console.error("Evolution API error:", error);
      throw new Error(error.message);
    }

    return data as EvolutionResponse;
  }
}
