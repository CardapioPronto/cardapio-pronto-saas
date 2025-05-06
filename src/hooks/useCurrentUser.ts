
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";

export function useCurrentUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            setError(null);

            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData.user) {
                setError("Usuário não autenticado.");
                setUser(null);
                setLoading(false);
                return;
            }

            const { user: authUser } = authData;

            const { data, error: userError } = await supabase
                .from("users")
                .select("id, email, name, restaurant_id")
                .eq("id", authUser.id)
                .single();

            if (userError) {
                setError("Erro ao buscar dados do usuário.");
                setUser(null);
            } else {
                // Ensure we have all required fields for the User type
                // If name is null or undefined, provide an empty string as fallback
                setUser({
                    id: data.id,
                    email: data.email,
                    name: data.name || "", // Ensure name is always a string
                    restaurant_id: data.restaurant_id
                });
            }

            setLoading(false);
        };

        fetchUser();
    }, []);

    return { user, loading, error };
}
