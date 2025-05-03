
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

interface FormFooterProps {
  loading: boolean;
}

export function FormFooter({ loading }: FormFooterProps) {
  return (
    <CardFooter className="flex flex-col">
      <Button
        type="submit"
        className="w-full bg-green hover:bg-green-dark text-white"
        disabled={loading}
      >
        {loading ? "Criando conta..." : "Criar conta grátis"}
      </Button>
      <p className="mt-4 text-sm text-center text-navy/70">
        Já tem uma conta?{" "}
        <Link to="/login" className="text-green hover:underline">
          Faça login
        </Link>
      </p>
    </CardFooter>
  );
}
