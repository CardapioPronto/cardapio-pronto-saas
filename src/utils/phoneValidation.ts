
/**
 * Utilitários para validação e formatação de telefone
 */

export const formatPhone = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  const numbers = phone.replace(/\D/g, '');
  
  // Formata conforme o padrão brasileiro
  if (numbers.length <= 10) {
    // Telefone fixo: (11) 1234-5678
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    // Celular: (11) 99999-9999
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
};

export const validatePhone = (phone: string): boolean => {
  // Remove todos os caracteres não numéricos
  const numbers = phone.replace(/\D/g, '');
  
  // Verifica se tem pelo menos 10 dígitos (telefone fixo) ou 11 dígitos (celular)
  return numbers.length >= 10 && numbers.length <= 11;
};

export const cleanPhone = (phone: string): string => {
  // Remove todos os caracteres não numéricos e retorna apenas os números
  return phone.replace(/\D/g, '');
};

export const addCountryCode = (phone: string): string => {
  const cleanedPhone = cleanPhone(phone);
  
  // Se não começar com 55 (código do Brasil), adiciona
  if (!cleanedPhone.startsWith('55')) {
    return `55${cleanedPhone}`;
  }
  
  return cleanedPhone;
};
