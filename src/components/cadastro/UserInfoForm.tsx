
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface UserInfoFormProps {
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation - minimum 8 characters, at least one number and one special character
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

export function UserInfoForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
}: UserInfoFormProps) {
  const isEmailValid = email === "" || EMAIL_REGEX.test(email);
  const isPasswordValid = password === "" || PASSWORD_REGEX.test(password);
  const isNameValid = name === "" || (name.length >= 2 && name.length <= 100);

  return (
    <>
      <div>
        <Label>Seu Nome</Label>
        <Input
          value={name}
          onChange={(e) => {
            const sanitized = e.target.value.replace(/<[^>]*>/g, ''); // Basic XSS prevention
            setName(sanitized);
          }}
          maxLength={100}
          required
        />
        {!isNameValid && name && (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nome deve ter entre 2 e 100 caracteres.
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            const sanitized = e.target.value.replace(/<[^>]*>/g, ''); // Basic XSS prevention
            setEmail(sanitized.toLowerCase());
          }}
          maxLength={254}
          required
        />
        {!isEmailValid && email && (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Por favor, insira um email válido.
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Senha</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={128}
          required
        />
        {!isPasswordValid && password && (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Senha deve ter no mínimo 8 caracteres, incluindo pelo menos um número e um caractere especial (!@#$%^&*).
            </AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
}
