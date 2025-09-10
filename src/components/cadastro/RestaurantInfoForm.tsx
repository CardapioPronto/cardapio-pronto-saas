
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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

// CNPJ validation - Brazilian business registration number (14 digits)
const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

// Phone validation - Brazilian phone format
const PHONE_REGEX = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

// URL validation
const URL_REGEX = /^https?:\/\/.+/;

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
  const isCnpjValid = cnpj === "" || CNPJ_REGEX.test(cnpj);
  const isPhoneValid = phone === "" || PHONE_REGEX.test(phone);
  const isLogoUrlValid = logoUrl === "" || URL_REGEX.test(logoUrl);
  const isRestaurantNameValid = restaurantName === "" || (restaurantName.length >= 2 && restaurantName.length <= 100);

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <>
      <div>
        <Label>Nome do Restaurante</Label>
        <Input
          value={restaurantName}
          onChange={(e) => {
            const sanitized = e.target.value.replace(/<[^>]*>/g, ''); // Basic XSS prevention
            setRestaurantName(sanitized);
          }}
          maxLength={100}
          required
        />
        {!isRestaurantNameValid && restaurantName && (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nome do restaurante deve ter entre 2 e 100 caracteres.
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Telefone (opcional)</Label>
        <Input 
          value={phone} 
          onChange={(e) => {
            const formatted = formatPhone(e.target.value);
            setPhone(formatted);
          }}
          placeholder="(11) 99999-9999"
          maxLength={15}
        />
        {!isPhoneValid && phone && (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Formato válido: (11) 99999-9999 ou (11) 9999-9999
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Endereço</Label>
        <Input
          value={address}
          onChange={(e) => {
            const sanitized = e.target.value.replace(/<[^>]*>/g, ''); // Basic XSS prevention
            setAddress(sanitized);
          }}
          maxLength={200}
          required
        />
      </div>
      <div>
        <Label>CNPJ (opcional)</Label>
        <Input 
          value={cnpj} 
          onChange={(e) => {
            const formatted = formatCNPJ(e.target.value);
            setCnpj(formatted);
          }}
          placeholder="00.000.000/0000-00"
          maxLength={18}
        />
        {!isCnpjValid && cnpj && (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Formato válido: 00.000.000/0000-00
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Logo URL (opcional)</Label>
        <Input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://exemplo.com/logo.png"
          maxLength={500}
        />
        {!isLogoUrlValid && logoUrl && (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Por favor, insira uma URL válida começando com http:// ou https://
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        <Label>Categoria (opcional)</Label>
        <Input
          value={category}
          onChange={(e) => {
            const sanitized = e.target.value.replace(/<[^>]*>/g, ''); // Basic XSS prevention
            setCategory(sanitized);
          }}
          maxLength={50}
          placeholder="Ex: Pizzaria, Lanchonete, Restaurante"
        />
      </div>
    </>
  );
}
