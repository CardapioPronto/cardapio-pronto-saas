import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserInfoFormProps {
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
}

// Security validation functions
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return "Email é obrigatório";
  if (!emailRegex.test(email)) return "Formato de email inválido";
  if (email.length > 254) return "Email muito longo";
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return "Senha é obrigatória";
  if (password.length < 8) return "Senha deve ter pelo menos 8 caracteres";
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return "Senha deve conter pelo menos uma letra minúscula, maiúscula e um número";
  }
  if (password.length > 128) return "Senha muito longa";
  return null;
};

const validateName = (name: string): string | null => {
  if (!name.trim()) return "Nome é obrigatório";
  if (name.length < 2) return "Nome deve ter pelo menos 2 caracteres";
  if (name.length > 100) return "Nome muito longo";
  // Basic XSS prevention
  if (/<[^>]*>/.test(name)) return "Nome contém caracteres inválidos";
  return null;
};

export function UserInfoForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
}: UserInfoFormProps) {
  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  return (
    <>
      <div>
        <Label>Seu Nome</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 100))} // Prevent overflow
          required
          maxLength={100}
          className={nameError && name ? "border-destructive" : ""}
        />
        {nameError && name && (
          <Alert variant="destructive" className="mt-1 py-1">
            <AlertDescription className="text-xs">{nameError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.slice(0, 254))} // Prevent overflow
          required
          maxLength={254}
          className={emailError && email ? "border-destructive" : ""}
        />
        {emailError && email && (
          <Alert variant="destructive" className="mt-1 py-1">
            <AlertDescription className="text-xs">{emailError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Senha</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value.slice(0, 128))} // Prevent overflow
          required
          maxLength={128}
          className={passwordError && password ? "border-destructive" : ""}
        />
        {passwordError && password && (
          <Alert variant="destructive" className="mt-1 py-1">
            <AlertDescription className="text-xs">{passwordError}</AlertDescription>
          </Alert>
        )}
        {!passwordError && password && (
          <Alert className="mt-1 py-1">
            <AlertDescription className="text-xs text-muted-foreground">
              Senha forte: inclui letras maiúsculas, minúsculas e números
            </AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
}