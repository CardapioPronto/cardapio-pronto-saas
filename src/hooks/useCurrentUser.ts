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
                .select("id, email, restaurant_id")
                .eq("id", authUser.id)
                .single();

            if (userError) {
                setError("Erro ao buscar dados do usuário.");
                setUser(null);
            } else {
                setUser(data);
            }



            setLoading(false);
        };

        fetchUser();
    }, []);

    return { user, loading, error };
}
