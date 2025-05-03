
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  return (
    <>
      <div>
        <Label>Nome do Restaurante</Label>
        <Input
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label>Telefone (opcional)</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <Label>Endereço</Label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>
      <div>
        <Label>CNPJ (opcional)</Label>
        <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
      </div>
      <div>
        <Label>Logo URL (opcional)</Label>
        <Input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />
      </div>
      <div>
        <Label>Categoria (opcional)</Label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>
    </>
  );
}
