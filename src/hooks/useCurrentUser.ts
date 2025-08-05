
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types/user";

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
                .select("id, email, name, restaurant_id, user_type, role")
                .eq("id", authUser.id)
                .maybeSingle();

            if (userError || !data) {
                setError("Erro ao buscar dados do usuário.");
                setUser(null);
            } else {
                // Ensure we have all required fields for the User type
                setUser({
                    id: data.id,
                    email: data.email,
                    name: data.name ?? authUser.email ?? "Usuário", // Fallback para garantir que name não seja null
                    restaurant_id: data.restaurant_id,
                    user_type: data.user_type,
                    role: data.role
                });
            }

            setLoading(false);
        };

        fetchUser();
    }, []);

    return { user, loading, error };
}
