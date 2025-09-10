import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RestaurantInfoFormProps {
  restaurantName: string;
  setRestaurantName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  cnpj: string;
  setCnpj: (value: string) => void;
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
}

// Security validation functions
const validateRestaurantName = (name: string): string | null => {
  if (!name.trim()) return "Nome do restaurante é obrigatório";
  if (name.length < 2) return "Nome deve ter pelo menos 2 caracteres";
  if (name.length > 100) return "Nome muito longo";
  // Basic XSS prevention
  if (/<[^>]*>/.test(name)) return "Nome contém caracteres inválidos";
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // Optional field
  // Brazilian phone validation
  const phoneRegex = /^\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$|^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return "Formato de telefone inválido (ex: (11) 99999-9999)";
  }
  if (phone.length > 20) return "Telefone muito longo";
  return null;
};

const validateCnpj = (cnpj: string): string | null => {
  if (!cnpj) return null; // Optional field
  // Basic CNPJ format validation (XX.XXX.XXX/XXXX-XX)
  const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;
  if (!cnpjRegex.test(cnpj)) {
    return "Formato de CNPJ inválido (ex: 12.345.678/0001-90)";
  }
  return null;
};

const validateUrl = (url: string): string | null => {
  if (!url) return null; // Optional field
  try {
    new URL(url);
    if (url.length > 2048) return "URL muito longa";
    return null;
  } catch {
    return "URL inválida";
  }
};

const validateAddress = (address: string): string | null => {
  if (!address.trim()) return "Endereço é obrigatório";
  if (address.length < 5) return "Endereço muito curto";
  if (address.length > 200) return "Endereço muito longo";
  // Basic XSS prevention
  if (/<[^>]*>/.test(address)) return "Endereço contém caracteres inválidos";
  return null;
};

export function RestaurantInfoForm({
  restaurantName,
  setRestaurantName,
  phone,
  setPhone,
  address,
  setAddress,
  cnpj,
  setCnpj,
  logoUrl,
  setLogoUrl,
  category,
  setCategory,
}: RestaurantInfoFormProps) {
  const restaurantNameError = validateRestaurantName(restaurantName);
  const phoneError = validatePhone(phone);
  const addressError = validateAddress(address);
  const cnpjError = validateCnpj(cnpj);
  const logoUrlError = validateUrl(logoUrl);

  return (
    <>
      <div>
        <Label>Nome do Restaurante</Label>
        <Input
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value.slice(0, 100))}
          required
          maxLength={100}
          className={restaurantNameError && restaurantName ? "border-destructive" : ""}
        />
        {restaurantNameError && restaurantName && (
          <Alert variant="destructive" className="mt-1 py-1">
            <AlertDescription className="text-xs">{restaurantNameError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Telefone (opcional)</Label>
        <Input 
          value={phone} 
          onChange={(e) => setPhone(e.target.value.slice(0, 20))}
          maxLength={20}
          placeholder="(11) 99999-9999"
          className={phoneError && phone ? "border-destructive" : ""}
        />
        {phoneError && phone && (
          <Alert variant="destructive" className="mt-1 py-1">
            <AlertDescription className="text-xs">{phoneError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Endereço</Label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value.slice(0, 200))}
          required
          maxLength={200}
          className={addressError && address ? "border-destructive" : ""}
        />
        {addressError && address && (
          <Alert variant="destructive" className="mt-1 py-1">
            <AlertDescription className="text-xs">{addressError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>CNPJ (opcional)</Label>
        <Input 
          value={cnpj} 
          onChange={(e) => setCnpj(e.target.value.slice(0, 18))}
          maxLength={18}
          placeholder="12.345.678/0001-90"
          className={cnpjError && cnpj ? "border-destructive" : ""}
        />
        {cnpjError && cnpj && (
          <Alert variant="destructive" className="mt-1 py-1">
            <AlertDescription className="text-xs">{cnpjError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Logo URL (opcional)</Label>
        <Input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value.slice(0, 2048))}
          maxLength={2048}
          placeholder="https://exemplo.com/logo.png"
          className={logoUrlError && logoUrl ? "border-destructive" : ""}
        />
        {logoUrlError && logoUrl && (
          <Alert variant="destructive" className="mt-1 py-1">
            <AlertDescription className="text-xs">{logoUrlError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Categoria (opcional)</Label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value.slice(0, 50))}
          maxLength={50}
          placeholder="Restaurante, Lanchonete, Pizzaria..."
        />
      </div>
    </>
  );
}